# Appendix B: Email Templates

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APPENDIX-B |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 03-AUTHENTICATION.md, 09-BILLING-AND-CREDITS.md, 11-SETTINGS-AND-SUPPORT.md, 14-ADMIN-MODERATION.md |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Email Design Standards](#2-email-design-standards)
3. [Authentication Emails](#3-authentication-emails)
4. [Billing Emails](#4-billing-emails)
5. [Credit and Usage Emails](#5-credit-and-usage-emails)
6. [Support Emails](#6-support-emails)
7. [Account Management Emails](#7-account-management-emails)
8. [Admin Notification Emails](#8-admin-notification-emails)
9. [Status Page Emails](#9-status-page-emails)
10. [Email Delivery Rules](#10-email-delivery-rules)
11. [Related Documents](#11-related-documents)

---

## 1. Overview

This appendix documents every transactional email the Scrapifie platform sends. For each email template, the following is specified: trigger event, sender, recipient, subject line, body content sections, dynamic variables, call-to-action button (if any), and plain text fallback notes.

Scrapifie does NOT send marketing emails. All emails listed here are transactional -- triggered by user actions, system events, or administrative actions.

### Email Categories

| Category | Count | Description |
|----------|-------|-------------|
| Authentication | 8 | Registration, verification, password reset, MFA, OAuth, sessions |
| Billing | 10 | Subscriptions, payments, invoices, refunds |
| Credit and Usage | 4 | Credit alerts, usage warnings |
| Support | 5 | Ticket creation, replies, status changes |
| Account Management | 5 | Profile changes, security changes, account deletion |
| Admin Notifications | 6 | Events that notify administrators |
| Status Page | 2 | Status updates for subscribed users |
| **Total** | **40** | |

---

## 2. Email Design Standards

### Sender Information

| Field | Value |
|-------|-------|
| From name | Scrapifie |
| From address | Configurable via environment variable (e.g., notifications@scrapifie.com) |
| Reply-to | Configurable, defaults to support@scrapifie.com for support emails, no-reply@scrapifie.com for automated notifications |

### Design Principles

| Principle | Detail |
|-----------|--------|
| No images in email body | Emails do not rely on images. No logos, no decorative graphics. This ensures readability in all email clients and avoids spam filter triggers. |
| Plain text alternative | Every email has a plain text version. The plain text version includes all content and links from the HTML version. |
| No tracking pixels | No open-tracking pixels. No click-tracking link wrapping. |
| Responsive | Emails render correctly on mobile (320px) and desktop (600px max width) |
| Maximum width | 600px centered |
| Font | System font stack (no custom web fonts in email) |
| Colors | Minimal: primary text color, muted secondary text, one accent color for CTA buttons. Light background. All colors high-contrast for accessibility. |
| CTA button | Centered, padded, rounded corners, high contrast text on accent background. Fallback plain text link below button for email clients that do not render HTML buttons. |
| Unsubscribe | All non-critical emails include an unsubscribe link in the footer. Security and billing emails do not include unsubscribe (they are mandatory). |
| Footer | Every email includes: "Scrapifie" name, support email link, link to notification preferences (for logged-in users), unsubscribe link (where applicable). |

### Variable Syntax

Variables in templates are referenced as {{variable_name}} throughout this document. These are replaced with actual values at send time.

---

## 3. Authentication Emails

### 3.1 Email Verification

| Field | Value |
|-------|-------|
| Template ID | AUTH-001 |
| Trigger | User registers a new account |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Verify your Scrapifie account |
| Priority | High (send immediately, no batching) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Thank you for creating a Scrapifie account. Please verify your email address to activate your account." |
| CTA button | "Verify Email Address" linking to {{verification_url}} |
| Expiry notice | "This link expires in 24 hours. If you did not create this account, you can safely ignore this email." |
| Fallback link | "If the button does not work, copy and paste this URL into your browser: {{verification_url}}" |

Variables:

| Variable | Source |
|----------|--------|
| user_name | User's display name from registration |
| user_email | Email address provided during registration |
| verification_url | Base URL + /verify-email?token={{token}} |

### 3.2 Email Verified Confirmation

| Field | Value |
|-------|-------|
| Template ID | AUTH-002 |
| Trigger | User successfully verifies their email address |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie account is verified |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your email address has been verified. Your Scrapifie account is now fully active." |
| Next steps | "Get started by creating your first API key in the dashboard." |
| CTA button | "Go to Dashboard" linking to {{dashboard_url}} |

### 3.3 Password Reset Request

| Field | Value |
|-------|-------|
| Template ID | AUTH-003 |
| Trigger | User requests a password reset |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Reset your Scrapifie password |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello," (no name, for anti-enumeration -- same email sent even if account does not exist, but only actually delivered if account exists) |
| Body | "We received a request to reset the password for the Scrapifie account associated with this email address." |
| CTA button | "Reset Password" linking to {{reset_url}} |
| Expiry notice | "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email. Your password will not be changed." |
| Security note | "If you did not request this, someone may have entered your email address by mistake. No action is needed." |
| Fallback link | "If the button does not work, copy and paste this URL into your browser: {{reset_url}}" |

Variables:

| Variable | Source |
|----------|--------|
| user_email | Email address from the reset request |
| reset_url | Base URL + /reset-password?token={{token}} |

### 3.4 Password Changed Confirmation

| Field | Value |
|-------|-------|
| Template ID | AUTH-004 |
| Trigger | User successfully changes their password (via reset flow or settings) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie password has been changed |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "The password for your Scrapifie account was changed on {{change_date}} at {{change_time}} UTC." |
| Security notice | "If you made this change, no further action is needed. If you did not change your password, please reset it immediately and contact support." |
| CTA button | "Reset Password" linking to {{reset_request_url}} |
| Support link | "Contact support: {{support_email}}" |

### 3.5 MFA Enabled Confirmation

| Field | Value |
|-------|-------|
| Template ID | AUTH-005 |
| Trigger | User enables MFA (TOTP) on their account |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Two-factor authentication enabled on your Scrapifie account |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Two-factor authentication has been enabled on your Scrapifie account. You will now be required to enter a verification code from your authenticator app when logging in." |
| Backup codes reminder | "Make sure you have saved your backup codes in a secure location. Each backup code can only be used once." |
| Security notice | "If you did not enable this, please contact support immediately." |

### 3.6 MFA Disabled Notification

| Field | Value |
|-------|-------|
| Template ID | AUTH-006 |
| Trigger | User disables MFA on their account, or admin force-disables MFA |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Two-factor authentication disabled on your Scrapifie account |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Two-factor authentication has been disabled on your Scrapifie account on {{change_date}} at {{change_time}} UTC." |
| Security warning | "Your account is now protected by password only. We recommend re-enabling two-factor authentication for enhanced security." |
| CTA button | "Security Settings" linking to {{security_settings_url}} |
| Not you notice | "If you did not make this change, please reset your password immediately and contact support." |

### 3.7 New Login from Unrecognized Device

| Field | Value |
|-------|-------|
| Template ID | AUTH-007 |
| Trigger | User logs in from a browser/device not seen in their recent session history |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | New login to your Scrapifie account |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "A new login to your Scrapifie account was detected." |
| Login details table | Date: {{login_date}}, Time: {{login_time}} UTC, Browser: {{browser_name}}, Operating System: {{os_name}}, IP Address: {{ip_address}}, Approximate Location: {{location}} |
| Not you notice | "If this was you, no action is needed. If you do not recognize this login, please change your password immediately and review your active sessions." |
| CTA button | "Review Active Sessions" linking to {{security_settings_url}} |

### 3.8 OAuth Account Linked

| Field | Value |
|-------|-------|
| Template ID | AUTH-008 |
| Trigger | User links a new OAuth provider (Google or GitHub) to their account |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | {{provider_name}} account linked to your Scrapifie account |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your {{provider_name}} account ({{provider_email}}) has been linked to your Scrapifie account. You can now sign in using {{provider_name}}." |
| Not you notice | "If you did not link this account, please contact support immediately." |

---

## 4. Billing Emails

### 4.1 Subscription Created (Welcome to Plan)

| Field | Value |
|-------|-------|
| Template ID | BILL-001 |
| Trigger | User subscribes to a paid plan (Pro or Enterprise) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Welcome to Scrapifie {{plan_name}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Thank you for subscribing to Scrapifie {{plan_name}}. Your account has been upgraded and your new features are available immediately." |
| Plan details | Plan: {{plan_name}}, Monthly credits: {{credit_amount}}, Billing frequency: {{billing_frequency}}, Next billing date: {{next_billing_date}}, Amount: {{amount}} {{currency}} |
| CTA button | "Go to Dashboard" linking to {{dashboard_url}} |

### 4.2 Subscription Renewed

| Field | Value |
|-------|-------|
| Template ID | BILL-002 |
| Trigger | Subscription renews at the start of a new billing cycle |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie subscription has renewed |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie {{plan_name}} subscription has renewed for the next billing cycle." |
| Renewal details | Amount charged: {{amount}} {{currency}}, Billing period: {{period_start}} to {{period_end}}, Credits refreshed: {{credit_amount}}, Next renewal: {{next_billing_date}} |
| Invoice note | "Your invoice is available in your billing settings." |
| CTA button | "View Invoice" linking to {{billing_url}} |

### 4.3 Payment Successful

| Field | Value |
|-------|-------|
| Template ID | BILL-003 |
| Trigger | Any successful payment (subscription, credit pack) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Payment receipt -- {{amount}} {{currency}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "We have received your payment." |
| Payment details | Amount: {{amount}} {{currency}}, Description: {{description}}, Date: {{payment_date}}, Payment method: {{payment_method_last4}}, Invoice: {{invoice_number}} |
| CTA button | "View Invoice" linking to {{invoice_url}} |

### 4.4 Payment Failed

| Field | Value |
|-------|-------|
| Template ID | BILL-004 |
| Trigger | A payment attempt fails (subscription renewal or credit pack purchase) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Payment failed for your Scrapifie account |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "We were unable to process your payment of {{amount}} {{currency}} for {{description}}." |
| Failure details | Date: {{attempt_date}}, Amount: {{amount}} {{currency}}, Reason: {{failure_reason}}, Next retry: {{next_retry_date}} (or "No automatic retry" if final attempt) |
| Action required | "Please update your payment method to avoid service interruption." |
| CTA button | "Update Payment Method" linking to {{billing_url}} |
| Escalation warning | "If payment is not resolved within {{days_until_restriction}} days, your account will be restricted." |

### 4.5 Plan Upgraded

| Field | Value |
|-------|-------|
| Template ID | BILL-005 |
| Trigger | User upgrades from a lower plan to a higher plan |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie plan has been upgraded to {{new_plan_name}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie plan has been upgraded from {{old_plan_name}} to {{new_plan_name}}. Your new features are available immediately." |
| Upgrade details | Previous plan: {{old_plan_name}}, New plan: {{new_plan_name}}, Prorated charge: {{prorated_amount}} {{currency}}, New monthly credits: {{new_credit_amount}}, Credits added for remainder of cycle: {{prorated_credits}} |
| CTA button | "Go to Dashboard" linking to {{dashboard_url}} |

### 4.6 Plan Downgrade Scheduled

| Field | Value |
|-------|-------|
| Template ID | BILL-006 |
| Trigger | User requests a plan downgrade (takes effect at end of billing cycle) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie plan downgrade has been scheduled |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your plan downgrade from {{old_plan_name}} to {{new_plan_name}} has been scheduled. The change will take effect on {{effective_date}}." |
| What changes | List of feature changes (e.g., credit reduction, engine access changes, key limit reduction, retention changes) |
| Cancel option | "You can cancel this downgrade at any time before {{effective_date}} from your billing settings." |
| CTA button | "Billing Settings" linking to {{billing_url}} |

### 4.7 Subscription Cancelled

| Field | Value |
|-------|-------|
| Template ID | BILL-007 |
| Trigger | User cancels their subscription |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie subscription has been cancelled |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie {{plan_name}} subscription has been cancelled. You will continue to have access to {{plan_name}} features until {{end_date}}." |
| After cancellation | "After {{end_date}}, your account will revert to the Free plan with 1,000 monthly credits." |
| Reactivation | "Changed your mind? You can reactivate your subscription at any time before {{end_date}}." |
| CTA button | "Reactivate Subscription" linking to {{billing_url}} |

### 4.8 Invoice Available

| Field | Value |
|-------|-------|
| Template ID | BILL-008 |
| Trigger | A new invoice is generated (subscription renewal, credit pack purchase) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Scrapifie Invoice {{invoice_number}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "A new invoice is available for your Scrapifie account." |
| Invoice summary | Invoice number: {{invoice_number}}, Date: {{invoice_date}}, Amount: {{amount}} {{currency}}, Status: {{invoice_status}}, Description: {{description}} |
| CTA button | "View Invoice" linking to {{invoice_url}} |
| PDF note | "You can download a PDF copy of this invoice from your billing settings." |

### 4.9 Refund Processed

| Field | Value |
|-------|-------|
| Template ID | BILL-009 |
| Trigger | Admin approves and processes a refund |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Refund processed for your Scrapifie account |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "A refund has been processed for your Scrapifie account." |
| Refund details | Refund amount: {{refund_amount}} {{currency}}, Original invoice: {{invoice_number}}, Original charge: {{original_amount}} {{currency}}, Refund type: {{refund_type}} (Full or Partial), Processing time: Refunds typically appear on your statement within 5-10 business days. |
| CTA button | "View Billing History" linking to {{billing_url}} |

### 4.10 Account Restricted Due to Payment Failure

| Field | Value |
|-------|-------|
| Template ID | BILL-010 |
| Trigger | Account reaches the "restricted" stage of the payment failure escalation (day 10) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Action required: Your Scrapifie account has been restricted |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Due to an outstanding payment of {{amount}} {{currency}}, your Scrapifie account has been restricted. You can still access your dashboard and data, but you cannot submit new scrape jobs or create API keys." |
| Timeline | "Your payment has been overdue since {{original_due_date}}. If payment is not resolved by {{suspension_date}}, your account will be suspended." |
| Action required | "Please update your payment method to restore full access." |
| CTA button | "Update Payment Method" linking to {{billing_url}} |

---

## 5. Credit and Usage Emails

### 5.1 Credits at 75% Used

| Field | Value |
|-------|-------|
| Template ID | USAGE-001 |
| Trigger | Account credit usage reaches 75% of the billing cycle allocation |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | You have used 75% of your Scrapifie credits |
| Priority | Normal |
| Unsubscribable | Yes (via notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "You have used {{used_credits}} of your {{total_credits}} credits for this billing cycle ({{percentage}}%). You have {{remaining_credits}} credits remaining." |
| Projection | "At your current usage rate, you may run out of credits before your next billing cycle on {{next_billing_date}}." |
| Upgrade prompt (Free users) | "Upgrade to Pro for 50,000 monthly credits." CTA button: "View Plans" linking to {{pricing_url}} |
| Pack prompt (Pro/Enterprise users) | "Need more credits? Purchase a credit pack." CTA button: "Buy Credits" linking to {{billing_url}} |

### 5.2 Credits at 90% Used

| Field | Value |
|-------|-------|
| Template ID | USAGE-002 |
| Trigger | Account credit usage reaches 90% of the billing cycle allocation |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | You have used 90% of your Scrapifie credits |
| Priority | High |
| Unsubscribable | Yes (via notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "You have used {{used_credits}} of your {{total_credits}} credits for this billing cycle ({{percentage}}%). You have {{remaining_credits}} credits remaining." |
| Urgency | "You are approaching your credit limit. Once credits are exhausted, API requests will be rejected until your next billing cycle on {{next_billing_date}}." |
| CTA button | Same as USAGE-001 (plan-dependent) |

### 5.3 Credits Exhausted

| Field | Value |
|-------|-------|
| Template ID | USAGE-003 |
| Trigger | Account credit balance reaches zero |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie credits have been exhausted |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie credits for this billing cycle have been exhausted. All API requests will be rejected until credits are available." |
| Next cycle | "Your credits will refresh on {{next_billing_date}} when your next billing cycle begins." |
| Options | "You can restore access immediately by purchasing a credit pack or upgrading your plan." |
| CTA button (Free) | "Upgrade Plan" linking to {{pricing_url}} |
| CTA button (Pro/Enterprise) | "Buy Credit Pack" linking to {{billing_url}} |

### 5.4 Job Failure Alert

| Field | Value |
|-------|-------|
| Template ID | USAGE-004 |
| Trigger | A job fails after all retry attempts are exhausted |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Scrape job failed -- {{job_url_truncated}} |
| Priority | Normal |
| Unsubscribable | Yes (via notification preferences, "Job failure alerts" toggle) |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "A scrape job on your Scrapifie account has failed after {{attempt_count}} attempts." |
| Job details | Job ID: {{job_id}}, URL: {{target_url}}, Engine: {{engine}}, Error: {{error_message}}, Credits charged: {{credits_charged}}, Time: {{failure_time}} UTC |
| CTA button | "View Job Details" linking to {{job_detail_url}} |
| Troubleshooting | "For help resolving this error, check our documentation on error handling." Link to docs error handling guide. |

---

## 6. Support Emails

### 6.1 Support Ticket Created (Confirmation to User)

| Field | Value |
|-------|-------|
| Template ID | SUPPORT-001 |
| Trigger | User creates a new support ticket |
| Sender | Scrapifie Support <support@scrapifie.com> |
| Reply-to | support@scrapifie.com |
| Recipient | {{user_email}} |
| Subject | [Ticket #{{ticket_number}}] {{ticket_subject}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "We have received your support request. Our team will review it and respond as soon as possible." |
| Ticket details | Ticket number: #{{ticket_number}}, Subject: {{ticket_subject}}, Category: {{ticket_category}}, Priority: {{ticket_priority}}, Submitted: {{created_date}} UTC |
| Response time | "Expected response time: {{response_target}}" (based on priority and plan) |
| CTA button | "View Ticket" linking to {{ticket_url}} |

### 6.2 Support Ticket Reply from Admin

| Field | Value |
|-------|-------|
| Template ID | SUPPORT-002 |
| Trigger | Admin replies to a user's support ticket |
| Sender | Scrapifie Support <support@scrapifie.com> |
| Reply-to | support@scrapifie.com |
| Recipient | {{user_email}} |
| Subject | Re: [Ticket #{{ticket_number}}] {{ticket_subject}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Scrapifie Support has replied to your ticket." |
| Reply preview | First 200 characters of the admin's reply message |
| CTA button | "View Full Reply" linking to {{ticket_url}} |
| Note | "You can reply directly from the ticket page." |

### 6.3 Support Ticket Status Changed

| Field | Value |
|-------|-------|
| Template ID | SUPPORT-003 |
| Trigger | Admin changes the status of a ticket (e.g., to Resolved, Waiting on User) |
| Sender | Scrapifie Support <support@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | [Ticket #{{ticket_number}}] Status updated to {{new_status}} |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "The status of your support ticket has been updated." |
| Status details | Ticket: #{{ticket_number}}, Subject: {{ticket_subject}}, Previous status: {{old_status}}, New status: {{new_status}} |
| Resolved note (if status is Resolved) | "If your issue has been resolved, no further action is needed. This ticket will be automatically closed in 7 days. If you need further help, you can reopen it by replying." |
| CTA button | "View Ticket" linking to {{ticket_url}} |

### 6.4 Support Ticket Auto-Close Warning

| Field | Value |
|-------|-------|
| Template ID | SUPPORT-004 |
| Trigger | Ticket has been in "Waiting on User" status for 7 days with no response |
| Sender | Scrapifie Support <support@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | [Ticket #{{ticket_number}}] Closing soon -- response needed |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "We have not heard back from you on support ticket #{{ticket_number}} ({{ticket_subject}}). This ticket will be automatically closed in 7 days if we do not receive a response." |
| CTA button | "Reply to Ticket" linking to {{ticket_url}} |
| Note | "If your issue has been resolved, no action is needed." |

### 6.5 Support Ticket Auto-Closed

| Field | Value |
|-------|-------|
| Template ID | SUPPORT-005 |
| Trigger | Ticket auto-closed after 14 days of inactivity in "Waiting on User" status |
| Sender | Scrapifie Support <support@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | [Ticket #{{ticket_number}}] Automatically closed |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Support ticket #{{ticket_number}} ({{ticket_subject}}) has been automatically closed due to inactivity." |
| Reopen note | "If you still need help with this issue, you can create a new support ticket from your dashboard." |
| CTA button | "Create New Ticket" linking to {{support_url}} |

---

## 7. Account Management Emails

### 7.1 Email Change Verification (Sent to New Address)

| Field | Value |
|-------|-------|
| Template ID | ACCOUNT-001 |
| Trigger | User initiates an email change from profile settings |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{new_email}} (the new email address) |
| Subject | Verify your new email address for Scrapifie |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello," |
| Body | "A request was made to change the email address for a Scrapifie account to this address. Please verify this email address to complete the change." |
| CTA button | "Verify New Email" linking to {{verification_url}} |
| Expiry notice | "This link expires in 24 hours. If you did not request this change, you can safely ignore this email." |

### 7.2 Email Changed Notification (Sent to Old Address)

| Field | Value |
|-------|-------|
| Template ID | ACCOUNT-002 |
| Trigger | User completes the email change verification (new email confirmed) |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{old_email}} (the previous email address) |
| Subject | Your Scrapifie email address has been changed |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "The email address for your Scrapifie account has been changed from {{old_email}} to a new address on {{change_date}} at {{change_time}} UTC." |
| Security notice | "If you made this change, no further action is needed. If you did not change your email address, please contact support immediately." |
| Support link | "Contact support: {{support_email}}" |

### 7.3 Account Suspended Notification

| Field | Value |
|-------|-------|
| Template ID | ACCOUNT-003 |
| Trigger | Admin suspends a user's account, or account is auto-suspended due to payment failure escalation |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie account has been suspended |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie account has been suspended." |
| Reason | "Reason: {{suspension_reason}}" |
| Impact | "While your account is suspended, you cannot log in, and all API keys are disabled." |
| Resolution (payment-related) | "To resolve this, please update your payment method. Your account will be restored once payment is received." CTA button: "Update Payment Method" linking to {{billing_url}} |
| Resolution (policy-related) | "If you believe this is an error, please contact support at {{support_email}}." |

### 7.4 Account Unsuspended Notification

| Field | Value |
|-------|-------|
| Template ID | ACCOUNT-004 |
| Trigger | Admin unsuspends a user's account |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie account has been restored |
| Priority | High (send immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello {{user_name}}," |
| Body | "Your Scrapifie account has been restored. You can now log in and use all platform features." |
| API keys note | "Your API keys have been re-enabled. If you previously had active integrations, they should resume working automatically." |
| CTA button | "Go to Dashboard" linking to {{dashboard_url}} |

### 7.5 Account Deletion Confirmation

| Field | Value |
|-------|-------|
| Template ID | ACCOUNT-005 |
| Trigger | User completes the account deletion flow |
| Sender | Scrapifie <notifications@scrapifie.com> |
| Recipient | {{user_email}} |
| Subject | Your Scrapifie account has been deleted |
| Priority | Normal |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Greeting | "Hello," |
| Body | "Your Scrapifie account has been deleted as requested on {{deletion_date}}." |
| Data retention | "Your personal data has been anonymized. Certain records may be retained in anonymized form for legal and financial compliance purposes as described in our Privacy Policy." |
| Finality | "This action is permanent. If you wish to use Scrapifie in the future, you will need to create a new account." |
| Feedback (optional) | "We are sorry to see you go. If you have any feedback about your experience, you can reach us at {{support_email}}." |

---

## 8. Admin Notification Emails

These emails are sent to admin email addresses, not to regular users.

### 8.1 New Support Ticket (Admin Alert)

| Field | Value |
|-------|-------|
| Template ID | ADMIN-001 |
| Trigger | User creates a new support ticket |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | New support ticket: [#{{ticket_number}}] {{ticket_subject}} |
| Priority | Normal (High if ticket priority is Urgent) |
| Unsubscribable | Yes (via admin notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Body | "A new support ticket has been submitted." |
| Ticket details | Number: #{{ticket_number}}, Subject: {{ticket_subject}}, Category: {{ticket_category}}, Priority: {{ticket_priority}}, User: {{user_name}} ({{user_email}}), Plan: {{user_plan}}, Created: {{created_date}} UTC |
| CTA button | "View Ticket" linking to {{admin_ticket_url}} |

### 8.2 Abuse Flag Triggered (Admin Alert)

| Field | Value |
|-------|-------|
| Template ID | ADMIN-002 |
| Trigger | Automated abuse detection flags a user account |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | Abuse flag: {{flag_reason}} -- {{user_email}} |
| Priority | High |
| Unsubscribable | Yes (via admin notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Body | "An abuse flag has been triggered for a user account." |
| Flag details | User: {{user_name}} ({{user_email}}), Plan: {{user_plan}}, Flag reason: {{flag_reason}}, Detection signal: {{detection_signal}}, Threshold: {{threshold_value}}, Actual value: {{actual_value}}, Flagged at: {{flag_time}} UTC |
| CTA button | "Investigate" linking to {{admin_investigation_url}} |

### 8.3 Payment Failure (Admin Alert)

| Field | Value |
|-------|-------|
| Template ID | ADMIN-003 |
| Trigger | A payment failure occurs and the user enters the escalation ladder |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | Payment failure: {{user_email}} -- {{escalation_stage}} |
| Priority | Normal |
| Unsubscribable | Yes (via admin notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Body | "A payment failure has been recorded." |
| Details | User: {{user_name}} ({{user_email}}), Plan: {{user_plan}}, Amount: {{amount}} {{currency}}, Failure reason: {{failure_reason}}, Escalation stage: {{escalation_stage}}, Days overdue: {{days_overdue}}, Next auto-action: {{next_action}} on {{next_action_date}} |
| CTA button | "View User" linking to {{admin_user_url}} |

### 8.4 Account Auto-Suspended (Admin Alert)

| Field | Value |
|-------|-------|
| Template ID | ADMIN-004 |
| Trigger | An account is automatically suspended due to payment failure reaching day 14 |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | Account auto-suspended: {{user_email}} |
| Priority | High |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Body | "A user account has been automatically suspended due to prolonged payment failure." |
| Details | User: {{user_name}} ({{user_email}}), Plan: {{user_plan}}, Outstanding amount: {{amount}} {{currency}}, Overdue since: {{original_due_date}}, Suspension date: {{suspension_date}} UTC |
| Impact | "User's sessions have been invalidated and API keys disabled." |
| CTA button | "View User" linking to {{admin_user_url}} |

### 8.5 System Health Alert (Admin Alert)

| Field | Value |
|-------|-------|
| Template ID | ADMIN-005 |
| Trigger | A critical or high-severity system health alert fires |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | [{{severity}}] System alert: {{alert_name}} |
| Priority | High (Critical alerts sent immediately) |
| Unsubscribable | No |

Body content:

| Section | Content |
|---------|---------|
| Body | "A system health alert has been triggered." |
| Alert details | Alert: {{alert_name}}, Severity: {{severity}}, Condition: {{alert_condition}}, Current value: {{current_value}}, Threshold: {{threshold_value}}, Triggered at: {{alert_time}} UTC |
| Action | "Please investigate and take appropriate action." |
| CTA button | "View System Health" linking to {{admin_operations_url}} |

### 8.6 Daily Admin Digest

| Field | Value |
|-------|-------|
| Template ID | ADMIN-006 |
| Trigger | Scheduled daily at a configured time (e.g., 08:00 UTC) |
| Sender | Scrapifie System <notifications@scrapifie.com> |
| Recipient | Admin notification email(s) |
| Subject | Scrapifie Daily Digest -- {{date}} |
| Priority | Normal |
| Unsubscribable | Yes (via admin notification preferences) |

Body content:

| Section | Content |
|---------|---------|
| Header | "Daily platform summary for {{date}}" |
| Key metrics | New registrations: {{new_registrations}}, Total active users: {{active_users}}, Total API requests: {{total_requests}}, Revenue today: {{daily_revenue}} {{currency}}, Open support tickets: {{open_tickets}}, Unresolved abuse flags: {{unresolved_flags}} |
| Alerts summary | Count of alerts triggered in the last 24 hours, grouped by severity |
| Action items | List of items needing attention: unassigned urgent tickets, pending refund requests, accounts approaching suspension |
| CTA button | "Go to Admin Dashboard" linking to {{admin_url}} |

---

## 9. Status Page Emails

### 9.1 Incident Notification

| Field | Value |
|-------|-------|
| Template ID | STATUS-001 |
| Trigger | Admin creates a new incident or updates an existing incident on the status page |
| Sender | Scrapifie Status <status@scrapifie.com> |
| Recipient | All status update subscribers |
| Subject | [{{severity}}] {{incident_title}} |
| Priority | High |
| Unsubscribable | Yes (unsubscribe link specific to status updates) |

Body content:

| Section | Content |
|---------|---------|
| Status badge | "{{incident_status}}" (Investigating, Identified, Monitoring, Resolved) |
| Body | "{{update_message}}" (the latest update text from the admin) |
| Affected services | List of affected services |
| Timeline | Latest 3 status updates with timestamps |
| CTA button | "View Status Page" linking to {{status_page_url}} |
| Unsubscribe | "Unsubscribe from status updates: {{unsubscribe_url}}" |

### 9.2 Scheduled Maintenance Notification

| Field | Value |
|-------|-------|
| Template ID | STATUS-002 |
| Trigger | Admin schedules a maintenance window (sent at the configured notification time, e.g., 24 hours before) |
| Sender | Scrapifie Status <status@scrapifie.com> |
| Recipient | All status update subscribers |
| Subject | Scheduled maintenance: {{maintenance_title}} |
| Priority | Normal |
| Unsubscribable | Yes (unsubscribe link specific to status updates) |

Body content:

| Section | Content |
|---------|---------|
| Body | "Scheduled maintenance is planned for the following time." |
| Details | Title: {{maintenance_title}}, Start: {{start_time}} UTC, Expected duration: {{duration}}, Affected services: {{affected_services}}, Description: {{description}} |
| Impact | "During this window, {{impact_description}}." |
| CTA button | "View Status Page" linking to {{status_page_url}} |
| Unsubscribe | "Unsubscribe from status updates: {{unsubscribe_url}}" |

---

## 10. Email Delivery Rules

### 10.1 Sending Priority

| Priority | Behavior |
|----------|----------|
| High | Sent immediately upon trigger event. No batching, no delay. Processed first in the email queue. |
| Normal | Queued and sent within 5 minutes. May be batched if multiple normal-priority emails are queued for the same recipient. |

### 10.2 Rate Limiting

| Rule | Limit |
|------|-------|
| Per recipient, per hour | Maximum 20 emails per hour to a single address |
| Per recipient, per day | Maximum 50 emails per day to a single address |
| Duplicate suppression | If the same template is triggered for the same recipient within 5 minutes, suppress the duplicate (except for critical security emails like password change, MFA disable, and suspicious login) |

### 10.3 Non-Deliverable Handling

| Scenario | Action |
|----------|--------|
| Hard bounce | Mark email address as undeliverable. Do not retry. Log the bounce event. |
| Soft bounce | Retry up to 3 times with 15-minute intervals. If still failing, log and stop. |
| Spam complaint | Log the complaint. Remove the email address from non-critical sends. Security and billing emails continue. |

### 10.4 Email Queue

All emails are sent through a queue (using the same BullMQ infrastructure as the scraping job queue). This ensures:

| Benefit | Description |
|---------|-------------|
| Reliability | Failed sends are retried automatically |
| Ordering | High-priority emails are processed before normal-priority |
| Rate control | Queue processing respects rate limits |
| Observability | Email send status is trackable (queued, sent, delivered, failed, bounced) |

### 10.5 Notification Preferences Respect

| Email Category | User Can Disable | Override Condition |
|----------------|-----------------|-------------------|
| Security alerts (AUTH-003 through AUTH-008, ACCOUNT-001 through ACCOUNT-004) | No | Always sent |
| Billing notifications (BILL-001 through BILL-010) | No | Always sent |
| Credit usage alerts (USAGE-001, USAGE-002) | Yes | User has disabled "Credit alerts" in notification preferences |
| Credit exhaustion (USAGE-003) | No | Always sent (operational, not preference-based) |
| Job failure alerts (USAGE-004) | Yes | User has disabled "Job failure alerts" in notification preferences |
| Support ticket emails (SUPPORT-001 through SUPPORT-005) | No | Always sent |
| Account deletion (ACCOUNT-005) | No | Always sent |
| Status page updates (STATUS-001, STATUS-002) | Yes | User is not subscribed to status updates |
| Admin emails (ADMIN-001 through ADMIN-006) | Partially | Admin-005 (system health) always sent; others configurable per admin |

---

## 11. Related Documents

| Document | Relevance |
|----------|-----------|
| 03-AUTHENTICATION.md | Authentication flows that trigger AUTH-* emails |
| 09-BILLING-AND-CREDITS.md | Billing flows that trigger BILL-* and USAGE-* emails |
| 11-SETTINGS-AND-SUPPORT.md | Settings changes and support flows that trigger ACCOUNT-* and SUPPORT-* emails |
| 14-ADMIN-MODERATION.md | Admin actions that trigger ADMIN-* emails |
| 16-ADMIN-OPERATIONS.md | System alerts that trigger ADMIN-005 |
| 18-DATA-MODELS.md | Notification entity model |
| APPENDICES/D-ENVIRONMENT-VARIABLES.md | Email service configuration variables |
