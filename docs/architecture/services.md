# Service Layer Architecture

This document describes the service layer that sits between the HTTP route handlers and the database repositories. Each service encapsulates a cohesive unit of business logic. Route handlers are kept thin: they validate input, call a service method, and return the result. The services themselves know nothing about HTTP; they operate on plain data and communicate with the database through repository objects.

Related reading: [Credits API Reference](../api/credits.md), [Anti-Bot Evasion Architecture](anti-bot-evasion.md)

---

## Overview

The `src/services/` directory contains the following services:

| Service | File | Responsibility |
|---|---|---|
| Email | `email.service.ts` | Transactional email delivery |
| Subscription | `subscription.service.ts` | Plan management and billing cycles |
| Webhook | `webhook.service.ts` | Paystack webhook ingestion and routing |
| Credit | `credit.service.ts` | Credit ledger mutations |
| Credit Pack | `creditPack.service.ts` | One-time credit pack purchases |
| Invoice | `invoice.service.ts` | Invoice creation and lifecycle |
| Payment Failure | `paymentFailure.service.ts` | Failure tracking and recovery |
| Support | `support.service.ts` | Support ticket management |
| User Profile | `userProfile.service.ts` | Profile and settings updates |
| Notification | `notification.service.ts` | In-app notification delivery |
| Avatar | `avatar.service.ts` | Profile image handling |

The scraping functionality is implemented in the engine and worker layer rather than as a dedicated service, and is covered in the sections below.

---

## Email Service

The email service (`EmailService`) is a thin wrapper over Nodemailer. It configures a single SMTP transporter at construction time using the environment variables `SMTP_HOST`, `SMTP_PORT`, `FROM_EMAIL`, and `FROM_NAME`. In development, pointing `SMTP_HOST` to MailDev on `localhost:1025` captures all outgoing mail in a local inbox without sending any messages to real addresses.

The service exposes one method per email type. Each method constructs a subject line and an HTML body using a private template helper, then delegates to a shared `sendEmail` method. The template helpers produce fully self-contained HTML emails with inline styles so they render consistently across email clients.

### Email Templates

| Method | Trigger | Recipient |
|---|---|---|
| `sendEmailVerification` | User signs up | New user |
| `sendEmailChangeVerification` | User requests email change | New email address |
| `sendEmailChangeNotification` | Email change completes | Old email address |
| `sendPasswordResetEmail` | User requests password reset | Account email |
| `sendPasswordChangedEmail` | Password changed successfully | Account email |
| `sendSupportTicketCreated` | Support ticket submitted | Ticket creator |
| `sendSupportTicketReply` | Reply added to ticket | Ticket creator or assigned admin |
| `sendPaymentSuccessEmail` | Payment processed | Account billing email |
| `sendPaymentFailedEmail` | Payment declined | Account billing email |
| `sendSubscriptionUpgradedEmail` | Plan upgraded | Account email |
| `sendSubscriptionCanceledEmail` | Subscription cancelled | Account email |
| `sendCreditPackPurchasedEmail` | Credit pack purchased | Account email |
| `sendInvoiceEmail` | Invoice generated | Account billing email |

All email templates include the Scrapifie logo, a clear subject line, a primary action button with the relevant URL, and a footer with a brief security note explaining what the user should do if they did not initiate the action.

Verification and password reset links expire: email verification links expire after 24 hours, and password reset links expire after 1 hour.

---

## Subscription Service

The `SubscriptionService` manages the full lifecycle of a paying subscription. It takes a `PaymentProvider` interface at construction time, allowing the underlying payment processor to be swapped without changing the service logic. The current implementation connects to Paystack.

### Plan Configuration

Plan prices and credit allocations are defined in a `getPlanPrices()` function internal to the service. The Paystack plan codes come from environment variables and are required for any paid plan operation.

| Plan | Monthly Price | Credits Included |
|---|---|---|
| Free | $0 | 1,000 |
| Pro | $49.00 | 50,000 |
| Enterprise | $199.00 | 250,000 |

Prices are stored and transmitted in cents (integer arithmetic). The pro plan price code is read from `PAYSTACK_PRO_PLAN_CODE` and the enterprise code from `PAYSTACK_ENTERPRISE_PLAN_CODE`.

### Subscription Operations

