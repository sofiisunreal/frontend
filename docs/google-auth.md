# Google authentication

## Local configuration

The public Google OAuth **Web application** client ID is configured in the ignored `.env.local` as `VITE_GOOGLE_CLIENT_ID`. Vite embeds this public value in browser assets; never put a Google client secret in a `VITE_*` variable. Restart Vite after changing the value.

Start with `npm run dev` and open `http://localhost:5173/login` or `http://localhost:5173/register`. Use the localhost address consistently. Google registration becomes available after the active policies load, pass their existing hash verification, and the user explicitly confirms all three declarations.

Google Cloud configuration still requires owner verification:

- Add `http://localhost` and `http://localhost:5173` to Authorized JavaScript origins. Add the actual production frontend origin before deploying. Add an exact `127.0.0.1` origin only if that address will be used.
- Check the application's Google branding/consent configuration and test-user access if it is in testing mode.
- The backend's `GOOGLE_OAUTH_CLIENT_IDS` must include the same Web client ID. This cannot be proven with an empty validation request.
- This integration uses the GIS ID-token popup callback, rather than a new redirect or authorization-code endpoint.

See Google's [client configuration guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference).

The official SDK loads directly from `https://accounts.google.com/gsi/client`. Vite development headers permit popup communication. If production hosting enforces CSP, COOP or Referrer-Policy, check the [Google button integration requirements](https://developers.google.com/identity/gsi/web/guides/display-button); this change does not configure production hosting headers.

## Verified backend contract

Checked against the local Django serializers, views, Google-authentication service and tests. Backend files were not modified.

Existing linked identity:

```json
POST /api/auth/google/
{"credential":"<Google ID token>"}
```

New account, after explicit user declarations:

```json
POST /api/auth/google/
{
  "credential": "<Google ID token>",
  "age_eligibility": true,
  "accept_terms": true,
  "accept_privacy_policy": true,
  "terms_document": {"id": "<active integer ID>", "version": "<active version>", "content_sha256": "<verified active hash>"},
  "privacy_document": {"id": "<active integer ID>", "version": "<active version>", "content_sha256": "<verified active hash>"}
}
```

The placeholders above describe values, not literal payload values. The implementation sends the integer IDs and exact versions/hashes obtained from the existing verified policy provider. No identity is hardcoded. A stale-policy rejection clears policy confirmations, refreshes documents and requires review and another Google attempt. Unavailable or unverifiable official policies block new registration.

Login returns `200`, and new-account creation returns `201`, both with Budgetly `access` and `refresh` tokens. The frontend fetches `/api/auth/profile/` with the fresh Budgetly access token before committing the normal tab session. Google credentials are never saved in browser storage. The existing refresh, access-status, purchase and logout mechanisms remain in use. Google authentication does not grant paid or lifetime access.

Explicit authenticated linking:

```json
POST /api/auth/google/link/
Authorization: Bearer <Budgetly access token>
{"credential":"<fresh Google ID token>"}
```

`201 {"linked":true}` confirms a new link. `200 {"linked":false}` confirms that the same identity is already linked. Settings never infers link status from matching email addresses. No link-status or unlink endpoint exists in the inspected contract.

## User experience and errors

- Login and registration use Google's official accessible button, with the existing Orbit light/dark forms and username/password alternative.
- An existing password-account collision (`link_required`) directs the user to password sign-in, then Settings. A second, explicit Google selection performs linking. No Google credential is carried through that navigation.
- New-account consent requested from the login route (`legal_acceptance_required`) directs the user to registration. It never creates an account from the login callback without declarations.
- `invalid_google_credential`, `google_auth_unavailable`, `inactive_user`, `identity_in_use`, `user_already_linked`, network failures and rate limits use the shared safe error system. Provider diagnostics and credentials are not displayed.
- GIS's ID-token API has no popup-dismissal error callback. Merely opening its chooser does not put Budgetly in a loading state. Password sign-in remains usable. “Use password instead”/“Cancel this attempt” invalidates the current local callback; late credentials are ignored. No unsupported OAuth error callback is invented.
- API work has a bounded timeout. Duplicate callbacks are consumed once; route changes abort pending work. Logout clears the usual session and disables Google auto-selection without signing out of Google.
- The official SDK can fail or be blocked without disabling username/password login. A retry is available. No additional dependency or continuous animation was added.

## Verification and remaining manual checks

Completed locally:

- `npm run lint`, `npm run build`.
- `npm run test:google`: 15 passing tests for payloads, consent, schema validation, SDK state isolation, API requests, tokens, linking and safe errors.
- Existing error/API and billing tests: 29 passing tests.
- 14 synthetic browser check groups: login, registration, stale/unavailable/corrupt policies, linking/conflicts/idempotence, cancellation and late callbacks, failures/retry, logout, keyboard access, light/dark and desktop/mobile layouts. A separate enforcement-on test build confirms backend access still controls the payment gate; the application's existing enforcement setting is unchanged.
- Real SDK rendering at 1440px light and 390px dark: official Google iframe loaded with the supplied ID, no detected origin rejection or horizontal overflow. These checks did not click the control or send a credential.
- Safe live checks: localhost CORS preflights succeed on both Google endpoints; linking rejects an unauthenticated request; an empty Google login request is rejected as missing `credential`; both active v1.0 policies pass SHA-256 verification.
- Existing local legal source preflight passes. Central `api.js`, financial calculation code, legal content/verification and billing/security helpers are unchanged by this integration.

Real Google popup/chooser completion, actual token audience acceptance by the deployed backend, new-account creation and identity linking still require the owner to test with their chosen Google account. No real account, identity, financial record or purchase was created or changed by these checks. Google Cloud origins and the deployed backend whitelist remain manual configuration checks. Nothing was pushed or deployed.

Browser evidence is local in `.taste-skill/google-auth/results.json` and `live-widget-results.json`; synthetic fixtures do not forward requests to production.
