# Paid-app messaging and staged signup journey

Implemented locally on November 9, 2026. Production enforcement, deployment,
backend configuration and real financial records were not changed.

## Product offer and disclosure

Budgetly offers lifetime access for **KES 1,050 once**. There are no subscriptions,
trials, free tiers or premium-plan variants. Creating an account is separate from
purchasing access. The shared `LIFETIME_PRICE_LABEL` is presentation copy; the
backend continues to own the actual offer, price and charge amount. Initialize
still sends `{}`.

- Landing hero: the existing Get started/Explore buttons are followed by
  “Lifetime access · KES 1,050 once” and “No subscriptions. No recurring charges.”
- Closing invitation: the same disclosure appears before Get started, with
  account creation and unlocking described as separate steps.
- Registration heading: “Create your account, then unlock Budgetly for
  KES 1,050. One payment, lifetime access.”
- Login: a small offer reminder sits below Create an account. The post-registration
  notice explains that signing in checks access and has not started a payment.
- Help's Getting started article: account creation → sign in → unlock → initial
  financial setup, including an existing-route link to check lifetime access.
- Payment Required: the existing offer/layout and explicit **Unlock Budgetly**
  action remain. The footer now links to Account settings, where deletion and
  logout remain available.

No pricing table, extra pricing route, authentication provider, billing endpoint
or checkout implementation was introduced. Orbit tokens, themes and motion are
preserved. Public product previews remain labelled illustrative.

## Exact journeys when enforcement is enabled

| Entry | Journey |
| --- | --- |
| Password signup | Existing registration POST → separate login → profile and current billing access → Payment Required if unpaid. Registration still returns user information, not JWTs. |
| Google signup | Explicit eligibility/Terms/Privacy confirmations → Google credential and exact verified document identities → Budgetly JWT/profile → current billing access → Payment Required if unpaid. No username/password form is required for Google. |
| Returning unpaid user | Login/profile → current billing access → Payment Required. Closing the payment page does not confer access; the next login checks again. |
| Returning active lifetime owner | Login/profile → current active entitlement → Dashboard. No checkout is initialized by authentication or routing. |
| Access pending/unavailable | Loading, then a recoverable access-check state. Financial components and their data requests do not mount while the gate is unresolved or unpaid. |
| Checkout | User explicitly selects Unlock Budgetly → fresh access check → existing initialize POST → validated backend authorization URL. |
| Payment return | Existing owned-purchase read and server verify POST → fresh access response → confirmed lifetime access → user chooses Go to Dashboard. A callback status is never proof of payment. |

Password and Google differ only in the existing authentication step. They use the
same billing utilities, current-account access decision, checkout and verification
path. Neither signup method grants entitlement itself. Existing pending-payment
reference recovery and explicit Google linking destinations remain supported.

Financial routes remain guarded on initial load, navigation and refresh. Help,
Settings, account deletion/logout, public legal documents, legal review, recovery,
the landing page and payment pages remain reachable. Backend authorization is
still essential; the frontend gate is not the security boundary.

## Safe rollout and backend payment-required responses

The normal build still uses **`VITE_ENFORCE_LIFETIME_ACCESS=false`** (or the existing
default-off behavior). It preserves existing financial navigation during the safe
rollout; publishing paid copy does not silently enable the paywall. The complete
gated journeys were verified in a separate ignored local test build only.

An authenticated financial API response of **403 with `code: "payment_required"`**
is now handled as the backend's explicit access decision, even if the frontend
rollout flag has not yet been enabled. It does not refresh/clear the JWT as if the
session expired. The app deduplicates the denial, checks current billing access,
and takes financial routes to payment recovery. A repeated direct financial link
cannot bypass that server-required gate.

Auth, billing and feedback recovery endpoints do not emit the global payment
redirect event. Legal/Help/Settings/recovery surfaces are not redirected out from
under the user. An error from the access endpoint remains a manual retry state,
preventing an automatic access-check/redirect loop. Late responses from a replaced
browser session do not emit a payment redirect for the new session. Logout or a
new authentication clears account-specific denial state; verified active access
clears it as well.

## Verification

Passed:

