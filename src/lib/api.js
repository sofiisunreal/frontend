import { errorDiagnostic, friendlyErrorMessage, normalizeError } from "./errors.js";

const configuredBase = import.meta.env.VITE_API_BASE_URL || "https://budgetly.alwaysdata.net/api";
const API_BASE = configuredBase.replace(/\/$/, "");
const REFRESH_TIMEOUT_MS = 12000;
const PROFILE_TIMEOUT_MS = 20000;
const LOGOUT_TIMEOUT_MS = 5000;
const ACCOUNT_REJECTIONS = new Set(["no_active_account", "user_inactive", "user_not_found"]);
let sessionVersion = 0, sessionController = new AbortController(), refreshFlight = null;

function endpointUrl(path) {
  const base = new URL(API_BASE);
  const apiPath = path.startsWith("/") ? path : "/" + path;
  const basePath = base.pathname.replace(/\/$/, "");
  const normalizedPath = basePath.endsWith("/api") && apiPath.startsWith("/api/") ? apiPath.slice(4) : apiPath;
  return new URL(base.origin + basePath + normalizedPath);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);this.name = "ApiError";this.status = status;this.details = details;
  }
}

export function captureSession() { return { version: sessionVersion, signal: sessionController.signal }; }
export function isCurrentSession(scope) { return scope?.version === sessionVersion && !scope.signal.aborted; }

function sessionChanged() {
  const error = new ApiError("Session changed", 0);
  error.code = "session_changed";error.transport = "cancelled";return error;
}
function assertSession(scope) { if (!isCurrentSession(scope)) throw sessionChanged(); }
function advanceSession() {
  const previous = sessionController;
  sessionVersion += 1;sessionController = new AbortController();refreshFlight = null;
  previous.abort(new DOMException("Session changed", "AbortError"));
}

// Invalidate pending authenticated work before removing credentials. No token or
// old account data is included in browser events.
export function clearSession() {
  const tokens = { access: sessionStorage.getItem("budgetly.access"), refresh: sessionStorage.getItem("budgetly.refresh") };
  advanceSession();
  sessionStorage.removeItem("budgetly.access");sessionStorage.removeItem("budgetly.refresh");
  return tokens;
}
const validToken = value => typeof value === "string" && value.length > 0 && value.length <= 12000 && !/\s/.test(value);
export function commitSession(tokens, scope) {
  assertSession(scope);
  if (!validToken(tokens?.access) || !validToken(tokens?.refresh) || tokens.access === tokens.refresh) throw new ApiError("Incomplete sign-in response", 502);
  advanceSession();
  try { sessionStorage.setItem("budgetly.access", tokens.access);sessionStorage.setItem("budgetly.refresh", tokens.refresh); }
  catch (error) { clearSession();throw error; }
  return captureSession();
}

function presentableError(error, method) {
  error.message = normalizeError(error).message;
  if (import.meta.env.DEV) console.debug("Budgetly request", errorDiagnostic(error, method));
  return error;
}
function announce(name) { window.dispatchEvent(new CustomEvent(name)); }

// Race both fetch and response-body reads against cancellation. This also bounds
// a transport that ignores AbortSignal; a late resolution has no commit path.
function untilAborted(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) { Promise.resolve(promise).catch(() => {});return Promise.reject(signal.reason); }
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup();reject(signal.reason); };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(value => { cleanup();resolve(value); }, error => { cleanup();reject(error); });
  });
}
function transportError(cause, signal, method) {
  const error = new ApiError("Request interrupted", 0);
  error.transport = cause?.name === "TimeoutError" || signal?.reason?.name === "TimeoutError" ? "timeout" : cause?.name === "AbortError" ? "cancelled" : "network";
  return presentableError(error, method);
}
async function readResponse(response, signal, method) {
  let raw;
  try { raw = await untilAborted(response.text(), signal); }
  catch (cause) { throw transportError(cause, signal, method); }
  try { return raw ? JSON.parse(raw) : null; } catch { return raw; }
}
function expireSession(scope, details) {
  assertSession(scope);clearSession();announce("budgetly:unauthorized");
  const error = new ApiError("Authentication rejected", 401, details);
  error.authenticationInvalid = true;return presentableError(error);
}
function unresolvedSession(error, scope) {
  assertSession(scope);error.sessionUnresolved = true;
  suspendSession(scope);return presentableError(error);
}
export function suspendSession(scope) {
  assertSession(scope);advanceSession();announce("budgetly:session-unavailable");
}

async function performRefresh(scope, refresh) {
  const signal = AbortSignal.any([scope.signal, AbortSignal.timeout(REFRESH_TIMEOUT_MS)]);
  try {
    let response;
    try {
      response = await untilAborted(fetch(endpointUrl("/api/auth/token/refresh/"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }), signal,
      }), signal);
    } catch (cause) { throw transportError(cause, signal, "POST"); }
    assertSession(scope);
    const data = await readResponse(response, signal, "POST");assertSession(scope);
    if (!response.ok) {
      // SimpleJWT's explicit rejection code is authoritative. A proxy's bare
      // 401, service outage, rate limit or malformed response is not.
      if ([401, 403].includes(response.status) && (data?.code === "token_not_valid" || ACCOUNT_REJECTIONS.has(data?.code))) throw expireSession(scope, data);
      throw new ApiError("Refresh could not be confirmed", response.status, data);
    }
    if (!validToken(data?.access) || (data.refresh !== undefined && !validToken(data.refresh))) throw new ApiError("Incomplete refresh response", 502);
    if (sessionStorage.getItem("budgetly.refresh") !== refresh) throw sessionChanged();
    sessionStorage.setItem("budgetly.access", data.access);
    if (data.refresh) sessionStorage.setItem("budgetly.refresh", data.refresh);
    return data.access;
  } catch (error) {
    if (!isCurrentSession(scope) || error.authenticationInvalid) throw error;
    throw unresolvedSession(error, scope);
  }
}
function refreshAccessToken(scope) {
  assertSession(scope);
  const refresh = sessionStorage.getItem("budgetly.refresh");
  if (!refresh) return null;
  if (refreshFlight?.version === scope.version && refreshFlight.refresh === refresh) return refreshFlight.promise;
  const flight = { version: scope.version, refresh };
  flight.promise = performRefresh(scope, refresh).finally(() => { if (refreshFlight === flight) refreshFlight = null; });
  refreshFlight = flight;
  announce("budgetly:session-checking");
  return flight.promise;
}

