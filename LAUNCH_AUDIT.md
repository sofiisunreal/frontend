# Budgetly launch audit

**Review date:** 31 October 2026  
**Scope:** React/Vite frontend source and readable Django source under `Backend/budgetlybck`. The local checkout has no Git metadata, the backend directory is not available for writes, and no Alwaysdata deployment environment or authenticated user session was inspected. “Verified” below means verified in source, not verified in production.

## Critical launch blockers

| Finding | Evidence and impact | Required action |
|---|---|---|
| Production Django settings can fall back to development mode | `DJANGO_DEBUG` defaults to `True`; when true, a known development `SECRET_KEY` is used. `ALLOWED_HOSTS` defaults to localhost. Source comment says Alwaysdata must set `DJANGO_DEBUG=False` and `DJANGO_SECRET_KEY`; deployed values are unknown. | Verify Alwaysdata has a strong unique secret, `DJANGO_DEBUG=False`, production `DJANGO_ALLOWED_HOSTS`, HTTPS, and production security checks. Add HSTS and a reviewed CSP where deployment topology permits. |
| Password reset leaks account existence and points to localhost | `ForgotPasswordView` returns 404 for an unknown email, sends a reset link to `http://localhost:5173`, and `EMAIL_BACKEND` defaults to console. | Use a generic response for every valid email, a configured frontend origin, an SMTP backend in production, safe rate limits, and structured logging that excludes email/token/credentials. Test through a controlled mailbox after configuring the provider. |
| Adult eligibility and policy acceptance are absent | Registration accepts username, email, names and password only. There is no server-side 18+ eligibility check, accepted policy version or acceptance timestamp. A browser-only checkbox would be bypassable. | Add server-validated eligibility affirmation and policy acceptance/version/timestamp, update registration and tests, and retain a versioned acceptance record. Do not collect date of birth unless separately justified. |
| Deployed CORS, host and mail configuration are unknown | Settings default CORS and CSRF trusted origins to `http://localhost:5173`. The exact public frontend URL and Alwaysdata environment were not provided. | Configure the exact deployed frontend origin in `DJANGO_CORS_ALLOWED_ORIGINS`; configure host/CSRF values for the production host and verify by browser request. Configure mail as described below. |
| Production security checks and tests could not be run | Backend checkout is read-only/outside the writable workspace and the Python launcher cannot access its executable. No production environment is available. | Run Django tests and `manage.py check --deploy` in the backend checkout against an isolated test database, after backend changes. Never point tests at production data. |

## Important improvements

- **Authentication and tokens — verified in source:** SimpleJWT access lifetime is one day and refresh lifetime seven days; the SPA stores both in `sessionStorage`, which JavaScript can read if an XSS vulnerability occurs. Review CSP, dependency updates, output escaping, token revocation and whether a same-site HttpOnly cookie design is practical. The current frontend refreshes once after a 401 and clears credentials after refresh failure.
- **Password recovery — verified in source:** Django’s default token generator checks expiry/validity on reset. Forgot-password enumeration, delivery backend and link origin remain blockers. No view-level throttle configuration was found in the inspected settings/views.
- **Deletion and retention — verified in source:** Settings sends the password-confirmed delete request; the backend calls `user.delete()`, with user-owned financial rows using cascading relationships. This is immediate deletion, not a deletion request. Define retention, backup expiry, restoration, and any legal holds before launch.
- **Data export — implemented in this frontend:** Settings downloads profile and available finance collections from existing authenticated API routes as JSON. It does not transmit the export elsewhere. It has not been exercised against an authenticated account, and the API’s pagination behavior must be confirmed before relying on it as a complete statutory export.
- **Financial calculations — verified in source:** Account balances use `Decimal` and include starting balance, income/expenses, transfers, loan principal and repayments. Existing loan balance is principal less recorded repayments; interest is not supported. Transfer serialization stores a conversion amount/rate, and existing tests cover preservation of a historical live rate.
- **Loan interest — decision received:** implement simple annual interest accrued daily. Interest basis, day-count convention, repayment allocation (interest-first vs principal-first), rate/date changes, historical loans, rounding, and whether interest affects account cash flows still require a written product rule. Do not apply interest retroactively or show an estimated interest amount until the backend model and migration are designed and tested.
- **Feedback — not implemented:** no feedback API, model, throttling or admin review surface exists. A frontend form alone cannot securely store submissions. Implement backend validation, per-user association, rate limiting, permission-restricted admin review and retention first; add the UI only against that real route.
- **Legal pages — implemented as drafts:** public Privacy Policy and Terms pages are marked as drafts and contain explicit unresolved placeholders. They are not linked to acceptance records and are not ready to govern signup.
- **Analytics and session replay — source scan:** no analytics, replay SDK, ad pixel or cookie banner was found in this frontend. Production injection, proxy logs and backend logging were not inspectable; recheck the deployed build and hosting configuration. Do not add consent UI until a non-essential tracking technology is actually selected.
- **Fonts — source scan:** the app uses local system font stacks and makes no external font request. No self-hosted font asset or license file is present. Select a properly licensed font, add the font files and license notice, or explicitly keep the system stack; do not silently add a third-party font host.
- **Accessibility and mobile — partial source review:** native labels, semantic headings, visible focus rules, reduced-motion rules and responsive breakpoints exist. Automated contrast, keyboard-only flows and all authenticated screen widths have not been verified. Registration has no age or legal acceptance controls because enforcement must be server-backed.
- **API permissions — source reviewed:** financial viewsets use authenticated permissions and user-owned querysets; category endpoint intentionally exposes shared defaults plus the signed-in user’s own categories. Production authentication/throttling and CORS behavior remain unverified.

