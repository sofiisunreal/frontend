# Paystack frontend integration

## Rollout

`VITE_ENFORCE_LIFETIME_ACCESS` defaults to **false**. Only the literal string
`true` enables the future dashboard gate. `.env.example` explicitly keeps it
false; no production configuration was enabled. Vite reads this at startup/build
time, so a future approved change requires restarting or rebuilding.

With enforcement disabled, authentication opens the existing dashboard even if
the billing service is unavailable. Payment pages remain available for manual
testing. With enforcement enabled, financial routes mount only after a valid,
active access response. Unknown, inconsistent or unavailable responses do not
count as paid. Help, settings (including existing export/deletion controls),
public legal pages, recovery, the landing page and payment routes remain
reachable. This frontend gate is not a substitute for backend authorization.

There is one offer: **KES 1,050 once for lifetime access**. No subscription, free
tier or alternate plan was added. Founding-user grants are backend entitlements;
an already-active account is shown a dashboard link rather than another checkout.

## Routes and APIs

| Route | Behavior |
| --- | --- |
| `/payment-required` | Authenticated offer, access check, checkout or earlier-payment recovery |
| `/payment/complete?reference=<actual-reference>` | Public return screen; sign in if needed, then authenticated verification |
| `/login?returnTo=payment-required` | Existing login, followed by the offer |
| `/login?payment=1` | Existing login; resumes a validated, owner-aware pending reference |

All billing calls use the existing central API client, API base URL and JWT
refresh behavior. No SDK, provider key or direct Paystack API call is present.

| Method / endpoint | Expected response |
| --- | --- |
| GET `/api/billing/access/` | `has_lifetime_access` boolean, `entitlement_status` null/active/revoked/refunded/chargeback_suspended, `purchase_required` boolean |
| POST `/api/billing/purchases/initialize/` with `{}` | `reference`, `authorization_url` |
| GET `/api/billing/purchases/<reference>/` | `reference`, `status`, `expected_amount_minor`, `expected_currency`, optional backend timestamps |
| POST `/api/billing/purchases/<reference>/verify/` with `{}` | Purchase snapshot plus boolean `has_lifetime_access` and `activated` |

