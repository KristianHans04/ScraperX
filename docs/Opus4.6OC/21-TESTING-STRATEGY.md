# Scrapifie Testing Strategy

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-021 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 03-AUTHENTICATION.md, 06-API-KEY-MANAGEMENT.md, 09-BILLING-AND-CREDITS.md, 18-DATA-MODELS.md, 19-SECURITY-FRAMEWORK.md |

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Testing Pyramid](#2-testing-pyramid)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [API Testing](#6-api-testing)
7. [Frontend Testing](#7-frontend-testing)
8. [Security Testing](#8-security-testing)
9. [Performance Testing](#9-performance-testing)
10. [Accessibility Testing](#10-accessibility-testing)
11. [Visual Regression Testing](#11-visual-regression-testing)
12. [Database Testing](#12-database-testing)
13. [Billing and Credit Testing](#13-billing-and-credit-testing)
14. [Authentication and Authorization Testing](#14-authentication-and-authorization-testing)
15. [Test Data Management](#15-test-data-management)
16. [Test Environment Strategy](#16-test-environment-strategy)
17. [Continuous Integration Pipeline](#17-continuous-integration-pipeline)
18. [Coverage Requirements](#18-coverage-requirements)
19. [Testing Tools and Frameworks](#19-testing-tools-and-frameworks)
20. [Test Naming and Organization](#20-test-naming-and-organization)
21. [Edge Cases and Boundary Testing](#21-edge-cases-and-boundary-testing)
22. [Related Documents](#22-related-documents)

---

## 1. Testing Philosophy

### Core Principles

Scrapifie testing follows five principles that guide every test written across the platform:

1. **Test behavior, not implementation** -- Tests verify what the system does, not how it does it internally. If a function is refactored but produces the same result, no tests should break.

2. **Every feature is testable** -- If a feature cannot be tested automatically, it is redesigned until it can be. No feature ships without corresponding tests.

3. **Tests are documentation** -- Test names and structure describe expected behavior in plain language. A developer reading test names should understand the feature without reading source code.

4. **Fast feedback loop** -- Unit tests run in under 30 seconds. The full test suite completes in under 10 minutes. Slow tests are isolated and run separately.

5. **Deterministic results** -- Tests produce the same result every time. No dependency on external services, current time, random values, or network conditions in unit and integration tests.

### Coverage Mandates

From docs/development/standards.md:

| Category | Minimum Coverage |
|----------|-----------------|
| Overall platform | 80% line coverage |
| Payment and billing logic | 100% line and branch coverage |
| Security-critical code (auth, crypto, permissions) | 100% line and branch coverage |
| API route handlers | 90% line coverage |
| Frontend components | 80% line coverage |
| Utility functions | 95% line coverage |
| Database repositories | 90% line coverage |

Coverage is measured per pull request and across the entire codebase. A pull request that drops coverage below these thresholds is blocked from merging.

---

## 2. Testing Pyramid

Scrapifie follows the standard testing pyramid with explicit ratios:

```
         /\
        /  \
       / E2E\          ~5%  of total tests
      /------\
     /  Integ \        ~20% of total tests
    /----------\
   /    Unit    \      ~75% of total tests
  /--------------\
```

### Layer Definitions

| Layer | Scope | Speed | Dependencies | Count Target |
|-------|-------|-------|-------------|--------------|
| Unit | Single function, class, or component in isolation | < 50ms per test | None (all mocked) | Hundreds |
| Integration | Multiple modules working together, database queries, API routes | < 2s per test | Database, Redis (test instances) | Dozens to low hundreds |
| End-to-End | Full user workflow through the browser | < 30s per test | Full stack running | Dozens |

### Anti-Patterns to Avoid

- **Ice cream cone** -- More E2E tests than unit tests. This leads to slow, brittle suites.
- **Testing private methods** -- Only test public interfaces. Private methods are tested indirectly.
- **Snapshot overuse** -- Snapshots are allowed only for serialized API responses. Never for component HTML output.
- **Test interdependence** -- Each test must be runnable in isolation. No test depends on another test running first.
- **Sleeping** -- Never use fixed-time sleeps. Use polling, waitFor, or event-driven assertions.

---

## 3. Unit Testing

### Backend Unit Tests

Backend unit tests verify individual functions, classes, and modules in complete isolation. Every external dependency is mocked.

#### What to Unit Test

| Module | What to Test | Example Assertions |
|--------|-------------|-------------------|
| Credit calculator | Credit cost computation per engine type | HTTP engine returns 1 credit, Browser returns 5, Stealth returns 10 |
| Credit calculator | Insufficient balance detection | Returns error when balance is less than cost |
| Password validator | Strength scoring | Scores of 1 through 5 based on character composition |
| Password validator | Minimum requirements | Rejects passwords under 8 characters |
| API key generator | Key format | Generated key starts with sk_live_ or sk_test_ prefix |
| API key generator | Key length | Total key length is 48 characters |
| API key generator | Randomness | Two generated keys are never identical (run 1000 iterations) |
| API key hasher | Hash consistency | Same input always produces same SHA-256 hash |
| API key hasher | Hash irreversibility | Hash output cannot be reversed to input (verify hash length and format) |
| IP whitelist validator | IPv4 validation | Accepts valid IPv4 addresses, rejects malformed ones |
| IP whitelist validator | CIDR validation | Accepts valid CIDR notation, rejects invalid subnet masks |
| IP whitelist validator | Match checking | IP within CIDR range returns true, outside returns false |
| Rate limiter calculator | Window computation | Correct requests-per-minute calculation per plan tier |
| Email validator | Format validation | Accepts valid emails, rejects invalid formats |
| Email validator | Normalization | Trims whitespace, lowercases domain |
| Slug generator | Format | Produces lowercase alphanumeric with hyphens only |
| Slug generator | Uniqueness | Appends suffix on collision |
| Token generator | Length | Produces tokens of specified byte length |
| Token generator | Encoding | Output is URL-safe base64 |
| Proration calculator | Mid-cycle upgrade | Correct credit and charge proration based on remaining days |
| Proration calculator | Edge dates | Handles month-end dates, February, leap years |
| CSRF token | Generation | Produces cryptographically random token of expected length |
| CSRF token | Validation | Matching tokens return true, mismatched return false, expired return false |
| Input sanitizer | XSS prevention | Strips script tags, event handlers, javascript: URLs |
| Input sanitizer | SQL special chars | Escapes single quotes, semicolons in user inputs destined for LIKE queries |
| URL validator | SSRF prevention | Rejects private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, 0.0.0.0) |
| URL validator | Protocol enforcement | Accepts http:// and https://, rejects file://, ftp://, data: |
| Pagination helper | Offset calculation | Correct offset from page number and page size |
| Pagination helper | Total pages | Correct total page count from total items and page size |
| Date formatter | Billing cycle | Correct next billing date from anchor date, including month-end edge cases |

#### Mocking Strategy

All external dependencies are mocked at the module boundary:

| Dependency | Mock Approach |
|-----------|--------------|
| Database | Mock repository layer. Repository methods return predefined data. |
| Redis | Mock cache client. Get/set/delete return predefined values. |
| Email service | Mock transport. Capture sent emails for assertion. |
| Payment provider | Mock provider client. Return predefined subscription/payment responses. |
| Queue (BullMQ) | Mock queue. Capture added jobs for assertion. |
| File storage | Mock storage client. Capture uploaded files for assertion. |
| Crypto (randomBytes) | Seed with deterministic values for reproducible tokens. |
| Date/time | Mock current time to a fixed value. Never rely on real clock. |

### Frontend Unit Tests

Frontend unit tests verify individual React components and hooks in isolation using a test renderer.

#### What to Unit Test

| Component/Hook | What to Test |
|---------------|-------------|
| Button component | Renders label text, fires onClick, shows loading spinner when loading prop is true, disabled state prevents click |
| Form input | Renders label, displays error message, calls onChange, enforces maxLength |
| Password strength indicator | Displays correct level (1-5) and correct color per level |
| Credit progress bar | Renders correct percentage width, changes color at 60/80/90/100% thresholds |
| Modal component | Renders when open prop is true, hidden when false, calls onClose on backdrop click, traps focus |
| Toast component | Renders message with correct variant (success/error/warning/info), auto-dismisses after timeout |
| Pagination component | Renders correct page numbers, disables previous on first page, disables next on last page |
| useAuth hook | Returns user data when authenticated, returns null when not, handles loading state |
| useCredits hook | Returns formatted credit balance, calculates percentage, determines color threshold |
| usePagination hook | Calculates correct page range, handles page changes, resets on filter change |
| Theme toggle | Switches between light/dark/system, persists preference, applies correct CSS class |
| Date formatter util | Formats dates per user timezone setting, handles relative dates (just now, 5 min ago, yesterday) |
| Sidebar component | Renders all navigation items, highlights active route, collapses on mobile, shows badges |
| Empty state component | Renders correct message and CTA per variant |
| Breadcrumb component | Renders correct path segments, last segment is not a link |
| Copy button | Calls clipboard API, shows copied confirmation, reverts after 2 seconds |
| API key display | Shows masked key (first 12 chars + dots), full key in show-once mode |
| Search/filter component | Debounces input by 300ms, calls onSearch with trimmed value, clears on X click |

---

## 4. Integration Testing

Integration tests verify that multiple modules work together correctly, with real database and Redis connections but mocked external services (payment provider, email, object storage).

### Database Integration Tests

Each test runs inside a database transaction that is rolled back after the test completes. This provides real SQL execution without test data pollution.

#### Test Categories

| Category | What to Test | Example |
|----------|-------------|---------|
| User registration | Full registration flow through service layer | Create user, verify password hash stored, verify email token created, verify account created |
| Email verification | Token lookup and user activation | Create unverified user, call verify with valid token, assert user is verified and token is consumed |
| Login | Credential validation and session creation | Create user, call login with correct password, assert session created in Redis with correct fields |
| Login failure | Failed attempt tracking | Call login with wrong password 5 times, assert account is locked, assert lockout record created |
| API key creation | Key generation and storage | Create API key, assert prefix stored in plain text, assert key body is SHA-256 hashed, assert key count incremented |
| API key authentication | Full auth pipeline | Create key, call authenticate with raw key, assert correct account returned, assert last_used_at updated |
| API key revocation | Soft delete and immediate effect | Create key, revoke it, attempt authentication, assert authentication fails |
| Job creation | Job inserted with correct defaults | Submit job via service, assert job record has queued status, correct engine, credit reservation |
| Job completion | Credit deduction on completion | Create job, mark complete, assert credits deducted from account balance, assert credit ledger entry |
| Job failure | Credit deduction and retry | Create job, mark failed on attempt 1, assert retry scheduled, mark failed on attempt 3, assert credits deducted, assert final status is failed |
| Job cancellation | No credit charge | Create job in queued state, cancel it, assert no credit deduction, assert status is cancelled |
| Subscription creation | Plan assignment and credit allocation | Create subscription for Pro plan, assert plan fields set, assert credit balance is 50000 |
| Plan upgrade | Proration and credit adjustment | Create Free subscription, upgrade to Pro mid-cycle, assert prorated charge calculated, assert credits added proportionally |
| Plan downgrade | End-of-cycle scheduling | Create Pro subscription, downgrade to Free, assert downgrade_to field set, assert current plan unchanged until cycle end |
| Credit pack purchase | Balance increment | Create Pro account, purchase Small credit pack, assert balance increased by 10000, assert ledger entry |
| Support ticket creation | Ticket and first message | Create ticket, assert ticket record with open status, assert first message linked to ticket |
| Audit log | Entry creation | Perform admin action, assert audit log entry with correct actor, action, target, and details |
| Account deletion | Soft delete cascade | Delete account, assert account soft-deleted, assert user anonymized, assert API keys revoked, assert sessions cleared |

### API Route Integration Tests

API integration tests send HTTP requests to the Fastify server and verify responses. The server is started with real database and Redis but mocked external services.

#### Test Structure

Each API test follows this pattern:
1. Seed test data (user, account, API keys, etc.)
2. Authenticate (obtain session cookie or API key header)
3. Send HTTP request to the endpoint
4. Assert response status code
5. Assert response body structure and values
6. Assert side effects (database changes, queue additions, cache updates)

#### Critical API Test Scenarios

| Endpoint | Scenario | Expected Result |
|----------|----------|----------------|
| POST /api/auth/register | Valid registration | 201, user created, verification email queued |
| POST /api/auth/register | Duplicate email | 409, error message does not reveal email exists (anti-enumeration) |
| POST /api/auth/register | Invalid password (too short) | 400, validation error with password requirements |
| POST /api/auth/login | Valid credentials | 200, session cookie set, user data returned |
| POST /api/auth/login | Wrong password | 401, generic "invalid credentials" message |
| POST /api/auth/login | Locked account | 403, account locked message with retry time |
| POST /api/auth/login | Unverified email | 403, email verification required message |
| POST /api/auth/login | MFA required | 200 with mfa_required flag, no session created yet |
| POST /api/auth/mfa/verify | Valid TOTP code | 200, session created |
| POST /api/auth/mfa/verify | Invalid TOTP code | 401, attempts remaining |
| POST /api/auth/logout | Valid session | 200, session deleted from Redis |
| GET /api/keys | Authenticated user | 200, returns only keys belonging to authenticated account |
| GET /api/keys | Unauthenticated | 401 |
| POST /api/keys | Valid creation | 201, key returned in show-once response |
| POST /api/keys | Plan limit reached | 403, limit error with plan details |
| DELETE /api/keys/:id | Own key | 200, key soft-deleted |
| DELETE /api/keys/:id | Another user's key | 404 (not 403, to prevent enumeration) |
| POST /v1/scrape | Valid request with live key | 201, job created, credits reserved |
| POST /v1/scrape | Invalid API key | 401 |
| POST /v1/scrape | Revoked API key | 401, key revoked message |
| POST /v1/scrape | Insufficient credits | 402, insufficient credits with balance info |
| POST /v1/scrape | Rate limited | 429, rate limit headers present |
| POST /v1/scrape | Suspended account | 403, account suspended message |
| POST /v1/scrape | Test key with non-test URL | 403, test key restriction message |
| POST /v1/scrape | IP not in whitelist | 403, IP not authorized |
| GET /api/jobs | Authenticated user | 200, returns only jobs belonging to authenticated account |
| GET /api/jobs/:id | Own job | 200, full job detail |
| GET /api/jobs/:id | Another user's job | 404 |
| GET /api/usage | Authenticated user | 200, aggregated usage data for current billing cycle |
| GET /api/billing/subscription | Authenticated user | 200, current subscription details |
| POST /api/billing/upgrade | Valid upgrade | 200, subscription upgraded, proration applied |
| POST /api/billing/upgrade | No payment method | 400, payment method required |
| POST /api/billing/downgrade | Valid downgrade | 200, downgrade scheduled for end of cycle |
| POST /api/billing/credit-pack | Valid purchase | 200, credits added, payment processed |
| POST /api/billing/credit-pack | Free plan user | 403, Pro or Enterprise required |
| POST /api/billing/credit-pack | Max packs reached | 400, maximum 5 per cycle |
| POST /api/support/tickets | Valid ticket | 201, ticket created |
| POST /api/support/tickets | Rate limited | 429, rate limit message |
| GET /api/admin/users | Admin user | 200, paginated user list |
| GET /api/admin/users | Non-admin user | 403 |
| POST /api/admin/users/:id/suspend | Admin user | 200, user suspended, sessions cleared |
| POST /api/admin/users/:id/suspend | Admin suspending self | 403, cannot suspend self |
| POST /api/admin/credits/adjust | Valid adjustment | 200, credits adjusted, ledger entry created, audit log entry |
| POST /api/admin/credits/adjust | Negative balance result | 400, adjustment would result in negative balance |

### Redis Integration Tests

| Scenario | What to Test |
|----------|-------------|
| Session storage | Session created with correct fields, retrieved by session ID, deleted on logout |
| Session expiry | Session expires after idle timeout, extends on activity |
| Rate limit tracking | Counter increments per request, resets after window, returns correct remaining count |
| Rate limit per plan | Different limits applied based on account plan |
| Cache invalidation | Cached data cleared when underlying data changes |
| Concurrent sessions | Multiple sessions for same user tracked independently |

---

## 5. End-to-End Testing

End-to-end tests simulate real user interactions through a browser. They cover complete user journeys as documented in 20-USER-JOURNEYS.md.

### E2E Test Scenarios

Each scenario maps to a user journey or a critical workflow that spans multiple pages.

| Test Name | Journey Reference | Steps |
|-----------|------------------|-------|
| New user registration and first API call | Journey 1 | Navigate to landing page, click Sign Up, fill registration form, verify email (intercept email), arrive at dashboard, create test API key, copy key, verify key appears in keys list |
| Login with email and password | Journey 1 | Navigate to login, enter credentials, arrive at dashboard, verify user menu shows correct name |
| Login with MFA | Journey 6 | Login, see MFA prompt, enter TOTP code, arrive at dashboard |
| OAuth login (Google) | -- | Click Google login button, complete OAuth flow (mocked provider), arrive at dashboard |
| OAuth login (GitHub) | -- | Click GitHub login button, complete OAuth flow (mocked provider), arrive at dashboard |
| Password reset | -- | Click forgot password, enter email, follow reset link (intercepted email), set new password, login with new password |
| Create and revoke API key | Journey 3 | Navigate to API Keys, click Create, fill form, copy show-once key, verify key in list, revoke key, verify key shows revoked |
| View job list and detail | Journey 4 | Navigate to Jobs, verify table renders, click a job, verify detail page with logs and result |
| Filter and search jobs | Journey 4 | Apply status filter, apply engine filter, enter search text, verify filtered results, clear filters |
| Upgrade from Free to Pro | Journey 2 | Navigate to Billing, click Upgrade, add payment method, confirm upgrade, verify plan changed, verify credit balance updated |
| Purchase credit pack | Journey 5 | Navigate to Billing, click Buy Credits, select pack, confirm purchase, verify balance updated |
| Downgrade from Pro to Free | Journey 8 | Navigate to Billing, click Downgrade, confirm, verify downgrade scheduled notice |
| Cancel subscription | Journey 8 | Navigate to Billing, click Cancel, complete confirmation flow, verify cancellation scheduled |
| Update profile settings | Journey 6 | Navigate to Settings, change display name, save, verify name updated in user menu |
| Change email address | -- | Navigate to Settings, click change email, enter new email and password, verify email sent, click verification link, verify email updated |
| Enable MFA | Journey 6 | Navigate to Security settings, click Enable MFA, scan QR code (extract secret), enter TOTP code, verify MFA enabled, save backup codes |
| View active sessions | Journey 6 | Navigate to Security settings, verify current session listed, verify browser and IP displayed |
| Create support ticket | Journey 7 | Navigate to Support, click New Ticket, fill form, submit, verify ticket appears in list |
| Reply to support ticket | Journey 7 | Open existing ticket, type reply, submit, verify message appears in thread |
| View usage analytics | Journey 3 | Navigate to Usage, verify charts render, change time range, verify data updates |
| Dark mode toggle | -- | Click theme toggle, verify dark mode applied to all visible elements, refresh page, verify persistence |
| Admin: View user list | Journey 9 | Login as admin, navigate to Users, verify user table renders with correct columns |
| Admin: Suspend user | Journey 9 | Navigate to user detail, click Suspend, fill reason, confirm, verify user status changes |
| Admin: Adjust credits | Journey 10 | Navigate to user detail, click Adjust Credits, enter amount, confirm, verify balance updated |
| Admin: View audit log | -- | Navigate to Audit Log, verify entries listed, apply filter, verify filtered results |
| Admin: Manage support ticket | Journey 10 | Navigate to Tickets, open ticket, add internal note, reply to user, change status |
| Responsive layout | -- | Resize browser to mobile (375px), verify sidebar collapses, verify hamburger menu works, verify tables scroll horizontally |

### E2E Test Rules

1. Each E2E test is self-contained. It creates its own test data and cleans up after.
2. E2E tests run against a dedicated test environment with a fresh database seeded before the suite.
3. External services (payment provider, OAuth providers, email) are mocked at the network boundary using interceptors.
4. E2E tests capture screenshots on failure for debugging.
5. E2E tests run in headless mode in CI and headed mode locally for debugging.
6. Maximum E2E test execution time is 30 seconds per test. Tests exceeding this are refactored.

---

## 6. API Testing

### Contract Testing

API contract tests verify that endpoints conform to their documented schemas. These tests are separate from integration tests and focus exclusively on response shape.

| Aspect | What to Verify |
|--------|---------------|
| Response status codes | Correct status code for each scenario (200, 201, 400, 401, 403, 404, 409, 429, 500) |
| Response body shape | All documented fields are present, no undocumented fields leak |
| Field types | Each field has the correct type (string, number, boolean, array, object, null) |
| Pagination structure | Paginated responses include data array, page, pageSize, totalItems, totalPages |
| Error response format | All errors return consistent format: error object with code, message, and optional details |
| Date format | All dates are ISO 8601 strings |
| ID format | All IDs are UUID v4 format |
| Enum values | Fields with enum constraints only return documented values |
| Null handling | Nullable fields return null (not undefined or empty string) when absent |
| Header presence | Rate limit headers present on rate-limited endpoints (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) |

### API Versioning Tests

| Scenario | What to Verify |
|----------|---------------|
| No version header | Request handled by current version (v1) |
| Valid version header | Request routed to correct version handler |
| Unknown version | 400 error with supported versions listed |
| Deprecated version | Response includes deprecation warning header |

### Webhook Testing

Webhook tests verify that the platform correctly processes incoming webhooks from the payment provider.

| Scenario | What to Verify |
|----------|---------------|
| Valid signature | Webhook processed, action taken |
| Invalid signature | Webhook rejected with 401, no action taken |
| Replay attack (duplicate event ID) | Webhook acknowledged (200) but action not repeated |
| Subscription created event | Subscription record created, credits allocated |
| Subscription updated event | Subscription record updated |
| Payment succeeded event | Invoice marked as paid, receipt email triggered |
| Payment failed event | Payment failure record created, escalation stage set, notification triggered |
| Refund processed event | Refund record updated, credits adjusted if applicable |
| Unknown event type | Webhook acknowledged (200) but no action taken, event logged |
| Malformed payload | Webhook rejected with 400, error logged |

---

## 7. Frontend Testing

### Component Testing Strategy

Frontend tests are organized into three layers:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest + React Testing Library | Individual component rendering and behavior |
| Hook testing | Vitest + renderHook | Custom hook logic and state management |
| E2E | Playwright | Full user flows in real browser |

### Component Test Checklist

Every component test must verify:

1. **Renders without crashing** -- Component mounts without throwing
2. **Renders correct content** -- Expected text, labels, and structure present
3. **Handles props correctly** -- Different prop values produce correct output
4. **Handles interactions** -- Click, type, submit events trigger correct callbacks
5. **Handles loading state** -- Loading indicator appears when data is loading
6. **Handles error state** -- Error message appears when data fetch fails
7. **Handles empty state** -- Empty state message appears when no data exists
8. **Accessibility** -- Correct ARIA attributes, focusable elements, label associations

### Form Testing

Every form in the platform requires these tests:

| Test | Description |
|------|-------------|
| Empty submission | Submit with all fields empty, verify all required field errors shown |
| Individual field validation | Each field tested individually: too short, too long, invalid format, invalid characters |
| Valid submission | Fill all fields correctly, submit, verify success callback called with correct data |
| Server error handling | Submit valid form, mock server 500 response, verify error toast shown |
| Validation error handling | Submit valid form, mock server 400 response with field errors, verify field-level errors displayed |
| Loading state | Submit form, verify button shows loading state, verify fields are disabled during submission |
| Re-submission prevention | Submit form, verify submit button is disabled until first request completes |
| Dirty state warning | Change a field, attempt navigation, verify unsaved changes warning |

### Page-Level Tests

Each page in the application has a dedicated test file verifying:

| Page | Key Test Scenarios |
|------|--------------------|
| Dashboard Overview | Stat cards render with correct values, credit chart renders, recent jobs table renders, empty state for new users |
| API Keys List | Keys table renders, create button opens modal, revoke confirmation works, plan limit message shown when at max |
| API Key Create | Form validation, key type toggle, expiry options, IP whitelist input, show-once display after creation |
| Jobs List | Table renders, pagination works, filters apply correctly, sorting works, status badges show correct colors |
| Job Detail | All sections render, logs auto-scroll for active jobs, result viewer switches formats, retry button creates new job |
| Usage Page | All charts render, time range toggle updates data, export button triggers download, empty state for no data |
| Billing Page | Current plan card, credit balance with progress bar, payment method display, invoice table, upgrade/downgrade buttons |
| Settings Profile | Form pre-filled with current data, save persists changes, avatar upload with crop, email change flow |
| Settings Security | Password change form, MFA status toggle, active sessions list, session revoke |
| Support List | Ticket cards render, status filters work, create button opens form, unread indicators |
| Support Detail | Message thread renders, reply form works, resolve button, status changes |

---

## 8. Security Testing

Security tests verify the protections documented in 19-SECURITY-FRAMEWORK.md.

### Authentication Security Tests

| Test | Description |
|------|-------------|
| Password hashing | Verify bcrypt with cost factor 12 is used, raw password never stored |
| Timing attack resistance | Login response time is constant regardless of whether email exists (within 50ms tolerance) |
| Session fixation | Verify session ID rotates after login |
| Session hijacking | Verify session bound to user agent, different user agent cannot use same session |
| Cookie security | Verify HttpOnly, Secure, SameSite=Lax flags on session cookie |
| CSRF token enforcement | Verify state-changing requests without CSRF token are rejected |
| CSRF token per session | Verify CSRF tokens are unique per session |
| Account enumeration (registration) | Verify registration does not reveal whether email already exists in error message |
| Account enumeration (login) | Verify login error message is generic for both wrong email and wrong password |
| Account enumeration (password reset) | Verify password reset always returns success regardless of email existence |
| Account lockout | Verify account locks after 5 failed attempts within 15 minutes |
| Account lockout bypass | Verify locked account cannot be accessed even with correct password until lockout expires |
| Token expiry | Verify email verification tokens expire after 24 hours |
| Token expiry | Verify password reset tokens expire after 1 hour |
| Token single use | Verify tokens cannot be reused after consumption |
| MFA brute force | Verify MFA locks out after 5 failed attempts |

### Authorization Security Tests

| Test | Description |
|------|-------------|
| Resource isolation | User A cannot access User B's API keys, jobs, tickets, or billing data |
| Admin route protection | Non-admin users receive 403 on all /api/admin/* endpoints |
| Admin self-protection | Admin cannot suspend, demote, or delete their own account via admin endpoints |
| Role escalation prevention | Non-admin cannot change their own role to admin |
| API key ownership | API key operations only work for keys owned by authenticated account |
| Job ownership | Job detail and cancellation only work for jobs owned by authenticated account |
| Ticket ownership | Users can only view and reply to their own tickets |

### Input Validation Security Tests

| Test | Description |
|------|-------------|
| SQL injection | Verify parameterized queries by submitting SQL payloads in all text inputs (name, email, search, filter values) |
| XSS reflected | Verify script tags and event handlers in query parameters are not rendered |
| XSS stored | Verify script tags in user-submitted content (ticket messages, names) are sanitized before storage and rendering |
| SSRF | Verify scrape URL validation rejects private IP ranges, localhost, and internal hostnames |
| SSRF via DNS rebinding | Verify URL resolution checks IP after DNS resolution, not just hostname |
| Path traversal | Verify file download endpoints cannot access files outside intended directory |
| Request size limits | Verify oversized request bodies are rejected before processing |
| Content type enforcement | Verify endpoints reject unexpected content types |
| Header injection | Verify CRLF injection in header values is prevented |

### Rate Limiting Security Tests

| Test | Description |
|------|-------------|
| Login rate limit | Verify more than 10 login attempts per minute from same IP are rejected with 429 |
| Registration rate limit | Verify more than 5 registration attempts per minute from same IP are rejected with 429 |
| API rate limit per plan | Verify Free plan limited to 10 req/min, Pro to 100 req/min |
| Rate limit headers | Verify X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers present |
| Rate limit reset | Verify rate limit counter resets after window expires |
| Rate limit bypass prevention | Verify rate limits cannot be bypassed by changing user agent or adding headers |

---

## 9. Performance Testing

### Load Testing

Load tests verify the platform handles expected traffic volumes without degradation.

| Scenario | Parameters | Acceptance Criteria |
|----------|-----------|-------------------|
| Normal load | 100 concurrent users, 60-second duration | P95 response time < 500ms, 0% error rate |
| Peak load | 500 concurrent users, 120-second duration | P95 response time < 2s, < 0.1% error rate |
| Sustained load | 200 concurrent users, 30-minute duration | No memory leaks, response time stable (no degradation over time) |
| Spike test | Ramp from 50 to 1000 users over 30 seconds | System recovers to normal response times within 60 seconds after spike |
| API scrape endpoint | 1000 concurrent scrape requests | Queue accepts all requests, no dropped jobs, P95 queue time < 5s |

### Database Performance Tests

| Scenario | Acceptance Criteria |
|----------|-------------------|
| User lookup by email | < 5ms with index |
| API key lookup by hash | < 5ms with index |
| Jobs list with filters (100K+ rows) | < 100ms with composite index |
| Usage aggregation (30-day window) | < 200ms with pre-aggregated data |
| Credit balance read | < 5ms (single row lookup) |
| Audit log query with filters | < 200ms with composite index |
| Concurrent credit deductions (10 simultaneous) | All succeed without deadlock, final balance is correct |

### Frontend Performance Tests

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lighthouse Performance score | >= 95 | CI lighthouse audit |
| Largest Contentful Paint (LCP) | < 2.5s | CI lighthouse audit |
| First Input Delay (FID) | < 100ms | CI lighthouse audit |
| Cumulative Layout Shift (CLS) | < 0.1 | CI lighthouse audit |
| Time to Interactive (TTI) | < 3.5s | CI lighthouse audit |
| JavaScript bundle size (main) | < 200KB gzipped | Bundle analyzer |
| CSS bundle size | < 50KB gzipped | Bundle analyzer |
| Lazy-loaded route chunks | < 50KB each gzipped | Bundle analyzer |
| Image assets | WebP format, < 100KB each | Build-time check |

---

## 10. Accessibility Testing

### Automated Accessibility Tests

Automated accessibility tests run on every page and component using axe-core rules.

| Rule Category | What is Checked |
|--------------|----------------|
| Color contrast | Text meets WCAG 2.1 AA contrast ratios (4.5:1 normal, 3:1 large text) for both light and dark themes |
| Focus indicators | All interactive elements have visible focus indicators meeting 3:1 contrast ratio |
| ARIA attributes | Required ARIA roles, labels, and states are present and correct |
| Form labels | Every form input has an associated label (visible or aria-label) |
| Heading hierarchy | Headings follow sequential order (no skipping levels) |
| Image alt text | All images have descriptive alt text (or empty alt for decorative) |
| Keyboard navigation | All interactive elements are reachable via Tab key |
| Link purpose | Link text is descriptive (no "click here" links) |
| Page title | Every page has a unique, descriptive title |
| Language attribute | HTML lang attribute is set |

### Manual Accessibility Test Checklist

These tests are performed manually before each release and documented in a test report:

| Area | Test |
|------|------|
| Keyboard-only navigation | Complete all critical user journeys using only keyboard (no mouse) |
| Screen reader | Navigate all pages with screen reader and verify all content is announced correctly |
| Focus management | Verify focus moves to modal when opened, returns to trigger when closed |
| Focus management | Verify focus moves to error message when form submission fails |
| Focus management | Verify skip-to-content link works on every page |
| Color independence | Verify all status indicators and charts convey information through means other than color alone (shape, pattern, or text) |
| Zoom | Verify all pages are usable at 200% browser zoom with no horizontal scrolling |
| Reduced motion | Verify all animations respect prefers-reduced-motion media query |
| Touch targets | Verify all interactive elements are at least 44x44px on mobile |

---

## 11. Visual Regression Testing

### Screenshot Comparison

Visual regression tests capture screenshots of key pages and components, comparing them against approved baseline images.

| Page/Component | Viewports Tested | Themes Tested |
|---------------|-----------------|---------------|
| Landing page | 375px, 768px, 1440px | Light, Dark |
| Pricing page | 375px, 768px, 1440px | Light, Dark |
| Login page | 375px, 1440px | Light, Dark |
| Registration page | 375px, 1440px | Light, Dark |
| Dashboard overview | 375px, 768px, 1440px | Light, Dark |
| API keys list | 375px, 1440px | Light, Dark |
| Jobs list | 375px, 1440px | Light, Dark |
| Job detail | 375px, 1440px | Light, Dark |
| Usage page | 375px, 1440px | Light, Dark |
| Billing page | 375px, 1440px | Light, Dark |
| Settings pages | 375px, 1440px | Light, Dark |
| Support pages | 375px, 1440px | Light, Dark |
| Admin overview | 1440px | Light, Dark |
| Docs page | 375px, 768px, 1440px | Light, Dark |

### Rules

1. Visual regression tests run on every pull request that modifies frontend code.
2. Pixel difference threshold is 0.1%. Changes exceeding this threshold fail the test and require manual approval.
3. Baseline images are stored in the repository and updated via explicit approval in pull requests.
4. Font rendering differences between CI and local environments are handled by using a consistent Docker-based test runner.
5. Dynamic content (dates, numbers, user names) is replaced with static test data before screenshot capture.

---

## 12. Database Testing

### Migration Testing

| Test | Description |
|------|-------------|
| Forward migration | All migrations run successfully on empty database |
| Forward migration | All migrations run successfully on database with existing data |
| Rollback migration | Each migration can be rolled back without data loss |
| Migration idempotency | Running the same migration twice does not cause errors |
| Migration ordering | Migrations execute in correct sequential order |
| Schema validation | After all migrations, database schema matches expected state (all tables, columns, indexes, constraints present) |

### Data Integrity Tests

| Test | Description |
|------|-------------|
| Foreign key constraints | Inserting a record with non-existent foreign key fails |
| Unique constraints | Inserting duplicate values on unique columns fails (email, API key hash, slug) |
| Not-null constraints | Inserting null for required columns fails |
| Check constraints | Inserting invalid enum values fails |
| Cascade behavior | Deleting a parent record correctly handles child records per defined cascade rules |
| Default values | Inserting without optional columns applies correct defaults |
| Timestamp auto-update | updated_at column automatically updates on record modification |
| Soft delete | Soft-deleted records are excluded from standard queries |
| Soft delete | Soft-deleted records are retrievable with explicit include-deleted query |

### Concurrent Access Tests

| Test | Description |
|------|-------------|
| Credit deduction race condition | Two simultaneous credit deductions for same account both succeed and final balance is correct (no double-spend) |
| API key creation race condition | Two simultaneous key creations for account at plan limit -- only one succeeds, other receives limit error |
| Job cancellation race condition | Cancel request arrives while job is transitioning to completed -- correct final state based on which committed first |
| Session creation race condition | Two simultaneous logins create separate sessions, both are valid |
| Subscription update race condition | Two simultaneous plan changes -- one succeeds, other receives conflict error |

---

## 13. Billing and Credit Testing

Billing and credit operations require 100% test coverage. These tests are the most critical in the platform.

### Credit Operations Tests

| Test | Description |
|------|-------------|
| Credit deduction -- HTTP engine | Job completion deducts exactly 1 credit |
| Credit deduction -- Browser engine | Job completion deducts exactly 5 credits |
| Credit deduction -- Stealth engine | Job completion deducts exactly 10 credits |
| Credit deduction -- failed job | Failed job (after max retries) still deducts credits |
| Credit non-deduction -- cancelled job | Cancelled job does not deduct credits |
| Credit non-deduction -- expired job | Expired job does not deduct credits |
| Credit non-deduction -- test key | Jobs submitted with test key never deduct credits |
| Credit reservation | Credits reserved when job is queued, preventing double-spend |
| Credit reservation release | Reserved credits released if job is cancelled before processing |
| Insufficient credits | Job submission rejected when balance is less than engine cost |
| Balance cannot go negative | No operation can cause credit balance to go below zero |
| Credit reset on cycle renewal | Balance resets to plan allocation at billing cycle start, remaining credits are lost |
| Credit pack addition | Pack credits added to current balance immediately |
| Credit pack no rollover | Pack credits lost at cycle reset along with plan credits |
| Admin credit adjustment (add) | Credits added to account, ledger entry created with admin reason |
| Admin credit adjustment (subtract) | Credits removed from account, cannot reduce below zero |
| Concurrent deductions | Multiple simultaneous deductions resolve correctly with atomic operations |

### Subscription Lifecycle Tests

| Test | Description |
|------|-------------|
| Free plan creation | New account starts on Free plan with 1000 credits, 1 API key limit |
| Upgrade Free to Pro | Subscription created, prorated credits added, payment method charged |
| Upgrade Pro to Enterprise | Subscription updated, credits adjusted, notification sent |
| Downgrade Pro to Free | Downgrade scheduled for end of cycle, current plan continues |
| Downgrade execution | At cycle end, plan changes to Free, credits reset to 1000, excess keys deactivated |
| Monthly to annual | Treated as upgrade with proration, annual charge applied |
| Annual to monthly | Takes effect at annual period end |
| Cancellation | Subscription marked for cancellation at cycle end, reactivation available until then |
| Cancellation execution | At cycle end, plan reverts to Free |
| Reactivation | Cancelled subscription reactivated before cycle end, cancellation reversed |
| Billing cycle renewal | Credits reset, subscription charges, invoice generated |

### Proration Tests

| Test | Description |
|------|-------------|
| Upgrade on day 1 of 30-day cycle | Full month charged, full credits allocated |
| Upgrade on day 15 of 30-day cycle | Half month charged, half credits allocated (rounded up) |
| Upgrade on day 29 of 30-day cycle | 1/30 month charged, proportional credits allocated |
| Upgrade on last day of cycle | Minimal charge, minimal credits, next full cycle starts next day |
| February upgrade (28 days) | Proration calculated on 28-day basis |
| February upgrade in leap year | Proration calculated on 29-day basis |
| Upgrade on 31st of month with next month having 30 days | Billing anchor date adjusted, proration correct |

### Payment Processing Tests

| Test | Description |
|------|-------------|
| Successful payment | Invoice marked paid, credits allocated, receipt email sent |
| Failed payment -- card declined | Payment failure recorded, stage 1 (grace period) entered, notification sent |
| Failed payment -- retry day 3 | Second attempt on day 3, success or failure handled |
| Failed payment -- retry day 7 | Third attempt on day 7, success or failure handled |
| Failed payment -- restrict day 10 | Account restricted (read-only API), notification sent |
| Failed payment -- suspend day 14 | Account suspended, all API keys disabled, notification sent |
| Failed payment -- cancel day 30 | Subscription cancelled, reverted to Free plan, notification sent |
| Payment method update during failure | Updated method charged immediately, success restores access |
| Duplicate payment prevention | Idempotency key prevents charging twice for same event |
| Webhook signature verification | Invalid webhook signatures are rejected |

---

## 14. Authentication and Authorization Testing

### OAuth Flow Tests

| Test | Description |
|------|-------------|
| Google OAuth -- new user | User created, account created, OAuth connection stored, session established |
| Google OAuth -- existing user (same email) | OAuth connection linked to existing account, session established |
| Google OAuth -- invalid state parameter | Authentication rejected, redirect to login with error |
| Google OAuth -- provider error | Redirect to login with generic error message |
| GitHub OAuth -- new user | User created, account created, OAuth connection stored, session established |
| GitHub OAuth -- email scope missing | Fallback to profile endpoint for email, handle no-reply email |
| GitHub OAuth -- existing connection | Login directly, session established |
| OAuth account linking | User with password account links Google, both login methods work |
| OAuth unlinking (last method) | Prevented -- user must have at least one authentication method |

### MFA Tests

| Test | Description |
|------|-------------|
| MFA setup | Secret generated, QR code data returned, backup codes generated |
| MFA verification -- valid code | MFA verified, current TOTP window accepted |
| MFA verification -- adjacent window | Accept codes from one window before and after current (30-second tolerance) |
| MFA verification -- expired code | Code from two or more windows ago rejected |
| MFA verification -- replay prevention | Same valid code cannot be used twice within its window |
| Backup code usage | Valid backup code accepted, code marked as used, cannot be reused |
| Backup code regeneration | Old codes invalidated, new codes generated, user notified |
| MFA disable | Requires password confirmation, MFA data removed, sessions preserved |
| MFA lockout | 5 failed MFA attempts locks MFA for 15 minutes |

### Session Tests

| Test | Description |
|------|-------------|
| Session creation | Session stored in Redis with user ID, account ID, role, IP, user agent, timestamps |
| Session retrieval | Valid session cookie returns correct session data |
| Session rotation | Session ID changes on privilege elevation (login, MFA verify) |
| Session idle timeout | Session expires after 30 minutes of inactivity |
| Session absolute timeout | Session expires after 24 hours regardless of activity |
| Session extension | Activity extends idle timeout but not absolute timeout |
| Session invalidation on password change | All sessions except current are invalidated |
| Session invalidation on account suspension | All sessions invalidated immediately |
| Multiple sessions | User can have multiple active sessions (different devices) |
| Session listing | User can view all active sessions with device and location info |
| Session revocation | User can revoke individual sessions or all other sessions |

---

## 15. Test Data Management

### Test Data Strategy

| Approach | When to Use |
|----------|------------|
| Factory functions | Unit and integration tests. Create minimal valid entities with overridable defaults. |
| Database seeding | E2E tests. Predefined dataset loaded before test suite. |
| Inline test data | Unit tests for edge cases. Data defined within the test for clarity. |
| Fixtures | Reusable response mocks for external services. |

### Factory Functions

Each entity has a factory function that produces a minimal valid instance. Every field can be overridden.

| Factory | Default Values | Commonly Overridden Fields |
|---------|---------------|--------------------------|
| createTestUser | Random UUID, "test@example.com", "Test User", verified, User role | email, name, role, emailVerified |
| createTestAccount | Random UUID, Free plan, 1000 credits, active status | plan, creditBalance, status |
| createTestApiKey | Random UUID, sk_test_ prefix, test type, active status, linked to account | type (live/test), status, accountId |
| createTestJob | Random UUID, queued status, http engine, linked to account and key | status, engine, url, accountId |
| createTestSubscription | Random UUID, Free plan, monthly interval, active | plan, interval, status |
| createTestTicket | Random UUID, open status, general category | status, category, priority |
| createTestSession | Random ID, linked to user, 30-min expiry | userId, role, expiresAt |

### Sensitive Data Rules

| Rule | Description |
|------|-------------|
| No real email addresses | All test emails use @example.com domain |
| No real API keys | Test API keys use sk_test_ prefix and are randomly generated |
| No real payment tokens | Payment provider tokens are mock values |
| No real IP addresses | Test IPs use documentation ranges (192.0.2.0/24, 198.51.100.0/24) |
| No production data | Test and staging environments never contain production data |
| No real passwords | Test passwords are well-known test values, never resembling real passwords |

### Test Database Management

| Operation | How |
|-----------|-----|
| Test database creation | Dedicated test database created from migrations before test suite |
| Test isolation | Each integration test runs in a transaction that is rolled back |
| E2E database seeding | Seed script runs before E2E suite, creating known dataset |
| E2E database reset | Database is dropped and recreated between E2E suite runs |
| Parallel test execution | Each test worker uses a separate database schema or database |

---

## 16. Test Environment Strategy

### Environment Tiers

| Environment | Purpose | Database | Redis | External Services | Access |
|-------------|---------|----------|-------|-------------------|--------|
| Local | Developer machine | Docker PostgreSQL (local) | Docker Redis (local) | All mocked | Developer only |
| CI | Automated test runs | Docker PostgreSQL (ephemeral) | Docker Redis (ephemeral) | All mocked | CI pipeline |
| Staging | Pre-production validation | Dedicated staging PostgreSQL | Dedicated staging Redis | Sandbox/test accounts | Team only |
| Production | Live platform | Production PostgreSQL | Production Redis | Live integrations | Public |

### CI Test Environment Setup

The CI environment is fully disposable and created fresh for each pipeline run:

1. Docker Compose starts PostgreSQL and Redis containers
2. Database migrations run to create schema
3. Seed script populates test data for E2E tests
4. Tests execute in parallel (unit and integration tests share database with transaction isolation; E2E tests run sequentially)
5. Containers are destroyed after pipeline completes

### Environment Variables for Testing

| Variable | Test Value | Purpose |
|----------|-----------|---------|
| NODE_ENV | test | Identifies test environment |
| DATABASE_URL | postgresql://test:test@localhost:5433/scrapifie_test | Test database connection |
| REDIS_URL | redis://localhost:6380 | Test Redis connection (different port than dev) |
| JWT_SECRET | test-secret-not-for-production | Deterministic secret for test tokens |
| SESSION_SECRET | test-session-secret | Deterministic secret for test sessions |
| CSRF_SECRET | test-csrf-secret | Deterministic secret for test CSRF tokens |
| EMAIL_PROVIDER | mock | Routes all emails to in-memory capture |
| PAYMENT_PROVIDER | mock | Routes all payment calls to mock responses |
| OAUTH_GOOGLE_CLIENT_ID | test-google-id | Mock Google OAuth |
| OAUTH_GITHUB_CLIENT_ID | test-github-id | Mock GitHub OAuth |
| LOG_LEVEL | silent | Suppress logs during tests (set to debug when debugging) |
| RATE_LIMIT_ENABLED | false | Disable rate limiting in unit tests (enabled in integration and E2E) |

---

## 17. Continuous Integration Pipeline

### Pipeline Stages

The CI pipeline runs on every push and every pull request. All stages must pass for a merge to be allowed.

```
Push / PR
    |
    v
[1. Install Dependencies]  -----> npm ci (frozen lockfile)
    |
    v
[2. Lint]  -----> ESLint + Prettier check
    |
    v
[3. Type Check]  -----> TypeScript compiler (tsc --noEmit)
    |
    v
[4. Unit Tests]  -----> Vitest (parallel, ~30s)
    |
    v
[5. Integration Tests]  -----> Vitest + Docker DB/Redis (~2min)
    |
    v
[6. Build]  -----> Vite build (frontend) + tsc build (backend)
    |
    v
[7. E2E Tests]  -----> Playwright (sequential, ~5min)
    |
    v
[8. Coverage Report]  -----> Coverage thresholds enforced
    |
    v
[9. Lighthouse Audit]  -----> Performance, accessibility, SEO scores
    |
    v
[10. Security Audit]  -----> npm audit, dependency check
    |
    v
[11. Visual Regression]  -----> Playwright screenshot comparison
    |
    v
[Merge Allowed]
```

### Stage Details

| Stage | Duration Target | Failure Behavior |
|-------|----------------|-----------------|
| Install Dependencies | < 60s | Pipeline stops |
| Lint | < 30s | Pipeline stops, violations reported inline |
| Type Check | < 30s | Pipeline stops, errors reported inline |
| Unit Tests | < 60s | Pipeline stops, failed tests reported |
| Integration Tests | < 3min | Pipeline stops, failed tests reported |
| Build | < 2min | Pipeline stops, build errors reported |
| E2E Tests | < 10min | Pipeline stops, screenshots of failures captured |
| Coverage Report | < 30s | Pipeline stops if below thresholds |
| Lighthouse Audit | < 2min | Pipeline stops if below score thresholds |
| Security Audit | < 30s | Warning on moderate vulnerabilities, stop on high/critical |
| Visual Regression | < 3min | Pipeline stops, diff images uploaded as artifacts |

### Pull Request Requirements

| Requirement | Description |
|------------|-------------|
| All stages pass | No stage can fail |
| Coverage thresholds met | Per-category coverage meets minimums defined in Section 1 |
| No security vulnerabilities | No high or critical vulnerabilities in dependencies |
| Lighthouse scores met | Performance >= 95, Accessibility >= 95, SEO >= 95 |
| Visual regression approved | Any visual changes must be explicitly approved |
| At least one approval | Code review from at least one other developer |
| Branch up to date | Branch must be rebased on latest main |

---

## 18. Coverage Requirements

### Coverage by Module

| Module | Line Coverage | Branch Coverage | Function Coverage |
|--------|-------------|----------------|-------------------|
| src/api/routes/auth/* | 100% | 100% | 100% |
| src/api/routes/keys/* | 90% | 85% | 90% |
| src/api/routes/jobs/* | 90% | 85% | 90% |
| src/api/routes/billing/* | 100% | 100% | 100% |
| src/api/routes/admin/* | 90% | 85% | 90% |
| src/api/routes/support/* | 85% | 80% | 85% |
| src/api/middleware/* | 100% | 100% | 100% |
| src/services/auth/* | 100% | 100% | 100% |
| src/services/billing/* | 100% | 100% | 100% |
| src/services/credits/* | 100% | 100% | 100% |
| src/services/keys/* | 90% | 85% | 90% |
| src/services/jobs/* | 90% | 85% | 90% |
| src/services/support/* | 85% | 80% | 85% |
| src/services/admin/* | 90% | 85% | 90% |
| src/db/repositories/* | 90% | 85% | 90% |
| src/utils/* | 95% | 90% | 95% |
| src/config/* | 80% | 75% | 80% |
| Frontend components | 80% | 75% | 80% |
| Frontend hooks | 85% | 80% | 85% |
| Frontend pages | 80% | 75% | 80% |
| Frontend utils | 95% | 90% | 95% |

### Coverage Enforcement

1. Coverage is measured by Vitest's built-in coverage reporter (using v8 or istanbul provider).
2. Coverage thresholds are configured in the Vitest configuration file.
3. The CI pipeline fails if any module falls below its threshold.
4. Coverage reports are uploaded as CI artifacts and viewable in pull request comments.
5. Coverage trends are tracked over time. Declining coverage triggers a warning even if above thresholds.

### Excluded from Coverage

| Exclusion | Reason |
|-----------|--------|
| Type definitions (*.d.ts) | No runtime behavior |
| Configuration files | Validated through integration tests |
| Database migration files | Tested through migration tests, not unit coverage |
| Test files themselves | Measuring test coverage of tests is circular |
| Main entry points (index.ts, main.tsx) | Bootstrap code tested through integration and E2E |
| Third-party type adapters | Thin wrappers with no logic |

---

## 19. Testing Tools and Frameworks

### Backend Testing Stack

| Tool | Purpose | Why This Tool |
|------|---------|--------------|
| Vitest | Test runner and assertion library | Fast, native ESM support, compatible with existing codebase (413 tests already using it) |
| Vitest Coverage (v8) | Code coverage measurement | Built into Vitest, zero additional configuration |
| Supertest | HTTP assertion library for API tests | De facto standard for Fastify/Express testing |
| Testcontainers | Docker containers for integration tests | Provides real PostgreSQL and Redis for tests, ephemeral and isolated |
| msw (Mock Service Worker) | External service mocking | Intercepts HTTP requests at network level, works for payment provider and OAuth mocks |
| Faker.js | Test data generation | Generates realistic random data for factory functions |

### Frontend Testing Stack

| Tool | Purpose | Why This Tool |
|------|---------|--------------|
| Vitest | Test runner (shared with backend) | Consistent tooling across the stack |
| React Testing Library | Component testing | Encourages testing behavior over implementation, accessibility-first queries |
| @testing-library/user-event | User interaction simulation | Realistic event simulation (typing, clicking, tabbing) |
| jsdom | DOM environment for unit tests | Lightweight browser simulation for component tests |
| Playwright | End-to-end browser testing | Cross-browser support, reliable, built-in assertions, screenshot comparison |
| axe-core | Accessibility testing | Industry standard for automated a11y checking |
| Lighthouse CI | Performance and SEO auditing | Automated Lighthouse audits in CI |

### Infrastructure

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipeline execution |
| Docker Compose | Test environment orchestration |
| Playwright Test Reporter | HTML test report generation |
| Vitest UI | Local test debugging with visual interface |

---

## 20. Test Naming and Organization

### Naming Convention

Test files and test names follow strict conventions for consistency and readability.

#### File Naming

| Source File | Test File |
|------------|-----------|
| src/services/auth/login.ts | tests/services/auth/login.test.ts |
| src/api/routes/keys.ts | tests/api/routes/keys.test.ts |
| src/utils/credits.ts | tests/utils/credits.test.ts |
| src/db/repositories/user.ts | tests/db/repositories/user.test.ts |
| src/frontend/components/Button.tsx | tests/frontend/components/Button.test.tsx |
| src/frontend/pages/Dashboard.tsx | tests/frontend/pages/Dashboard.test.tsx |
| src/frontend/hooks/useAuth.ts | tests/frontend/hooks/useAuth.test.ts |

Test files mirror the source directory structure under a top-level tests/ directory.

#### Test Name Format

Tests use the describe/it pattern with descriptive names that read as sentences:

```
describe("[Module] [Function/Component]")
  describe("when [condition]")
    it("should [expected behavior]")
```

Examples of good test names:
- "CreditCalculator > calculateCost > when engine is HTTP > should return 1 credit"
- "CreditCalculator > calculateCost > when engine is Stealth > should return 10 credits"
- "LoginService > login > when password is incorrect > should return generic error message"
- "LoginService > login > when account is locked > should return lockout duration"
- "ApiKeyService > create > when at plan limit > should throw PlanLimitError"
- "Button > when loading is true > should show spinner and disable click"

Examples of bad test names (avoid):
- "test1" -- meaningless
- "should work" -- not specific
- "credit test" -- does not describe expected behavior
- "it calculates" -- too vague

### Test Organization

| Directory | Contents |
|-----------|----------|
| tests/unit/ | Unit tests (no database, no Redis, everything mocked) |
| tests/integration/ | Integration tests (real database and Redis) |
| tests/e2e/ | End-to-end Playwright tests |
| tests/fixtures/ | Shared test fixtures and mock data |
| tests/factories/ | Entity factory functions |
| tests/helpers/ | Test utility functions (setup, teardown, custom matchers) |
| tests/mocks/ | Mock implementations for external services |

### Test Grouping Tags

Tests can be tagged for selective execution:

| Tag | Purpose | Example Use |
|-----|---------|-------------|
| @unit | Unit tests only | Run fast feedback loop |
| @integration | Integration tests only | Run after unit tests pass |
| @e2e | End-to-end tests only | Run before deploy |
| @security | Security-related tests | Run security audit |
| @billing | Billing and credit tests | Run after billing changes |
| @auth | Authentication tests | Run after auth changes |
| @admin | Admin functionality tests | Run after admin changes |
| @a11y | Accessibility tests | Run accessibility audit |
| @visual | Visual regression tests | Run after UI changes |
| @slow | Tests that take > 5 seconds | Excluded from fast run |

---

## 21. Edge Cases and Boundary Testing

### Boundary Value Testing

Every numeric input and calculation in the platform must be tested at its boundaries:

| Boundary | Test Values | Example |
|----------|------------|---------|
| Minimum valid | Smallest accepted value | Password length: 8 characters (valid), 7 characters (invalid) |
| Maximum valid | Largest accepted value | Name length: 100 characters (valid), 101 characters (invalid) |
| Zero | Zero value | Credit balance: 0 (valid edge), -1 (invalid) |
| Empty string | Empty text input | Name: "" (invalid), " " (whitespace-only, invalid) |
| Null | Null value for optional fields | Timezone: null (uses default), avatar: null (uses initials) |
| One off | Value just above/below limit | API keys at limit: create 1 key on Free plan (success), create 2nd (failure) |
| Max integer | Very large numbers | Credit adjustment: MAX_SAFE_INTEGER (rejected, reasonable maximum enforced) |
| Unicode | Multi-byte characters | Name: "Test" (4 chars), name with emoji (character vs byte length) |
| Date boundaries | Month-end dates | Billing anchor on Jan 31, February cycle uses Feb 28/29 |
| Timezone boundaries | UTC-12 to UTC+14 | Usage aggregation around midnight in extreme timezones |

### Error Recovery Testing

| Scenario | What to Verify |
|----------|---------------|
| Database connection lost during request | Request fails gracefully with 503, connection pool reconnects automatically |
| Redis connection lost during request | Fallback behavior (cache miss), session validation fails safely (user logged out) |
| Payment provider timeout | Request fails gracefully, no charge applied, user sees retry option |
| Payment provider returns ambiguous response | Charge treated as failed (safe default), logged for manual review |
| Disk full during file upload | Upload fails gracefully, temporary files cleaned up |
| Memory pressure | Application degrades gracefully (rejects new requests) rather than crashing |
| Concurrent modification | Two users updating the same resource -- last write wins with version check, or conflict error |

### Data Format Edge Cases

| Input Type | Edge Cases to Test |
|-----------|-------------------|
| Email | Uppercase domain, plus-addressing (user+tag@), consecutive dots, 254-character max, IDN domains |
| URL | Very long URLs (2048 chars), URLs with authentication, URLs with fragments, URLs with query parameters containing special characters, punycode domains |
| IP Address | Leading zeros (010.0.0.1), IPv4-mapped IPv6 (::ffff:127.0.0.1), loopback variations |
| Names | Single character, names with apostrophes, hyphens, spaces, accented characters, CJK characters |
| Passwords | Exactly 8 characters, 128 characters (max), passwords with only special characters, passwords with unicode |
| Amounts | 0 credits, 1 credit, maximum pack size, fractional amounts (rejected -- integers only) |
| Dates | Feb 29 in leap year, Feb 29 in non-leap year, Dec 31 to Jan 1 transition, timezone-dependent date boundaries |
| Pagination | Page 0 (invalid), page 1 (first), page exceeding total (returns empty), negative page (invalid), page size 0 (invalid), page size exceeding max (clamped) |
| Search queries | Empty string, single character, SQL injection attempts, XSS attempts, very long strings (500+ chars, truncated) |

---

## 22. Related Documents

| Document | Relevance |
|----------|-----------|
| 00-PLATFORM-OVERVIEW.md | Technology stack and project structure |
| 03-AUTHENTICATION.md | All authentication flows to be tested |
| 04-ROLES-AND-PERMISSIONS.md | Permission model and authorization rules to verify |
| 06-API-KEY-MANAGEMENT.md | API key lifecycle and authentication pipeline |
| 07-JOBS-AND-LOGS.md | Job lifecycle, credit charging rules, retry behavior |
| 08-USAGE-AND-ANALYTICS.md | Usage data aggregation and display |
| 09-BILLING-AND-CREDITS.md | Credit system, subscription lifecycle, proration, payment flow |
| 10-TEAM-MANAGEMENT.md | Future team role testing (post-MVP) |
| 11-SETTINGS-AND-SUPPORT.md | Settings flows, support ticket system |
| 12-ADMIN-DASHBOARD.md | Admin actions and audit logging |
| 14-ADMIN-MODERATION.md | Abuse detection and enforcement testing |
| 15-ADMIN-FINANCE.md | Financial operations and billing administration |
| 18-DATA-MODELS.md | All entity definitions, constraints, and relationships |
| 19-SECURITY-FRAMEWORK.md | Security requirements that security tests verify |
| 20-USER-JOURNEYS.md | Complete user flows that E2E tests validate |
| APPENDICES/C-ERROR-CODES.md | All error codes and their expected contexts |
