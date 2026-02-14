# Scrapifie User Journeys

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-020 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 01-PUBLIC-WEBSITE.md, 03-AUTHENTICATION.md, 05-USER-DASHBOARD.md, 09-BILLING-AND-CREDITS.md, 12-ADMIN-DASHBOARD.md |

---

## Table of Contents

1. [User Journeys Overview](#1-user-journeys-overview)
2. [Journey 1: New Developer Discovery to First API Call](#2-journey-1-new-developer-discovery-to-first-api-call)
3. [Journey 2: Free User Upgrades to Pro](#3-journey-2-free-user-upgrades-to-pro)
4. [Journey 3: Developer Integrates Scrapifie into Production](#4-journey-3-developer-integrates-scrapifie-into-production)
5. [Journey 4: User Troubleshoots a Failed Job](#5-journey-4-user-troubleshoots-a-failed-job)
6. [Journey 5: User Runs Out of Credits](#6-journey-5-user-runs-out-of-credits)
7. [Journey 6: User Manages Account Security](#7-journey-6-user-manages-account-security)
8. [Journey 7: User Contacts Support](#8-journey-7-user-contacts-support)
9. [Journey 8: User Cancels Subscription](#9-journey-8-user-cancels-subscription)
10. [Journey 9: Admin Handles Abuse Report](#10-journey-9-admin-handles-abuse-report)
11. [Journey 10: Admin Onboards Enterprise Customer](#11-journey-10-admin-onboards-enterprise-customer)
12. [Journey 11: Payment Failure Recovery](#12-journey-11-payment-failure-recovery)
13. [Journey 12: Returning User After Inactivity](#13-journey-12-returning-user-after-inactivity)
14. [Journey Map Summary](#14-journey-map-summary)
15. [Related Documents](#15-related-documents)

---

## 1. User Journeys Overview

This document maps the complete end-to-end experiences of users and admins as they interact with the Scrapifie platform. Each journey follows a persona through a realistic scenario, documenting every page visited, decision made, and system interaction encountered.

### Purpose

User journeys serve multiple purposes:
- Validate that the platform design supports real-world workflows without gaps or dead ends
- Identify cross-cutting concerns that span multiple documents
- Provide a holistic view that individual feature documents cannot offer
- Serve as acceptance criteria for implementation -- each journey step should work as described

### Persona Definitions

| Persona | Description | Plan |
|---------|-------------|------|
| Alex | Solo developer building a price comparison tool. Technical, comfortable with APIs. First time using Scrapifie | Free (initially) |
| Sam | Backend engineer at a small startup. Integrating Scrapifie into a data pipeline. Budget-conscious | Pro |
| Jordan | Non-technical founder who needs scraping for market research. Relies on documentation and support | Free (initially) |
| Taylor | Scrapifie platform admin. Handles support, monitors abuse, manages the platform | Admin |

---

## 2. Journey 1: New Developer Discovery to First API Call

**Persona:** Alex (solo developer)
**Goal:** Discover Scrapifie, sign up, and make a first successful API request
**Time:** ~15 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Alex searches "web scraping API" on a search engine | External | Scrapifie landing page appears in results (SEO optimized) | 01-PUBLIC-WEBSITE.md |
| 2 | Clicks the search result | Landing page (/) | Sees the hero section with value proposition, feature overview, code example, and pricing summary | 01-PUBLIC-WEBSITE.md, Section: Landing Page |
| 3 | Scrolls through features | Landing page | Reads about three engines, anti-detection, proxy rotation. Understands what makes Scrapifie different | 01-PUBLIC-WEBSITE.md |
| 4 | Clicks "Get Started Free" CTA | Landing page -> Registration | Navigates to the registration page | 01-PUBLIC-WEBSITE.md, 03-AUTHENTICATION.md |
| 5 | Fills in registration form | /auth/register | Enters name, email, password. Sees password strength indicator. Accepts Terms of Service | 03-AUTHENTICATION.md, Section: Registration |
| 6 | Submits registration | /auth/register | Account created. Redirected to dashboard with a banner: "Please verify your email" | 03-AUTHENTICATION.md |
| 7 | Checks email, clicks verification link | Email -> /auth/verify-email?token=... | Email verified. Banner disappears. Welcome toast appears | 03-AUTHENTICATION.md, Section: Email Verification |
| 8 | Sees dashboard overview | /dashboard | Overview page shows: 0 jobs, 1,000 credits, quick start section with "Create API Key" prompt | 05-USER-DASHBOARD.md |
| 9 | Clicks "Create API Key" | /dashboard/api-keys/new | Opens the create key form. Fills in name: "My First Key". Selects environment: Test | 06-API-KEY-MANAGEMENT.md |
| 10 | Submits key creation | /dashboard/api-keys | Key created. Show-once modal displays the full API key. Alex copies it | 06-API-KEY-MANAGEMENT.md, Section: Show-Once |
| 11 | Clicks "View Documentation" link | /docs/quickstart | Quickstart page opens. Follows Step 1: has the key. Moves to Step 2 | 17-DOCS-PORTAL.md, Section: Quickstart |
| 12 | Copies the cURL example from quickstart | /docs/quickstart | Replaces YOUR_API_KEY with his test key. Replaces URL with a test-allowed URL | 17-DOCS-PORTAL.md |
| 13 | Runs the cURL command in terminal | External (terminal) | Receives a 201 response with a job ID | API behavior |
| 14 | Follows quickstart Step 4: checks job status | External (terminal) | Polls GET /v1/jobs/:id. Sees status transition: queued -> processing -> completed | 07-JOBS-AND-LOGS.md |
| 15 | Follows quickstart Step 5: gets the result | External (terminal) | Receives the scraped HTML content. Success | 07-JOBS-AND-LOGS.md |
| 16 | Returns to dashboard | /dashboard | Overview now shows 1 job completed. Credits still at 1,000 (test key, no credit charge) | 05-USER-DASHBOARD.md |
| 17 | Clicks "Jobs" in sidebar | /dashboard/jobs | Sees the test job in the jobs list with status "completed" | 07-JOBS-AND-LOGS.md |

### Journey Outcome

Alex has successfully signed up, created a test API key, and made his first API request. He understands the basic flow: submit job, poll status, get result. He is now exploring the documentation for more advanced features.

### Key Moments

| Moment | Emotion | Design Goal |
|--------|---------|-------------|
| Landing page first impression | Curious, evaluating | Clear value proposition, no jargon |
| Registration | Slight friction | Keep it minimal -- name, email, password only |
| First API key creation | Empowered | Show-once modal is clear, copy button works |
| First successful API call | Satisfied | The quickstart delivers on the "5 minutes" promise |
| Seeing the job in the dashboard | Connected | The dashboard reflects what just happened via API |

---

## 3. Journey 2: Free User Upgrades to Pro

**Persona:** Alex (after 2 weeks on Free plan)
**Goal:** Running low on credits, decides to upgrade to Pro
**Time:** ~5 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Alex logs in and sees dashboard | /dashboard | Credit usage card shows 850/1,000 credits used (85%). Yellow progress bar. Banner: "You have used 85% of your credits" | 05-USER-DASHBOARD.md, 08-USAGE-AND-ANALYTICS.md |
| 2 | Clicks "View Usage" | /dashboard/usage | Sees detailed usage charts. Daily consumption trend shows credits will run out in 2 days at current rate | 08-USAGE-AND-ANALYTICS.md |
| 3 | Notices the "Upgrade to Pro" prompt | /dashboard/usage | A prompt below the credit card: "Running low? Upgrade to Pro for 50,000 credits/month" | 08-USAGE-AND-ANALYTICS.md |
| 4 | Clicks "Upgrade to Pro" | /dashboard/billing | Billing page shows current plan (Free) and upgrade options | 09-BILLING-AND-CREDITS.md |
| 5 | Clicks "Upgrade" on the Pro plan card | /dashboard/billing | Upgrade confirmation modal appears. Shows: Pro Plan $49/month, 50,000 credits, prorated charge for remainder of cycle. "Add a payment method to continue" | 09-BILLING-AND-CREDITS.md, Section: Plan Upgrade |
| 6 | Clicks "Add Payment Method" | Payment provider hosted form | Provider's secure form opens (embedded or redirect). Alex enters card details | 09-BILLING-AND-CREDITS.md, Section: Payment Methods |
| 7 | Submits card details | Payment provider -> /dashboard/billing | Card tokenized. Payment method saved. Returns to upgrade confirmation with card on file shown | 09-BILLING-AND-CREDITS.md |
| 8 | Confirms the upgrade | /dashboard/billing | Prorated charge processed. Plan changes to Pro immediately. Credits reset to 50,000. Success toast: "Welcome to Pro!" | 09-BILLING-AND-CREDITS.md, Section: Plan Upgrade |
| 9 | Returns to dashboard overview | /dashboard | Credit card now shows 50,000 credits. Plan badge shows "Pro". API key limit increased to 5 | 05-USER-DASHBOARD.md |
| 10 | Creates a Live API key | /dashboard/api-keys/new | Now confident in the platform, creates a Live key for production use | 06-API-KEY-MANAGEMENT.md |

### Journey Outcome

Alex has upgraded from Free to Pro. He has a payment method on file, 50,000 credits, and a live API key for production.

### Key Moments

| Moment | Emotion | Design Goal |
|--------|---------|-------------|
| Seeing low credits warning | Mild urgency | Motivate upgrade without panic |
| Usage page showing depletion projection | Informed | Data-driven decision making |
| Payment form | Trust concern | Provider-hosted form builds trust (not storing cards ourselves) |
| Successful upgrade | Relief, satisfaction | Immediate plan change, no waiting |

---

## 4. Journey 3: Developer Integrates Scrapifie into Production

**Persona:** Sam (backend engineer, Pro plan)
**Goal:** Integrate Scrapifie into a production data pipeline with proper error handling
**Time:** ~2 hours

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Sam reviews the API reference | /docs/api-reference/overview | Reads API conventions: authentication, pagination, error format, idempotency | 17-DOCS-PORTAL.md |
| 2 | Reads the engine selection guide | /docs/guides/engines | Decides to use Browser engine for JavaScript-heavy target sites | 17-DOCS-PORTAL.md, Section: Guides |
| 3 | Creates a production Live key with IP whitelist | /dashboard/api-keys/new | Names it "Production Pipeline", sets IP whitelist to the server's IP, no expiry | 06-API-KEY-MANAGEMENT.md |
| 4 | Reads the error handling guide | /docs/guides/error-handling | Implements retry logic with exponential backoff for retryable errors. Maps error codes to handling strategies | 17-DOCS-PORTAL.md, APPENDICES/C-ERROR-CODES.md |
| 5 | Reads the webhook guide | /docs/guides/webhooks | Decides to use webhooks for async job completion instead of polling. Sets up a webhook endpoint on their server | 17-DOCS-PORTAL.md |
| 6 | Configures the webhook URL on API calls | External (code) | Includes webhook_url and webhook_secret in POST /v1/scrape requests | 17-DOCS-PORTAL.md |
| 7 | Reads the rate limits guide | /docs/guides/rate-limits | Notes Pro plan limits: 60 req/min, 1,000 req/hr, 10 concurrent. Implements client-side throttling to stay within limits | 17-DOCS-PORTAL.md |
| 8 | Reads the credits guide | /docs/guides/credits | Notes Browser engine costs 5 credits per job. 50,000 credits / 5 = 10,000 browser jobs per month. Plans usage accordingly | 17-DOCS-PORTAL.md |
| 9 | Tests the integration with test key | External (staging) | Runs the pipeline with a test key against test URLs. Verifies webhook delivery, error handling, retry logic | 06-API-KEY-MANAGEMENT.md |
| 10 | Switches to the production live key | External (production) | Deploys with the live key. Monitors initial jobs via the dashboard | 06-API-KEY-MANAGEMENT.md |
| 11 | Monitors jobs in the dashboard | /dashboard/jobs | Sees production jobs flowing through. Checks success rates and response times | 07-JOBS-AND-LOGS.md |
| 12 | Sets up usage monitoring | /dashboard/usage | Reviews usage analytics. Notes which domains consume the most credits. Checks success rates per engine | 08-USAGE-AND-ANALYTICS.md |
| 13 | Verifies the webhook integration | External (server logs) | Confirms webhooks are being delivered and processed. Checks HMAC signature verification is working | 17-DOCS-PORTAL.md |

### Journey Outcome

Sam has a production-ready integration with error handling, webhooks, rate limit awareness, and credit monitoring.

### Key Moments

| Moment | Emotion | Design Goal |
|--------|---------|-------------|
| Reading API docs | Focused, evaluating quality | Comprehensive, well-organized docs reduce integration time |
| Test key validation | Cautious confidence | Test mode lets developers verify without spending credits |
| First production jobs | Anxious, monitoring closely | Dashboard provides real-time visibility into production traffic |
| Stable production pipeline | Satisfied, trusting | Platform works as documented |

---

## 5. Journey 4: User Troubleshoots a Failed Job

**Persona:** Sam (Pro plan, production user)
**Goal:** A batch of jobs failed. Sam needs to understand why and fix the issue
**Time:** ~20 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Sam receives a webhook with status "failed" | External (server) | Webhook payload contains job ID, status, error_type, error_message | 07-JOBS-AND-LOGS.md |
| 2 | Logs into dashboard | /dashboard | Overview shows a dip in success rate on the recent jobs chart | 05-USER-DASHBOARD.md |
| 3 | Navigates to Jobs | /dashboard/jobs | Filters by status: "failed". Sees 15 failed jobs in the last hour | 07-JOBS-AND-LOGS.md |
| 4 | Clicks on a failed job | /dashboard/jobs/:id | Job detail page shows: error_type "TIMEOUT", error_message "Page load exceeded 60 second timeout". 3 attempts were made | 07-JOBS-AND-LOGS.md, Section: Failed Job Error Display |
| 5 | Reviews the execution log | /dashboard/jobs/:id (log section) | Log entries show: "Request started" -> "Navigating to URL" -> "Waiting for selector #content" -> "WARN: Selector not found after 30s" -> "Retrying..." (x3) -> "ERROR: All attempts exhausted" | 07-JOBS-AND-LOGS.md, Section: Job Logs |
| 6 | Checks the request configuration | /dashboard/jobs/:id (config section) | Sees wait_for: "#content", wait_timeout: 30000. The target site may have changed its DOM structure | 07-JOBS-AND-LOGS.md |
| 7 | Checks other failed jobs | /dashboard/jobs | All 15 failures are for the same domain. Different URLs on the same site. Same error pattern | 07-JOBS-AND-LOGS.md |
| 8 | Visits the target site in a browser | External (browser) | Confirms the site redesigned. The #content element no longer exists. The new element is #main-content | External |
| 9 | Updates the integration code | External (code) | Changes wait_for from "#content" to "#main-content" | External |
| 10 | Retries a failed job via the dashboard | /dashboard/jobs/:id | Clicks "Retry" on one of the failed jobs. Confirmation modal shows credit cost (5 credits). Confirms | 07-JOBS-AND-LOGS.md, Section: Job Retry |
| 11 | Watches the retry | /dashboard/jobs/:new_id | New job is created, linked to the original. Status progresses: queued -> processing -> completed. Success | 07-JOBS-AND-LOGS.md |
| 12 | Deploys the updated integration | External (deployment) | Pipeline resumes with the corrected selector. New jobs succeed | External |
| 13 | Reviews usage after the incident | /dashboard/usage | Checks that credits charged for failed jobs are reflected. 15 failed browser jobs = 75 credits consumed | 08-USAGE-AND-ANALYTICS.md |

### Journey Outcome

Sam identified the root cause (target site DOM change), validated the fix via dashboard retry, and deployed the update. The platform provided enough diagnostic information to troubleshoot without external tools.

---

## 6. Journey 5: User Runs Out of Credits

**Persona:** Alex (Pro plan)
**Goal:** Credits are exhausted mid-month. Alex needs to continue scraping
**Time:** ~10 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | API request returns 402 Payment Required | External (terminal/code) | Response body: "Insufficient credits. Your credit balance is 0. Purchase a credit pack or wait for your billing cycle to reset" | APPENDICES/C-ERROR-CODES.md |
| 2 | Alex receives an email | Email | "Your Scrapifie credits have been exhausted. Your current billing cycle resets on [date]. Purchase a credit pack to continue immediately." | APPENDICES/B-EMAIL-TEMPLATES.md |
| 3 | Logs into dashboard | /dashboard | Red banner at top: "Your credits are exhausted. API requests will fail until credits are available." Credit card shows 0/50,000 | 05-USER-DASHBOARD.md |
| 4 | Navigates to Billing | /dashboard/billing | Credit balance section shows 0 credits with a "Buy Credits" button | 09-BILLING-AND-CREDITS.md |
| 5 | Clicks "Buy Credits" | /dashboard/billing (credit packs section) | Three credit pack options appear: Small (10K/$15), Medium (25K/$30), Large (50K/$50) | 09-BILLING-AND-CREDITS.md, Section: Credit Packs |
| 6 | Selects Medium pack (25K credits) | /dashboard/billing | Purchase confirmation modal: "25,000 credits for $30.00. Credits expire at end of billing cycle. Charged to Visa ending 4242." | 09-BILLING-AND-CREDITS.md |
| 7 | Confirms purchase | /dashboard/billing | Payment processed. Credits immediately added. Balance now shows 25,000. Red banner disappears. Toast: "25,000 credits added to your balance" | 09-BILLING-AND-CREDITS.md |
| 8 | API requests resume working | External (terminal/code) | Next API request succeeds. Credits are being deducted normally | API behavior |
| 9 | Reviews usage to understand the spike | /dashboard/usage | Checks the usage chart. Identifies a spike in browser engine jobs from a new feature in the pipeline that was more credit-intensive than expected | 08-USAGE-AND-ANALYTICS.md |

### Journey Outcome

Alex purchased a credit pack to immediately restore service. He identified the cause of the unexpected credit consumption and can plan better for next month.

---

## 7. Journey 6: User Manages Account Security

**Persona:** Alex (after receiving a "new login" security notification)
**Goal:** Review and improve account security
**Time:** ~10 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Alex receives an email | Email | "New login to your Scrapifie account from Chrome on Windows, IP: [address], Location: [city]. If this was not you, secure your account immediately." | APPENDICES/B-EMAIL-TEMPLATES.md |
| 2 | Recognizes the login (it was from his work laptop) | -- | Not a security threat, but decides to improve security anyway | -- |
| 3 | Logs into dashboard | /dashboard | Navigates to Settings | 11-SETTINGS-AND-SUPPORT.md |
| 4 | Opens Security tab | /dashboard/settings/security | Sees: Password section, MFA section (disabled), Active Sessions section | 11-SETTINGS-AND-SUPPORT.md |
| 5 | Reviews active sessions | /dashboard/settings/security | Sees 3 active sessions: Chrome/macOS (current), Chrome/Windows (work laptop), Firefox/Linux (old). Revokes the Firefox session | 11-SETTINGS-AND-SUPPORT.md, Section: Active Sessions |
| 6 | Decides to enable MFA | /dashboard/settings/security | Clicks "Enable MFA". Setup modal appears with QR code | 03-AUTHENTICATION.md, Section: MFA Setup |
| 7 | Scans QR code with authenticator app | External (phone) | App generates 6-digit code | 03-AUTHENTICATION.md |
| 8 | Enters the verification code | Modal | Code verified. MFA is now enabled. 10 backup codes displayed | 03-AUTHENTICATION.md, Section: Backup Codes |
| 9 | Saves backup codes securely | External (password manager) | Copies backup codes. Checks the "I have saved my backup codes" checkbox | 03-AUTHENTICATION.md |
| 10 | Closes the modal | /dashboard/settings/security | MFA section now shows "Enabled" with green indicator. Backup codes remaining: 10 | 11-SETTINGS-AND-SUPPORT.md |
| 11 | Changes password for good measure | /dashboard/settings/security | Enters current password, enters new stronger password. Strength indicator shows "Very Strong". Submits | 11-SETTINGS-AND-SUPPORT.md, Section: Password Change |
| 12 | All other sessions are invalidated | System | Other active sessions (Chrome/Windows) are terminated. Alex's current session remains | 03-AUTHENTICATION.md |

### Journey Outcome

Alex has enabled MFA, revoked an old session, and changed his password. His account is now significantly more secure.

---

## 8. Journey 7: User Contacts Support

**Persona:** Jordan (non-technical founder, Free plan)
**Goal:** Can't figure out why API requests are failing. Needs help
**Time:** ~30 minutes (including wait for response)

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Jordan sees jobs failing in the dashboard | /dashboard/jobs | Multiple failed jobs with error "BLOCKED" | 07-JOBS-AND-LOGS.md |
| 2 | Clicks on a failed job | /dashboard/jobs/:id | Error message: "Request blocked by target website. Consider using the Stealth engine." | 07-JOBS-AND-LOGS.md |
| 3 | Does not understand what "Stealth engine" means | -- | Decides to contact support | -- |
| 4 | Clicks "Support" in sidebar | /dashboard/support | Support page with ticket list (empty for new user) and "New Ticket" button. Below the button, suggested docs appear | 11-SETTINGS-AND-SUPPORT.md |
| 5 | Clicks "New Ticket" | /dashboard/support/new | Ticket creation form with category, subject, priority, description | 11-SETTINGS-AND-SUPPORT.md, Section: Ticket Creation |
| 6 | Starts typing subject: "Jobs are being blocked" | /dashboard/support/new | As Jordan types, the knowledge base integration suggests relevant docs: "Choosing the Right Engine", "Error Handling Guide" | 11-SETTINGS-AND-SUPPORT.md, Section: Knowledge Base |
| 7 | Reads the "Choosing the Right Engine" doc suggestion | /docs/guides/engines (new tab) | Learns about the three engines and that Stealth is designed for sites with anti-bot protection | 17-DOCS-PORTAL.md |
| 8 | Still needs help (Free plan does not include Stealth engine) | -- | Returns to the ticket form | -- |
| 9 | Completes the ticket | /dashboard/support/new | Category: Technical, Subject: "Jobs blocked, need help with Stealth engine", Priority: Normal, Description: explains the situation, links job ID | 11-SETTINGS-AND-SUPPORT.md |
| 10 | Submits ticket | /dashboard/support | Ticket created. Success toast. Ticket appears in the list with status "Open" | 11-SETTINGS-AND-SUPPORT.md |
| 11 | Receives email notification | Email | "Your support ticket TKT-XXXXXXXX has been created. We will respond within 48 hours." | APPENDICES/B-EMAIL-TEMPLATES.md |
| 12 | (Time passes - admin Taylor responds) | -- | Taylor explains that the Stealth engine is available on the Pro plan and suggests upgrading, but also offers tips for the HTTP engine to reduce blocking | -- |
| 13 | Jordan sees the notification badge | /dashboard | Bell icon shows unread count: 1. Clicks to see notification: "Admin replied to your ticket" | 11-SETTINGS-AND-SUPPORT.md |
| 14 | Reads the response | /dashboard/support/:id | Sees Taylor's reply with helpful suggestions. The response includes a link to the pricing page | 11-SETTINGS-AND-SUPPORT.md |
| 15 | Replies with a follow-up question | /dashboard/support/:id | Types a reply asking about the difference between Pro and Enterprise. Submits | 11-SETTINGS-AND-SUPPORT.md |

### Journey Outcome

Jordan got help through the support system. The knowledge base suggestion partially self-served the issue. The admin provided personalized guidance that may lead to an upgrade.

---

## 9. Journey 8: User Cancels Subscription

**Persona:** Alex (Pro plan, deciding to cancel)
**Goal:** Cancel Pro subscription and understand what happens
**Time:** ~5 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Alex navigates to Billing | /dashboard/billing | Current plan: Pro ($49/month). Billing cycle ends on March 15 | 09-BILLING-AND-CREDITS.md |
| 2 | Clicks "Cancel Subscription" | /dashboard/billing | First confirmation modal appears with a list of what Alex will lose: 50K monthly credits, 5 API keys (will be reduced to 1), Browser/Stealth engines, 60 req/min rate limit | 09-BILLING-AND-CREDITS.md, Section: Cancellation |
| 3 | Reads the warning list | Modal | Understands the consequences. Sees: "Your plan will remain active until March 15. After that, you will be downgraded to the Free plan." | 09-BILLING-AND-CREDITS.md |
| 4 | Selects cancellation reason from dropdown | Modal | Options: Too expensive, Not using enough, Switching to competitor, Missing features, Other. Selects "Not using enough" | 09-BILLING-AND-CREDITS.md |
| 5 | Confirms cancellation | Modal | Subscription status changes to "Cancelling at period end". A banner appears: "Your Pro plan is active until March 15. You can reactivate anytime before then." | 09-BILLING-AND-CREDITS.md |
| 6 | Sees the reactivation option | /dashboard/billing | A "Reactivate Subscription" button appears prominently. The cancellation is reversible until the period end | 09-BILLING-AND-CREDITS.md |
| 7 | Receives confirmation email | Email | "Your Scrapifie Pro subscription has been cancelled and will end on March 15. You can reactivate anytime before then from your billing page." | APPENDICES/B-EMAIL-TEMPLATES.md |
| 8 | (March 15 arrives) | System | Subscription transitions to "cancelled". Account plan changes to Free. Credits reset to 1,000. Excess API keys are deactivated (4 of 5 revoked, keeping the oldest active key). Rate limits reduced | 09-BILLING-AND-CREDITS.md |
| 9 | Alex logs in after March 15 | /dashboard | Dashboard reflects Free plan. Credit balance: 1,000. Banner: "You are on the Free plan. Upgrade anytime to restore Pro features." | 05-USER-DASHBOARD.md |

### Journey Outcome

Alex cancelled successfully. The process was transparent about consequences, offered reversibility, and executed cleanly at the end of the billing period.

---

## 10. Journey 9: Admin Handles Abuse Report

**Persona:** Taylor (admin)
**Goal:** Investigate a flagged account and take appropriate action
**Time:** ~30 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Taylor sees a notification | Admin dashboard | Alert: "Account flagged for abuse: high error rate (45% over 24h) for user suspicious@example.com" | 14-ADMIN-MODERATION.md |
| 2 | Clicks the notification | /admin/moderation/flagged/:id | Investigation page opens showing: detection details, user context, recent suspicious jobs | 14-ADMIN-MODERATION.md, Section: Investigation Page |
| 3 | Reviews detection details | Investigation page | Automated flag: error rate 45% (threshold: 30%), 500 jobs in last 24h, 225 failed with "BLOCKED" errors | 14-ADMIN-MODERATION.md |
| 4 | Reviews the target URLs | Investigation page | All jobs target the same domain: a competitor price-tracking site. Many requests in rapid succession | 14-ADMIN-MODERATION.md |
| 5 | Checks user context | Investigation page | User: Pro plan, registered 3 days ago, no previous flags, 1 API key, no support tickets | 14-ADMIN-MODERATION.md |
| 6 | Clicks through to user detail | /admin/users/:id | Reviews full user profile. Legitimate-looking registration. Payment method on file | 12-ADMIN-DASHBOARD.md |
| 7 | Reviews the Acceptable Use Policy | Reference | The user is not violating any specific AUP clause -- scraping for price comparison is permitted. The high error rate is because the target site is blocking them, not because the user is doing something malicious | 02-LEGAL-FRAMEWORK.md |
| 8 | Adds investigation notes | Investigation page | Notes: "High error rate is caused by target site blocking. User is not violating AUP. Suggest user switch to Stealth engine. Clearing the flag." | 14-ADMIN-MODERATION.md |
| 9 | Clears the flag | Investigation page | Sets status to "Cleared". No enforcement action taken. Selects enforcement_action: "none" | 14-ADMIN-MODERATION.md |
| 10 | Optionally sends a helpful tip | /admin/moderation/tickets | Creates a proactive support message to the user: "We noticed a high failure rate for your jobs. We recommend using the Stealth engine for better results with that target site" | 14-ADMIN-MODERATION.md |

### Journey Outcome

Taylor investigated the flag, determined it was not abuse, cleared the flag, and proactively helped the user. The investigation is documented in the audit trail.

---

## 11. Journey 10: Admin Onboards Enterprise Customer

**Persona:** Taylor (admin)
**Goal:** Set up a custom Enterprise plan for a new large customer
**Time:** ~30 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Enterprise inquiry arrives via contact form | /admin/moderation/tickets | Support ticket from jordan@bigcorp.com: "Interested in Enterprise plan. Need custom rate limits and dedicated support" | 11-SETTINGS-AND-SUPPORT.md, 14-ADMIN-MODERATION.md |
| 2 | Taylor assigns the ticket to themselves | /admin/moderation/tickets/:id | Self-assigns. Adds internal note: "Enterprise lead. Needs custom setup" | 14-ADMIN-MODERATION.md |
| 3 | Taylor responds to the ticket | /admin/moderation/tickets/:id | Asks about expected volume, required features, timeline. Replies to the user | 14-ADMIN-MODERATION.md |
| 4 | (Discussion over several ticket replies) | -- | Agrees on: 500,000 credits/month, 300 req/min, 50 concurrent jobs, custom pricing $299/month | -- |
| 5 | User registers an account (if not already) | External -> /auth/register | Jordan registers at bigcorp.com email | 03-AUTHENTICATION.md |
| 6 | Taylor finds the user in admin | /admin/users | Searches for jordan@bigcorp.com. Finds the account | 12-ADMIN-DASHBOARD.md |
| 7 | Taylor changes the plan to Enterprise | /admin/users/:id (actions) | "Change Plan" action. Selects Enterprise. Sets custom credit allocation: 500,000. Confirms with reason: "Enterprise agreement per ticket TKT-XXXXXXXX" | 12-ADMIN-DASHBOARD.md, Section: Admin Actions |
| 8 | Taylor sets custom rate limits | /admin/ops/rate-limits | Creates rate limit overrides: 300 req/min, 10,000 req/hr, 50 concurrent. Reason: "Enterprise agreement" | 16-ADMIN-OPERATIONS.md |
| 9 | Taylor responds to the ticket | /admin/moderation/tickets/:id | "Your Enterprise account is now active. You have 500,000 credits and custom rate limits. Please create your API keys from your dashboard." | 14-ADMIN-MODERATION.md |
| 10 | Marks the ticket as resolved | /admin/moderation/tickets/:id | Status changes to "Resolved" | 14-ADMIN-MODERATION.md |
| 11 | (Optional) Taylor creates an invoice manually | /admin/finance/invoices | If the payment provider requires a manual invoice for custom pricing, Taylor creates it through the admin finance tools | 15-ADMIN-FINANCE.md |

### Journey Outcome

Taylor onboarded an Enterprise customer through the support system, manually configured their account, and documented everything in the ticket thread and audit log.

---

## 12. Journey 11: Payment Failure Recovery

**Persona:** Sam (Pro plan, card expired)
**Goal:** Sam's card expired, payment failed, account needs recovery
**Time:** Spans ~14 days (system timeline)

### Step-by-Step Flow

| Step | Day | Action | System | Document Reference |
|------|-----|--------|--------|-------------------|
| 1 | 0 | Billing cycle renews, payment attempted | Payment fails. Invoice status: "Failed". Email sent: "Payment failed for Pro Plan. Please update your payment method." Account: full access continues (grace period) | 09-BILLING-AND-CREDITS.md |
| 2 | 0 | Sam is traveling, does not see the email | Dashboard shows a yellow banner: "Payment failed. Please update your payment method to avoid service interruption." | 09-BILLING-AND-CREDITS.md |
| 3 | 3 | First automatic retry | Payment fails again (same expired card). Email: "Second attempt failed. Update your payment method within 7 days to avoid restrictions." | 09-BILLING-AND-CREDITS.md |
| 4 | 7 | Second automatic retry | Payment fails again. Email: "Final retry failed. Your account will be restricted in 3 days." Banner turns red | 09-BILLING-AND-CREDITS.md |
| 5 | 10 | Account restricted | Account status: "restricted". Sam can log in, view data, but cannot submit new jobs. Persistent red banner: "Your account is restricted due to unpaid balance. Update your payment method to restore access." | 09-BILLING-AND-CREDITS.md |
| 6 | 11 | Sam returns and sees the restriction | /dashboard | Dashboard shows the restriction. All action buttons for jobs are disabled. "Update Payment Method" CTA is prominent | 09-BILLING-AND-CREDITS.md |
| 7 | 11 | Sam goes to Billing | /dashboard/billing | Payment method shows expired card. "Update Payment Method" button | 09-BILLING-AND-CREDITS.md |
| 8 | 11 | Sam updates the payment method | Payment provider form | Enters new card details. Card tokenized and saved | 09-BILLING-AND-CREDITS.md |
| 9 | 11 | System detects new payment method | System | Immediately triggers a retry with the new card. Payment succeeds. Invoice status: "Paid". Account status: "active". Credits restored. Restriction lifted | 09-BILLING-AND-CREDITS.md, 15-ADMIN-FINANCE.md |
| 10 | 11 | Sam sees account restored | /dashboard | Green banner: "Payment successful. Your account has been restored." Full functionality available | 09-BILLING-AND-CREDITS.md |
| 11 | 11 | Sam receives email | Email | "Payment recovered. Your Pro plan is active. Thank you for updating your payment method." | APPENDICES/B-EMAIL-TEMPLATES.md |

### Journey Outcome

The payment failure escalation worked as designed. Sam had a 10-day window before restriction. Once the payment method was updated, recovery was immediate and automatic.

---

## 13. Journey 12: Returning User After Inactivity

**Persona:** Jordan (Free plan, inactive for 3 months)
**Goal:** Return to the platform after a long absence
**Time:** ~10 minutes

### Step-by-Step Flow

| Step | Action | Page/System | What Happens | Document Reference |
|------|--------|-------------|--------------|-------------------|
| 1 | Jordan tries to log in | /auth/login | Enters email and password. Logs in successfully (account still exists, Free plan) | 03-AUTHENTICATION.md |
| 2 | Sees the dashboard | /dashboard | Credits: 1,000 (reset each cycle, even for Free). 0 recent jobs. Old API key still exists and is active | 05-USER-DASHBOARD.md |
| 3 | Checks old jobs | /dashboard/jobs | Old jobs from 3 months ago are listed (metadata retained indefinitely). Results and screenshots have been cleaned up (past retention windows) | 07-JOBS-AND-LOGS.md |
| 4 | Clicks an old job | /dashboard/jobs/:id | Job metadata is visible but result says: "Result expired. Job results are retained for 30 days." | 07-JOBS-AND-LOGS.md |
| 5 | Tries the old API key | External (terminal) | API key works. Makes a test request. Credits deducted. Everything functions normally | 06-API-KEY-MANAGEMENT.md |
| 6 | Notices a product update banner | /dashboard | A dismissible banner highlights new features launched in the last 3 months (if such a notification system is implemented) | 05-USER-DASHBOARD.md |
| 7 | Reviews current plan | /dashboard/billing | Free plan, no payment method, 1,000 credits/month. "Upgrade to Pro" CTA | 09-BILLING-AND-CREDITS.md |

### Journey Outcome

Jordan's account was fully intact. Free plan credits had been resetting each month. API keys still work. The only data loss was expired job results and screenshots, which is expected per the documented retention policy.

---

## 14. Journey Map Summary

### Journey Coverage Matrix

This matrix shows which platform areas are exercised by each journey:

| Journey | Public Site | Auth | Dashboard | API Keys | Jobs | Usage | Billing | Settings | Support | Admin | Docs |
|---------|------------|------|-----------|----------|------|-------|---------|----------|---------|-------|------|
| 1. First API Call | Yes | Yes | Yes | Yes | Yes | No | No | No | No | No | Yes |
| 2. Upgrade to Pro | No | No | Yes | No | No | Yes | Yes | No | No | No | No |
| 3. Production Integration | No | No | Yes | Yes | Yes | Yes | No | No | No | No | Yes |
| 4. Troubleshoot Failed Job | No | No | Yes | No | Yes | Yes | No | No | No | No | No |
| 5. Out of Credits | No | No | Yes | No | No | No | Yes | No | No | No | No |
| 6. Account Security | No | No | No | No | No | No | No | Yes | No | No | No |
| 7. Contact Support | No | No | Yes | No | Yes | No | No | No | Yes | No | Yes |
| 8. Cancel Subscription | No | No | No | No | No | No | Yes | No | No | No | No |
| 9. Admin Abuse | No | No | No | No | No | No | No | No | No | Yes | No |
| 10. Enterprise Onboard | No | Yes | No | No | No | No | No | No | Yes | Yes | No |
| 11. Payment Failure | No | No | Yes | No | No | No | Yes | No | No | No | No |
| 12. Returning User | No | Yes | Yes | Yes | Yes | No | Yes | No | No | No | No |

### Uncovered Areas

The following platform areas are NOT covered by the journeys above and should be validated through additional testing:

| Area | Coverage Gap |
|------|-------------|
| OAuth registration/login | No journey covers Google/GitHub signup flow |
| MFA login challenge | Journey 6 sets up MFA but does not show a subsequent login with MFA |
| Team management | Future phase, no journey needed for MVP |
| Blog and status page (public) | Admin content management covered in Journey 9, public consumption not journey-mapped |
| Account deletion | No journey covers the full account deletion flow |
| Admin financial management | No journey covers revenue dashboard, reports, or refund processing |
| Documentation portal deep usage | Journeys 1 and 3 touch docs, but no journey covers search, version switching, or SDK pages |

These gaps are acceptable for an MVP planning document. Additional journeys should be defined during implementation if edge cases emerge.

---

## 15. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform context, user types, plan tiers |
| 01-PUBLIC-WEBSITE.md | Landing page, pricing page, contact page referenced in discovery journeys |
| 03-AUTHENTICATION.md | Registration, login, MFA, session management flows |
| 05-USER-DASHBOARD.md | Dashboard layout and overview page |
| 06-API-KEY-MANAGEMENT.md | Key creation, show-once, revocation |
| 07-JOBS-AND-LOGS.md | Job lifecycle, job detail, troubleshooting |
| 08-USAGE-AND-ANALYTICS.md | Usage charts, credit alerts |
| 09-BILLING-AND-CREDITS.md | Plan upgrade, credit packs, payment failure, cancellation |
| 11-SETTINGS-AND-SUPPORT.md | Security settings, support tickets |
| 12-ADMIN-DASHBOARD.md | Admin user management, admin actions |
| 14-ADMIN-MODERATION.md | Abuse investigation, ticket management |
| 15-ADMIN-FINANCE.md | Revenue management, refund processing |
| 17-DOCS-PORTAL.md | Documentation portal, quickstart guide |
| APPENDICES/B-EMAIL-TEMPLATES.md | Email notifications sent during journeys |
| APPENDICES/C-ERROR-CODES.md | Error codes encountered during troubleshooting |
