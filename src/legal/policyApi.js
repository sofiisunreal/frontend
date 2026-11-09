import { api, jsonBody } from "../lib/api";
import { legalAcceptanceBody } from "./policyRecords";

// Reuse the configured Django origin, JWT refresh and error handling.
// Fresh reads prevent browser caches from carrying old acceptance identities.
export const policyApi = {
  readActiveDocuments: () => api("/api/auth/legal-documents/", { auth: false, cache: "no-store", signal: AbortSignal.timeout(20000) }),
  readLegalStatus: () => api("/api/auth/legal-status/", { cache: "no-store", signal: AbortSignal.timeout(20000) }),
  acceptDocuments: documents => api("/api/auth/legal-acceptances/", { method: "POST", body: jsonBody(legalAcceptanceBody(documents)), signal: AbortSignal.timeout(20000) }),
};
