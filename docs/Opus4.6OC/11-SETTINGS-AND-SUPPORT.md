# ScraperX Settings and Support

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-011 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 03-AUTHENTICATION.md, 05-USER-DASHBOARD.md, 09-BILLING-AND-CREDITS.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Settings and Support Overview](#1-settings-and-support-overview)
2. [Settings Page Layout](#2-settings-page-layout)
3. [Profile Settings](#3-profile-settings)
4. [Security Settings](#4-security-settings)
5. [Notification Preferences](#5-notification-preferences)
6. [Appearance Settings](#6-appearance-settings)
7. [Account Deletion](#7-account-deletion)
8. [Support System Overview](#8-support-system-overview)
9. [Support Ticket Creation](#9-support-ticket-creation)
10. [Support Ticket List](#10-support-ticket-list)
11. [Support Ticket Detail](#11-support-ticket-detail)
12. [Knowledge Base Integration](#12-knowledge-base-integration)
13. [Support Notifications](#13-support-notifications)
14. [Empty and Error States](#14-empty-and-error-states)
15. [Edge Cases](#15-edge-cases)
16. [Related Documents](#16-related-documents)

---

## 1. Settings and Support Overview

The Settings section allows users to manage their personal account information, security configuration, notification preferences, and appearance. The Support section provides a ticket-based system for users to request help, report issues, and ask billing questions.

Both sections are accessible from the dashboard sidebar and are available to all authenticated users regardless of plan.

---

## 2. Settings Page Layout

**Route**: `/dashboard/settings`

The settings page uses a tabbed layout within the main dashboard content area.

```
+------------------------------------------------------------------+
| Sidebar |  Settings                                                |
|         |                                                         |
|  [nav]  |  [Profile] [Security] [Notifications] [Appearance]      |
|         |                                                         |
|         |  +--- Active Tab Content ----------------------------+ |
|         |  |                                                    | |
|         |  | (Content varies by selected tab)                   | |
|         |  |                                                    | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Danger Zone -----------------------------------+ |
|         |  | [Delete Account]                                   | |
|         |  +--------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Tab Navigation

| Tab | Route | Description |
|-----|-------|-------------|
| Profile | `/dashboard/settings` (default) | Name, email, avatar, timezone |
| Security | `/dashboard/settings/security` | Password, MFA, active sessions |
| Notifications | `/dashboard/settings/notifications` | Email notification preferences |
| Appearance | `/dashboard/settings/appearance` | Theme, density, language |

- Active tab is visually highlighted with an underline or background color
- Tab selection updates the URL for direct linking and browser history
- On mobile (below 768px), tabs collapse into a dropdown selector

---

## 3. Profile Settings

### Profile Form

| Field | Type | Current Value Display | Validation | Notes |
|-------|------|----------------------|-----------|-------|
| Full Name | Text input | Pre-filled with current name | 1-100 characters, required | Used in UI header, emails, and attribution |
| Email Address | Text input (read-only display + change button) | Shows current email | Valid email format | Changing email requires verification (see below) |
| Avatar | Image upload area | Shows current avatar or initials fallback | Max 2 MB, JPG/PNG only, minimum 100x100px | Cropped to square, stored at 256x256 |
| Timezone | Dropdown select | Pre-selected with current timezone | Must be a valid IANA timezone | Affects all timestamp displays in the dashboard |
| Date Format | Dropdown select | Pre-selected | "MMM D, YYYY" (default), "DD/MM/YYYY", "YYYY-MM-DD" | Affects date display across the dashboard |

### Save Behavior

- A "Save Changes" button appears at the bottom of the form
- The button is disabled until the user modifies at least one field
- On save: POST request to the API. On success: toast "Settings saved". On failure: inline error message
- No auto-save. Changes are only persisted when the user explicitly clicks "Save Changes"

### Email Change Flow

Changing the email address is a sensitive operation with its own flow:

1. User clicks "Change Email" next to their current email address
2. A modal appears:
   - Title: "Change Email Address"
   - Current email displayed (read-only)
   - New email field (text input, required, valid email format)
   - Current password field (required for identity verification)
   - Buttons: "Send Verification" (primary), "Cancel"
3. User enters new email and current password, clicks "Send Verification"
4. Server validates:
   - Password is correct
   - New email is not already registered to another account
   - New email is different from current email
5. Verification email sent to the NEW email address:
   - Subject: "Verify Your New Email Address - ScraperX"
   - Body: "Click the link below to confirm changing your email to {new_email}. This link expires in 24 hours."
   - CTA: "Verify Email" linking to verification endpoint
6. Until the new email is verified:
   - The current email remains active
   - A notice appears on the profile tab: "A verification email was sent to {new_email}. Your email will not change until you verify the new address."
   - A "Cancel Change" link allows the user to cancel the pending change
   - A "Resend Verification" link allows resending (rate limited to 3 resends per pending change)
7. When the user clicks the verification link:
   - Email is updated to the new address
   - All active sessions are preserved (no forced logout)
   - Confirmation email sent to BOTH the old and new email addresses
   - Old email: "Your email address on ScraperX has been changed to {new_email}. If you did not make this change, contact support immediately."
   - New email: "Your email address has been successfully updated."

### Avatar Upload

| Step | Detail |
|------|--------|
| Upload trigger | Clicking the avatar area or a "Change Avatar" link |
| File selection | Native file picker, filtered to image types (JPG, PNG) |
| Size limit | Maximum 2 MB. Error: "Image must be smaller than 2 MB" |
| Format validation | Only JPG and PNG accepted. Error: "Only JPG and PNG images are supported" |
| Dimension validation | Minimum 100x100 pixels. Error: "Image must be at least 100x100 pixels" |
| Cropping | After selection, a crop tool appears allowing the user to select a square area of the image |
| Preview | Cropped preview shown before saving |
| Storage | Uploaded to object storage (e.g., S3-compatible). URL stored in user profile |
| Removal | A "Remove Avatar" option appears when an avatar is set. Reverts to initials fallback |
| Fallback | When no avatar is set, a circle with the user's initials on a generated background color is displayed |

---

## 4. Security Settings

**Route**: `/dashboard/settings/security`

### Password Change

| Field | Type | Validation |
|-------|------|-----------|
| Current Password | Password input | Required, must match current password |
| New Password | Password input with strength indicator | Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |
| Confirm New Password | Password input | Must match New Password |

**Password Change Flow:**

1. User fills in all three fields
2. Clicks "Update Password"
3. Server validates current password
4. If current password is incorrect: inline error "Current password is incorrect"
5. If new password does not meet requirements: inline error with specific requirement that failed
6. If new password matches current password: inline error "New password must be different from current password"
7. On success:
   - Password is updated (hashed with bcrypt/argon2)
   - All other active sessions are invalidated (the current session is preserved)
   - Confirmation email: "Your password has been changed. If you did not make this change, reset your password immediately."
   - Toast: "Password updated successfully"

### Password Strength Indicator

Displayed below the "New Password" field as a colored bar:

| Strength | Bar Color | Bar Fill | Label |
|----------|-----------|----------|-------|
| Very Weak | Red | 20% | "Very Weak" |
| Weak | Orange | 40% | "Weak" |
| Fair | Yellow | 60% | "Fair" |
| Strong | Light green | 80% | "Strong" |
| Very Strong | Green | 100% | "Very Strong" |

Strength is calculated based on: length, character variety, common password check, and entropy estimation.

### Multi-Factor Authentication (MFA)

**MFA Status Display:**

If MFA is not enabled:
```
+--- Two-Factor Authentication ------------------------------------+
| Status: Not Enabled                                                |
| Add an extra layer of security to your account using an            |
| authenticator app.                                                 |
| [Enable Two-Factor Authentication]                                 |
+--------------------------------------------------------------------+
```

If MFA is enabled:
```
+--- Two-Factor Authentication ------------------------------------+
| Status: Enabled                                                    |
| Two-factor authentication is active on your account.               |
| Backup codes remaining: 7 of 10                                   |
| [Regenerate Backup Codes]  [Disable Two-Factor Authentication]     |
+--------------------------------------------------------------------+
```

MFA setup and management flows are fully described in 03-AUTHENTICATION.md, Section 6.

### Active Sessions

```
+--- Active Sessions -----------------------------------------------+
| Current Session                                                     |
| Chrome on Linux - 192.168.1.xxx                                    |
| Last active: Now                                          [Current] |
|                                                                     |
| Other Sessions                                                      |
| Firefox on Windows - 10.0.0.xxx                                    |
| Last active: 2 hours ago                             [Revoke]      |
|                                                                     |
| Safari on macOS - 172.16.xxx.xxx                                   |
| Last active: 1 day ago                               [Revoke]      |
|                                                                     |
| [Revoke All Other Sessions]                                         |
+---------------------------------------------------------------------+
```

**Session Display Fields:**

| Field | Content | Source |
|-------|---------|-------|
| Browser | Browser name and version | User-Agent header parsing |
| Operating System | OS name | User-Agent header parsing |
| IP Address | Last known IP (partially masked: last octet replaced with "xxx") | Request IP |
| Last Active | Relative timestamp | Last API request from this session |
| Location | City, Country (approximate) | IP geolocation lookup |

**Session Actions:**

| Action | Behavior |
|--------|----------|
| Revoke (individual) | Invalidates the selected session. If the user has that session open in another tab, their next request will return 401 and they are redirected to login |
| Revoke All Other Sessions | Invalidates all sessions except the current one. Confirmation modal: "Revoke all other sessions? Users on those sessions will need to log in again." |
| Current session indicator | The current session is labeled "(Current)" and cannot be revoked from this page. To end the current session, use the Logout option in the user menu |

---

## 5. Notification Preferences

**Route**: `/dashboard/settings/notifications`

### Email Notification Categories

| Category | Description | Default | Can Disable |
|----------|-------------|---------|-------------|
| Security Alerts | Password changes, new login from unknown device, MFA changes | On | No (always sent) |
| Billing | Payment receipts, failed payments, plan changes | On | No (always sent) |
| Credit Alerts | Credit usage thresholds (50%, 75%, 90%, 100%) | On | Yes |
| Job Failures | Notification when a job fails (batched, not per-job) | Off | Yes |
| Product Updates | New features, platform updates, maintenance notices | On | Yes |
| Tips and Guides | Onboarding tips, best practices, optimization suggestions | On | Yes |

### Notification Preferences Form

```
+--- Email Notifications -------------------------------------------+
|                                                                    |
| Security Alerts                                        [Always On] |
| Password changes, login alerts, MFA changes                        |
|                                                                    |
| Billing Notifications                                  [Always On] |
| Payment receipts, failed payments, plan changes                    |
|                                                                    |
| Credit Usage Alerts                                    [On / Off]  |
| Notifications when credit usage reaches 50%, 75%, 90%, 100%       |
|                                                                    |
| Job Failure Digests                                    [On / Off]  |
| Daily summary of failed jobs (sent only on days with failures)     |
|                                                                    |
| Product Updates                                        [On / Off]  |
| New features and platform announcements                            |
|                                                                    |
| Tips and Guides                                        [On / Off]  |
| Optimization tips and best practices                               |
|                                                                    |
| [Save Preferences]                                                 |
+--------------------------------------------------------------------+
```

### Notification Rules

| Rule | Detail |
|------|--------|
| Mandatory notifications | Security and Billing notifications cannot be disabled. These are required for account security and financial transparency |
| Batch frequency | Job failure notifications are batched into a daily digest (sent once per day at a fixed time, e.g., 09:00 UTC) rather than per-job to avoid notification fatigue |
| Unsubscribe link | Every non-mandatory email includes an unsubscribe link in the footer that toggles that specific category off |
| Global unsubscribe | No global unsubscribe option. Users can disable individual optional categories but cannot disable mandatory notifications |
| Preference changes | Take effect immediately. No confirmation needed |

---

## 6. Appearance Settings

**Route**: `/dashboard/settings/appearance`

### Theme Selection

| Option | Description |
|--------|-------------|
| Light | Light background, dark text. Default for new accounts |
| Dark | Dark background, light text |
| System | Follows the operating system's preference (prefers-color-scheme media query) |

**Theme Implementation:**
- Theme is applied via CSS custom properties (variables) on the root element
- Theme preference is stored per user in the database and in a cookie for pre-render application
- Theme changes take effect immediately without page reload
- All charts, code blocks, and UI elements have theme-appropriate variants

### Display Density

| Option | Description |
|--------|-------------|
| Comfortable (default) | Standard spacing and sizing. Optimized for readability |
| Compact | Reduced padding and margins. Shows more content per screen. Useful for power users with large datasets |

### Language

| Option | Description |
|--------|-------------|
| English (default) | MVP language. All UI text, error messages, and system notifications in English |

Future: additional languages can be added via i18n framework. The settings page will show a language dropdown when multiple languages are supported.

### Save Behavior

Appearance settings are saved immediately on change (no "Save" button needed). Each setting uses a toggle or radio group that persists the choice as soon as the user interacts with it.

---

## 7. Account Deletion

The account deletion option appears in a "Danger Zone" section at the bottom of the settings page, visually separated with a red/warning border.

### Danger Zone Display

```
+--- Danger Zone ---------------------------------------------------+
| Delete Your Account                                                |
| Permanently delete your account and all associated data. This      |
| action cannot be undone.                                           |
| [Delete Account]                                                   |
+--------------------------------------------------------------------+
```

### Deletion Flow

1. User clicks "Delete Account"
2. First confirmation modal:
   - Title: "Delete Your Account?"
   - Body: "This will permanently delete your account and all associated data. This action cannot be undone."
   - What will be deleted:
     - "Your profile and settings"
     - "All API keys (immediately revoked)"
     - "Job history and results"
     - "Billing information and invoices"
     - "Any active subscription will be cancelled"
   - What will NOT be deleted:
     - "Anonymized analytics data may be retained for platform improvement"
   - Buttons: "Continue" (destructive), "Cancel"
3. Second confirmation step (same modal, updated content):
   - Type-to-confirm: "Type DELETE to confirm"
   - Current password field (required)
   - Buttons: "Permanently Delete Account" (destructive), "Cancel"
4. Server processing:
   - Validates password
   - If user has an active paid subscription:
     - Subscription is cancelled immediately (no end-of-cycle grace period)
     - No refund for remaining billing cycle (stated in Terms of Service)
   - If user has running jobs:
     - Active jobs are allowed to complete (best effort)
     - No new jobs can be submitted
   - All API keys are immediately revoked
   - All active sessions are invalidated
   - Account is soft-deleted:
     - User record marked as deleted with a timestamp
     - Email address is anonymized (to allow re-registration with the same email)
     - Personal data is cleared (name, avatar, etc.)
     - Job data, logs, and results are retained for the standard retention period, then purged
   - Confirmation email sent to the user's email: "Your ScraperX account has been deleted."
5. User is logged out and redirected to the home page
6. Toast: "Your account has been deleted."

### Deletion Restrictions

| Condition | Behavior |
|-----------|----------|
| User is an organization owner (future) | Must transfer ownership before deleting personal account |
| User has pending refund | Deletion is allowed. Pending refund continues to process |
| User has failed payment/outstanding balance | Deletion is allowed. Outstanding balance is written off (no collections for SaaS subscriptions at this scale) |
| OAuth-only account (no password) | Confirmation modal uses OAuth re-authentication instead of password input |

### Data Retention After Deletion

| Data Type | Retention After Deletion | Reason |
|-----------|------------------------|--------|
| Anonymized user record | Indefinite | Prevents re-use of soft-deleted UUIDs, maintains referential integrity |
| Job metadata (anonymized) | 90 days | May be referenced in admin analytics |
| Job results and logs | Standard retention period (30/90 days) then purged | No early purge to avoid complex immediate deletion logic |
| Invoices | 7 years (anonymized) | Financial record-keeping requirements |
| Audit log entries | 1 year | Security and compliance |

---

## 8. Support System Overview

The support system provides a ticket-based interface for users to contact the ScraperX team for help with technical issues, billing questions, account problems, and feature requests.

### Support Design Principles

| Principle | Implementation |
|-----------|---------------|
| Self-service first | Before creating a ticket, users are guided toward relevant documentation and FAQs |
| Categorized | Tickets are categorized by type so they can be routed to the appropriate admin |
| Asynchronous | All support is ticket-based (no live chat in MVP). Responses are delivered via email and in-app |
| Transparent | Users can see the full history of their tickets and current status |
| Accountable | Each ticket has a status, a timestamp, and (when assigned) an admin owner |

---

## 9. Support Ticket Creation

**Route**: `/dashboard/support/new`

### Ticket Creation Form

```
+--- Contact Support -----------------------------------------------+
|                                                                    |
| Before submitting a ticket, check if your question is answered     |
| in our documentation: [View Documentation]                         |
|                                                                    |
| Category *                                                         |
| [Select a category...                                    v]        |
|                                                                    |
| Subject *                                                          |
| [Brief description of your issue...                      ]        |
|                                                                    |
| Priority                                                           |
| [Normal v]                                                         |
|                                                                    |
| Description *                                                      |
| [Describe your issue in detail...                        ]        |
| [                                                        ]        |
| [                                                        ]        |
|                                                                    |
| Attachments                                                        |
| [Drag files here or click to upload]  Max 3 files, 5 MB each      |
|                                                                    |
| Related Job ID (optional)                                          |
| [Paste a job ID if your issue relates to a specific job  ]        |
|                                                                    |
| [Submit Ticket]                                                    |
+--------------------------------------------------------------------+
```

### Form Fields

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Category | Dropdown | Must select one | Yes |
| Subject | Text input | 5-200 characters | Yes |
| Priority | Dropdown | Normal (default), High, Urgent | No (defaults to Normal) |
| Description | Textarea | 20-5000 characters | Yes |
| Attachments | File upload | Max 3 files, max 5 MB each, allowed types: JPG, PNG, GIF, PDF, TXT, JSON, CSV | No |
| Related Job ID | Text input | Must be a valid UUID format if provided. Server validates the job belongs to the user | No |

### Ticket Categories

| Category | Description | Auto-tags |
|----------|-------------|-----------|
| Technical Issue | Problem with API, scraping results, or platform functionality | technical |
| Billing Question | Payment, invoices, credits, plan changes | billing |
| Account Issue | Login problems, email changes, security concerns | account |
| Feature Request | Suggestions for new features or improvements | feature |
| Bug Report | Reporting a bug or unexpected behavior | bug |
| General Inquiry | Anything that does not fit other categories | general |

### Priority Levels

| Priority | Description | Response Target |
|----------|-------------|----------------|
| Normal | Non-urgent questions and requests | Within 2 business days |
| High | Issues affecting productivity | Within 1 business day |
| Urgent | Service outage or security issue | Within 4 hours |

Note: Response targets are goals, not SLAs (no contractual obligation in MVP). Enterprise plans may include SLA-backed response times in the future.

### Submission Flow

1. User fills in the form and clicks "Submit Ticket"
2. Client-side validation runs. If any required field is missing or invalid, inline errors appear
3. Server creates the ticket:
   - Generates a ticket ID (format: TKT-XXXXXX, where X is an alphanumeric character, 6 characters)
   - Sets status to "open"
   - Associates with the user's account
   - If a related job ID was provided and validated, links the job to the ticket
   - Stores attachments in object storage
4. Confirmation:
   - Toast: "Support ticket submitted successfully"
   - User is redirected to the ticket detail page
   - Confirmation email: "We received your support request (TKT-XXXXXX). We will respond within {response_target}."
5. Admin notification:
   - New ticket appears in the admin support queue (14-ADMIN-MODERATION.md)
   - If priority is Urgent, an additional alert is sent to the admin notification channel

### Rate Limiting

| Limit | Value | Error Message |
|-------|-------|---------------|
| Tickets per hour | 5 | "You have submitted too many tickets recently. Please wait before submitting another." |
| Tickets per day | 10 | "Daily ticket limit reached. Please continue in an existing ticket or try again tomorrow." |
| Attachments total size per ticket | 15 MB | "Total attachment size exceeds 15 MB. Please reduce file sizes." |

---

## 10. Support Ticket List

**Route**: `/dashboard/support`

### Ticket List Display

```
+--- Support Tickets -----------------------------------------------+
| [New Ticket]                                     Showing 1-10 of 8 |
|                                                                     |
| [Status: All v]  [Category: All v]                                  |
|                                                                     |
| TKT-ABC123 | Technical Issue                                       |
| "Stealth engine returning empty results for target.com"             |
| Status: Waiting on Response  |  Priority: High  |  Feb 7, 2026     |
|---------------------------------------------------------------------|
| TKT-DEF456 | Billing Question                                      |
| "Question about prorated charges on upgrade"                        |
| Status: Open  |  Priority: Normal  |  Feb 5, 2026                  |
|---------------------------------------------------------------------|
| TKT-GHI789 | Feature Request                                       |
| "Support for custom headers in Stealth engine"                      |
| Status: Closed  |  Priority: Normal  |  Jan 28, 2026               |
|---------------------------------------------------------------------|
| ...                                                                 |
+---------------------------------------------------------------------+
| [< Prev]  Page 1 of 1  [Next >]                                    |
+---------------------------------------------------------------------+
```

### List Card Content

Each ticket in the list shows:

| Element | Content |
|---------|---------|
| Ticket ID | TKT-XXXXXX format, displayed prominently |
| Category | Category label |
| Subject | Full subject line |
| Status | Current ticket status with colored indicator |
| Priority | Priority level |
| Date | Creation date (relative for recent, absolute for older) |
| Unread indicator | A dot or badge if there are unread responses from the admin |

### Ticket Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Open | Blue | Ticket submitted, awaiting admin response |
| In Progress | Yellow | Admin is actively working on the issue |
| Waiting on User | Orange | Admin has responded and is waiting for user input |
| Waiting on Response | Purple | User has responded and is waiting for admin |
| Resolved | Green | Issue has been resolved (user or admin marked as resolved) |
| Closed | Gray | Ticket is closed (automatically after resolution or manually) |

### Filters

| Filter | Options |
|--------|---------|
| Status | All (default), Open, In Progress, Waiting on User, Waiting on Response, Resolved, Closed |
| Category | All (default), Technical Issue, Billing Question, Account Issue, Feature Request, Bug Report, General Inquiry |

### Pagination

| Property | Value |
|----------|-------|
| Page size | 10 tickets per page |
| Sorting | Newest first (most recent activity, not creation date) |

---

## 11. Support Ticket Detail

**Route**: `/dashboard/support/{ticketId}`

### Ticket Detail Layout

```
+--- TKT-ABC123 ----------------------------------------------------+
| < Back to Tickets                                                   |
|                                                                     |
| Subject: Stealth engine returning empty results for target.com      |
| Category: Technical Issue  |  Priority: High  |  Status: Open      |
| Created: Feb 7, 2026 14:30 UTC                                     |
| Related Job: abc12345 (link)                                        |
|                                                                     |
| +--- Conversation -----------------------------------------------+ |
| |                                                                 | |
| | You - Feb 7, 2026 14:30                                        | |
| | I am getting empty results when using the Stealth engine on     | |
| | target.com. The job completes successfully but the response     | |
| | body is empty. Job ID: abc12345. I have tried...                | |
| |                                                                 | |
| | Attachments: screenshot.png (120 KB) [Download]                 | |
| |                                                                 | |
| |-----------------------------------------------------------------| |
| |                                                                 | |
| | Support Team - Feb 7, 2026 16:45                                | |
| | Thank you for reaching out. I have looked at the job logs and   | |
| | it appears the target site is using a new anti-bot measure...   | |
| |                                                                 | |
| |-----------------------------------------------------------------| |
| |                                                                 | |
| | You - Feb 8, 2026 09:00                                        | |
| | I tried the suggestion and it worked. However, I noticed...     | |
| |                                                                 | |
| +----------------------------------------------------------------+ |
|                                                                     |
| +--- Reply -------------------------------------------------------+ |
| | [Type your reply...                                    ]        | |
| | [                                                      ]        | |
| | [Attach files]                     [Send Reply]                 | |
| +----------------------------------------------------------------+ |
|                                                                     |
| [Mark as Resolved]                                                  |
+---------------------------------------------------------------------+
```

### Conversation Thread

| Element | Description |
|---------|-------------|
| Messages | Displayed chronologically (oldest first) |
| Author | "You" for user messages, "Support Team" for admin responses |
| Timestamp | Full timestamp with timezone |
| Attachments | Listed below each message with filename, size, and download link |
| Formatting | Messages support basic markdown (bold, italic, code blocks, links). Rendered for display |

### Reply Form

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Reply text | Textarea | 1-5000 characters | Yes (to submit) |
| Attachments | File upload | Same rules as ticket creation (max 3 files, 5 MB each) | No |

### Reply Submission

1. User types reply and optionally attaches files
2. Clicks "Send Reply"
3. Reply is appended to the conversation thread
4. Ticket status changes:
   - If status was "Waiting on User" → changes to "Waiting on Response"
   - If status was "Resolved" or "Closed" → changes to "Waiting on Response" (reopens the ticket)
   - Other statuses remain unchanged
5. Admin is notified of the new reply
6. Toast: "Reply sent"

### Mark as Resolved

- A "Mark as Resolved" button appears below the conversation
- Clicking it sets the ticket status to "Resolved"
- Confirmation toast: "Ticket marked as resolved"
- Admin is notified
- The ticket can be reopened by sending another reply

### Auto-Close

- Tickets in "Resolved" status are automatically closed after 7 days of inactivity
- Tickets in "Waiting on User" status are automatically closed after 14 days of no user response
- Before auto-closing a "Waiting on User" ticket, a reminder email is sent at day 7: "We're waiting for your response on ticket TKT-XXXXXX. This ticket will be automatically closed in 7 days if no response is received."
- Auto-closed tickets can be reopened by the user via a new reply

---

## 12. Knowledge Base Integration

Before and during ticket creation, the support system guides users toward self-service solutions.

### Pre-Ticket Suggestions

When the user navigates to `/dashboard/support/new`:

1. A banner at the top suggests checking documentation first: "Before submitting a ticket, check if your question is answered in our documentation."
2. As the user types in the Subject field, a live suggestion panel appears below the field:
   - Searches the documentation portal (17-DOCS-PORTAL.md) for relevant articles
   - Displays up to 3 matching articles with titles and brief excerpts
   - Each article links to the docs portal in a new tab
   - If the user finds their answer, they can leave the form without submitting
3. The suggestions are client-side debounced (300ms) and only trigger after 5 characters

### Common Issues Section

On the support landing page (`/dashboard/support`), below the ticket list, a "Common Issues" section displays:

| Article | Description |
|---------|-------------|
| "Getting empty results?" | Link to troubleshooting guide in docs |
| "Understanding credit charges" | Link to billing documentation |
| "API key authentication errors" | Link to API key setup guide |
| "Rate limiting and throttling" | Link to rate limit documentation |

These are manually curated links maintained by the admin team and served from the CMS or a static configuration.

---

## 13. Support Notifications

### User Notifications

| Event | Email | In-App |
|-------|-------|--------|
| Ticket submitted | Confirmation email with ticket ID and response target | Toast on submission |
| Admin responds | Email with response text and link to ticket | Unread badge on Support nav item, dot on ticket in list |
| Ticket status changes | Email with new status | Updated status in ticket list and detail page |
| Ticket auto-close warning | Reminder email (7 days before auto-close) | No in-app notification |
| Ticket auto-closed | Email notification | Status updated in list |

### Admin Notifications

| Event | Notification |
|-------|-------------|
| New ticket created | Appears in admin support queue. Urgent tickets trigger additional alerts |
| User replies to ticket | Ticket moves to "Waiting on Response" in admin queue |
| Ticket reopened | Reappears in active admin queue |

### Unread Indicator

- The "Support" item in the dashboard sidebar shows a badge count of tickets with unread admin responses
- When the user views a ticket with unread responses, the unread status is cleared
- The badge count updates on each dashboard page load (not real-time polling for support)

---

## 14. Empty and Error States

### Empty States

| Scenario | Message | CTA |
|----------|---------|-----|
| No support tickets | "No support tickets yet. If you need help, we are here for you." | "Create a Ticket" button |
| No tickets match filters | "No tickets match your current filters." | "Clear filters" link |
| Ticket conversation is empty | This should not occur (tickets require a description). If it somehow happens: "No messages in this ticket." | None |

### Error States

| Scenario | Message | Recovery |
|----------|---------|----------|
| Ticket list fails to load | "Unable to load support tickets. Please try again." | "Retry" button |
| Ticket detail fails to load | "Unable to load ticket details. The ticket may not exist." | "Back to Tickets" link |
| Ticket submission fails | "Unable to submit ticket. Please try again." | Form retains user input, "Try Again" button |
| Reply submission fails | "Unable to send reply. Please try again." | Reply text preserved in the input field |
| File upload fails | "Unable to upload file: {reason}" | User can retry the file upload |
| Settings save fails | "Unable to save settings. Please try again." | "Retry" button or manual re-save |
| Password change fails (server error) | "Unable to update password. Please try again." | Form retains input (except password fields, which are cleared for security) |
| Avatar upload fails | "Unable to upload avatar: {reason}" | User can retry |
| Email change verification fails | "Verification link is invalid or expired. Request a new verification email." | "Resend Verification" link |

---

## 15. Edge Cases

| Scenario | Handling |
|----------|----------|
| User changes email while a support ticket is open | Ticket remains associated with the account (via account ID, not email). Support responses go to the new email |
| User deletes account with open support tickets | Open tickets are marked as "Closed" with a note: "Account deleted." No further replies are accepted |
| User submits a ticket about a job that has since been purged (data retention) | The related job ID link shows: "Job data is no longer available (retention period expired)." Ticket itself is unaffected |
| Admin responds to a ticket while the user is composing a reply | The admin response appears when the user submits their reply (conversation refreshes on reply submission). No real-time push of admin messages |
| User submits duplicate tickets | Each ticket is created independently. Admin may merge related tickets manually (admin feature, see 14-ADMIN-MODERATION.md) |
| User changes timezone and existing ticket timestamps look different | Timestamps in ticket conversation are stored as UTC and displayed in the user's current timezone setting. Changing timezone updates the display retroactively |
| User's session expires while composing a long reply | On submission, the 401 response redirects to login. After login, the user is returned to the ticket page. The reply text may be lost (standard browser behavior). A future enhancement could use localStorage to preserve draft replies |
| File upload partially fails (1 of 3 files) | The ticket is submitted with the successfully uploaded files. An error toast indicates which file failed. User can add the missing attachment by replying to the ticket |
| User tries to access another user's ticket by guessing the ticket ID | Server returns 403 (access denied). UI shows: "You do not have permission to view this ticket." |
| MFA disabled while password change is in progress | The operations are independent. Password change completes normally. MFA change completes normally. No interaction between them |
| User on Free plan contacts support | Allowed. Free plan users can submit tickets. They may receive a suggestion to review documentation first since Free plan does not include email support, but tickets are still accepted |

---

## 16. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Dashboard routing and settings page location |
| 03-AUTHENTICATION.md | Password management, MFA setup flows, session management |
| 05-USER-DASHBOARD.md | Dashboard layout, sidebar with Support nav item |
| 09-BILLING-AND-CREDITS.md | Billing-related support tickets, account deletion with active subscription |
| 14-ADMIN-MODERATION.md | Admin side of support ticket management |
| 17-DOCS-PORTAL.md | Documentation portal integrated with support suggestions |
| 18-DATA-MODELS.md | User profile, ticket, and settings data schemas |
| APPENDICES/B-EMAIL-TEMPLATES.md | Support-related email templates |
