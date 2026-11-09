import { api, jsonBody } from "./api";
import { googleFlowError, googleLoginBody, googleRegistrationBody, validateGoogleProfile, validateGoogleTokens } from "./googleState.js";

const requestSignal = signal => signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000);

export async function authenticateGoogle(credential, { registration, signal } = {}) {
  const body = registration ? googleRegistrationBody(credential, registration.identities, registration.declarations) : googleLoginBody(credential);
  const tokens = validateGoogleTokens(await api("/api/auth/google/", { method: "POST", auth: false, body: jsonBody(body), signal: requestSignal(signal) }));
  if (tokens.access === credential || tokens.refresh === credential) throw googleFlowError("google_response_invalid");
  return tokens;
}

export async function readGoogleSessionProfile(access, { signal } = {}) {
  // Verify a fresh Budgetly JWT before committing a session. No Google token is
  // stored, and a late callback cannot overwrite a different browser session.
  return validateGoogleProfile(await api("/api/auth/profile/", { auth: false, headers: { Authorization: `Bearer ${access}` }, signal: requestSignal(signal) }));
}

export async function linkGoogleIdentity(credential, { signal } = {}) {
  const response = await api("/api/auth/google/link/", { method: "POST", body: jsonBody(googleLoginBody(credential)), signal: requestSignal(signal) });
  if (typeof response?.linked !== "boolean") throw googleFlowError("google_response_invalid");
  return response;
}