**Creating a subscription** (`createSubscription`): Called when a free user upgrades to a paid plan. The service creates a Paystack customer if one does not already exist, attaches the provided payment method, creates the Paystack subscription, persists the subscription record and related account fields, and allocates the initial credit batch via the credit service.

**Upgrading a subscription** (`upgradeSubscription`): Moves a paying account to a higher tier immediately. The service calls the payment provider to swap the plan at the Paystack level with `create_prorations` behaviour, updates the local subscription record, and tops up the account with the difference in monthly credits. A prorated charge is calculated to represent the remaining days on the new plan's price.

**Downgrading a subscription** (`downgradeSubscription`): Rather than changing the plan immediately, a downgrade schedules the change for the end of the current billing period. The `scheduled_plan` and `scheduled_change_date` fields on the subscription record hold the pending change. A scheduled job (`processScheduledDowngrade`) applies the change when the date arrives.

**Cancelling a subscription** (`cancelSubscription`): Supports both immediate cancellation and end-of-period cancellation. Immediate cancellation reverts the account to the free plan and resets the credit balance. End-of-period cancellation sets `cancel_at_period_end` on the subscription and lets the account continue until the period ends.

**Renewing a billing cycle** (`renewBillingCycle`): Called by a scheduled job at the start of each new period. It resets the cycle credit balance (old credits do not roll over), advances the period dates, and records the payment timestamp.

---

## Webhook Service

The `WebhookService` receives inbound HTTP callbacks from Paystack and routes each event to the appropriate handler.

### Signature Verification

Every incoming webhook must carry a valid HMAC-SHA512 signature in the `x-paystack-signature` header. The service delegates signature verification to the `PaystackPaymentProvider`. If the signature does not match, the request is rejected before any event processing begins. The secret used for verification is `PAYSTACK_WEBHOOK_SECRET` if set, falling back to `PAYSTACK_SECRET_KEY`.

### Idempotency

Paystack may deliver the same event more than once. The service uses a dedicated `webhook_processed_events` table to record every processed event ID. Before processing an event, it checks whether the ID already exists; if so, it returns immediately without re-processing. After successful processing, it inserts the event ID. The table is created lazily on first use.

### Event Routing

| Paystack Event | Handler Behaviour |
|---|---|
| `charge.success` | Marks the associated credit pack purchase or invoice as paid; allocates purchased credits; clears any payment failure state |
| `charge.failed` | Records a payment failure via the payment failure service; marks the associated purchase or invoice as failed |
| `subscription.create` | Logs subscription creation |
| `subscription.disable` | Marks the local subscription record as cancelled with the current timestamp |
| `subscription.not_renew` | Sets `cancel_at_period_end` on the subscription |
| `invoice.create` / `invoice.update` | Logged for future handling |
| `transfer.success` / `transfer.failed` | Logged for future handling |

---

## Scraping Engine and Worker Layer

The scraping functionality is divided into three layers: engines, workers, and the engine selector.

### Engines

Three engines are available, each suited to a different class of target:

| Engine | Technology | Credit Cost | Use Case |
|---|---|---|---|
| HTTP (`http`) | impit library | 1 credit | Static HTML pages, simple APIs |
| Browser (`browser`) | Playwright (Chromium) | 5 credits | JavaScript-rendered single-page applications |
| Stealth (`stealth`) | Camoufox | 10 credits | Sites with active anti-bot protection |

The `auto` engine selection mode uses the `EngineSelector` to start with the HTTP engine (lowest cost) and escalate to browser or stealth if the response indicates a block. Known-protected sites have hard-coded engine assignments to skip unsuccessful attempts (for example, LinkedIn is always sent to the stealth engine).

### BrowserWorker

The `BrowserWorker` is a BullMQ worker that processes jobs from the browser queue. Its `processJob` method:

1. Updates the job record status to `running`.
2. Generates or reuses a browser fingerprint with properties appropriate to the job options (mobile versus desktop, target country).
3. Acquires a proxy from the proxy manager according to the requested proxy tier (datacenter, residential, mobile, ISP).
4. Calls the browser engine with the assembled options.
5. Stores the result in the `job_results` table, including timing metrics, CAPTCHA detection information, and content (stored inline for small payloads or in MinIO for larger ones).
6. Deducts credits from the account based on the actual engine used, proxy tier, and any add-on features (screenshot, PDF, CAPTCHA solve).
7. Sends a webhook callback if the job specifies a `webhook_url`.

