# Budgetly launch checklist

Status key: `[x]` implemented in this frontend; `[ ]` pending or not verified. This checklist is a release gate, not a claim that production is ready.

## Security and deployment

- [ ] Verify Alwaysdata `DJANGO_DEBUG=False`, unique `DJANGO_SECRET_KEY`, production `ALLOWED_HOSTS`, HTTPS and security headers.
- [ ] Set exact production CORS/CSRF origins and verify browser preflight/API requests from the deployed frontend.
- [ ] Add login, registration and password-reset throttles; keep sensitive values out of logs.
- [ ] Move password reset to a generic response and configurable public frontend origin; configure SMTP and test with a controlled mailbox.
- [ ] Decide whether bearer tokens in `sessionStorage` are acceptable for launch; add reviewed CSP and XSS regression checks.
- [ ] Run focused Django tests and `manage.py check --deploy` in the backend repository against an isolated test database.
- [ ] Verify deployed backup location, restore process, database access controls, data region and subprocessors.

## Product and finance

- [ ] Decide and implement the loan-interest contract: **simple annual interest, daily accrual selected**. Still define day-count basis, rounding, repayment allocation, retroactivity, and cash-flow treatment.
- [ ] Add backend regression tests and a data-safe migration before displaying any interest calculations.
- [x] Provide browser-local JSON export for the profile and existing finance collections; verify pagination and run against a test account before treating export as complete.
- [ ] Decide on a reviewable deletion request and document retention/backup expiry; current UI calls immediate account deletion.
- [ ] Implement feedback persistence, validation, abuse limits, authenticated ownership and authorized admin review before adding a user-facing submission flow.

## Privacy and legal

- [x] Add public Privacy Policy and Terms pages clearly marked as unapproved drafts.
- [ ] Replace all draft placeholders with verified operator, processor, hosting, transfer, retention, legal-basis, contact and rights-request details; obtain Kenyan legal review.
- [ ] Enforce the 18+ affirmation on the backend without requesting date of birth; persist policy version and acceptance timestamp server-side.
- [ ] Determine ODPC controller/processor registration applicability with counsel/ODPC, including whether the product falls into a non-exempt sector.
- [ ] Add data-subject request, incident/breach, retention and backup procedures.
- [ ] Verify production has no injected analytics/replay scripts. If non-essential tracking is later added, choose a lawful consent/opt-out approach first.
- [ ] If direct marketing email is introduced, add separate consent and a clear, simple opt-out/contact address. Current reset mail is operational only.
- [ ] Confirm whether any U.S. operations or public user-content hosting creates a reason to consider a DMCA designated agent; none is assumed for the current Kenya-first service.
- [ ] Decide whether to add a licensed self-hosted font; no external font is currently loaded and no self-hosted font asset/license was found.

## Frontend verification

- [x] `npm run lint`
- [x] `npm run build`
- [ ] Add automated tests for registration/recovery, permission failures, export completeness, theme persistence and onboarding progress.
- [ ] Verify authenticated screens in both themes at desktop and mobile widths, keyboard navigation, focus visibility and contrast.
- [ ] Verify export and onboarding with test accounts containing both no data and existing data; do not create production financial test records.
- [ ] Verify draft pages and navigation on the deployed frontend and confirm SPA fallback for direct links.

## Repository workflow

- [ ] Create a dedicated branch and review a diff. The current frontend directory has no `.git` metadata; backend Git access is denied, so no branch or cross-repository diff can be produced from this workspace.
- [ ] Deploy only after the release gates above have owners, evidence and approval.