## Existing functionality verified in source

- React 19, Vite 8, Tailwind CSS 4 tooling; frontend API base defaults to `https://budgetly.alwaysdata.net/api` and can be overridden by `VITE_API_BASE_URL`.
- Registration, login, profile, password change, reset, logout and password-confirmed account deletion are wired to existing Django routes.
- Accounts, categories, transactions, transfers, budgets, savings goals/plans/contributions/withdrawals, loans/repayments and exchange-rate lookup are present.
- Light/dark preference persists in local storage; Help, first-time checklist and its reopen controls are present. Checklist progress reads actual account, personal-category and transaction collections.
- Current repository contains no `test`/`test:*` npm script. `npm run lint` and `npm run build` are available.

## Kenya-first legal and operational investigation

This is an engineering issue list, not legal advice or a legal conclusion.

- **Data protection and ODPC registration:** Kenya’s Data Protection Act and 2021 registration regulations govern controllers/processors. ODPC’s current FAQ describes an exemption for some organizations with annual revenue below KSh 5 million **and** fewer than 10 employees, but says designated sectors (including provision of financial services) are not exempt. Whether this record-keeping product falls within that category, and whether the operator must register as controller or processor, needs confirmation with Kenyan counsel/ODPC. [ODPC FAQ](https://www.odpc.go.ke/faqs/), [ODPC registration guidance](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-on-Registration-of-Data-Controllers-and-Data-Processors.pdf)
- **Children and age gate:** the Act imposes protections and age-verification/parental-consent mechanisms when processing children’s data. An 18+ gate is a Budgetly product policy requested in this brief; it is not implemented or server-enforced. [Kenya Data Protection Act](https://new.kenyalaw.org/akn/ke/act/2019/24/eng%402019-11-15/source)
- **Data rights, transfers and breaches:** confirm response workflows, hosting/subprocessor locations and transfer safeguards; the Act includes data-subject rights and breach duties. A source review is not enough to establish Alwaysdata’s actual data region or the operator’s compliance. [ODPC rights overview](https://www.odpc.go.ke/rights-of-a-data-subject/), [ODPC breach reporting](https://www.odpc.go.ke/report-a-data-breach/)
- **Consumer protection:** the Consumer Protection Act includes disclosures and copy/cancellation rules for internet/remote agreements. Counsel should decide applicability and ensure the final signup and policy-acceptance flow meets relevant requirements. [Kenya Consumer Protection Act](https://new.kenyalaw.org/akn/ke/act/2012/46/eng%402022-12-31/source.pdf)
- **DMCA agent:** the DMCA is United States law; the U.S. Copyright Office describes designated-agent registration for providers seeking specific U.S. §512 safe harbors, including services hosting user material. Budgetly currently appears to store private finance records rather than host public user content. A U.S. agent is not assumed to be a Kenya launch requirement; revisit only if U.S. operations/content hosting or counsel identifies a need. [U.S. Copyright Office DMCA directory](https://copyright.gov/dmca-directory/)
- **Unsubscribe:** the inspected app sends password-reset email only. Kenya’s General Data Protection Regulations prescribe consent and a simple opt-out/address for direct marketing. Those rules do not turn a security-only reset message into marketing; if marketing email is introduced, implement its separate consent and opt-out mechanism. [Data Protection (General) Regulations, 2021](https://new.kenyalaw.org/akn/ke/act/ln/2021/263/eng%402022-01-14/source)

## Optional post-launch work

- Consider a reviewed font family, richer account-specific color/identity, activity export formats, and a verified dedicated public product/marketing page.
- Consider operational monitoring and privacy-conscious product analytics only after the data inventory, consent requirements, retention and processor contracts are decided.
- Add feedback once its secured persistence and administrative workflow exist.

## Environment variables

Frontend `.env.example` includes only `VITE_API_BASE_URL`. Never put backend credentials in `VITE_*` variables. Backend configuration needs an operator-managed environment (not this frontend repo):

```text
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<unique high-entropy secret>
DJANGO_ALLOWED_HOSTS=budgetly.alwaysdata.net
DJANGO_CORS_ALLOWED_ORIGINS=<exact deployed frontend origin>
DJANGO_CSRF_TRUSTED_ORIGINS=<exact HTTPS origins required by the deployment>
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=<provider SMTP host>
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_HOST_USER=<provider SMTP username>
DJANGO_EMAIL_HOST_PASSWORD=<provider SMTP password>
DJANGO_EMAIL_USE_TLS=True
DJANGO_DEFAULT_FROM_EMAIL=<verified sender address>
DJANGO_FRONTEND_URL=<deployed frontend origin>
```

The last two email-related names are **proposed names**, not currently read by the inspected backend. Backend code must be updated to use them before they have effect. Use the provider’s documented TLS/SSL mode and verified sender. A no-custom-domain provider is not verified as available for this account; check current provider terms, sender verification and free-tier rules before choosing one.
