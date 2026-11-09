# Error messaging and UX refinement

Implemented locally in the existing React application. No backend changes,
deployment, payment initialization, real account deletion or financial writes
were performed during verification.

## Central approach

`src/lib/errors.js` exports `normalizeError(error, options)`. Its safe UI result
contains `kind`, `message`, `fieldErrors`, `formErrors`, `issues`, `retryable` and
`cancelled`. Forms supply their actual labels and, where necessary, aliases such
as backend `new_password` → reset-form `password` and `interest_method` →
`interest_type`. Nested errors retain their field identity; numeric array indexes
and backend keys are not printed as prose.

The normalizer supports DRF detail/non-field/field responses, arrays, nested
validation, ordinary HTTP failures, fetch interruptions, existing timeout signals
and Axios-style error shapes. The app continues to use its existing fetch client;
Axios and other dependencies were not added.

Validation text is taken from a reviewed catalog and narrowly bounded templates.
This preserves actual password lengths, decimal limits, amount restrictions,
loan-term locks, currency/date constraints and savings-state rules. Unexpected
backend text receives a safe contextual fallback. New backend validation wording
should be reviewed and added with a test rather than automatically trusted.

`ApiError.status` and the original `details` are retained for existing contract
checks, including unavailable/stale legal documents. `ApiError.message` is safe
presentation copy. The compatibility `formErrorMessage` helper now uses the same
normalizer. Development logging contains only request method, bounded status and
error kind; it omits URLs, reset links, payloads, credentials, financial values,
provider messages and stack traces. No external reporting service was added.

JWT storage, refresh/rotation, retry rules, API paths, request payloads and
response data are preserved. Existing request deadlines are respected; this
change does not introduce a new universal timeout or automatic write retries.

## Pages and presentation

- Login and registration: contextual authentication copy, inline backend fields,
  unchanged legal identities and explicit declarations. Inactive/missing/deleted
  accounts do not receive identifying public explanations.
- Expired sessions: existing recovery goes to the same login route with a
  presentation query, `/login?session=expired`, and a clear sign-in message.
- Forgot/reset password: invalid links have a recovery instruction. A missing
  service or failed request no longer claims that instructions were sent. The
  inspected backend returns the same successful response for existing and absent
  email accounts; that enumeration protection is preserved.
- Settings: profile, current/new password and deletion errors sit within their
  own forms. Export errors sit by the export action. Existing deletion confirmation,
  logout-on-success and JSON export behavior remain intact.
- Accounts, transactions, categories, budgets, transfers, loans/repayments and
  savings dialogs: field-level errors, non-field explanations, retained values and
  enabled retry controls. Financial calculations and payload construction are
  unchanged. Archive/delete confirmation stays open when its request fails.
- Savings row actions: failures are presented as action failures while keeping
  loaded records visible. An earlier success notice is cleared before a new action.
- Help feedback: inline validation, unchanged submission body, no failed entry
  added to history, and a retry action for history loading failures. Articles,
  search and navigation are preserved.
- Dashboard, spending and exchange-rate loading: contextual safe copy and existing
  retry behavior.
- Legal readers/review: safe error text only. Immutable wording, hashing,
  official-document priority and explicit acceptance behavior are unchanged.
- Paystack: interrupted verification means **unknown status**, never a failed or
  successful payment. No automatic checkout retry was introduced. The backend
  remains authoritative, URL status remains ignored and rollout enforcement
  remains disabled by default.

`FormFeedback.jsx` supplies a consistent Orbit alert and inline field text using
the existing light/dark semantic colors. Submission failures announce once at
form level with `role="alert"`; inputs use `aria-invalid` and `aria-describedby`.
Focus goes to the first invalid enabled field, or the form alert when there are
no invalid fields. The bounded next-frame focus helper reveals the entire label,
input and error inside mobile scrolling dialogs. No new motion or toast system
was introduced. Browser validation constraints still apply.

