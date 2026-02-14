# Scrapifie Billing and Credits

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-009 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 02-LEGAL-FRAMEWORK.md, 05-USER-DASHBOARD.md, 08-USAGE-AND-ANALYTICS.md, 15-ADMIN-FINANCE.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Billing and Credits Overview](#1-billing-and-credits-overview)
2. [Plan Tiers](#2-plan-tiers)
3. [Credit System](#3-credit-system)
4. [Billing Page Layout](#4-billing-page-layout)
5. [Current Plan Section](#5-current-plan-section)
6. [Plan Upgrade and Downgrade](#6-plan-upgrade-and-downgrade)
7. [Credit Packs](#7-credit-packs)
8. [Payment Methods](#8-payment-methods)
9. [Invoices and Billing History](#9-invoices-and-billing-history)
10. [Billing Cycle Management](#10-billing-cycle-management)
11. [Failed Payment Handling](#11-failed-payment-handling)
12. [Subscription Cancellation](#12-subscription-cancellation)
13. [Refund Policy](#13-refund-policy)
14. [Provider-Agnostic Payment Integration](#14-provider-agnostic-payment-integration)
15. [Billing Notifications](#15-billing-notifications)
16. [Empty and Error States](#16-empty-and-error-states)
17. [Edge Cases](#17-edge-cases)
18. [Related Documents](#18-related-documents)

---

## 1. Billing and Credits Overview

Scrapifie uses a credit-based billing model. Users subscribe to a plan that grants a monthly credit allocation. Each API request consumes credits based on the engine type used. When credits run out, jobs fail until credits are replenished via a credit pack purchase or the next billing cycle reset.

### Core Billing Principles

| Principle | Detail |
|-----------|--------|
| Credit-based | All API usage is metered in credits, not direct monetary charges per request |
| Monthly cycle | Credits reset on each billing cycle date, not on calendar month boundaries |
| No rollover | Unused credits expire at the end of each billing cycle. They do not carry forward |
| No rollover for packs either | Credit pack credits also expire at the end of the billing cycle in which they were purchased |
| Provider-agnostic | All payment processing is abstracted behind a payment provider interface. The platform does not depend on any specific payment provider |
| USD primary | All prices are displayed in USD. Future: multi-currency support |
| Prepaid model | Users pay at the start of each billing cycle (subscription) or at time of purchase (credit packs). There are no post-paid invoices for usage overages |

---

## 2. Plan Tiers

### Plan Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Monthly Price | $0 | $49/month | Custom pricing |
| Annual Price | $0 | $39/month (billed $468/year) | Custom pricing |
| Monthly Credits | 1,000 | 50,000 | Custom allocation |
| API Keys | 1 | 5 | Unlimited |
| Engines Available | HTTP only | HTTP, Browser, Stealth | HTTP, Browser, Stealth |
| Rate Limit | 10 requests/minute | 100 requests/minute | Custom |
| Support | Community (docs only) | Email support | Dedicated account manager |
| Credit Packs | Not available | Available | Custom packs |
| Data Retention (results) | 7 days | 30 days | 90 days |
| Data Retention (logs) | 30 days | 90 days | 1 year |
| Concurrent Jobs | 2 | 10 | Custom |
| Webhook Notifications | No | Yes | Yes |
| Priority Queue | No | No | Yes |

### Plan Rules

| Rule | Detail |
|------|--------|
| Default plan | All new accounts start on the Free plan |
| One plan per account | An account can only have one active plan at a time |
| Plan change timing | Upgrades take effect immediately. Downgrades take effect at the end of the current billing cycle |
| Enterprise onboarding | Enterprise plans require manual setup. The pricing page includes a "Contact Sales" CTA that opens the contact form (01-PUBLIC-WEBSITE.md). Admin creates the custom plan via the admin panel (15-ADMIN-FINANCE.md) |
| Free plan limits | Free plan users cannot purchase credit packs, cannot use Browser or Stealth engines, and are limited to 1 API key |
| Annual discount | Pro annual plan saves 20% compared to monthly billing ($39/month vs $49/month) |

---

## 3. Credit System

### Credit Costs by Engine

| Engine | Credit Cost Per Request | Available On |
|--------|----------------------|-------------|
| HTTP | 1 credit | Free, Pro, Enterprise |
| Browser | 5 credits | Pro, Enterprise |
| Stealth | 10 credits | Pro, Enterprise |

### Credit Lifecycle

```
Billing Cycle Start
        |
        v
  Credits Allocated (plan amount + any purchased packs)
        |
        v
  Credits Consumed (per-job deduction based on engine type)
        |
        v
  Credits Reach Zero ----> Jobs Fail (insufficient credits)
        |                        |
        v                        v
  Billing Cycle End         User Buys Credit Pack
        |                        |
        v                        v
  All Remaining Credits     Pack Credits Added to Balance
  Expire (no rollover)     (also expire at cycle end)
        |
        v
  New Cycle Starts (fresh allocation)
```

### Credit Balance Calculation

At any point in time, the user's available credit balance is:

```
Available Credits = Plan Credits
                  + Sum of Credit Pack Credits Purchased This Cycle
                  - Sum of Credits Consumed This Cycle
```

### Credit Deduction Rules

| Rule | Detail |
|------|--------|
| Timing | Credits are deducted when a job reaches a terminal state (completed or failed), not when the job is queued |
| Insufficient credits check | Before a job is queued, the system checks if the user has enough credits for the job's engine cost. If not, the job is rejected immediately with an error response |
| Pre-authorization | The credit cost is "reserved" when the job is queued and "confirmed" when it completes or fails. If the job is cancelled or expires, the reservation is released |
| Concurrency | Credit checks use atomic database operations to prevent race conditions where two concurrent jobs both pass the credit check but the account only has credits for one |
| Test keys | Jobs submitted with test keys consume zero credits. Credit checks are skipped for test key jobs |
| Negative balance prevention | The credit balance can never go below zero. If a race condition somehow allows it, the system logs an alert and the admin is notified |

---

## 4. Billing Page Layout

**Route**: `/dashboard/billing`

```
+------------------------------------------------------------------+
| Sidebar |  Billing                                                 |
|         |                                                         |
|  [nav]  |  +--- Current Plan Card -----------------------------+ |
|         |  | Pro Plan - Monthly           [Change Plan]          | |
|         |  | $49/month                                           | |
|         |  | 50,000 credits/month                                | |
|         |  | Next billing date: March 8, 2026                    | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Credit Balance Card ---------------------------+ |
|         |  | 37,550 credits remaining     [Buy Credits]          | |
|         |  | [=============-------] 75% used                     | |
|         |  | Resets in 18 days                                   | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Payment Method --------------------------------+ |
|         |  | Visa ending in 4242           [Update] [Remove]     | |
|         |  | Expires 12/2027                                     | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Billing History --------------------------------+ |
|         |  | [table of invoices]                                | |
|         |  +--------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## 5. Current Plan Section

### Current Plan Card

This card displays the user's active subscription details.

**Fields:**

| Field | Content | Notes |
|-------|---------|-------|
| Plan Name | "Free Plan", "Pro Plan", or custom Enterprise name | Displayed prominently |
| Billing Frequency | "Monthly", "Annual", or "Custom" (Enterprise) | Shown next to plan name |
| Price | "$0/month", "$49/month", "$39/month (billed annually)", or custom | Formatted with currency symbol |
| Credit Allocation | "{credits} credits/month" | Integer with comma formatting |
| Next Billing Date | Date of next charge or cycle reset | Format: "March 8, 2026". For Free plan: "Credits reset on {date}" |
| Change Plan button | Opens the plan change flow | Text: "Change Plan" for paid plans, "Upgrade" for Free plan |

### Plan Badge

A visual badge next to the plan name indicating the tier:
- Free: Neutral/default badge
- Pro: Accent-colored badge
- Enterprise: Distinct badge color

---

## 6. Plan Upgrade and Downgrade

### Plan Change Flow

Clicking "Change Plan" or "Upgrade" opens a plan selection view within the billing page (not a separate page, not a modal — an inline expansion or a slide-over panel).

### Plan Selection View

```
+--- Choose Your Plan -----------------------------------------------+
| [Monthly / Annual] toggle                                           |
|                                                                      |
| +--- Free --------+  +--- Pro ---------+  +--- Enterprise -------+  |
| | $0/month        |  | $49/month       |  | Custom               |  |
| | 1,000 credits   |  | 50,000 credits  |  | Contact Sales        |  |
| | HTTP only       |  | All engines     |  | All engines          |  |
| | 1 API key       |  | 5 API keys      |  | Unlimited keys       |  |
| |                 |  |                 |  |                       |  |
| | [Current Plan]  |  | [Upgrade]       |  | [Contact Sales]      |  |
| +-----------------+  +-----------------+  +-----------------------+  |
|                                                                      |
| Detailed feature comparison below (same as pricing page)             |
+----------------------------------------------------------------------+
```

### Upgrade Flow (Free to Pro, or Monthly to Annual)

1. User clicks "Upgrade" on the Pro plan card
2. If the user has no payment method on file:
   - Payment method form appears (see Section 8)
   - User adds payment method first
3. Confirmation modal:
   - Title: "Upgrade to Pro Plan"
   - Body: Details of the change, including prorated charges if applicable
   - For Free to Pro: "You will be charged ${amount} today. Your credit allocation will increase to 50,000 credits immediately."
   - For Monthly to Annual: "You will be charged ${annual_amount} today for the year. Your monthly rate drops to $39/month."
   - Checkbox: "I agree to the updated subscription terms" (links to Terms of Service)
   - Buttons: "Confirm Upgrade" (primary), "Cancel" (secondary)
4. On confirmation:
   - Payment is processed via the payment provider
   - If payment succeeds:
     - Plan is updated immediately
     - Credit allocation increases immediately (additional credits are prorated for the remaining days in the current cycle)
     - Toast: "Upgrade successful. Welcome to Pro!"
     - Confirmation email sent (see APPENDICES/B-EMAIL-TEMPLATES.md)
   - If payment fails:
     - Modal shows error: "Payment failed: {reason}. Please try a different payment method."
     - Plan remains unchanged

### Proration on Upgrade

When upgrading mid-cycle, credit allocation is prorated:

```
Additional Credits = (New Plan Credits - Old Plan Credits) * (Days Remaining / Total Days in Cycle)
```

Example: Upgrading from Free (1,000 credits) to Pro (50,000 credits) with 15 of 30 days remaining:
- Additional credits = (50,000 - 1,000) * (15 / 30) = 24,500 additional credits added immediately
- Next full cycle grants the full 50,000 credits

The monetary charge is also prorated:
```
Prorated Charge = New Plan Price * (Days Remaining / Total Days in Cycle)
```

### Downgrade Flow (Pro to Free)

1. User clicks on the Free plan card (which shows "Downgrade" instead of "Current Plan")
2. Confirmation modal:
   - Title: "Downgrade to Free Plan"
   - Body: "Your downgrade will take effect at the end of your current billing cycle on {date}. Until then, you will retain all Pro features."
   - Warning: "On downgrade, the following changes will apply:"
     - "Your credit allocation will reduce to 1,000 credits/month"
     - "You will lose access to Browser and Stealth engines"
     - "API keys beyond 1 will be deactivated (you choose which to keep)"
     - "Rate limit will reduce to 10 requests/minute"
   - Buttons: "Confirm Downgrade" (destructive/red), "Keep Pro" (secondary)
3. On confirmation:
   - A scheduled downgrade is created (does not take effect immediately)
   - Current plan card shows: "Downgrading to Free on {date}"
   - A "Cancel Downgrade" link appears, allowing the user to revert the decision before it takes effect
   - No refund is issued for the remaining billing cycle (user continues to use Pro until cycle end)

### Downgrade Key Deactivation

When the downgrade takes effect and the user has more API keys than the new plan allows:

1. During the downgrade confirmation, the user is prompted to select which key to keep (if they have multiple):
   - "You currently have {count} API keys. The Free plan allows 1 key. Select the key you want to keep:"
   - List of active keys with radio buttons
   - Default selection: the most recently used key
2. If the user does not select (e.g., they confirm but skip selection), the most recently used key is kept by default
3. On downgrade execution, all keys except the selected one are revoked (soft delete, not permanent deletion)

### Billing Frequency Change (Monthly to Annual, Annual to Monthly)

| Change | Handling |
|--------|----------|
| Monthly to Annual | Treated as an upgrade. Prorated credit for remaining monthly cycle. Charged the full annual amount immediately. Next billing date set to 1 year from today |
| Annual to Monthly | Takes effect at the end of the annual period. No partial refund. User switches to monthly billing at $49/month when the annual period expires |

---

## 7. Credit Packs

Credit packs are one-time purchases that add credits to the user's current billing cycle balance. They are available to Pro and Enterprise plan users only.

### Available Credit Packs

| Pack Name | Credits | Price | Price Per Credit |
|-----------|---------|-------|-----------------|
| Small Pack | 10,000 | $15 | $0.0015 |
| Medium Pack | 25,000 | $30 | $0.0012 |
| Large Pack | 50,000 | $50 | $0.0010 |

### Credit Pack Rules

| Rule | Detail |
|------|--------|
| Availability | Pro and Enterprise plans only. Free plan users see a prompt to upgrade |
| Rollover | Credit pack credits do NOT roll over. They expire at the end of the current billing cycle, just like plan credits |
| Stacking | Multiple packs can be purchased within a single cycle. Credits are additive |
| Maximum per cycle | 5 credit pack purchases per billing cycle (prevents abuse) |
| Payment | Charged immediately to the user's payment method on file |
| Refund | Credit packs are non-refundable once purchased (stated in Terms of Service) |

### Purchase Flow

1. User clicks "Buy Credits" on the billing page
2. Credit pack selection modal appears:
   - Title: "Buy Credit Pack"
   - Three pack options displayed as cards with name, credits, price, and price-per-credit
   - Packs previously purchased this cycle show a count: "Purchased {X} times this cycle"
   - If the user has reached the 5-pack limit for any pack, that option is disabled: "Maximum purchases reached for this billing cycle"
3. User selects a pack and clicks "Purchase"
4. Confirmation modal:
   - "Purchase {pack_name} for ${price}? {credits} credits will be added to your balance immediately."
   - "These credits expire on {cycle_end_date} (end of your current billing cycle)."
   - Buttons: "Confirm Purchase" (primary), "Cancel" (secondary)
5. Payment is processed immediately
6. On success:
   - Credits added to balance instantly
   - Toast: "{credits} credits added to your balance"
   - Credit balance card updates immediately
   - Receipt/invoice generated and added to billing history
   - Confirmation email sent
7. On failure:
   - Modal shows: "Purchase failed: {reason}. Please check your payment method."
   - Credits are NOT added

---

## 8. Payment Methods

### Payment Method Card

The payment method section on the billing page displays the user's saved payment method.

**For users with a payment method on file:**

| Field | Content |
|-------|---------|
| Card type icon | Visa, Mastercard, etc. (monochrome icon as per standards) |
| Card display | "{Type} ending in {last4}" |
| Expiry | "Expires {MM/YYYY}" |
| Update button | Opens the payment method update flow |
| Remove button | Removes the payment method (only available on Free plan) |

**For users without a payment method on file:**

| Content | Display |
|---------|---------|
| Message | "No payment method on file" |
| CTA | "Add Payment Method" button |
| Note | "A payment method is required to upgrade to a paid plan or purchase credit packs" |

### Add/Update Payment Method Flow

Payment method collection is handled via the payment provider's hosted/embedded form. This ensures PCI compliance without Scrapifie handling raw card data.

1. User clicks "Add Payment Method" or "Update"
2. A modal appears containing the payment provider's embedded payment form
3. The form collects:
   - Card number
   - Expiry date (MM/YY)
   - CVV/CVC
   - Cardholder name
   - Billing address (street, city, state/province, postal code, country)
4. User submits the form
5. Payment provider validates and tokenizes the card
6. Scrapifie stores only:
   - Payment provider's token/reference ID
   - Card type (Visa, Mastercard, etc.)
   - Last 4 digits
   - Expiry month and year
   - Billing address (for invoicing)
7. On success: Toast: "Payment method updated"
8. On failure: Error message within the modal: "Card could not be added: {reason}"

### Payment Method Security

| Rule | Detail |
|------|--------|
| PCI compliance | Scrapifie never receives, transmits, or stores raw card numbers. All card data passes through the payment provider's hosted form |
| Token storage | Only the payment provider's token is stored in the Scrapifie database |
| Card display | Only the last 4 digits and card type are stored for display purposes |
| Update process | Updating a payment method creates a new token. The old token is deactivated |
| Multiple methods | MVP supports one payment method per account. Future: multiple methods with a default |

### Remove Payment Method

- Only available when the user is on the Free plan (no active paid subscription)
- If the user is on a paid plan, the "Remove" button is hidden. A tooltip or note explains: "You cannot remove your payment method while on a paid plan. Downgrade to Free first."
- Confirmation modal: "Remove your payment method? You will need to add one again to upgrade or purchase credit packs."
- On confirmation: payment provider token is deleted, card information cleared from Scrapifie

---

## 9. Invoices and Billing History

### Billing History Table

```
+--- Billing History ------------------------------------------------+
| Date         | Description              | Amount  | Status | Action |
|--------------+--------------------------+---------+--------+--------|
| Feb 8, 2026  | Pro Plan - Monthly       | $49.00  | Paid   | [PDF]  |
| Feb 8, 2026  | Credit Pack - Medium     | $30.00  | Paid   | [PDF]  |
| Jan 8, 2026  | Pro Plan - Monthly       | $49.00  | Paid   | [PDF]  |
| Dec 8, 2025  | Pro Plan - Monthly       | $49.00  | Paid   | [PDF]  |
| ...          | ...                      | ...     | ...    | ...    |
+--------------------------------------------------------------------+
| Showing 1-10 of 24                     [< Prev] Page 1 [Next >]   |
+--------------------------------------------------------------------+
```

### Invoice Table Columns

| Column | Content | Notes |
|--------|---------|-------|
| Date | Date of the transaction | Format: "Feb 8, 2026" |
| Description | What was charged | "Pro Plan - Monthly", "Pro Plan - Annual", "Credit Pack - Small", "Upgrade Proration", etc. |
| Amount | Dollar amount charged | Formatted as "$XX.XX" |
| Status | Payment status | See status values below |
| Action | Download link | "PDF" link to download the invoice |

### Invoice Statuses

| Status | Display | Meaning |
|--------|---------|---------|
| Paid | Green text | Payment processed successfully |
| Pending | Yellow text | Payment initiated but not yet confirmed (rare, for async payment methods) |
| Failed | Red text | Payment attempt failed. Shows as a row with a "Retry" link |
| Refunded | Blue text | Full refund was processed |
| Partially Refunded | Blue text | Partial refund was processed. Amount shows original with refund note |

### Invoice PDF Content

Each downloadable invoice PDF contains:

| Section | Content |
|---------|---------|
| Header | Scrapifie company information (name, address placeholder, contact email) |
| Invoice number | Unique invoice ID (format: INV-YYYYMMDD-XXXXX) |
| Bill to | User's name, email, and billing address if available |
| Date | Invoice date and payment date |
| Line items | Description, quantity (1 for subscriptions, credit count for packs), unit price, total |
| Subtotal | Sum of line items |
| Tax | Tax amount if applicable (placeholder for future tax integration) |
| Total | Final amount charged |
| Payment method | "{Type} ending in {last4}" |
| Footer | Legal text referencing Terms of Service |

### Billing History Pagination

| Property | Value |
|----------|-------|
| Page size | 10 invoices per page |
| Sorting | Newest first (not changeable) |
| Total history | All invoices since account creation (no expiration) |

---

## 10. Billing Cycle Management

### Billing Cycle Definition

| Property | Detail |
|----------|--------|
| Cycle start | The day the user first subscribed to a paid plan (or account creation for Free plan) |
| Cycle length | Monthly: same date each month. Annual: same date each year |
| Date anchoring | If the subscription date is the 31st and a month has 30 days, the billing date is the last day of that month |
| Credit reset | Credits reset to the plan allocation at the start of each new cycle. Remaining credits from the previous cycle and any purchased credit packs are forfeited |
| Charge timing | Subscription charge is processed at the start of each cycle (prepaid) |

### Billing Cycle Timeline

```
Cycle Start (Feb 8)          Mid-Cycle              Cycle End (Mar 8)
     |                           |                        |
     v                           v                        v
  [Payment Charged]  [Credits Being Used]  [Unused Credits Expire]
  [Credits Allocated]                      [Next Payment Charged]
                                           [Fresh Credits Allocated]
```

### Billing Date Display

The billing page always shows:
- "Next billing date: {date}" for paid plans
- "Credits reset on: {date}" for Free plans
- If a downgrade is scheduled: "Downgrading to {plan} on {date}"
- If an annual plan is expiring: "Annual subscription renews on {date}" or "Annual subscription ends on {date}" (if set to not renew)

---

## 11. Failed Payment Handling

When a subscription payment fails, the platform follows a graduated escalation process to minimize disruption while protecting revenue.

### Escalation Ladder

| Stage | Timing | Action | User Impact |
|-------|--------|--------|-------------|
| 1. Grace Period | Day 0 (payment fails) | Email notification: "Payment failed, please update your payment method." In-app banner on all dashboard pages. | Full access continues. Credits from the previous cycle continue (credits are NOT reset since the new cycle could not start) |
| 2. First Retry | Day 3 | Automatic payment retry. Email: "We will retry your payment. Please ensure your payment method is valid." | Full access continues |
| 3. Second Retry | Day 7 | Second automatic payment retry. Email: "Second payment attempt. Please update your payment method to avoid service disruption." | Full access continues |
| 4. Restriction | Day 10 | If still failed: account enters "restricted" state. Email: "Your account has been restricted due to unpaid balance." | API rate limit reduced to Free plan levels. Credit allocation set to Free plan levels. No new credit pack purchases |
| 5. Suspension | Day 14 | Account suspended. Email: "Your account has been suspended. Update your payment method to restore access." | API access disabled entirely. Dashboard is accessible (read-only) so user can update payment method and view historical data |
| 6. Cancellation | Day 30 | Subscription cancelled. Email: "Your subscription has been cancelled due to non-payment." | Account downgraded to Free plan. Historical data retained. User can re-subscribe at any time |

### Failed Payment Banner

When a payment has failed, a persistent banner appears at the top of every dashboard page:

```
+--- Payment Failed Banner -----------------------------------------+
| Your last payment of ${amount} failed on {date}. Please update     |
| your payment method to avoid service disruption.                   |
| [Update Payment Method]                              [Dismiss X]   |
+--------------------------------------------------------------------+
```

- Banner color: warning (yellow/amber) for grace period, error (red) for restriction/suspension
- The banner is dismissible, but reappears on each new page load until the payment issue is resolved
- "Update Payment Method" button navigates to the billing page with the payment method section highlighted

### Payment Recovery

When the user updates their payment method during any stage of the escalation:

1. The system immediately attempts to charge the new payment method
2. If successful:
   - Account status restored to active
   - Credits allocated for the new billing cycle
   - All escalation stages cleared
   - Toast: "Payment successful. Your account has been restored."
   - Email: "Payment received. Your account is now active."
3. If the new payment method also fails:
   - Error shown on the billing page
   - Escalation ladder continues from its current stage

---

## 12. Subscription Cancellation

### Cancellation Flow

1. User navigates to Billing page and clicks "Cancel Subscription" (link below the current plan card, styled as text link, not a prominent button)
2. Cancellation confirmation page (inline, replaces the plan card area):
   - Title: "Cancel Your Pro Subscription"
   - "We're sorry to see you go. Before you cancel, please note:"
   - Bullet list of what changes:
     - "Your Pro features will remain active until {cycle_end_date}"
     - "After that, your account will revert to the Free plan"
     - "You will lose access to Browser and Stealth engines"
     - "Your API key limit will reduce to 1"
     - "Unused credits will not be refunded"
   - Optional feedback section:
     - "Help us improve. Why are you cancelling?" (dropdown)
     - Options: "Too expensive", "Not enough features", "Found an alternative", "Technical issues", "Just testing", "Other"
     - Optional free-text comment field (max 500 characters)
   - Buttons: "Confirm Cancellation" (destructive/red), "Keep My Subscription" (primary)
3. On confirmation:
   - Subscription is marked for cancellation at the end of the current billing cycle
   - No immediate charge or refund
   - Billing page shows: "Your subscription will end on {date}. [Reactivate]"
   - Confirmation email sent
   - User retains all Pro features until the cycle ends
4. Reactivation:
   - User can click "Reactivate" at any time before the cycle ends
   - Reactivation cancels the pending cancellation
   - No additional charge (the current cycle was already paid for)
   - Toast: "Subscription reactivated. Your Pro plan will continue."

### Post-Cancellation State

When the billing cycle ends after cancellation:

| Action | Detail |
|--------|--------|
| Plan revert | Account switches to Free plan |
| Credits | Reset to Free plan allocation (1,000 credits) |
| API keys | All keys beyond 1 are revoked. The most recently used key is kept |
| Engine access | Browser and Stealth engines become unavailable. Existing jobs completed with those engines remain in history |
| Data | All job history, analytics, and settings are retained. Nothing is deleted |
| Re-subscribe | User can upgrade back to Pro at any time. This starts a new billing cycle and subscription |

---

## 13. Refund Policy

### General Refund Rules

| Scenario | Refund Available | Detail |
|----------|-----------------|--------|
| Subscription charge | Case-by-case | Users can request a refund within 7 days of a charge for the current billing cycle. No refunds for partially used cycles beyond 7 days |
| Credit pack purchase | No | Credit packs are non-refundable once purchased (stated in Terms of Service) |
| Upgrade proration | No | Prorated upgrade charges are non-refundable |
| System downtime | Credit restoration | If the platform experienced significant downtime (defined by SLA terms), affected credits may be restored to the user's balance rather than monetary refund |
| Billing error | Full refund | If Scrapifie charges the wrong amount due to a system error, a full refund of the overcharge is issued automatically |
| Double charge | Full refund of duplicate | If a duplicate charge occurs, the duplicate is refunded automatically |

### Refund Request Process

1. User contacts support via the support ticket system (11-SETTINGS-AND-SUPPORT.md)
2. Support ticket is categorized as "Billing" type
3. Admin reviews the request in the admin panel (15-ADMIN-FINANCE.md)
4. If approved:
   - Refund is processed through the payment provider
   - Invoice is updated to show "Refunded" status
   - User receives email confirmation
   - Credit note is added to billing history
5. If denied:
   - Support responds with explanation
   - User can escalate (future: escalation process)

### Refund Timeline

| Step | Timing |
|------|--------|
| Request submitted | Immediate acknowledgment email |
| Review | Within 2 business days |
| Processing (if approved) | 1-3 business days for refund to initiate |
| Funds returned | 5-10 business days depending on payment provider and bank |

---

## 14. Provider-Agnostic Payment Integration

All payment processing in Scrapifie is abstracted behind a payment provider interface. This section defines the contract that any payment provider integration must fulfill, without specifying a particular provider.

### Required Payment Provider Capabilities

| Capability | Description | Required |
|------------|-------------|----------|
| Card tokenization | Accept and tokenize card details without raw card data touching Scrapifie servers | Yes |
| Recurring billing | Create, update, and cancel subscription schedules | Yes |
| One-time charges | Process single charges for credit packs | Yes |
| Webhooks | Send event notifications for payment success, failure, refund, dispute | Yes |
| Invoice generation | Generate or support generation of PDF invoices | Yes |
| Refund processing | Initiate full and partial refunds | Yes |
| Payment method management | Update and remove payment methods | Yes |
| Retry logic | Automatic retry of failed payments (or support for manual retry triggers) | Yes |
| Multi-currency | Support for currencies beyond USD | Nice to have (future) |
| Mobile payments | Support for mobile money or alternative payment methods | Nice to have (future) |

### Payment Provider Interface

The platform interacts with the payment provider through a defined set of operations:

**Subscription Operations:**

| Operation | Input | Output |
|-----------|-------|--------|
| Create Subscription | Plan ID, payment token, billing cycle anchor date | Subscription ID, status, next billing date |
| Update Subscription | Subscription ID, new plan ID | Updated subscription details, proration amount |
| Cancel Subscription | Subscription ID, cancel at period end flag | Cancellation confirmation, end date |
| Reactivate Subscription | Subscription ID | Reactivation confirmation |
| Get Subscription | Subscription ID | Current subscription details and status |

**Payment Operations:**

| Operation | Input | Output |
|-----------|-------|--------|
| Charge One-Time | Payment token, amount, description | Charge ID, status |
| Refund | Charge ID, amount (full or partial) | Refund ID, status |
| Get Payment Status | Charge ID | Current payment status |

**Payment Method Operations:**

| Operation | Input | Output |
|-----------|-------|--------|
| Create Payment Method | Provider-specific token from hosted form | Payment method ID, card type, last 4, expiry |
| Update Default | Payment method ID | Confirmation |
| Delete Payment Method | Payment method ID | Confirmation |

**Webhook Events:**

The platform must handle the following webhook events from the payment provider:

| Event | Platform Action |
|-------|----------------|
| payment.succeeded | Mark invoice as paid, allocate credits (if subscription renewal), add credits (if credit pack) |
| payment.failed | Begin failed payment escalation ladder |
| subscription.created | Record subscription in database, set billing cycle dates |
| subscription.updated | Update plan details in database |
| subscription.cancelled | Schedule downgrade, clear subscription at period end |
| refund.processed | Update invoice status, send refund confirmation email |
| dispute.created | Flag account for admin review, notify admin |

### Webhook Security

| Measure | Detail |
|---------|--------|
| Signature verification | All incoming webhooks must be verified using the payment provider's signature mechanism before processing |
| Idempotency | Each webhook event has a unique ID. The platform stores processed event IDs and skips duplicates |
| Replay protection | Events older than 5 minutes are rejected (configurable tolerance) |
| Endpoint security | Webhook endpoint is not publicly listed. URL contains a random segment for obscurity (defense in depth, not sole security measure) |
| Retry handling | If the platform returns a non-200 response, the provider retries. The platform must handle retries gracefully via idempotency |

---

## 15. Billing Notifications

### Email Notifications

| Event | Email Subject | Email Content Summary |
|-------|--------------|----------------------|
| Payment successful (subscription) | "Payment Received - Scrapifie" | Amount charged, plan name, next billing date, link to invoice |
| Payment successful (credit pack) | "Credit Pack Purchased - Scrapifie" | Pack name, credits added, new balance, link to invoice |
| Payment failed | "Payment Failed - Action Required" | Amount, reason if available, link to update payment method, escalation timeline |
| Payment retry scheduled | "Payment Retry Scheduled - Scrapifie" | Retry date, link to update payment method |
| Account restricted | "Account Restricted - Update Payment" | What restricted means, how to resolve, deadline before suspension |
| Account suspended | "Account Suspended - Immediate Action Required" | What suspended means, how to resolve, deadline before cancellation |
| Subscription cancelled (non-payment) | "Subscription Cancelled - Scrapifie" | Reason, what happens to account, how to re-subscribe |
| Subscription cancelled (user request) | "Subscription Cancellation Confirmed" | End date, what changes, how to reactivate |
| Subscription reactivated | "Subscription Reactivated - Scrapifie" | Confirmation, next billing date |
| Plan upgraded | "Plan Upgraded - Welcome to {Plan}" | New plan details, credit allocation, prorated charge |
| Plan downgrade scheduled | "Plan Downgrade Scheduled" | Effective date, what changes |
| Refund processed | "Refund Processed - Scrapifie" | Amount refunded, original charge reference, timeline for funds |
| Card expiring soon | "Your Card is Expiring - Scrapifie" | Sent 30 days before card expiry. Link to update payment method |

### In-App Notifications

| Event | Display | Location |
|-------|---------|----------|
| Payment failed | Persistent banner on all dashboard pages | Top of content area |
| Account restricted | Persistent banner (more urgent styling) | Top of content area |
| Account suspended | Full-page overlay on dashboard with payment method update form | Blocks all dashboard interaction except billing |
| Credit pack purchased | Toast notification | Standard toast position |
| Plan upgraded | Toast notification | Standard toast position |
| Card expiring soon | Banner on billing page only | Top of billing page content |

---

## 16. Empty and Error States

### Empty States

| Scenario | Message | CTA |
|----------|---------|-----|
| No payment method (Free plan) | "No payment method on file. Add one to upgrade or purchase credits." | "Add Payment Method" button |
| No payment method (trying to upgrade) | Payment method form is shown inline as part of the upgrade flow | Form submission |
| No billing history | "No billing history yet. Your invoices will appear here when you make a payment." | None |
| Free plan user viewing credit packs | "Credit packs are available for Pro and Enterprise plans." | "Upgrade to Pro" button |

### Error States

| Scenario | Message | Recovery |
|----------|---------|----------|
| Billing page fails to load | "Unable to load billing information. Please try again." | "Retry" button |
| Payment method form fails to load | "Unable to load payment form. Please try again or contact support." | "Retry" button, "Contact Support" link |
| Payment processing error | "Payment could not be processed: {provider_error_message}" | "Try Again" button within the modal |
| Invoice PDF download fails | Toast: "Unable to download invoice. Please try again." | Retry via the same download link |
| Subscription update fails | "Unable to update your subscription. Please try again or contact support." | "Try Again" button, "Contact Support" link |
| Webhook processing error | No user-facing error. Logged server-side, admin alerted. Webhook is retried by the provider | Automatic |

---

## 17. Edge Cases

| Scenario | Handling |
|----------|----------|
| User upgrades and immediately downgrades within the same day | Upgrade is processed (charged and credits added). Downgrade is scheduled for cycle end. No refund for the upgrade charge |
| User cancels then reactivates multiple times in one cycle | Each action is idempotent. Cancel sets the end-of-cycle flag, reactivate clears it. No additional charges |
| User purchases credit pack then downgrades to Free | Credit pack credits remain until cycle end. At cycle end, all credits (plan + pack) expire and Free plan credits (1,000) are allocated |
| Payment method expires before next billing cycle | "Card expiring soon" email sent 30 days before expiry. If card is expired when charge is attempted, payment fails and escalation ladder begins |
| User has pending payment when trying to change plan | Plan change is blocked until the pending payment resolves. Message: "A payment is currently being processed. Please wait for it to complete before changing your plan." |
| Billing cycle date falls on February 29 (leap year) | Billing date anchors to the last day of the month. Feb 29 subscribers are billed on Feb 28 in non-leap years |
| Currency conversion | All charges are in USD. Users paying with non-USD cards are subject to their bank's conversion rates. Scrapifie does not handle currency conversion |
| Dispute/chargeback filed | Account is immediately flagged for admin review. Admin may suspend the account pending investigation. If the dispute is resolved in Scrapifie's favor, account is restored. If resolved in the user's favor, the disputed amount is treated as a refund |
| Free plan user receives a failed payment email | This should not happen. Free plan users have no subscription. If triggered by a bug, the email should not be sent (server-side validation before sending) |
| Concurrent credit pack purchases | Each purchase request is processed sequentially (database-level locking on the credit balance). The 5-pack-per-cycle limit is enforced atomically |
| User deletes account with active subscription | Subscription is cancelled immediately (not at cycle end). No refund for remaining cycle. Account is soft-deleted. See 11-SETTINGS-AND-SUPPORT.md |
| Enterprise plan pricing change | Admin updates the custom plan via admin panel. Change takes effect on the next billing cycle. Current cycle is unaffected |
| Webhook arrives before the user sees the in-app response | The platform processes webhooks asynchronously. The in-app response uses the payment provider's synchronous response. Webhooks are used for reconciliation and handling async events (like delayed bank transfers) |
| Annual plan subscriber wants to add monthly credit pack | Allowed. Credit packs are always month-scoped (expire at the end of the month in which they are purchased, NOT at the annual subscription renewal date). This is because credit pack expiry is tied to the credit allocation cycle, which is monthly even for annual subscribers |

---

## 18. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Plan tiers overview, platform architecture |
| 01-PUBLIC-WEBSITE.md | Pricing page design and content |
| 02-LEGAL-FRAMEWORK.md | Terms of Service billing clauses, refund policy, payment terms |
| 05-USER-DASHBOARD.md | Dashboard layout with credit balance display |
| 08-USAGE-AND-ANALYTICS.md | Credit usage charts and analytics |
| 11-SETTINGS-AND-SUPPORT.md | Account deletion with active subscription, support tickets for billing issues |
| 12-ADMIN-DASHBOARD.md | Admin overview of platform revenue and billing health |
| 15-ADMIN-FINANCE.md | Admin management of invoices, refunds, custom plans, revenue reports |
| 18-DATA-MODELS.md | Subscription, invoice, credit transaction, and payment method data schemas |
| APPENDICES/B-EMAIL-TEMPLATES.md | All billing-related email templates |
