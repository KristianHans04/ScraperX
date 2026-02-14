# Appendix C: Error Codes

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APPENDIX-C |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 17-DOCS-PORTAL.md, 07-JOBS-AND-LOGS.md, 19-SECURITY-FRAMEWORK.md, 03-AUTHENTICATION.md |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Error Response Format](#2-error-response-format)
3. [Authentication Errors (AUTH)](#3-authentication-errors-auth)
4. [Authorization Errors (AUTHZ)](#4-authorization-errors-authz)
5. [Validation Errors (VAL)](#5-validation-errors-val)
6. [API Key Errors (KEY)](#6-api-key-errors-key)
7. [Job Errors (JOB)](#7-job-errors-job)
8. [Scraping Engine Errors (ENGINE)](#8-scraping-engine-errors-engine)
9. [Credit and Billing Errors (CREDIT / BILLING)](#9-credit-and-billing-errors-credit--billing)
10. [Rate Limiting Errors (RATE)](#10-rate-limiting-errors-rate)
11. [Account Errors (ACCOUNT)](#11-account-errors-account)
12. [Support Errors (SUPPORT)](#12-support-errors-support)
13. [Admin Errors (ADMIN)](#13-admin-errors-admin)
14. [System Errors (SYS)](#14-system-errors-sys)
15. [File and Upload Errors (FILE)](#15-file-and-upload-errors-file)
16. [Error Code Quick Reference](#16-error-code-quick-reference)
17. [Related Documents](#17-related-documents)

---

## 1. Overview

This appendix documents every error code returned by the Scrapifie API. Each error code has a unique identifier, an associated HTTP status code, a user-facing message (safe to display to end users), a developer-facing message (more detailed, suitable for documentation and debug logs), common causes, and resolution steps.

### Error Code Format

All error codes follow the pattern: CATEGORY_SPECIFIC_ERROR

- **Category prefix** identifies the subsystem (AUTH, KEY, JOB, ENGINE, CREDIT, etc.)
- **Specific error** identifies the exact error condition
- All error codes are uppercase with underscores

### Design Principles

| Principle | Detail |
|-----------|--------|
| No internal details | Error messages never expose stack traces, database errors, internal IP addresses, or infrastructure details |
| Consistent format | Every error response uses the same JSON structure |
| Actionable | Every error includes guidance on how to resolve it |
| Anti-enumeration | Authentication and authorization errors use generic messages to prevent information disclosure |
| Stable codes | Error code identifiers are treated as a public API contract and do not change without a version bump |

---

## 2. Error Response Format

Every error response from the Scrapifie API follows this structure:

```
HTTP/1.1 {status_code}
Content-Type: application/json

{
  "error": {
    "code": "{ERROR_CODE}",
    "message": "{user_facing_message}",
    "details": {optional_object_with_additional_info}
  }
}
```

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| error.code | string | Yes | Unique error code identifier (e.g., AUTH_INVALID_CREDENTIALS) |
| error.message | string | Yes | Human-readable message safe to display to the user |
| error.details | object | No | Additional context when available (e.g., which field failed validation, rate limit reset time) |

### HTTP Status Code Usage

| Status Code | Usage |
|-------------|-------|
| 400 | Bad Request -- malformed request body, missing required fields, invalid parameter format |
| 401 | Unauthorized -- no authentication provided, invalid credentials, expired session or token |
| 403 | Forbidden -- authenticated but not authorized for this action, account suspended, CSRF failure |
| 404 | Not Found -- resource does not exist or is not accessible to the caller |
| 409 | Conflict -- resource already exists, state conflict (e.g., already verified, already cancelled) |
| 413 | Payload Too Large -- request body exceeds size limit |
| 422 | Unprocessable Entity -- request is well-formed but semantically invalid (e.g., password too weak, invalid URL) |
| 429 | Too Many Requests -- rate limit exceeded |
| 500 | Internal Server Error -- unexpected server error |
| 503 | Service Unavailable -- service temporarily unavailable (maintenance, overload) |

---

## 3. Authentication Errors (AUTH)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid email or password. | The provided email and password combination does not match any account. This message is intentionally generic to prevent account enumeration. | Wrong password, typo in email, account does not exist | Verify email and password, use password reset if forgotten |
| AUTH_EMAIL_NOT_VERIFIED | 403 | Please verify your email address before logging in. | The account exists but the email address has not been verified. A verification email was sent at registration. | User registered but did not click verification link | Check inbox for verification email, request a new one from the login page |
| AUTH_ACCOUNT_LOCKED | 403 | Your account has been temporarily locked due to too many failed login attempts. Please try again later. | Account lockout triggered by exceeding the failed login attempt threshold. Lock duration increases with repeat offenses. | Multiple incorrect password attempts | Wait for the lockout period to expire, or use password reset |
| AUTH_SESSION_EXPIRED | 401 | Your session has expired. Please log in again. | The session identified by the session cookie has expired (idle timeout or absolute timeout exceeded) or has been invalidated. | Idle for more than 30 minutes, session older than 24 hours, session revoked | Log in again |
| AUTH_SESSION_INVALID | 401 | Your session is no longer valid. Please log in again. | The session cookie references a session ID that does not exist in Redis. This may occur after a server-side session invalidation (password change, admin force logout). | Password changed, admin force logout, Redis data loss | Log in again |
| AUTH_CSRF_INVALID | 403 | Your request could not be verified. Please refresh the page and try again. | The X-CSRF-Token header is missing, empty, or does not match the token stored in the session. | Missing CSRF token header, token mismatch (session rotated or expired), cross-origin request | Refresh the page to get a new CSRF token, then retry |
| AUTH_MFA_REQUIRED | 401 | Two-factor authentication code required. | The account has MFA enabled. The login was successful (email + password) but an MFA code must be provided to complete authentication. | MFA is enabled on the account | Provide the TOTP code from the authenticator app or a backup code |
| AUTH_MFA_INVALID | 401 | Invalid verification code. Please try again. | The provided TOTP code or backup code is incorrect or expired. TOTP codes are valid for a 30-second window with one step of tolerance. | Wrong code, code expired, code already used (backup) | Enter the current code from the authenticator app, or use a different backup code |
| AUTH_MFA_BACKUP_EXHAUSTED | 401 | All backup codes have been used. Please use your authenticator app. | All single-use backup codes have been consumed. The user must use their authenticator app or contact support. | All 10 backup codes used | Use the authenticator app, or contact support to reset MFA |
| AUTH_OAUTH_STATE_INVALID | 400 | Authentication failed. Please try again. | The OAuth state parameter does not match the expected value stored in the session. This prevents CSRF attacks on the OAuth flow. | Expired OAuth session, tampered state parameter, user opened multiple OAuth flows | Retry the OAuth login from the beginning |
| AUTH_OAUTH_EMAIL_CONFLICT | 409 | An account with this email address already exists. Please log in with your email and password, then link your {{provider}} account from settings. | The email from the OAuth provider matches an existing account that was not created via OAuth. The user must link accounts explicitly. | User registered with email/password, then tried to log in via OAuth | Log in with email/password, then link OAuth from settings |
| AUTH_REGISTRATION_DISABLED | 403 | Registration is currently unavailable. Please try again later. | Registration has been temporarily disabled by an administrator. | Admin disabled registration during maintenance or abuse mitigation | Wait and try again later |
| AUTH_TOKEN_EXPIRED | 400 | This link has expired. Please request a new one. | The verification or password reset token has exceeded its validity period (24 hours for email verification, 1 hour for password reset). | Token expired | Request a new verification email or password reset |
| AUTH_TOKEN_INVALID | 400 | This link is invalid. Please request a new one. | The token does not exist, has already been used, or has been tampered with. | Token already used, URL modified, token deleted by cleanup | Request a new verification email or password reset |

---

## 4. Authorization Errors (AUTHZ)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| AUTHZ_FORBIDDEN | 403 | You do not have permission to perform this action. | The authenticated user does not have the required role or permission for this action. | Regular user attempting admin action, insufficient role in organization | Verify you have the correct role, contact an admin if access is needed |
| AUTHZ_RESOURCE_NOT_FOUND | 404 | The requested resource was not found. | The resource either does not exist or the authenticated user's account does not own it. Returns 404 instead of 403 to prevent resource enumeration. | Wrong resource ID, attempting to access another user's resource, resource deleted | Verify the resource ID, ensure you are accessing your own resources |
| AUTHZ_ACCOUNT_SUSPENDED | 403 | Your account has been suspended. Please contact support. | The authenticated user's account is in suspended status. All actions except viewing the suspension notice are blocked. | Admin suspension, payment failure escalation | Contact support or resolve payment issues |
| AUTHZ_ACCOUNT_RESTRICTED | 403 | Your account is currently restricted. This action is not available. | The authenticated user's account is in restricted status. Read-only access is permitted, but creating jobs, keys, or other write actions are blocked. | Payment failure escalation (pre-suspension), admin restriction | Resolve payment issues or contact support |

---

## 5. Validation Errors (VAL)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| VAL_REQUIRED_FIELD | 400 | {{field_name}} is required. | A required field is missing from the request body. The details object contains the field name. | Missing field in API request or form submission | Include the required field |
| VAL_INVALID_FORMAT | 400 | {{field_name}} is not in a valid format. | The field value does not match the expected format. Details include the field name and expected format. | Invalid email format, non-UUID where UUID expected, invalid date format | Correct the field value to match the expected format |
| VAL_TOO_SHORT | 422 | {{field_name}} must be at least {{min}} characters. | The field value is shorter than the minimum length requirement. | Password too short, name too short | Provide a longer value |
| VAL_TOO_LONG | 422 | {{field_name}} must be no more than {{max}} characters. | The field value exceeds the maximum length. | Message too long, name exceeds limit | Shorten the value |
| VAL_INVALID_EMAIL | 422 | Please enter a valid email address. | The email address fails format validation. | Typo in email, missing @ or domain | Enter a valid email address |
| VAL_PASSWORD_TOO_WEAK | 422 | Password must be at least 8 characters and include uppercase, lowercase, and a number. | The password does not meet the minimum strength requirements. Details include which criteria failed. | Password missing required character types | Choose a stronger password meeting all criteria |
| VAL_INVALID_URL | 422 | Please enter a valid HTTP or HTTPS URL. | The provided URL is not a valid HTTP/HTTPS URL. Protocols like file:, javascript:, data:, and ftp: are rejected. | Invalid protocol, malformed URL, relative URL | Provide a full URL starting with http:// or https:// |
| VAL_INVALID_ENUM | 400 | {{field_name}} must be one of: {{allowed_values}}. | The field value is not one of the accepted enumeration values. Details include the field name and allowed values. | Invalid engine type, invalid status value | Use one of the allowed values |
| VAL_INVALID_RANGE | 422 | {{field_name}} must be between {{min}} and {{max}}. | The numeric field value is outside the accepted range. | Timeout too low or too high, limit out of range | Use a value within the specified range |
| VAL_INVALID_IP | 422 | Please enter a valid IPv4 address or CIDR range. | The IP address or CIDR notation is malformed. | Typo in IP, invalid CIDR prefix length | Enter a valid IPv4 address (e.g., 192.168.1.1) or CIDR range (e.g., 10.0.0.0/24) |
| VAL_DUPLICATE_ENTRY | 409 | This {{resource}} already exists. | A unique constraint would be violated by this create/update operation. Details include the conflicting field. | Duplicate email, duplicate API key name, duplicate slug | Use a different value for the conflicting field |
| VAL_REQUEST_TOO_LARGE | 413 | Request body is too large. Maximum size is {{max_size}}. | The request body exceeds the maximum allowed size for this endpoint. | Uploading oversized file, request body with large payload | Reduce the request body size |

---

## 6. API Key Errors (KEY)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| KEY_MISSING | 401 | API key is required. Include it in the X-API-Key header. | No X-API-Key header found in the request. | Forgot to include the header | Add the X-API-Key header with your API key |
| KEY_INVALID | 401 | Invalid API key. | The provided API key does not match any active key in the system (after hashing). The key format may also be incorrect (not matching sk_live_ or sk_test_ prefix). | Typo in key, key not copied correctly, using a revoked key's value | Verify the key value, generate a new key if needed |
| KEY_REVOKED | 401 | This API key has been revoked. | The API key exists but has been revoked. Revoked keys are permanently deactivated. | Key was revoked by user or admin | Create a new API key from the dashboard |
| KEY_EXPIRED | 401 | This API key has expired. | The API key has passed its expiration date. | Key had an expiration date set and it has passed | Create a new API key or update the expiration on an existing key |
| KEY_DISABLED | 401 | This API key has been disabled. | The API key was disabled due to account suspension or plan downgrade. | Account suspended, key deactivated during downgrade | Resolve account status, then keys will be re-enabled |
| KEY_IP_REJECTED | 403 | This request is not allowed from your IP address. | The request IP address is not in the API key's IP whitelist. Details include the rejected IP (masked). | Request from IP not in whitelist, IP whitelist misconfigured | Add your IP to the key's whitelist in the dashboard |
| KEY_LIMIT_REACHED | 409 | You have reached the maximum number of API keys for your plan. | The account has reached the API key limit for their plan (Free: 1, Pro: 5, Enterprise: unlimited). | Creating keys beyond plan limit | Revoke an unused key, or upgrade your plan |
| KEY_TEST_URL_REJECTED | 403 | Test API keys can only be used with approved test URLs. | The target URL is not in the test URL allowlist. Test keys are restricted to a predefined set of URLs. | Using a test key with a non-test URL | Use a live API key for production URLs, or use an approved test URL |

---

## 7. Job Errors (JOB)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| JOB_NOT_FOUND | 404 | Job not found. | No job exists with the provided ID, or the job belongs to a different account. | Wrong job ID, accessing another account's job | Verify the job ID |
| JOB_ALREADY_CANCELLED | 409 | This job has already been cancelled. | Attempted to cancel a job that is already in cancelled status. | Duplicate cancel request | No action needed, the job is already cancelled |
| JOB_NOT_CANCELLABLE | 409 | This job cannot be cancelled in its current state. | Only jobs in "queued" or "processing" status can be cancelled. Jobs in completed, failed, cancelled, or expired status cannot be cancelled. | Attempting to cancel a completed or failed job | No action available for this job state |
| JOB_RESULT_NOT_READY | 404 | Job results are not yet available. | The job has not reached a terminal state (completed/failed). Results are only available for completed jobs. | Polling for results before job completes | Poll the job status endpoint and wait for "completed" status |
| JOB_RESULT_EXPIRED | 410 | Job results have expired and are no longer available. | The job results have been deleted according to the data retention policy (Free: 7 days, Pro: 30 days, Enterprise: 90 days). | Requesting results after retention period | Re-submit the job if data is still needed |
| JOB_RETRY_FAILED | 409 | This job cannot be retried. | The job is not in a retryable state, or the original API key has been revoked. | Job not in failed state, API key revoked, insufficient credits for retry | Check job state and credit balance |
| JOB_EXPORT_LIMIT | 429 | Export limit reached. You can export up to 5 times per hour. | The export rate limit of 5 exports per hour per user has been exceeded. | Too many export requests | Wait and try again later |
| JOB_EXPORT_TOO_LARGE | 422 | Export is limited to 10,000 jobs. Please narrow your filters. | The filtered job set exceeds the maximum export size of 10,000 jobs. | Date range or filters match too many jobs | Apply more restrictive filters (narrower date range, specific status or engine) |

---

## 8. Scraping Engine Errors (ENGINE)

These errors occur during the actual execution of a scrape job. They are recorded in job logs and returned in the job's error details.

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| ENGINE_TIMEOUT | -- | The request timed out before a response was received. | The scrape request exceeded the configured timeout (default 30 seconds, max 120 seconds). | Slow target server, large page, heavy JavaScript rendering | Increase the timeout parameter, or try a different engine |
| ENGINE_CONNECTION_REFUSED | -- | Could not connect to the target server. | TCP connection to the target URL was refused. | Target server is down, port not open, firewall blocking | Verify the URL is correct and the target is accessible |
| ENGINE_DNS_FAILURE | -- | Could not resolve the target domain. | DNS resolution failed for the target URL's hostname. | Typo in domain, domain does not exist, DNS outage | Check the URL for typos, verify the domain exists |
| ENGINE_SSL_ERROR | -- | SSL/TLS error connecting to the target. | The TLS handshake with the target server failed. | Expired certificate on target, certificate mismatch, unsupported TLS version | Verify the target URL's SSL certificate, try HTTP if appropriate |
| ENGINE_HTTP_ERROR | -- | The target server returned an error (HTTP {{status_code}}). | The target server returned a non-2xx HTTP status code. The status code is included in the details. | 403 Forbidden (blocked), 404 Not Found, 500 Server Error on target | Check if the URL is correct, try a different engine or proxy location |
| ENGINE_BLOCKED | -- | The request was blocked by the target website. | The target website's anti-bot measures detected and blocked the request. This includes CAPTCHAs, access denied pages, and bot detection scripts. | Target has anti-bot protection, datacenter IP detected | Try the stealth engine, use residential proxy, add geographic targeting |
| ENGINE_CAPTCHA | -- | The target website presented a CAPTCHA challenge. | The target website served a CAPTCHA that could not be automatically solved. | Heavy anti-bot protection on target | Use the stealth engine, try a different proxy region, reduce request frequency |
| ENGINE_REDIRECT_LOOP | -- | The request encountered a redirect loop. | The request was redirected more than 10 times, indicating an infinite redirect loop. | Misconfigured target server, bot-detection redirect loop | Check the URL directly in a browser, verify the redirect chain |
| ENGINE_CONTENT_TOO_LARGE | -- | The response from the target is too large to process. | The response body exceeds the maximum processable size (50MB). | Target page contains very large embedded content | Consider targeting a more specific URL or using resource blocking |
| ENGINE_JAVASCRIPT_ERROR | -- | A JavaScript error occurred while rendering the page. | A critical JavaScript error occurred during page rendering in the browser or stealth engine. | Target page has JavaScript errors, incompatible scripts | This may not affect the data you need; check the results |
| ENGINE_PROXY_FAILURE | -- | The request could not be completed through the proxy. | All available proxies for the request configuration (type, country) failed or were exhausted. | Proxy provider outage, requested country not available, all proxies blocked by target | Try a different proxy country, or retry later |
| ENGINE_SSRF_BLOCKED | -- | The target URL is not allowed. | The target URL resolves to a private, reserved, or internal IP address. This is blocked for security (SSRF prevention). | Targeting internal IP, localhost, metadata endpoints, private network addresses | Use a publicly accessible URL |
| ENGINE_UNSUPPORTED_PROTOCOL | -- | Only HTTP and HTTPS URLs are supported. | The target URL uses a protocol other than HTTP or HTTPS (e.g., FTP, file, data, javascript). | Invalid URL protocol | Use an HTTP or HTTPS URL |
| ENGINE_ENGINE_UNAVAILABLE | -- | The {{engine}} engine is not available on your current plan. | The requested engine requires a plan that the user does not have. Browser and Stealth engines are Pro/Enterprise only. | Free user requesting browser or stealth engine | Upgrade to Pro or Enterprise plan |

---

## 9. Credit and Billing Errors (CREDIT / BILLING)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| CREDIT_INSUFFICIENT | 402 | Insufficient credits. Your balance is {{balance}} credits, but this request requires {{cost}} credits. | The account does not have enough credits to cover the job cost. Credit costs: HTTP=1, Browser=5, Stealth=10. | Credits exhausted for the billing cycle | Purchase a credit pack (Pro/Enterprise) or wait for cycle reset (Free) or upgrade plan |
| CREDIT_ADJUSTMENT_FAILED | 500 | Credit adjustment could not be processed. Please try again. | An error occurred during the atomic credit balance update. This could be a database transaction failure. | Database error during credit operation | Retry the operation; if persistent, contact support |
| BILLING_NO_PAYMENT_METHOD | 402 | Please add a payment method to continue. | The requested action (upgrade, pack purchase) requires a payment method, but none is on file. | No payment method added | Add a payment method in billing settings |
| BILLING_PAYMENT_FAILED | 402 | Payment could not be processed. Please check your payment method. | The payment provider rejected the transaction. Details may include a reason code from the provider (generic, not provider-specific). | Insufficient funds, expired card, card declined | Update payment method, contact bank, try different card |
| BILLING_ALREADY_SUBSCRIBED | 409 | You are already subscribed to this plan. | Attempted to subscribe to the same plan the user is already on. | User clicked upgrade to their current plan | No action needed; if intending to change billing frequency, use the frequency change flow |
| BILLING_DOWNGRADE_PENDING | 409 | A plan downgrade is already scheduled for {{effective_date}}. Cancel the pending downgrade before making other changes. | A downgrade is already scheduled for end of cycle. Only one pending plan change is allowed at a time. | User has already scheduled a downgrade | Cancel the pending downgrade first, then make the new change |
| BILLING_CANCEL_ALREADY_PENDING | 409 | Your subscription is already scheduled for cancellation on {{end_date}}. | A cancellation is already pending. Duplicate cancellation requests are rejected. | User already cancelled | No action needed, or reactivate if cancellation was a mistake |
| BILLING_PACK_PLAN_REQUIRED | 403 | Credit packs are only available on Pro and Enterprise plans. | Free plan users attempted to purchase a credit pack. | Free user trying to buy credits | Upgrade to Pro or Enterprise first |
| BILLING_PACK_LIMIT_REACHED | 409 | You have reached the maximum of 5 credit pack purchases for this billing cycle. | The per-cycle credit pack purchase limit has been reached. | Bought 5 packs already this cycle | Wait for next billing cycle or upgrade plan for more base credits |
| BILLING_REFUND_INELIGIBLE | 422 | This charge is not eligible for a refund. | The charge is outside the refund eligibility window (7 days for subscriptions, credit packs are non-refundable). | Requesting refund after 7 days, requesting pack refund | Review refund policy |
| BILLING_INVOICE_NOT_FOUND | 404 | Invoice not found. | No invoice exists with the provided ID or the invoice belongs to a different account. | Wrong invoice ID | Verify the invoice ID |
| BILLING_WEBHOOK_INVALID_SIGNATURE | 401 | -- (not user-facing) | The webhook request signature does not match the expected value computed from the payload and signing secret. | Tampered webhook, incorrect signing secret, replay attack | Verify webhook signing secret configuration |
| BILLING_WEBHOOK_DUPLICATE | 200 | -- (not user-facing) | This webhook event has already been processed (idempotency check). Returns 200 to prevent retries. | Payment provider retried a webhook | No action needed; already processed |

---

## 10. Rate Limiting Errors (RATE)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| RATE_LIMIT_EXCEEDED | 429 | Too many requests. Please try again in {{retry_after}} seconds. | The request rate limit has been exceeded for this endpoint. The Retry-After header and X-RateLimit-Reset header indicate when the limit resets. | Exceeding per-minute request limit, rapid polling, batch operations too fast | Reduce request frequency, implement exponential backoff, check rate limit headers |
| RATE_LIMIT_LOGIN | 429 | Too many login attempts. Please try again later. | Login rate limit exceeded for this IP or email address. | Brute force attempt, rapid login retries | Wait for the cooldown period, use password reset if needed |
| RATE_LIMIT_REGISTRATION | 429 | Too many registration attempts. Please try again later. | Registration rate limit exceeded for this IP address (10 per hour). | Automated registration attempts, multiple users on same network | Wait and try again |
| RATE_LIMIT_PASSWORD_RESET | 429 | Too many password reset requests. Please try again later. | Password reset request rate limit exceeded (3 per hour per email). | Rapid reset requests | Wait for the cooldown period |
| RATE_LIMIT_CONTACT | 429 | You have sent too many messages. Please try again later. | Contact form rate limit exceeded (3 per hour per IP). | Rapid form submissions | Wait and try again later |
| RATE_LIMIT_EXPORT | 429 | Export limit reached. Please try again later. | Export rate limit exceeded (5 per hour per user). | Too many export requests | Wait and try again later |
| RATE_LIMIT_TICKET | 429 | You have created too many tickets. Please try again later. | Support ticket creation rate limit exceeded (5 per hour, 10 per day). | Rapid ticket creation | Wait and try again, or add to an existing ticket |

Rate limit response headers (included with all API responses):

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests allowed in the current window |
| X-RateLimit-Remaining | Number of requests remaining in the current window |
| X-RateLimit-Reset | Unix timestamp when the current window resets |
| Retry-After | Seconds until the rate limit resets (only included on 429 responses) |

---

## 11. Account Errors (ACCOUNT)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| ACCOUNT_NOT_FOUND | 404 | Account not found. | No account exists with the provided ID. Admin-only context; regular users see AUTHZ_RESOURCE_NOT_FOUND. | Admin searching for deleted account | Verify the account ID |
| ACCOUNT_ALREADY_VERIFIED | 409 | This email address has already been verified. | The verification token was used on an account that is already verified. | Clicking verification link twice | No action needed; log in normally |
| ACCOUNT_EMAIL_IN_USE | 409 | An account with this email address already exists. | Registration or email change attempted with an email that is already associated with another account. | Trying to register with existing email, changing to taken email | Use a different email address, or log in to the existing account |
| ACCOUNT_DELETION_ACTIVE_SUBSCRIPTION | 422 | Please cancel your subscription before deleting your account. | Account deletion requires that any active paid subscription be cancelled first. | Attempting to delete account with active Pro/Enterprise subscription | Cancel subscription, then delete account |
| ACCOUNT_DELETION_CONFIRMATION_FAILED | 400 | Account deletion confirmation failed. Please type DELETE and enter your password. | The confirmation text did not match "DELETE" or the password was incorrect. | Typo in confirmation text, wrong password | Type DELETE exactly and enter the correct password |

---

## 12. Support Errors (SUPPORT)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| SUPPORT_TICKET_NOT_FOUND | 404 | Ticket not found. | No ticket exists with the provided ID, or the ticket belongs to a different account (for non-admin users). | Wrong ticket ID, accessing another user's ticket | Verify the ticket ID |
| SUPPORT_TICKET_CLOSED | 409 | This ticket has been closed and cannot be updated. | Attempted to reply to or reopen a ticket that is in "closed" status. | Ticket auto-closed after inactivity | Create a new ticket for further assistance |
| SUPPORT_ATTACHMENT_TOO_LARGE | 413 | Attachment is too large. Maximum size is 5MB. | The uploaded file exceeds the 5MB attachment size limit. | Uploading oversized screenshot or log file | Reduce file size or crop the image |
| SUPPORT_ATTACHMENT_INVALID_TYPE | 422 | This file type is not supported. Allowed types: JPG, PNG, GIF, PDF, TXT, LOG, CSV. | The uploaded file extension is not in the allowed list. | Uploading executable, archive, or other disallowed file type | Convert to an allowed format |

---

## 13. Admin Errors (ADMIN)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| ADMIN_SELF_ACTION_BLOCKED | 403 | You cannot perform this action on your own account. | Admin attempted a protected self-action: suspend self, demote self, delete self via admin panel, force-disable own MFA via admin panel, or force-logout self via admin panel. | Admin trying to modify their own account via admin panel | Use the regular Settings pages for self-modifications |
| ADMIN_USER_ALREADY_SUSPENDED | 409 | This user is already suspended. | Attempted to suspend a user who is already in suspended status. | Duplicate suspension action | No action needed; user is already suspended |
| ADMIN_USER_NOT_SUSPENDED | 409 | This user is not currently suspended. | Attempted to unsuspend a user who is not in suspended status. | Trying to unsuspend an active user | No action needed; user is already active |
| ADMIN_CREDIT_ADJUSTMENT_INVALID | 422 | Credit adjustment would result in a negative balance. | A credit deduction adjustment would reduce the balance below zero. | Attempting to deduct more credits than the user has | Adjust the deduction amount |
| ADMIN_CONFIG_INVALID_VALUE | 422 | Invalid configuration value for {{config_key}}. | The provided configuration value fails validation for the specified key. Details include the validation rule that failed. | Value out of allowed range, wrong type | Check the allowed range and type for the configuration key |
| ADMIN_CONFIG_CONFLICT | 409 | This configuration was modified by another admin. Please refresh and try again. | Optimistic locking conflict -- the configuration value was updated by another admin since this admin loaded the page. | Two admins editing the same config simultaneously | Refresh the page to see the latest value, then reapply changes |
| ADMIN_REPORT_GENERATION_LIMIT | 429 | Maximum concurrent report generations reached. Please wait for existing reports to complete. | Only 2 financial reports can be generated concurrently. | Two reports already generating | Wait for an existing report to complete |
| ADMIN_REPORT_DATE_RANGE | 422 | Report date range cannot exceed 12 months. | The requested report date range exceeds the maximum of 12 months. | Requesting more than 1 year of data in a single report | Narrow the date range to 12 months or less |

---

## 14. System Errors (SYS)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| SYS_INTERNAL_ERROR | 500 | An unexpected error occurred. Please try again later. If the problem persists, contact support. | An unhandled server error occurred. The actual error is logged server-side with the request ID but never exposed to the client. | Bug in application code, unhandled edge case, dependency failure | Retry the request; if persistent, contact support with the request ID |
| SYS_SERVICE_UNAVAILABLE | 503 | Scrapifie is temporarily unavailable. Please try again in a few minutes. | The service is in maintenance mode or is unable to process requests due to overload or dependency failure. | Scheduled maintenance, database down, Redis down, deployment in progress | Wait and retry; check the status page for incident information |
| SYS_DATABASE_ERROR | 500 | An unexpected error occurred. Please try again later. | A database query failed. This is a catch-all for database errors that are not handled by more specific error codes. Actual error is logged server-side. | Connection pool exhaustion, query timeout, constraint violation (unexpected) | Retry the request; if persistent, contact support |
| SYS_QUEUE_ERROR | 500 | Job could not be submitted. Please try again. | The job could not be added to the BullMQ processing queue. | Redis down, queue full, serialization error | Retry the request; check status page |
| SYS_MAINTENANCE | 503 | Scrapifie is undergoing scheduled maintenance. We will be back shortly. | The platform is in a scheduled maintenance window. The Retry-After header indicates when maintenance is expected to end. | Active maintenance window | Wait until maintenance ends (check status page for updates) |

---

## 15. File and Upload Errors (FILE)

| Error Code | HTTP Status | User-Facing Message | Developer Message | Common Causes | Resolution |
|------------|-------------|---------------------|-------------------|---------------|------------|
| FILE_TOO_LARGE | 413 | File is too large. Maximum size is {{max_size}}. | The uploaded file exceeds the maximum allowed size. Avatar: 2MB, attachment: 5MB. | Uploading oversized file | Reduce file size or compress |
| FILE_INVALID_TYPE | 422 | This file type is not supported. | The uploaded file's MIME type or extension is not in the allowed list for this upload field. | Wrong file format for the context | Convert to an allowed format (avatars: JPG, PNG; attachments: JPG, PNG, GIF, PDF, TXT, LOG, CSV) |
| FILE_DIMENSIONS_TOO_SMALL | 422 | Image must be at least {{min_width}}x{{min_height}} pixels. | The uploaded image dimensions are below the minimum required (avatar: 100x100). | Very small or thumbnail-sized image | Upload a larger image |
| FILE_UPLOAD_FAILED | 500 | File upload failed. Please try again. | The file could not be stored (storage service error). Actual error logged server-side. | Storage service unavailable, disk full, permission error | Retry the upload |

---

## 16. Error Code Quick Reference

Complete alphabetical listing of all error codes:

| Error Code | HTTP | Category |
|------------|------|----------|
| ACCOUNT_ALREADY_VERIFIED | 409 | Account |
| ACCOUNT_DELETION_ACTIVE_SUBSCRIPTION | 422 | Account |
| ACCOUNT_DELETION_CONFIRMATION_FAILED | 400 | Account |
| ACCOUNT_EMAIL_IN_USE | 409 | Account |
| ACCOUNT_NOT_FOUND | 404 | Account |
| ADMIN_CONFIG_CONFLICT | 409 | Admin |
| ADMIN_CONFIG_INVALID_VALUE | 422 | Admin |
| ADMIN_CREDIT_ADJUSTMENT_INVALID | 422 | Admin |
| ADMIN_REPORT_DATE_RANGE | 422 | Admin |
| ADMIN_REPORT_GENERATION_LIMIT | 429 | Admin |
| ADMIN_SELF_ACTION_BLOCKED | 403 | Admin |
| ADMIN_USER_ALREADY_SUSPENDED | 409 | Admin |
| ADMIN_USER_NOT_SUSPENDED | 409 | Admin |
| AUTH_ACCOUNT_LOCKED | 403 | Authentication |
| AUTH_CSRF_INVALID | 403 | Authentication |
| AUTH_EMAIL_NOT_VERIFIED | 403 | Authentication |
| AUTH_INVALID_CREDENTIALS | 401 | Authentication |
| AUTH_MFA_BACKUP_EXHAUSTED | 401 | Authentication |
| AUTH_MFA_INVALID | 401 | Authentication |
| AUTH_MFA_REQUIRED | 401 | Authentication |
| AUTH_OAUTH_EMAIL_CONFLICT | 409 | Authentication |
| AUTH_OAUTH_STATE_INVALID | 400 | Authentication |
| AUTH_REGISTRATION_DISABLED | 403 | Authentication |
| AUTH_SESSION_EXPIRED | 401 | Authentication |
| AUTH_SESSION_INVALID | 401 | Authentication |
| AUTH_TOKEN_EXPIRED | 400 | Authentication |
| AUTH_TOKEN_INVALID | 400 | Authentication |
| AUTHZ_ACCOUNT_RESTRICTED | 403 | Authorization |
| AUTHZ_ACCOUNT_SUSPENDED | 403 | Authorization |
| AUTHZ_FORBIDDEN | 403 | Authorization |
| AUTHZ_RESOURCE_NOT_FOUND | 404 | Authorization |
| BILLING_ALREADY_SUBSCRIBED | 409 | Billing |
| BILLING_CANCEL_ALREADY_PENDING | 409 | Billing |
| BILLING_DOWNGRADE_PENDING | 409 | Billing |
| BILLING_INVOICE_NOT_FOUND | 404 | Billing |
| BILLING_NO_PAYMENT_METHOD | 402 | Billing |
| BILLING_PACK_LIMIT_REACHED | 409 | Billing |
| BILLING_PACK_PLAN_REQUIRED | 403 | Billing |
| BILLING_PAYMENT_FAILED | 402 | Billing |
| BILLING_REFUND_INELIGIBLE | 422 | Billing |
| BILLING_WEBHOOK_DUPLICATE | 200 | Billing |
| BILLING_WEBHOOK_INVALID_SIGNATURE | 401 | Billing |
| CREDIT_ADJUSTMENT_FAILED | 500 | Credit |
| CREDIT_INSUFFICIENT | 402 | Credit |
| ENGINE_BLOCKED | -- | Engine |
| ENGINE_CAPTCHA | -- | Engine |
| ENGINE_CONNECTION_REFUSED | -- | Engine |
| ENGINE_CONTENT_TOO_LARGE | -- | Engine |
| ENGINE_DNS_FAILURE | -- | Engine |
| ENGINE_ENGINE_UNAVAILABLE | -- | Engine |
| ENGINE_HTTP_ERROR | -- | Engine |
| ENGINE_JAVASCRIPT_ERROR | -- | Engine |
| ENGINE_PROXY_FAILURE | -- | Engine |
| ENGINE_REDIRECT_LOOP | -- | Engine |
| ENGINE_SSL_ERROR | -- | Engine |
| ENGINE_SSRF_BLOCKED | -- | Engine |
| ENGINE_TIMEOUT | -- | Engine |
| ENGINE_UNSUPPORTED_PROTOCOL | -- | Engine |
| FILE_DIMENSIONS_TOO_SMALL | 422 | File |
| FILE_INVALID_TYPE | 422 | File |
| FILE_TOO_LARGE | 413 | File |
| FILE_UPLOAD_FAILED | 500 | File |
| JOB_ALREADY_CANCELLED | 409 | Job |
| JOB_EXPORT_LIMIT | 429 | Job |
| JOB_EXPORT_TOO_LARGE | 422 | Job |
| JOB_NOT_CANCELLABLE | 409 | Job |
| JOB_NOT_FOUND | 404 | Job |
| JOB_RESULT_EXPIRED | 410 | Job |
| JOB_RESULT_NOT_READY | 404 | Job |
| JOB_RETRY_FAILED | 409 | Job |
| RATE_LIMIT_CONTACT | 429 | Rate |
| RATE_LIMIT_EXCEEDED | 429 | Rate |
| RATE_LIMIT_EXPORT | 429 | Rate |
| RATE_LIMIT_LOGIN | 429 | Rate |
| RATE_LIMIT_PASSWORD_RESET | 429 | Rate |
| RATE_LIMIT_REGISTRATION | 429 | Rate |
| RATE_LIMIT_TICKET | 429 | Rate |
| SUPPORT_ATTACHMENT_INVALID_TYPE | 422 | Support |
| SUPPORT_ATTACHMENT_TOO_LARGE | 413 | Support |
| SUPPORT_TICKET_CLOSED | 409 | Support |
| SUPPORT_TICKET_NOT_FOUND | 404 | Support |
| SYS_DATABASE_ERROR | 500 | System |
| SYS_INTERNAL_ERROR | 500 | System |
| SYS_MAINTENANCE | 503 | System |
| SYS_QUEUE_ERROR | 500 | System |
| SYS_SERVICE_UNAVAILABLE | 503 | System |
| VAL_DUPLICATE_ENTRY | 409 | Validation |
| VAL_INVALID_EMAIL | 422 | Validation |
| VAL_INVALID_ENUM | 400 | Validation |
| VAL_INVALID_FORMAT | 400 | Validation |
| VAL_INVALID_IP | 422 | Validation |
| VAL_INVALID_RANGE | 422 | Validation |
| VAL_INVALID_URL | 422 | Validation |
| VAL_PASSWORD_TOO_WEAK | 422 | Validation |
| VAL_REQUEST_TOO_LARGE | 413 | Validation |
| VAL_REQUIRED_FIELD | 400 | Validation |
| VAL_TOO_LONG | 422 | Validation |
| VAL_TOO_SHORT | 422 | Validation |

**Total: 84 error codes**

---

## 17. Related Documents

| Document | Relevance |
|----------|-----------|
| 17-DOCS-PORTAL.md | API reference pages document error codes for developers |
| 07-JOBS-AND-LOGS.md | Job lifecycle and error handling specifications |
| 03-AUTHENTICATION.md | Authentication flow error handling |
| 19-SECURITY-FRAMEWORK.md | Security-related error handling principles |
| 09-BILLING-AND-CREDITS.md | Billing error scenarios |
| 06-API-KEY-MANAGEMENT.md | API key validation error handling |
| 12-ADMIN-DASHBOARD.md | Admin action error handling |
