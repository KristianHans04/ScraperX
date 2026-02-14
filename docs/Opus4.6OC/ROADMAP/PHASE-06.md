# Scrapifie Roadmap -- Phase 6: Database Schema Expansion, Authentication, and Roles

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-06 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 6 of 12 |
| Prerequisites | Phases 1-5 (scraping engine complete, 413 tests passing) |
| Related Documents | 03-AUTHENTICATION.md, 04-ROLES-AND-PERMISSIONS.md, 18-DATA-MODELS.md, 19-SECURITY-FRAMEWORK.md, 21-TESTING-STRATEGY.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Database Schema Expansion](#4-deliverable-1-database-schema-expansion)
5. [Deliverable 2: Authentication System](#5-deliverable-2-authentication-system)
6. [Deliverable 3: Role-Based Access Control](#6-deliverable-3-role-based-access-control)
7. [Deliverable 4: Session Management](#7-deliverable-4-session-management)
8. [Deliverable 5: Email Service Foundation](#8-deliverable-5-email-service-foundation)
9. [Testing Requirements](#9-testing-requirements)
10. [Migration and Data Considerations](#10-migration-and-data-considerations)
11. [Risk Assessment](#11-risk-assessment)
12. [Definition of Done](#12-definition-of-done)
13. [Connection to Next Phase](#13-connection-to-next-phase)

---

## 1. Phase Overview

Phase 6 lays the foundation for the entire platform. It expands the database schema from the existing scraping-engine tables to include all entities needed for user accounts, authentication, billing, and administration. It implements the complete authentication system (registration, login, email verification, OAuth, MFA, password reset) and establishes the role-based access control framework.

Nothing else in the platform can be built without this phase. Every subsequent phase depends on users being able to create accounts, authenticate, and have their permissions enforced.

### What Exists Before Phase 6

- PostgreSQL database with scraping engine tables (jobs, proxies, job_logs, job_results)
- Redis for queue management and rate limiting
- Fastify API server with scrape endpoints
- BullMQ job processing workers
- 413 passing tests

### What Exists After Phase 6

- Complete database schema for all platform entities (30+ tables)
- Full authentication system (email/password, OAuth, MFA, password reset)
- Email verification flow
- Session management via Redis
- Role-based access control (User and Admin roles)
- Protected API routes (public, authenticated, admin)
- Email service for transactional emails
- CSRF protection on all state-changing endpoints
- Account lockout and brute force protection
- Comprehensive test suite for all new functionality

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | Users can register, verify their email, and log in |
| G2 | Users can authenticate via Google or GitHub OAuth |
| G3 | Users can enable MFA on their accounts |
| G4 | Users can reset forgotten passwords |
| G5 | Sessions are securely managed in Redis with idle and absolute timeouts |
| G6 | API routes are protected based on authentication and role |
| G7 | Admin users can access admin-only endpoints |
| G8 | All existing scraping functionality continues to work (no regressions) |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Registration to login flow works end-to-end | Automated E2E test passes |
| Email verification flow works | Automated integration test passes |
| OAuth flows work for Google and GitHub | Automated integration tests pass (mocked providers) |
| MFA setup and verification works | Automated integration tests pass |
| Password reset flow works end-to-end | Automated integration test passes |
| Session idle timeout works | Automated test verifies session expiry after 30 minutes of inactivity |
| Session absolute timeout works | Automated test verifies session expiry after 24 hours |
| Protected routes reject unauthenticated requests | All auth-required endpoints return 401 without valid session |
| Admin routes reject non-admin users | All admin endpoints return 403 for User role |
| No regressions in existing tests | All 413 existing tests still pass |
| New test coverage meets thresholds | Auth modules at 100%, overall above 80% |
| Database migrations run cleanly | Forward and rollback migrations pass |

---

## 3. Prerequisites Check

Before starting Phase 6, verify:

| Check | How to Verify |
|-------|--------------|
| All 413 existing tests pass | Run full test suite |
| Database is accessible | Run migration script against dev database |
| Redis is accessible | Connect and verify SET/GET operations |
| Environment variables configured | Verify .env has all required values per APPENDICES/D-ENVIRONMENT-VARIABLES.md |
| Docker Compose runs cleanly | docker-compose up starts all services without errors |
| Git branch created | Create phase-06/auth-and-schema branch from main |

---

## 4. Deliverable 1: Database Schema Expansion

**Reference Document:** 18-DATA-MODELS.md

### Task 4.1: Write Migration Files

Create database migration files for all new tables. Each migration file handles one logical group of tables. Migrations must support both forward (up) and rollback (down) operations.

| Migration | Tables Created | Reference |
|-----------|---------------|-----------|
| Migration 001 | account | 18-DATA-MODELS.md, Section 2 (Identity group) |
| Migration 002 | user | 18-DATA-MODELS.md, Section 2 |
| Migration 003 | oauth_connection | 18-DATA-MODELS.md, Section 2 |
| Migration 004 | email_verification_token | 18-DATA-MODELS.md, Section 2 |
| Migration 005 | password_reset_token | 18-DATA-MODELS.md, Section 2 |
| Migration 006 | mfa_configuration | 18-DATA-MODELS.md, Section 2 |
| Migration 007 | api_key (expand existing or replace) | 18-DATA-MODELS.md, Section 3 |
| Migration 008 | job (add account_id FK, expand fields) | 18-DATA-MODELS.md, Section 4 |
| Migration 009 | subscription | 18-DATA-MODELS.md, Section 5 |
| Migration 010 | invoice | 18-DATA-MODELS.md, Section 5 |
| Migration 011 | credit_ledger | 18-DATA-MODELS.md, Section 5 |
| Migration 012 | credit_pack_purchase | 18-DATA-MODELS.md, Section 5 |
| Migration 013 | payment_method | 18-DATA-MODELS.md, Section 5 |
| Migration 014 | payment_failure, refund | 18-DATA-MODELS.md, Section 5 |
| Migration 015 | support_ticket, ticket_message | 18-DATA-MODELS.md, Section 6 |
| Migration 016 | notification | 18-DATA-MODELS.md, Section 7 |
| Migration 017 | audit_log | 18-DATA-MODELS.md, Section 7 |
| Migration 018 | abuse_flag | 18-DATA-MODELS.md, Section 7 |
| Migration 019 | blog_post | 18-DATA-MODELS.md, Section 7 |
| Migration 020 | status_incident, maintenance_window | 18-DATA-MODELS.md, Section 7 |
| Migration 021 | platform_configuration | 18-DATA-MODELS.md, Section 7 |
| Migration 022 | rate_limit_override | 18-DATA-MODELS.md, Section 7 |

### Task 4.2: Create Database Repository Layer

For each new table, create a repository module that encapsulates all database queries. Repositories are the only layer that directly interacts with the database.

Repositories to create in this phase (others created in later phases when their features are built):

| Repository | Key Operations |
|-----------|----------------|
| AccountRepository | create, findById, findByUserId, updatePlan, updateCreditBalance, softDelete |
| UserRepository | create, findById, findByEmail, update, anonymize, softDelete |
| SessionRepository (Redis) | create, findById, extend, delete, deleteAllForUser, listByUserId |
| OAuthConnectionRepository | create, findByProviderAndProviderId, findByUserId, delete |
| EmailVerificationTokenRepository | create, findByToken, markUsed, deleteExpired |
| PasswordResetTokenRepository | create, findByToken, markUsed, deleteExpired |
| MfaConfigurationRepository | create, findByUserId, update, delete |
| AuditLogRepository | create, findWithFilters (paginated) |

### Task 4.3: Update Existing Entities

The existing job and api_key tables need to be expanded to include account associations:

| Table | Changes |
|-------|---------|
| job | Add account_id column (UUID, FK to account), add index on account_id, backfill existing rows with a default system account |
| api_key | Restructure to match 18-DATA-MODELS.md definition (add account_id FK, type field, ip_whitelist, prefix storage, hashed key body) |

### Task 4.4: Seed Script Update

Update the existing seed script (scripts/seed.ts) to:

1. Create a default admin account and user (for development and first-time setup)
2. Create a default non-admin test account and user
3. Associate existing seed data with the admin account
4. Set up default platform configuration values

The seed script must be idempotent -- running it multiple times does not create duplicate data.

---

## 5. Deliverable 2: Authentication System

**Reference Documents:** 03-AUTHENTICATION.md, 19-SECURITY-FRAMEWORK.md

### Task 5.1: Registration

Build the user registration endpoint and supporting logic.

| Component | Details |
|-----------|---------|
| Endpoint | POST /api/auth/register |
| Request fields | email, password, name, acceptedTerms (boolean) |
| Validation | Email format, password minimum 8 chars with strength check, name 1-100 chars, acceptedTerms must be true |
| Flow | Validate input, check email uniqueness, hash password (bcrypt cost 12), create account (Free plan, 1000 credits), create user, create email verification token, queue verification email, return success (do NOT auto-login) |
| Error handling | Duplicate email returns generic success (anti-enumeration), validation errors return 400 with field-level messages |
| Rate limiting | 5 registrations per IP per hour |
| Reference | 03-AUTHENTICATION.md Section 2 |

### Task 5.2: Email Verification

Build the email verification endpoint and resend flow.

| Component | Details |
|-----------|---------|
| Verify endpoint | POST /api/auth/verify-email |
| Request fields | token (from email link) |
| Flow | Look up token, verify not expired (24 hours), verify not already used, mark user as verified, mark token as used, return success |
| Resend endpoint | POST /api/auth/resend-verification |
| Request fields | email |
| Resend flow | Look up user by email, verify not already verified, check rate limit (3 per hour), generate new token, invalidate old tokens, queue email |
| Cleanup | Scheduled task deletes unverified accounts older than 7 days and their associated data |
| Reference | 03-AUTHENTICATION.md Section 3 |

### Task 5.3: Login

Build the login endpoint with comprehensive security.

| Component | Details |
|-----------|---------|
| Endpoint | POST /api/auth/login |
| Request fields | email, password, rememberMe (boolean, optional) |
| Flow | Look up user by email (constant-time even if not found), verify email is verified, check account lockout status, compare password hash (constant-time), check if MFA is enabled, if no MFA create session and return user data, if MFA return mfa_required flag without creating session |
| Session duration | 30 minutes idle timeout, 24 hours absolute (rememberMe extends to 7 days idle, 30 days absolute) |
| Error handling | All authentication failures return generic "Invalid email or password" message |
| Lockout | Track failed attempts per email and per IP, lock after 5 failed attempts for 15 minutes, escalating to 1 hour after 15 total failures |
| Reference | 03-AUTHENTICATION.md Section 4 |

### Task 5.4: MFA (TOTP)

Build MFA setup and verification.

| Component | Details |
|-----------|---------|
| Setup endpoint | POST /api/auth/mfa/setup |
| Setup flow | Generate TOTP secret, generate QR code data (otpauth:// URI), generate 10 backup codes, return secret + QR data + backup codes (show-once) |
| Enable endpoint | POST /api/auth/mfa/enable |
| Enable flow | Verify TOTP code against stored secret, mark MFA as active, store hashed backup codes |
| Verify endpoint | POST /api/auth/mfa/verify |
| Verify flow | Validate TOTP code (allow one-window tolerance), if valid create session, if invalid decrement attempts |
| Backup code endpoint | POST /api/auth/mfa/backup |
| Backup flow | Accept backup code, verify against stored hashes, mark code as used, create session |
| Disable endpoint | POST /api/auth/mfa/disable |
| Disable flow | Require password confirmation, remove MFA configuration, log action to audit |
| Rate limiting | 5 MFA attempts per session, lockout for 15 minutes after failure |
| Reference | 03-AUTHENTICATION.md Section 6 |

### Task 5.5: Password Reset

Build the password reset flow.

| Component | Details |
|-----------|---------|
| Request endpoint | POST /api/auth/forgot-password |
| Request fields | email |
| Request flow | Always return success (anti-enumeration), if email exists generate token (1 hour expiry), invalidate previous tokens, queue reset email |
| Reset endpoint | POST /api/auth/reset-password |
| Reset fields | token, newPassword |
| Reset flow | Validate token, verify not expired, verify not used, validate new password strength, hash password, update user, mark token as used, invalidate all sessions for user, return success |
| Rate limiting | 3 reset requests per email per hour, 10 per IP per hour |
| Reference | 03-AUTHENTICATION.md Section 7 |

### Task 5.6: OAuth (Google and GitHub)

Build OAuth authentication for both providers.

| Component | Details |
|-----------|---------|
| Initiate endpoint | GET /api/auth/oauth/:provider (provider = google or github) |
| Initiate flow | Generate state parameter (random, stored in Redis with 10-min expiry), build authorization URL with scopes (email + profile), redirect user |
| Callback endpoint | GET /api/auth/oauth/:provider/callback |
| Callback flow | Verify state parameter, exchange code for tokens, fetch user profile from provider, look up existing OAuth connection |
| New user scenario | No existing connection and no user with that email: create account, create user (email_verified = true), create OAuth connection, create session |
| Existing connection | OAuth connection found: look up associated user, create session |
| Email match scenario | No OAuth connection but user with same email exists: link OAuth connection to existing account, create session |
| Error handling | Invalid state returns redirect to login with error, provider errors return redirect to login with generic error |
| Terms acceptance | OAuth users accepted terms implicitly upon first login (recorded in user record) |
| Reference | 03-AUTHENTICATION.md Section 5 |

### Task 5.7: Logout

Build the logout endpoint.

| Component | Details |
|-----------|---------|
| Endpoint | POST /api/auth/logout |
| Flow | Delete session from Redis, clear session cookie, return success |
| All sessions | POST /api/auth/logout-all -- deletes all sessions for user except current (optional, or including current) |

---

## 6. Deliverable 3: Role-Based Access Control

**Reference Document:** 04-ROLES-AND-PERMISSIONS.md

### Task 6.1: Role Assignment

| Component | Details |
|-----------|---------|
| Default role | All new users receive User role |
| Admin bootstrap | Seed script creates first admin, or a CLI command promotes a user to Admin |
| Role storage | user.role field, string enum: "user" or "admin" |
| Role in session | Session data includes role, checked on every request |

### Task 6.2: Route Protection Middleware

Build three middleware functions that protect API routes:

| Middleware | Behavior | Applied To |
|-----------|----------|------------|
| requireAuth | Validates session cookie, loads session from Redis, attaches user/account to request context. Returns 401 if invalid or expired. | All /api/* routes except /api/auth/register, /api/auth/login, /api/auth/verify-email, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/oauth/*, /api/public/* |
| requireAdmin | Checks role in session data is "admin". Returns 403 if not. Must be applied AFTER requireAuth. | All /api/admin/* routes |
| requireCsrf | Validates X-CSRF-Token header against session-stored CSRF token. Returns 403 if invalid. Exempt: GET/HEAD/OPTIONS requests and API-key-authenticated requests. | All state-changing (POST/PUT/PATCH/DELETE) session-authenticated routes |

### Task 6.3: Resource Ownership Enforcement

All resource-access endpoints must verify that the authenticated user owns the requested resource:

| Resource | Ownership Check |
|----------|----------------|
| API key | api_key.account_id matches session account_id |
| Job | job.account_id matches session account_id |
| Support ticket | support_ticket.account_id matches session account_id |
| Subscription | subscription.account_id matches session account_id |
| Billing data | All billing queries scoped by session account_id |

Non-matching resources return 404 (not 403) to prevent enumeration.

Admin users can access any resource through admin-specific endpoints (/api/admin/*), not through regular user endpoints.

---

## 7. Deliverable 4: Session Management

**Reference Documents:** 03-AUTHENTICATION.md Section 8, 19-SECURITY-FRAMEWORK.md

### Task 7.1: Session Storage

| Component | Details |
|-----------|---------|
| Storage | Redis hash per session |
| Key format | session:{sessionId} |
| Session ID | Cryptographically random, 32 bytes, base64url encoded |
| Session data fields | userId, accountId, role, ipAddress, userAgent, createdAt, lastActivityAt, expiresAt, csrfToken |
| Session cookie | Name: scrapifie_session, HttpOnly, Secure, SameSite=Lax, Path=/ |

### Task 7.2: Session Lifecycle

| Event | Action |
|-------|--------|
| Login (no MFA) | Create session, set cookie, return CSRF token in response body |
| Login (MFA required) | Create temporary pre-MFA session (limited, cannot access protected routes), set cookie |
| MFA verified | Upgrade pre-MFA session to full session (rotate session ID), update cookie |
| Activity | Update lastActivityAt on every authenticated request, extend idle timeout |
| Idle timeout | Session expires after 30 minutes of inactivity (7 days with rememberMe) |
| Absolute timeout | Session expires after 24 hours regardless of activity (30 days with rememberMe) |
| Logout | Delete session from Redis, clear cookie |
| Password change | Delete all sessions except current |
| Account suspension | Delete all sessions |
| Session listing | User can list all active sessions (GET /api/auth/sessions) |
| Session revocation | User can revoke a specific session (DELETE /api/auth/sessions/:id) |
| Revoke all others | User can revoke all sessions except current (POST /api/auth/sessions/revoke-others) |

### Task 7.3: CSRF Protection

| Component | Details |
|-----------|---------|
| Token generation | Cryptographically random, 32 bytes, stored in session |
| Token delivery | Returned in login/register response body, frontend stores in memory (not localStorage) |
| Token submission | Frontend sends as X-CSRF-Token header on every state-changing request |
| Token validation | Middleware compares submitted token against session-stored token, constant-time comparison |
| Exemptions | GET, HEAD, OPTIONS requests; API-key-authenticated requests (API keys are themselves CSRF-proof) |

---

## 8. Deliverable 5: Email Service Foundation

**Reference Document:** 03-AUTHENTICATION.md Section 12, APPENDICES/B-EMAIL-TEMPLATES.md

### Task 8.1: Email Service Architecture

Build a provider-agnostic email service that can send transactional emails.

| Component | Details |
|-----------|---------|
| Interface | EmailService with send(to, template, data) method |
| Provider abstraction | Pluggable provider (SMTP, API-based like SendGrid/Mailgun/SES) configured via environment variable |
| Queue integration | Emails sent via BullMQ queue (fire-and-forget, retries on failure) |
| Template system | Simple template engine with variable substitution (platform name, user name, links, etc.) |
| Development mode | In development, emails are logged to console instead of sent |
| Test mode | In test, emails are captured in memory for assertion |

### Task 8.2: Email Templates (Phase 6 Only)

Build only the templates needed for authentication flows. Remaining templates are added in later phases.

| Template | Trigger | Key Variables |
|----------|---------|--------------|
| Email verification | Registration | userName, verificationLink, expiryTime |
| Welcome email | Email verified | userName, dashboardLink |
| Password reset | Forgot password request | userName, resetLink, expiryTime |
| Password changed | Password successfully changed | userName, changeTime, supportLink |
| New login detected | Login from new device/location | userName, deviceInfo, ipAddress, location, time |
| Account locked | Too many failed attempts | userName, unlockTime, supportLink |

---

## 9. Testing Requirements

**Reference Document:** 21-TESTING-STRATEGY.md

### Unit Tests Required

| Module | Test Count Estimate | Coverage Target |
|--------|-------------------|----------------|
| Password hashing and validation | 15-20 tests | 100% |
| Token generation and validation | 10-15 tests | 100% |
| CSRF token logic | 8-10 tests | 100% |
| Session helper functions | 10-12 tests | 100% |
| Input validation (email, name, password) | 20-25 tests | 100% |
| Role checking utilities | 5-8 tests | 100% |
| IP whitelist validation | 10-12 tests | 100% |
| Proration calculator | 12-15 tests | 100% |

### Integration Tests Required

| Flow | Test Count Estimate |
|------|-------------------|
| Registration (success, duplicate, validation errors) | 8-10 tests |
| Email verification (success, expired, already used, invalid) | 6-8 tests |
| Login (success, wrong password, unverified, locked, MFA required) | 10-12 tests |
| MFA setup and verification | 8-10 tests |
| Password reset (request, reset, expired token, used token) | 8-10 tests |
| OAuth flows (new user, existing user, email match, errors) | 10-12 tests |
| Session management (create, expire, revoke, list) | 8-10 tests |
| Route protection (unauthenticated, wrong role, CSRF) | 10-12 tests |
| Resource ownership (own resource, other's resource, admin access) | 8-10 tests |
| Database migrations (forward, rollback) | 5-8 tests |

### E2E Tests Required

| Flow | Test Count |
|------|-----------|
| Registration to email verification to login | 1 |
| Login and access dashboard | 1 |
| MFA setup and MFA login | 1 |
| Password reset flow | 1 |
| OAuth login (mocked provider) | 2 (Google, GitHub) |
| Protected route redirect to login | 1 |

### Security Tests Required

| Category | Test Count Estimate |
|----------|-------------------|
| Anti-enumeration (registration, login, password reset) | 6 tests |
| Timing attack resistance | 3 tests |
| Session security (fixation, cookie flags) | 5 tests |
| CSRF enforcement | 5 tests |
| Account lockout | 5 tests |
| Rate limiting | 5 tests |
| SQL injection on auth inputs | 5 tests |
| XSS on auth inputs | 3 tests |

### Regression Requirement

All 413 existing tests must continue to pass. Run the full existing test suite after all Phase 6 changes to verify no regressions.

---

## 10. Migration and Data Considerations

### Existing Data Handling

| Data | Migration Strategy |
|------|-------------------|
| Existing jobs | Add account_id column with default value pointing to system account, then make non-nullable after backfill |
| Existing API keys | Migrate to new schema with account_id, type defaulting to live, hash the key body if not already hashed |
| Existing job_logs | No changes needed, linked to jobs via job_id |
| Existing job_results | No changes needed, linked to jobs via job_id |

### Migration Safety Rules

1. All migrations run in transactions
2. Each migration can be rolled back independently
3. No data is deleted during migration (only added or transformed)
4. Large table alterations use online DDL techniques to avoid locking
5. Migration scripts are tested against a copy of production data before execution

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Existing test breakage due to schema changes | Medium | High | Run existing tests after each migration, fix immediately |
| OAuth provider configuration complexity | Medium | Medium | Use mocked providers in development, document setup clearly |
| Session management edge cases | Medium | High | Extensive integration testing, follow 03-AUTHENTICATION.md edge cases |
| Password hashing performance impact | Low | Low | bcrypt cost 12 adds ~250ms per hash, acceptable for auth operations |
| Email deliverability in production | Medium | Medium | Use established email provider, implement SPF/DKIM/DMARC |
| Migration ordering conflicts between developers | Low | Medium | Sequential migration numbering, CI check for conflicts |

---

## 12. Definition of Done

Phase 6 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | All 22 migration files run successfully (forward and rollback) |
| 2 | All database tables from 18-DATA-MODELS.md exist with correct columns, types, indexes, and constraints |
| 3 | User registration works with email/password |
| 4 | Email verification flow works end-to-end |
| 5 | User login works with email/password |
| 6 | OAuth login works for Google and GitHub (with mocked providers) |
| 7 | MFA setup, verification, and backup codes work |
| 8 | Password reset flow works end-to-end |
| 9 | Sessions are stored in Redis with correct fields and timeouts |
| 10 | CSRF protection is active on all state-changing endpoints |
| 11 | requireAuth middleware blocks unauthenticated access |
| 12 | requireAdmin middleware blocks non-admin access |
| 13 | Resource ownership is enforced on all resource endpoints |
| 14 | Account lockout activates after failed login attempts |
| 15 | Rate limiting is active on auth endpoints |
| 16 | Email service sends verification, welcome, password reset, and notification emails |
| 17 | All 413 existing tests pass (no regressions) |
| 18 | Auth module test coverage is at 100% |
| 19 | Overall test coverage is at or above 80% |
| 20 | Seed script creates admin and test user accounts |
| 21 | No high or critical security vulnerabilities in dependency audit |

---

## 13. Connection to Next Phase

Phase 6 provides the foundation that Phase 7 builds upon:

- **Phase 7 (User Dashboard)** requires authenticated users to exist, sessions to work, and account data to be available for display
- Phase 7 will build the React frontend, the dashboard layout, and all user-facing pages (overview, API keys, jobs, usage)
- Phase 7 depends on the API routes created in Phase 6 for authentication and the middleware for route protection
- The API key management UI in Phase 7 depends on the API key repository and endpoints established in Phase 6
- The jobs list in Phase 7 depends on the account-scoped job queries established in Phase 6

**Read before starting Phase 7:** 00-PLATFORM-OVERVIEW.md (tech stack, URL structure), 05-USER-DASHBOARD.md (layout, overview page, global components), 06-API-KEY-MANAGEMENT.md (key CRUD UI), 07-JOBS-AND-LOGS.md (jobs list and detail UI), 08-USAGE-AND-ANALYTICS.md (usage page UI)