## Examples

| Previous presentation | Updated presentation |
| --- | --- |
| `detail: No active account found with the given credentials` | The username or password you entered is incorrect. |
| Raw invalid/expired token detail | Your session has expired. Please sign in again. |
| `email: Enter a valid email address.` in one global alert | Enter a valid email address. beside Email address |
| Password errors flattened into a technical response | Backend password requirements beside the password field |
| Nested objects or `[object Object]` | Correctly labelled inline details or a safe form-level fallback |
| Provider/network exception during verification | We couldn't check your payment status. It may still be processing. Check again before starting another payment. |
| Forgot-password 404 shown as instructions sent | We couldn't request reset instructions. Please try again shortly. |

## Files changed

| File | Purpose |
| --- | --- |
| `src/lib/errors.js` | New normalization, validation catalog, focus and diagnostic helpers |
| `src/lib/api.js` | Safe public error messages, transport classification and redacted development metadata |
| `src/components/FormFeedback.jsx` | New shared alert and inline error components |
| `src/styles/orbit-feedback.css` | Scoped Orbit feedback styling |
| `src/pages/AuthPage.jsx` | Authentication/recovery field errors and focus |
| `src/App.jsx` | Session-expiry presentation query only |
| `src/pages/FinancePage.jsx` | Resource/settings/action errors and inline associations |
| `src/pages/HelpPage.jsx` | Feedback validation and history recovery |
| `src/pages/PaymentPages.jsx` | Safe checkout/verification messages |
| `src/legal/policyRecords.js` | Normalized legal-service error copy only |
| `src/components/legal/LegalUpdateReview.jsx` | Normalized explicit-agreement failure feedback |
| `package.json` | `test:errors` command, without dependencies |
| `.gitignore` | Keeps local error-review screenshots out of version control |
| `tests/errors.test.mjs` | 16 focused normalization/security cases |
| `tests/api-errors.test.mjs` | 7 API/authentication regression cases using mocked fetch |
| `docs/error-messaging.md` | This audit and integration report |
| `.taste-skill/error-ux/` | Isolated synthetic UI server, checks and evidence |

All unrelated working-tree changes were preserved. Existing Orbit tokens and
styles, billing service/state helpers, legal Markdown and financial calculation
helpers were not redesigned or replaced.

## Verification

- `npm run lint`: passes.
- `npm run build`: passes.
- `npm run test:errors`: 23 tests pass.
- `npm run test:billing`: all 6 existing tests pass.
- Legal-source preflight: passes; both existing Markdown hashes are unchanged.
- `git diff --check`: passes.
- 15 synthetic browser regression groups cover auth/recovery, JWT expiry,
  registration declarations and identities, settings/deletion, resource forms,
  loan/repayment payloads, transfers, feedback, savings actions, loading errors,
  export, archive recovery, payment interruptions and document integrity.
- Desktop light and mobile dark screenshots were inspected. Browser checks verify
  no horizontal overflow, error associations, focus, retained values, re-enabled
  controls, mobile error visibility and no raw internal text. All API responses
  in this harness are local synthetic fixtures, with external fetches blocked.

Screenshots and results are under `.taste-skill/error-ux/`. To run the synthetic
checks locally, first build, start `node .taste-skill/error-ux/server.mjs`, then run
`node .taste-skill/error-ux/check.mjs`. The browser helper uses installed Chrome
and needs no extra package. Real workflows can be reviewed with `npm run dev`.

## Backend follow-up

No backend defect requiring a change was established. The inspected deletion
endpoint can return 409 when protected linked records prevent deletion; the UI
now explains this and points to existing Help. If encountered live, resolution
belongs to the backend/operator rather than a frontend retry that claims success.

Live email delivery, provider availability and real payment outcomes were not
tested or changed. Unknown future validation copy deliberately stays generic
until reviewed. No policy was accepted or activated by these checks.
