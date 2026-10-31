# Budgetly MVP implementation summary

**Reviewed:** 31 October 2026  
**Scope:** Frontend review, documentation and low-risk frontend improvements. The Django backend and production deployment were not modified.

## Completed

- Added a launch audit and release checklist that separate verified source findings from production assumptions.
- Added public Privacy Policy and Terms pages, visibly marked as unapproved drafts with unresolved details.
- Added a browser-local JSON export in Settings using the existing authenticated API collections. The export is not uploaded elsewhere; completeness still depends on verifying API pagination with a test account.
- Kept the public API base configurable in `.env.example` and documented that `VITE_*` values must not contain secrets.
- Removed redundant eyebrow labels from auth, help and legal pages, and simplified legal section numbering. Existing Budgetly layout, palette, navigation and backend boundaries remain intact.
- Chose the Taste `pastel-consumer` app direction to guide the existing warm-paper and forest-green design. Taste app lint has no failures.

## Verification

- `npm run lint` — passed.
- `npm run build` — passed.
- Taste app lint — 0 failures; warnings remain for dialog shadows, remaining eyebrow styling and em-dash usage.
- Browser screenshot/interaction review could not be completed in this environment: the local browser inspector exited and its localhost tab could not connect to the Vite server.
- Django tests and deployment checks could not be run: the backend is outside the writable frontend workspace and the Python launcher was inaccessible. No backend tests or database writes were attempted.
- There is no Git metadata in the accessible frontend directory, so a branch or repository diff could not be created.

## Run the frontend

From this directory:

```powershell
npm install
npm run dev
```

The committed example points to `https://budgetly.alwaysdata.net/api`. To override it locally, create `.env.local` in this frontend directory:

```text
VITE_API_BASE_URL=https://budgetly.alwaysdata.net/api
```

Restart Vite after changing environment values. Open the URL Vite prints, register through the UI, then sign in. Confirm the API connection in browser developer tools under Network: successful auth/profile requests should target `budgetly.alwaysdata.net`, and the protected dashboard should load the signed-in account’s data. Do not create or edit financial records as a connectivity test.

## Deployment and backend work still required

1. In Alwaysdata, verify production `DJANGO_DEBUG=False`, a unique secret key, correct allowed hosts, HTTPS and the exact frontend CORS/CSRF origins. CORS behavior was not verified from a functioning browser in this environment.
2. Update password recovery to use a generic response and configured frontend origin, configure SMTP with provider-managed secrets, and test delivery to a controlled mailbox. Current backend source defaults to console mail and a localhost reset URL; email delivery is not claimed to work.
3. Implement backend-enforced adult eligibility and versioned policy acceptance before signup relies on either condition.
4. Agree the remaining loan rules before implementing interest: day-count basis, rounding, repayment allocation, whether old loans accrue, accrual start/pause behavior and cash-flow treatment. The selected policy is simple annual interest with daily accrual; no interest code or migration was added.
5. Build feedback storage, validation, throttling and authorized admin review on the backend before exposing a feedback submission UI.
6. Have Kenyan counsel review and complete the policy drafts, operator identity, hosting/subprocessors, transfers, retention, legal bases and rights-request process. Determine ODPC registration applicability with counsel/ODPC.
7. Validate export pagination/completeness; define deletion requests and backup retention; run focused Django tests and `manage.py check --deploy` against an isolated test database.

See [LAUNCH_AUDIT.md](./LAUNCH_AUDIT.md) for detailed source evidence and [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for release gates.
