// Contract helpers only. Google credentials are opaque, short-lived inputs;
// identity verification and account ownership are the backend's responsibility.
export function googleFlowError(code) {
  const error = new Error("Google authentication could not be completed.");
  error.code = code;
  return error;
}

export function isGoogleClientId(value) {
  return typeof value === "string" && /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value);
}

export function googleLoginBody(credential) {
  if (typeof credential !== "string" || !credential.trim() || credential.length > 12000) throw googleFlowError("invalid_google_credential");
  return { credential };
}

export function googleRegistrationBody(credential, identities, declarations) {
  const body = googleLoginBody(credential);
  const keys = ["age_eligibility", "accept_terms", "accept_privacy_policy"];
  if (!keys.every(key => declarations?.[key] === true)) throw googleFlowError("legal_acceptance_required");
  const pair = {};
  for (const type of ["terms", "privacy"]) {
    const document = identities?.[`${type}_document`];
    if (!document || !Number.isSafeInteger(document.id) || document.id < 1 || typeof document.version !== "string" || !document.version.trim() || !/^[a-f0-9]{64}$/.test(document.content_sha256 || "")) throw googleFlowError("legal_acceptance_required");
    pair[`${type}_document`] = { id: document.id, version: document.version, content_sha256: document.content_sha256 };
  }
  if (pair.terms_document.id === pair.privacy_document.id) throw googleFlowError("legal_acceptance_required");
  return { ...body, ...Object.fromEntries(keys.map(key => [key, declarations[key]])), ...pair };
}

export function validateGoogleTokens(response) {
  if (![response?.access, response?.refresh].every(token => typeof token === "string" && token.length > 0 && token.length <= 12000 && !/\s/.test(token)) || response.access === response.refresh) throw googleFlowError("google_response_invalid");
  return { access: response.access, refresh: response.refresh };
}

export function validateGoogleProfile(profile) {
  if (!profile || !Number.isSafeInteger(profile.id) || profile.id < 1 || typeof profile.username !== "string" || !profile.username || ["first_name", "last_name", "email"].some(key => profile[key] != null && typeof profile[key] !== "string")) throw googleFlowError("google_response_invalid");
  return profile;
}
