# Authentication Implementation Notes

## Overview

The Scrapifie backend uses Express.js with cookie-based session authentication for the dashboard API and API key authentication for the programmatic scraping API (v1 routes).

## Session Authentication

Session-based authentication is handled by `src/api/middleware/authExpress.ts`, which exports three middleware functions:

- `requireAuth` — Requires a valid session cookie. Returns 401 if the session is missing or expired.
- `requireAdmin` — Requires the authenticated user to have the admin role. Returns 403 otherwise.
- `optionalAuth` — Attaches the user object to the request if a valid session exists, but allows the request to proceed regardless.

Sessions are stored in Redis using a signed cookie (`session_id`). A separate `csrf_token` cookie is issued on login and must be reflected as the `x-csrf-token` header on state-mutating requests.

## Password Security

Passwords are hashed using bcrypt with a cost factor of 12. Plain-text passwords are never stored or logged. The `validatePassword` utility in `src/utils/crypto.ts` enforces the minimum complexity rules before hashing.

Accounts are locked for 15 minutes after five consecutive failed login attempts. The lock state is tracked in the database (not in Redis) so it survives server restarts.

## Auth Route Summary

All auth endpoints are mounted at `/api/auth/`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate and issue a session cookie |
| POST | `/api/auth/logout` | Invalidate the current session |
| GET | `/api/auth/me` | Return the authenticated user's profile |
| POST | `/api/auth/verify-email` | Confirm an email verification token |
| POST | `/api/auth/forgot-password` | Request a password reset email |
| POST | `/api/auth/reset-password` | Apply a password reset using the token |

## Required Environment Variables

```
SESSION_SECRET=<cryptographically random string>
COOKIE_SECRET=<cryptographically random string>
DATABASE_URL=postgresql://user:pass@host:5432/scrapifie
REDIS_URL=redis://host:6379
```

The following are optional during development:

```
PAYSTACK_SECRET_KEY=sk_test_xxx
```

If `PAYSTACK_SECRET_KEY` is not set, the webhook service will initialise with a placeholder value and payment-related routes will return placeholder responses.

## API Key Authentication

Programmatic scraping requests (the v1 API) use API key authentication via `src/api/middleware/apiKeyAuth.ts`. Keys are passed in the `X-API-Key` header. The raw key is shown once at creation time; only a SHA-256 hash is stored in the database.

The `requireScope` middleware checks that the key has the required scope (for example `scrape:write`) before allowing the request to proceed.

## Related Files

- `src/api/middleware/authExpress.ts` — Session auth middleware
- `src/api/middleware/apiKeyAuth.ts` — API key auth middleware
- `src/api/routes/auth.routes.ts` — Auth route handlers
- `src/utils/crypto.ts` — Password hashing and validation utilities
- `src/db/repositories/session.repository.ts` — Session persistence
- `src/db/repositories/token.repository.ts` — Email verification and password reset tokens