- `npm run lint` and the normal `npm run build`.
- An isolated enforcement-on build in `.taste-skill/paid-journey/enforced-dist`;
  environment overrides were restored and normal `dist` remains enforcement-off.
- **52 unit/service tests**: 25 shared error/API, 12 billing and 15 Google tests.
  New coverage checks payment-required signaling, JWT preservation, recovery
  endpoint exclusions and stale-session responses.
- **12 synthetic browser groups** covering disclosures, both signup methods,
  paid/unpaid returning users, abandonment and later login, access failures and
  retry, all financial routes/refreshes, slow access without content flash,
  account/legal/recovery access, explicit checkout and server verification,
  default-off behavior, backend denials and billing-403 loop prevention.
- Visual checks at 1440px and 390px in light/dark themes, with reduced motion:
  pricing is visible near the hero CTA, registration retains all three unchecked
  declarations, and no horizontal overflow was detected.

Browser cases, screenshots and results are in `.taste-skill/paid-journey/`. Google
identity and checkout destinations in those cases are local test fixtures. No
real Google signup, Paystack transaction or entitlement activation was performed.

## Coordinated frontend/backend rollout — manual, later

1. Verify existing paid/founding owners have the intended active backend
   entitlements before enforcing access. Review inactive/revoked accounts using
   existing operator procedures; do not infer grants from frontend storage.
2. Confirm active immutable legal documents, both authentication methods and
   account management/recovery endpoints work on the target environment.
3. Confirm the deployed offer is **105000 minor units / KES**. Complete the
   separately approved Paystack Test Mode end-to-end check and validate callback,
   webhook and `FRONTEND_PAYMENT_RETURN_URL` configuration as described in
   `paystack-frontend.md`. Keep test/live credentials on the backend.
4. Ship/review this compatible frontend while its rollout flag is off. Verify
   the server's financial `payment_required` response and recovery exemptions
   before enforcement. Exercise both flags together in staging.
5. During an explicitly approved rollout, enable backend
   **`BILLING_ENFORCE_LIFETIME_ACCESS`** for financial APIs, then rebuild/release
   the frontend with **`VITE_ENFORCE_LIFETIME_ACCESS=true`**. This frontend already
   handles the transition if backend enforcement arrives first. Merely changing a
   Vite environment value without rebuilding does not update shipped assets.
6. Smoke-test unpaid/paid Google and password users, legal/Settings/logout,
   payment completion and already-owned access. Monitor failures before expanding
   the rollout. Keep previous configuration/build values available for a coordinated
   rollback; do not leave frontend and backend access policy mismatched.

These are future operator steps, not actions performed by this change. Real
provider configuration and a real Test Mode payment remain manual verification.
The existing unknown-reference recovery limitation after an initialize timeout
is unchanged; no lookup endpoint was invented.

## Files changed

| File | Purpose |
| --- | --- |
| `src/App.jsx` | Account-scoped backend-denial recovery, reusing the existing staged gate |
| `src/lib/api.js` | Financial payment-required notification without changing JWT refresh |
| `src/lib/errors.js` | Clear, safe payment-required feedback |
| `src/lib/billingState.js` | Shared display-price label; no entitlement/calculation changes |
| `src/pages/LandingPage.jsx` | Hero disclosure |
| `src/components/landing/LandingSections.jsx` | Closing disclosure/copy |
| `src/components/LifetimeOfferNote.jsx` | Shared concise offer disclosure |
| `src/styles/orbit-pricing.css` | Scoped Orbit disclosure styles |
| `src/pages/AuthPage.jsx` | Registration/login copy only; auth fields, submits and consent unchanged |
| `src/pages/HelpPage.jsx` | Getting-started copy and access link |
| `src/pages/PaymentPages.jsx` | Shared price label and Account settings footer link only |
| `tests/api-errors.test.mjs` | Payment-required and recovery regression tests |
| `.gitignore` | Ignore the isolated gated test build and screenshots |
| `.taste-skill/paystack-integration/server.mjs` | Local-only signup/403/payment fixtures |
| `.taste-skill/paid-journey/check.mjs` | Focused local browser journey checks |
| `docs/paid-app-rollout.md` | Journeys, evidence, staged rollout and limitations |
