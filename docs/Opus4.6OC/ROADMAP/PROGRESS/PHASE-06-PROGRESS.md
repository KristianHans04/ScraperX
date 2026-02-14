# Phase 6 Progress: Database Schema Migration (organizationId → accountId)

**Status:** ✅ COMPLETED  
**Date Completed:** 2026-02-10

## Summary

Phase 6 focused on migrating the database schema from the legacy "Organization" model to the new "Account" model, preparing the foundation for the full authentication system in the next iteration.

## What Was Completed

### 1. Database Migrations Created (7 files)
- `002_rename_organizations_to_account.sql` - Renamed table, added Phase 6 fields
- `003_update_users_table.sql` - Added auth fields, changed role enum
- `004_create_oauth_connection_table.sql` - OAuth (Google/GitHub) storage
- `005_create_email_verification_token_table.sql` - Email verification tokens
- `006_create_password_reset_token_table.sql` - Password reset tokens  
- `007_create_mfa_configuration_table.sql` - TOTP MFA configuration

**Location:** `/src/db/migrations/`

### 2. Type Definitions Updated
- Added `Account`, `User`, `PlanType`, `AccountStatus`, `UserRoleType` interfaces
- Updated `ScrapeJob`, `JobResult`, `ApiKey` to use `accountId` instead of `organizationId`
- Kept legacy `Organization` interface for backward compatibility

**Location:** `/src/types/index.ts`

### 3. Repository Layer Created (6 new files)
- `account.repository.ts` - Account CRUD, credit management
- `user.repository.ts` - User lifecycle, auth lockout
- `session.repository.ts` - Redis-based sessions (7-day/30-day TTL)
- `oauthConnection.repository.ts` - OAuth provider connections
- `token.repository.ts` - Email/password reset token management
- `mfaConfiguration.repository.ts` - TOTP MFA configuration

**Location:** `/src/db/repositories/`

### 4. Updated Existing Repositories (3 files)
- `apiKey.repository.ts` - Changed all `organizationId` → `accountId`
- `scrapeJob.repository.ts` - Changed all `organizationId` → `accountId`
- `jobResult.repository.ts` - Changed all `organizationId` → `accountId`

### 5. Worker Files Updated (3 files)
- `http.worker.ts` - Uses `accountId` and `accountRepository`
- `browser.worker.ts` - Uses `accountId` and `accountRepository`
- `stealth.worker.ts` - Uses `accountId` and `accountRepository`

**Location:** `/src/workers/`

### 6. API Routes Updated
- `/src/api/routes/scrape.routes.ts` - All endpoints use `account` instead of `organization`
- Added plan-based batch size limits: free=10, pro=100, enterprise=1000

### 7. Middleware Updated (2 files)
- `/src/api/middleware/auth.ts` - Uses `accountRepository`, validates account status
- `/src/api/middleware/rateLimit.ts` - Uses account-based rate limiting

### 8. Test Fixtures Updated
- Added `mockAccount`, `mockProAccount`, `mockEnterpriseAccount`
- Updated `mockApiKey`, `mockScrapeJob`, `mockJobResult` to use `accountId`

**Location:** `/tests/fixtures/index.ts`

## What Needs To Be Done

### Remaining Phase 6 Tasks (Authentication System)
The migration is complete, but the full Phase 6 authentication system still needs:

1. **Auth API Endpoints** (not yet built)
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me
   - POST /api/auth/verify-email
   - POST /api/auth/forgot-password
   - POST /api/auth/reset-password
   - OAuth flows for Google/GitHub
   - MFA setup/verification endpoints

2. **Email Service** (not yet built)
   - Email templates (verification, password reset, welcome)
   - Email queue integration
   - Provider configuration (SMTP/SendGrid/SES)

3. **Session Management** (partially complete)
   - Session repository exists
   - Need session middleware integration
   - Need CSRF token generation/validation

4. **Database Migrations** (not yet run)
   - Migrations created but not executed
   - Need to run: `npm run db:migrate`
   - Need to seed test data: `npm run db:seed`

5. **Tests** (partially updated)
   - Most test files updated for new account model
   - Some integration tests still failing
   - Need full test suite to pass

## Files Modified

### Created
- `/src/db/migrations/002-007_*.sql` (6 files)
- `/src/db/repositories/account.repository.ts`
- `/src/db/repositories/user.repository.ts`
- `/src/db/repositories/session.repository.ts`
- `/src/db/repositories/oauthConnection.repository.ts`
- `/src/db/repositories/token.repository.ts`
- `/src/db/repositories/mfaConfiguration.repository.ts`

### Modified
- `/src/types/index.ts`
- `/src/db/repositories/apiKey.repository.ts`
- `/src/db/repositories/scrapeJob.repository.ts`
- `/src/db/repositories/jobResult.repository.ts`
- `/src/workers/http.worker.ts`
- `/src/workers/browser.worker.ts`
- `/src/workers/stealth.worker.ts`
- `/src/api/routes/scrape.routes.ts`
- `/src/api/middleware/auth.ts`
- `/src/api/middleware/rateLimit.ts`
- `/tests/fixtures/index.ts`
- Multiple test files (auth.test.ts, rateLimit.test.ts, scrape.test.ts)

## Notes

1. **Backward Compatibility:** Kept `organizationRepository` export for any external systems
2. **Account Model:** Simplified for Phase 6 (no rate limits stored in DB, they come from plan type)
3. **Session Storage:** Redis-based, not PostgreSQL
4. **Testing Strategy:** Core migration complete, but some tests need fixing before full Phase 6 completion

## Next Steps

Before starting Phase 7, complete:
1. Run database migrations
2. Build auth API endpoints  
3. Implement email service
4. Fix remaining failing tests
5. Verify all 21 Phase 6 Definition of Done criteria
