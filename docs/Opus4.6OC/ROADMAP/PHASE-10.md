# ScraperX Roadmap -- Phase 10: Admin Dashboard (All Pages)

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-10 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 10 of 12 |
| Prerequisites | Phase 9 (settings, support, team foundations complete) |
| Related Documents | 12-ADMIN-DASHBOARD.md, 14-ADMIN-MODERATION.md, 15-ADMIN-FINANCE.md, 16-ADMIN-OPERATIONS.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Admin Layout and Navigation](#4-deliverable-1-admin-layout-and-navigation)
5. [Deliverable 2: Admin Overview Page](#5-deliverable-2-admin-overview-page)
6. [Deliverable 3: User Management](#6-deliverable-3-user-management)
7. [Deliverable 4: Support Ticket Administration](#7-deliverable-4-support-ticket-administration)
8. [Deliverable 5: Abuse Detection and Moderation](#8-deliverable-5-abuse-detection-and-moderation)
9. [Deliverable 6: Financial Administration](#9-deliverable-6-financial-administration)
10. [Deliverable 7: Operations Monitoring](#10-deliverable-7-operations-monitoring)
11. [Deliverable 8: Content Management](#11-deliverable-8-content-management)
12. [Deliverable 9: Audit Log Viewer](#12-deliverable-9-audit-log-viewer)
13. [Testing Requirements](#13-testing-requirements)
14. [Risk Assessment](#14-risk-assessment)
15. [Definition of Done](#15-definition-of-done)
16. [Connection to Next Phase](#16-connection-to-next-phase)

---

## 1. Phase Overview

Phase 10 builds the entire admin dashboard. This is the internal management interface used by platform administrators to manage users, handle support tickets, monitor finances, detect abuse, manage content, view operations metrics, and audit all platform activity.

The admin dashboard is a separate zone within the SPA (route prefix /admin/) with its own layout, navigation, and visual identity. It reuses the component library from Phase 7 but adds admin-specific components.

### What Exists Before Phase 10

- Everything from Phases 1-9 (full user-facing platform)
- Admin role and requireAdmin middleware (Phase 6)
- Audit log table with entries from user actions (Phase 6+)
- Support ticket system with user-created tickets (Phase 9)
- Billing data and subscriptions (Phase 8)
- User accounts and sessions (Phase 6)

### What Exists After Phase 10

- Admin layout with distinct visual identity
- Admin overview dashboard with platform metrics
- User management (list, detail, suspend, restrict, credit adjust, plan change, promote, demote, delete)
- Support ticket administration (queue, assignment, internal notes, reply, merge, status management)
- Abuse detection and moderation (flagged accounts, investigation, enforcement actions)
- Financial administration (revenue dashboard, subscription management, invoice browser, credit operations, payment failure management, refund processing)
- Operations monitoring (system health, job queues, engine performance, proxy management, rate limits, configuration, maintenance)
- Content management (blog posts, status page)
- Audit log viewer with filters and export
- Admin search (global Cmd+K across users, tickets, jobs, invoices)

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | Admins can view and manage all user accounts |
| G2 | Admins can handle support tickets with internal notes and assignment |
| G3 | Admins can detect and act on platform abuse |
| G4 | Admins can view financial data and manage billing operations |
| G5 | Admins can monitor platform operations and system health |
| G6 | Admins can manage blog content and platform status |
| G7 | All admin actions are logged to an immutable audit trail |
| G8 | Admins cannot perform dangerous actions on themselves (self-protection) |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Admin can log in and see admin overview | E2E test passes |
| Non-admin cannot access admin pages | Route protection test passes |
| User suspension works and clears sessions | Integration test passes |
| Credit adjustment updates balance atomically | Integration test passes |
| Support ticket reply reaches user | Integration test passes |
| Audit log records all admin actions | Integration test passes |
| Admin self-protection rules enforced | Security test passes |
| Admin overview metrics are accurate | Integration test verifies calculations |
| All admin endpoints return correct data | Integration tests pass |
| No regressions in Phase 9 tests | All previous tests pass |

---

## 3. Prerequisites Check

Before starting Phase 10, verify:

| Check | How to Verify |
|-------|--------------|
| Phase 9 Definition of Done met | All 23 criteria from PHASE-09.md Section 13 confirmed |
| Admin user exists in database | Verify via seed script or manual promotion |
| Admin can log in and is recognized as admin | Login as admin, verify role in session |
| requireAdmin middleware blocks non-admin | Attempt admin endpoint as regular user, verify 403 |
| Support tickets exist for admin to manage | Create test tickets as regular user |
| Audit log entries exist | Verify entries from Phase 6-9 actions |
| Git branch created | Create phase-10/admin-dashboard branch from main |

---

## 4. Deliverable 1: Admin Layout and Navigation

**Reference Document:** 12-ADMIN-DASHBOARD.md Section 2

### Task 4.1: Admin Layout Shell

| Element | Details |
|---------|---------|
| Visual distinction | Admin layout uses a distinct accent color (not the user dashboard primary color) and an "Admin" badge in the top bar to clearly indicate admin context |
| Top bar | ScraperX logo with "Admin" badge, global search trigger (Cmd+K), user menu with "Switch to User Dashboard" link |
| Sidebar | Admin navigation grouped by function (see below) |
| Content area | Same structure as user dashboard (max width 1200px, padding, breadcrumbs) |

### Task 4.2: Admin Sidebar Navigation

| Group | Items |
|-------|-------|
| Dashboard | Overview |
| Users | All Users |
| Support | Tickets, Abuse Flags |
| Finance | Revenue, Subscriptions, Invoices, Credit Ops, Refunds |
| Operations | System Health, Job Queues, Engines, Proxies, Rate Limits, Configuration, Maintenance |
| Content | Blog Posts, Status Page |
| Audit | Audit Log |

Each item has a monochrome icon, active state highlighting, and badge for items needing attention (unread tickets, active abuse flags, critical alerts).

### Task 4.3: Admin Search (Cmd+K)

| Element | Details |
|---------|---------|
| Trigger | Cmd+K / Ctrl+K in admin context |
| Search targets | Users (by email, name), Tickets (by subject, ID), Jobs (by ID, URL), Invoices (by number) |
| Results | Grouped by type, 5 per group, linked to detail pages |
| Implementation | Dedicated admin search endpoint that queries across multiple tables |
| Endpoint | GET /api/admin/search?q={query} |

---

## 5. Deliverable 2: Admin Overview Page

**Reference Document:** 12-ADMIN-DASHBOARD.md Section 3

### Task 5.1: Overview Stat Cards (3 cards)

| Card | Label | Value | Subtext |
|------|-------|-------|---------|
| Card 1 | Total Users | Count of active (non-deleted) accounts | New this week |
| Card 2 | Active Jobs | Count of currently queued + processing jobs | Completed today |
| Card 3 | Revenue MTD | Month-to-date revenue in USD | Comparison to previous month same day |

### Task 5.2: Registrations Chart

| Element | Details |
|---------|---------|
| Chart type | Bar chart |
| Data | Daily new user registrations for past 30 days |
| Tooltip | Date and count |

### Task 5.3: Revenue Chart

| Element | Details |
|---------|---------|
| Chart type | Line chart with two lines |
| Lines | Subscription revenue, Credit pack revenue |
| Data | Daily revenue for past 30 days |
| Tooltip | Date, subscription amount, pack amount, total |

### Task 5.4: Recent Activity Feed

| Element | Details |
|---------|---------|
| Content | Last 20 platform events in reverse chronological order |
| Event types | User registered, User upgraded, User cancelled, Payment failed, Ticket created, Abuse flag raised, Job queue spike, System alert |
| Per entry | Event icon, description, timestamp (relative), link to relevant detail page |
| Auto-refresh | Poll every 30 seconds |

### Task 5.5: Alerts Section

| Element | Details |
|---------|---------|
| Content | Active alerts requiring admin attention |
| Alert types | Unassigned urgent tickets, Payment failure spike, System health degraded, High abuse flag count, Revenue anomaly |
| Per alert | Severity icon (warning/critical), description, action link |
| Dismissible | Non-critical alerts can be dismissed |

### Task 5.6: Admin Overview Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/admin/overview/stats | GET | totalUsers, newUsersThisWeek, activeJobs, completedToday, revenueMTD, revenuePreviousMTD |
| /api/admin/overview/registrations | GET | Array of {date, count} for past 30 days |
| /api/admin/overview/revenue | GET | Array of {date, subscriptionRevenue, packRevenue} for past 30 days |
| /api/admin/overview/activity | GET | Array of recent activity events (last 20) |
| /api/admin/overview/alerts | GET | Array of active alerts |

---

## 6. Deliverable 3: User Management

**Reference Document:** 12-ADMIN-DASHBOARD.md Sections 4-9

### Task 6.1: User List Page

| Element | Details |
|---------|---------|
| Route | /admin/users |
| Table columns | Name, Email, Plan (badge), Status (Active/Suspended/Restricted badge), Role (User/Admin badge), MFA (enabled/disabled icon), Registered (date) |
| Filters | Plan dropdown (All, Free, Pro, Enterprise), Status dropdown (All, Active, Suspended, Restricted), Role dropdown (All, User, Admin), MFA dropdown (All, Enabled, Disabled) |
| Search | Text search across name and email, 300ms debounce |
| Pagination | 25 per page |
| Export | CSV export of filtered results (up to 50,000 rows) |
| Click row | Navigate to user detail page |

### Task 6.2: User Detail Page

| Element | Details |
|---------|---------|
| Route | /admin/users/:id |
| Header | User name, email, status badge, role badge, registered date, last login date |
| 3 tabs | Account, Jobs, Billing |

Account tab:
| Section | Content |
|---------|---------|
| Profile | Name, email, avatar, timezone, date format, email verified status |
| Security | MFA status, active session count, account lockout status |
| API Keys | List of user's API keys (name, type, status, created, last used) |
| Notification preferences | Current preference settings |

Jobs tab:
| Content | Full job history for this user (same table as user's Jobs page but admin can see all fields) |

Billing tab:
| Section | Content |
|---------|---------|
| Current plan | Plan name, billing interval, next billing date, credit balance |
| Payment method | Card details (last 4) or "None" |
| Invoices | Invoice history table |
| Credit ledger | Recent credit transactions |

### Task 6.3: Admin Actions on Users

Each action opens a confirmation modal, requires a reason (for audit), and creates an audit log entry.

| Action | Availability | Modal Content | Backend Effect |
|--------|-------------|---------------|----------------|
| Suspend | Active users only | Reason textarea, duration (indefinite, 24h, 7d, 30d), notify user checkbox | Set status to suspended, invalidate all sessions, disable all API keys, send notification |
| Unsuspend | Suspended users only | Confirmation | Restore active status, re-enable API keys, send notification |
| Restrict | Active users only | Reason textarea | Set status to restricted (read-only API), send notification |
| Unrestrict | Restricted users only | Confirmation | Restore active status, send notification |
| Force Password Reset | Any user | Confirmation | Invalidate all sessions, set flag requiring password reset on next login, send reset email |
| Force Logout | Any user | Confirmation | Delete all sessions from Redis |
| Disable MFA | Users with MFA enabled | Confirmation | Remove MFA configuration, send notification to user |
| Change Plan | Any user | Plan dropdown, apply immediately checkbox | Update subscription, adjust credits, send notification |
| Adjust Credits | Any user | Direction (add/subtract) toggle, amount input, reason dropdown + notes, balance preview | Atomic balance update, ledger entry, audit log |
| Promote to Admin | User role only | Password confirmation from acting admin | Change role to admin |
| Demote to User | Admin role only (not self) | Password confirmation from acting admin | Change role to user |
| Delete Account | Any user (not self) | Type user email to confirm | Full account deletion per Phase 9 deletion process |

### Task 6.4: Admin Self-Protection

| Rule | Enforcement |
|------|-------------|
| Cannot suspend self | API returns 403 "Cannot perform this action on your own account" |
| Cannot demote self | API returns 403 |
| Cannot delete self | API returns 403 |
| Cannot disable own MFA via admin panel | API returns 403 (must use personal settings) |
| Cannot force logout self | API returns 403 |

### Task 6.5: User Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/users | GET | Paginated, filtered user list |
| /api/admin/users/:id | GET | User detail with account, jobs, billing data |
| /api/admin/users/:id/suspend | POST | Suspend user (reason, duration in body) |
| /api/admin/users/:id/unsuspend | POST | Unsuspend user |
| /api/admin/users/:id/restrict | POST | Restrict user (reason in body) |
| /api/admin/users/:id/unrestrict | POST | Unrestrict user |
| /api/admin/users/:id/force-password-reset | POST | Force password reset |
| /api/admin/users/:id/force-logout | POST | Clear all sessions |
| /api/admin/users/:id/disable-mfa | POST | Remove MFA configuration |
| /api/admin/users/:id/change-plan | POST | Change subscription plan |
| /api/admin/users/:id/adjust-credits | POST | Add or subtract credits |
| /api/admin/users/:id/promote | POST | Promote to admin (requires admin password) |
| /api/admin/users/:id/demote | POST | Demote to user (requires admin password) |
| /api/admin/users/:id | DELETE | Delete user account |
| /api/admin/users/export | POST | Export user list as CSV |

---

## 7. Deliverable 4: Support Ticket Administration

**Reference Document:** 14-ADMIN-MODERATION.md Sections 1-5

### Task 7.1: Ticket Queue Page

| Element | Details |
|---------|---------|
| Route | /admin/tickets |
| Quick stats bar | Open tickets count, Urgent/unassigned count, Average response time, Unassigned count |
| Table columns | Priority (icon), Subject (linked), User (email, linked to user detail), Category (badge), Status (badge), Assigned To (admin name or "Unassigned"), Age (time since created), Last Activity |
| Default sort | Priority (urgent first), then oldest first |
| Filters | Status dropdown, Priority dropdown, Category dropdown, Assigned To dropdown (including "Unassigned") |
| Pagination | 25 per page |

### Task 7.2: Admin Ticket Detail Page

| Element | Details |
|---------|---------|
| Route | /admin/tickets/:id |
| User context panel | Sidebar showing: user name, email, plan, account status, credit balance, recent jobs count, link to user detail |
| Message thread | Same as user view but admin can see all messages including internal notes |
| Internal notes | Yellow/highlighted background, only visible to admins, "Add Internal Note" button |
| Reply toggle | Toggle between "Reply to User" (sends notification) and "Add Internal Note" (internal only) |
| Status management | Dropdown to change status: Open, In Progress, Waiting on User, Waiting on Response, Resolved, Closed |
| Priority management | Dropdown to change priority |
| Assignment | "Assign to me" button, "Assign to" dropdown with admin list |

### Task 7.3: Ticket Actions

| Action | Details |
|--------|---------|
| Self-assign | Click "Assign to me", ticket.assigned_to set to current admin |
| Assign to other | Select admin from dropdown, notification sent to assigned admin |
| Unassign | Remove assignment |
| Change status | Dropdown change, notification sent to user for visible status changes |
| Merge tickets | Search for target ticket, source ticket messages appended to target, source ticket closed as "Merged into #{target_id}" |

### Task 7.4: Admin Ticket Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/tickets | GET | All tickets (paginated, filtered) |
| /api/admin/tickets/:id | GET | Ticket detail with messages and internal notes |
| /api/admin/tickets/:id/reply | POST | Reply to user (creates message, sends notification) |
| /api/admin/tickets/:id/note | POST | Add internal note (admin-only visibility) |
| /api/admin/tickets/:id/assign | POST | Assign ticket to admin |
| /api/admin/tickets/:id/status | PATCH | Change ticket status |
| /api/admin/tickets/:id/priority | PATCH | Change ticket priority |
| /api/admin/tickets/:id/merge | POST | Merge into target ticket |

---

## 8. Deliverable 5: Abuse Detection and Moderation

**Reference Document:** 14-ADMIN-MODERATION.md Sections 6-11

### Task 8.1: Automated Abuse Detection

Build background processes that detect suspicious activity and create abuse flags.

| Signal | Threshold | Flag Reason |
|--------|-----------|-------------|
| High error rate | > 80% failure rate over 100+ jobs in 1 hour | "High error rate" |
| Excessive volume | > 10x plan rate limit sustained for 30+ minutes | "Excessive volume" |
| Blocked target scraping | > 50 requests to domains returning 403/429 in 1 hour | "Blocked target scraping" |
| Suspicious URLs | Requests to known sensitive domains (banking, government, social media login pages) | "Suspicious target URLs" |
| Credit anomaly | Credit usage pattern change > 5x from previous 7-day average | "Credit usage anomaly" |

Each detection creates an abuse_flag record: account_id, reason, severity, detection_details, status (flagged), created_at.

### Task 8.2: Flagged Accounts Page

| Element | Details |
|---------|---------|
| Route | /admin/abuse |
| Table columns | User (email, linked), Reason (badge), Severity (icon), Flagged At (date), Status (Flagged/Under Investigation/Cleared/Action Taken badge), Actions |
| Filters | Status dropdown, Reason dropdown |
| Sorting | Most recent first |
| Click row | Navigate to investigation page |

### Task 8.3: Investigation Page

| Element | Details |
|---------|---------|
| Route | /admin/abuse/:id |
| Detection details | Reason, severity, detection timestamp, raw metrics that triggered the flag |
| User context | Same as ticket detail sidebar: user info, plan, status, credit balance |
| Recent suspicious jobs | Table of jobs from this user matching the detection criteria (last 50) |
| Investigation notes | Text area for admin to add notes during investigation |
| Action buttons | Clear (mark as false positive), Warn User, Rate Limit, Temporary Suspend, Permanent Suspend |

### Task 8.4: Enforcement Actions

| Action | Flow |
|--------|------|
| Clear | Admin marks flag as cleared with notes, flag status changes to "Cleared" |
| Warn User | Admin edits warning message (pre-filled template), sends to user as email and in-app notification, flag status changes to "Action Taken" |
| Rate Limit | Admin selects rate limit reduction (50%, 25%, 10% of plan limit) and duration (24h, 7d, 30d, indefinite), applied immediately via rate_limit_override, flag status changes to "Action Taken" |
| Temporary Suspend | Admin sets duration and reason, triggers user suspension (same as user management suspend), flag status changes to "Action Taken" |
| Permanent Suspend | Admin confirms with password, triggers permanent suspension, flag status changes to "Action Taken" |

All enforcement actions create audit log entries.

### Task 8.5: Abuse Detection Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/abuse-flags | GET | List flagged accounts (paginated, filtered) |
| /api/admin/abuse-flags/:id | GET | Flag detail with detection data and user context |
| /api/admin/abuse-flags/:id/investigate | POST | Start investigation (status change) |
| /api/admin/abuse-flags/:id/clear | POST | Clear flag as false positive |
| /api/admin/abuse-flags/:id/warn | POST | Send warning to user |
| /api/admin/abuse-flags/:id/rate-limit | POST | Apply rate limit override |
| /api/admin/abuse-flags/:id/suspend | POST | Suspend user account |
| /api/admin/abuse-flags/:id/notes | POST | Add investigation notes |

---

## 9. Deliverable 6: Financial Administration

**Reference Document:** 15-ADMIN-FINANCE.md

### Task 9.1: Revenue Dashboard

| Element | Details |
|---------|---------|
| Route | /admin/finance/revenue |
| Stat cards (3) | Monthly Recurring Revenue (MRR), Revenue This Month, Active Paid Subscriptions |
| Revenue chart | Line chart: subscription revenue + pack revenue over past 12 months |
| MRR growth chart | Line chart: MRR growth over past 12 months |
| Plan distribution | Donut chart: user count per plan |
| Churn metrics | Churn rate, churned MRR, net MRR change, expansion MRR |

### Task 9.2: Subscription Management

| Element | Details |
|---------|---------|
| Route | /admin/finance/subscriptions |
| Table | User, plan, interval, status, started, next billing, MRR contribution |
| Filters | Plan, status, interval, date range |
| Click row | Subscription detail with history timeline |
| Admin actions | Change plan, cancel, extend period, override status, waive payment |

### Task 9.3: Invoice Browser

| Element | Details |
|---------|---------|
| Route | /admin/finance/invoices |
| Table | Invoice number, user, description, amount, status, date, actions |
| Filters | Status, date range, amount range, user search |
| Actions | Download PDF, void, refund, resend, add note |

### Task 9.4: Credit Operations

| Element | Details |
|---------|---------|
| Route | /admin/finance/credits |
| Adjustment form | User selector (search by email), direction toggle (add/subtract), amount, reason category, reason notes, balance preview |
| Operations log | Table of all credit operations: date, user, type, amount, balance after, admin, reason |
| Filters | Type, date range, admin, user search |
| Export | CSV export of credit operations |

### Task 9.5: Refund Management

| Element | Details |
|---------|---------|
| Route | /admin/finance/refunds |
| Refund request queue | Table of pending refund requests with user, invoice, amount, reason, requested date |
| Review panel | Invoice details, user history, prior refunds, eligibility check |
| Decision | Approve full, approve partial (with amount input), deny (with reason) |
| Refund history | Table of all processed refunds |
| Metrics | Total refunded this month, refund rate, average refund amount |

### Task 9.6: Financial Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/finance/revenue | GET | Revenue metrics and chart data |
| /api/admin/finance/subscriptions | GET | Subscription list (paginated, filtered) |
| /api/admin/finance/subscriptions/:id | GET | Subscription detail with history |
| /api/admin/finance/subscriptions/:id/change-plan | POST | Admin plan change |
| /api/admin/finance/subscriptions/:id/cancel | POST | Admin cancel |
| /api/admin/finance/subscriptions/:id/extend | POST | Extend billing period |
| /api/admin/finance/invoices | GET | Invoice list (paginated, filtered) |
| /api/admin/finance/invoices/:id | GET | Invoice detail |
| /api/admin/finance/invoices/:id/void | POST | Void invoice |
| /api/admin/finance/invoices/:id/refund | POST | Refund invoice |
| /api/admin/finance/invoices/:id/resend | POST | Resend invoice email |
| /api/admin/finance/credits/adjust | POST | Credit adjustment |
| /api/admin/finance/credits/log | GET | Credit operations log |
| /api/admin/finance/credits/export | POST | Export credit operations |
| /api/admin/finance/refunds | GET | Refund request queue |
| /api/admin/finance/refunds/:id | GET | Refund detail |
| /api/admin/finance/refunds/:id/approve | POST | Approve refund |
| /api/admin/finance/refunds/:id/deny | POST | Deny refund |

---

## 10. Deliverable 7: Operations Monitoring

**Reference Document:** 16-ADMIN-OPERATIONS.md

### Task 10.1: System Health Dashboard

| Element | Details |
|---------|---------|
| Route | /admin/operations/health |
| Service status cards | API Server, PostgreSQL, Redis, Job Queue Workers, HTTP Engine, Browser Engine, Stealth Engine, Email Service -- each showing Healthy/Degraded/Down with color |
| System resources | CPU usage, memory usage, disk usage, DB connection pool, Redis memory, with warning thresholds |
| Uptime history | 90-day bars per service |
| Auto-refresh | Every 30 seconds |

### Task 10.2: Job Queue Monitoring

| Element | Details |
|---------|---------|
| Route | /admin/operations/queues |
| Summary cards (3) | Queued jobs, Processing jobs, Failed jobs (last 24h) |
| Queue depth chart | Stacked area chart of queue depth over time by engine |
| Active workers table | Worker ID, engine, current job, uptime, jobs processed |
| Queue actions | Pause/resume queue, drain queue (remove all queued jobs), retry all failed |
| Dead letter queue | Table of permanently failed jobs with retry and dismiss actions |

### Task 10.3: Engine Performance

| Element | Details |
|---------|---------|
| Route | /admin/operations/engines |
| Engine comparison table | Engine name, success rate, avg duration, P95 duration, jobs today, active workers |
| Per-engine detail | Click engine to see: response time histogram, success rate over time, top failure reasons, resource usage |

### Task 10.4: Proxy Management

| Element | Details |
|---------|---------|
| Route | /admin/operations/proxies |
| Provider overview | Table of proxy providers: name, status, pool size, success rate, avg response time, health |
| Proxy rotation config | Settings for rotation strategy, cooldown, failure threshold, max retries |
| Configuration change | Staged flow: edit, review changes, confirm, apply via Redis pub-sub |

### Task 10.5: Rate Limit Management

| Element | Details |
|---------|---------|
| Route | /admin/operations/rate-limits |
| Global limits | Table showing rate limits per plan tier |
| Per-user overrides | List of active overrides with user, plan, custom limit, expiry, reason |
| Override form | User selector, limit value, expiry, reason |
| Monitoring | Rate limit hit chart over time, top rate-limited users |

### Task 10.6: System Configuration

| Element | Details |
|---------|---------|
| Route | /admin/operations/config |
| Settings | Grouped by category: Jobs (max retries, stale threshold, result retention), Credits (costs per engine, pack prices), Auth (lockout threshold, session timeouts, token expiry), Support (auto-close days, rate limit), Cleanup (retention periods) |
| Edit flow | Change value, review change with impact warning, confirm, apply |
| Safeguards | Value validation (min/max ranges), impact warnings, audit log for all changes |

### Task 10.7: Maintenance Mode

| Element | Details |
|---------|---------|
| Route | /admin/operations/maintenance |
| Upcoming maintenance | Table of scheduled maintenance windows |
| Create maintenance | Form: title, description, affected services, start time, expected duration, notification timing |
| During maintenance | Status page auto-updates, API returns 503 for affected services, dashboard shows banner |
| Maintenance history | Past maintenance windows with actual duration and notes |

### Task 10.8: Operations Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/operations/health | GET | System health status |
| /api/admin/operations/queues | GET | Queue status and metrics |
| /api/admin/operations/queues/:name/pause | POST | Pause a queue |
| /api/admin/operations/queues/:name/resume | POST | Resume a queue |
| /api/admin/operations/queues/:name/drain | POST | Drain a queue |
| /api/admin/operations/engines | GET | Engine performance metrics |
| /api/admin/operations/proxies | GET | Proxy provider status |
| /api/admin/operations/proxies/config | PATCH | Update proxy rotation config |
| /api/admin/operations/rate-limits | GET | Rate limit settings and overrides |
| /api/admin/operations/rate-limits/overrides | POST | Create rate limit override |
| /api/admin/operations/rate-limits/overrides/:id | DELETE | Remove rate limit override |
| /api/admin/operations/config | GET | All platform configuration |
| /api/admin/operations/config | PATCH | Update configuration values |
| /api/admin/operations/maintenance | GET | Maintenance windows |
| /api/admin/operations/maintenance | POST | Create maintenance window |
| /api/admin/operations/maintenance/:id | PATCH | Update maintenance window |

---

## 11. Deliverable 8: Content Management

**Reference Document:** 14-ADMIN-MODERATION.md Sections 12-13

### Task 11.1: Blog Post Management

| Element | Details |
|---------|---------|
| Route | /admin/content/blog |
| Post list | Table: title, status (Draft/Published/Archived badge), author, published date, views count |
| Create/Edit | Markdown editor with split-pane preview, toolbar (headings, bold, italic, links, images, code), auto-save (every 30 seconds), word count |
| Post fields | Title, slug (auto-generated from title, editable), excerpt (for listing), body (markdown), cover image upload, tags (multi-select), SEO title, SEO description |
| Lifecycle | Draft (save without publishing), Publish (sets published_at, visible on public blog), Archive (hidden from listing but URL still works) |
| Image upload | Drag-and-drop into editor, uploaded to storage, URL inserted into markdown |

### Task 11.2: Status Page Management

| Element | Details |
|---------|---------|
| Route | /admin/content/status |
| Overall status | Dropdown: All Systems Operational, Partial Outage, Major Outage, Maintenance |
| Per-service status | Toggle for each service: API, Dashboard, Job Processing, HTTP Engine, Browser Engine, Stealth Engine -- each with Operational/Degraded/Down |
| Incident management | Create incident: title, severity (minor/major/critical), affected services, update messages |
| Incident lifecycle | Investigating, Identified, Monitoring, Resolved -- each update posted with timestamp |
| Scheduled maintenance | Future maintenance windows visible on status page |

### Task 11.3: Content Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/blog/posts | GET | List blog posts (all statuses) |
| /api/admin/blog/posts | POST | Create blog post |
| /api/admin/blog/posts/:id | GET | Get blog post |
| /api/admin/blog/posts/:id | PATCH | Update blog post |
| /api/admin/blog/posts/:id | DELETE | Delete blog post (soft) |
| /api/admin/blog/posts/:id/publish | POST | Publish draft |
| /api/admin/blog/posts/:id/archive | POST | Archive post |
| /api/admin/blog/images | POST | Upload image for blog |
| /api/admin/status | GET | Current status page state |
| /api/admin/status | PATCH | Update overall and per-service status |
| /api/admin/status/incidents | GET | List incidents |
| /api/admin/status/incidents | POST | Create incident |
| /api/admin/status/incidents/:id | PATCH | Update incident |
| /api/admin/status/incidents/:id/updates | POST | Add incident update |
| /api/admin/status/maintenance | GET | List maintenance windows |
| /api/admin/status/maintenance | POST | Create maintenance window |

---

## 12. Deliverable 9: Audit Log Viewer

**Reference Document:** 12-ADMIN-DASHBOARD.md Section 11

### Task 12.1: Audit Log Page

| Element | Details |
|---------|---------|
| Route | /admin/audit |
| Table columns | Timestamp, Admin (name/email), Action (badge), Target (user/resource affected), Details (expandable) |
| Filters | Admin dropdown (which admin performed action), Action category (User Management, Billing, Support, Security, Content, System), Date range, Search (target email/ID) |
| Pagination | 25 per page |
| Expandable row | Click to show full detail JSON: IP address, user agent, request parameters, before/after values |
| Export | CSV export of filtered results |
| Immutability | Read-only interface -- no edit or delete actions on audit entries |

### Task 12.2: Audited Actions

All admin actions that modify data create audit log entries. Comprehensive list:

| Category | Actions |
|----------|---------|
| User Management | suspend, unsuspend, restrict, unrestrict, force_password_reset, force_logout, disable_mfa, change_plan, adjust_credits, promote, demote, delete_account |
| Billing | void_invoice, refund_invoice, waive_payment, extend_billing_period, override_subscription_status |
| Support | reply_to_ticket, add_internal_note, assign_ticket, change_ticket_status, change_ticket_priority, merge_tickets |
| Abuse | clear_flag, warn_user, apply_rate_limit, suspend_for_abuse |
| Content | create_post, update_post, publish_post, archive_post, delete_post, update_status_page, create_incident, update_incident |
| System | update_configuration, pause_queue, resume_queue, drain_queue, update_proxy_config, create_rate_limit_override, remove_rate_limit_override, create_maintenance, update_maintenance |

### Task 12.3: Audit Log Endpoint

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/admin/audit | GET | Paginated, filtered audit log entries |
| /api/admin/audit/export | POST | Export audit log as CSV |

---

## 13. Testing Requirements

**Reference Document:** 21-TESTING-STRATEGY.md

### Integration Tests

| Area | Estimated Tests |
|------|----------------|
| Admin overview metrics accuracy | 8-10 |
| User list with filters | 5-7 |
| User detail data aggregation | 5-7 |
| User suspend/unsuspend | 5 |
| User restrict/unrestrict | 3 |
| Credit adjustment (add, subtract, concurrent, negative prevention) | 8 |
| Plan change via admin | 5 |
| User promote/demote | 4 |
| Admin self-protection (all 5 rules) | 5 |
| User deletion via admin | 3 |
| Ticket queue listing and filtering | 5 |
| Ticket assignment and status change | 5 |
| Internal notes (visible to admin, hidden from user) | 3 |
| Ticket merge | 3 |
| Abuse flag creation (automated) | 5 (one per signal) |
| Abuse investigation and enforcement | 8 |
| Revenue metrics calculation | 5 |
| Subscription admin actions | 5 |
| Invoice void and refund | 5 |
| Credit operations log | 3 |
| Refund approval and denial | 5 |
| System health endpoint | 3 |
| Queue management (pause, resume, drain) | 5 |
| Configuration update with validation | 5 |
| Blog post CRUD lifecycle | 5 |
| Status page management | 5 |
| Audit log creation for all action categories | 10 |
| Audit log querying and filtering | 5 |
| Admin search across entity types | 5 |

### E2E Tests

| Flow | Count |
|------|-------|
| Admin login and overview page | 1 |
| Admin user list and detail | 1 |
| Admin suspend user | 1 |
| Admin adjust credits | 1 |
| Admin reply to ticket | 1 |
| Admin view audit log | 1 |

### Security Tests

| Test | Count |
|------|-------|
| Non-admin access to all admin endpoints (403) | 5 (sample across categories) |
| Admin self-protection rules | 5 |
| Audit log immutability (no delete/update endpoints) | 2 |
| Admin search does not leak data to non-admins | 2 |

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Admin dashboard scope is very large | High | Medium | Prioritize user management and tickets first, defer lower-priority operations pages |
| Operations monitoring requires real infrastructure metrics | Medium | Medium | Start with basic health checks, add detailed metrics incrementally |
| Abuse detection false positives | Medium | Medium | Conservative thresholds, "Clear" action for false positives, review before enforcement |
| Admin action concurrency (two admins acting on same user) | Low | Medium | Optimistic locking on user status, clear error messages on conflict |
| Configuration change breaking system | Low | High | Value validation, impact warnings, audit trail for rollback |

---

## 15. Definition of Done

Phase 10 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | Admin layout renders with distinct visual identity and sidebar navigation |
| 2 | Admin overview page displays accurate metrics, charts, activity feed, and alerts |
| 3 | User list page with filters, search, pagination, and CSV export works |
| 4 | User detail page shows account, jobs, and billing tabs with correct data |
| 5 | All 12 admin actions on users work with confirmation modals and audit logging |
| 6 | Admin self-protection rules are enforced (cannot suspend/demote/delete self) |
| 7 | Support ticket queue displays all tickets with admin-specific columns |
| 8 | Admin ticket detail shows user context, internal notes, and reply functionality |
| 9 | Ticket assignment and status management works |
| 10 | Abuse detection creates flags for all 5 automated signals |
| 11 | Flagged accounts page and investigation page work |
| 12 | All enforcement actions (warn, rate limit, suspend) work with notifications |
| 13 | Revenue dashboard displays accurate MRR, revenue charts, and churn metrics |
| 14 | Subscription management page works with admin actions |
| 15 | Invoice browser works with void and refund actions |
| 16 | Credit operations page works with adjustment form and operations log |
| 17 | Refund management queue works with approve/deny flow |
| 18 | System health dashboard shows service status and resource usage |
| 19 | Job queue monitoring works with pause/resume/drain actions |
| 20 | Rate limit management works with override creation |
| 21 | System configuration editor works with validation and staged changes |
| 22 | Blog post management works (create, edit, publish, archive) |
| 23 | Status page management works (service status, incidents) |
| 24 | Audit log displays all admin actions with filters and export |
| 25 | Admin search (Cmd+K) finds users, tickets, jobs, and invoices |
| 26 | All admin actions create audit log entries |
| 27 | No regressions in Phase 9 tests |

---

## 16. Connection to Next Phase

Phase 10 completes the admin-facing features. Phase 11 builds the public-facing website:

- **Phase 11 (Public Website, Legal, Docs Portal)** builds the marketing site, legal pages, and documentation portal that form the public face of ScraperX
- Phase 11 depends on Phase 10's blog management (blog posts published via admin are displayed on public blog)
- Phase 11 depends on Phase 10's status page management (status set via admin is displayed on public status page)
- The public pricing page links to the registration flow built in Phase 6
- The docs portal references API functionality built in Phases 1-5

**Read before starting Phase 11:** 01-PUBLIC-WEBSITE.md (all public pages), 02-LEGAL-FRAMEWORK.md (legal pages), 17-DOCS-PORTAL.md (documentation portal)
