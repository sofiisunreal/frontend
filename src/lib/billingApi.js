import { api, jsonBody } from "./api";
import { isSafePurchaseReference, isTrustedPaystackCheckoutUrl, validateAccessStatus, validatePurchase } from "./billingState.js";
export { isSafePurchaseReference, isTrustedPaystackCheckoutUrl, pendingPurchaseReference } from "./billingState.js";

export const BILLING_ENDPOINTS = Object.freeze({
  access: "/api/billing/access/",
  initializePurchase: "/api/billing/purchases/initialize/",
  purchase: reference => `/api/billing/purchases/${encodeURIComponent(reference)}/`,
  verifyPurchase: reference => `/api/billing/purchases/${encodeURIComponent(reference)}/verify/`,
});

// Use the existing JWT/refresh client. Timeout and cancellation apply to these
// requests; there is no Paystack key, SDK, direct provider call or client price.
function signalFor(signal) {
  const timeout = AbortSignal.timeout(20000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** GET: {has_lifetime_access, entitlement_status, purchase_required}. */
export async function getAccessStatus({ signal } = {}) {
  return validateAccessStatus(await api(BILLING_ENDPOINTS.access, { cache: "no-store", signal: signalFor(signal) }));
}

/** POST {}: {reference, authorization_url}. The server owns the offer/amount. */
export async function initializeLifetimePurchase() {
  const purchase = await api(BILLING_ENDPOINTS.initializePurchase, { method: "POST", body: jsonBody({}), signal: signalFor() });
  if (!isSafePurchaseReference(purchase?.reference) || !isTrustedPaystackCheckoutUrl(purchase?.authorization_url)) throw new Error("Budgetly received an unsafe checkout response. No checkout was opened. Please try again later.");
  return purchase;
}

/** Authenticated, user-owned purchase snapshot; validates actual backend states. */
export async function getPurchase(reference, { signal } = {}) {
  if (!isSafePurchaseReference(reference)) throw new Error("The purchase reference is missing or invalid.");
  return validatePurchase(await api(BILLING_ENDPOINTS.purchase(reference), { cache: "no-store", signal: signalFor(signal) }), reference);
}

/** POST {}: snapshot + {has_lifetime_access, activated}; activated may be false.
 * Always confirm the current entitlement with getAccessStatus before success.
 */
export async function verifyPurchase(reference, { signal } = {}) {
  if (!isSafePurchaseReference(reference)) throw new Error("The purchase reference is missing or invalid.");
  return validatePurchase(await api(BILLING_ENDPOINTS.verifyPurchase(reference), { method: "POST", body: jsonBody({}), signal: signalFor(signal) }), reference, true);
}