async function request(path, options, retry, scope) {
  const { auth = true, query, ...requestOptions } = options;
  if (auth) assertSession(scope);
  const url = endpointUrl(path);
  Object.entries(query || {}).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value); });
  const headers = new Headers(requestOptions.headers || {});
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (auth) {
    const access = sessionStorage.getItem("budgetly.access");
    if (access) headers.set("Authorization", "Bearer " + access);
  }
  const signal = auth ? (requestOptions.signal ? AbortSignal.any([scope.signal, requestOptions.signal]) : scope.signal) : requestOptions.signal;
  let response;
  try { response = await untilAborted(fetch(url, { ...requestOptions, ...((auth || headers.has("Authorization")) ? { cache: "no-store" } : {}), headers, ...(signal ? { signal } : {}) }), signal); }
  catch (cause) { if (auth && !isCurrentSession(scope)) throw sessionChanged();throw transportError(cause, signal, requestOptions.method); }
  if (auth) assertSession(scope);
  const data = await readResponse(response, signal, requestOptions.method);
  if (auth) assertSession(scope);
  if ([401, 403].includes(response.status) && auth && ACCOUNT_REJECTIONS.has(data?.code)) throw expireSession(scope, data);
  if (response.status === 401 && auth) {
    const hasRefresh = Boolean(sessionStorage.getItem("budgetly.refresh"));
    const hasAccess = Boolean(sessionStorage.getItem("budgetly.access"));
    if (retry && hasRefresh) {
      // Reuse a concurrent request's completed rotation, or join its single
      // refresh. Each original request is retried at most once.
      const currentAccess = sessionStorage.getItem("budgetly.access");
      if (currentAccess && headers.get("Authorization") !== "Bearer " + currentAccess) return request(path, options, false, scope);
      await refreshAccessToken(scope);assertSession(scope);
      return request(path, options, false, scope);
    }
    if (!hasRefresh && hasAccess && data?.code === "token_not_valid") throw expireSession(scope, data);
    if (hasRefresh || hasAccess) throw unresolvedSession(new ApiError("Session could not be confirmed", 401, data), scope);
  }
  if (!response.ok) {
    const recoveryEndpoint = /\/api\/(?:auth|billing|feedback)\//.test(url.pathname);
    const currentAccess = sessionStorage.getItem("budgetly.access");
    if (auth && response.status === 403 && data?.code === "payment_required" && !recoveryEndpoint && currentAccess && headers.get("Authorization") === "Bearer " + currentAccess) announce("budgetly:payment-required");
    throw presentableError(new ApiError("Request unsuccessful", response.status, data), requestOptions.method);
  }
  return data;
}
export function api(path, options = {}, retry = true) { return request(path, options, retry, captureSession()); }

export async function readSessionProfile({ signal } = {}) {
  const scope = captureSession();
  if (refreshFlight?.version === scope.version) await refreshFlight.promise;
  assertSession(scope);
  const deadline = AbortSignal.timeout(PROFILE_TIMEOUT_MS);
  const profile = await api("/api/auth/profile/", { cache: "no-store", signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
  if (!profile || !Number.isSafeInteger(profile.id) || profile.id < 1 || typeof profile.username !== "string" || !profile.username.trim()) throw new ApiError("Incomplete profile response", 502);
  return profile;
}

// Detached revocation only ever uses the captured, signed-out account. It never
// writes storage, dispatches auth events or updates the current UI/session.
export async function revokeSessionTokens({ access, refresh }) {
  if (!refresh) return false;
  const signal = AbortSignal.timeout(LOGOUT_TIMEOUT_MS);
  const revoke = (bearer, token) => api("/api/auth/logout/", { auth: false, method: "POST", headers: bearer ? { Authorization: "Bearer " + bearer } : {}, body: JSON.stringify({ refresh: token }), signal });
  try { await revoke(access, refresh);return true; }
  catch (error) {
    if (error.status !== 401 || signal.aborted) return false;
    try {
      const tokens = await api("/api/auth/token/refresh/", { auth: false, method: "POST", body: JSON.stringify({ refresh }), signal });
      if (!validToken(tokens?.access) || (tokens.refresh !== undefined && !validToken(tokens.refresh))) return false;
      await revoke(tokens.access, tokens.refresh || refresh);return true;
    } catch { return false; }
  }
}

export const jsonBody = value => JSON.stringify(value);
export const apiBaseUrl = API_BASE;
export const formErrorMessage = friendlyErrorMessage;
export function asList(value) { return Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : []; }
