# ScraperX Roadmap -- Phase 8: Billing and Credits

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-08 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 8 of 12 |
| Prerequisites | Phase 7 (user dashboard complete) |
| Related Documents | 09-BILLING-AND-CREDITS.md, 15-ADMIN-FINANCE.md, 18-DATA-MODELS.md, 21-TESTING-STRATEGY.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Payment Provider Integration](#4-deliverable-1-payment-provider-integration)
5. [Deliverable 2: Subscription Management](#5-deliverable-2-subscription-management)
6. [Deliverable 3: Credit System](#6-deliverable-3-credit-system)
7. [Deliverable 4: Billing Page UI](#7-deliverable-4-billing-page-ui)
8. [Deliverable 5: Invoice System](#8-deliverable-5-invoice-system)
9. [Deliverable 6: Failed Payment Handling](#9-deliverable-6-failed-payment-handling)
10. [Deliverable 7: Billing Notifications](#10-deliverable-7-billing-notifications)
11. [Testing Requirements](#11-testing-requirements)
12. [Risk Assessment](#12-risk-assessment)
13. [Definition of Done](#13-definition-of-done)
14. [Connection to Next Phase](#14-connection-to-next-phase)

---

## 1. Phase Overview

Phase 8 implements the entire billing and credit system. This is the monetization layer of the platform. It integrates with a payment provider (provider-agnostic -- see 09-BILLING-AND-CREDITS.md), manages subscriptions and plan changes, handles credit allocation and deduction, processes credit pack purchases, generates invoices, and handles payment failures with an escalation ladder.

This phase has the highest test coverage requirement in the platform. Every billing operation must be tested at 100% line and branch coverage. Money-related bugs are unacceptable.

### What Exists Before Phase 8

- Everything from Phases 1-7 (scraping engine + auth + dashboard)
- Database tables for subscription, invoice, credit_ledger, credit_pack_purchase, payment_method, payment_failure, refund (created in Phase 6 migrations but not yet used by application code)
- Credit balance field on account table (set to 1000 for Free plan on registration)
- Dashboard UI with billing link in sidebar (not yet functional)

### What Exists After Phase 8

- Payment provider integration (provider-agnostic abstraction layer)
- Subscription lifecycle (create, upgrade, downgrade, cancel, reactivate)
- Proration calculation for mid-cycle plan changes
- Credit system (allocation, deduction, reservation, reset on cycle renewal)
- Credit pack purchasing
- Billing page UI (plan card, credit balance, payment method, invoices)
- Invoice generation and PDF download
- Webhook processing for payment provider events
- Failed payment escalation ladder (grace, retry, restrict, suspend, cancel)
- Billing-related email notifications
- Refund request handling

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | Users can upgrade from Free to Pro with payment |
| G2 | Users can downgrade from Pro to Free (takes effect at cycle end) |
| G3 | Users can purchase credit packs (Pro and Enterprise only) |
| G4 | Credits are correctly deducted on job completion and failure |
| G5 | Credits reset to plan allocation at billing cycle renewal |
| G6 | Invoices are generated for all charges and downloadable as PDF |
| G7 | Failed payments trigger escalation ladder with user notification |
| G8 | All billing operations are atomic and cannot result in incorrect balances |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Upgrade flow works end-to-end | E2E test with mocked payment provider passes |
| Downgrade schedules correctly and executes at cycle end | Integration test passes |
| Credit pack purchase adds credits to balance | Integration test passes |
| Credit deduction on job completion is atomic | Concurrent deduction test passes |
| Credit balance never goes negative | Property-based test with random operations passes |
| Invoice generated on every charge | Integration test verifies invoice creation |
| Failed payment escalation progresses through all stages | Integration test with time manipulation passes |
| Webhook signature verification rejects invalid signatures | Security test passes |
| Billing module test coverage at 100% | Coverage report confirms |
| No regressions in Phase 7 tests | All previous tests pass |

---

## 3. Prerequisites Check

Before starting Phase 8, verify:

| Check | How to Verify |
|-------|--------------|
| Phase 7 Definition of Done met | All 23 criteria from PHASE-07.md Section 14 confirmed |
| Dashboard billing link navigates to /dashboard/billing | Click link, verify route exists (even if page is empty) |
| Credit balance displays correctly on dashboard | Verify stat card shows 1000 for Free plan |
| Payment provider sandbox/test account created | Verify API credentials work |
| Webhook endpoint URL determined | Decide on /api/webhooks/payment URL |
| Git branch created | Create phase-08/billing branch from main |

---

## 4. Deliverable 1: Payment Provider Integration

**Reference Document:** 09-BILLING-AND-CREDITS.md Section 16

### Task 4.1: Provider Abstraction Layer

Build a provider-agnostic payment service interface. The platform must work with any payment provider (Paystack, Flutterwave, or others) by implementing this interface.

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| createSubscription | Create a new subscription for an account | accountId, planId, paymentMethodToken, billingInterval | subscriptionId, status, currentPeriodStart, currentPeriodEnd |
| updateSubscription | Change plan or billing interval | subscriptionId, newPlanId, prorate (boolean) | updatedSubscription, prorationAmount, creditAdjustment |
| cancelSubscription | Schedule cancellation at period end | subscriptionId | cancelAt date |
| reactivateSubscription | Reverse a pending cancellation | subscriptionId | updatedSubscription |
| chargeOneTime | Process a one-time charge (credit packs) | accountId, amount, description, idempotencyKey | chargeId, status |
| createPaymentMethod | Initialize payment method setup (hosted form) | accountId, returnUrl | setupUrl (redirect user to provider's hosted form) |
| getPaymentMethod | Retrieve stored payment method details | accountId | last4, brand, expiryMonth, expiryYear |
| removePaymentMethod | Remove stored payment method | accountId, paymentMethodId | success |
| refundCharge | Issue a full or partial refund | chargeId, amount (optional for partial) | refundId, status |
| verifyWebhookSignature | Validate incoming webhook authenticity | payload, signature, secret | boolean |

### Task 4.2: Provider Implementation

Implement the abstraction for the chosen payment provider. The implementation:

1. Translates between platform subscription/plan concepts and provider-specific API calls
2. Handles provider-specific authentication (API keys, signatures)
3. Maps provider-specific webhook event names to platform event names
4. Stores only tokenized payment information (no raw card data -- PCI compliance)
5. Implements retry logic for transient provider errors (3 retries with exponential backoff)
6. Logs all provider interactions for debugging (excluding sensitive data)

### Task 4.3: Webhook Endpoint

Build the webhook receiver endpoint that processes payment provider events.

| Component | Details |
|-----------|---------|
| Endpoint | POST /api/webhooks/payment |
| Authentication | No session required (webhook from external provider), authenticated via signature verification |
| Signature verification | Verify HMAC signature using webhook secret, reject if invalid (401) |
| Idempotency | Store processed event IDs, skip already-processed events (return 200 without action) |
| Replay protection | Reject events older than 5 minutes based on timestamp header |
| Event processing | Map provider event to platform action per event mapping table below |

#### Webhook Event Mapping

| Provider Event | Platform Action |
|---------------|----------------|
| subscription.created | Create subscription record, allocate credits, generate invoice |
| subscription.updated | Update subscription record, adjust credits if plan changed |
| subscription.cancelled | Mark subscription as cancelled, schedule end-of-cycle actions |
| payment.succeeded | Mark invoice as paid, send receipt email |
| payment.failed | Create payment failure record, enter/advance escalation stage, send notification |
| refund.processed | Update refund record status, adjust credits if applicable, send notification |
| payment_method.updated | Update stored payment method details |

### Task 4.4: Plan Configuration

Define plan details as platform configuration (not hardcoded).

| Plan | Price (Monthly) | Price (Annual) | Credits | API Key Limit | Rate Limit (req/min) | Engines |
|------|----------------|----------------|---------|---------------|---------------------|---------|
| Free | $0 | $0 | 1,000 | 1 | 10 | HTTP only |
| Pro | $49 | $470 ($39.17/mo) | 50,000 | 5 | 100 | All |
| Enterprise | Custom | Custom | Custom | Unlimited | Custom | All |

Plan configuration is stored in the platform_configuration table (created in Phase 6) and loaded at application startup. Changes to plan configuration take effect for new subscriptions only; existing subscriptions are grandfathered.

---

## 5. Deliverable 2: Subscription Management

**Reference Document:** 09-BILLING-AND-CREDITS.md Sections 5-8

### Task 5.1: Plan Upgrade Flow (Backend)

| Step | Action |
|------|--------|
| 1 | Validate user has a payment method on file (required for paid plans) |
| 2 | Calculate proration: remaining days in current cycle, prorated charge for new plan, prorated credit allocation |
| 3 | Call payment provider to update subscription with proration |
| 4 | On success: update subscription record, add prorated credits to balance, create credit ledger entry, generate invoice for prorated charge |
| 5 | On failure: return error, no changes made (atomic) |
| 6 | Send upgrade confirmation email |
| 7 | Create audit log entry |

Proration formula:
- Remaining days = cycle end date minus today
- Total days = cycle end date minus cycle start date
- Prorated charge = (new plan price minus old plan price) multiplied by (remaining days divided by total days)
- Prorated credits = (new plan credits minus old plan credits) multiplied by (remaining days divided by total days), rounded up to nearest integer

### Task 5.2: Plan Downgrade Flow (Backend)

| Step | Action |
|------|--------|
| 1 | Record downgrade intent: set subscription.downgrade_to = target plan |
| 2 | Downgrade takes effect at end of current billing cycle (no immediate changes) |
| 3 | If user has more API keys than target plan allows: require user to select which keys to keep (frontend handles this) |
| 4 | Send downgrade scheduled email with effective date |
| 5 | Create audit log entry |
| 6 | Allow cancellation of pending downgrade (removes downgrade_to, sends cancellation email) |

### Task 5.3: Billing Cycle Renewal (Backend)

A scheduled task runs daily to process billing cycle renewals.

| Step | Action |
|------|--------|
| 1 | Find all subscriptions where current_period_end is today or earlier |
| 2 | For each subscription: |
| 2a | If downgrade_to is set: change plan to downgrade target, deactivate excess API keys, clear downgrade_to |
| 2b | If cancellation is pending: revert to Free plan, clear payment method association |
| 2c | Reset credit balance to new plan allocation (remaining credits are lost, no rollover) |
| 2d | Create credit ledger entry for cycle reset |
| 2e | Advance billing period: set current_period_start = old end, current_period_end = old end + interval |
| 2f | Trigger payment provider charge for next cycle (paid plans) |
| 2g | Generate invoice for new cycle |
| 3 | Handle date edge cases: if anchor date is 31st and next month has 30 days, use 30th; February uses 28th (or 29th in leap year) |

### Task 5.4: Subscription Cancellation (Backend)

| Step | Action |
|------|--------|
| 1 | Mark subscription for cancellation at period end (subscription.cancel_at = current_period_end) |
| 2 | User retains all current plan features until cancel_at date |
| 3 | Send cancellation confirmation email with effective date and reactivation option |
| 4 | Create audit log entry |
| 5 | Allow reactivation: clear cancel_at field, send reactivation confirmation email |

### Task 5.5: Billing Interval Change (Backend)

| Scenario | Handling |
|----------|---------|
| Monthly to annual | Treated as upgrade: prorated charge for price difference, immediate switch, new annual period starts now |
| Annual to monthly | Takes effect at annual period end: monthly billing begins when current annual period expires |

---

## 6. Deliverable 3: Credit System

**Reference Document:** 09-BILLING-AND-CREDITS.md Sections 2-3

### Task 6.1: Credit Deduction on Job Completion

Integrate credit deduction into the existing job completion flow.

| Component | Details |
|-----------|---------|
| Trigger | Job worker marks job as completed or failed (after max retries) |
| Cost lookup | HTTP = 1 credit, Browser = 5 credits, Stealth = 10 credits |
| Deduction | Atomic decrement of account.credit_balance by cost amount |
| Ledger entry | Create credit_ledger entry: account_id, amount (negative), type = "job_charge", reference_id = job_id, balance_after |
| Test key exemption | Jobs submitted with test-type API keys never deduct credits |
| Cancelled/expired jobs | No credit deduction |

### Task 6.2: Credit Reservation

When a job is submitted, reserve credits to prevent over-spending.

| Step | Action |
|------|--------|
| 1 | On job submission (POST /v1/scrape): check account credit balance >= engine cost |
| 2 | If insufficient: reject with 402 and error message including current balance and required cost |
| 3 | If sufficient: atomically decrement balance by cost (reservation) |
| 4 | On job completion/failure: no further deduction needed (already reserved) |
| 5 | On job cancellation: atomically increment balance by cost (release reservation) |
| 6 | Create ledger entries for both reservation and release |

### Task 6.3: Credit Pack Purchase

| Step | Action |
|------|--------|
| 1 | Validate user is on Pro or Enterprise plan (Free cannot purchase packs) |
| 2 | Validate user has not purchased more than 5 packs in current billing cycle |
| 3 | Validate payment method exists |
| 4 | Charge via payment provider (one-time charge with idempotency key) |
| 5 | On success: atomically add pack credits to balance, create ledger entry, create credit_pack_purchase record, generate invoice |
| 6 | On failure: return error, no credit change |
| 7 | Send purchase confirmation email |

Credit pack tiers:

| Pack | Credits | Price |
|------|---------|-------|
| Small | 10,000 | $15 |
| Medium | 25,000 | $30 |
| Large | 50,000 | $50 |

### Task 6.4: Credit Balance Integrity

All credit operations must be atomic. Implement using one of:
- Database-level atomic operations (UPDATE account SET credit_balance = credit_balance - cost WHERE id = X AND credit_balance >= cost)
- Row-level locking (SELECT FOR UPDATE on account row before modifying balance)

Requirements:
- Balance can never go negative
- Concurrent operations must not cause race conditions
- Every balance change has a corresponding credit_ledger entry
- Ledger entries are immutable (append-only)
- Sum of all ledger entries for an account must equal current balance (reconciliation check)

---

## 7. Deliverable 4: Billing Page UI

**Reference Document:** 09-BILLING-AND-CREDITS.md Section 4

### Task 7.1: Billing Page Layout

| Element | Details |
|---------|---------|
| Route | /dashboard/billing |
| Page title | "Billing" |
| Layout | Single column, sections stacked vertically: Current Plan, Credit Balance, Payment Method, Billing History |

### Task 7.2: Current Plan Card

| Element | Details |
|---------|---------|
| Content | Plan name (Free/Pro/Enterprise), price per month/year, billing interval, next billing date |
| Upgrade button | Shown on Free plan: "Upgrade to Pro" |
| Downgrade button | Shown on Pro plan: "Downgrade to Free" (opens downgrade flow) |
| Cancel button | Shown on paid plans: "Cancel Subscription" |
| Pending downgrade notice | If downgrade is scheduled: "Your plan will change to {plan} on {date}" with "Cancel Downgrade" button |
| Pending cancellation notice | If cancellation is scheduled: "Your subscription will end on {date}" with "Reactivate" button |

### Task 7.3: Upgrade Flow (Frontend)

| Step | UI |
|------|-----|
| 1 | Click "Upgrade to Pro" |
| 2 | If no payment method: redirect to add payment method first, then return |
| 3 | Confirmation modal: show plan comparison (Free vs Pro), prorated charge amount, prorated credits to be added, next full charge date and amount |
| 4 | "Confirm Upgrade" button with loading state |
| 5 | On success: toast "Upgraded to Pro!", plan card updates, credit balance updates |
| 6 | On failure: error toast with message from API |

### Task 7.4: Downgrade Flow (Frontend)

| Step | UI |
|------|-----|
| 1 | Click "Downgrade to Free" |
| 2 | Confirmation modal: list of features being lost (reduced credits, fewer keys, HTTP only, lower rate limit), effective date, no refund notice |
| 3 | If user has more API keys than Free allows: show key selection UI (choose which 1 key to keep, others will be deactivated) |
| 4 | "Confirm Downgrade" button |
| 5 | On success: toast "Downgrade scheduled for {date}", pending downgrade notice appears on plan card |
| 6 | "Cancel Downgrade" button on the notice to reverse |

### Task 7.5: Cancellation Flow (Frontend)

| Step | UI |
|------|-----|
| 1 | Click "Cancel Subscription" |
| 2 | First modal: "Are you sure?" with list of what will happen (revert to Free, lose credits, keys deactivated, data retention changes) |
| 3 | Optional feedback dropdown: "Why are you cancelling?" (Too expensive, Not using enough, Missing features, Switching to competitor, Other) |
| 4 | "Cancel Subscription" button (danger style) |
| 5 | On success: toast "Subscription will end on {date}", pending cancellation notice appears |
| 6 | "Reactivate" button on the notice to reverse |

### Task 7.6: Credit Balance Card

| Element | Details |
|---------|---------|
| Content | Credits used / Credits total, progress bar with color thresholds (green <60%, yellow <80%, orange <90%, red >=90%), percentage used |
| Buy credits button | Shown on Pro/Enterprise: "Buy Credits" opens credit pack purchase flow |
| Buy credits disabled | On Free plan: "Upgrade to Pro to purchase credit packs" |

### Task 7.7: Credit Pack Purchase Flow (Frontend)

| Step | UI |
|------|-----|
| 1 | Click "Buy Credits" |
| 2 | Modal: three pack cards (Small/Medium/Large) with credits and price, highlight best value |
| 3 | Select a pack |
| 4 | Confirmation: pack details, payment method to be charged, current balance, balance after purchase |
| 5 | "Purchase" button with loading state |
| 6 | On success: toast "10,000 credits added!", balance card updates |
| 7 | On failure: error toast |

### Task 7.8: Payment Method Card

| Element | Details |
|---------|---------|
| Content | Card brand icon, last 4 digits, expiry date (e.g., "Visa ending in 4242, expires 12/2027") |
| No method | "No payment method on file" with "Add Payment Method" button |
| Update button | "Update" opens provider's hosted form (redirect flow for PCI compliance) |
| Remove button | Only shown on Free plan (cannot remove if on paid plan) |

### Task 7.9: Payment Method Add/Update Flow (Frontend)

| Step | UI |
|------|-----|
| 1 | Click "Add Payment Method" or "Update" |
| 2 | Call backend to get provider's hosted form URL |
| 3 | Redirect user to provider's hosted form |
| 4 | User enters card details on provider's page (platform never sees raw card data) |
| 5 | Provider redirects back to /dashboard/billing?payment_setup=success (or failure) |
| 6 | On success: payment method card updates with new details, toast confirmation |
| 7 | On failure: error toast |

### Task 7.10: Billing History Table

| Element | Details |
|---------|---------|
| Columns | Date, Description (e.g., "Pro Plan - Monthly", "Credit Pack - Small"), Amount (formatted with currency), Status (Paid/Pending/Failed/Void/Refunded badge), Actions (Download PDF) |
| Pagination | 10 per page |
| Empty state | "No billing history yet" |
| PDF download | Click download icon to get invoice PDF |

---

## 8. Deliverable 5: Invoice System

**Reference Document:** 09-BILLING-AND-CREDITS.md Section 10

### Task 8.1: Invoice Generation

Invoices are generated automatically on these events:

| Event | Invoice Content |
|-------|----------------|
| Subscription charge (new or renewal) | Plan name, billing period, amount |
| Prorated upgrade charge | Old plan, new plan, proration period, amount |
| Credit pack purchase | Pack name, credits, amount |

Invoice fields:
- Invoice number (sequential, formatted: INV-YYYYMM-XXXX)
- Account ID and user name/email
- Date issued
- Date due (same as issued for immediate charges)
- Line items (description, quantity, unit price, total)
- Subtotal, tax (if applicable, placeholder for future), total
- Payment status (paid, pending, failed, void, refunded)
- Payment method used (last 4 digits)

### Task 8.2: Invoice PDF Generation

Generate downloadable PDF invoices.

| Component | Details |
|-----------|---------|
| Content | Platform name and logo, invoice number, dates, account details, line items table, totals, payment status |
| Generation | Server-side PDF generation on demand (not pre-generated) |
| Endpoint | GET /api/billing/invoices/:id/pdf |
| Caching | Cache generated PDF for 24 hours (same invoice does not change after payment) |
| Access control | Only accessible by the account that owns the invoice, or by admin |

---

## 9. Deliverable 6: Failed Payment Handling

**Reference Document:** 09-BILLING-AND-CREDITS.md Section 12

### Task 9.1: Escalation Ladder Implementation

Build a scheduled task that advances payment failure escalation stages.

| Stage | Day | Action | User Impact |
|-------|-----|--------|-------------|
| 1 - Grace | Day 0 | Payment fails, record created, notification sent | No impact, service continues |
| 2 - Retry 1 | Day 3 | Automatic retry via payment provider | If success: recovery, clear failure. If fail: advance to stage 3 |
| 3 - Retry 2 | Day 7 | Second automatic retry | If success: recovery. If fail: advance to stage 4 |
| 4 - Restrict | Day 10 | Account restricted: API returns read-only (existing jobs complete, new jobs rejected) | Cannot submit new jobs, can still view dashboard |
| 5 - Suspend | Day 14 | Account suspended: all API keys disabled, sessions cleared | Full lockout except billing page |
| 6 - Cancel | Day 30 | Subscription cancelled, revert to Free plan | Loses all paid features permanently |

### Task 9.2: Failed Payment Banner

When an account has an active payment failure:

| Stage | Banner |
|-------|--------|
| Grace (1-3) | Yellow warning: "Payment failed. Please update your payment method." with "Update Payment Method" button |
| Retry (3-10) | Orange warning: "Payment retry failed. Your account will be restricted on {date}." with "Update Payment Method" button |
| Restricted (10-14) | Red warning: "Your account is restricted due to payment failure. Update your payment method to restore access." Full-width, cannot be dismissed |
| Suspended (14-30) | Red full-page overlay: "Account Suspended" with payment update form and support link. Only billing page accessible |

### Task 9.3: Payment Recovery Flow

When a user updates their payment method during an active failure:

| Step | Action |
|------|--------|
| 1 | User updates payment method via hosted form |
| 2 | On return: immediately attempt charge with new payment method |
| 3 | On success: clear payment failure record, restore full access (un-restrict or un-suspend), re-enable API keys, send recovery confirmation email |
| 4 | On failure: keep current escalation stage, show error, suggest contacting support |

---

## 10. Deliverable 7: Billing Notifications

**Reference Document:** 09-BILLING-AND-CREDITS.md Section 17

### Task 10.1: Email Notifications

| Event | Email | Priority |
|-------|-------|----------|
| Subscription created | Welcome to Pro plan, next billing date, credits allocated | Normal |
| Subscription upgraded | Upgrade confirmation, prorated charge details, new credits | Normal |
| Subscription downgraded | Downgrade scheduled, effective date, feature changes | Normal |
| Subscription cancelled | Cancellation confirmed, effective date, reactivation option | Normal |
| Subscription renewed | Renewal confirmation, charge amount, new credits allocated | Normal |
| Payment succeeded | Receipt with invoice details | Normal |
| Payment failed | Payment failed, update payment method link | Urgent |
| Account restricted | Restriction notice, update payment method link, deadline | Urgent |
| Account suspended | Suspension notice, update payment method link, cancellation date | Urgent |
| Credit pack purchased | Purchase confirmation, credits added, new balance | Normal |
| Credits at 75% used | Usage warning, upgrade or buy packs suggestion | Normal |
| Credits at 90% used | Running low warning, urgent upgrade suggestion | Normal |
| Credits exhausted (100%) | Credits depleted, all new jobs will be rejected | Urgent |

### Task 10.2: In-App Notifications

| Event | Display |
|-------|---------|
| Credits at 50% | Info banner on dashboard overview (dismissible once per cycle) |
| Credits at 75% | Warning banner on dashboard overview (dismissible once per cycle) |
| Credits at 90% | Persistent warning banner (cannot be dismissed) |
| Credits at 100% | Persistent error banner: "No credits remaining" |
| Payment failed | Persistent banner per Section 9.2 |
| Downgrade pending | Notice on billing page plan card |

---

## 11. Testing Requirements

**Reference Document:** 21-TESTING-STRATEGY.md, Section 13 (Billing and Credit Testing)

### Coverage Requirement

All billing and credit code must achieve **100% line and branch coverage**. No exceptions.

### Unit Tests

| Module | Estimated Tests |
|--------|----------------|
| Proration calculator | 15-20 (edge dates, leap year, month boundaries, same-day, last-day) |
| Credit cost calculator | 5 (one per engine type, test key exemption, unknown engine) |
| Invoice number generator | 5 (format, sequential, month rollover) |
| Plan configuration loader | 5 (load, validate, missing fields, unknown plan) |
| Billing cycle date calculator | 10 (normal months, Feb, leap year, 31st anchor, timezone) |
| Payment failure stage calculator | 8 (each stage transition, recovery, already cancelled) |

### Integration Tests

| Flow | Estimated Tests |
|------|----------------|
| Subscription creation (Free to Pro) | 5 |
| Subscription upgrade with proration | 8 (various days in cycle, edge dates) |
| Subscription downgrade scheduling | 5 (schedule, execute, cancel downgrade) |
| Subscription cancellation and reactivation | 5 |
| Billing cycle renewal | 8 (normal, with downgrade, with cancellation, credit reset, date edges) |
| Credit deduction on job completion | 5 (each engine, test key, concurrent) |
| Credit reservation and release | 5 (reserve, release on cancel, insufficient balance) |
| Credit pack purchase | 5 (success, insufficient packs, wrong plan, payment failure) |
| Invoice generation | 5 (subscription, proration, credit pack, PDF generation) |
| Webhook processing | 10 (each event type, invalid signature, duplicate event, malformed payload) |
| Payment failure escalation | 8 (each stage, recovery at each stage, full progression to cancel) |
| Payment recovery | 5 (success at each restriction level, re-enable keys, clear failure) |
| Concurrent credit operations | 5 (simultaneous deductions, deduction + pack purchase, deduction + cycle reset) |

### E2E Tests

| Flow | Count |
|------|-------|
| Upgrade from Free to Pro (mocked provider) | 1 |
| Purchase credit pack | 1 |
| View billing history and download invoice | 1 |
| Payment failure banner display | 1 |

### Security Tests

| Test | Count |
|------|-------|
| Webhook signature verification (valid, invalid, missing) | 3 |
| Webhook idempotency (duplicate event) | 1 |
| Webhook replay protection | 1 |
| Payment method access control (own account only) | 2 |
| Invoice access control (own account only) | 2 |
| Credit balance manipulation prevention | 3 |

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Payment provider API changes | Low | High | Abstraction layer isolates changes to single implementation file |
| Race conditions in credit operations | Medium | Critical | Atomic database operations, row-level locking, extensive concurrent tests |
| Proration calculation errors | Medium | High | 100% test coverage on proration, property-based testing with random dates |
| Webhook delivery failures from provider | Medium | High | Implement webhook retry acknowledgment, reconciliation job |
| User disputes/chargebacks | Medium | Medium | Clear cancellation policy, refund window, good communication |
| Failed payment email deliverability | Low | Medium | Use established email provider, monitor delivery rates |
| Invoice PDF generation performance | Low | Low | Cache generated PDFs, generate on-demand not in bulk |

---

## 13. Definition of Done

Phase 8 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | Payment provider abstraction layer implemented and tested |
| 2 | Payment provider implementation (chosen provider) working in sandbox |
| 3 | Webhook endpoint receives and processes all event types |
| 4 | Webhook signature verification rejects invalid signatures |
| 5 | Subscription upgrade works end-to-end with correct proration |
| 6 | Subscription downgrade schedules correctly and executes at cycle end |
| 7 | Subscription cancellation and reactivation work correctly |
| 8 | Billing cycle renewal resets credits and charges for next cycle |
| 9 | Credit deduction is atomic on job completion and failure |
| 10 | Credit reservation prevents over-spending |
| 11 | Credit pack purchase adds credits correctly (Pro/Enterprise only) |
| 12 | Credit balance never goes negative under any operation |
| 13 | Billing page displays plan, balance, payment method, and history |
| 14 | Upgrade, downgrade, and cancellation UI flows work |
| 15 | Credit pack purchase UI works |
| 16 | Payment method add/update/remove works via hosted form |
| 17 | Invoices are generated for all charges |
| 18 | Invoice PDF download works |
| 19 | Failed payment escalation ladder progresses through all stages |
| 20 | Failed payment recovery restores access on successful payment |
| 21 | Payment failure banners display at correct escalation stages |
| 22 | All billing emails send correctly (13 email types) |
| 23 | In-app credit usage notifications display at correct thresholds |
| 24 | Billing module test coverage is at 100% line and branch |
| 25 | No regressions in Phase 7 tests |

---

## 14. Connection to Next Phase

Phase 8 provides the billing foundation that Phase 9 builds upon:

- **Phase 9 (Settings, Support, and Team Foundations)** adds the Settings pages (profile, security, notifications, appearance), the support ticket system, and data model preparation for future team/organization features
- Phase 9 depends on Phase 8 for: subscription data displayed in settings, billing-related notification preferences, and payment method management (referenced from settings security)
- The support system in Phase 9 will handle billing-related support tickets
- Account deletion flow in Phase 9 must handle subscription cancellation (built in Phase 8)

**Read before starting Phase 9:** 11-SETTINGS-AND-SUPPORT.md (settings pages, support system), 10-TEAM-MANAGEMENT.md (future team data model preparation)
