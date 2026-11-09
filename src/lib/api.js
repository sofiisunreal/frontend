import { errorDiagnostic, friendlyErrorMessage, normalizeError } from "./errors.js";

const configuredBase = import.meta.env.VITE_API_BASE_URL || "https://budgetly.alwaysdata.net/api";
const API_BASE = configuredBase.replace(/\/$/, "");

function endpointUrl(path) {
  const base = new URL(API_BASE);
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const basePath = base.pathname.replace(/\/$/, "");
  const normalizedPath = basePath.endsWith("/api") && apiPath.startsWith("/api/")
    ? apiPath.slice(4)
    : apiPath;
  return new URL(`${base.origin}${basePath}${normalizedPath}`);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function presentableError(error, method) {
  error.message = normalizeError(error).message;
  if (import.meta.env.DEV) console.debug("Budgetly request", errorDiagnostic(error, method));
  return error;
}

async function refreshAccessToken() {
  const refresh = sessionStorage.getItem("budgetly.refresh");
  if (!refresh) return null;
  try {
    const response = await fetch(endpointUrl("/api/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) throw new Error("Refresh rejected");
    const tokens = await response.json();
    sessionStorage.setItem("budgetly.access", tokens.access);
    if (tokens.refresh) sessionStorage.setItem("budgetly.refresh", tokens.refresh);
    return tokens.access;
  } catch {
    sessionStorage.removeItem("budgetly.access");
    sessionStorage.removeItem("budgetly.refresh");
    return null;
  }
}

export async function api(path, options = {}, retry = true) {
  const { auth = true, query, ...requestOptions } = options;
  const url = endpointUrl(path);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const headers = new Headers(requestOptions.headers || {});
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (auth) {
    const access = sessionStorage.getItem("budgetly.access");
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let response;
  const connectionError = cause => {
    const error = new ApiError("Request interrupted", 0);
    error.transport = cause?.name === "TimeoutError" || requestOptions.signal?.reason?.name === "TimeoutError" ? "timeout" : cause?.name === "AbortError" ? "cancelled" : "network";
    return presentableError(error, requestOptions.method);
  };
  try {
    response = await fetch(url, { ...requestOptions, headers });
  } catch (cause) {
    throw connectionError(cause);
  }
  if (response.status === 401 && auth && retry) {
    const access = await refreshAccessToken();
    if (access) return api(path, options, false);
    window.dispatchEvent(new CustomEvent("budgetly:unauthorized"));
  }
  let raw;
  try { raw = await response.text(); } catch (cause) { throw connectionError(cause); }
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    // Honour the backend's financial-access decision without treating it as a
    // JWT failure. Recovery APIs never emit this event, preventing redirect loops.
    const recoveryEndpoint = /\/api\/(?:auth|billing|feedback)\//.test(url.pathname);
    const currentAccess = sessionStorage.getItem("budgetly.access");
    if (auth && response.status === 403 && data?.code === "payment_required" && !recoveryEndpoint && currentAccess && headers.get("Authorization") === `Bearer ${currentAccess}`) {
      window.dispatchEvent(new CustomEvent("budgetly:payment-required"));
    }
    throw presentableError(new ApiError("Request unsuccessful", response.status, data), requestOptions.method);
  }
  return data;
}

export const jsonBody = (value) => JSON.stringify(value);
export const apiBaseUrl = API_BASE;

export const formErrorMessage = friendlyErrorMessage;

export function asList(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.results) ? value.results : [];
}
