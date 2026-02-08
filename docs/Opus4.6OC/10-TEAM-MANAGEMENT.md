# ScraperX Team Management (Future Phase)

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-010 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning (Post-MVP) |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 04-ROLES-AND-PERMISSIONS.md, 09-BILLING-AND-CREDITS.md, 13-ADMIN-ORGANIZATIONS.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Team Management Overview](#1-team-management-overview)
2. [Organization Model](#2-organization-model)
3. [Team Roles](#3-team-roles)
4. [Organization Creation](#4-organization-creation)
5. [Member Invitation Flow](#5-member-invitation-flow)
6. [Member Management Page](#6-member-management-page)
7. [Role Assignment and Changes](#7-role-assignment-and-changes)
8. [Resource Sharing Within Organizations](#8-resource-sharing-within-organizations)
9. [Billing for Organizations](#9-billing-for-organizations)
10. [Organization Settings](#10-organization-settings)
11. [Leaving and Dissolving Organizations](#11-leaving-and-dissolving-organizations)
12. [Migration Path from Individual to Organization](#12-migration-path-from-individual-to-organization)
13. [Edge Cases](#13-edge-cases)
14. [Related Documents](#14-related-documents)

---

## Important Notice

This document describes functionality that is NOT part of the MVP launch. The MVP supports only two roles: User and Admin. Team and organization features are planned for a future phase (after the core platform is stable and launched).

This document is included in the planning set so that:
1. The MVP data model can be designed with forward compatibility for organizations
2. Architectural decisions made during MVP do not block future team features
3. The scope of team management is well-defined before MVP development begins

All sections below describe the planned future state, not current requirements.

---

## 1. Team Management Overview

Team management allows multiple users to share a single ScraperX account (called an "organization") with shared API keys, shared credit pool, shared job history, and role-based access controls.

### Why Teams Matter

| Use Case | Description |
|----------|-------------|
| Development teams | Multiple developers sharing API keys and monitoring jobs |
| Agencies | A client-facing team where managers oversee scraping operations run by engineers |
| Enterprises | Large organizations with separate billing, operations, and engineering functions |
| Freelancers with clients | A freelancer managing scraping for multiple clients, each in a separate organization |

### MVP Preparation

Even though team features are post-MVP, the following decisions affect MVP design:

| MVP Decision | Reason |
|-------------|--------|
| The users table should have an account_id field that defaults to the user's own UUID | This field will later reference an organizations table. For MVP, each user IS their own "account" |
| API keys, jobs, credits, and subscriptions should be associated with account_id, not user_id | This allows seamless transition to organization-level ownership later |
| The role field on users should use a string enum, not a boolean is_admin flag | This allows future role values (owner, org_admin, member, viewer, billing) without schema changes |
| Session data should include both user_id and account_id | Even if they are the same value in MVP, the distinction is important for future multi-tenancy |

---

## 2. Organization Model

An organization is a shared account that multiple users can belong to. It is the unit of billing, credit allocation, API key ownership, and job history.

### Organization Entity

| Field | Description |
|-------|-------------|
| ID | UUID, primary key |
| Name | Display name for the organization (e.g., "Acme Corp Engineering") |
| Slug | URL-friendly identifier, unique across all organizations (e.g., "acme-corp-engineering") |
| Plan | The subscription plan associated with this organization |
| Credit Balance | Shared credit pool for all members |
| Owner | User ID of the organization owner (the person who created it) |
| Created At | Timestamp of organization creation |
| Status | active, suspended, deleted |

### Organization vs Individual Account

| Aspect | Individual (MVP) | Organization (Future) |
|--------|------------------|----------------------|
| Account owner | The user themselves | An organization entity |
| API keys | Owned by the user | Owned by the organization, created by authorized members |
| Jobs | Associated with the user's account | Associated with the organization, tagged with the member who submitted |
| Credits | Personal credit balance | Shared organization credit pool |
| Billing | Personal payment method | Organization-level billing, managed by Owner or Billing role |
| Settings | Personal preferences | Organization-wide settings + personal preferences |

### User-Organization Relationship

A user can belong to multiple organizations and also maintain a personal (individual) account:

```
User A ---- Personal Account (individual)
   |
   +------- Organization X (as Owner)
   |
   +------- Organization Y (as Member)

User B ---- Personal Account (individual)
   |
   +------- Organization X (as Member)
   |
   +------- Organization Z (as OrgAdmin)
```

An account switcher in the dashboard header allows users to switch between their personal account and any organizations they belong to. The current context (personal or organization) determines which API keys, jobs, credits, and settings are displayed.

---

## 3. Team Roles

### Role Definitions

| Role | Description | Scope |
|------|-------------|-------|
| Owner | Created the organization. Full control including deletion. Cannot be removed. | One per organization |
| OrgAdmin | Organization administrator. Can manage members, API keys, and settings. Cannot delete the organization or remove the Owner. | Multiple allowed |
| Member | Standard team member. Can create API keys (within limits), submit jobs, and view shared resources. | Multiple allowed |
| Viewer | Read-only access. Can view jobs, analytics, and logs but cannot create API keys or submit jobs. | Multiple allowed |
| Billing | Financial access. Can manage payment methods, view invoices, purchase credit packs, and change plans. Cannot manage members or API keys. | Multiple allowed |

### Permission Matrix (Organization Context)

| Action | Owner | OrgAdmin | Member | Viewer | Billing |
|--------|-------|----------|--------|--------|---------|
| View dashboard overview | Yes | Yes | Yes | Yes | Yes |
| View jobs and logs | Yes | Yes | Yes | Yes | No |
| View job details | Yes | Yes | Yes | Yes | No |
| Create API keys | Yes | Yes | Yes | No | No |
| Revoke API keys (own) | Yes | Yes | Yes | No | No |
| Revoke API keys (others) | Yes | Yes | No | No | No |
| View analytics | Yes | Yes | Yes | Yes | No |
| View billing | Yes | Yes | No | No | Yes |
| Change plan | Yes | No | No | No | Yes |
| Purchase credit packs | Yes | No | No | No | Yes |
| Manage payment methods | Yes | No | No | No | Yes |
| Invite members | Yes | Yes | No | No | No |
| Remove members | Yes | Yes | No | No | No |
| Change member roles | Yes | Yes (except Owner) | No | No | No |
| Edit organization settings | Yes | Yes | No | No | No |
| Delete organization | Yes | No | No | No | No |
| Transfer ownership | Yes | No | No | No | No |
| Leave organization | No (must transfer first) | Yes | Yes | Yes | Yes |

The full permission matrix is detailed in APPENDICES/A-PERMISSION-MATRIX.md.

---

## 4. Organization Creation

### Creation Flow

1. User navigates to account switcher in the dashboard header
2. Clicks "Create Organization"
3. Organization creation form appears (modal or dedicated page):

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Organization Name | Text input | 2-100 characters, no special characters except hyphens and spaces | Yes |
| Slug | Auto-generated from name, editable | 2-50 characters, lowercase, alphanumeric and hyphens only, unique | Yes |
| Purpose | Dropdown | "Company", "Team", "Agency", "Personal Project", "Other" | No |

4. User clicks "Create Organization"
5. Server creates the organization:
   - New organization entity with status "active"
   - Creator is assigned the "Owner" role
   - Organization gets a Free plan by default
   - Credit balance set to 1,000 (Free plan allocation)
6. User is redirected to the new organization's dashboard
7. Account switcher now shows the new organization

### Organization Limits

| Plan | Organizations a User Can Create | Members Per Organization |
|------|-------------------------------|------------------------|
| Free | 1 | 1 (owner only, no invitations) |
| Pro | 3 | 5 |
| Enterprise | Unlimited | Custom |

Note: These limits are on the organization's plan, not the creator's personal plan. An organization on the Free plan cannot invite members.

---

## 5. Member Invitation Flow

### Invite Process

1. Owner or OrgAdmin navigates to Organization Settings > Members
2. Clicks "Invite Member"
3. Invitation form:

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Email Address | Email input | Valid email format | Yes |
| Role | Dropdown | Member (default), Viewer, Billing, OrgAdmin | Yes |
| Personal Message | Textarea | Max 500 characters | No |

4. Server creates an invitation:
   - Generates a unique invitation token (cryptographically random, 64 characters)
   - Stores the invitation with: organization ID, invitee email, role, inviter user ID, expiry (7 days), status (pending)
   - Sends invitation email to the invitee

### Invitation Email Content

- Subject: "You've been invited to join {Organization Name} on ScraperX"
- Body: "{Inviter Name} has invited you to join {Organization Name} as a {Role}."
- Personal message included if provided
- CTA button: "Accept Invitation" linking to the invitation acceptance page
- Expiry note: "This invitation expires in 7 days"

### Invitation Acceptance

**If the invitee has a ScraperX account:**
1. Invitee clicks the link in the email
2. If not logged in, redirected to login page with a return URL to the invitation page
3. After login, sees the invitation details: organization name, role, inviter name
4. Clicks "Accept" to join or "Decline" to reject
5. On acceptance: user is added to the organization with the assigned role. Redirected to the organization's dashboard
6. On decline: invitation is marked as declined. Inviter is notified

**If the invitee does NOT have a ScraperX account:**
1. Invitee clicks the link in the email
2. Redirected to the registration page with the invitation token preserved in the URL
3. After registration (and email verification), the invitation is automatically accepted
4. User is added to the organization with the assigned role

### Invitation States

| State | Description |
|-------|-------------|
| pending | Invitation sent, not yet acted on |
| accepted | Invitee accepted the invitation |
| declined | Invitee declined the invitation |
| expired | 7-day window passed without action |
| revoked | Owner/OrgAdmin cancelled the invitation before acceptance |

### Invitation Rules

| Rule | Detail |
|------|--------|
| Duplicate prevention | Cannot invite an email that is already a member of the organization. Error: "This user is already a member" |
| Re-invitation | Can re-invite a user whose previous invitation was declined or expired. Creates a new invitation |
| Self-invitation | Cannot invite yourself. Error: "You cannot invite yourself" |
| Pending limit | Maximum 10 pending invitations per organization at a time |
| Revocation | Owner/OrgAdmin can revoke a pending invitation. The invitation link becomes invalid |

---

## 6. Member Management Page

**Route**: `/dashboard/settings/members` (organization context)

### Members Table

```
+--- Team Members ---------------------------------------------------+
| [Invite Member]                                   {count} members   |
|                                                                      |
| Name              | Email              | Role     | Joined  | Action |
|-------------------+--------------------+----------+---------+--------|
| Jane Doe (you)    | jane@acme.com      | Owner    | Jan 1   |  ---   |
| John Smith        | john@acme.com      | OrgAdmin | Jan 5   | [...]  |
| Alice Wong        | alice@acme.com     | Member   | Jan 10  | [...]  |
| Bob Jones         | bob@acme.com       | Viewer   | Feb 1   | [...]  |
+----------------------------------------------------------------------+
|                                                                      |
| Pending Invitations (2)                                              |
| carol@acme.com    | Member   | Sent Jan 30  | [Revoke]              |
| dave@example.com  | Viewer   | Sent Feb 5   | [Revoke]              |
+----------------------------------------------------------------------+
```

### Member Row Actions

The "[...]" menu on each member row contains:

| Action | Available To | Behavior |
|--------|-------------|----------|
| Change Role | Owner, OrgAdmin (not for Owner row) | Opens role selection dropdown. OrgAdmins cannot promote to Owner |
| Remove | Owner, OrgAdmin (not for Owner row, not for self) | Confirmation modal, then removes member |
| Transfer Ownership | Owner only (on any non-Owner row) | Transfers Owner role to this member (see below) |

### Ownership Transfer

1. Owner clicks "Transfer Ownership" on a member row
2. Confirmation modal:
   - Title: "Transfer Organization Ownership"
   - Body: "You are about to transfer ownership of {Organization Name} to {Member Name}. You will be demoted to OrgAdmin. This action cannot be undone without the new Owner's consent."
   - Password confirmation required
   - Buttons: "Transfer Ownership" (destructive), "Cancel"
3. On confirmation:
   - The selected member becomes Owner
   - The previous Owner becomes OrgAdmin
   - All members are notified via email
   - Audit log entry created

---

## 7. Role Assignment and Changes

### Role Change Rules

| Change | Who Can Do It | Constraints |
|--------|--------------|-------------|
| Any role to Owner | Current Owner only | Via ownership transfer (not direct role change) |
| Any role to OrgAdmin | Owner, OrgAdmin | OrgAdmin cannot promote if it would exceed plan limits (future consideration) |
| Any role to Member | Owner, OrgAdmin | Default role for new members |
| Any role to Viewer | Owner, OrgAdmin | Restricts to read-only access |
| Any role to Billing | Owner, OrgAdmin | Grants financial access, removes operational access |
| Owner to any other role | Not allowed | Must use ownership transfer |

### Role Change Notifications

When a member's role changes:
- Toast notification for the user making the change
- Email notification to the affected member: "Your role in {Organization Name} has been changed to {New Role} by {Changed By}"
- If the member is currently logged in and viewing the organization's dashboard, their permissions update on the next API call (no forced logout)

---

## 8. Resource Sharing Within Organizations

### Shared Resources

| Resource | Sharing Model |
|----------|--------------|
| API Keys | Created by authorized members, visible to all members with appropriate permissions. Each key tracks which member created it |
| Jobs | All jobs within the organization are visible to members with view permissions. Each job tracks which member (and which API key) submitted it |
| Credits | Single shared pool. All members consume from the same balance |
| Analytics | Aggregated across all organization activity. Members can filter by their own activity |
| Billing | Single subscription, single payment method, single invoice history |
| Settings | Organization-wide settings managed by Owner/OrgAdmin |

### Attribution

Every action within an organization context is attributed to the member who performed it:

| Action | Attribution |
|--------|------------|
| API key created | "Created by {member name}" on key detail page |
| Job submitted | "Submitted by {member name}" (derived from the API key used) |
| Credit pack purchased | "Purchased by {member name}" on invoice |
| Settings changed | Audit log records which member made the change |
| Member invited | "Invited by {member name}" on invitation record |

### Activity Filtering

On the jobs and analytics pages within an organization context, an additional filter is available:

| Filter | Options |
|--------|---------|
| Member | "All Members" (default), or individual member names |

This allows members to see their own activity within the larger organization context.

---

## 9. Billing for Organizations

### Billing Ownership

| Aspect | Detail |
|--------|--------|
| Who pays | The organization has its own subscription, independent of any member's personal subscription |
| Who manages billing | Owner and Billing role members |
| Payment method | Attached to the organization, not to any individual member |
| Invoices | Generated for the organization, accessible to Owner and Billing role members |

### Organization Plan vs Personal Plan

A user can have:
- A personal plan (for their individual account)
- Be a member of organizations, each with their own plan

These are completely independent. A user's personal Free plan does not affect their access to a Pro-plan organization.

### Credit Sharing Considerations

| Consideration | Decision |
|---------------|----------|
| Individual credit limits | Not in first version of teams. All members share the pool equally. Future: per-member spending limits |
| Credit abuse prevention | Owner/OrgAdmin can revoke a member's API keys to prevent further spending. Future: spending alerts per member |
| Visibility | All members with billing access can see total credit consumption. The member filter on analytics shows per-member credit usage |

---

## 10. Organization Settings

**Route**: `/dashboard/settings/organization` (organization context)

### Settings Fields

| Field | Editable By | Validation |
|-------|------------|-----------|
| Organization Name | Owner, OrgAdmin | 2-100 characters |
| Slug | Owner only | 2-50 characters, unique, lowercase alphanumeric and hyphens |
| Default Timezone | Owner, OrgAdmin | Timezone from standard list (affects analytics display for the organization) |
| Notification Preferences | Owner, OrgAdmin | Which events trigger emails to all members vs only relevant members |

### Organization-Level vs Personal Settings

Some settings exist at both levels:

| Setting | Organization Level | Personal Level |
|---------|-------------------|----------------|
| Timezone | Default for org analytics and reports | Overrides org default for the individual member's display |
| Theme (light/dark) | Not applicable | Always personal |
| Email notifications | Org-wide notification rules | Personal opt-in/opt-out within org rules |

---

## 11. Leaving and Dissolving Organizations

### Leaving an Organization

Any member except the Owner can leave an organization:

1. Member navigates to Organization Settings
2. Clicks "Leave Organization" (at the bottom of the settings page)
3. Confirmation modal:
   - Title: "Leave {Organization Name}?"
   - Body: "You will lose access to this organization's API keys, jobs, and analytics. This action is immediate."
   - Buttons: "Leave" (destructive), "Stay"
4. On confirmation:
   - Member is removed from the organization
   - Any API keys created by this member remain (owned by the organization, not the individual)
   - Member's personal account becomes the active context
   - Other members are notified (OrgAdmin and Owner)

### Dissolving an Organization

Only the Owner can dissolve (delete) an organization:

1. Owner navigates to Organization Settings
2. Clicks "Delete Organization" (danger zone at the bottom)
3. Confirmation modal:
   - Title: "Delete {Organization Name}?"
   - Body: "This will permanently remove the organization. All members will lose access. Active subscriptions will be cancelled. This action cannot be undone."
   - Type-to-confirm: "Type the organization name to confirm: {org_name}"
   - Password confirmation required
   - Buttons: "Delete Organization" (destructive), "Cancel"
4. On confirmation:
   - Active subscription is cancelled immediately
   - All members are removed and notified via email
   - All API keys are revoked
   - Organization is soft-deleted (data retained per retention policy but inaccessible)
   - Active jobs are allowed to complete, then no new jobs are accepted
   - Owner is redirected to their personal dashboard

---

## 12. Migration Path from Individual to Organization

### Converting a Personal Account to an Organization

A user may want to convert their existing individual account into an organization (e.g., when a solo developer hires a team). The migration path:

1. User creates a new organization (Section 4)
2. API keys can be regenerated under the organization context
3. Existing jobs and history remain on the personal account (they do not migrate)
4. The user can maintain both the personal account and the organization simultaneously

There is NO automatic migration of personal account data to an organization. This is intentional to avoid complex data ownership issues. The user simply starts fresh within the organization context for team-shared resources.

### Data Model Migration (Technical)

When team features are implemented, the following database changes are needed:

| Change | Description |
|--------|-------------|
| Create organizations table | New table with organization entity fields |
| Create account_members table | Junction table: user_id, organization_id, role, joined_at |
| Add account_id to existing tables | API keys, jobs, subscriptions, credit transactions already use account_id (which equals user_id in MVP). No change needed — just start creating organization UUIDs as account_id values |
| Account switcher API | New endpoint to list a user's accounts (personal + organizations) |
| Context-aware queries | All data queries must filter by the current account_id context |

---

## 13. Edge Cases

| Scenario | Handling |
|----------|----------|
| Owner's personal account is deleted | Ownership must be transferred before personal account deletion. If the owner tries to delete their personal account while owning organizations, they are prompted to transfer ownership first |
| Last OrgAdmin leaves | Warning shown: "You are the last administrator. Transfer admin rights before leaving." Leaving is allowed but the Owner is notified |
| Member invited with an email that later changes | Invitation is tied to the email address, not a user ID. If the user changes their email after accepting, their membership is unaffected |
| Organization hits member limit | "Invite Member" button is disabled. Message: "You have reached the maximum number of members for your plan. Upgrade to add more members." |
| Two members create API keys with the same name | Allowed. API key names are not unique within an organization. The key detail page shows who created each key |
| Member revoked while they have running jobs | Jobs continue to completion (they are associated with the organization, not the member). The member simply loses dashboard access |
| Organization's payment fails | Same escalation ladder as individual accounts (09-BILLING-AND-CREDITS.md). All members see the failed payment banner, but only Owner/Billing role can update the payment method |
| Personal account and organization use different plans | Each has its own plan, credit pool, and billing cycle. They are completely independent |
| User accepts invitation while logged into a different account | Invitation acceptance page shows which account will be linked. If the invitation email does not match the logged-in user's email, a warning is shown: "This invitation was sent to {email}. You are logged in as {different_email}. Accepting will add your current account to the organization." |
| Organization slug conflicts with a reserved word | Slugs like "admin", "dashboard", "api", "settings", "billing", "login", "register" are reserved and cannot be used as organization slugs |

---

## 14. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | User types and future role definitions |
| 04-ROLES-AND-PERMISSIONS.md | MVP role model and forward-compatible design decisions |
| 09-BILLING-AND-CREDITS.md | Billing mechanics that apply to organization-level subscriptions |
| 11-SETTINGS-AND-SUPPORT.md | Settings page structure that will expand for organization settings |
| 13-ADMIN-ORGANIZATIONS.md | Admin-side management of organizations |
| 18-DATA-MODELS.md | Data model changes needed for organization support |
| APPENDICES/A-PERMISSION-MATRIX.md | Full permission matrix including organization roles |
