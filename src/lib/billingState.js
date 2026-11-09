// Client-side validation and resume hints only. Entitlements always come from
// the authenticated access endpoint, never these values or browser storage.
export const LIFETIME_PRICE_LABEL = "KES 1,050";
export const PURCHASE_STATUSES = Object.freeze(["initialized", "pending", "successful", "failed", "abandoned", "reversed"]);
export const TERMINAL_PURCHASE_STATUSES = Object.freeze(["failed", "abandoned", "reversed"]);
export const INACTIVE_ENTITLEMENTS = Object.freeze(["revoked", "refunded", "chargeback_suspended"]);
const REFERENCE_KEY = "budgetly.pendingPaymentReference";
const OWNER_KEY = "budgetly.pendingPaymentUser";

export function isSafePurchaseReference(reference) {
  return typeof reference === "string" && /^bgt_[a-f0-9]{32}$/.test(reference);
}

export function paymentReturnReference(path) {
  const references = new URLSearchParams(path.split("?")[1] || "").getAll("reference");
  return references.length === 1 && isSafePurchaseReference(references[0]) ? references[0] : null;
}

export function isTrustedPaystackCheckoutUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.paystack.com" && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export function hasLifetimeAccess(data) {
  return data?.has_lifetime_access === true && data.entitlement_status === "active" && data.purchase_required === false;
}

export function validateAccessStatus(data) {
  const statuses = [null, "active", ...INACTIVE_ENTITLEMENTS];
  if (!data || typeof data.has_lifetime_access !== "boolean" || typeof data.purchase_required !== "boolean" || !statuses.includes(data.entitlement_status) || data.purchase_required === data.has_lifetime_access || data.has_lifetime_access !== (data.entitlement_status === "active")) throw new Error("Budgetly returned an incomplete access status. Please check again.");
  return { has_lifetime_access: data.has_lifetime_access, entitlement_status: data.entitlement_status, purchase_required: data.purchase_required };
}

export function validatePurchase(data, reference, verified = false) {
  if (!data || data.reference !== reference || !PURCHASE_STATUSES.includes(data.status) || !Number.isSafeInteger(data.expected_amount_minor) || data.expected_amount_minor <= 0 || data.expected_currency !== "KES" || (verified && (typeof data.has_lifetime_access !== "boolean" || typeof data.activated !== "boolean"))) throw new Error("Budgetly returned an incomplete purchase response. Please check the payment again.");
  return data;
}

export function rememberPurchaseReference(reference, userId, storage = globalThis.sessionStorage) {
  if (!isSafePurchaseReference(reference)) return false;
  try {
    const previous = storage.getItem(REFERENCE_KEY);
    storage.setItem(REFERENCE_KEY, reference);
    if (userId != null) storage.setItem(OWNER_KEY, String(userId));
    else if (previous !== reference) storage.removeItem(OWNER_KEY);
    return true;
  } catch { return false; }
}

export function pendingPurchaseReference(userId, storage = globalThis.sessionStorage) {
  try {
    const reference = storage.getItem(REFERENCE_KEY), owner = storage.getItem(OWNER_KEY);
    return isSafePurchaseReference(reference) && (!owner || userId == null || owner === String(userId)) ? reference : null;
  } catch { return null; }
}

export function clearPendingPurchaseReference(reference = null, storage = globalThis.sessionStorage) {
  try {
    if (reference && storage.getItem(REFERENCE_KEY) !== reference) return;
    storage.removeItem(REFERENCE_KEY);storage.removeItem(OWNER_KEY);
  } catch { /* Storage availability never establishes access. */ }
}
