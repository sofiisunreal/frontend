import { googleFlowError, isGoogleClientId } from "./googleState.js";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";
let loading, initializedClient, initializedSdk;
const listeners = new Map();

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;script.async = true;script.defer = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.id = "budgetly-google-identity";
    const finish = (error) => {
      window.clearTimeout(timer);script.onload = null;script.onerror = null;
      if (error) { script.remove();loading = null;reject(error); }
      else resolve(window.google.accounts.id);
    };
    const timer = window.setTimeout(() => finish(googleFlowError("google_sdk_unavailable")), 15000);
    script.onerror = () => finish(googleFlowError("google_sdk_unavailable"));
    script.onload = () => finish(window.google?.accounts?.id ? null : googleFlowError("google_sdk_unavailable"));
    document.head.append(script);
  });
  return loading;
}

export async function renderGoogleIdentityButton(element, { clientId, theme, intent = "signin", signal, onCredential, onClick }) {
  if (!isGoogleClientId(clientId)) throw googleFlowError("google_not_configured");
  const sdk = await loadGoogleIdentity();
  if (signal?.aborted || !element.isConnected) return () => {};
  if (!initializedClient || initializedSdk !== sdk) {
    sdk.initialize({ client_id: clientId, ux_mode: "popup", auto_select: false, button_auto_select: false, use_fedcm_for_button: true, callback: response => {
      const listener = typeof response?.state === "string" ? listeners.get(response.state) : null;
      if (!listener) return;
      // A button state is consumed once; stale/unmounted controls cannot route
      // credentials to another screen, account, or legal-review version.
      listeners.delete(response.state);
      listener(response.credential);
    } });
    initializedClient = clientId;initializedSdk = sdk;
  } else if (initializedClient !== clientId) throw googleFlowError("google_not_configured");
  const state = crypto.randomUUID();
  element.dataset.googleButtonState = state;
  listeners.set(state, credential => { if (!signal?.aborted) onCredential(credential); });
  try {
    sdk.renderButton(element, { type: "standard", theme: theme === "dark" ? "filled_black" : "outline", size: "large", shape: "pill", text: intent === "signup" ? "signup_with" : intent === "link" ? "continue_with" : "signin_with", width: Math.max(200, Math.min(400, Math.floor(element.clientWidth))), state, click_listener: () => { if (!signal?.aborted) onClick?.(); } });
  } catch {
    listeners.delete(state);throw googleFlowError("google_sdk_unavailable");
  }
  return () => { listeners.delete(state);if (element.dataset.googleButtonState === state) { element.replaceChildren();delete element.dataset.googleButtonState; } };
}

export function cancelGoogleIdentityRequests() { listeners.clear(); }

export function disableGoogleAutoSelect() {
  // Budgetly logout remains local/JWT logout. This does not sign out of Google
  // or revoke the user's Google account consent.
  cancelGoogleIdentityRequests();
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* Sign-out must still complete. */ }
}
