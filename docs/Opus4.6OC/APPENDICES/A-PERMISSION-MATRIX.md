# Appendix A: Permission Matrix

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APPENDIX-A |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 04-ROLES-AND-PERMISSIONS.md, 10-TEAM-MANAGEMENT.md, 12-ADMIN-DASHBOARD.md, 19-SECURITY-FRAMEWORK.md |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role Definitions](#2-role-definitions)
3. [MVP Permission Matrix (User and Admin)](#3-mvp-permission-matrix-user-and-admin)
4. [Future Team Permission Matrix](#4-future-team-permission-matrix)
5. [Permission Enforcement Reference](#5-permission-enforcement-reference)
6. [Special Rules and Exceptions](#6-special-rules-and-exceptions)
7. [Related Documents](#7-related-documents)

---

## 1. Overview

This appendix provides the complete permission matrix for every action in the Scrapifie platform. It is the authoritative reference for who can do what, used by developers implementing route guards, middleware, and frontend visibility controls.

### Permission Model

Scrapifie uses Role-Based Access Control (RBAC) with resource ownership enforcement. Permissions are determined by:

1. **Role** -- What type of user is making the request (User, Admin, or future team roles)
2. **Resource Ownership** -- Does the user own the resource they are acting on (their own account, their own API keys, their own jobs)
3. **Account Status** -- Is the user's account in good standing (active, not suspended, not restricted)

### Permission Symbols

| Symbol | Meaning |
|--------|---------|
| Y | Yes -- action is permitted |
| N | No -- action is denied |
| O | Own only -- permitted only on resources owned by the user's account |
| A | Admin only -- permitted only for users with the Admin role |
| * | Conditional -- see footnotes for specific conditions |

---

## 2. Role Definitions

### MVP Roles (Launch)

| Role | Description | Assignment Method |
|------|-------------|-------------------|
| User | A registered platform user. Can manage their own account, API keys, jobs, billing, and support tickets. Cannot access admin functions. | Automatic on registration |
| Admin | A platform administrator. Has all User permissions plus full access to the admin dashboard, user management, financial administration, content management, and operations monitoring. | Assigned via seed script or by another Admin promoting a User |

### Future Team Roles (Post-MVP)

| Role | Description | Scope |
|------|-------------|-------|
| Owner | Creator of an organization. Full control over the organization and all its resources. One per organization. | Organization |
| OrgAdmin | Organization administrator. Can manage members, API keys, and settings. Cannot delete the organization or transfer ownership. | Organization |
| Member | Standard team member. Can create and manage API keys and jobs. Cannot manage billing or members. | Organization |
| Viewer | Read-only team member. Can view jobs, usage, and analytics. Cannot create or modify anything. | Organization |
| Billing | Billing-only access. Can manage payment methods, view invoices, and purchase credit packs. Cannot access API keys or jobs. | Organization |

---

## 3. MVP Permission Matrix (User and Admin)

### 3.1 Account and Profile

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own profile | Y | Y | -- |
| Edit own name | Y | Y | -- |
| Edit own email (with verification) | Y | Y | -- |
| Upload own avatar | Y | Y | -- |
| Change own timezone | Y | Y | -- |
| Change own date format | Y | Y | -- |
| Change own password | Y | Y | -- |
| Enable own MFA | Y | Y | -- |
| Disable own MFA | Y | Y | -- |
| Regenerate own MFA backup codes | Y | Y | -- |
| View own active sessions | Y | Y | -- |
| Revoke own sessions | Y | Y | -- |
| Delete own account | Y | Y | -- |
| View another user's profile | N | N | Y |
| Edit another user's profile | N | N | N * (1) |
| Force reset another user's password | N | N | Y |
| Force disable another user's MFA | N | N | Y |
| Force logout another user (all sessions) | N | N | Y |
| Suspend another user's account | N | N | Y * (2) |
| Unsuspend another user's account | N | N | Y |
| Restrict another user's account | N | N | Y * (2) |
| Unrestrict another user's account | N | N | Y |
| Delete another user's account | N | N | Y * (2) |
| Promote user to Admin | N | N | Y * (2) |
| Demote Admin to User | N | N | Y * (2) |

Footnotes:
- *(1)* Admins cannot directly edit another user's profile fields (name, email, avatar). They can only perform administrative actions (suspend, reset password, etc.).
- *(2)* Admins cannot perform this action on themselves. Self-suspension, self-demotion, and self-deletion via the admin panel are blocked.

### 3.2 API Keys

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own API keys list | Y | Y | -- |
| View own API key details | Y | Y | -- |
| Create API key (own account) | Y * (3) | Y * (3) | -- |
| Edit API key name (own) | Y | Y | -- |
| Edit API key expiry (own) | Y | Y | -- |
| Edit API key IP whitelist (own) | Y | Y | -- |
| Revoke own API key | Y | Y | -- |
| View another user's API keys | N | N | Y |
| Revoke another user's API key | N | N | Y |
| Create API key for another user | N | N | N |

Footnotes:
- *(3)* Subject to plan limits. Free: max 1 key, Pro: max 5 keys, Enterprise: unlimited. Creating a key beyond the limit is rejected.

### 3.3 Jobs

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own jobs list | Y | Y | -- |
| View own job detail | Y | Y | -- |
| View own job logs | Y | Y | -- |
| View own job result | Y | Y | -- |
| Submit new job (via API) | Y * (4) | Y * (4) | -- |
| Cancel own queued/processing job | Y | Y | -- |
| Retry own failed job | Y * (5) | Y * (5) | -- |
| Export own jobs (CSV/JSON) | Y | Y | -- |
| View another user's jobs | N | N | Y |
| View another user's job detail | N | N | Y |
| Cancel another user's job | N | N | Y |

Footnotes:
- *(4)* Subject to rate limits per plan and sufficient credit balance. Test keys do not require credits.
- *(5)* Requires sufficient credit balance for the retry. Creates a new job linked to the original.

### 3.4 Usage and Analytics

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own usage dashboard | Y | Y | -- |
| View own credit balance | Y | Y | -- |
| View own request volume | Y | Y | -- |
| View own engine breakdown | Y | Y | -- |
| View own success/failure rates | Y | Y | -- |
| View own response time metrics | Y | Y | -- |
| View own top domains | Y | Y | -- |
| View own API key usage | Y | Y | -- |
| Export own usage data | Y | Y | -- |
| View another user's usage | N | N | Y |
| View platform-wide analytics | N | N | Y |

### 3.5 Billing and Credits

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own current plan | Y | Y | -- |
| View own credit balance | Y | Y | -- |
| View own billing history | Y | Y | -- |
| Download own invoices (PDF) | Y | Y | -- |
| Upgrade own plan | Y | Y | -- |
| Downgrade own plan | Y | Y | -- |
| Cancel own subscription | Y | Y | -- |
| Reactivate own subscription | Y | Y | -- |
| Change billing frequency | Y | Y | -- |
| Purchase credit pack | Y * (6) | Y * (6) | -- |
| Add/update payment method | Y | Y | -- |
| Remove payment method | Y * (7) | Y * (7) | -- |
| View another user's billing | N | N | Y |
| Change another user's plan | N | N | Y |
| Adjust another user's credits | N | N | Y |
| Void another user's invoice | N | N | Y |
| Process refund for another user | N | N | Y |
| Waive payment for another user | N | N | Y |

Footnotes:
- *(6)* Credit packs available on Pro and Enterprise plans only. Maximum 5 packs per billing cycle.
- *(7)* Payment method can only be removed if the user is on the Free plan (no active paid subscription).

### 3.6 Notification Preferences

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| View own notification preferences | Y | Y | -- |
| Update own notification preferences | Y * (8) | Y * (8) | -- |
| View another user's notification preferences | N | N | Y |

Footnotes:
- *(8)* Security alerts and billing notifications are always on and cannot be disabled by the user.

### 3.7 Appearance Settings

| Action | User | Admin (own) | Admin (other user) |
|--------|------|-------------|-------------------|
| Change own theme (light/dark/system) | Y | Y | -- |
| Change own display density | Y | Y | -- |

### 3.8 Support Tickets

| Action | User | Admin (own) | Admin (all tickets) |
|--------|------|-------------|---------------------|
| Create support ticket | Y | Y | -- |
| View own tickets list | Y | Y | -- |
| View own ticket detail | Y | Y | -- |
| Reply to own ticket | Y | Y | -- |
| Mark own ticket as resolved | Y | Y | -- |
| View all tickets | N | N | Y |
| Reply to any ticket (as admin) | N | N | Y |
| Add internal note to ticket | N | N | Y |
| Assign ticket to admin | N | N | Y |
| Change ticket status | N | N | Y |
| Change ticket priority | N | N | Y |
| Merge tickets | N | N | Y |
| View another user's tickets | N | N | Y |

### 3.9 Admin Dashboard

| Action | User | Admin |
|--------|------|-------|
| Access admin dashboard | N | Y |
| View admin overview metrics | N | Y |
| View registrations chart | N | Y |
| View revenue chart | N | Y |
| View activity feed | N | Y |
| View admin alerts | N | Y |
| Use admin search (Cmd+K) | N | Y |

### 3.10 Admin User Management

| Action | User | Admin |
|--------|------|-------|
| View user list | N | Y |
| Search users | N | Y |
| Filter users | N | Y |
| Export user list (CSV) | N | Y |
| View user detail | N | Y |
| View user's account tab | N | Y |
| View user's jobs tab | N | Y |
| View user's billing tab | N | Y |

### 3.11 Admin Financial Operations

| Action | User | Admin |
|--------|------|-------|
| View revenue dashboard | N | Y |
| View MRR and churn metrics | N | Y |
| View subscription list | N | Y |
| View subscription detail | N | Y |
| Cancel subscription | N | Y |
| Extend subscription period | N | Y |
| Override subscription status | N | Y |
| Waive payment | N | Y |
| View invoice list | N | Y |
| View invoice detail | N | Y |
| Void invoice | N | Y |
| Resend invoice | N | Y |
| Process refund | N | Y |
| Deny refund | N | Y |
| Adjust user credits | N | Y |
| View credit operations log | N | Y |
| Export credit operations (CSV) | N | Y |
| View payment failures | N | Y |
| Retry failed payment | N | Y |
| Extend grace period | N | Y |
| Generate financial reports | N | Y |
| Download financial reports | N | Y |

### 3.12 Admin Abuse Detection and Moderation

| Action | User | Admin |
|--------|------|-------|
| View flagged accounts | N | Y |
| View investigation detail | N | Y |
| Add investigation notes | N | Y |
| Clear flag (false positive) | N | Y |
| Issue warning | N | Y |
| Apply rate limit override | N | Y |
| Suspend account (from moderation) | N | Y |

### 3.13 Admin Content Management

| Action | User | Admin |
|--------|------|-------|
| View blog post list | N | Y |
| Create blog post | N | Y |
| Edit blog post | N | Y |
| Publish blog post | N | Y |
| Archive blog post | N | Y |
| Delete blog post draft | N | Y |
| Update overall system status | N | Y |
| Update per-service status | N | Y |
| Create incident | N | Y |
| Update incident | N | Y |
| Resolve incident | N | Y |
| Create maintenance window | N | Y |
| Update maintenance window | N | Y |
| Cancel maintenance window | N | Y |

### 3.14 Admin Operations

| Action | User | Admin |
|--------|------|-------|
| View system health dashboard | N | Y |
| View job queue monitoring | N | Y |
| Pause job queue | N | Y |
| Resume job queue | N | Y |
| Drain job queue | N | Y |
| Retry dead letter queue items | N | Y |
| Dismiss dead letter queue items | N | Y |
| View engine performance | N | Y |
| View proxy management | N | Y |
| Update proxy rotation config | N | Y |
| View rate limit configuration | N | Y |
| Create rate limit override | N | Y |
| Remove rate limit override | N | Y |
| View system configuration | N | Y |
| Update system configuration | N | Y |
| Create maintenance mode | N | Y |
| End maintenance mode | N | Y |
| View platform metrics | N | Y |

### 3.15 Admin Audit Log

| Action | User | Admin |
|--------|------|-------|
| View audit log | N | Y |
| Filter audit log | N | Y |
| Export audit log (CSV) | N | Y |
| Delete audit log entries | N | N * (9) |

Footnotes:
- *(9)* Audit log entries are immutable. No one -- including admins -- can delete, modify, or purge audit log entries. They are retained for 2 years per policy.

### 3.16 Public Website (No Auth Required)

| Action | Auth Required |
|--------|---------------|
| View landing page | No |
| View pricing page | No |
| View about page | No |
| View contact page | No |
| Submit contact form | No * (10) |
| View blog listing | No |
| View blog post | No |
| View status page | No |
| Subscribe to status updates | No * (10) |
| View Terms of Service | No |
| View Privacy Policy | No |
| View Acceptable Use Policy | No |
| View Cookie Policy | No |
| View Data Processing Agreement | No |
| View documentation portal | No |
| Use documentation search | No |
| Register new account | No |
| Log in | No |
| Request password reset | No |

Footnotes:
- *(10)* Rate limited by IP address. Contact form: 3/hour. Status subscribe: 5/hour.

---

## 4. Future Team Permission Matrix

This section documents the permission matrix for organization/team roles planned for post-MVP. These roles operate within the scope of an organization and apply to organization-owned resources.

### 4.1 Organization Management

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View organization settings | Y | Y | Y | Y | Y |
| Edit organization name | Y | Y | N | N | N |
| Edit organization slug | Y | N | N | N | N |
| Edit organization timezone | Y | Y | N | N | N |
| Delete organization | Y | N | N | N | N |
| Transfer ownership | Y | N | N | N | N |

### 4.2 Member Management

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View member list | Y | Y | Y | Y | Y |
| Invite new member | Y | Y | N | N | N |
| Cancel pending invitation | Y | Y | N | N | N |
| Resend invitation | Y | Y | N | N | N |
| Change member role | Y | Y * (11) | N | N | N |
| Remove member | Y | Y * (12) | N | N | N |
| Leave organization | N * (13) | Y | Y | Y | Y |

Footnotes:
- *(11)* OrgAdmin can change roles of Members, Viewers, and Billing users. OrgAdmin cannot promote to OrgAdmin or Owner, and cannot change another OrgAdmin's role.
- *(12)* OrgAdmin can remove Members, Viewers, and Billing users. OrgAdmin cannot remove other OrgAdmins or the Owner.
- *(13)* Owner cannot leave the organization. They must transfer ownership first.

### 4.3 Organization API Keys

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View API keys list | Y | Y | Y | Y | N |
| View API key details | Y | Y | Y | Y | N |
| Create API key | Y | Y | Y | N | N |
| Edit API key | Y | Y | O * (14) | N | N |
| Revoke API key | Y | Y | O * (14) | N | N |

Footnotes:
- *(14)* Members can only edit or revoke API keys they personally created. Owner and OrgAdmin can edit or revoke any key.

### 4.4 Organization Jobs

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View jobs list | Y | Y | Y | Y | N |
| View job detail | Y | Y | Y | Y | N |
| View job logs | Y | Y | Y | Y | N |
| View job result | Y | Y | Y | Y | N |
| Submit job (via API) | Y | Y | Y | N | N |
| Cancel job | Y | Y | O * (15) | N | N |
| Retry job | Y | Y | O * (15) | N | N |
| Export jobs | Y | Y | Y | Y | N |

Footnotes:
- *(15)* Members can only cancel or retry jobs they personally submitted. Owner and OrgAdmin can cancel or retry any job.

### 4.5 Organization Usage and Analytics

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View usage dashboard | Y | Y | Y | Y | Y |
| View credit balance | Y | Y | Y | Y | Y |
| View analytics charts | Y | Y | Y | Y | N |
| View member activity breakdown | Y | Y | N | N | N |
| Export usage data | Y | Y | Y | Y | N |

### 4.6 Organization Billing

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View current plan | Y | Y | Y | Y | Y |
| View billing history | Y | Y | N | N | Y |
| Download invoices | Y | Y | N | N | Y |
| Upgrade plan | Y | N | N | N | Y |
| Downgrade plan | Y | N | N | N | Y |
| Cancel subscription | Y | N | N | N | N |
| Purchase credit pack | Y | N | N | N | Y |
| Add/update payment method | Y | N | N | N | Y |
| Remove payment method | Y | N | N | N | Y * (16) |

Footnotes:
- *(16)* Payment method can only be removed if the organization is on the Free plan.

### 4.7 Organization Support

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| Create support ticket | Y | Y | Y | N | Y |
| View organization tickets | Y | Y | O * (17) | N | O * (17) |
| Reply to organization ticket | Y | Y | O * (17) | N | O * (17) |
| Mark ticket as resolved | Y | Y | O * (17) | N | O * (17) |

Footnotes:
- *(17)* Members and Billing users can only view and reply to tickets they personally created. Owner and OrgAdmin can see all organization tickets.

### 4.8 Organization Notifications

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View own notification preferences | Y | Y | Y | Y | Y |
| Update own notification preferences | Y * (18) | Y * (18) | Y * (18) | Y * (18) | Y * (18) |
| Configure org-level notifications | Y | Y | N | N | N |

Footnotes:
- *(18)* Security and billing notifications are always on for applicable roles.

---

## 5. Permission Enforcement Reference

### 5.1 Enforcement Layers

Permissions are enforced at three layers. All three must agree for an action to succeed.

| Layer | Where | What It Checks | Failure Response |
|-------|-------|----------------|------------------|
| Route middleware | Server, before handler | Is the user authenticated? Does the user have the required role? | 401 Unauthorized or 403 Forbidden |
| Resource ownership | Server, in handler | Does the user's account own the requested resource? | 404 Not Found (not 403, to prevent enumeration) |
| Frontend guard | Client, in component | Should the UI element be visible/enabled for this user's role? | Element hidden or disabled (defense in depth, not the primary control) |

### 5.2 Middleware Functions

| Middleware | Purpose | Applied To |
|------------|---------|------------|
| requireAuth | Verifies the request has a valid session cookie with an active session in Redis. Rejects if no session, expired session, or account is suspended/deleted. | All dashboard and admin routes |
| requireAdmin | Extends requireAuth. Additionally verifies the session's user role is "admin". | All /admin/ routes |
| requireCsrf | Validates the X-CSRF-Token header matches the token stored in the session. | All state-changing (POST, PUT, PATCH, DELETE) routes that use cookie-based auth. Not applied to API-key-authenticated routes. |
| requireOwnership(resource) | After loading the requested resource by ID, verifies that the resource's account_id matches the authenticated user's account_id. | All routes that access a specific resource (GET /api/v1/keys/:id, GET /api/v1/jobs/:id, etc.) |

### 5.3 Account Status Impact on Permissions

| Account Status | Effect |
|----------------|--------|
| Active | All permissions as defined by role |
| Restricted | Can log in, can view data, cannot submit new jobs, cannot create API keys. Existing keys remain active. Billing actions still permitted. |
| Suspended | Cannot log in. All sessions invalidated. All API keys disabled. No API access. |
| Deleted (soft) | Cannot log in. Account data anonymized. No recovery possible after retention period. |

---

## 6. Special Rules and Exceptions

### 6.1 Admin Self-Protection

These rules prevent admins from accidentally or maliciously compromising their own access or the platform's admin coverage:

| Rule | Description |
|------|-------------|
| Cannot suspend self | An admin cannot set their own account status to suspended via the admin panel |
| Cannot demote self | An admin cannot change their own role from Admin to User via the admin panel |
| Cannot delete self (via admin panel) | An admin cannot delete their own account through the admin user management page. They can still delete their account through the regular Settings > Account Deletion flow. |
| Cannot disable own MFA (via admin panel) | An admin cannot use the admin "Force disable MFA" action on their own account. They can disable their own MFA through Settings > Security. |
| Cannot force logout self (via admin panel) | An admin cannot use the admin "Force logout" action on their own account. They can manage their own sessions through Settings > Security. |

### 6.2 API Key Authentication Permissions

When a request is authenticated via an API key (X-API-Key header) rather than a session cookie, the permissions are scoped differently:

| Permission | Scope |
|------------|-------|
| Submit scrape job | Yes, if key is active, account is active, plan supports the engine, credits sufficient |
| Check job status | Yes, only for jobs created by this API key's account |
| Get job result | Yes, only for jobs created by this API key's account |
| View account info | Yes, limited to plan name, credit balance, and rate limit status |
| View usage stats | Yes, limited to current billing cycle stats |
| Manage API keys | No |
| Manage billing | No |
| Manage profile | No |
| Access admin functions | No |

### 6.3 Test Key Restrictions

| Restriction | Detail |
|-------------|--------|
| No credit deduction | Test keys never deduct credits |
| URL allowlist | Test keys can only scrape URLs from a predefined test allowlist |
| No production data access | Test key jobs are marked as test and excluded from production analytics |
| Same rate limits | Test keys are subject to the same rate limits as live keys |
| Plan limits apply | Test keys count toward the plan's API key limit |

### 6.4 Downgrade Permission Changes

When a user downgrades from Pro to Free:

| Change | Effect |
|--------|--------|
| API key limit reduces from 5 to 1 | User must select which keys to keep; excess keys are deactivated at the end of the billing cycle |
| Browser and Stealth engines unavailable | Jobs submitted with browser or stealth engine are rejected on Free plan |
| Credit pack purchase unavailable | Free users cannot purchase credit packs |
| Rate limits reduce | Per-minute and concurrency limits drop to Free tier values |
| Data retention reduces | Results retained for 7 days instead of 30; logs for 30 days instead of 90 |

---

## 7. Related Documents

| Document | Relevance |
|----------|-----------|
| 04-ROLES-AND-PERMISSIONS.md | Detailed role architecture, permission enforcement design, audit trail requirements |
| 10-TEAM-MANAGEMENT.md | Full specification for future organization and team role implementation |
| 12-ADMIN-DASHBOARD.md | Admin interface specifications including all admin actions |
| 19-SECURITY-FRAMEWORK.md | Security principles governing permission enforcement |
| 03-AUTHENTICATION.md | Authentication flows that establish user identity and session |
| 06-API-KEY-MANAGEMENT.md | API key permissions and restrictions |
| 09-BILLING-AND-CREDITS.md | Billing-related permissions and plan limits |