The frontend never sends an amount, currency, email or calculated charge to
initialize. The displayed price is offer copy; the backend owns the actual price.
Hosted URLs must use HTTPS, exactly `checkout.paystack.com`, no credentials and no
nonstandard port. This follows Paystack's documented hosted-checkout flow:
[Accept payments](https://paystack.com/docs/payments/accept-payments/).

The available backend generates references as `bgt_` plus 32 lowercase hex
characters. The documentation's `bgt_example` is illustrative and is deliberately
rejected. Callback references must be present exactly once. URL `status` is ignored.

## Confirmation and recovery

The completion page reads the owned purchase, asks the backend to verify it,
then separately reads current access. Success requires all three access fields
to agree: `true`, `active`, `false`. A successful purchase or
`activated: false` does not by itself grant access. Already-activated/webhook
payments work when the fresh access response is active. A temporary provider
verification error can still lead to confirmed access if the separate access
endpoint already reports an active entitlement. This is consistent with
Paystack's server verification guidance:
[Verify payments](https://paystack.com/docs/payments/verify-payments/).

Supported purchase statuses are `initialized`, `pending`, `successful`, `failed`,
`abandoned` and `reversed`. Pending or recorded-but-not-active purchases get one
initial check and at most four automatic checks after 1, 2.5, 5 and 8 seconds.
Polling then stops and exposes a working manual retry. Leaving the screen cancels
its pending requests/timer. A successful purchase without active access never
shows activation success or encourages another payment.

Failed/abandoned attempts allow a new checkout after checking current access.
Reversed or inactive entitlements point to existing Help instead. The inspected
backend does not automatically reactivate an existing revoked/refunded entitlement
on repurchase, so that situation needs backend/operator review.

Initialization is locked immediately against repeated clicks. A known unfinished
attempt routes to confirmation first. Backend 409 conflicts trigger a fresh
access check; errors are shown without automatic checkout retries. 404 responses
explain purchase ownership, network/provider failures provide manual recovery,
and malformed API responses are rejected. Billing fetches have a 20-second abort
signal; token refresh continues to use the unchanged central authentication client.

The browser stores only a validated reference and, where known, its account ID
in session storage. These are resume hints, never proof of payment. They survive
an expired session or a page refresh, are scoped to the known account, and clear
on explicit logout or confirmed/terminal completion. If a stale JWT expires
before the callback mounts, its valid reference is retained for login recovery.

## Local manual testing with the real backend

1. In the frontend folder, run `npm run dev`. Use the URL Vite prints, normally
   `http://localhost:5173`.
2. Keep `VITE_API_BASE_URL=https://budgetly.alwaysdata.net/api` and leave
   `VITE_ENFORCE_LIFETIME_ACCESS=false`. No browser Paystack keys are required.
3. Register through the existing UI, review/accept the actual active legal
   documents and sign in. If policies are not active, registration correctly
   remains unavailable; use an existing test account. Existing authentication
   and password-reset rules are unchanged.
4. Open `/payment-required` explicitly while rollout is disabled. An active
   founding/paid account should offer **Go to Dashboard**, without checkout.
5. For an unpaid **test account**, choose **Unlock Budgetly** yourself. Confirm in
   browser Network that initialize has body `{}` and returns an approved hosted
   URL. Check the backend/provider are in Test Mode before manually proceeding.
6. Complete or abandon the hosted test checkout yourself. The backend's
   `PAYSTACK_CALLBACK_URL` must point to its `/api/billing/paystack/callback/`.
   `FRONTEND_PAYMENT_RETURN_URL` must point to the correct frontend origin plus
   `/payment/complete`. The frontend does not invent or override those URLs.
7. On return, inspect verify and access responses. Only confirmed active access
   exposes **Go to Dashboard**. Refresh the page to confirm session continuity.
   Test signing in again if the checkout session expired.
8. To retry pending confirmation, use **Check payment again**. For a failed or
   abandoned attempt, use **Return to payment**. Avoid creating a second payment
   while the first is still pending.

No real checkout was initialized or completed by the automated checks. Live
provider redirects, Alwaysdata CORS, webhook timing, callback configuration and
founding-user migration still require the owner's manual Test Mode verification.

## Automated verification

- `npm run lint`
- `npm run build` (normal, enforcement-disabled build)
- `npm run test:billing` (Node built-in tests; no added dependency)
- `git diff --check`
- Synthetic-only browser checks in `.taste-skill/paystack-integration/check.mjs`.
  The matching server intercepts API fetches and refuses external traffic. The
  hosted checkout destination is intercepted into local synthetic HTML; it never
  contacts Paystack. A separate ignored build tests enforcement enabled without
  changing the default build or a deployment configuration.

UI checks cover Orbit light/dark, desktop/tablet/mobile, keyboard skip navigation,
reduced motion, duplicate clicks, schema/URL validation, callback and retry states,
registration consent, JWT recovery, logout, default-off access, future-on gating
and no protected-content flash. Screenshots and results live beside the harness.

No backend code, central authentication client, financial calculations, legal
wording, hashing or consent controls were changed.

## Files in this change

| File | Change |
| --- | --- |
| `src/App.jsx` | Billing access lifecycle, guarded future rollout, payment routes and login recovery |
| `src/pages/PaymentPages.jsx` | Orbit offer, access loading and confirmation screens |
| `src/lib/billingApi.js` | Four existing endpoints, request/response validation and cancellation |
| `src/lib/billingState.js` | Pure access/reference/URL validators and owner-aware resume hints |
| `src/styles/orbit-billing.css` | Scoped responsive payment-page presentation |
| `src/styles/orbit-theme.css` | Adds the billing root to the two existing semantic token scopes only |
| `.env.example` | Explicit enforcement-disabled example |
| `package.json` | Small Node built-in billing test command |
| `.gitignore` | Ignore local enforcement build, screenshots and browser profiles |
| `tests/billing.test.mjs` | Six focused validation/resume tests |
| `docs/paystack-frontend.md` | Contract, rollout, limitations and testing guide |
| `.taste-skill/paystack-integration/` | Local-only synthetic QA server, browser checks and verification evidence |

Existing uncommitted work was preserved. A before/after SHA-256 comparison showed
only the five existing source files listed above changed during this task, plus
the new helper. AuthPage, FinancePage, the API client, legal sources/providers,
dashboard, sidebar and other existing source files retain their initial bytes.
The inspected backend files also retain their original hashes.

Final checks passed: lint, production build, six unit tests, sixteen synthetic
browser regression groups, standard `git diff --check`, and unchanged legal-source
preflight. The isolated enforcement-on build also passed. Visual inspection
covered 1440px, 768px and 390px, both themes and reduced motion. The final visual
checker reported zero blocking findings with the approved Orbit material and
display-heading exceptions. Its remaining style notes concern the single small
kicker, supporting metadata sizes and large offer title. Its canvas/background
warnings assume a sidebar/body background; the screenshots show a centered
1120px composition on a full-height Orbit background. No contrast or overflow
failure was reported. These are presentation notes, not unverified payment claims.
Four additional result-screen checks passed for mobile dark success, mobile light
pending, desktop dark ownership error and mobile invalid-reference handling.

## Contract review — November 9, 2026

Reviewed the current local Django billing URL configuration, views, models,
payment/access services and settings against the existing frontend. No payment
screen was redesigned. No backend file or deployment configuration was changed.

| Requirement | Result |
| --- | --- |
| Purchase initialization | Authenticated `POST /api/billing/purchases/initialize/` with `{}`. No client amount, currency or email. |
| Hosted checkout | Only the validated `authorization_url` returned by initialize is opened. No constructed URL, frontend provider key or direct Paystack API request. |
| Completion verification | Authenticated owned-purchase GET, server verification POST, then a fresh access GET. Callback `status` never establishes payment or access. |
| Clear outcomes | Existing pending, failed/abandoned, reversed, interrupted/error and confirmed-access states remain in use. Polling is bounded and retry is explicit. |
| Timeout behavior | No automatic initialization retry. Timeout, interrupted and network-error wording now explains that an attempt may already exist. |
| Lifetime access refresh | The completion page updates the application from the separately fetched, validated access response. `activated: false` remains valid for a previously processed purchase. |
| Duplicate purchases | Active access hides checkout; the click now refreshes access again before initialize, covering an offer left open while another tab/webhook activates access. The server's 409 guard remains in place. Unknown/inactive access blocks initialization. |
| Price | UI shows **KES 1,050 once**. This matches the current backend default `105000` minor units/KES. The backend checks its active offer against its configured price; the frontend cannot inspect that deployed offer without an authenticated purchase. |
| Authentication parity | Google and password authentication enter the same JWT session, billing helpers and access checks. Neither grants paid access by itself. |

New focused coverage is in `tests/billing-api.test.mjs`, included by
`npm run test:billing`. The review ran 12 billing tests, 23 error/API tests and 15
Google tests successfully, plus 14 existing payment browser groups and four new
focused browser groups. Synthetic browser checks covered the unchanged payment
screens across desktop/tablet/mobile and both themes, stale ownership, lost
responses, failed access refresh and both authentication methods. The normal
production build and lint pass. Enforcement stayed disabled; no enforcement-on
build was needed for this review.

Read-only deployed checks: `/api/billing/access/` returns 401 without credentials,
and CORS preflights for initialize and verify allow `http://localhost:5173`,
Authorization and Content-Type. These establish route protection/CORS, not
successful payment processing. No deployed initialize or verify POST was sent.

### Ready for one manual Test Mode purchase

The frontend is ready. Before the owner starts the single end-to-end purchase,
confirm the deployed backend uses **Test Mode**, matching test credentials, and
an active offer of **105000 minor units / KES**. For the local frontend test:

- `PAYSTACK_CALLBACK_URL` should be
  `https://budgetly.alwaysdata.net/api/billing/paystack/callback/`.
- `FRONTEND_PAYMENT_RETURN_URL` should be
  `http://localhost:5173/payment/complete`.
- Verify the test-mode webhook destination/signature configuration for
  `/api/billing/paystack/webhook/` on the backend.
- Keep `VITE_ENFORCE_LIFETIME_ACCESS` disabled. Sign in to an unpaid test account,
  open `/payment-required`, confirm **KES 1,050**, and explicitly start checkout.
  Use Paystack's Test Mode payment instructions. On return, confirm the owned
  purchase/verify/access sequence, then reopen the offer to confirm checkout is
  replaced by **Go to Dashboard**.

The real hosted payment, deployed offer, provider configuration and webhook/return
round trip have not been verified by these synthetic checks. They require the
owner's manual Test Mode transaction. No live mode, real payment, new entitlement,
push or deployment was performed.

Recovery limitation in the confirmed backend contract: an initialization timeout
can leave a pending attempt while the 503 response supplies no reference. There
is no authenticated endpoint here to discover that unknown reference. The UI
reports uncertainty and does not initialize again automatically; backend cooldown
and duplicate guards still apply. If that condition occurs, check access and use
Help/operator review rather than repeatedly attempting payment. No recovery
endpoint or reference has been invented.