Equivalent workers exist for the HTTP and stealth engines. Each worker runs with its own concurrency level; browser workers run at half the general concurrency because each browser instance is significantly more resource-intensive than an HTTP request.

### Job Lifecycle

A job transitions through the following statuses: `pending` (created, not yet queued), `queued` (placed on the BullMQ queue), `running` (picked up by a worker), then either `completed` or `failed`. A job that exceeds its timeout transitions to `timeout`. A job cancelled before a worker picks it up transitions to `canceled`.

Credit deduction happens only when a job reaches `completed`. Failed jobs do not consume credits; only the reservation that was held at submission time is released.

### Fingerprint Evasion

Before each browser job, the fingerprint generator produces a consistent set of browser attributes: `navigator.userAgent`, `navigator.platform`, screen dimensions, timezone, language, WebGL renderer and vendor, canvas noise seed, and AudioContext properties. These are injected into the browser context as overrides at page load time so that the rendered page's JavaScript reads values consistent with a real user's browser profile.

### Proxy Support

The proxy manager selects a proxy from the configured provider for the requested tier. Proxy credentials are configured through `PROXY_DATACENTER_URL`, `PROXY_RESIDENTIAL_URL`, and `PROXY_MOBILE_URL`. Session-based rotation can be requested via a `proxySessionId` on the job, which causes the same IP to be reused across multiple requests within a session.

---

## Invoice Service

The `InvoiceService` manages invoice creation and the full invoice status lifecycle. All monetary amounts are stored as integers in the smallest currency unit (cents for USD).

### Invoice Lifecycle

An invoice begins in `draft` status. Line items can be added to a draft invoice but not to a finalised one. The `finalizeInvoice` method moves the invoice to `open` status, making it ready for payment. Once payment is confirmed (via webhook or direct call), `markPaid` records the payment timestamp, zeroes the amount due, and updates the account's `last_payment_at` timestamp. If payment fails, `markFailed` marks the invoice as `uncollectible`. A draft or open invoice can be voided with `voidInvoice`; paid invoices cannot be voided.

### Invoice Types

| Factory Method | Line Item Type | Description |
|---|---|---|
| `createSubscriptionInvoice` | `subscription` | Monthly plan charge covering a specific billing period |
| `createCreditPackInvoice` | `credit_pack` | One-time purchase of additional credits |
| `createProrationInvoice` | `proration` | Charge or credit resulting from a mid-cycle plan change |

### Invoice Numbers

Invoice numbers are generated by the `generate_invoice_number()` PostgreSQL function. The format is `INV-YYYYMM-NNNNN` where the numeric suffix is a zero-padded sequential counter scoped to the calendar month (for example, `INV-202602-00001`).

---

## Credit Pack Service

The `CreditPackService` handles one-time purchases of additional credits beyond the monthly plan allocation. Credit packs are only available to Pro and Enterprise accounts; free accounts are rejected with an error.

### Available Packs

| Plan | Pack Size | Price |
|---|---|---|
| Pro | 100,000 credits | $49.00 |
| Pro | 500,000 credits | $199.00 |
| Pro | 1,000,000 credits | $349.00 |
| Enterprise | 1,000,000 credits | $299.00 |
| Enterprise | 5,000,000 credits | $1,199.00 |
| Enterprise | 10,000,000 credits | $1,999.00 |

Prices reflect volume discounts: larger packs have a lower per-credit cost.

### Purchase Flow

1. The service verifies the account exists and is on an eligible plan.
2. A `credit_pack_purchase` record is created with status `pending`.
3. An invoice is generated for the purchase amount via the invoice service.
4. The invoice ID is written back to the purchase record.
5. A payment intent is created with the Paystack payment provider. The intent metadata carries the `accountId`, `creditPackPurchaseId`, and `invoiceId` so that the webhook handler can correlate the payment event back to the purchase.
6. The purchase status is advanced to `processing`.
7. The client secret from the payment intent is returned to the caller for use in the frontend payment flow.

Credit allocation happens only after the `charge.success` webhook confirms payment. The webhook handler calls `creditService.purchaseCreditPack` to record the ledger entry and update the account's credit balance.

Purchased credits behave identically to plan credits with respect to billing, but are tracked as separate ledger entries of type `purchase`. Like plan credits, purchased credits do not roll over at the end of a billing cycle.
