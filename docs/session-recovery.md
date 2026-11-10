# Session recovery and local logout

This change preserves the existing Django endpoints, JWT storage, Google flow,
billing rules and financial workflows. No backend changes are required.

## Session validation

- Startup and password login validate the profile before mounting the private
  application. A saved refresh token can recover a missing access token.
- Profile network errors, timeouts, HTTP 429, HTTP 5xx and malformed successful
  responses retain stored credentials. A neutral recovery screen offers **Try
  again** and **Sign out**, with an announced/focused error. It contains no
  account profile or financial information.
- An authenticated HTTP 401 can trigger one refresh and one retry. Concurrent
  requests share the refresh; access/refresh rotation is supported. A second
  endpoint 401, or a bare refresh 401 without a definitive rejection code, leaves
  validation unresolved rather than deleting credentials or looping.
- The inspected SimpleJWT refresh endpoint identifies invalid, expired or
  blacklisted refresh tokens with `401` and `code: token_not_valid`. Explicit
  account rejection codes (`no_active_account`, `user_inactive`, `user_not_found`)
  also end the session. An invalid access token with no refresh token is another
  definitive rejection. Ordinary permission and billing errors retain their
  existing behavior.
- Profile requests have a 20-second deadline; a shared refresh has a 12-second
  deadline. Waiting for an already-running refresh and then validating a profile
  can take both operation budgets. Fetch and response-body reads are bounded.
- While background authentication is being revalidated, the private React tree
  is unmounted. Temporary authentication failure invalidates pending work without
  deleting stored credentials. Explicit retry starts fresh validation; there is
  no automatic retry loop.
- Session generations and cancellation guard profile, authentication, refresh
  and private API responses. Work from an earlier generation cannot commit
  credentials or populate a newer session. Authenticated fetches use `no-store`
  to avoid reusing sensitive HTTP-cache responses.

## Logout and revocation

Logout synchronously removes this tab's access and refresh credentials, aborts
pending session work, clears profile/access state and payment-resume hints,
unmounts private financial and legal state, and opens Sign in. Current financial
data is held in the private React tree; there is no separate persistent financial
query cache to retain. Theme/sidebar/onboarding preferences and public policy
documents remain available.

A detached revocation attempt uses only the captured signed-out credentials and
the existing `POST /api/auth/logout/` endpoint. It has a **five-second total
budget**, including response-body reads. Because Django requires authentication
for logout, a 401 may trigger one detached refresh and revocation retry within
that same budget. Detached tokens are never stored. Delayed responses cannot
change the signed-out UI or a subsequent login.

### Security limits

Local logout is immediate, but server revocation is best effort. If Django or
the network is unavailable, a copied JWT may remain usable server-side until its
configured expiry or later revocation. Even successful refresh-token blacklisting
does not immediately invalidate an already-issued stateless access JWT. The
frontend cannot provide server-wide or all-device logout without backend support.

Credentials remain in the existing `sessionStorage` mechanism. Session-generation
guards apply to the current running tab, not other tabs or devices. This work
does not change the application's existing exposure to malicious same-origin
scripts, erase exported files or guarantee erasure of browser/JavaScript memory.

## Verification

Automated checks:

```text
npm run test:session
npm run test:errors
npm run test:google
npm run test:billing
npm run lint
npm run build
```

The session suite covers profile 503/429, network/timeouts, malformed responses,
refresh rotation/single-flight, definitive rejection versus temporary refresh
failure, retry bounds, synchronous local logout, offline/held/delayed revocation,
and late responses crossing logout or a subsequent login. Shared-error tests
also ensure temporary recovery never incorrectly asks users to sign in again.

Local synthetic browser checks additionally exercise private-DOM removal,
recoverable startup and fresh-login failures, explicit retry, logout from
Settings and subsequent Back navigation, late profile/refresh/revocation responses, mobile/dark recovery, and the
existing lifetime-access gate. No live credentials, records, accounts or payments
are created by these fixtures.

Local release-check results (November 10, 2026): all 71 unit/service tests passed;
all 10 session, 13 Google and 14 billing browser groups passed. Lint and the normal
production build passed. The normal build retains enabled lifetime-access
enforcement. Historical rollout-off browser cases used a separate isolated build;
environment files and production billing/enforcement code were not changed.

### Local and post-deployment smoke checks

1. Start the frontend with `npm run dev`. Use a test account or a controlled
   existing account. After deployment, repeat in the deployed application.
2. With browser request interception, return 503 then 429 for the profile request
   and reload. Confirm credentials remain, no private content is rendered, and
   retry succeeds after restoring the real response.
3. Hold a profile response through its deadline. Confirm a retry screen replaces
   the loader. Test an access-token 401 followed by a refresh 503/bare 401: the
   saved sign-in must remain. A controlled `token_not_valid` refresh rejection
   must instead clear it and open Sign in. Do not blacklist a real user's token
   solely for this check.
4. Sign in again, take the backend offline or hold its logout response, and choose
   Sign out. Confirm both token keys disappear immediately, Sign in is usable,
   and browser Back cannot reveal private content. Restore the delayed response;
   it must not change the signed-out state or a later login.
5. Verify existing paid/password and paid/Google sessions still open their normal
   routes and refresh access. Verify an unpaid synthetic account remains gated
   with enforcement enabled. Do not initialize a checkout or make a payment.

Deploying this fix is a separate user-controlled action. These changes do not
toggle lifetime enforcement, alter pricing or modify Paystack logic.
