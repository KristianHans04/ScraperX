# ScraperX Authentication

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-003 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 02-LEGAL-FRAMEWORK.md, 04-ROLES-AND-PERMISSIONS.md, 18-DATA-MODELS.md, 19-SECURITY-FRAMEWORK.md |

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Registration Flow](#2-registration-flow)
3. [Email Verification](#3-email-verification)
4. [Login Flow](#4-login-flow)
5. [OAuth Authentication](#5-oauth-authentication)
6. [Multi-Factor Authentication](#6-multi-factor-authentication)
7. [Password Reset](#7-password-reset)
8. [Session Management](#8-session-management)
9. [Account Lockout and Brute Force Protection](#9-account-lockout-and-brute-force-protection)
10. [Route Protection](#10-route-protection)
11. [Authentication Emails](#11-authentication-emails)
12. [Edge Cases and Error Handling](#12-edge-cases-and-error-handling)

---

## 1. Authentication Overview

### Authentication Methods

ScraperX supports three authentication methods for the web application, plus API key authentication for the API.

| Method | Description | MVP Status |
|--------|-------------|------------|
| Email and password | Traditional registration and login with email/password credentials | MVP |
| OAuth (Google) | Sign in with Google account | MVP |
| OAuth (GitHub) | Sign in with GitHub account | MVP |
| TOTP MFA | Optional time-based one-time password as second factor | MVP |
| API key | Bearer token authentication for API requests (see 06-API-KEY-MANAGEMENT.md) | MVP (already exists in backend) |

### Authentication Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   React SPA       |     |   Fastify API     |     |   PostgreSQL      |
|   (Frontend)      |---->|   (Backend)       |---->|   (Database)      |
|                   |     |                   |     |                   |
| - Login form      |     | - Auth routes     |     | - users table     |
| - Signup form     |     | - Session plugin  |     | - sessions table  |
| - OAuth buttons   |     | - OAuth handlers  |     | - oauth_accounts  |
| - MFA input       |     | - MFA validation  |     | - mfa_secrets     |
| - Password reset  |     | - Password hashing|     | - password_resets  |
+-------------------+     | - Rate limiting   |     | - login_attempts  |
                          | - CSRF validation |     +-------------------+
                          +-------------------+
                                |
                          +-------------------+
                          |   Redis           |
                          |                   |
                          | - Session store   |
                          | - Rate limit      |
                          |   counters        |
                          | - MFA attempt     |
                          |   tracking        |
                          +-------------------+
```

### Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Password hashing | bcrypt with cost factor 12 or higher |
| Session tokens | Cryptographically random, 256-bit minimum |
| CSRF protection | Double-submit cookie pattern or synchronizer token |
| Rate limiting | Per-IP and per-account limits on all auth endpoints |
| Secure cookies | HttpOnly, Secure, SameSite=Strict for session cookies |
| Input validation | All inputs validated server-side with Zod schemas |
| Timing attack prevention | Constant-time comparison for password and token verification |
| SQL injection prevention | Parameterized queries for all database operations |

---

## 2. Registration Flow

**Route:** `/signup`

### Page Layout

```
+----------------------------------------------------------------------+
|  [Navbar - minimal: Logo + Login link only]                           |
+----------------------------------------------------------------------+
|                                                                       |
|   Create your account                                                 |
|                                                                       |
|   [Sign up with Google]                                               |
|   [Sign up with GitHub]                                               |
|                                                                       |
|   ---- or ----                                                        |
|                                                                       |
|   Full Name:     [_________________________]                          |
|   Email:         [_________________________]                          |
|   Password:      [_________________________] [Show/Hide]              |
|                                                                       |
|   Password strength: [====------] Fair                                |
|                                                                       |
|   [x] I agree to the Terms of Service, Privacy Policy,                |
|       and Acceptable Use Policy (with links)                          |
|                                                                       |
|   [Create Account]                                                    |
|                                                                       |
|   Already have an account? Log in                                     |
|                                                                       |
+----------------------------------------------------------------------+
```

### Registration Form Fields

| Field | Type | Required | Validation Rules |
|-------|------|----------|-----------------|
| Full Name | Text input | Yes | Minimum 2 characters, maximum 100 characters. Allows letters, spaces, hyphens, and apostrophes. No numbers or special characters. |
| Email | Email input | Yes | Valid email format. Maximum 254 characters. Checked for uniqueness against existing accounts. Case-insensitive (stored lowercase). |
| Password | Password input | Yes | Minimum 8 characters. Maximum 128 characters. Must contain at least one uppercase letter, one lowercase letter, one number, and one special character. |
| Terms agreement | Checkbox | Yes | Must be checked. Links to /legal/terms, /legal/privacy, and /legal/acceptable-use open in new tabs. |

### Password Strength Indicator

A visual bar below the password field that updates in real-time as the user types.

| Strength Level | Criteria | Color | Label |
|----------------|----------|-------|-------|
| Very weak | Fewer than 8 characters or single character type | Red | "Very weak" |
| Weak | 8+ characters, two character types | Orange | "Weak" |
| Fair | 8+ characters, three character types | Yellow | "Fair" |
| Strong | 10+ characters, all four character types | Green | "Strong" |
| Very strong | 12+ characters, all four types, no common patterns | Dark green | "Very strong" |

Character types: uppercase letters, lowercase letters, numbers, special characters.

The indicator also warns if the password:
- Contains the user's name or email
- Matches a list of commonly breached passwords (checked client-side against a small set, then server-side against a larger set)
- Uses simple keyboard patterns (e.g., "qwerty", "12345")

### Password Visibility Toggle

| Element | Detail |
|---------|--------|
| Button | Eye icon (Lucide: Eye / EyeOff). Toggles between showing and hiding the password. |
| Default | Password is hidden (type="password") |
| Accessibility | Button has aria-label "Show password" / "Hide password". Does not lose focus when toggled. |

### Registration Submission Flow

```
User fills form
    |
    v
Client-side validation
    |
    +-- Fails --> Show inline errors, do not submit
    |
    v (passes)
Submit to POST /auth/register
    |
    v
Server-side validation
    |
    +-- Email already exists --> Return error: "An account with this email already exists"
    |   (Phrased carefully to avoid email enumeration — see Edge Cases section)
    |
    +-- Password too weak --> Return error with specific reason
    |
    +-- Rate limited --> Return 429 with retry-after header
    |
    v (passes)
Create user record
    - Generate UUID for user ID
    - Hash password with bcrypt (cost 12)
    - Store name, email (lowercase), hashed password
    - Set email_verified = false
    - Set terms_accepted_at = current timestamp
    - Set terms_version = current ToS version
    - Create associated account record (Free plan)
    - Allocate initial 1,000 credits
    |
    v
Send verification email
    - Generate cryptographically random token (32 bytes, hex-encoded)
    - Store token hash (SHA-256) with expiry (24 hours) and user ID
    - Send email with verification link: /verify-email/{token}
    |
    v
Redirect to "Check your email" page
    - Message: "We sent a verification email to {email}. Please check your inbox."
    - "Resend email" link (rate limited: once per 60 seconds)
    - "Wrong email?" link that goes back to signup
```

### Post-Registration State

| State | Detail |
|-------|--------|
| Account created | User record exists in database with email_verified = false |
| Not logged in | User is NOT automatically logged in after registration. They must verify email first. |
| Free plan assigned | User is assigned the Free plan with 1,000 credits |
| No API keys | No API keys are created automatically. User creates their first key from the dashboard. |

---

## 3. Email Verification

**Route:** `/verify-email/:token`

### Verification Flow

```
User clicks link in email
    |
    v
Frontend loads /verify-email/{token}
    |
    v
Frontend sends GET /auth/verify-email/{token} to API
    |
    v
Server validates token
    |
    +-- Token not found or expired
    |   --> Show error: "This verification link is invalid or has expired."
    |   --> Show "Resend verification email" button
    |
    +-- Token already used
    |   --> Show message: "Your email has already been verified. You can log in."
    |   --> Show "Go to Login" button
    |
    v (valid)
Mark email as verified
    - Set email_verified = true
    - Set email_verified_at = current timestamp
    - Invalidate all unused verification tokens for this user
    |
    v
Show success page
    - Message: "Your email has been verified. You can now log in."
    - [Go to Login] button
```

### Verification Token Rules

| Rule | Detail |
|------|--------|
| Generation | 32 bytes from a cryptographically secure random number generator, hex-encoded (64 characters) |
| Storage | Only the SHA-256 hash of the token is stored in the database. The raw token appears only in the email link. |
| Expiry | 24 hours from generation |
| Single use | Token is invalidated after successful verification |
| Uniqueness | Each token is unique. Multiple resends generate new tokens and invalidate previous ones. |

### Resend Verification Email

| Element | Detail |
|---------|--------|
| Location | Available on the "Check your email" page and on the expired token error page |
| Rate limit | One resend per 60 seconds per email address |
| Behavior | Generates a new token, invalidates the old one, sends a new email |
| Security | The resend endpoint does not confirm or deny whether the email exists. It always shows "If an account exists with this email, a verification email has been sent." |

### Unverified Account Restrictions

| Restriction | Detail |
|-------------|--------|
| Cannot log in | Login is rejected with "Please verify your email address first" if the user attempts to log in with an unverified email |
| Account cleanup | Unverified accounts that are older than 7 days are automatically deleted by a scheduled cleanup job. This is a hard delete, not a soft delete, since the account was never active. |

---

## 4. Login Flow

**Route:** `/login`

### Page Layout

```
+----------------------------------------------------------------------+
|  [Navbar - minimal: Logo + Sign Up link only]                         |
+----------------------------------------------------------------------+
|                                                                       |
|   Welcome back                                                        |
|                                                                       |
|   [Sign in with Google]                                               |
|   [Sign in with GitHub]                                               |
|                                                                       |
|   ---- or ----                                                        |
|                                                                       |
|   Email:         [_________________________]                          |
|   Password:      [_________________________] [Show/Hide]              |
|                                                                       |
|   [ ] Remember me                     Forgot password?                |
|                                                                       |
|   [Sign In]                                                           |
|                                                                       |
|   Don't have an account? Sign up                                      |
|                                                                       |
+----------------------------------------------------------------------+
```

### Login Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | Email input | Yes | Valid email format |
| Password | Password input | Yes | Not empty |
| Remember me | Checkbox | No | Default unchecked |

### Login Submission Flow

```
User submits form
    |
    v
Client-side validation (email format, password not empty)
    |
    v
Submit to POST /auth/login
    |
    v
Server-side processing:
    |
    1. Check rate limit for IP and email
    |   +-- Rate limited --> Return 429 "Too many login attempts. Try again in X minutes."
    |
    2. Look up user by email (case-insensitive)
    |   +-- Not found --> Return generic error (see below)
    |
    3. Check if account is locked
    |   +-- Locked --> Return "Account temporarily locked. Try again in X minutes."
    |
    4. Check if account is suspended
    |   +-- Suspended --> Return "Your account has been suspended. Contact support."
    |
    5. Check if email is verified
    |   +-- Not verified --> Return "Please verify your email. [Resend verification]"
    |
    6. Compare password hash (bcrypt, constant-time)
    |   +-- Mismatch --> Increment failed attempt counter, return generic error
    |
    7. Check if MFA is enabled
    |   +-- MFA enabled --> Return partial auth token, redirect to /mfa/verify
    |
    8. Create session
    |   - Generate session ID (cryptographically random)
    |   - Store in Redis with user ID, IP, user agent, created_at
    |   - Set session cookie
    |   - If "Remember me" is checked: session expiry = 30 days
    |   - If not checked: session expiry = 24 hours
    |
    9. Record successful login
    |   - Reset failed attempt counter
    |   - Log login event in audit log (user_id, IP, user_agent, timestamp)
    |
    10. Redirect to /dashboard (or to the URL the user was trying to access before being redirected to login)
```

### Generic Error Message

To prevent email enumeration attacks, failed login attempts for non-existent accounts and incorrect passwords return the same error:

**"Invalid email or password."**

This message is used for:
- Email not found in database
- Password does not match
- Any other credential-level failure

The only exceptions where specific messages are used:
- Account locked (tells the user to wait)
- Account suspended (tells the user to contact support)
- Email not verified (tells the user to verify)

These exceptions are acceptable because they do not reveal whether an email exists to an attacker who does not already have the password.

### Remember Me

| Setting | Session Duration | Cookie Expiry |
|---------|-----------------|---------------|
| Not checked | 24 hours | Session cookie (deleted when browser closes) or 24 hours max-age |
| Checked | 30 days | 30 days max-age |

Note: Even with "Remember me," the session is invalidated if the user changes their password, if the session is explicitly revoked, or if the maximum session lifetime (configurable, default 30 days) is reached.

---

## 5. OAuth Authentication

### Supported Providers

| Provider | Button Text | Icon | Scopes Requested |
|----------|-------------|------|-----------------|
| Google | "Sign in with Google" / "Sign up with Google" | Google "G" logo (monochrome) | openid, email, profile |
| GitHub | "Sign in with GitHub" / "Sign up with GitHub" | GitHub logo (monochrome) | user:email, read:user |

### OAuth Flow

```
User clicks OAuth button
    |
    v
Frontend redirects to /auth/oauth/{provider}
    |
    v
Server generates state parameter (cryptographically random, stored in session)
    |
    v
Server redirects to provider's authorization URL with:
    - client_id (from environment variable)
    - redirect_uri: {BASE_URL}/auth/oauth/{provider}/callback
    - scope: (as listed above)
    - state: (generated state parameter)
    - response_type: code
    |
    v
User authenticates with provider and grants consent
    |
    v
Provider redirects to callback URL with authorization code and state
    |
    v
Server processes callback:
    |
    1. Validate state parameter (must match stored state)
    |   +-- Mismatch --> Redirect to /login with error "Authentication failed"
    |
    2. Exchange authorization code for access token
    |   +-- Fails --> Redirect to /login with error "Authentication failed"
    |
    3. Fetch user profile from provider API
    |   - Get email, name, provider user ID
    |
    4. Check if oauth_accounts record exists for this provider + provider_user_id
    |   +-- Yes --> This is a returning user. Look up the linked user.
    |   |           Create session. Redirect to /dashboard.
    |   |
    |   +-- No --> Check if a user with this email already exists
    |       |
    |       +-- Email exists (registered via email/password)
    |       |   --> Link OAuth account to existing user
    |       |   --> Create session. Redirect to /dashboard.
    |       |   --> Note: The email is considered verified since the OAuth
    |       |       provider has already verified it.
    |       |
    |       +-- No user with this email
    |           --> Create new user record
    |           |   - Generate UUID
    |           |   - Store name, email (from provider)
    |           |   - Set email_verified = true (provider verified)
    |           |   - Set password_hash = null (OAuth-only account)
    |           |   - Set terms_accepted_at = now
    |           --> Create oauth_accounts record linking to user
    |           --> Create account record (Free plan, 1,000 credits)
    |           --> Create session. Redirect to /dashboard.
```

### OAuth Account Linking

| Scenario | Behavior |
|----------|----------|
| New user, new email | Create user + link OAuth account |
| Existing user (email/password), first OAuth login | Link OAuth account to existing user. Email is now verified if it was not. |
| Existing user with different OAuth provider | Link additional OAuth account. User can now log in with either provider. |
| OAuth email differs from registered email | Do not link. Create a new account with the OAuth email. User has two separate accounts. |

### OAuth Security

| Measure | Detail |
|---------|--------|
| State parameter | Prevents CSRF. Generated per-request, stored server-side, validated on callback. |
| Token storage | OAuth access tokens are NOT stored long-term. They are used only to fetch the user profile and then discarded. |
| Provider credentials | Client ID and client secret for each provider are stored as environment variables. Never committed to the repository. |
| HTTPS only | All OAuth callback URLs must use HTTPS. |

### Terms Acceptance for OAuth Users

When a user signs up via OAuth for the first time, they are implicitly accepting the Terms of Service by creating an account. The signup page displays the terms acceptance text above the OAuth buttons:

"By signing up, you agree to our Terms of Service, Privacy Policy, and Acceptable Use Policy."

This is visible before the user clicks either OAuth button, and the acceptance is recorded with the account creation.

---

## 6. Multi-Factor Authentication

### Overview

MFA is optional for all users. When enabled, it adds a TOTP (Time-based One-Time Password) step after the password is verified during login.

### MFA Setup

**Route:** `/mfa/setup` (or accessible from `/dashboard/settings/security`)

#### Setup Flow

```
User navigates to security settings and clicks "Enable MFA"
    |
    v
Server generates TOTP secret
    - 160-bit random secret (base32 encoded)
    - Associated with the user but NOT yet active
    |
    v
Display setup page:
    +----------------------------------------------+
    |  Set Up Two-Factor Authentication             |
    |                                               |
    |  1. Scan this QR code with your               |
    |     authenticator app:                        |
    |                                               |
    |     [QR CODE]                                 |
    |                                               |
    |  2. Or enter this code manually:              |
    |     JBSW Y3DP EHPK 3PXP                      |
    |     [Copy]                                    |
    |                                               |
    |  3. Enter the 6-digit code from your app:     |
    |     [______]                                  |
    |                                               |
    |  [Verify and Enable]                          |
    +----------------------------------------------+
    |
    v
User enters verification code
    |
    v
Server validates TOTP code against the secret
    |
    +-- Invalid --> Show error "Invalid code. Please try again."
    |
    v (valid)
Activate MFA
    - Mark MFA as enabled on the user record
    - Store the secret (encrypted at rest)
    |
    v
Generate backup codes
    - Generate 10 backup codes (8 characters each, alphanumeric, cryptographically random)
    - Hash each backup code (SHA-256) and store hashes
    - Display codes ONCE to the user (show-once pattern)
    |
    v
Display backup codes page:
    +----------------------------------------------+
    |  Save Your Backup Codes                       |
    |                                               |
    |  Store these codes in a safe place. Each      |
    |  code can only be used once. If you lose      |
    |  access to your authenticator app, you can    |
    |  use a backup code to sign in.                |
    |                                               |
    |  1. a7b3c9d2                                  |
    |  2. e4f8g1h5                                  |
    |  3. i6j2k7l3                                  |
    |  4. m8n4o9p1                                  |
    |  5. q5r3s7t2                                  |
    |  6. u1v6w4x8                                  |
    |  7. y9z3a2b7                                  |
    |  8. c5d1e8f4                                  |
    |  9. g6h2i3j9                                  |
    | 10. k7l4m1n5                                  |
    |                                               |
    |  [Download as Text] [Copy All]                |
    |                                               |
    |  [x] I have saved my backup codes             |
    |                                               |
    |  [Done]                                       |
    +----------------------------------------------+
```

### QR Code Format

The QR code encodes a URI in the standard otpauth format:

`otpauth://totp/ScraperX:{user_email}?secret={BASE32_SECRET}&issuer=ScraperX&algorithm=SHA1&digits=6&period=30`

| Parameter | Value |
|-----------|-------|
| Type | totp |
| Issuer | ScraperX |
| Account | User's email address |
| Algorithm | SHA1 (standard for TOTP compatibility) |
| Digits | 6 |
| Period | 30 seconds |

### MFA Login Flow

**Route:** `/mfa/verify`

When MFA is enabled, the login flow adds a second step:

```
User enters correct email and password
    |
    v
Server returns a partial authentication response:
    - HTTP 200 with body: { mfa_required: true, mfa_token: "{temporary_token}" }
    - The mfa_token is a short-lived token (5 minutes) that proves the user
      passed step 1. It is NOT a session token.
    |
    v
Frontend redirects to /mfa/verify
    |
    v
MFA verification page:
    +----------------------------------------------+
    |  Two-Factor Authentication                    |
    |                                               |
    |  Enter the 6-digit code from your             |
    |  authenticator app:                           |
    |                                               |
    |  [______]                                     |
    |                                               |
    |  [Verify]                                     |
    |                                               |
    |  Lost access? Use a backup code               |
    +----------------------------------------------+
    |
    v
User enters TOTP code
    |
    v
Submit to POST /auth/mfa/verify with mfa_token and code
    |
    v
Server validates:
    1. Check mfa_token is valid and not expired
    2. Validate TOTP code against stored secret
       - Accept current time window and one window before/after (30-second tolerance)
    3. Check code has not been used before (prevent replay)
    |
    +-- Invalid code --> Increment MFA attempt counter
    |   +-- 5 failed attempts --> Lock MFA for 15 minutes
    |   +-- Otherwise --> Show "Invalid code. Please try again. X attempts remaining."
    |
    v (valid)
Create full session (same as regular login step 8-10)
Redirect to /dashboard
```

### Backup Code Usage

```
User clicks "Use a backup code" on MFA verify page
    |
    v
Backup code input page:
    +----------------------------------------------+
    |  Use a Backup Code                            |
    |                                               |
    |  Enter one of your saved backup codes:        |
    |                                               |
    |  [________]                                   |
    |                                               |
    |  [Verify]                                     |
    |                                               |
    |  Back to authenticator code                   |
    +----------------------------------------------+
    |
    v
Server validates:
    1. Hash the submitted code (SHA-256)
    2. Compare against stored backup code hashes
    3. Check the code has not been previously used
    |
    +-- No match --> "Invalid backup code."
    |
    v (valid)
Mark backup code as used
    - Set used_at timestamp on the backup code record
    |
    v
Create session and redirect to /dashboard
    |
    v
If fewer than 3 backup codes remain unused:
    - Show a warning on the dashboard: "You have X backup codes remaining. Consider regenerating your backup codes in Settings > Security."
```

### Disabling MFA

```
User navigates to Settings > Security > Disable MFA
    |
    v
Confirmation modal:
    +----------------------------------------------+
    |  Disable Two-Factor Authentication?           |
    |                                               |
    |  This will remove the second factor from      |
    |  your account. You can re-enable it at any    |
    |  time.                                        |
    |                                               |
    |  Enter your current TOTP code or a backup     |
    |  code to confirm:                             |
    |                                               |
    |  [______]                                     |
    |                                               |
    |  [Cancel]          [Disable MFA]              |
    +----------------------------------------------+
    |
    v
Validate code (TOTP or backup)
    |
    +-- Invalid --> "Invalid code."
    |
    v (valid)
Disable MFA
    - Set mfa_enabled = false on user record
    - Delete stored TOTP secret
    - Delete all backup codes
    - Log action in audit log
    - Send notification email: "MFA has been disabled on your account"
```

---

## 7. Password Reset

### Request Password Reset

**Route:** `/forgot-password`

```
+----------------------------------------------------------------------+
|  [Navbar - minimal]                                                   |
+----------------------------------------------------------------------+
|                                                                       |
|   Reset your password                                                 |
|                                                                       |
|   Enter the email address associated with your account,               |
|   and we will send you a link to reset your password.                |
|                                                                       |
|   Email:  [_________________________]                                 |
|                                                                       |
|   [Send Reset Link]                                                   |
|                                                                       |
|   Back to login                                                       |
|                                                                       |
+----------------------------------------------------------------------+
```

### Request Flow

```
User submits email
    |
    v
Server processes request:
    |
    1. Rate limit check (3 requests per email per hour, 10 per IP per hour)
    |   +-- Rate limited --> Return 429
    |
    2. Look up user by email
    |   +-- Not found --> Still show success message (anti-enumeration)
    |   +-- Found but OAuth-only (no password) --> Send informational email
    |       saying "You signed up with Google/GitHub. Please use that to log in."
    |
    3. Generate reset token
    |   - 32 bytes, cryptographically random, hex-encoded
    |   - Store SHA-256 hash with user_id and expiry (1 hour)
    |   - Invalidate any existing reset tokens for this user
    |
    4. Send reset email with link: /reset-password/{token}
    |
    v
Show success message (always, regardless of whether email exists):
    "If an account exists with that email, we have sent password reset instructions."
```

### Reset Password Form

**Route:** `/reset-password/:token`

```
+----------------------------------------------------------------------+
|  [Navbar - minimal]                                                   |
+----------------------------------------------------------------------+
|                                                                       |
|   Set a new password                                                  |
|                                                                       |
|   New Password:       [_________________________] [Show/Hide]         |
|   Confirm Password:   [_________________________] [Show/Hide]         |
|                                                                       |
|   Password strength: [========--] Strong                              |
|                                                                       |
|   [Reset Password]                                                    |
|                                                                       |
+----------------------------------------------------------------------+
```

### Reset Flow

```
User clicks link in email, lands on reset form
    |
    v
Frontend sends token to server for validation (before showing form)
    |
    +-- Invalid or expired --> Show error: "This reset link is invalid or has expired."
    |                          Show "Request a new reset link" button
    |
    v (valid, show form)
User enters new password and confirmation
    |
    v
Client-side validation:
    - Password meets strength requirements
    - Confirmation matches
    |
    v
Submit to POST /auth/reset-password
    |
    v
Server-side processing:
    |
    1. Validate token (again, in case it expired between page load and submit)
    2. Validate new password strength
    3. Check new password is not the same as current password
    4. Hash new password (bcrypt, cost 12)
    5. Update user record with new password hash
    6. Invalidate the reset token
    7. Invalidate ALL existing sessions for this user (force re-login everywhere)
    8. Send confirmation email: "Your password has been changed"
    9. Log the event in audit log
    |
    v
Show success page:
    "Your password has been reset. You can now log in with your new password."
    [Go to Login] button
```

### Password Reset Token Rules

| Rule | Detail |
|------|--------|
| Generation | 32 bytes, cryptographically random, hex-encoded |
| Storage | SHA-256 hash stored in database. Raw token only in email. |
| Expiry | 1 hour from generation |
| Single use | Invalidated after successful reset |
| Replaces previous | New token request invalidates any existing tokens for the same user |
| Session invalidation | Successful reset invalidates all sessions for the user |

---

## 8. Session Management

### Session Architecture

| Component | Detail |
|-----------|--------|
| Storage | Redis (fast read/write, automatic expiry) |
| Identifier | Cryptographically random session ID, 256-bit (32 bytes), hex-encoded |
| Cookie name | Configurable via environment variable. Default: "scraperx_session" |
| Cookie attributes | HttpOnly=true, Secure=true, SameSite=Strict, Path=/ |

### Session Data Stored in Redis

| Field | Description |
|-------|-------------|
| user_id | UUID of the authenticated user |
| role | User's current role (user or admin) |
| ip_address | IP address at login |
| user_agent | Browser user agent at login |
| created_at | Timestamp of session creation |
| last_active_at | Timestamp of last request |
| mfa_verified | Whether MFA was completed (if applicable) |
| remember_me | Whether "Remember me" was checked |

### Session Lifecycle

| Event | Behavior |
|-------|----------|
| Creation | On successful login (after MFA if enabled) |
| Activity | last_active_at updated on each authenticated request |
| Idle timeout | Session expires after 30 minutes of inactivity (configurable). "Remember me" sessions: 7 days of inactivity. |
| Absolute timeout | Maximum session lifetime: 24 hours (regular) or 30 days (remember me) |
| Logout | Session deleted from Redis. Cookie cleared. |
| Password change | ALL sessions for the user are invalidated except the current one |
| Password reset | ALL sessions for the user are invalidated (including current) |
| Account suspension | ALL sessions for the user are invalidated |
| MFA enable/disable | Current session remains valid. Other sessions are invalidated. |

### Session Rotation

| Event | Behavior |
|-------|----------|
| After login | New session ID generated |
| After MFA verification | Session ID rotated (new ID, same session data) |
| Periodically | Session ID rotated every 15 minutes of active use to limit session fixation window |

### Active Sessions View

Users can view and manage their active sessions from the security settings page (see 11-SETTINGS-AND-SUPPORT.md).

| Displayed Information | Detail |
|----------------------|--------|
| Device/browser | Parsed from user agent. Example: "Chrome on Windows" |
| IP address | Partial IP shown (e.g., "192.168.x.x" — last octet masked for privacy unless it is the current session) |
| Location | Approximate location from IP geolocation (city, country). "Unknown" if unavailable. |
| Last active | Relative timestamp ("2 hours ago", "Active now" for current session) |
| Current session indicator | The session the user is currently using is labeled "This device" |
| Revoke action | "Sign out" button next to each session. "Sign out all other sessions" button at the bottom. |

### CSRF Protection

| Mechanism | Detail |
|-----------|--------|
| Pattern | Synchronizer token pattern. A CSRF token is generated per session and included in a cookie (readable by JavaScript) and must be submitted as a header (X-CSRF-Token) on all state-changing requests (POST, PUT, PATCH, DELETE). |
| Token generation | Cryptographically random, 256-bit, regenerated per session |
| Validation | Server compares token from header with token stored in session. Mismatch returns 403 Forbidden. |
| Cookie name | Configurable. Default: "scraperx_csrf" |
| Cookie attributes | Secure=true, SameSite=Strict, Path=/, HttpOnly=false (must be readable by JavaScript) |
| Exemptions | OAuth callback routes (state parameter serves same purpose), webhook receiver endpoints |

---

## 9. Account Lockout and Brute Force Protection

### Login Rate Limiting

| Level | Limit | Window | After Limit |
|-------|-------|--------|-------------|
| Per IP address | 20 attempts | 15 minutes | Return 429 for all login attempts from this IP |
| Per email address | 5 attempts | 15 minutes | Lock the account temporarily |

### Account Lockout

| Trigger | Duration | Behavior |
|---------|----------|----------|
| 5 failed login attempts for an account | 15 minutes | Account is temporarily locked. Login returns "Account temporarily locked due to too many failed attempts. Please try again in X minutes." |
| 15 failed attempts (across multiple lockouts) | 1 hour | Extended lockout |
| 50 failed attempts in 24 hours | Until admin review | Account is flagged for review. User must contact support or wait for admin action. |

### Lockout Notifications

| Threshold | Notification |
|-----------|-------------|
| 5 failed attempts | Email sent: "We detected multiple failed login attempts on your account. If this was you, you can try again in 15 minutes. If this was not you, we recommend changing your password." |
| Account flagged | Email sent: "Your account has been locked due to unusual login activity. Please contact support to regain access." |

### MFA Brute Force Protection

| Level | Limit | Window | After Limit |
|-------|-------|--------|-------------|
| Per MFA token | 5 attempts | 5 minutes | MFA token is invalidated. User must re-enter email/password. |
| Per account | 10 MFA failures | 1 hour | MFA locked for 1 hour. User notified via email. |

### Password Reset Brute Force Protection

| Level | Limit | Window |
|-------|-------|--------|
| Per email | 3 requests | 1 hour |
| Per IP | 10 requests | 1 hour |

---

## 10. Route Protection

### Route Categories

| Category | Routes | Protection |
|----------|--------|------------|
| Public | /, /pricing, /about, /contact, /blog/*, /status, /legal/*, /docs/* | No authentication required |
| Auth | /login, /signup, /forgot-password, /reset-password/:token, /verify-email/:token, /mfa/* | No authentication required. If already logged in, redirect to /dashboard. |
| Dashboard | /dashboard/* | Authentication required. Redirect to /login if not authenticated. |
| Admin | /admin/* | Authentication required + admin role. Redirect to /login if not authenticated. Return 403 if authenticated but not admin. |

### Authentication Check Flow (for protected routes)

```
Request to protected route
    |
    v
Check for session cookie
    |
    +-- No cookie --> Redirect to /login?redirect={current_url}
    |
    v
Look up session in Redis
    |
    +-- Not found (expired/revoked) --> Clear cookie, redirect to /login
    |
    v
Check session validity
    |
    +-- Idle timeout exceeded --> Delete session, redirect to /login
    +-- Absolute timeout exceeded --> Delete session, redirect to /login
    |
    v
Load user from database
    |
    +-- User not found (deleted) --> Delete session, redirect to /login
    +-- User suspended --> Delete session, redirect to /login with error
    |
    v
For admin routes: Check user role
    |
    +-- Not admin --> Return 403 page: "You do not have permission to access this page."
    |
    v
Update last_active_at on session
    |
    v
Proceed with rendering the page
```

### Redirect After Login

| Scenario | Behavior |
|----------|----------|
| User navigates to /dashboard while not logged in | Redirect to /login?redirect=/dashboard. After successful login, redirect to /dashboard. |
| User navigates to /dashboard/billing while not logged in | Redirect to /login?redirect=/dashboard/billing. After successful login, redirect to /dashboard/billing. |
| User navigates to /login while already logged in | Redirect to /dashboard. |
| User navigates to /signup while already logged in | Redirect to /dashboard. |
| Redirect URL is external (not on the same domain) | Ignore the redirect parameter. Redirect to /dashboard. This prevents open redirect attacks. |

---

## 11. Authentication Emails

All authentication-related emails are described here in terms of content and triggers. Full email templates are in APPENDICES/B-EMAIL-TEMPLATES.md.

| Email | Trigger | Subject | Content Summary |
|-------|---------|---------|----------------|
| Email verification | User registers with email/password | "Verify your email address" | Greeting, verification link, 24-hour expiry notice, "If you didn't create an account, ignore this email" |
| Welcome | Email verified (first time) | "Welcome to ScraperX" | Welcome message, link to dashboard, link to quickstart docs, link to support |
| Password reset request | User requests password reset | "Reset your password" | Reset link, 1-hour expiry notice, "If you didn't request this, ignore this email and your password will remain unchanged" |
| Password changed | User successfully changes or resets password | "Your password has been changed" | Confirmation that password was changed, timestamp, "If you didn't do this, contact support immediately" |
| Login from new device | Login from an unrecognized IP/device combination | "New login to your account" | Device info (browser, OS), approximate location, timestamp, "If this wasn't you, change your password immediately" |
| Account locked | Too many failed login attempts | "Your account has been temporarily locked" | Explanation, unlock time, "If this wasn't you, change your password" |
| MFA enabled | User enables MFA | "Two-factor authentication enabled" | Confirmation, reminder to save backup codes |
| MFA disabled | User disables MFA | "Two-factor authentication disabled" | Confirmation, recommendation to re-enable, "If you didn't do this, contact support immediately" |
| OAuth account linked | OAuth provider linked to existing account | "New login method added" | Provider name, timestamp, "If you didn't do this, contact support" |

### Email Design Requirements

| Requirement | Detail |
|-------------|--------|
| Plain text fallback | Every email has both HTML and plain text versions |
| No emojis | No emoji characters anywhere in the email |
| No images required | Emails are readable without images loaded |
| Responsive | Email renders correctly on mobile email clients |
| Sender | Configurable via environment variable. Default: "ScraperX <noreply@scraperx.io>" |
| Reply-to | Configurable. Default: "support@scraperx.io" |
| Unsubscribe | Transactional emails do not have an unsubscribe link (they are not marketing). Marketing emails (future) include unsubscribe. |

---

## 12. Edge Cases and Error Handling

### Registration Edge Cases

| Scenario | Handling |
|----------|----------|
| Email already registered (email/password) | Error: "An account with this email already exists." with link to login and forgot password |
| Email already registered (OAuth) | Error: "An account with this email already exists. Try signing in with Google/GitHub." |
| User registers, does not verify, registers again with same email | Overwrite the previous unverified registration (since the old token is now invalid). New verification email is sent. |
| User registers, does not verify, tries to log in | Error: "Please verify your email address first." with "Resend verification email" link |
| Very long email address | Validated to 254 character max per RFC 5321 |
| Email with plus addressing (user+tag@example.com) | Allowed. Stored as-is. No normalization beyond lowercase. |
| Unicode in name field | Allowed. Stored as UTF-8. |
| Registration while already logged in | Redirect to dashboard. Do not show signup form. |

### Login Edge Cases

| Scenario | Handling |
|----------|----------|
| User with only OAuth, tries to log in with password | "Invalid email or password." (generic error, does not reveal OAuth status) |
| User with email/password tries to log in with wrong OAuth provider | If the OAuth email matches, the OAuth account is linked. If no user exists, a new account is created. |
| User deleted their account and tries to log in | "Invalid email or password." (soft-deleted accounts are not accessible) |
| User logs in from a new IP/device | Successful login proceeds normally. A "new login" notification email is sent. |
| Session cookie present but session expired | Cookie is cleared. User is redirected to login. |
| Multiple tabs open, one tab logs out | Other tabs receive a 401 on next API call and redirect to login. |

### Password Reset Edge Cases

| Scenario | Handling |
|----------|----------|
| Reset requested for non-existent email | Success message shown (anti-enumeration). No email sent. |
| Reset requested for OAuth-only account | Informational email sent suggesting OAuth login. No reset link. |
| User clicks expired reset link | Error page with "Request a new reset link" button |
| User clicks reset link twice | First use succeeds. Second use shows "This link has already been used." |
| User changes password via settings after requesting reset | Outstanding reset tokens are invalidated. |

### OAuth Edge Cases

| Scenario | Handling |
|----------|----------|
| User denies consent on provider's page | Provider redirects back with error parameter. Show "Authentication cancelled." |
| Provider returns email that is null/empty | Reject the OAuth login. Show "Could not retrieve your email from {provider}. Please ensure your email is public or use email/password registration." |
| Provider is temporarily unavailable | Show "Authentication service is currently unavailable. Please try again later or use email/password login." |
| State parameter mismatch (CSRF attempt) | Reject and redirect to login with generic error. Log the attempt. |

### MFA Edge Cases

| Scenario | Handling |
|----------|----------|
| User loses their phone and all backup codes | Must contact support. Admin can disable MFA after identity verification (see 13-ADMIN-ORGANIZATIONS.md). |
| Clock skew on user's device | TOTP validation accepts codes from one time window before and after current (30 seconds tolerance each direction). |
| User enters backup code in TOTP field | Backup codes are 8 alphanumeric characters, TOTP codes are 6 digits. If the input is 8 characters, try backup code validation. If 6 digits, try TOTP validation. |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — Platform overview, user types, technology stack
- 02-LEGAL-FRAMEWORK.md — Terms acceptance during registration, consent mechanisms
- 04-ROLES-AND-PERMISSIONS.md — Role assignment after registration
- 06-API-KEY-MANAGEMENT.md — API-level authentication (separate from web session auth)
- 11-SETTINGS-AND-SUPPORT.md — Security settings (password change, MFA management, sessions)
- 18-DATA-MODELS.md — User, session, OAuth, MFA data models
- 19-SECURITY-FRAMEWORK.md — Comprehensive security measures
- APPENDICES/B-EMAIL-TEMPLATES.md — Full email template specifications
- ROADMAP/PHASE-06.md — Authentication implementation timeline
