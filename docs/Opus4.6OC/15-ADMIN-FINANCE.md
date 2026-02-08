# ScraperX Admin Finance

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-015 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 09-BILLING-AND-CREDITS.md, 12-ADMIN-DASHBOARD.md, 13-ADMIN-ORGANIZATIONS.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Admin Finance Overview](#1-admin-finance-overview)
2. [Revenue Dashboard](#2-revenue-dashboard)
3. [Subscription Management](#3-subscription-management)
4. [Invoice Browser](#4-invoice-browser)
5. [Credit Operations](#5-credit-operations)
6. [Payment Failures and Recovery](#6-payment-failures-and-recovery)
7. [Refund Management](#7-refund-management)
8. [Financial Reports](#8-financial-reports)
9. [Revenue Alerts and Notifications](#9-revenue-alerts-and-notifications)
10. [Edge Cases](#10-edge-cases)
11. [Related Documents](#11-related-documents)

---

## 1. Admin Finance Overview

The Admin Finance section provides platform-wide financial visibility and management tools. It is the admin counterpart to the user-facing billing pages described in 09-BILLING-AND-CREDITS.md. While users manage their own subscriptions, payment methods, and invoices, admins see aggregate revenue data, can intervene in billing issues, process refunds, and generate financial reports.

### Admin Finance Navigation

The finance section appears in the admin sidebar under the "Finance" group and contains the following sub-pages:

| Nav Item | Route | Description |
|----------|-------|-------------|
| Revenue | /admin/finance/revenue | Revenue dashboard with charts and metrics |
| Subscriptions | /admin/finance/subscriptions | All active and past subscriptions |
| Invoices | /admin/finance/invoices | All invoices across all users |
| Credit Ops | /admin/finance/credits | Credit adjustments and audit trail |
| Payments | /admin/finance/payments | Payment failures, retries, recovery |
| Refunds | /admin/finance/refunds | Refund requests and processing |
| Reports | /admin/finance/reports | Downloadable financial reports |

### Permission Requirements

All finance pages require the Admin role. There is no read-only finance role in MVP. See 04-ROLES-AND-PERMISSIONS.md for role definitions. In the future Teams phase, a Billing role at the organization level would NOT grant admin finance access -- admin finance is strictly platform-level.

---

## 2. Revenue Dashboard

The revenue dashboard is the default landing page for the finance section (/admin/finance/revenue). It provides a high-level financial overview of the platform.

### Revenue Summary Cards

Three summary cards appear at the top of the page (never four -- per design standards).

| Card | Content | Detail |
|------|---------|--------|
| Monthly Recurring Revenue (MRR) | Current MRR value in USD | Calculated as sum of all active subscription monthly equivalents. Annual subscriptions divided by 12. Includes delta vs previous month as percentage with up/down arrow |
| Revenue This Month | Total revenue collected in current calendar month | Includes subscription charges + credit pack purchases. Excludes refunded amounts. Shows delta vs previous month |
| Active Subscriptions | Count of active paid subscriptions | Broken down inline as "X Pro, Y Enterprise". Shows net change this month (new minus churned) |

### Revenue Over Time Chart

Below the summary cards, a line chart shows revenue trends.

**Chart specifications:**

| Property | Value |
|----------|-------|
| Chart type | Line chart with area fill |
| Data series | Two lines: Subscription Revenue (primary color) and Credit Pack Revenue (secondary color) |
| X-axis | Time (months for 12M view, days for 30D view) |
| Y-axis | Revenue in USD |
| Time range toggles | 30D, 90D, 6M, 12M |
| Default view | 12M |
| Tooltip | Hover shows exact date, subscription revenue, pack revenue, and total |
| Legend | Below chart, clickable to toggle series visibility |

### MRR Growth Chart

A second chart shows MRR growth over time.

| Property | Value |
|----------|-------|
| Chart type | Line chart |
| Data series | Single line showing MRR at each data point |
| Annotations | Vertical dashed lines marking significant events (plan price changes, major feature launches) -- added manually by admins via a future enhancement |
| X-axis | Months |
| Y-axis | MRR in USD |
| Time range | 6M, 12M, All Time |
| Default view | 12M |

### Plan Distribution

A breakdown of users by plan, displayed as a horizontal stacked bar or simple stats row.

| Metric | Description |
|--------|-------------|
| Free users | Count and percentage of total users |
| Pro users | Count and percentage of total users |
| Enterprise users | Count and percentage of total users |
| Conversion rate | Percentage of Free users who upgraded to paid (all time) |
| Average revenue per user (ARPU) | Total monthly revenue / total active users |

### Churn Metrics

| Metric | Description |
|--------|-------------|
| Churn rate (monthly) | Percentage of paid subscribers who cancelled or downgraded to Free in the last 30 days |
| Churned MRR | Dollar value of MRR lost to churn this month |
| Net MRR movement | New MRR + Expansion MRR - Churned MRR |
| Expansion MRR | MRR gained from upgrades (Free to Pro, monthly to annual) |

### Data Refresh

Revenue dashboard data is aggregated server-side and cached. It refreshes every 15 minutes. A "Last updated: [timestamp]" label appears below the charts. Admins can click a refresh icon to force a recalculation, which is rate-limited to once per 5 minutes.

---

## 3. Subscription Management

Route: /admin/finance/subscriptions

This page lists all subscriptions across the platform, enabling admins to view subscription details and intervene when necessary.

### Subscriptions Table

| Column | Content | Sortable |
|--------|---------|----------|
| User | Display name + email (linked to admin user detail page) | Yes (by name) |
| Plan | Free / Pro / Enterprise | Yes |
| Status | Active, Past Due, Suspended, Cancelled | Yes |
| Billing Frequency | Monthly / Annual | Yes |
| MRR Contribution | Monthly equivalent revenue from this subscription | Yes |
| Current Period | Start and end dates of current billing cycle | Yes (by period start) |
| Created | Date subscription was created | Yes |

**Default sort:** Created, descending (newest first).

### Subscription Filters

| Filter | Options |
|--------|---------|
| Plan | Free, Pro, Enterprise |
| Status | Active, Past Due, Suspended, Cancelled |
| Frequency | Monthly, Annual |
| Date range | Created within a date range |
| Search | Search by user name or email |

**Pagination:** 25 rows per page with page navigation.

### Subscription Status Definitions

| Status | Meaning |
|--------|---------|
| Active | Subscription is current, payment up to date |
| Past Due | Payment failed, within grace/retry period (see 09-BILLING-AND-CREDITS.md failed payment escalation) |
| Suspended | Account suspended due to continued payment failure or admin action |
| Cancelled | User cancelled or system cancelled after failed payment escalation |

### Subscription Detail View

Clicking a row expands an inline detail panel or navigates to a detail view showing:

**Subscription Information:**

| Field | Description |
|-------|-------------|
| Subscription ID | Internal unique identifier |
| User | Name, email, linked to user detail |
| Plan | Current plan name |
| Billing frequency | Monthly or Annual |
| Status | Current status with colored badge |
| Created date | When the subscription started |
| Current period start | Start of current billing cycle |
| Current period end | End of current billing cycle |
| Next charge date | When the next payment will be attempted |
| Next charge amount | Expected amount for next billing cycle |
| Payment method | Last 4 digits, card brand, expiry (read-only) |
| Total lifetime revenue | Sum of all successful payments from this subscription |

**Subscription History Timeline:**

A chronological list of subscription events:

| Event Type | Description |
|------------|-------------|
| Created | Subscription started |
| Renewed | Successful cycle renewal |
| Upgraded | Plan upgrade (from/to) |
| Downgraded | Plan downgrade (from/to) |
| Frequency Changed | Monthly to Annual or vice versa |
| Payment Failed | Failed charge attempt |
| Payment Recovered | Successful retry after failure |
| Suspended | Account suspended |
| Unsuspended | Account restored |
| Cancelled | Subscription cancelled |
| Reactivated | Previously cancelled subscription restarted |

### Admin Subscription Actions

Admins can perform the following actions on a subscription from the detail view:

| Action | Description | Confirmation Required |
|--------|-------------|----------------------|
| Change Plan | Override the user's plan (upgrade or downgrade) | Yes -- modal with reason field |
| Cancel Subscription | Immediately cancel the subscription | Yes -- modal with reason, option for immediate or end-of-cycle |
| Extend Period | Push the billing cycle end date forward (e.g., as a goodwill gesture) | Yes -- modal with new end date and reason |
| Override Status | Manually set subscription status (e.g., reactivate a suspended account) | Yes -- modal with new status and reason |
| Waive Next Payment | Mark the next payment as waived (user keeps the plan for one cycle without charge) | Yes -- modal with reason |

All admin subscription actions are recorded in the audit log (see 12-ADMIN-DASHBOARD.md) with the admin who performed the action, the reason provided, and a before/after snapshot.

---

## 4. Invoice Browser

Route: /admin/finance/invoices

A platform-wide view of all invoices, enabling admins to search, filter, and inspect any invoice.

### Invoice Table

| Column | Content | Sortable |
|--------|---------|----------|
| Invoice ID | Unique invoice identifier, formatted as INV-XXXXXXXX | Yes |
| User | Display name + email (linked) | Yes (by name) |
| Description | "Pro Plan - Monthly", "Credit Pack - Medium", etc. | No |
| Amount | Charge amount in USD | Yes |
| Status | Paid, Pending, Failed, Refunded, Partially Refunded, Voided | Yes |
| Date | Invoice issue date | Yes |
| PDF | Download icon to retrieve invoice PDF | No |

**Default sort:** Date, descending.

### Invoice Filters

| Filter | Options |
|--------|---------|
| Status | Paid, Pending, Failed, Refunded, Partially Refunded, Voided |
| Type | Subscription, Credit Pack, Refund |
| Amount range | Min and max amount inputs |
| Date range | Start and end date pickers |
| Search | Invoice ID, user name, or user email |

**Pagination:** 25 rows per page.

### Invoice Detail

Clicking an invoice row opens a detail panel showing:

| Section | Content |
|---------|---------|
| Invoice header | Invoice ID, status badge, issue date, due date |
| Billed to | User name, email, account ID |
| Line items | Description, quantity (always 1 for subscriptions/packs), unit price, total |
| Subtotal | Sum before adjustments |
| Proration credit | If applicable, credit from plan change proration |
| Total charged | Final amount charged |
| Payment details | Payment method used (last 4, brand), transaction ID from payment provider, payment date |
| Refund details | If refunded: refund amount, refund date, refund reason, admin who processed it |

### Invoice Actions

| Action | Description | Availability |
|--------|-------------|-------------|
| Download PDF | Generate and download invoice as PDF | All invoices |
| Void | Mark an unpaid/pending invoice as voided (prevents collection) | Pending invoices only |
| Refund | Initiate a refund for this invoice | Paid invoices only (see Section 7) |
| Resend | Re-send the invoice email to the user | All invoices |
| Add Note | Attach an internal admin note to the invoice | All invoices |

---

## 5. Credit Operations

Route: /admin/finance/credits

This page provides tools for admin-initiated credit adjustments and a full audit trail of all credit operations across the platform.

### Credit Adjustment Tool

Admins can adjust any user's credit balance. This is described in the context of user detail actions in 12-ADMIN-DASHBOARD.md, but the finance section provides a dedicated page for performing and tracking credit operations.

**Adjustment Form:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| User | Search-as-you-type user selector (by name or email) | Must select existing user | Yes |
| Direction | Toggle: Add Credits / Deduct Credits | Must select one | Yes |
| Amount | Numeric input | Positive integer, max 1,000,000 | Yes |
| Reason Category | Dropdown | Options: Goodwill Gesture, Service Disruption Compensation, Billing Error Correction, Manual Top-Up, Abuse Penalty, Test/Debug, Other | Yes |
| Reason Note | Text area | 1-500 characters | Yes |

**Adjustment Flow:**

1. Admin fills in the form
2. System displays a preview: "User [name] currently has [X] credits. After this adjustment: [Y] credits."
3. Admin confirms via button
4. Server performs an atomic credit balance update
5. A credit operation record is created with: timestamp, admin ID, user ID, direction, amount, reason category, reason note, balance before, balance after
6. If the user's new balance exceeds zero and they were previously at zero, no automatic un-restriction occurs -- that is governed by the billing escalation state, not credit balance alone
7. Success toast: "Credit adjustment applied. [User] now has [Y] credits."

### Credit Operations Log

Below the adjustment tool, a filterable log of all credit operations (both system-generated and admin-initiated).

| Column | Content | Sortable |
|--------|---------|----------|
| Timestamp | Date and time of operation | Yes |
| User | Name + email (linked) | Yes |
| Operation | Job Charge, Plan Reset, Admin Add, Admin Deduct, Pack Purchase, Refund Restoration, Expiry Reset | Yes |
| Amount | Positive for additions, negative for deductions | Yes |
| Balance After | User's balance after this operation | No |
| Source | System / Admin (with admin name) / User (for pack purchase) | Yes |
| Details | Expandable: reason, job ID if applicable, pack name if applicable | No |

**Filters:**

| Filter | Options |
|--------|---------|
| Operation type | All operation types listed above |
| Source | System, Admin, User |
| User search | Name or email |
| Date range | Start and end date |
| Direction | Credits added, Credits deducted |

**Pagination:** 25 rows per page.

**Export:** CSV download of filtered results, up to 100,000 rows, rate-limited to 3 exports per hour.

### Credit Balance Summary

At the top of the page, three summary metrics:

| Metric | Description |
|--------|-------------|
| Total Credits Outstanding | Sum of all users' current credit balances |
| Credits Consumed Today | Total credits deducted via job charges today |
| Credits Granted Today | Total credits added (plan resets + admin adds + pack purchases) today |

---

## 6. Payment Failures and Recovery

Route: /admin/finance/payments

This page tracks payment failures, retry status, and recovery efforts. It is the admin view into the failed payment escalation ladder defined in 09-BILLING-AND-CREDITS.md.

### Failed Payments Table

| Column | Content | Sortable |
|--------|---------|----------|
| User | Name + email (linked) | Yes |
| Plan | Pro / Enterprise | Yes |
| Amount | Failed charge amount | Yes |
| First Failure | Date of initial payment failure | Yes |
| Retry Count | Number of retry attempts made | Yes |
| Escalation Stage | Grace / Retry 1 / Retry 2 / Restricted / Suspended / Cancelled | Yes |
| Next Retry | Date of next scheduled retry (if applicable) | Yes |
| Status | In Recovery / Recovered / Abandoned | Yes |

**Default sort:** First Failure, descending.

### Escalation Stage Definitions

| Stage | Day | System Action | User Impact |
|-------|-----|---------------|-------------|
| Grace | 0-2 | Payment failed notification sent | Full access continues |
| Retry 1 | 3 | First automatic retry | Full access continues |
| Retry 2 | 7 | Second automatic retry | Full access continues |
| Restricted | 10 | Account restricted | Can view data, cannot run new jobs |
| Suspended | 14 | Account suspended | Cannot log in (sees suspension message) |
| Cancelled | 30 | Subscription cancelled, downgraded to Free | Free plan access only, credits reset |

These stages are defined in detail in 09-BILLING-AND-CREDITS.md, Section "Failed Payment Handling."

### Filters

| Filter | Options |
|--------|---------|
| Escalation Stage | All stages listed above |
| Status | In Recovery, Recovered, Abandoned |
| Plan | Pro, Enterprise |
| Date range | First failure within range |

### Failed Payment Detail

Clicking a row shows:

| Section | Content |
|---------|---------|
| User information | Name, email, plan, account status |
| Failure timeline | Chronological list of each event: initial failure, each retry attempt with result, stage transitions, notifications sent |
| Payment method | Card on file details (last 4, brand, expiry) |
| Error details | Error code and message from payment provider for each failed attempt |
| Recovery status | Whether the user has updated their payment method since the failure began |

### Admin Actions on Failed Payments

| Action | Description | Confirmation |
|--------|-------------|-------------|
| Retry Now | Trigger an immediate payment retry outside the scheduled timeline | Yes -- "This will attempt to charge [amount] to the user's card on file" |
| Waive Payment | Waive the failed payment entirely and reset the user's billing cycle | Yes -- with reason field |
| Extend Grace | Push back the escalation timeline by a specified number of days | Yes -- modal with day count and reason |
| Override Stage | Manually set the escalation stage (e.g., move from Suspended back to Active) | Yes -- with reason, also updates subscription status |

All actions are audit-logged.

### Recovery Metrics

At the top of the page:

| Metric | Description |
|--------|-------------|
| Active Failures | Count of users currently in the recovery pipeline |
| Recovery Rate | Percentage of failed payments that were eventually recovered (last 90 days) |
| Avg Recovery Time | Average number of days between first failure and successful recovery |

---

## 7. Refund Management

Route: /admin/finance/refunds

Refunds are processed by admins following the refund policy defined in 09-BILLING-AND-CREDITS.md. This page provides the tools to initiate, track, and audit refunds.

### Refund Policy Summary (from 09-BILLING-AND-CREDITS.md)

| Condition | Refund Eligibility |
|-----------|--------------------|
| Subscription within 7 days | Full refund |
| Subscription after 7 days | No refund (cancel takes effect at cycle end) |
| Credit packs | Non-refundable |
| Service downtime | Pro-rated credit restoration at admin discretion |
| Billing errors / double charges | Automatic refund upon detection |
| Disputed charges / chargebacks | Handled through payment provider dispute process |

### Refund Request Queue

If the platform receives refund requests via support tickets (see 11-SETTINGS-AND-SUPPORT.md and 14-ADMIN-MODERATION.md), they appear here as actionable items.

| Column | Content | Sortable |
|--------|---------|----------|
| Request ID | Unique identifier | Yes |
| User | Name + email (linked) | Yes |
| Invoice | Linked invoice ID | Yes |
| Amount | Requested refund amount | Yes |
| Type | Subscription / Credit Pack / Other | Yes |
| Reason | User-provided reason summary | No |
| Ticket | Linked support ticket if applicable | No |
| Status | Pending Review, Approved, Denied, Processed, Failed | Yes |
| Requested | Date of request | Yes |

**Default sort:** Requested, ascending (oldest first -- FIFO processing).

### Processing a Refund

When an admin clicks "Review" on a pending refund request:

**Refund Review Panel:**

| Section | Content |
|---------|---------|
| Request details | User info, invoice info, amount requested, reason |
| Eligibility check | System automatically evaluates against refund policy and displays: eligible/ineligible with reason |
| Invoice history | Full invoice with line items, payment date, payment method |
| User history | Number of previous refunds, total refunded amount, account age |
| Prior refunds | List of any previous refunds for this user with dates and amounts |

**Admin Decision:**

| Action | Flow |
|--------|------|
| Approve Full Refund | Confirm amount matches invoice total. Enter admin note. Submit. |
| Approve Partial Refund | Enter partial amount (must be less than invoice total). Enter reason for partial. Enter admin note. Submit. |
| Deny Refund | Select denial reason from dropdown (Outside policy window, Non-refundable item, Policy violation, Insufficient justification, Other). Enter admin note. Submit. |

**Post-Approval Processing:**

1. Admin approves the refund
2. System sends refund request to payment provider via the provider-agnostic payment integration layer (09-BILLING-AND-CREDITS.md)
3. Payment provider processes the refund (typically 5-10 business days to reach user's account)
4. System receives webhook confirmation of refund completion
5. Invoice status updated to "Refunded" or "Partially Refunded"
6. If the refund is for a subscription: if within the current cycle, credits consumed during that cycle are NOT clawed back. The subscription is cancelled at the time of refund.
7. If the refund is for a credit pack: credits from the pack are deducted from the user's balance. If the user has already consumed more credits than they had without the pack, balance goes to zero (never negative).
8. User receives email notification: "Your refund of [amount] has been processed"
9. Refund record is created in the audit log

### Refund Denial Flow

1. Admin selects "Deny" and provides a reason
2. System updates the refund request status to "Denied"
3. If linked to a support ticket, the denial reason is posted as an admin reply to the ticket
4. User receives email: "Your refund request has been reviewed" with denial reason
5. Denial is recorded in the audit log

### Refund History

Below the queue, a historical log of all processed refunds.

| Column | Content | Sortable |
|--------|---------|----------|
| Refund ID | Unique identifier | Yes |
| User | Name + email | Yes |
| Invoice | Original invoice ID | Yes |
| Amount | Refunded amount | Yes |
| Type | Full / Partial | Yes |
| Status | Processed / Failed / Reversed | Yes |
| Processed By | Admin name | Yes |
| Date | Processing date | Yes |

**Filters:** Status, Type, Date range, User search, Admin search.

### Refund Metrics

| Metric | Description |
|--------|-------------|
| Refunds This Month | Count and total dollar amount |
| Refund Rate | Percentage of invoices that resulted in refunds (last 90 days) |
| Avg Processing Time | Average time from request to completion |
| Top Refund Reasons | Breakdown of reason categories |

---

## 8. Financial Reports

Route: /admin/finance/reports

Admins can generate and download financial reports for accounting, tax, and business analysis purposes.

### Available Reports

| Report | Description | Data Included | Format |
|--------|-------------|---------------|--------|
| Revenue Summary | Monthly revenue breakdown | Total revenue, subscription revenue, pack revenue, refunds, net revenue, by month | CSV |
| Subscription Report | All subscription activity for a period | User, plan, frequency, status, MRR, start date, end date | CSV |
| Invoice Report | All invoices for a period | Invoice ID, user, description, amount, status, date, payment method | CSV |
| Credit Operations Report | All credit operations for a period | Timestamp, user, operation, amount, balance after, source, reason | CSV |
| Refund Report | All refunds for a period | Refund ID, user, invoice, amount, type, reason, status, admin, date | CSV |
| Churn Report | Subscription cancellations and downgrades | User, previous plan, new plan/cancelled, date, reason (if provided), lifetime revenue | CSV |
| Payment Failures Report | Payment failure events | User, amount, failure date, error code, escalation stage, recovery status | CSV |

### Report Generation Flow

1. Admin selects a report type from the list
2. A configuration panel appears with:
   - Date range picker (required, max 12 months per report)
   - Additional filters depending on report type (e.g., plan filter for Subscription Report)
3. Admin clicks "Generate Report"
4. System displays a progress indicator (reports may take several seconds for large date ranges)
5. When complete, a download link appears
6. Report is available for download for 24 hours, after which it expires
7. A history of generated reports is maintained showing: report type, date range, generated by, generated at, download link (or "Expired"), row count

### Report Generation Limits

| Limit | Value |
|-------|-------|
| Max date range | 12 months per report |
| Max concurrent generation | 2 reports at a time per admin |
| Rate limit | 10 reports per hour per admin |
| Expiry | Download links expire after 24 hours |
| Row limit | 500,000 rows per report. If exceeded, the report is split into multiple files delivered as a ZIP archive |

### Data Privacy in Reports

Reports contain user email addresses and financial data. Admins downloading reports are reminded via an inline notice: "This report contains personally identifiable information and financial data. Handle in accordance with your data protection obligations." Reports do not contain full payment card numbers, passwords, or API keys.

---

## 9. Revenue Alerts and Notifications

Admins receive alerts for significant financial events.

### Alert Types

| Alert | Trigger | Delivery |
|-------|---------|----------|
| Revenue milestone | MRR crosses a round-number threshold (e.g., $1,000, $5,000, $10,000) | In-app notification |
| Churn spike | Daily churn rate exceeds 2x the 30-day average | In-app notification + email |
| Payment failure spike | More than 10 payment failures in a single day | In-app notification + email |
| Large refund | A single refund exceeds $200 | In-app notification |
| Revenue drop | MRR decreases by more than 10% month-over-month | In-app notification + email |
| Unusual credit adjustment | A single admin credit adjustment exceeds 100,000 credits | In-app notification (for all other admins) |

### Alert Display

Alerts appear in the admin notification panel (bell icon in admin top bar, see 12-ADMIN-DASHBOARD.md). Critical alerts (churn spike, payment failure spike, revenue drop) also display as a persistent banner at the top of the finance dashboard until dismissed.

---

## 10. Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin refunds an invoice that was already partially refunded | System shows remaining refundable amount. Admin can only refund up to the unrefunded portion |
| Refund fails at the payment provider | Status set to "Failed". Admin is notified. Manual intervention required -- admin may need to process refund directly via payment provider dashboard and mark as "Processed Externally" in ScraperX |
| User updates payment method while admin is reviewing their failed payment | Payment detail panel refreshes to show updated method. Admin can proceed with retry using the new method |
| Two admins attempt to process the same refund simultaneously | Optimistic concurrency control. The second admin receives an error: "This refund has already been processed by [admin name]" |
| Credit adjustment would make a user's balance exceed plan maximum (if such a limit existed) | No plan-based credit ceiling exists. Credits from admin adjustments are added without limit. The plan's included credits are the monthly reset amount, not a cap |
| Admin generates a report for a date range with no data | Report is generated with headers only and zero rows. A notice displays: "No data found for the selected period" |
| Payment provider webhook for refund confirmation arrives before admin dashboard shows "Processing" | Webhook handler updates the refund status regardless of admin view state. Admin sees the refund as already completed when they next view it |
| Admin attempts to void an invoice that has already been paid | Void action is not available for paid invoices. Only pending invoices can be voided. Admin should use the Refund action instead |
| Subscription created on the 31st of a month, and the current month has 30 days | Billing cycle end date is pinned to the last day of the month. See 09-BILLING-AND-CREDITS.md for date edge case handling |
| Enterprise user with custom pricing needs a refund | Custom-priced invoices show the actual charged amount. Refund is processed against the actual paid amount, not the standard plan price |
| Admin waives payment for a user in the Suspended escalation stage | Waiving the payment also requires the admin to override the account status back to Active and reset the escalation state. A compound action: the modal prompts for both waive + status override |
| Credit operation log becomes very large (millions of records) | Server-side pagination and filtering are mandatory. The page never loads all records at once. Date range filter defaults to "Last 30 days" to limit initial query size |

---

## 11. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform context, plan definitions, technology stack |
| 04-ROLES-AND-PERMISSIONS.md | Admin role permissions that govern access to finance pages |
| 09-BILLING-AND-CREDITS.md | User-facing billing system that this admin section manages. Contains plan pricing, credit rules, payment escalation, refund policy |
| 12-ADMIN-DASHBOARD.md | Admin layout, navigation structure, audit log where finance actions are recorded |
| 13-ADMIN-ORGANIZATIONS.md | Future: organization-level billing administration |
| 14-ADMIN-MODERATION.md | Support tickets that may contain refund requests |
| 18-DATA-MODELS.md | Data entities for subscriptions, invoices, credits, refunds |
| APPENDICES/A-PERMISSION-MATRIX.md | Full permission matrix including finance admin actions |
