# Budgetly frontend

Budgetly is a React 19 and Vite frontend for the Django REST API. The dashboard reads account totals and activity from the signed-in user's API responses; it does not seed or substitute sample financial figures.

## Run locally

1. Install dependencies with `npm install`.
2. Start the frontend with `npm run dev` from this directory.
3. Open the Vite URL (normally `http://localhost:5173`).
4. Register through the UI, then sign in with the new credentials.

The API base is configured in `.env.local` as `https://budgetly.alwaysdata.net/api`. Vite reads this variable when it starts; restart the dev server after changing it. The HTTP client accepts either an API base ending in `/api` or a backend origin and avoids duplicating `/api` in endpoint paths.

## Authentication and session

Registration posts username, email, password, password_confirm, first_name, and last_name to `/api/auth/register/`. The backend creates the account but does not issue tokens, so successful registration returns to sign-in. Login posts username/password to `/api/auth/login/` and receives access/refresh JWTs. The client stores them in sessionStorage for this browser tab, loads the profile, and opens the protected dashboard. On a 401 it posts the refresh token to `/api/auth/token/refresh/` once and retries; logout posts the refresh token to `/api/auth/logout/` for blacklist handling, then clears the local session.

The frontend does not create accounts or submit real financial data during build/connectivity checks. Register using the UI yourself.

## API integration

The centralized HTTP client is `src/lib/api.js`. It sends Bearer access tokens and preserves backend validation errors for display. The app uses the existing routes under `/api/auth/`, `/api/`, `/api/savings/`, `/api/dashboard/summary/`, and `/api/exchange-rates/`.

A browser request from `http://localhost:5173` to the deployed registration endpoint completed a non-mutating OPTIONS check successfully (HTTP 200, and the response body was readable cross-origin). The Django settings source also defaults CORS to `http://localhost:5173`. If deploying the frontend under another origin, add that exact origin to `DJANGO_CORS_ALLOWED_ORIGINS` in Django and restart the web app.

## Checks

```sh
npm run lint
npm run build
```

