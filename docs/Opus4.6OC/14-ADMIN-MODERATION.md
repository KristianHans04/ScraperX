# Scrapifie Admin Moderation

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-014 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 02-LEGAL-FRAMEWORK.md, 11-SETTINGS-AND-SUPPORT.md, 12-ADMIN-DASHBOARD.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Admin Moderation Overview](#1-admin-moderation-overview)
2. [Support Ticket Management](#2-support-ticket-management)
3. [Ticket Queue Page](#3-ticket-queue-page)
4. [Ticket Detail (Admin View)](#4-ticket-detail-admin-view)
5. [Ticket Assignment and Workflow](#5-ticket-assignment-and-workflow)
6. [Abuse Detection and Flagging](#6-abuse-detection-and-flagging)
7. [Flagged Accounts Page](#7-flagged-accounts-page)
8. [Abuse Investigation Flow](#8-abuse-investigation-flow)
9. [Enforcement Actions](#9-enforcement-actions)
10. [Blog and Content Management](#10-blog-and-content-management)
11. [Edge Cases](#11-edge-cases)
12. [Related Documents](#12-related-documents)

---

## 1. Admin Moderation Overview

The moderation section of the admin panel covers three areas:

1. **Support Ticket Management** — Handling user support requests from the ticket system (11-SETTINGS-AND-SUPPORT.md)
2. **Abuse Detection and Enforcement** — Identifying and acting on accounts that violate the Acceptable Use Policy (02-LEGAL-FRAMEWORK.md)
3. **Content Management** — Managing blog posts and status page content for the public website (01-PUBLIC-WEBSITE.md)

---

## 2. Support Ticket Management

Admin support ticket management is the counterpart to the user-facing support system described in 11-SETTINGS-AND-SUPPORT.md. Admins see all tickets from all users and can respond, assign, and resolve them.

### Admin vs User Ticket View

| Feature | User View | Admin View |
|---------|-----------|------------|
| Tickets visible | Only their own | All users' tickets |
| User identity | Always "You" | User's name, email, plan, account status |
| Assignment | Not visible | Can assign to self or other admins |
| Internal notes | Not visible | Can add internal notes (not shown to user) |
| Status changes | Can mark as resolved | Full status control |
| Priority changes | Set at creation | Can change at any time |
| Merge tickets | Not available | Can merge duplicate tickets |
| User context | Not applicable | Quick links to user detail, jobs, billing |

---

## 3. Ticket Queue Page

**Route**: `/admin/tickets`

### Queue Layout

```
+--- Support Tickets -----------------------------------------------+
| [Status: Open v] [Priority: All v] [Category: All v] [Assigned: All v] |
| [Search tickets...                                              ]       |
|                                                                         |
| Showing 1-25 of 142 tickets                                            |
|                                                                         |
| Priority | Ticket    | Subject               | User      | Status   | Age    | Assigned |
|----------+-----------+-----------------------+-----------+----------+--------|
| URGENT   | TKT-A123  | API returning 500...  | jane@...  | Open     | 2h     | --       |
| HIGH     | TKT-B456  | Billing discrepancy   | john@...  | WaitResp | 1d     | Admin A  |
| NORMAL   | TKT-C789  | Feature: batch API    | alice@... | InProg   | 3d     | Admin B  |
| NORMAL   | TKT-D012  | Empty results on...   | bob@...   | WaitUser | 5d     | Admin A  |
| ...      | ...       | ...                   | ...       | ...      | ...    | ...      |
+-------------------------------------------------------------------------+
| [< Prev]  Page 1 of 6  [Next >]                                        |
+-------------------------------------------------------------------------+
```

### Queue Table Columns

| Column | Content | Sortable | Notes |
|--------|---------|----------|-------|
| Priority | Urgent, High, Normal | Yes | Color-coded: Urgent=red, High=orange, Normal=default |
| Ticket ID | TKT-XXXXXX | No | Linked to ticket detail |
| Subject | Ticket subject, truncated | No | Full subject on hover |
| User | User's email | Yes | Linked to admin user detail page |
| Category | Technical, Billing, Account, etc. | Yes | Category badge |
| Status | Open, In Progress, Waiting on User, Waiting on Response, Resolved, Closed | Yes | Color-coded |
| Age | Time since creation | Yes (default: oldest first for open) | Relative time |
| Assigned | Admin name or "--" (unassigned) | Yes | Filter by assignment |
| Last Activity | Time since last message (user or admin) | Yes | Relative time |

### Queue Filters

| Filter | Options |
|--------|---------|
| Status | All, Open (default for new queue view), In Progress, Waiting on User, Waiting on Response, Resolved, Closed, Active (all non-closed) |
| Priority | All, Urgent, High, Normal |
| Category | All, Technical Issue, Billing Question, Account Issue, Feature Request, Bug Report, General Inquiry |
| Assigned | All, Unassigned, Me (current admin), specific admin name |
| Search | Text search across ticket ID, subject, and user email |

### Queue Sorting

Default sort for open tickets: Urgent first, then by age (oldest first). This ensures urgent tickets and long-waiting tickets surface to the top.

### Quick Stats Bar

Above the table, a stats bar shows:

| Metric | Display |
|--------|---------|
| Open | "{count} open" |
| Urgent | "{count} urgent" (highlighted if > 0) |
| Avg Response Time | "Avg response: {hours}h" (average time from ticket creation to first admin response) |
| Unassigned | "{count} unassigned" |

---

## 4. Ticket Detail (Admin View)

**Route**: `/admin/tickets/{ticketId}`

### Admin Ticket Detail Layout

```
+--- TKT-ABC123 (Admin View) ---------------------------------------+
| < Back to Tickets                                                   |
|                                                                     |
| Subject: Stealth engine returning empty results for target.com      |
| Category: Technical Issue  |  Priority: [High v]  |  Status: [Open v] |
| Created: Feb 7, 2026 14:30 UTC                                     |
|                                                                     |
| +--- User Context -----------------------------------------------+ |
| | User: Jane Doe (jane@example.com)  [View User Profile]          | |
| | Plan: Pro  |  Status: Active  |  Credits: 37,550                | |
| | Related Job: abc12345 [View Job]                                 | |
| +----------------------------------------------------------------+ |
|                                                                     |
| +--- Conversation -----------------------------------------------+ |
| | (Same as user view, with admin messages attributed by name)     | |
| |                                                                 | |
| | [Internal Note] - Feb 8, 09:00 - Admin A                       | |
| | "Checked logs, this is a known issue with the anti-bot on..."   | |
| | (Shown with yellow background, labeled "Internal - Not visible  | |
| |  to user")                                                      | |
| +----------------------------------------------------------------+ |
|                                                                     |
| +--- Reply -------------------------------------------------------+ |
| | [Reply to User] [Add Internal Note]                             | |
| |                                                                 | |
| | [Type your reply...                                    ]        | |
| | [Attach files]                     [Send]                       | |
| +----------------------------------------------------------------+ |
|                                                                     |
| +--- Actions -----------------------------------------------------+ |
| | Assigned to: [Admin A v]  |  [Merge] [Close]                   | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### User Context Panel

A panel at the top of the ticket showing relevant user information:

| Field | Content | Action |
|-------|---------|--------|
| User name and email | Displayed prominently | "View User Profile" links to `/admin/users/{userId}` |
| Plan | User's current plan | Contextual: helps admin understand feature access |
| Account status | Active, Suspended, etc. | Contextual: identifies if account issues are related |
| Credit balance | Current credits | Contextual: helps with billing tickets |
| Related job | Job ID if provided at ticket creation | "View Job" links to admin job detail page |
| Recent jobs | "Last 5 jobs" expandable section | Quick glance at recent activity without navigating away |
| Account age | How long the user has had an account | Contextual |

### Internal Notes

Internal notes are messages visible only to admins, not to the user:

| Property | Detail |
|----------|--------|
| Visual distinction | Yellow/amber background, "Internal Note" label |
| Visibility | Visible to all admins. Never shown to the user in any context |
| Toggle | "Reply to User" / "Add Internal Note" toggle above the reply textarea |
| Use cases | Documenting investigation steps, sharing context between admins, noting related issues |

### Admin Reply

When an admin sends a reply to the user:

1. Admin selects "Reply to User" mode
2. Types reply in the textarea
3. Optionally attaches files (same limits as user: 3 files, 5 MB each)
4. Clicks "Send"
5. Reply appears in the conversation thread
6. Ticket status changes:
   - If status was "Open" or "Waiting on Response" → changes to "Waiting on User"
   - Other statuses: admin can manually set via the status dropdown
7. User receives email notification with the admin's reply text
8. User's ticket detail page shows the new message attributed to "Support Team"

### Priority and Status Changes

Admins can change priority and status directly from dropdowns on the ticket detail page:

| Change | Behavior |
|--------|----------|
| Priority change | Updates immediately. No notification to user. Audit-logged |
| Status change | Updates immediately. Certain status changes trigger user notifications (see below) |

**Status change notifications to user:**

| Status Change | User Notified |
|--------------|---------------|
| Any → Resolved | Yes: "Your ticket TKT-XXXXXX has been marked as resolved" |
| Any → Closed | Yes: "Your ticket TKT-XXXXXX has been closed" |
| Any → Waiting on User | Only if accompanied by a reply (the reply notification is sufficient) |
| All other changes | No user notification |

---

## 5. Ticket Assignment and Workflow

### Assignment

| Feature | Detail |
|---------|--------|
| Self-assign | Admin clicks "Assign to Me" to take ownership of a ticket |
| Assign to other | Admin selects another admin from the assignment dropdown |
| Unassign | Admin can set assignment to "Unassigned" to return a ticket to the general queue |
| Assignment notification | When assigned to another admin, that admin receives an in-app notification and (if configured) an email |
| Multiple admins | A ticket can only be assigned to one admin at a time |

### Ticket Merge

For duplicate tickets from the same user or related tickets:

1. Admin clicks "Merge" on a ticket
2. A modal appears:
   - Title: "Merge Ticket"
   - "Merge TKT-XXXXXX into:" with a ticket ID search field
   - Search returns matching tickets (by ID or subject)
   - Admin selects the target ticket
3. On merge:
   - All messages from the source ticket are appended to the target ticket (with a "Merged from TKT-XXXXXX" label)
   - The source ticket is closed with status "Closed (merged)"
   - A note is added to the source ticket: "Merged into TKT-YYYYYY"
   - The target ticket receives a note: "Merged from TKT-XXXXXX"
   - The user is notified: "Your tickets TKT-XXXXXX and TKT-YYYYYY have been merged. Please continue the conversation in TKT-YYYYYY."

### Ticket Workflow Summary

```
New Ticket
    |
    v
[Open] ----> Admin assigns to self
    |
    v
[In Progress] ----> Admin investigates, adds internal notes
    |
    v
Admin replies to user
    |
    v
[Waiting on User] ----> User replies
    |
    v
[Waiting on Response] ----> Admin responds again
    |                            |
    v                            v
[Resolved] (by admin or user)  (repeat as needed)
    |
    v
[Closed] (auto-close after 7 days, or manual)
```

---

## 6. Abuse Detection and Flagging

### Automated Abuse Detection

The platform monitors for patterns that may indicate Acceptable Use Policy violations:

| Signal | Detection Method | Threshold |
|--------|-----------------|-----------|
| High error rate | Per-user job failure rate exceeds normal | >50% failure rate over 100+ jobs in 24 hours |
| Excessive volume | Request rate far exceeds plan limits | >10x plan rate limit sustained for >1 hour |
| Blocked target scraping | Repeated attempts to scrape sites that consistently block | >20 blocked attempts to the same domain in 24 hours |
| Suspicious URL patterns | Jobs targeting login pages, payment forms, or personal data pages | Pattern matching on URL paths (configurable list) |
| Credit anomaly | Unusual credit consumption pattern | >3 standard deviations from the user's 30-day average |

### Manual Flagging

Admins can manually flag an account from the user detail page:

1. Admin clicks "Flag Account" on a user detail page
2. Modal:
   - Title: "Flag Account for Review"
   - Reason dropdown: "Suspected AUP Violation", "Unusual Activity", "Spam", "Other"
   - Notes field (required): describe the concern
   - Buttons: "Flag" (primary), "Cancel"
3. Account appears in the Flagged Accounts queue

### Flag States

| State | Description |
|-------|-------------|
| Flagged | Account flagged, awaiting admin review |
| Under Investigation | Admin is actively reviewing the account |
| Cleared | Investigation completed, no violation found. Flag removed |
| Action Taken | Violation confirmed, enforcement action applied |

---

## 7. Flagged Accounts Page

**Route**: `/admin/moderation`

### Flagged Accounts Table

```
+--- Flagged Accounts -----------------------------------------------+
| [Status: Flagged v]  [Reason: All v]                                |
|                                                                      |
| User           | Reason                | Flagged     | Status      | |
|----------------+-----------------------+-------------+-------------|  |
| jane@test.com  | High error rate       | 2 hours ago | Flagged     | |
| bob@spam.org   | Suspected AUP viol.   | 1 day ago   | Investigating| |
| ...            | ...                   | ...         | ...         | |
+----------------------------------------------------------------------+
```

### Table Columns

| Column | Content | Notes |
|--------|---------|-------|
| User | Name and email | Linked to user detail page |
| Reason | Flag reason category | From automated detection or manual flag |
| Flagged | When the flag was created | Relative time |
| Status | Flagged, Under Investigation, Cleared, Action Taken | Color-coded |
| Flagged By | "System" for automated, admin name for manual | Attribution |
| Actions | "Investigate", "Clear", "Take Action" | Contextual buttons |

### Filters

| Filter | Options |
|--------|---------|
| Status | All, Flagged (default), Under Investigation, Cleared, Action Taken |
| Reason | All, High Error Rate, Excessive Volume, Blocked Target, Suspicious URLs, Credit Anomaly, Suspected AUP Violation, Unusual Activity, Spam, Other |

---

## 8. Abuse Investigation Flow

When an admin clicks "Investigate" on a flagged account:

### Investigation Page

**Route**: `/admin/moderation/{flagId}`

```
+--- Investigation: jane@test.com ----------------------------------+
| Flag Reason: High error rate                                        |
| Flagged: Feb 8, 2026 09:00 UTC  |  By: System                      |
| Status: Under Investigation                                         |
|                                                                      |
| +--- Detection Details -------------------------------------------+ |
| | Signal: Job failure rate of 67% over 142 jobs in last 24 hours  | |
| | Threshold: >50% failure rate over 100+ jobs                     | |
| | Most failed domain: restricted-site.com (89 failures)           | |
| +----------------------------------------------------------------+ |
|                                                                      |
| +--- User Context -----------------------------------------------+ |
| | Plan: Pro  |  Joined: Jan 15, 2026  |  Status: Active           | |
| | Total Jobs (30d): 1,247  |  Credits Used: 34,500                | |
| | [View Full User Profile]                                        | |
| +----------------------------------------------------------------+ |
|                                                                      |
| +--- Recent Jobs (filtered to suspicious activity) ---------------+ |
| | [Table of recent jobs with high failure rate]                    | |
| | Columns: Job ID, URL, Status, Error Type, Engine, Time          | |
| +----------------------------------------------------------------+ |
|                                                                      |
| +--- Investigation Notes -----------------------------------------+ |
| | [Textarea for admin to document findings]                       | |
| | [Save Notes]                                                    | |
| +----------------------------------------------------------------+ |
|                                                                      |
| +--- Actions -----------------------------------------------------+ |
| | [Clear Flag]  [Warn User]  [Rate Limit]  [Suspend Account]     | |
| +----------------------------------------------------------------+ |
+----------------------------------------------------------------------+
```

### Investigation Components

| Section | Content |
|---------|---------|
| Detection Details | The specific signals and thresholds that triggered the flag. For automated flags, includes the raw data. For manual flags, includes the admin's notes |
| User Context | Key account information (plan, age, activity level) to help assess the situation |
| Recent Jobs | Filtered job history focusing on the suspicious activity. Sortable and filterable |
| Investigation Notes | Admin can document their findings during the investigation. Notes are saved and visible in the flag history |
| Actions | Enforcement actions available based on the severity of the finding |

---

## 9. Enforcement Actions

The enforcement ladder from 02-LEGAL-FRAMEWORK.md (Acceptable Use Policy) defines the escalation sequence:

### Enforcement Ladder

| Level | Action | Description | Reversible |
|-------|--------|-------------|------------|
| 1 | Warning | Email warning sent to the user describing the violation and asking them to stop | N/A (informational) |
| 2 | Rate Limit | Reduce the user's rate limit to a fraction of their plan's limit | Yes (admin can restore) |
| 3 | Temporary Suspension | Suspend the account for a defined period (24h, 7d, 30d) | Yes (auto-restores at end of period) |
| 4 | Permanent Suspension | Permanently suspend the account. API access permanently disabled | Yes (admin can manually unsuspend) |
| 5 | Legal Action | Reserved for extreme cases. Account permanently terminated, legal counsel involved | No |

### Warning Action

1. Admin clicks "Warn User"
2. Modal:
   - Title: "Send Warning to User"
   - Warning template (editable):
     - Subject: "Scrapifie Usage Warning"
     - Body template: "We have detected activity on your account that may violate our Acceptable Use Policy. Specifically: {description}. Please review our AUP at {link} and adjust your usage accordingly. Continued violations may result in account restrictions."
   - Admin can edit the description and add specific details
   - Buttons: "Send Warning" (primary), "Cancel"
3. On send:
   - Warning email sent to user
   - Flag status updated to "Action Taken"
   - Audit log entry: "Warning sent to {user} for {reason}"
   - Warning count on the user's admin profile is incremented
   - No change to account status or access

### Rate Limit Action

1. Admin clicks "Rate Limit"
2. Modal:
   - Title: "Apply Rate Limit Restriction"
   - Current rate limit: "{plan_limit} requests/minute"
   - New rate limit options: 50%, 25%, 10% of plan limit, or custom value
   - Duration: "Indefinite" or specific period (24h, 7d, 30d)
   - Notify user checkbox (default: checked)
   - Reason (required)
   - Buttons: "Apply Rate Limit" (destructive), "Cancel"
3. On confirmation:
   - Rate limit override applied to the user's account
   - If notification enabled: email sent to user explaining the restriction and reason
   - Flag status updated to "Action Taken"
   - Audit log entry created

### Suspension Actions

Suspension uses the same flow as described in 12-ADMIN-DASHBOARD.md, Section 7 (Admin Actions on Users — Suspension Flow). The moderation page provides direct access to the same suspension mechanism with the abuse context pre-filled.

### Enforcement History

Each user's admin detail page includes an enforcement history section showing:

| Field | Content |
|-------|---------|
| Date | When the action was taken |
| Action | Warning, Rate Limit, Suspension, etc. |
| Reason | Admin-provided reason |
| Admin | Which admin took the action |
| Duration | If applicable, how long the restriction lasted |
| Status | Active, Expired, Manually Reversed |

This history helps admins understand the user's compliance record when handling new flags.

---

## 10. Blog and Content Management

### Blog Post Management

**Route**: `/admin/content/blog`

Admins manage blog posts that appear on the public website (01-PUBLIC-WEBSITE.md).

### Blog Post List

| Column | Content | Notes |
|--------|---------|-------|
| Title | Post title | Linked to edit page |
| Author | Admin who created the post | |
| Status | Draft, Published, Archived | Color-coded badge |
| Published Date | Date published (or "--" for drafts) | |
| Tags | Tag list | |
| Views | View count (if analytics tracked) | |

### Blog Post Editor

**Route**: `/admin/content/blog/new` or `/admin/content/blog/{postSlug}/edit`

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Title | Text input | 5-200 characters | Yes |
| Slug | Auto-generated from title, editable | 5-100 characters, unique, URL-safe | Yes |
| Content | Markdown editor with preview | Minimum 100 characters | Yes |
| Excerpt | Textarea | 50-300 characters. Used in blog listing and meta description | Yes |
| Cover Image | Image upload | Max 5 MB, JPG/PNG/WebP. Displayed at the top of the post and in listings | No |
| Tags | Tag input (comma-separated or chip-based) | 1-5 tags, each 2-30 characters | Yes (at least 1) |
| Author Display Name | Text input | Defaults to admin's name | Yes |
| Status | Dropdown | Draft, Published | Yes |
| Published Date | Date picker | Defaults to now when publishing. Can be set to a future date for scheduled publishing | Yes (when status is Published) |

### Markdown Editor Features

| Feature | Detail |
|---------|--------|
| Split view | Editor on left, rendered preview on right |
| Toolbar | Bold, italic, headings, links, images, code blocks, lists, blockquotes |
| Image upload | Drag-and-drop or upload button. Images stored in object storage. Markdown image syntax auto-inserted |
| Code blocks | Syntax-highlighted in preview |
| Auto-save | Draft auto-saved every 60 seconds to prevent data loss |
| Word count | Displayed below the editor |

### Blog Post Lifecycle

```
Draft ----> Published ----> Archived
  ^              |
  |              v
  +--- Edit (returns to Draft if unpublished)
```

- **Draft**: Not visible on the public website. Can be previewed by admin
- **Published**: Visible on the public website at `/blog/{slug}`
- **Archived**: Removed from the blog listing but accessible via direct URL (shows "This post has been archived" notice)

### Status Page Management

**Route**: `/admin/content/status`

Admins manage the status page (01-PUBLIC-WEBSITE.md) showing service health:

| Field | Type | Description |
|-------|------|-------------|
| Overall Status | Dropdown: All Systems Operational, Partial Outage, Major Outage, Maintenance | Shown prominently on the status page |
| Service Statuses | Per-service status toggles for: API, HTTP Engine, Browser Engine, Stealth Engine, Dashboard, Queue Processing | Each can be: Operational, Degraded, Down, Maintenance |
| Incident | Create a new incident with: title, description (markdown), severity (minor, major, critical), affected services | Shown in the incident history on the status page |
| Incident Update | Add updates to an existing incident | Timestamped updates showing progress toward resolution |
| Scheduled Maintenance | Create maintenance windows with: title, description, start time, estimated duration, affected services | Shown as upcoming on the status page |

### Incident Lifecycle

| State | Description |
|-------|-------------|
| Investigating | Initial state when incident is created |
| Identified | Root cause has been identified |
| Monitoring | Fix has been applied, monitoring for stability |
| Resolved | Incident is resolved. Post-mortem can be added |

Each state transition creates a timestamped update on the status page.

---

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin responds to a ticket and the user simultaneously submits a reply | Both messages are appended chronologically. The admin sees the user's new reply on their next page load or refresh |
| Two admins try to assign the same ticket to themselves | The second assignment overwrites the first. The first admin sees the change on refresh. Audit log captures both assignment events |
| Automated flag triggers on an admin account | Admins are not exempt from abuse detection. The flag appears in the moderation queue. However, the flag clearly indicates "Admin account" to prevent accidental enforcement |
| User submits a ticket about an enforcement action they received | Ticket is created normally. Admin can see the enforcement history in the user context panel to understand the background |
| Blog post slug conflicts with an existing page route | Slug uniqueness is enforced within blog posts. Blog posts are all under `/blog/{slug}` so they cannot conflict with other routes |
| Incident created with no affected services | Allowed (for general announcements). The status page shows the incident without highlighting specific services |
| Ticket merged into a closed ticket | The target ticket is reopened (status changed to "Open"). The merged messages are appended |
| Flag cleared but the same signals trigger again within 24 hours | A new flag is created with a note: "Re-flagged: previously cleared on {date} by {admin}". This prevents automated flags from being repeatedly created and cleared without addressing the root cause |
| Admin sends a reply to a ticket from a deleted user | Allowed (for record-keeping). The reply is saved but no email notification is sent (email address is anonymized on deletion) |

---

## 12. Related Documents

| Document | Relationship |
|----------|-------------|
| 01-PUBLIC-WEBSITE.md | Blog and status page that admin manages |
| 02-LEGAL-FRAMEWORK.md | Acceptable Use Policy enforcement ladder |
| 11-SETTINGS-AND-SUPPORT.md | User-facing support ticket system |
| 12-ADMIN-DASHBOARD.md | Admin layout, user management, audit log |
| 18-DATA-MODELS.md | Ticket, flag, blog post, incident data schemas |
| APPENDICES/B-EMAIL-TEMPLATES.md | Warning and enforcement email templates |
