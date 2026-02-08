# ScraperX Roles and Permissions

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-004 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 03-AUTHENTICATION.md, 10-TEAM-MANAGEMENT.md, 18-DATA-MODELS.md, APPENDICES/A-PERMISSION-MATRIX.md |

---

## Table of Contents

1. [Role Architecture Overview](#1-role-architecture-overview)
2. [MVP Roles](#2-mvp-roles)
3. [Permission Model](#3-permission-model)
4. [Resource Ownership](#4-resource-ownership)
5. [Permission Enforcement](#5-permission-enforcement)
6. [Admin Privilege Escalation Controls](#6-admin-privilege-escalation-controls)
7. [Future Team Roles](#7-future-team-roles)
8. [Data Model for Roles and Permissions](#8-data-model-for-roles-and-permissions)
9. [Audit Trail](#9-audit-trail)

---

## 1. Role Architecture Overview

ScraperX uses a straightforward role-based access control (RBAC) system. At MVP, there are exactly two roles: User and Admin. The system is designed so that future team-based roles (Owner, OrgAdmin, Member, Viewer, Billing) can be added without restructuring the database or permission logic.

### Design Principles

| Principle | Detail |
|-----------|--------|
| Least privilege | Every user gets the minimum permissions necessary for their role. Users cannot access admin resources. Admins cannot modify their own role. |
| Deny by default | If a permission is not explicitly granted, it is denied. New features default to no access until permissions are configured. |
| Centralized enforcement | Permission checks happen at the API route level (middleware), not scattered through business logic. A single permission-checking function is called for every protected endpoint. |
| Auditable | Every permission-sensitive action is logged in the audit trail with who did what, when, and from where. |
| Forward-compatible | The data model supports future roles without migration changes. Roles are stored as a string field (not an enum in the database) to allow new roles without schema changes. |

---

## 2. MVP Roles

### User Role

| Attribute | Detail |
|-----------|--------|
| Role identifier | "user" |
| Assignment | Automatically assigned to every new account upon registration |
| Access zones | Zone 2 (User Dashboard) only |
| Description | A registered individual or developer who uses ScraperX to perform web scraping via the API. Manages their own account, API keys, jobs, billing, and settings. |

### Admin Role

| Attribute | Detail |
|-----------|--------|
| Role identifier | "admin" |
| Assignment | Manually assigned by another admin or set during initial system setup (first user bootstrap) |
| Access zones | Zone 2 (User Dashboard) + Zone 3 (Admin Panel) |
| Description | A platform operator who manages all user accounts, handles moderation, views finance data, monitors operations, and maintains the system. An admin also has their own user account and can use the platform as a regular user. |

### First Admin Bootstrap

When the platform is deployed for the first time and no users exist, the first user to register is NOT automatically made an admin. Instead:

| Step | Detail |
|------|--------|
| 1 | Deploy the application |
| 2 | Run a CLI command or database seed script that creates the first admin user with a specified email and temporary password |
| 3 | The admin logs in, changes the temporary password, and enables MFA |
| 4 | This admin can then promote other users to admin via the admin panel |

This approach prevents a race condition where an attacker could register first and gain admin access.

---

## 3. Permission Model

### Permission Categories

Permissions are organized into resource-action pairs. The full matrix is in APPENDICES/A-PERMISSION-MATRIX.md. Below is the summary.

#### Account and Profile Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own profile | Yes | Yes |
| Edit own profile (name, email, avatar) | Yes | Yes |
| Change own password | Yes | Yes |
| Enable/disable own MFA | Yes | Yes |
| Delete own account | Yes | Yes (with restrictions) |
| View another user's profile | No | Yes |
| Edit another user's profile | No | Yes |
| Suspend/unsuspend another user | No | Yes |
| Delete another user's account | No | Yes (soft delete) |
| Change another user's role | No | Yes (cannot change own role) |

#### API Key Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own API keys (metadata only, not the key value) | Yes | Yes |
| Create API key for own account | Yes | Yes |
| Revoke own API key | Yes | Yes |
| View another user's API keys (metadata) | No | Yes |
| Revoke another user's API key | No | Yes |

#### Job Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own jobs | Yes | Yes |
| View own job details (request, response, metadata) | Yes | Yes |
| Cancel own pending/queued job | Yes | Yes |
| View another user's jobs | No | Yes |
| View another user's job details | No | Yes |
| Cancel another user's job | No | Yes |

#### Usage and Analytics Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own usage data | Yes | Yes |
| Export own usage data | Yes | Yes |
| View another user's usage data | No | Yes |
| View platform-wide usage analytics | No | Yes |

#### Billing Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own subscription and plan | Yes | Yes |
| Upgrade/downgrade own plan | Yes | Yes |
| View own invoices | Yes | Yes |
| Download own invoices | Yes | Yes |
| Purchase credit packs for own account | Yes | Yes |
| Update own payment method | Yes | Yes |
| View another user's billing data | No | Yes |
| Modify another user's subscription | No | Yes |
| Issue refunds | No | Yes |
| Apply credit adjustments | No | Yes |
| View platform-wide finance data | No | Yes |

#### Settings Permissions

| Permission | User | Admin |
|------------|------|-------|
| View own notification preferences | Yes | Yes |
| Update own notification preferences | Yes | Yes |
| View own security settings | Yes | Yes |
| View own active sessions | Yes | Yes |
| Revoke own sessions | Yes | Yes |

#### Support Permissions

| Permission | User | Admin |
|------------|------|-------|
| Create support tickets | Yes | Yes |
| View own support tickets | Yes | Yes |
| Reply to own support tickets | Yes | Yes |
| Close own support tickets | Yes | Yes |
| View all support tickets | No | Yes |
| Reply to any support ticket | No | Yes |
| Close any support ticket | No | Yes |
| Assign support tickets | No | Yes |

#### Admin-Only Permissions

| Permission | User | Admin |
|------------|------|-------|
| Access admin dashboard | No | Yes |
| View system health and metrics | No | Yes |
| View queue status | No | Yes |
| View error logs | No | Yes |
| View audit logs | No | Yes |
| Manage moderation queue | No | Yes |
| Create/edit/publish blog posts | No | Yes |
| Manage status page incidents | No | Yes |
| Manage legal documents | No | Yes |
| View all accounts | No | Yes |
| Search all users | No | Yes |

---

## 4. Resource Ownership

### Ownership Model

Every resource in the system belongs to an account. In the MVP (where one user = one account), the user owns their account and all resources within it.

```
Account (owned by User)
    |
    +-- API Keys (belong to Account)
    |
    +-- Jobs (belong to Account, created via API Key)
    |
    +-- Subscription (belongs to Account)
    |
    +-- Invoices (belong to Account)
    |
    +-- Credit Transactions (belong to Account)
    |
    +-- Support Tickets (belong to Account)
    |
    +-- Notification Preferences (belong to User)
    |
    +-- Sessions (belong to User)
    |
    +-- MFA Configuration (belongs to User)
```

### Ownership Check

When a user requests a resource, the system verifies:

1. The resource exists (if not, return 404)
2. The resource belongs to the user's account (if not, return 404 — not 403, to avoid leaking information about resource existence)
3. The user has the required permission for the action

Admins bypass the ownership check (step 2) but still go through steps 1 and 3. An admin can access any user's resources, but only through the admin panel routes — not through the regular dashboard routes pretending to be that user.

### Isolation Between Users

| Rule | Detail |
|------|--------|
| No cross-account access | A user can never see, modify, or delete another user's resources through the dashboard |
| Admin access is explicit | Admin access to user resources happens through admin panel routes which are clearly marked in the URL (/admin/*) and in the audit log |
| API key isolation | An API key authenticates as the account it belongs to. It cannot access another account's resources. |

---

## 5. Permission Enforcement

### Enforcement Layers

Permission checks happen at multiple layers:

```
Layer 1: Route-Level Middleware (Primary)
    |
    +-- Every API route has a required role declaration
    +-- Middleware checks session -> user -> role before the route handler executes
    +-- If the check fails, the request is rejected before any business logic runs
    |
    v
Layer 2: Resource Ownership (Secondary)
    |
    +-- For resource-specific routes (e.g., GET /dashboard/api-keys/:keyId)
    +-- After passing role check, verify the resource belongs to the user's account
    +-- Implemented as a reusable function called within route handlers
    |
    v
Layer 3: Frontend Route Guards (UI Only)
    |
    +-- React Router wrapper that checks user role before rendering a route component
    +-- If the user is not authorized, redirects to /dashboard (for admin pages) or /login (for auth pages)
    +-- This is a UX enhancement only — never the sole enforcement mechanism
```

### Route Middleware Pattern

Every API route declares its required access level:

| Access Level | Meaning |
|-------------|---------|
| public | No authentication required |
| authenticated | Any logged-in user |
| admin | Admin role required |

The middleware reads the access level from the route configuration and enforces it before the route handler is called.

### Frontend Route Guards

The React Router configuration wraps protected routes in guard components:

| Guard | Behavior |
|-------|----------|
| AuthGuard | Checks if user is logged in. If not, redirect to /login with return URL. |
| AdminGuard | Checks if user has admin role. If not, redirect to /dashboard with a toast notification "You do not have permission to access this page." |
| GuestGuard | Checks if user is NOT logged in (for login/signup pages). If logged in, redirect to /dashboard. |

### Error Responses for Permission Failures

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Not authenticated | 401 | Redirect to /login (web) or return 401 JSON (API) |
| Authenticated but wrong role | 403 | "You do not have permission to perform this action" |
| Resource not found or not owned | 404 | "Resource not found" (same message whether it does not exist or is not owned) |
| Account suspended | 403 | "Your account has been suspended. Contact support." |

---

## 6. Admin Privilege Escalation Controls

Since admins have broad access, special controls prevent abuse.

### Self-Modification Restrictions

| Action | Allowed? | Reason |
|--------|----------|--------|
| Admin changes own role to "user" | No | Prevents accidental demotion. Another admin must do it. |
| Admin changes own role to "admin" | N/A (already admin) | No change needed |
| Admin deletes own account | Yes, but requires confirmation and another admin must exist | Cannot leave the platform with no admins |
| Admin suspends own account | No | Prevents lockout |

### Admin Action Audit Requirements

| Requirement | Detail |
|-------------|--------|
| All admin actions are logged | Every action taken through the admin panel is recorded in the audit log |
| Log includes | Admin user ID, action type, target resource, target user (if applicable), timestamp, IP address, user agent |
| Logs are immutable | Audit log entries cannot be edited or deleted through the application. Only direct database access (which should be restricted) can modify them. |
| Log retention | 2 years minimum |

### Admin Promotion and Demotion

| Action | Process |
|--------|---------|
| Promoting a user to admin | Existing admin navigates to Admin > Users > User Detail > clicks "Promote to Admin." Confirmation modal: "You are about to give {user name} full admin access. This grants access to all user data, billing, and system configuration. Continue?" Requires the admin to enter their own password to confirm. |
| Demoting an admin to user | Same flow in reverse. Confirmation modal warns that the admin will lose all admin access immediately. Cannot demote if it would leave zero admins. |

---

## 7. Future Team Roles

This section documents roles that will be implemented in a future phase (see 10-TEAM-MANAGEMENT.md). They are described here so the data model can accommodate them from day one.

### Future Role Definitions

| Role | Scope | Description |
|------|-------|-------------|
| Owner | Account-level | The person who created the account (or was transferred ownership). Full control including billing, team management, and account deletion. One owner per account. |
| OrgAdmin | Account-level | Can manage team members, API keys, and view billing. Cannot delete the account or transfer ownership. |
| Member | Account-level | Can create and view API keys, run jobs, view usage. Cannot manage billing or team members. |
| Viewer | Account-level | Read-only access. Can view jobs, usage, and API key metadata. Cannot create, modify, or delete anything. |
| Billing | Account-level | Can manage billing, payment methods, and view invoices. No access to API keys, jobs, or team management. |

### How the Data Model Accommodates This

The user record has a "role" field that currently stores either "user" or "admin" (platform-level role). In the future, a separate "account_members" table will map users to accounts with account-level roles.

| Field | Current (MVP) | Future (Teams) |
|-------|--------------|----------------|
| Platform role (user.role) | "user" or "admin" | Same — platform-level access |
| Account role | N/A (user owns their account) | Stored in account_members table: user_id, account_id, role |
| Permission check | Check user.role | Check user.role (platform) + account_members.role (account) |

This means the MVP code only checks `user.role`. When teams are added, the permission middleware is extended to also check `account_members.role` for the current account context.

### Migration Path

| Step | Detail |
|------|--------|
| 1 | When teams feature launches, create the account_members table |
| 2 | Backfill: for every existing user, create an account_members record with role="owner" linking them to their account |
| 3 | Update the permission middleware to check both platform role and account role |
| 4 | Add team management UI (invite, remove, change roles) |
| 5 | Update all resource access checks to use account_id from the account_members relationship |

---

## 8. Data Model for Roles and Permissions

Detailed data models are in 18-DATA-MODELS.md. This section summarizes the role-related fields.

### Users Table (Role-Related Fields)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| role | String | Platform-level role: "user" or "admin". Default: "user" |
| status | String | Account status: "active", "suspended", "deleted". Default: "active" |
| suspended_at | Timestamp or null | When the account was suspended |
| suspended_reason | String or null | Why the account was suspended |
| suspended_by | UUID or null | Admin who suspended the account |

### Future: Account Members Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users table |
| account_id | UUID | Foreign key to accounts table |
| role | String | Account-level role: "owner", "org_admin", "member", "viewer", "billing" |
| invited_at | Timestamp | When the invitation was sent |
| accepted_at | Timestamp or null | When the invitation was accepted |
| invited_by | UUID | User who sent the invitation |

### Permission Check Pseudocode

For MVP, the permission check is simple:

```
Request arrives at protected endpoint
    |
    v
Read session from cookie
    |
    +-- No session --> 401
    |
    v
Load user from session.user_id
    |
    +-- User not found or status != "active" --> 401
    |
    v
Check route's required access level:
    |
    +-- "authenticated" --> Allow (any active user)
    +-- "admin" --> Check user.role == "admin"
    |   +-- Not admin --> 403
    |   +-- Is admin --> Allow
    |
    v
For resource-specific routes:
    Load resource
    |
    +-- Not found --> 404
    |
    v
    Check resource.account_id == user.account_id
    |
    +-- Mismatch AND user.role != "admin" --> 404
    +-- Mismatch AND user.role == "admin" --> Allow (admin override)
    +-- Match --> Allow
```

---

## 9. Audit Trail

### What Gets Logged

Every permission-sensitive action generates an audit log entry.

| Action Category | Examples |
|----------------|---------|
| Authentication | Login, logout, failed login, password change, password reset, MFA enable/disable |
| Account management | Profile update, account deletion, suspension, role change |
| API key management | Key creation, key revocation |
| Billing | Plan change, payment method update, credit purchase, refund |
| Admin actions | User lookup, account modification, moderation actions, finance operations |
| Support | Ticket creation, ticket reply, ticket status change |

### Audit Log Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique log entry identifier |
| timestamp | Timestamp | When the action occurred (UTC) |
| actor_id | UUID | User who performed the action |
| actor_role | String | Role of the user at the time of action |
| action | String | Action type (e.g., "user.login", "api_key.create", "admin.user.suspend") |
| target_type | String | Type of resource acted upon (e.g., "user", "api_key", "subscription") |
| target_id | UUID | ID of the resource acted upon |
| details | JSON | Additional context (varies by action type) |
| ip_address | String | IP address of the actor |
| user_agent | String | Browser/client user agent |
| account_id | UUID | Account context for the action |

### Audit Log Access

| Who | Access |
|-----|--------|
| Regular user | Cannot view audit logs |
| Admin | Can view all audit logs via /admin/audit (see 12-ADMIN-DASHBOARD.md) |
| Future: Account Owner | Will be able to view audit logs for their account only |

### Audit Log Retention

| Rule | Detail |
|------|--------|
| Retention period | 2 years from creation |
| Deletion | Audit logs older than 2 years are permanently deleted by a scheduled cleanup job |
| Immutability | Audit log entries cannot be modified or deleted through the application |
| Export | Admins can export audit logs in CSV format (date-range filtered) |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — User types and role summary
- 03-AUTHENTICATION.md — Role assignment during registration, session role storage
- 10-TEAM-MANAGEMENT.md — Future team roles and their implementation
- 12-ADMIN-DASHBOARD.md — Admin panel access and capabilities
- 13-ADMIN-ORGANIZATIONS.md — Admin user management (role changes, suspensions)
- 18-DATA-MODELS.md — Full data model including role fields
- 19-SECURITY-FRAMEWORK.md — Security context for permission enforcement
- APPENDICES/A-PERMISSION-MATRIX.md — Complete permission matrix for all roles and actions
- ROADMAP/PHASE-06.md — Role system implementation timeline
