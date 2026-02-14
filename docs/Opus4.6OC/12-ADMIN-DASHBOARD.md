# Scrapifie Admin Dashboard

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-012 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 04-ROLES-AND-PERMISSIONS.md, 13-ADMIN-ORGANIZATIONS.md, 14-ADMIN-MODERATION.md, 15-ADMIN-FINANCE.md, 16-ADMIN-OPERATIONS.md |

---

## Table of Contents

1. [Admin Dashboard Overview](#1-admin-dashboard-overview)
2. [Admin Access and Authentication](#2-admin-access-and-authentication)
3. [Admin Layout](#3-admin-layout)
4. [Admin Overview Page](#4-admin-overview-page)
5. [Users Management](#5-users-management)
6. [User Detail Page](#6-user-detail-page)
7. [Admin Actions on Users](#7-admin-actions-on-users)
8. [Admin Search](#8-admin-search)
9. [Admin Audit Log](#9-admin-audit-log)
10. [Admin Notifications](#10-admin-notifications)
11. [Empty and Error States](#11-empty-and-error-states)
12. [Edge Cases](#12-edge-cases)
13. [Related Documents](#13-related-documents)

---

## 1. Admin Dashboard Overview

The admin dashboard is a separate zone of the application accessible only to users with the Admin role. It provides tools for platform management including user administration, financial oversight, content moderation, support ticket handling, and system operations monitoring.

### Admin Panel Scope

The admin panel is divided across multiple documents for manageability:

| Document | Coverage |
|----------|----------|
| 12-ADMIN-DASHBOARD.md (this document) | Admin layout, overview page, user management, search, audit log |
| 13-ADMIN-ORGANIZATIONS.md | Organization management (future, post-MVP) |
| 14-ADMIN-MODERATION.md | Support tickets, content moderation, abuse handling |
| 15-ADMIN-FINANCE.md | Revenue, invoices, refunds, custom plans |
| 16-ADMIN-OPERATIONS.md | System health, job queues, proxy status, infrastructure monitoring |

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| Information density | Admin pages prioritize data density over whitespace. Tables, metrics, and controls are compact |
| Data access | Admins can view any user's data, but all admin actions are logged in the audit trail |
| Non-destructive | Admin actions use soft deletes and state changes. Hard deletes are not available through the UI |
| Accountability | Every admin action records who performed it, when, and what changed |
| Separation | The admin panel uses a distinct visual indicator (different sidebar color or header badge) to prevent confusion with the user dashboard |

---

## 2. Admin Access and Authentication

### Access Control

| Rule | Detail |
|------|--------|
| Required role | Admin (as defined in 04-ROLES-AND-PERMISSIONS.md) |
| Route prefix | All admin routes are under `/admin/` |
| Route protection | Server-side middleware checks the user's role on every admin API request. Client-side route guards redirect non-admins to the user dashboard |
| Non-admin access attempt | If a non-admin user navigates to `/admin/*`, they see: "You do not have permission to access this page." with a link back to the dashboard |

### First Admin Bootstrap

| Method | Detail |
|--------|--------|
| Seed script | The first admin is created via the `scripts/seed.ts` script during initial deployment. This script creates a user with the Admin role using credentials from environment variables |
| Admin promotion | Existing admins can promote other users to Admin via the user detail page |
| CLI fallback | If all admin accounts are locked out, a CLI command can promote a user by email (requires server access): described in deployment documentation |

### Admin Session Rules

| Rule | Detail |
|------|--------|
| Session duration | Admin sessions have the same timeout rules as regular users (see 03-AUTHENTICATION.md) |
| MFA recommendation | Admin accounts are strongly encouraged to enable MFA. A banner appears on the admin dashboard if MFA is not enabled: "Your admin account does not have two-factor authentication enabled. Enable it in Security Settings." |
| Concurrent sessions | Admin sessions follow the same rules as regular user sessions. No special restrictions |
| Audit on login | Admin logins are specifically logged in the audit trail with IP address and user agent |

---

## 3. Admin Layout

### Layout Structure

```
+------------------------------------------------------------------+
| [Admin] Scrapifie Admin Panel          [Search] [User: Admin Name] |
+----------+-------------------------------------------------------+
| Admin    |                                                        |
| Sidebar  |  Main Content Area                                     |
|          |                                                        |
| Overview |                                                        |
| Users    |                                                        |
| -------- |                                                        |
| Tickets  |                                                        |
| Moderat. |                                                        |
| -------- |                                                        |
| Finance  |                                                        |
| Invoices |                                                        |
| -------- |                                                        |
| Jobs     |                                                        |
| Queues   |                                                        |
| Proxies  |                                                        |
| System   |                                                        |
| -------- |                                                        |
| Audit Log|                                                        |
| -------- |                                                        |
| Settings |                                                        |
| [Switch  |                                                        |
|  to User |                                                        |
|  Dashboard]                                                       |
+----------+-------------------------------------------------------+
```

### Top Bar

| Element | Description |
|---------|-------------|
| Admin badge | "Admin" label or icon distinguishing the admin panel from the user dashboard |
| Logo | Scrapifie logo, links to `/admin` (admin overview) |
| Search | Global admin search (see Section 8) |
| User menu | Admin user's name and avatar. Dropdown: "Your Settings", "Switch to User Dashboard", "Logout" |

### Sidebar Navigation

| Group | Item | Route | Badge |
|-------|------|-------|-------|
| Core | Overview | `/admin` | None |
| Core | Users | `/admin/users` | Total user count |
| Support | Tickets | `/admin/tickets` | Open ticket count |
| Support | Moderation | `/admin/moderation` | Flagged items count |
| Finance | Revenue | `/admin/finance` | None |
| Finance | Invoices | `/admin/invoices` | Failed payment count |
| Operations | Jobs | `/admin/jobs` | Active job count |
| Operations | Queues | `/admin/queues` | Queue depth |
| Operations | Proxies | `/admin/proxies` | None |
| Operations | System | `/admin/system` | Alert count (if any) |
| Audit | Audit Log | `/admin/audit` | None |
| Settings | Admin Settings | `/admin/settings` | None |

### Switch to User Dashboard

A link at the bottom of the sidebar allows the admin to switch to the regular user dashboard view at `/dashboard`. This is useful because admins also have their own user accounts with API keys, jobs, and billing.

### Visual Differentiation

The admin panel is visually distinguished from the user dashboard:
- Sidebar background uses a distinctly different color (darker or accent-tinted)
- The top bar includes an "Admin" badge
- Page titles are prefixed with the admin context (e.g., "Admin > Users" in breadcrumbs)

---

## 4. Admin Overview Page

**Route**: `/admin`

The overview page provides a high-level snapshot of platform health and activity.

### Overview Layout

```
+------------------------------------------------------------------+
| Admin Overview                                    [Time: Today v]  |
|                                                                    |
| +--- Stat Cards (3 cards) ------------------------------------+   |
| | Total Users    | Active Jobs    | Revenue (MTD)              |   |
| | 2,847          | 142            | $12,450                    |   |
| | +23 today      | 89 queued      | +$1,200 today              |   |
| +-------------------------------------------------------------+   |
|                                                                    |
| +--- Registrations Chart ---+  +--- Revenue Chart ------------+   |
| | [line chart - new users]  |  | [line chart - daily revenue] |   |
| +---------------------------+  +------------------------------+   |
|                                                                    |
| +--- Recent Activity -----------------------------------------+   |
| | [table of recent platform events]                            |   |
| +-------------------------------------------------------------+   |
|                                                                    |
| +--- Alerts and Warnings -------------------------------------+   |
| | [list of system alerts requiring attention]                   |   |
| +-------------------------------------------------------------+   |
+--------------------------------------------------------------------+
```

### Stat Cards

Three stat cards across the top (not four, per design standards):

| Card | Primary Metric | Secondary Metric |
|------|---------------|-----------------|
| Total Users | Total registered users (active accounts, not deleted) | New users today ("+{count} today") |
| Active Jobs | Number of jobs currently in queued or processing state | Breakdown: "{queued} queued, {processing} processing" |
| Revenue (MTD) | Month-to-date revenue in USD | Revenue added today ("+${amount} today") |

### Registrations Chart

| Property | Value |
|----------|-------|
| Chart type | Line chart with area fill |
| X-axis | Date (last 30 days by default) |
| Y-axis | Number of new registrations |
| Tooltip | "{Date}: {count} new users" |
| Time range | Controlled by the page-level time range selector |

### Revenue Chart

| Property | Value |
|----------|-------|
| Chart type | Line chart |
| X-axis | Date (last 30 days by default) |
| Y-axis | Revenue in USD |
| Lines | Two lines: Subscriptions, Credit Packs |
| Tooltip | "{Date}: Subscriptions ${sub_amount}, Credit Packs ${pack_amount}, Total ${total}" |
| Time range | Controlled by the page-level time range selector |

### Recent Activity Feed

A table showing the most recent significant platform events:

| Column | Content |
|--------|---------|
| Time | Relative timestamp (e.g., "2 min ago") |
| Event | Description of what happened |
| User | User name/email involved (linked to user detail page) |
| Details | Brief additional context |

**Event Types in Activity Feed:**

| Event | Example Display |
|-------|----------------|
| New registration | "New user registered: user@example.com" |
| Plan upgrade | "user@example.com upgraded to Pro" |
| Plan cancellation | "user@example.com cancelled subscription" |
| Large credit purchase | "user@example.com purchased Large credit pack ($50)" |
| Account suspension | "user@example.com suspended: failed payment (day 14)" |
| Support ticket (urgent) | "Urgent ticket TKT-ABC123 from user@example.com" |
| Failed payment | "Payment failed for user@example.com ($49.00)" |
| Account deletion | "user@example.com requested account deletion" |

The activity feed shows the 20 most recent events. A "View All" link navigates to the audit log.

### Alerts and Warnings Section

A list of items requiring admin attention:

| Alert Type | Condition | Display |
|------------|-----------|---------|
| Failed payments | Users with unresolved failed payments | "{count} users with failed payments" with link to `/admin/invoices?status=failed` |
| Urgent tickets | Open tickets with Urgent priority | "{count} urgent support tickets" with link to `/admin/tickets?priority=urgent` |
| System alerts | Infrastructure issues (high queue depth, proxy failures, high error rate) | Alert message with link to `/admin/system` |
| Flagged accounts | Accounts flagged for review (abuse, unusual activity) | "{count} accounts flagged for review" with link to `/admin/moderation` |
| Expiring cards | Users with payment methods expiring within 30 days | "{count} users with expiring payment methods" (informational, no action needed) |

If there are no alerts, this section shows: "No alerts. Everything looks good."

### Time Range Selector

A dropdown at the top right of the overview page:

| Option | Range |
|--------|-------|
| Today | Current day |
| Last 7 days | Past 7 days |
| Last 30 days (default) | Past 30 days |
| Last 90 days | Past 90 days |
| This month | Calendar month to date |
| Last month | Previous calendar month |

---

## 5. Users Management

**Route**: `/admin/users`

### Users List Page

```
+--- Users ---------------------------------------------------------+
| [Search users...                     ]  [Plan: All v] [Status: All v] |
|                                                                       |
| Showing 1-25 of 2,847 users                         [Export CSV]      |
|                                                                       |
| Name          | Email              | Plan  | Status | Credits | Joined |
|---------------+--------------------+-------+--------+---------+-------|
| Jane Doe      | jane@example.com   | Pro   | Active | 37,550  | Jan 1 |
| John Smith    | john@test.com      | Free  | Active | 843     | Jan 5 |
| Alice Wong    | alice@site.org     | Pro   | Susp.  | 0       | Dec 1 |
| ...           | ...                | ...   | ...    | ...     | ...   |
+-----------------------------------------------------------------------+
| [< Prev]  Page 1 of 114  [Next >]                                    |
+-----------------------------------------------------------------------+
```

### Users Table Columns

| Column | Content | Sortable | Notes |
|--------|---------|----------|-------|
| Name | Full name | Yes | Linked to user detail page |
| Email | Email address | Yes | Linked to user detail page |
| Plan | Free, Pro, Enterprise, or custom plan name | Yes | Color-coded badge |
| Status | Active, Suspended, Restricted, Deleted | Yes | Color-coded badge |
| Credits | Current credit balance | Yes | Integer with comma formatting |
| Jobs (30d) | Number of jobs in last 30 days | Yes | Quick activity indicator |
| Joined | Account creation date | Yes (default: desc) | Relative for recent, absolute for older |

### User Filters

| Filter | Options |
|--------|---------|
| Plan | All, Free, Pro, Enterprise |
| Status | All, Active, Suspended, Restricted, Deleted |
| Joined | All time, Last 7 days, Last 30 days, Last 90 days, Custom range |
| MFA | All, MFA Enabled, MFA Disabled |
| Search | Text search across name, email, and user ID |

### User Export

Admins can export the user list as CSV:
- Exports all users matching current filters (not just the current page)
- Fields: User ID, Name, Email, Plan, Status, Credit Balance, Jobs (30d), API Keys Count, Joined Date, Last Active
- Maximum 50,000 rows per export
- Rate limit: 3 exports per hour

---

## 6. User Detail Page

**Route**: `/admin/users/{userId}`

The admin user detail page shows comprehensive information about a single user account and provides management actions.

### User Detail Layout

```
+--- User: Jane Doe ------------------------------------------------+
| < Back to Users                                                     |
|                                                                     |
| jane@example.com                Status: [Active]    Role: [User]    |
| User ID: 550e8400-e29b-41d4-a716-446655440000                      |
| Joined: January 1, 2026       Last Active: 2 hours ago             |
|                                                                     |
| +--- Account Tab ---+--- Jobs Tab ---+--- Billing Tab ---+         |
|                                                                     |
| [Account Tab Content]                                               |
|                                                                     |
| +--- Admin Actions -----------------------------------------------+ |
| | [Suspend] [Reset Password] [Change Plan] [Promote to Admin]     | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### User Header

Always visible at the top of the user detail page:

| Field | Content |
|-------|---------|
| Name | User's full name |
| Email | User's email address (clickable to compose email) |
| User ID | Full UUID (copyable) |
| Status | Active, Suspended, Restricted, or Deleted with colored badge |
| Role | User or Admin with badge |
| Joined | Full date of account creation |
| Last Active | Relative timestamp of last API request or dashboard access |
| Avatar | User's avatar or initials fallback |

### Account Tab

Displays the user's profile and account information:

| Section | Content |
|---------|---------|
| Profile | Name, email, timezone, date format preference |
| Security | MFA status (enabled/disabled), password last changed date, active session count |
| API Keys | Table of user's API keys: name, type (live/test), status, created date, last used. Admin can revoke keys from here |
| Notification Preferences | Current notification settings (read-only for admin) |

### Jobs Tab

Displays the user's job history (same format as the user's own jobs page, see 07-JOBS-AND-LOGS.md):

| Feature | Behavior |
|---------|----------|
| Table | Same columns as user jobs table |
| Filters | Same filters as user jobs page |
| Job detail | Clicking a job navigates to `/admin/users/{userId}/jobs/{jobId}` which shows the full job detail with logs and results |
| Admin context | Admin sees all the same data the user would see, plus internal fields (proxy details, worker ID, internal error codes) that are hidden from the user |

### Billing Tab

Displays the user's billing information:

| Section | Content |
|---------|---------|
| Current Plan | Plan name, billing frequency, credit allocation, next billing date |
| Credit Balance | Current credits, usage percentage, cycle dates |
| Payment Method | Card type, last 4, expiry (admin cannot see full card details) |
| Billing History | Invoice table with same format as user billing page. Admin can issue refunds from here |
| Payment Status | Current payment status (healthy, failed with stage indicator) |

---

## 7. Admin Actions on Users

All admin actions on users are available on the user detail page in the "Admin Actions" section.

### Available Actions

| Action | Description | Confirmation Required | Audit Logged |
|--------|-------------|----------------------|-------------|
| Suspend Account | Immediately suspends the user's account. API access disabled, dashboard read-only | Yes (modal with reason field) | Yes |
| Unsuspend Account | Restores a suspended account to active status | Yes (modal) | Yes |
| Restrict Account | Reduces the user to Free plan limits without full suspension | Yes (modal with reason field) | Yes |
| Remove Restriction | Restores the user's plan-level access | Yes (modal) | Yes |
| Reset Password | Sends the user a password reset email. Does not change the password directly | Yes (modal) | Yes |
| Force Logout | Invalidates all of the user's active sessions | Yes (modal) | Yes |
| Disable MFA | Removes MFA from the user's account (for account recovery scenarios) | Yes (modal with reason field, extra confirmation) | Yes |
| Change Plan | Changes the user's subscription plan (for admin corrections or Enterprise setup) | Yes (modal with plan selector and reason) | Yes |
| Adjust Credits | Manually add or remove credits from the user's balance | Yes (modal with amount, direction, and reason) | Yes |
| Promote to Admin | Grants the user the Admin role | Yes (modal with confirmation) | Yes |
| Demote from Admin | Removes the Admin role (cannot demote yourself) | Yes (modal with confirmation) | Yes |
| Delete Account | Soft-deletes the user's account (same as user-initiated deletion) | Yes (modal with type-to-confirm and reason) | Yes |

### Suspension Flow

1. Admin clicks "Suspend" on a user's detail page
2. Suspension modal:
   - Title: "Suspend User Account"
   - User info: "{name} ({email})"
   - Reason field (required, textarea, 10-500 characters): "Why is this account being suspended?"
   - Suspension type:
     - "Temporary" with duration dropdown (24 hours, 7 days, 30 days, Custom date)
     - "Indefinite" (requires manual unsuspension)
   - Notify user checkbox (default: checked): "Send email notification to the user"
   - Buttons: "Suspend Account" (destructive), "Cancel"
3. On confirmation:
   - Account status set to "suspended"
   - All active sessions invalidated
   - All API keys temporarily disabled (not revoked)
   - If notification enabled: email sent to user with suspension reason and duration
   - Audit log entry created
   - Toast: "Account suspended"

### Credit Adjustment Flow

1. Admin clicks "Adjust Credits"
2. Modal:
   - Title: "Adjust Credit Balance"
   - Current balance displayed
   - Direction: "Add Credits" / "Remove Credits" toggle
   - Amount: Number input (positive integer)
   - New balance preview: "New balance: {current +/- amount}"
   - Reason (required): "Why are these credits being adjusted?"
   - Buttons: "Apply Adjustment" (primary), "Cancel"
3. On confirmation:
   - Credit balance updated atomically
   - Credit transaction record created with admin attribution
   - Audit log entry created
   - Toast: "Credits adjusted. New balance: {balance}"
4. No email notification is sent for credit adjustments (admin can manually communicate if needed)

### Admin Self-Protection Rules

| Rule | Detail |
|------|--------|
| Cannot suspend yourself | The "Suspend" action is hidden on your own user detail page |
| Cannot demote yourself | The "Demote from Admin" action is hidden on your own detail page |
| Cannot delete yourself via admin panel | The "Delete Account" admin action is hidden on your own detail page. Use the regular Settings page for self-deletion |
| Cannot disable your own MFA via admin panel | Must use regular Security Settings |

---

## 8. Admin Search

The admin search bar in the top bar provides global search across all admin-manageable entities.

### Search Behavior

| Property | Value |
|----------|-------|
| Location | Top bar of the admin layout, always visible |
| Shortcut | Cmd+K / Ctrl+K opens the search with focus |
| Placeholder | "Search users, tickets, jobs, invoices..." |
| Debounce | 300ms |
| Minimum characters | 2 |

### Search Results

Search results are grouped by entity type:

```
+--- Search Results ------------------------------------------------+
| Users                                                              |
| Jane Doe (jane@example.com) - Pro, Active                         |
| John Doe (john@example.com) - Free, Active                        |
|                                                                    |
| Support Tickets                                                    |
| TKT-ABC123: "Stealth engine returning empty results" - Open       |
|                                                                    |
| Jobs                                                               |
| abc12345...: example.com - Completed, Browser engine               |
|                                                                    |
| Invoices                                                           |
| INV-20260208-12345: Jane Doe - $49.00 - Paid                      |
+--------------------------------------------------------------------+
```

### Search Fields by Entity

| Entity | Searchable Fields |
|--------|------------------|
| Users | Name, email, user ID |
| Support Tickets | Ticket ID, subject, user email |
| Jobs | Job ID, target URL, user email |
| Invoices | Invoice number, user email, amount |

### Search Result Actions

- Each result is clickable and navigates to the appropriate detail page
- Maximum 5 results per entity type are shown in the dropdown
- A "View all {count} results" link at the bottom of each group navigates to the relevant list page with the search applied

---

## 9. Admin Audit Log

**Route**: `/admin/audit`

The audit log records all significant actions performed by admin users and important system events.

### Audit Log Table

```
+--- Audit Log -----------------------------------------------------+
| [Search...     ] [Admin: All v] [Action: All v] [Date Range    ]   |
|                                                                     |
| Time              | Admin          | Action              | Target   |
|-------------------+----------------+---------------------+----------|
| Feb 8, 09:14 UTC  | admin@scrx.com | Suspended account   | jane@... |
| Feb 8, 09:10 UTC  | admin@scrx.com | Adjusted credits    | john@... |
| Feb 8, 08:55 UTC  | system         | Auto-suspended      | alice@.. |
| Feb 7, 16:30 UTC  | admin@scrx.com | Refund processed    | INV-123  |
| ...               | ...            | ...                 | ...      |
+---------------------------------------------------------------------+
| [< Prev]  Page 1 of 230  [Next >]                                  |
+---------------------------------------------------------------------+
```

### Audit Log Entry Fields

| Field | Description |
|-------|-------------|
| Timestamp | Full UTC timestamp of the action |
| Admin | Email of the admin who performed the action, or "system" for automated actions |
| Action | The type of action performed (see action types below) |
| Target | The entity affected (user email, ticket ID, invoice number, etc.) |
| Details | Expanded view (click to expand): full details including old/new values, reason provided, IP address of the admin |

### Audited Action Types

| Category | Action | Details Recorded |
|----------|--------|-----------------|
| User Management | Account suspended | Reason, duration, notification sent |
| User Management | Account unsuspended | Reason |
| User Management | Account restricted | Reason |
| User Management | Restriction removed | Reason |
| User Management | Account deleted (by admin) | Reason |
| User Management | Password reset sent | Target email |
| User Management | MFA disabled | Reason |
| User Management | Force logout | Session count invalidated |
| User Management | Role changed | Old role, new role |
| Financial | Credits adjusted | Amount, direction, reason, old balance, new balance |
| Financial | Plan changed (by admin) | Old plan, new plan, reason |
| Financial | Refund processed | Invoice ID, amount, reason |
| Financial | Custom plan created | Plan details |
| Support | Ticket assigned | Ticket ID, assigned to |
| Support | Ticket status changed | Ticket ID, old status, new status |
| System | Admin login | IP address, user agent |
| System | Admin logout | Session duration |
| System | Auto-suspension | User, reason (failed payment stage) |
| System | Auto-close ticket | Ticket ID, reason (inactivity) |

### Audit Log Filters

| Filter | Options |
|--------|---------|
| Admin | All, specific admin user (dropdown of all admin users) |
| Action Category | All, User Management, Financial, Support, System |
| Date Range | Today, Last 7 days, Last 30 days, Custom range |
| Search | Free text search across action, target, and details |

### Audit Log Rules

| Rule | Detail |
|------|--------|
| Immutability | Audit log entries cannot be modified or deleted by anyone, including admins |
| Retention | Audit logs are retained for a minimum of 2 years |
| Access | Only admin users can view the audit log |
| Export | Admins can export the audit log as CSV (same rate limits as user export) |
| Pagination | 50 entries per page |

---

## 10. Admin Notifications

### Notification Channels

| Channel | Description |
|---------|-------------|
| In-app badges | Badge counts on sidebar nav items (e.g., open tickets count) |
| Email | Critical alerts sent to admin email addresses |

### Notification Events

| Event | In-App | Email |
|-------|--------|-------|
| New urgent support ticket | Badge on Tickets nav | Yes |
| New regular support ticket | Badge on Tickets nav | No |
| Failed payment (user) | Badge on Invoices nav | No |
| Account auto-suspended | Activity feed entry | Yes |
| System alert (high error rate, queue backup) | Badge on System nav | Yes |
| Flagged account (abuse detection) | Badge on Moderation nav | Yes |
| Revenue milestone (e.g., $10k MRR) | Activity feed entry | No |

### Admin Email Settings

Admins can configure their notification preferences at `/admin/settings`:

| Setting | Options |
|---------|---------|
| Urgent ticket alerts | On (default) / Off |
| System alerts | On (default) / Off |
| Auto-suspension alerts | On (default) / Off |
| Abuse detection alerts | On (default) / Off |
| Daily digest | On / Off (default). Sends a daily summary of key metrics and pending items |

---

## 11. Empty and Error States

### Empty States

| Scenario | Message |
|----------|---------|
| No users (fresh install) | "No users registered yet. The platform will populate as users sign up." |
| No users match filters | "No users match your current filters." with "Clear filters" link |
| No audit log entries | "No audit log entries yet. Actions will be recorded here as they occur." |
| No alerts on overview | "No alerts. Everything looks good." (positive state) |
| Search returns no results | "No results found for '{query}'." |

### Error States

| Scenario | Message | Recovery |
|----------|---------|----------|
| Overview page fails to load | "Unable to load admin overview. Please try again." | "Retry" button |
| Users list fails to load | "Unable to load users. Please try again." | "Retry" button |
| User detail fails to load | "Unable to load user details." | "Back to Users" link |
| Admin action fails | Toast: "{Action} failed: {reason}. Please try again." | Retry the action |
| Audit log fails to load | "Unable to load audit log." | "Retry" button |
| Search fails | "Search is temporarily unavailable." | Manual navigation to entity list pages |

---

## 12. Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin suspends a user who is currently logged in | User's active sessions are invalidated. Their next request returns 401 with a "suspended" error. Dashboard shows a suspension notice on login |
| Admin promotes a user to Admin while the user is logged in | The user's permissions update on their next API request. They may need to refresh the page to see the admin navigation |
| Two admins simultaneously perform conflicting actions on the same user | Each action is processed independently with database-level locking. The second action sees the state left by the first. Both are audit-logged |
| Admin tries to view a deleted user | Deleted users remain in the user list with "Deleted" status. Their detail page shows limited information (anonymized data) with a note: "This account has been deleted on {date}" |
| Admin searches for a user by partial UUID | Search supports prefix matching on UUIDs. Entering the first 8 characters of a UUID will find the user |
| Admin changes a user's plan mid-billing-cycle | Proration rules from 09-BILLING-AND-CREDITS.md apply. Admin can optionally skip proration (e.g., for a goodwill gesture). Reason must be provided |
| Audit log grows very large | Pagination and date filtering keep the UI responsive. Backend uses indexed queries. Logs older than 2 years can be archived (not deleted) |
| All admin accounts are locked out | CLI-based admin creation/promotion is available as a recovery mechanism. This requires server access and is documented in deployment docs |
| Admin tries to suspend another admin | Allowed. Admins can suspend other admins. An additional confirmation step is required: "You are about to suspend another admin account. Are you sure?" Self-suspension is still blocked |

---

## 13. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Admin panel zone definition, routing |
| 04-ROLES-AND-PERMISSIONS.md | Admin role definition, permission model |
| 13-ADMIN-ORGANIZATIONS.md | Organization management (future) |
| 14-ADMIN-MODERATION.md | Support tickets and abuse handling |
| 15-ADMIN-FINANCE.md | Revenue, invoices, refunds |
| 16-ADMIN-OPERATIONS.md | System health, queues, proxies |
| 18-DATA-MODELS.md | Audit log schema, admin-specific data structures |
| 19-SECURITY-FRAMEWORK.md | Admin access controls, audit requirements |
