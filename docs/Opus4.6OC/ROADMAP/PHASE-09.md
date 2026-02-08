# ScraperX Roadmap -- Phase 9: Settings, Support, and Team Foundations

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-09 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 9 of 12 |
| Prerequisites | Phase 8 (billing and credits complete) |
| Related Documents | 11-SETTINGS-AND-SUPPORT.md, 10-TEAM-MANAGEMENT.md, 03-AUTHENTICATION.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Settings -- Profile Tab](#4-deliverable-1-settings-profile-tab)
5. [Deliverable 2: Settings -- Security Tab](#5-deliverable-2-settings-security-tab)
6. [Deliverable 3: Settings -- Notifications Tab](#6-deliverable-3-settings-notifications-tab)
7. [Deliverable 4: Settings -- Appearance Tab](#7-deliverable-4-settings-appearance-tab)
8. [Deliverable 5: Account Deletion](#8-deliverable-5-account-deletion)
9. [Deliverable 6: Support Ticket System](#9-deliverable-6-support-ticket-system)
10. [Deliverable 7: Team Data Model Preparation](#10-deliverable-7-team-data-model-preparation)
11. [Testing Requirements](#11-testing-requirements)
12. [Risk Assessment](#12-risk-assessment)
13. [Definition of Done](#13-definition-of-done)
14. [Connection to Next Phase](#14-connection-to-next-phase)

---

## 1. Phase Overview

Phase 9 completes the user-facing platform features. It builds the Settings pages (profile management, security controls, notification preferences, appearance customization), the account deletion flow, and the support ticket system. It also prepares the data model for future team/organization features without building the team UI.

After Phase 9, the user side of the platform is feature-complete for MVP. Users can manage every aspect of their account and get help through the support system.

### What Exists Before Phase 9

- Everything from Phases 1-8 (scraping engine + auth + dashboard + billing)
- Settings link in sidebar (not yet functional)
- Support link in sidebar (not yet functional)
- User profile data stored in database (name, email, created in Phase 6)
- MFA configuration (created in Phase 6)
- Session management (created in Phase 6)
- Support ticket and ticket message tables (created in Phase 6 migrations but not yet used)
- Notification table (created in Phase 6 migrations but not yet used)

### What Exists After Phase 9

- Settings page with 4 tabs: Profile, Security, Notifications, Appearance
- Profile editing (name, email change with verification, avatar upload, timezone, date format)
- Security management (password change, MFA enable/disable, active sessions view/revoke)
- Notification preferences (configurable per category)
- Appearance settings (theme, display density)
- Account deletion flow (soft delete with data anonymization)
- Support ticket system (create, list, detail, reply, resolve)
- Knowledge base integration (pre-ticket doc suggestions)
- Notification system (in-app notifications for support, billing, security events)
- Database columns and indexes for future organization/team features

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | Users can update their profile information including email (with verification) |
| G2 | Users can manage their security settings (password, MFA, sessions) |
| G3 | Users can configure notification preferences |
| G4 | Users can switch between light/dark mode and adjust display density |
| G5 | Users can delete their account with full data anonymization |
| G6 | Users can create, view, and reply to support tickets |
| G7 | Database is prepared for future team features without breaking changes |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Profile update saves and reflects across UI | E2E test passes |
| Email change requires verification of new email | Integration test passes |
| Password change invalidates other sessions | Integration test passes |
| MFA can be enabled and disabled from settings | Integration test passes |
| Active sessions list shows current and other sessions | Integration test passes |
| Session revocation immediately invalidates target session | Integration test passes |
| Account deletion anonymizes all personal data | Integration test verifies anonymization |
| Support ticket creation and reply flow works | E2E test passes |
| Notification preferences persist and affect delivery | Integration test passes |
| Theme and density preferences persist across sessions | E2E test passes |
| No regressions in Phase 8 tests | All previous tests pass |

---

## 3. Prerequisites Check

Before starting Phase 9, verify:

| Check | How to Verify |
|-------|--------------|
| Phase 8 Definition of Done met | All 25 criteria from PHASE-08.md Section 13 confirmed |
| Settings link in sidebar navigates to /dashboard/settings | Click link, verify route resolves |
| Support link in sidebar navigates to /dashboard/support | Click link, verify route resolves |
| Support ticket tables exist in database | Run query against support_ticket and ticket_message tables |
| Notification table exists in database | Run query against notification table |
| Email service sends correctly | Verify via Phase 6/8 email functionality |
| Git branch created | Create phase-09/settings-support branch from main |

---

## 4. Deliverable 1: Settings -- Profile Tab

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Sections 2-4

### Task 4.1: Settings Page Layout

| Component | Details |
|-----------|---------|
| Route | /dashboard/settings |
| Default tab | Profile |
| Tab navigation | Profile, Security, Notifications, Appearance -- horizontal tabs on desktop, dropdown on mobile (<768px) |
| Tab persistence | Active tab reflected in URL query parameter (?tab=security) |
| Layout | Tabs at top, tab content below, single column max width 720px |

### Task 4.2: Profile Form

| Field | Type | Validation | Behavior |
|-------|------|-----------|----------|
| Display Name | Text input | Required, 1-100 characters | Inline edit, save button appears when changed |
| Email | Text (read-only display) | -- | Shows current email with "Change" button |
| Avatar | Image upload | JPG/PNG, max 2MB, min 100x100px | Click to upload, crop tool, preview before save |
| Timezone | Dropdown | Valid timezone from IANA list | Affects date display across dashboard |
| Date Format | Dropdown | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD | Affects date display across dashboard |

Save behavior: Individual field saves (not a single form submit). Success toast on save, error toast on failure. Unsaved changes warning on navigation.

### Task 4.3: Email Change Flow

| Step | Action |
|------|--------|
| 1 | User clicks "Change" next to current email |
| 2 | Modal opens: new email input + current password input |
| 3 | Submit: validate password, check new email is not already registered |
| 4 | Send verification email to NEW email address |
| 5 | Show notice on profile: "Verification email sent to {newEmail}. Your email will not change until you verify." |
| 6 | User clicks verification link in email |
| 7 | Backend: update user email, send notification to OLD email ("Your email was changed to {newEmail}") |
| 8 | Profile page reflects new email |

If user does not verify within 24 hours, the change request expires silently.

### Task 4.4: Avatar Upload

| Component | Details |
|-----------|---------|
| Upload trigger | Click current avatar or initials placeholder |
| File selection | Native file picker, accept JPG and PNG only |
| Size limit | 2MB maximum, client-side check before upload |
| Crop tool | Square crop area, user can resize and reposition, preview of final result |
| Storage size | Crop to 256x256 pixels before upload |
| Storage | Object storage or local filesystem (configurable via environment variable) |
| Fallback | If no avatar, display user initials on colored background |
| Endpoint | POST /api/auth/avatar (multipart form data) |

### Task 4.5: Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/auth/profile | GET | Get current user profile |
| /api/auth/profile | PATCH | Update name, timezone, date format |
| /api/auth/email/change | POST | Initiate email change (requires password) |
| /api/auth/email/verify-change | POST | Verify new email with token |
| /api/auth/avatar | POST | Upload avatar image |
| /api/auth/avatar | DELETE | Remove avatar (revert to initials) |

---

## 5. Deliverable 2: Settings -- Security Tab

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Sections 5-7, 03-AUTHENTICATION.md

### Task 5.1: Password Change Section

| Element | Details |
|---------|---------|
| Fields | Current password, New password, Confirm new password |
| Strength indicator | Visual indicator showing strength levels 1-5 (same as registration) |
| Validation | Current password required, new password minimum 8 chars with strength check, confirmation must match |
| Submit | POST /api/auth/password/change |
| Side effect | All other sessions invalidated on successful change |
| Feedback | Success toast "Password changed. Other sessions have been signed out." |

### Task 5.2: MFA Section

Display depends on current MFA state:

| State | Display |
|-------|---------|
| MFA disabled | "Two-factor authentication is not enabled" with "Enable MFA" button |
| MFA enabled | "Two-factor authentication is enabled", backup codes remaining count, "Regenerate Backup Codes" button, "Disable MFA" button |

Enable MFA flow (from settings):
1. Click "Enable MFA"
2. Modal: QR code displayed with TOTP secret, manual entry option
3. User enters 6-digit verification code from authenticator app
4. On success: MFA enabled, 10 backup codes displayed (show-once, copy all button)
5. Confirmation checkbox: "I have saved my backup codes"

Regenerate backup codes flow:
1. Click "Regenerate Backup Codes"
2. Confirmation modal: "This will invalidate all existing backup codes"
3. On confirm: new 10 codes displayed (show-once), old codes invalidated

Disable MFA flow:
1. Click "Disable MFA"
2. Modal: password confirmation required
3. On confirm: MFA configuration removed, audit log entry created

### Task 5.3: Active Sessions Section

| Element | Details |
|---------|---------|
| List | All active sessions for the current user |
| Per session | Browser name and version, operating system, IP address, approximate location (city/country from IP), last active (relative time), "Current session" badge on the active one |
| Actions | "Revoke" button on each session (except current), "Revoke All Other Sessions" button |
| Revoke behavior | Immediately deletes session from Redis, user on that session will be logged out on next request |
| Endpoint | GET /api/auth/sessions (list), DELETE /api/auth/sessions/:id (revoke one), POST /api/auth/sessions/revoke-others (revoke all others) |

---

## 6. Deliverable 3: Settings -- Notifications Tab

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Section 8

### Task 6.1: Notification Preferences

| Category | Options | Default | Can Disable |
|----------|---------|---------|-------------|
| Security alerts | Email on new login, password change, MFA change | On | No (always on) |
| Billing | Payment receipts, failed payment alerts, subscription changes | On | No (always on) |
| Credit alerts | Email when credits reach 75%, 90%, 100% | On | Yes |
| Job failure alerts | Email on job failure (batched, max 1 per hour) | On | Yes |
| Product updates | New features, platform news | Off | Yes |
| Tips and guides | Onboarding tips, usage recommendations | On | Yes |

### Task 6.2: Notification Preferences UI

| Element | Details |
|---------|---------|
| Layout | List of categories, each with toggle switch and description |
| Non-disableable | Security and Billing toggles shown as always-on (toggle present but disabled with tooltip "Required for account security") |
| Save | Changes save immediately on toggle (no save button), toast confirmation |
| Endpoint | GET /api/auth/notifications/preferences, PATCH /api/auth/notifications/preferences |

### Task 6.3: In-App Notification System

Build the notification delivery and display system.

| Component | Details |
|-----------|---------|
| Storage | notification table with recipient account_id, type, title, message, read status, created_at |
| Bell icon | In top bar, shows unread count badge |
| Dropdown | Click bell to show recent notifications (last 10), "Mark all as read", "View all" link |
| Notification page | /dashboard/notifications -- full list with pagination, mark individual as read, filter by type |
| Delivery | Notifications created server-side on relevant events (support reply, billing event, security event) |
| Polling | Check for new notifications every 30 seconds |
| Endpoints | GET /api/notifications (paginated), PATCH /api/notifications/:id/read, POST /api/notifications/read-all |

---

## 7. Deliverable 4: Settings -- Appearance Tab

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Section 9

### Task 7.1: Theme Selection

| Element | Details |
|---------|---------|
| Options | Light, Dark, System (follows OS preference) |
| UI | Three option cards (icon + label), selected state with border |
| Persistence | Stored in localStorage and user preferences (API) |
| Application | Immediate visual change, no page reload |
| CSS | Theme applied via class on root element, all colors via CSS custom properties |

### Task 7.2: Display Density

| Element | Details |
|---------|---------|
| Options | Comfortable (default spacing), Compact (reduced padding and margins) |
| UI | Two option cards with visual preview |
| Persistence | Stored in localStorage and user preferences (API) |
| Application | Immediate layout adjustment, affects padding/margins/font sizes globally |
| Implementation | CSS class on root element that overrides spacing variables |

### Task 7.3: Language (Placeholder)

| Element | Details |
|---------|---------|
| Display | "Language: English" with note "Additional languages coming soon" |
| No dropdown | Single option for MVP |

---

## 8. Deliverable 5: Account Deletion

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Section 10

### Task 8.1: Danger Zone Section

Located at bottom of Profile tab, visually separated.

| Element | Details |
|---------|---------|
| Section header | "Danger Zone" with red border |
| Content | "Permanently delete your account and all associated data" |
| Button | "Delete Account" (danger style, red) |

### Task 8.2: Deletion Flow

| Step | UI/Action |
|------|-----------|
| 1 | Click "Delete Account" |
| 2 | First modal: list of data that will be deleted (API keys, jobs, billing data, support tickets, profile data), warning that this cannot be undone |
| 3 | "Continue" button |
| 4 | Second modal: type "DELETE" to confirm + enter current password |
| 5 | Submit: validate password, begin deletion process |
| 6 | On success: clear session, redirect to landing page with toast "Account deleted" |

### Task 8.3: Deletion Backend Process

| Step | Action |
|------|--------|
| 1 | Cancel active subscription (if any) via payment provider |
| 2 | Revoke all API keys (set status to revoked) |
| 3 | Clear all sessions from Redis |
| 4 | Soft-delete account record (set deleted_at) |
| 5 | Anonymize user record: replace name with "Deleted User", email with "deleted_{uuid}@deleted.local", clear avatar, set deleted_at |
| 6 | Remove OAuth connections |
| 7 | Remove MFA configuration |
| 8 | Delete notification preferences |
| 9 | Keep job records (anonymized -- linked to soft-deleted account) for data retention compliance |
| 10 | Keep invoices and billing records for financial record-keeping (linked to soft-deleted account) |
| 11 | Keep audit log entries (immutable) |
| 12 | Create audit log entry for account deletion |

Data retention after deletion:

| Data Type | Retention | Reason |
|-----------|----------|--------|
| Job metadata | 90 days | Operational records |
| Invoices | 7 years | Financial compliance |
| Audit log entries | 2 years | Security audit trail |
| Credit ledger entries | 7 years | Financial compliance |
| Support tickets | 90 days | Reference for related issues |

### Task 8.4: Backend Endpoint

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| /api/auth/account | DELETE | password (in request body) | 200 on success, 401 on wrong password |

---

## 9. Deliverable 6: Support Ticket System

**Reference Document:** 11-SETTINGS-AND-SUPPORT.md Sections 11-16

### Task 9.1: Support Page Layout

| Element | Details |
|---------|---------|
| Route | /dashboard/support |
| Page title | "Support" |
| Layout | Ticket list with "New Ticket" button at top |

### Task 9.2: Create Ticket Flow

| Step | UI |
|------|-----|
| 1 | Click "New Ticket" button |
| 2 | Form page (/dashboard/support/new) with fields below |
| 3 | As user types Subject, show knowledge base suggestions (matching docs articles) |
| 4 | User can click a suggestion to read the doc (may resolve their issue) |
| 5 | If still needs help, complete and submit form |
| 6 | Redirect to ticket detail page |

Form fields:

| Field | Type | Validation |
|-------|------|-----------|
| Category | Dropdown: Billing, Technical, Account, Feature Request, Bug Report, General | Required |
| Subject | Text input | Required, 5-200 characters |
| Priority | Dropdown: Low, Normal, High | Required, default Normal |
| Description | Textarea with markdown support | Required, 20-5000 characters |
| Attachments | File upload, max 3 files, max 5MB each, images and PDFs only | Optional |
| Related Job ID | Text input (UUID format) | Optional, validated against user's jobs |

Rate limits: 5 tickets per hour, 10 tickets per day.

### Task 9.3: Ticket List Page

| Element | Details |
|---------|---------|
| Display | Card-based list (not table) |
| Per card | Subject, category badge, status badge, priority indicator, created date, last reply date, unread indicator |
| Status badges | Open (blue), In Progress (yellow), Waiting on User (orange), Waiting on Response (blue), Resolved (green), Closed (grey) |
| Filters | Status dropdown, Category dropdown |
| Sorting | Most recent activity first |
| Pagination | 10 per page |
| Empty state | "No support tickets. Need help? Create a ticket." with "New Ticket" button |
| Unread indicator | Dot on tickets with unread admin replies |

### Task 9.4: Ticket Detail Page

| Element | Details |
|---------|---------|
| Route | /dashboard/support/:id |
| Header | Subject, status badge, category badge, priority, created date |
| Thread | Chronological message list, each message shows: author name, avatar, timestamp, message content (rendered markdown), attachments |
| Visual distinction | User messages on one side/color, admin responses on different side/color |
| Reply form | Textarea with markdown support, attachment upload, "Send Reply" button |
| Resolve button | "Mark as Resolved" button (changes status to resolved) |
| Auto-close notice | If status is "Resolved", show notice: "This ticket will be automatically closed in 7 days" |
| Real-time | Poll for new messages every 10 seconds when page is open |

### Task 9.5: Knowledge Base Integration

| Component | Details |
|-----------|---------|
| Trigger | User types in Subject field on ticket creation |
| Behavior | After 3+ characters and 500ms debounce, search docs titles and descriptions |
| Display | Below subject field: "These articles might help:" with 3-5 matching doc links |
| Click | Opens doc in new tab |
| No results | Section hidden if no matches |

### Task 9.6: Support Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/support/tickets | GET | List tickets for authenticated account (paginated, filtered) |
| /api/support/tickets | POST | Create ticket with first message |
| /api/support/tickets/:id | GET | Get ticket with messages |
| /api/support/tickets/:id/messages | POST | Add reply message to ticket |
| /api/support/tickets/:id/resolve | POST | Mark ticket as resolved |
| /api/support/docs/search | GET | Search docs for knowledge base suggestions |

### Task 9.7: Support Notifications

| Event | Notification |
|-------|-------------|
| Admin replies to ticket | In-app notification + email to user |
| Ticket status changed by admin | In-app notification |
| Ticket auto-close warning (day 7 of resolved) | Email to user |
| Ticket auto-closed (day 14 of waiting on user, or day 7 of resolved) | In-app notification + email |

### Task 9.8: Auto-Close Scheduled Task

Build a daily scheduled task that:
1. Closes tickets in "Resolved" status for 7+ days
2. Sends reminder email for tickets in "Waiting on User" status for 7 days
3. Closes tickets in "Waiting on User" status for 14+ days
4. Creates system messages on closed tickets explaining the reason

---

## 10. Deliverable 7: Team Data Model Preparation

**Reference Document:** 10-TEAM-MANAGEMENT.md Section 3

This deliverable does NOT build any team/organization UI. It prepares the database and data model so that adding teams in a future phase does not require breaking changes.

### Task 10.1: Schema Preparation

Verify that the following columns and patterns established in Phase 6 migrations support future team features:

| Preparation | Details |
|-------------|---------|
| account_id on all resource tables | All resources (API keys, jobs, subscriptions, etc.) are associated with account, not user. This allows multiple users to share an account via organizations. |
| user.role field uses string enum | Role field can be extended with new values (owner, org_admin, member, viewer, billing) without migration |
| Session includes account_id | Session stores both user_id and account_id, allowing context switching when multi-org is built |

### Task 10.2: Future Migration Readiness

Document (in code comments) which tables will need new columns or relationships when teams are built:

| Table | Future Addition |
|-------|----------------|
| account | Add type field (individual/organization), organization_name, organization_slug |
| user | No changes needed (users can belong to multiple accounts via junction table) |
| New table: organization_member | user_id, account_id (org), role, invited_by, joined_at |
| New table: organization_invitation | account_id, email, role, invited_by, token, expires_at, status |

No code is written for these future tables. This task only verifies that the current schema is forward-compatible and documents the planned changes.

---

## 11. Testing Requirements

**Reference Document:** 21-TESTING-STRATEGY.md

### Unit Tests

| Module | Estimated Tests |
|--------|----------------|
| Profile validation (name, timezone, date format) | 8-10 |
| Email change token logic | 6-8 |
| Avatar processing (resize, crop, format) | 6-8 |
| Password change validation | 5-7 |
| Notification preference logic | 5-7 |
| Ticket validation (category, priority, rate limit) | 8-10 |
| Knowledge base search matching | 5-7 |
| Auto-close date calculations | 5-7 |
| Account deletion/anonymization logic | 8-10 |

### Integration Tests

| Flow | Estimated Tests |
|------|----------------|
| Profile update (name, timezone, date format) | 5 |
| Email change (initiate, verify, expired token, already used) | 6 |
| Avatar upload (success, too large, wrong format, delete) | 5 |
| Password change (success, wrong current, weak new, session invalidation) | 5 |
| MFA enable from settings (full flow) | 3 |
| MFA disable from settings | 2 |
| Backup code regeneration | 2 |
| Session listing and revocation | 5 |
| Notification preference CRUD | 4 |
| Theme and density preference persistence | 3 |
| Account deletion (full flow with all cascade steps) | 5 |
| Ticket creation (success, rate limit, validation) | 5 |
| Ticket reply | 3 |
| Ticket resolve and auto-close | 4 |
| Knowledge base search | 3 |
| Notification creation and delivery | 5 |

### E2E Tests

| Flow | Count |
|------|-------|
| Update profile name | 1 |
| Change password and verify other session logged out | 1 |
| Enable MFA from settings | 1 |
| View and revoke a session | 1 |
| Create support ticket | 1 |
| Reply to support ticket | 1 |
| Toggle dark mode from settings | 1 |
| Delete account | 1 |

### Security Tests

| Test | Count |
|------|-------|
| Email change requires correct password | 1 |
| Password change requires correct current password | 1 |
| Account deletion requires correct password | 1 |
| Cannot access another user's tickets | 2 |
| Cannot reply to another user's ticket | 1 |
| Avatar upload rejects non-image files | 1 |
| Avatar upload rejects oversized files | 1 |
| Ticket rate limiting enforced | 2 |

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Email change flow complexity (two-email verification) | Medium | Medium | Follow exact flow from 11-SETTINGS-AND-SUPPORT.md, comprehensive integration tests |
| Avatar storage configuration | Low | Low | Abstract storage behind interface, support local filesystem and object storage |
| Account deletion data retention compliance | Medium | High | Follow retention table exactly, audit log immutability, financial records preserved |
| Support ticket spam | Medium | Medium | Rate limiting (5/hr, 10/day), future: CAPTCHA on ticket creation |
| Knowledge base search relevance | Low | Low | Simple text matching for MVP, can improve with full-text search later |
| Notification polling performance | Low | Medium | 30-second interval, pause when tab not visible, lightweight endpoint |

---

## 13. Definition of Done

Phase 9 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | Settings page renders with 4 tabs (Profile, Security, Notifications, Appearance) |
| 2 | Profile edit works (name, timezone, date format save correctly) |
| 3 | Email change flow works end-to-end (initiate, verify, update, notify old email) |
| 4 | Avatar upload works with crop tool, displays in top bar user menu |
| 5 | Password change works and invalidates other sessions |
| 6 | MFA can be enabled and disabled from Security tab |
| 7 | Backup codes can be regenerated |
| 8 | Active sessions list displays correctly with revoke functionality |
| 9 | Notification preferences save and affect email delivery |
| 10 | Theme selection (light/dark/system) works and persists |
| 11 | Display density selection works and persists |
| 12 | Account deletion flow completes with full data anonymization |
| 13 | Deleted account data retention follows documented retention periods |
| 14 | Support ticket creation works with all fields and rate limiting |
| 15 | Support ticket list displays with filters and pagination |
| 16 | Support ticket detail shows message thread and reply functionality |
| 17 | Knowledge base suggestions appear during ticket creation |
| 18 | Ticket auto-close scheduled task works for resolved and stale tickets |
| 19 | In-app notification system works (bell icon, badge, dropdown, notification page) |
| 20 | Support-related notifications trigger correctly |
| 21 | All security tests pass (password verification, access control, rate limiting) |
| 22 | Settings page responsive at all breakpoints |
| 23 | No regressions in Phase 8 tests |

---

## 14. Connection to Next Phase

Phase 9 completes the user-facing features. Phase 10 builds the admin dashboard:

- **Phase 10 (Admin Dashboard)** builds all admin-only pages for platform management: user management, support ticket management, abuse detection, content management, and operations monitoring
- Phase 10 depends on Phase 9's support ticket system (admin needs to view and respond to tickets)
- Phase 10 depends on Phase 9's notification system (admin actions trigger user notifications)
- The audit log viewer in Phase 10 will display entries created by Phase 6-9 features
- Admin user management actions (suspend, credit adjustment, plan change) interact with systems built in Phases 6-8

**Read before starting Phase 10:** 12-ADMIN-DASHBOARD.md, 13-ADMIN-ORGANIZATIONS.md (future, but understand the plan), 14-ADMIN-MODERATION.md, 15-ADMIN-FINANCE.md, 16-ADMIN-OPERATIONS.md
