# Scrapifie Jobs and Logs

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-007 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 05-USER-DASHBOARD.md, 06-API-KEY-MANAGEMENT.md, 08-USAGE-AND-ANALYTICS.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Jobs and Logs Overview](#1-jobs-and-logs-overview)
2. [Job Lifecycle](#2-job-lifecycle)
3. [Jobs List Page](#3-jobs-list-page)
4. [Job Detail Page](#4-job-detail-page)
5. [Job Logs](#5-job-logs)
6. [Job Result Viewing](#6-job-result-viewing)
7. [Job Retry and Cancellation](#7-job-retry-and-cancellation)
8. [Real-Time Job Updates](#8-real-time-job-updates)
9. [Job Filtering and Search](#9-job-filtering-and-search)
10. [Job Export](#10-job-export)
11. [Job Data Retention](#11-job-data-retention)
12. [Empty and Error States](#12-empty-and-error-states)
13. [Edge Cases](#13-edge-cases)
14. [Related Documents](#14-related-documents)

---

## 1. Jobs and Logs Overview

The Jobs and Logs section of the user dashboard is the primary interface for users to monitor, inspect, and manage their scraping jobs. Every API request that reaches the scraping engine creates a job record. Users can view the history of all their jobs, inspect individual job details including execution logs, view extracted results, retry failed jobs, and export job data for offline analysis.

### What a Job Represents

A job is a single scraping request submitted via the Scrapifie API. Each job has exactly one target URL, one engine type, and one set of configuration parameters. A single API call from the user creates exactly one job. Batch endpoints (future) would create multiple jobs, each tracked independently.

### Key Terminology

| Term | Definition |
|------|------------|
| Job | A single scraping request with a target URL, engine, configuration, and result |
| Job ID | A UUID (v4) that uniquely identifies a job, used in URLs and API responses |
| Log Entry | A timestamped record of an event that occurred during job execution |
| Result | The output data from a successfully completed job (HTML, JSON, screenshot, etc.) |
| Credit Cost | The number of credits deducted from the user's balance for this job |
| Engine | The scraping method used: HTTP, Browser, or Stealth |
| Attempt | A single execution try; a job may have multiple attempts if retried |

---

## 2. Job Lifecycle

Every job passes through a well-defined sequence of states. Understanding this lifecycle is essential for the dashboard display logic, filtering, and real-time updates.

### Job States

| State | Description | Terminal | Credit Charged |
|-------|-------------|----------|----------------|
| queued | Job accepted and waiting in the processing queue | No | No |
| processing | Job picked up by a worker, actively executing | No | No |
| completed | Job finished successfully, result data available | Yes | Yes |
| failed | Job exhausted all retry attempts and could not complete | Yes | Yes (partial) |
| cancelled | Job cancelled by the user before completion | Yes | No |
| expired | Job remained in queue beyond the maximum wait time | Yes | No |

### State Transition Diagram

```
                    +----------+
   API Request ---> |  queued  |
                    +----+-----+
                         |
              +----------+-----------+
              |                      |
         +----v-----+         +-----v----+
         |processing|         | expired  |
         +----+-----+         +----------+
              |
    +---------+---------+
    |                   |
+---v------+      +-----v----+
| completed|      |  failed  |
+----------+      +----------+

User action at any non-terminal state:
  queued -------> cancelled
  processing ---> cancelled
```

### State Transition Rules

| From | To | Trigger |
|------|----|---------|
| queued | processing | Worker picks up the job from BullMQ |
| queued | cancelled | User cancels via dashboard or API |
| queued | expired | Job exceeds maximum queue wait time (configurable, default 5 minutes) |
| processing | completed | Engine returns successful result |
| processing | failed | All retry attempts exhausted, last attempt returned error |
| processing | cancelled | User cancels while job is running (best-effort cancellation) |

### Credit Charging Rules

Credits are charged based on the engine type and job outcome:

| Engine | Base Cost | Charged On Success | Charged On Failure | Charged On Cancel | Charged On Expire |
|--------|-----------|--------------------|--------------------|-------------------|-------------------|
| HTTP | 1 credit | Yes (1 credit) | Yes (1 credit) | No | No |
| Browser | 5 credits | Yes (5 credits) | Yes (5 credits) | No | No |
| Stealth | 10 credits | Yes (10 credits) | Yes (10 credits) | No | No |

Failed jobs are charged because server resources (proxies, browser instances, compute time) were consumed during execution. Cancelled and expired jobs are not charged because either the user intervened before processing or the system failed to process in time.

### Retry Behavior

The scraping engine has built-in automatic retries. These are internal retries within a single job, not user-initiated retries:

| Parameter | Value |
|-----------|-------|
| Maximum automatic retries | 3 attempts total (1 initial + 2 retries) |
| Retry delay | Exponential backoff: 1s, 4s, 16s |
| Retry conditions | Network timeout, proxy failure, transient HTTP errors (429, 502, 503, 504) |
| Non-retryable conditions | 4xx client errors (except 429), invalid URL, blocked by target site |

User-initiated retries (via the dashboard) create a new job with a new job ID, linked to the original job via a parent reference.

---

## 3. Jobs List Page

**Route**: `/dashboard/jobs`

The jobs list page displays all jobs belonging to the authenticated user, ordered by creation time (newest first). This is the primary view for monitoring scraping activity.

### Page Layout

```
+------------------------------------------------------------------+
| Sidebar |  Jobs                                                   |
|         |                                                         |
|  [nav]  |  +--- Filters Bar -----------------------------------+ |
|         |  | [Status v] [Engine v] [API Key v] [Date Range]     | |
|         |  | [Search by URL or Job ID...          ] [Export v]  | |
|         |  +---------------------------------------------------+ |
|         |                                                         |
|         |  Showing 1-25 of 1,247 jobs                             |
|         |                                                         |
|         |  +--- Jobs Table ------------------------------------+ |
|         |  | Status | Job ID   | URL        | Engine | Credits | |
|         |  |        |          |            |        | | Time  | |
|         |  |--------+----------+------------+--------+---------| |
|         |  | [dot]  | abc-1234 | example... | HTTP   | 1      | |
|         |  |        |          |            |        | 0.3s   | |
|         |  |--------+----------+------------+--------+---------| |
|         |  | [dot]  | def-5678 | site.co... | Browser| 5      | |
|         |  |        |          |            |        | 2.1s   | |
|         |  |--------+----------+------------+--------+---------| |
|         |  | ...                                               | |
|         |  +---------------------------------------------------+ |
|         |                                                         |
|         |  [< Prev]  Page 1 of 50  [Next >]                      |
+------------------------------------------------------------------+
```

### Jobs Table Columns

| Column | Content | Width | Sortable | Notes |
|--------|---------|-------|----------|-------|
| Status | Colored dot indicator | 40px | Yes | Color per state (see below) |
| Job ID | Truncated UUID, clickable link | 120px | No | Links to job detail page. Shows first 8 characters followed by ellipsis. Full ID on hover tooltip |
| URL | Target URL, truncated | Flexible (fill) | No | Truncated with ellipsis after available space. Full URL on hover tooltip |
| Engine | HTTP, Browser, or Stealth | 90px | Yes | Text label |
| API Key | Key name (not the key itself) | 110px | Yes | The user-assigned name of the API key that submitted this job |
| Credits | Credit cost for this job | 70px | Yes | Integer value |
| Duration | Execution time | 80px | Yes | Formatted as seconds with one decimal (e.g., "0.3s", "2.1s", "14.7s"). Shows "--" for queued/cancelled/expired |
| Created | Timestamp | 140px | Yes (default: desc) | Relative time for recent (e.g., "2 min ago"), absolute date for older (e.g., "Feb 7, 2026 14:32") |

### Status Dot Colors

| State | Dot Color | Tooltip Text |
|-------|-----------|-------------|
| queued | Yellow | "Queued - waiting to process" |
| processing | Blue (pulsing animation) | "Processing - currently running" |
| completed | Green | "Completed successfully" |
| failed | Red | "Failed - see details" |
| cancelled | Gray | "Cancelled by user" |
| expired | Orange | "Expired - queue timeout" |

### Table Row Behavior

- Entire row is clickable, navigating to the job detail page at `/dashboard/jobs/{jobId}`
- Hover state: subtle background color change
- The row does NOT have action buttons; all actions are on the detail page
- Cursor changes to pointer on hover to indicate clickability

### Pagination

| Parameter | Value |
|-----------|-------|
| Default page size | 25 rows |
| Page size options | 25, 50, 100 |
| Pagination style | "Page X of Y" with Previous/Next buttons |
| URL sync | Page number and page size sync to URL query parameters (`?page=2&size=50`) |
| Keyboard | Left/Right arrow keys navigate pages when pagination is focused |

### Column Sorting

- Clicking a column header toggles sort: ascending, descending, then back to default (created descending)
- Active sort column shows an arrow indicator (up or down) next to the column header
- Sorting changes reset to page 1
- Sort parameters sync to URL query parameters (`?sort=duration&order=desc`)

---

## 4. Job Detail Page

**Route**: `/dashboard/jobs/{jobId}`

The job detail page shows comprehensive information about a single job, including its configuration, execution timeline, logs, and result data.

### Page Layout

```
+------------------------------------------------------------------+
| Sidebar |  < Back to Jobs                                         |
|         |                                                         |
|  [nav]  |  Job abc12345-6789-...                                  |
|         |  Status: [Completed]    Engine: Browser                  |
|         |                                                         |
|         |  +--- Overview Card ---------------------------------+ |
|         |  | Target URL    | https://example.com/page           | |
|         |  | Engine        | Browser                             | |
|         |  | API Key       | Production Key                      | |
|         |  | Credits       | 5                                   | |
|         |  | Duration      | 2.14s                               | |
|         |  | Created       | Feb 8, 2026 09:14:32 UTC            | |
|         |  | Completed     | Feb 8, 2026 09:14:34 UTC            | |
|         |  | Retries       | 0 of 2                              | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Request Configuration -------------------------+ |
|         |  | (Expandable section showing all request params)    | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Execution Log ---------------------------------+ |
|         |  | (Timestamped log entries)                          | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Result ----------------------------------------+ |
|         |  | (Response data viewer)                             | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Actions ---------------------------------------+ |
|         |  | [Retry Job]  [Cancel Job]                          | |
|         |  +--------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Back Navigation

- A "Back to Jobs" link at the top of the page returns the user to the jobs list
- The link preserves the previous list state (filters, pagination, sort) by using the browser's history stack (not a hard link to `/dashboard/jobs`)
- Breadcrumb: Dashboard > Jobs > {Job ID (first 8 chars)}

### Overview Card Fields

| Field | Value | Notes |
|-------|-------|-------|
| Target URL | Full URL, clickable (opens in new tab) | Displayed in monospace font. For very long URLs, wraps within the card |
| Engine | HTTP, Browser, or Stealth | Text label |
| API Key | The name assigned to the key | Links to the key detail page. If key has been revoked, shows "(revoked)" suffix |
| Credits | Integer credit cost | Shows "0" for cancelled/expired jobs |
| Duration | Total execution time in seconds | Shows wall-clock time from processing start to completion. "--" if never processed |
| Created | Full timestamp with timezone | Format: "Feb 8, 2026 09:14:32 UTC" |
| Started | Full timestamp with timezone | When the worker began processing. Blank if job was cancelled/expired before processing |
| Completed/Failed/Cancelled | Full timestamp with timezone | The timestamp of the terminal state, labeled accordingly |
| Retries | "X of Y" format | X = number of retries attempted, Y = max retries configured |
| Parent Job | Job ID link (if this is a user-initiated retry) | Links to the original job. Only shown if this job was created via the "Retry" action |
| Child Jobs | List of job ID links (if retries were created from this job) | Links to retry jobs. Only shown if the user retried this job |

### Request Configuration Section

This section is collapsible (collapsed by default for completed jobs, expanded for failed jobs). It shows all parameters that were sent with the API request.

| Field | Description | Display |
|-------|-------------|---------|
| URL | Target URL | Monospace text |
| Method | HTTP method used | GET, POST, etc. |
| Headers | Custom headers sent with the request | Key-value table, sensitive values masked |
| Body | Request body (for POST requests) | Formatted JSON or raw text, truncated at 5,000 characters with "Show more" toggle |
| Render JavaScript | Whether JS rendering was requested | Yes / No |
| Wait For Selector | CSS selector waited for (Browser/Stealth) | Monospace text or "None" |
| Wait Timeout | Maximum wait time for selector | Formatted as seconds |
| Screenshot | Whether screenshot was requested | Yes / No |
| Proxy Country | Requested proxy geolocation | Country name or "Auto" |
| Response Format | Requested output format | HTML, JSON, Markdown, Text |
| Custom Cookies | Cookies sent with request | Key-value table, values masked after first 4 characters |

### Actions Section

This section appears at the bottom of the page and contains action buttons relevant to the job's current state.

| Job State | Available Actions |
|-----------|-------------------|
| queued | Cancel Job |
| processing | Cancel Job |
| completed | Retry Job |
| failed | Retry Job |
| cancelled | Retry Job |
| expired | Retry Job |

Action button details are covered in Section 7.

---

## 5. Job Logs

The execution log section on the job detail page provides a chronological record of every significant event during job execution. Logs are essential for debugging failed jobs and understanding execution behavior.

### Log Display

```
+--- Execution Log ------------------------------------------------+
| [Filter: All v]                           [Auto-scroll: ON]      |
|                                                                   |
| 09:14:32.001  INFO   Job queued                                   |
| 09:14:32.142  INFO   Worker picked up job                         |
| 09:14:32.143  INFO   Engine: Browser                              |
| 09:14:32.200  INFO   Proxy assigned: US residential               |
| 09:14:32.201  INFO   Launching browser instance                   |
| 09:14:33.450  INFO   Page loaded, waiting for selector            |
| 09:14:33.890  INFO   Selector found: #content                     |
| 09:14:34.100  INFO   Extracting page content                      |
| 09:14:34.142  INFO   Job completed successfully                   |
| 09:14:34.143  INFO   Credits charged: 5                           |
|                                                                   |
| Showing 10 of 10 log entries                                      |
+-------------------------------------------------------------------+
```

### Log Entry Structure

Each log entry contains the following fields:

| Field | Description | Display |
|-------|-------------|---------|
| Timestamp | Time the event occurred | HH:MM:SS.mmm format (millisecond precision), relative to the user's timezone setting |
| Level | Severity level of the entry | Colored label (see below) |
| Message | Human-readable description of the event | Plain text |
| Metadata | Additional structured data (optional) | Expandable inline, shown as key-value pairs |

### Log Levels

| Level | Color | Usage |
|-------|-------|-------|
| INFO | Default text color | Normal operational events (job queued, started, completed) |
| WARN | Yellow/amber | Non-critical issues (slow response, retry triggered, proxy fallback) |
| ERROR | Red | Failures (request timeout, proxy error, target blocked) |
| DEBUG | Muted/gray | Detailed technical info (header values, response codes, timing breakdowns) |

### Log Level Filter

A dropdown filter at the top of the log section allows filtering by level:

| Option | Shows |
|--------|-------|
| All (default) | All log entries |
| Info + above | INFO, WARN, ERROR |
| Warnings + above | WARN, ERROR |
| Errors only | ERROR |

Filtering is client-side since all log entries are loaded with the job detail.

### Log Events by Job Phase

**Queue Phase:**

| Event | Level | Message Template |
|-------|-------|-----------------|
| Job created | INFO | "Job queued" |
| Queue position | INFO | "Queue position: {position}" |
| Queue wait warning | WARN | "Job waiting in queue for {duration}" (shown at 30s, 60s, etc.) |

**Processing Phase:**

| Event | Level | Message Template |
|-------|-------|-----------------|
| Worker pickup | INFO | "Worker picked up job" |
| Engine selection | INFO | "Engine: {engine_type}" |
| Proxy assignment | INFO | "Proxy assigned: {country} {type}" |
| Browser launch | INFO | "Launching browser instance" (Browser/Stealth only) |
| Fingerprint applied | DEBUG | "Fingerprint profile applied" (Stealth only) |
| Navigation start | DEBUG | "Navigating to target URL" |
| Page loaded | INFO | "Page loaded" or "Page loaded, waiting for selector" |
| Selector found | INFO | "Selector found: {selector}" |
| Selector timeout | WARN | "Selector not found within {timeout}s" |
| Screenshot captured | INFO | "Screenshot captured ({width}x{height})" |
| Content extracted | INFO | "Extracting page content" |

**Completion Phase:**

| Event | Level | Message Template |
|-------|-------|-----------------|
| Success | INFO | "Job completed successfully" |
| Credits charged | INFO | "Credits charged: {amount}" |
| Result size | DEBUG | "Response size: {size_bytes} bytes" |

**Failure Phase:**

| Event | Level | Message Template |
|-------|-------|-----------------|
| Request error | ERROR | "Request failed: {error_type} - {message}" |
| Retry triggered | WARN | "Retry {attempt} of {max}: {reason}" |
| Proxy rotation | WARN | "Proxy failed, rotating to next proxy" |
| All retries exhausted | ERROR | "All retry attempts exhausted" |
| Final failure | ERROR | "Job failed: {error_summary}" |
| Credits charged on fail | INFO | "Credits charged: {amount} (failed job)" |

**Cancellation Phase:**

| Event | Level | Message Template |
|-------|-------|-----------------|
| Cancel requested | INFO | "Cancellation requested by user" |
| Cancel confirmed | INFO | "Job cancelled successfully" |
| Cancel during processing | WARN | "Job cancelled during processing, resources released" |

### Auto-Scroll Behavior

- When viewing a job that is currently processing (state is "queued" or "processing"), the log section auto-scrolls to show the latest entries as they arrive
- An "Auto-scroll" toggle is shown at the top right of the log section, defaulting to ON for active jobs
- If the user manually scrolls up to view earlier entries, auto-scroll automatically turns OFF
- The toggle allows the user to re-enable auto-scroll
- For completed/failed/cancelled/expired jobs, auto-scroll is not shown (all entries are already present)

### Log Entry Count

- The bottom of the log section shows "Showing X of Y log entries" after any filter is applied
- Maximum log entries per job: 200 entries (enforced server-side)
- If a job generates more than 200 log entries, the oldest DEBUG-level entries are pruned first

---

## 6. Job Result Viewing

When a job completes successfully, the result section displays the scraped data. The display format adapts based on the type of content returned.

### Result Section Layout

```
+--- Result --------------------------------------------------------+
| Format: HTML       Size: 42.3 KB       [Copy] [Download]          |
|                                                                    |
| +--- Content Viewer -------------------------------------------+  |
| | <!DOCTYPE html>                                              |  |
| | <html>                                                       |  |
| |   <head>                                                     |  |
| |     <title>Example Page</title>                              |  |
| |   </head>                                                    |  |
| |   <body>                                                     |  |
| |     ...                                                      |  |
| | </html>                                                      |  |
| +--------------------------------------------------------------+  |
|                                                                    |
| [Show full response]  (if truncated)                               |
+--------------------------------------------------------------------+
```

### Content Display by Format

| Format | Display Method | Syntax Highlighting | Max Preview Size |
|--------|---------------|---------------------|-----------------|
| HTML | Scrollable code block with line numbers | Yes (HTML syntax) | 100 KB preview, full via download |
| JSON | Formatted/indented JSON in code block | Yes (JSON syntax) | 100 KB preview, full via download |
| Text | Plain text in code block | No | 100 KB preview, full via download |
| Markdown | Rendered markdown with raw toggle | Yes (when viewing raw) | 100 KB preview, full via download |
| Screenshot | Inline image display | N/A | Full image displayed, max 5 MB |

### Content Viewer Features

| Feature | Behavior |
|---------|----------|
| Line numbers | Shown for HTML, JSON, and text formats. Numbered starting at 1 |
| Word wrap | Toggle between wrapped and horizontal-scroll modes. Default: wrapped |
| Copy button | Copies the entire result content to clipboard. Shows "Copied" confirmation for 2 seconds |
| Download button | Downloads the result as a file. Filename format: `scrapifie-{jobId-first-8-chars}-{format}.{ext}` |
| Search within result | Ctrl+F / Cmd+F activates browser's native find-in-page, which works within the scrollable viewer |
| Truncation | Results larger than 100 KB are truncated in the preview. A "Show full response" button loads the complete content. Results larger than 5 MB can only be downloaded, not previewed |
| Empty result | If the job completed but returned empty content, show message: "Job completed but returned no content. The target page may be empty or require different configuration." |

### Screenshot Display

For jobs that requested a screenshot:

| Property | Behavior |
|----------|----------|
| Display | Rendered inline as an image, scaled to fit the content area width |
| Zoom | Clicking the image opens it in a lightbox overlay at full resolution |
| Download | Download button saves the screenshot as PNG |
| Dimensions | Shown below the image: "{width} x {height} pixels" |
| File size | Shown in the header: e.g., "Size: 1.2 MB" |

### Result Availability

| State | Result Available | Display |
|-------|-----------------|---------|
| queued | No | "Result will appear here when the job completes" |
| processing | No | "Job is processing..." with a subtle loading animation |
| completed | Yes | Full result viewer as described above |
| failed | Partial (error info) | Error details panel (see below) |
| cancelled | No | "Job was cancelled before producing a result" |
| expired | No | "Job expired before processing could begin" |

### Failed Job Error Display

For failed jobs, instead of the result viewer, an error details panel is shown:

```
+--- Error Details -------------------------------------------------+
| Error Type: PROXY_CONNECTION_FAILED                                |
| Message: All proxy attempts exhausted for target URL               |
|                                                                    |
| Attempts: 3 of 3                                                   |
| Last Error: Connection refused by proxy server                     |
|                                                                    |
| Suggestions:                                                       |
|   - Try a different proxy region                                   |
|   - Use a higher-tier engine (Browser or Stealth)                  |
|   - Check if the target URL is accessible                          |
|   - Contact support if the issue persists                          |
+--------------------------------------------------------------------+
```

Error suggestion mapping:

| Error Type | Suggestions |
|------------|-------------|
| PROXY_CONNECTION_FAILED | Try different proxy region, use higher-tier engine, check target URL accessibility |
| TARGET_BLOCKED | Use Stealth engine, try different proxy region, reduce request frequency |
| TIMEOUT | Increase timeout parameter, use Browser/Stealth engine, check target site performance |
| INVALID_URL | Verify URL format, ensure URL is publicly accessible |
| SELECTOR_NOT_FOUND | Verify CSS selector, check if page content loads dynamically, increase wait timeout |
| CAPTCHA_DETECTED | Use Stealth engine, reduce request frequency to target |
| CONTENT_TOO_LARGE | Request a specific format (text/markdown) instead of full HTML |
| RATE_LIMITED | Wait and retry, reduce request frequency |
| INTERNAL_ERROR | Retry the job, contact support if issue persists |

---

## 7. Job Retry and Cancellation

### Retry Job

The "Retry Job" button is available on the job detail page for jobs in terminal states (completed, failed, cancelled, expired).

**Retry Flow:**

1. User clicks "Retry Job" on a job detail page
2. Confirmation modal appears:
   - Title: "Retry This Job?"
   - Body: "This will create a new job with the same configuration. {credit_cost} credits will be charged upon completion."
   - Current credit balance displayed: "Your balance: {balance} credits"
   - Buttons: "Retry" (primary), "Cancel" (secondary)
3. If user has insufficient credits for the job:
   - The "Retry" button is disabled
   - Additional message: "Insufficient credits. You need {cost} credits but have {balance}."
   - Link: "Add credits" (navigates to billing page)
4. User clicks "Retry"
5. Server creates a new job with:
   - New UUID
   - Same URL, engine, and all configuration parameters as the original job
   - A parent_job_id field linking to the original job
   - The original job gets a child_job_ids entry linking to the new job
6. Toast notification: "Job retry submitted. Redirecting to new job..."
7. User is redirected to the new job's detail page
8. The original job's detail page now shows a "Retried as" link in the overview card pointing to the new job

**Retry Restrictions:**

| Condition | Behavior |
|-----------|----------|
| Insufficient credits | Retry button visible but confirmation modal shows insufficient credits warning, Retry button disabled |
| Account suspended | Retry button hidden entirely |
| API key revoked | Retry button visible. Modal shows warning: "The API key used for this job has been revoked. The retry will use your default active key." If no active keys exist, Retry button disabled with message "No active API keys. Create a new key to retry." |
| Test key job | Retry uses a test key (no credits charged). If no active test keys exist, same behavior as revoked key |

### Cancel Job

The "Cancel Job" button is available for jobs in non-terminal states (queued, processing).

**Cancel Flow:**

1. User clicks "Cancel Job" on a job detail page
2. Confirmation modal appears:
   - Title: "Cancel This Job?"
   - Body: "This will cancel the job. No credits will be charged for cancelled jobs."
   - For processing jobs, additional note: "The job is currently processing. Cancellation will be attempted but the job may complete before cancellation takes effect."
   - Buttons: "Cancel Job" (destructive/red), "Keep Running" (secondary)
3. User clicks "Cancel Job"
4. Server sends cancellation signal:
   - For queued jobs: immediate removal from queue, state set to "cancelled"
   - For processing jobs: cancellation flag set, worker checks flag at next checkpoint and aborts if set
5. Toast notification: "Job cancellation requested"
6. Job detail page updates to show cancelled state
7. If the job completed before the cancellation signal was processed:
   - Toast notification: "Job completed before cancellation could take effect. Credits have been charged."
   - Job shows as "completed" (not "cancelled")
   - This is a race condition documented as expected behavior

**Cancel Restrictions:**

| Condition | Behavior |
|-----------|----------|
| Job already in terminal state | Cancel button not shown |
| Job in "queued" state | Instant cancellation, guaranteed |
| Job in "processing" state | Best-effort cancellation, may complete before cancel is processed |

---

## 8. Real-Time Job Updates

Jobs that are not in a terminal state require real-time updates on the dashboard so users can monitor progress without manual page refreshes.

### Polling Strategy

Real-time updates use polling (not WebSockets) to balance simplicity and resource usage.

| Context | Poll Interval | Data Fetched |
|---------|--------------|--------------|
| Jobs list page (has active jobs) | 10 seconds | Updated job statuses for all non-terminal jobs on the current page |
| Jobs list page (no active jobs) | No polling | Static display |
| Job detail page (active job) | 5 seconds | Full job detail including new log entries |
| Job detail page (terminal job) | No polling | Static display |

### Polling Behavior Rules

| Rule | Detail |
|------|--------|
| Tab visibility | Polling pauses when the browser tab is not visible (Page Visibility API). Resumes with an immediate fetch when tab becomes visible again |
| Error handling | If a poll request fails, the next poll uses exponential backoff (10s, 20s, 40s, max 60s). Resets to normal interval on success |
| Stale data indicator | If 3 consecutive poll requests fail, a banner appears: "Unable to refresh job data. Showing last known state." with a manual "Refresh" button |
| State transition | When a polled job transitions to a terminal state, polling stops for that job. On the list page, if all visible jobs are terminal, polling stops entirely |
| New log entries | On the detail page, new log entries from polling are appended to the existing log display (not full re-render). New entries briefly flash with a highlight animation |

### Optimistic UI Updates

For user-initiated actions (cancel, retry), the UI updates optimistically before server confirmation:

| Action | Optimistic Update | On Server Success | On Server Failure |
|--------|-------------------|-------------------|-------------------|
| Cancel | Status dot changes to gray, Cancel button hidden | No additional change needed | Revert status dot, show Cancel button, toast: "Cancellation failed. Please try again." |
| Retry | Toast: "Creating retry job..." | Redirect to new job page | Toast: "Retry failed: {reason}" |

---

## 9. Job Filtering and Search

The jobs list page provides comprehensive filtering and search capabilities to help users find specific jobs.

### Filter Bar Layout

```
+--- Filters Bar ---------------------------------------------------+
| [Status: All v] [Engine: All v] [API Key: All v] [Date Range   ]  |
| [Search by URL or Job ID...                      ] [Export v]      |
+--------------------------------------------------------------------+
```

### Filter: Status

| Option | Description |
|--------|-------------|
| All (default) | Show all jobs regardless of status |
| Queued | Only queued jobs |
| Processing | Only processing jobs |
| Completed | Only completed jobs |
| Failed | Only failed jobs |
| Cancelled | Only cancelled jobs |
| Expired | Only expired jobs |
| Active | Queued + Processing (convenience filter) |

Displayed as a dropdown select. Single selection only.

### Filter: Engine

| Option | Description |
|--------|-------------|
| All (default) | Show jobs from all engines |
| HTTP | Only HTTP engine jobs |
| Browser | Only Browser engine jobs |
| Stealth | Only Stealth engine jobs |

Displayed as a dropdown select. Single selection only.

### Filter: API Key

| Option | Description |
|--------|-------------|
| All (default) | Show jobs from all API keys |
| {Key Name} | Only jobs submitted with this specific key |
| (Revoked keys) | Revoked keys appear at the bottom of the dropdown with "(revoked)" suffix. They are still filterable since historical jobs reference them |

Displayed as a dropdown select. Single selection only. Options are dynamically populated from the user's API keys (both active and revoked).

### Filter: Date Range

| Component | Description |
|-----------|-------------|
| Preset options | Today, Last 7 days, Last 30 days, Last 90 days, Custom range |
| Custom range | Two date pickers (From and To) with calendar popover. "From" defaults to 30 days ago, "To" defaults to today |
| Time precision | Date-level precision (midnight to midnight in user's timezone) |
| Maximum range | 90 days. Jobs older than 90 days can still be viewed individually by direct URL but do not appear in filtered list views |

### Search

| Property | Behavior |
|----------|----------|
| Search input | Single text input, placeholder: "Search by URL or Job ID..." |
| Search behavior | Searches both the target URL (partial match, case-insensitive) and the job ID (prefix match) |
| Debounce | 300ms debounce on keystroke before sending search request |
| Minimum characters | 3 characters minimum to trigger search |
| Clear | "X" button inside the search input to clear the search term |
| Combined with filters | Search works in combination with all other filters (AND logic) |

### Filter Interaction Rules

- All filters use AND logic: selecting Status "Failed" and Engine "Browser" shows only failed Browser jobs
- Changing any filter resets pagination to page 1
- All active filters are reflected in the URL query parameters for shareability and browser history
- A "Clear all filters" link appears when any filter is active, resetting all to defaults
- Filter counts: each dropdown option shows the count of matching jobs in parentheses (e.g., "Failed (23)")

### URL Query Parameter Mapping

| Filter | Parameter | Example |
|--------|-----------|---------|
| Status | `status` | `?status=failed` |
| Engine | `engine` | `?engine=browser` |
| API Key | `key` | `?key={key_uuid}` |
| Date from | `from` | `?from=2026-02-01` |
| Date to | `to` | `?to=2026-02-08` |
| Search | `q` | `?q=example.com` |
| Page | `page` | `?page=3` |
| Page size | `size` | `?size=50` |
| Sort column | `sort` | `?sort=duration` |
| Sort order | `order` | `?order=desc` |

---

## 10. Job Export

Users can export their job history for offline analysis, reporting, or integration with other tools.

### Export Button

The Export button is a dropdown in the filter bar with the following options:

| Option | Description |
|--------|-------------|
| Export as CSV | Downloads a CSV file of the current filtered job list |
| Export as JSON | Downloads a JSON file of the current filtered job list |

### Export Behavior

| Property | Value |
|----------|-------|
| Scope | Exports all jobs matching the current filters, not just the current page |
| Maximum rows | 10,000 jobs per export. If more jobs match the filters, a warning is shown: "Your filters match {count} jobs. Only the most recent 10,000 will be exported." |
| Fields exported | Job ID (full UUID), Status, Target URL, Engine, API Key Name, Credits, Duration (seconds), Created At (ISO 8601), Completed At (ISO 8601), Error Type (if failed) |
| Filename | `scrapifie-jobs-{date}.{ext}` where date is YYYY-MM-DD format |
| Generation | Server-side. A loading indicator shows "Generating export..." while the server compiles the file |
| Rate limit | Maximum 5 exports per hour per user to prevent abuse |

### CSV Format

- Header row included
- Fields quoted where they contain commas
- UTF-8 encoding with BOM for Excel compatibility
- Newlines in field values escaped

### JSON Format

- Array of job objects
- Each object contains the same fields as CSV
- Formatted with 2-space indentation for readability
- UTF-8 encoding

---

## 11. Job Data Retention

Job data has defined retention periods to manage storage costs while maintaining useful history for users.

### Retention Periods

| Data Type | Retention Period | After Expiry |
|-----------|-----------------|--------------|
| Job metadata (status, URL, engine, timestamps, credits) | Indefinite | Never deleted (soft delete only) |
| Job logs | 90 days | Log entries are purged, job detail page shows: "Logs are no longer available for jobs older than 90 days" |
| Job results (HTML, JSON, text, markdown) | 30 days | Result data is purged, job detail page shows: "Result data is no longer available for jobs older than 30 days. Download results promptly after job completion." |
| Screenshots | 14 days | Screenshot is purged, job detail page shows: "Screenshots are retained for 14 days. This screenshot is no longer available." |

### Retention Notices

- On the job detail page, if a retention deadline is approaching, a notice is shown:
  - Results: "Result data will be deleted in {X} days. Download now to preserve it." (shown when fewer than 7 days remain)
  - Screenshots: "Screenshot will be deleted in {X} days. Download now to preserve it." (shown when fewer than 3 days remain)
  - Logs: No advance notice (logs are supporting data, not primary deliverables)

### Storage Management

- A background process runs daily to identify and purge expired data
- Purging is soft-delete: data is marked as purged and actual deletion happens in a separate batch process
- Users cannot extend retention periods (this may be a future Enterprise feature)
- Admin users can view purge statistics in the admin dashboard (see 12-ADMIN-DASHBOARD.md)

---

## 12. Empty and Error States

### Empty States

| Scenario | Message | CTA |
|----------|---------|-----|
| No jobs ever created | "No scraping jobs yet. Submit your first API request to see jobs appear here." | "View API Documentation" button linking to docs portal |
| No jobs match filters | "No jobs match your current filters." | "Clear all filters" link |
| No jobs in date range | "No jobs found in the selected date range." | "Clear date filter" link |
| Search returns no results | "No jobs found matching '{search_term}'." | "Clear search" link |

### Error States

| Scenario | Message | Recovery |
|----------|---------|----------|
| Jobs list fails to load | "Unable to load jobs. Please try again." | "Retry" button that re-fetches the list |
| Job detail fails to load | "Unable to load job details. The job may not exist or you may not have access." | "Back to Jobs" link |
| Job detail - job not found | "Job not found. It may have been deleted or the ID is incorrect." | "Back to Jobs" link |
| Job detail - access denied | "You do not have permission to view this job." (shown when a user tries to access another user's job) | "Back to Jobs" link |
| Export fails | "Export failed. Please try again or reduce your date range." | Toast notification with retry suggestion |
| Poll request fails | Stale data banner (see Section 8) | Manual "Refresh" button |

---

## 13. Edge Cases

| Scenario | Handling |
|----------|----------|
| User views a job created by a now-revoked API key | Job is fully viewable. API key name shows "(revoked)" suffix. Retry uses a different active key |
| User retries a job but their plan has changed | New job uses the current plan's credit pricing, not the original job's pricing |
| User retries a job while at the API key limit | Retry works because it reuses an existing key (or uses the first active key). Key limit only applies to creating new keys |
| Job completes between page loads | Next poll or manual refresh updates the display. No data loss |
| User navigates away during job processing | Job continues server-side. User can return later to see the result |
| Two browser tabs open on the same job detail | Both tabs poll independently. No conflicts since both are read-only views |
| Job has very long URL (2000+ characters) | URL is truncated in the list view with tooltip. Full URL is displayed with wrapping on the detail page |
| Job result is binary (non-text) | Result viewer shows "Binary content cannot be previewed. Use the download button." with download option |
| User's timezone changes mid-session | Timestamps update on next page load. In-session updates use the timezone set at page load |
| Job created via test key | Clearly labeled with "Test" badge. Credit cost shows "0" since test jobs do not consume credits |
| Concurrent cancel and complete | Server resolves the race: if the job completed before cancellation was processed, it stays completed and credits are charged. Cancel response returns the actual final state |
| Job logs contain sensitive URL parameters | The scraping engine does not sanitize URLs. Users are responsible for not including sensitive data in scraping requests. A note in the API documentation warns about this |
| User deletes their account while jobs are processing | Account deletion is queued (not instant). Active jobs complete first, then account is soft-deleted. See 11-SETTINGS-AND-SUPPORT.md |
| Export requested for 0 jobs | Export button is disabled when the filtered list shows 0 results |
| Job has no log entries | Log section shows: "No log entries available for this job." This should not normally happen but handles gracefully if it does |
| Job result exceeds 5 MB | Preview is disabled. Only download is available. Message: "Result too large to preview ({size}). Use the download button." |

---

## 14. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform architecture and routing |
| 05-USER-DASHBOARD.md | Dashboard layout, sidebar, overview page with recent jobs table |
| 06-API-KEY-MANAGEMENT.md | API key references in job data, key-based filtering |
| 08-USAGE-AND-ANALYTICS.md | Aggregated job statistics, credit consumption tracking |
| 09-BILLING-AND-CREDITS.md | Credit charging mechanics, insufficient credits handling |
| 12-ADMIN-DASHBOARD.md | Admin view of all platform jobs, system-wide job statistics |
| 18-DATA-MODELS.md | Job entity schema, log entry schema, result storage schema |
| 19-SECURITY-FRAMEWORK.md | Job access control, data isolation between users |
