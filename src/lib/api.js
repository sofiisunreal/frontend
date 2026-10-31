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

function messageFrom(data, fallback) {
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.error) return String(data.error);
  if (data && typeof data === "object") {
    const first = Object.values(data).flat(Infinity).find((value) => typeof value === "string");
    if (first) return first;
  }
  return fallback;
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
  try {
    response = await fetch(url, { ...requestOptions, headers });
  } catch {
    throw new ApiError("Couldn't reach Budgetly. Check the connection and try again.", 0);
  }
  if (response.status === 401 && auth && retry) {
    const access = await refreshAccessToken();
    if (access) return api(path, options, false);
    window.dispatchEvent(new CustomEvent("budgetly:unauthorized"));
  }
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    throw new ApiError(messageFrom(data, `Request failed (${response.status}).`), response.status, data);
  }
  return data;
}

export const jsonBody = (value) => JSON.stringify(value);
export const apiBaseUrl = API_BASE;

export function formErrorMessage(error) {
  if (error?.details && typeof error.details === "object") {
    return Object.entries(error.details)
      .map(([field, messages]) => `${field.replaceAll("_", " ")}: ${Array.isArray(messages) ? messages.join(" ") : messages}`)
      .join(" · ");
  }
  return error?.message || "Something went wrong. Please try again.";
}

export function asList(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.results) ? value.results : [];
}
