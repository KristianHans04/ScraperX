# ScraperX Admin Organizations (Future Phase)

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-013 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning (Post-MVP) |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 10-TEAM-MANAGEMENT.md, 12-ADMIN-DASHBOARD.md, 15-ADMIN-FINANCE.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Admin Organizations Overview](#1-admin-organizations-overview)
2. [Organizations List Page](#2-organizations-list-page)
3. [Organization Detail Page](#3-organization-detail-page)
4. [Admin Actions on Organizations](#4-admin-actions-on-organizations)
5. [Organization Metrics](#5-organization-metrics)
6. [Edge Cases](#6-edge-cases)
7. [Related Documents](#7-related-documents)

---

## Important Notice

This document describes admin-side organization management that is NOT part of the MVP launch. Organizations are a post-MVP feature described in 10-TEAM-MANAGEMENT.md. This document covers how admins will manage those organizations once the feature is implemented.

This document is included in the planning set for completeness and forward compatibility.

---

## 1. Admin Organizations Overview

When the team/organization feature is implemented, the admin panel will include an Organizations section for managing multi-user accounts. This section allows admins to view all organizations, inspect their members and usage, and take administrative actions.

**Route prefix**: `/admin/organizations`

In MVP, this section does not exist in the admin sidebar. It will be added when the organization feature is built.

---

## 2. Organizations List Page

**Route**: `/admin/organizations`

### List Table

| Column | Content | Sortable |
|--------|---------|----------|
| Name | Organization name | Yes |
| Slug | URL slug | Yes |
| Owner | Owner's name and email | Yes |
| Plan | Organization's subscription plan | Yes |
| Members | Member count | Yes |
| Credits | Current credit balance | Yes |
| Status | Active, Suspended, Deleted | Yes |
| Created | Creation date | Yes (default: desc) |

### Filters

| Filter | Options |
|--------|---------|
| Plan | All, Free, Pro, Enterprise |
| Status | All, Active, Suspended, Deleted |
| Member Count | All, 1, 2-5, 6-10, 10+ |
| Search | Text search across name, slug, owner email |

### Pagination

| Property | Value |
|----------|-------|
| Page size | 25 |
| Sorting | Newest first by default |

---

## 3. Organization Detail Page

**Route**: `/admin/organizations/{orgId}`

### Detail Layout

```
+--- Organization: Acme Corp Engineering ---------------------------+
| < Back to Organizations                                             |
|                                                                     |
| Slug: acme-corp-engineering     Status: [Active]                    |
| Owner: Jane Doe (jane@acme.com)                                     |
| Created: January 1, 2026       Members: 4                          |
|                                                                     |
| +--- Members ---+--- Usage ---+--- Billing ---+--- Audit ---+      |
|                                                                     |
| [Tab Content]                                                       |
|                                                                     |
| +--- Admin Actions -----------------------------------------------+ |
| | [Suspend Org] [Change Plan] [Adjust Credits] [Delete Org]       | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Members Tab

Table of all organization members:

| Column | Content |
|--------|---------|
| Name | Member's full name (linked to admin user detail page) |
| Email | Member's email |
| Role | Owner, OrgAdmin, Member, Viewer, Billing |
| Joined | Date joined the organization |
| Last Active | Last activity within the organization context |
| API Keys | Number of API keys created by this member |

Admin can also:
- Remove a member from the organization
- Change a member's role within the organization
- These actions are audit-logged

### Usage Tab

Organization-level usage analytics (same format as user analytics in 08-USAGE-AND-ANALYTICS.md but aggregated across all organization members):
- Credit usage over time
- Request volume by status
- Engine breakdown
- Top domains
- Per-member usage breakdown

### Billing Tab

Organization's billing information:
- Current plan and billing frequency
- Credit balance and usage
- Payment method details (last 4 only)
- Invoice history
- Payment health status

### Audit Tab

Audit log filtered to this organization:
- All admin actions taken on this organization
- All member changes (joins, leaves, role changes)
- All billing events

---

## 4. Admin Actions on Organizations

| Action | Description | Confirmation |
|--------|-------------|-------------|
| Suspend Organization | Suspends all members' access. API keys disabled | Modal with reason, notification option |
| Unsuspend Organization | Restores access for all members | Modal |
| Change Plan | Changes the organization's subscription plan | Modal with plan selector and reason |
| Adjust Credits | Add or remove credits from the organization's pool | Modal with amount, direction, reason |
| Transfer Ownership | Force-transfer ownership to a different member | Modal with member selector, requires extra confirmation |
| Delete Organization | Soft-deletes the organization | Modal with type-to-confirm, reason |

All actions follow the same patterns as user admin actions (12-ADMIN-DASHBOARD.md, Section 7) with the scope adjusted to organization level. All actions are audit-logged.

### Organization Suspension vs User Suspension

| Aspect | User Suspension | Organization Suspension |
|--------|----------------|----------------------|
| Scope | One user account | All members of the organization |
| API keys | User's keys disabled | All organization keys disabled |
| Member access | N/A | All members see "Organization suspended" notice |
| Billing | User's subscription paused | Organization's subscription paused |
| Personal accounts | Directly affected | Members' personal accounts are NOT affected (only their access to this organization) |

---

## 5. Organization Metrics

The admin overview page (12-ADMIN-DASHBOARD.md) will include organization-level metrics when the feature is available:

| Metric | Description |
|--------|-------------|
| Total Organizations | Count of active organizations |
| Average Members Per Org | Mean member count across active organizations |
| Organization Revenue | Revenue from organization subscriptions vs individual subscriptions |
| Top Organizations by Usage | Organizations consuming the most credits |

---

## 6. Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin suspends an organization but one member is also an admin | The member's admin access is unaffected. Only their membership in the suspended organization is restricted |
| Admin deletes an organization with an active annual subscription | Subscription is cancelled. No pro-rated refund by default (admin can manually issue a refund via 15-ADMIN-FINANCE.md) |
| Organization owner's personal account is deleted by admin | Ownership must be transferred first. Admin is prompted: "The owner's personal account must be active. Transfer ownership before deleting the owner's account." |
| Organization has zero members (all left except owner, then owner's account was deleted) | Organization enters an orphaned state. Admin can assign a new owner from existing members or delete the organization |

---

## 7. Related Documents

| Document | Relationship |
|----------|-------------|
| 10-TEAM-MANAGEMENT.md | User-facing organization features this admin section manages |
| 12-ADMIN-DASHBOARD.md | Admin layout, navigation, overview page |
| 15-ADMIN-FINANCE.md | Financial management for organization subscriptions |
| 18-DATA-MODELS.md | Organization entity schema |
