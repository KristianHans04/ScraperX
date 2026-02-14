# Scrapifie Admin Operations

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-016 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 12-ADMIN-DASHBOARD.md, 14-ADMIN-MODERATION.md, 15-ADMIN-FINANCE.md, 19-SECURITY-FRAMEWORK.md |

---

## Table of Contents

1. [Admin Operations Overview](#1-admin-operations-overview)
2. [System Health Dashboard](#2-system-health-dashboard)
3. [Job Queue Monitoring](#3-job-queue-monitoring)
4. [Engine Performance](#4-engine-performance)
5. [Proxy Management](#5-proxy-management)
6. [Rate Limiting and Throttling](#6-rate-limiting-and-throttling)
7. [System Configuration](#7-system-configuration)
8. [Scheduled Maintenance](#8-scheduled-maintenance)
9. [Platform Metrics and Analytics](#9-platform-metrics-and-analytics)
10. [Operational Alerts](#10-operational-alerts)
11. [Admin Activity and Security](#11-admin-activity-and-security)
12. [Edge Cases](#12-edge-cases)
13. [Related Documents](#13-related-documents)

---

## 1. Admin Operations Overview

The Admin Operations section provides tools for monitoring and managing the technical infrastructure of the Scrapifie platform. While Admin Finance (15-ADMIN-FINANCE.md) covers revenue and billing, and Admin Moderation (14-ADMIN-MODERATION.md) covers user-facing support and content, Admin Operations covers the machinery: job queues, engines, proxies, system health, and platform configuration.

### Operations Navigation

| Nav Item | Route | Description |
|----------|-------|-------------|
| System Health | /admin/ops/health | Real-time infrastructure status |
| Job Queues | /admin/ops/queues | BullMQ queue monitoring and management |
| Engines | /admin/ops/engines | Per-engine performance metrics |
| Proxies | /admin/ops/proxies | Proxy provider status and rotation |
| Rate Limits | /admin/ops/rate-limits | Global and per-user rate limit configuration |
| Config | /admin/ops/config | Platform configuration overrides |
| Maintenance | /admin/ops/maintenance | Scheduled maintenance management |
| Metrics | /admin/ops/metrics | Platform-wide usage analytics |

### Permission Requirements

All operations pages require the Admin role. Operations pages are read-heavy with a small number of write actions (configuration changes, queue management). All write actions are audit-logged.

---

## 2. System Health Dashboard

Route: /admin/ops/health

A real-time overview of all platform infrastructure components.

### Service Status Grid

Each infrastructure component is displayed as a card with a status indicator.

| Service | Health Check | Status Values |
|---------|-------------|---------------|
| API Server | HTTP health endpoint response time | Healthy / Degraded / Down |
| PostgreSQL | Connection pool status + query latency | Healthy / Degraded / Down |
| Redis | PING response time + memory usage | Healthy / Degraded / Down |
| BullMQ Workers | Worker process count + heartbeat | Healthy / Degraded / Down |
| HTTP Engine | Test request success rate (last 5 min) | Healthy / Degraded / Down |
| Browser Engine | Playwright instance availability | Healthy / Degraded / Down |
| Stealth Engine (Camoufox) | Camoufox service health endpoint | Healthy / Degraded / Down |
| Proxy Pool | Available proxy count + rotation success rate | Healthy / Degraded / Down |

### Status Definitions

| Status | Criteria | Visual |
|--------|----------|--------|
| Healthy | All checks passing, latency within normal range | Green dot |
| Degraded | Partial failures or elevated latency (>2x baseline) | Yellow dot |
| Down | Service unreachable or all checks failing | Red dot |

### Status Card Content

Each card shows:

```
+----------------------------------+
|  [dot] Service Name              |
|  Status: Healthy                 |
|  Latency: 12ms (avg last 5min)  |
|  Uptime: 99.97% (30d)           |
|  Last check: 30 seconds ago     |
+----------------------------------+
```

### System Resources

Below the service grid, a system resources section displays:

| Resource | Metric | Warning Threshold |
|----------|--------|-------------------|
| CPU Usage | Percentage across all server processes | >80% |
| Memory Usage | Used / Total RAM | >85% |
| Disk Usage | Used / Total disk for data partitions | >90% |
| Database Connections | Active / Max pool connections | >80% of pool |
| Redis Memory | Used / Max configured memory | >80% |
| Open File Descriptors | Current / System limit | >70% |

Resources exceeding warning thresholds are highlighted with a yellow background. Resources exceeding critical thresholds (warning + 10%) are highlighted red.

### Uptime History

A 90-day uptime bar for each service, similar to the public status page (01-PUBLIC-WEBSITE.md) but with more granularity:

```
API Server    [||||||||||||||||||||||||||||||||||||||||||||||||] 99.97%
PostgreSQL    [||||||||||||||||||||||||||||||||||||||||||||||||] 99.99%
Redis         [||||||||||||||||||||||||||||||||||||||||||||||||] 100.0%
BullMQ        [|||||||||||||||||||||||||||| |||||||||||||||||||] 99.85%
```

Each bar is composed of 90 segments (one per day). Green = 100% uptime for that day. Yellow = degraded. Red = downtime occurred. Hovering a segment shows the date and incident details if any.

### Health Check Refresh

Health data refreshes every 30 seconds via polling. A "Last refreshed" timestamp is shown. Manual refresh is available via a refresh button, rate-limited to once per 10 seconds.

---

## 3. Job Queue Monitoring

Route: /admin/ops/queues

Provides visibility into the BullMQ job processing pipeline.

### Queue Overview Cards

Three cards (not four) summarizing queue state:

| Card | Content |
|------|---------|
| Queued Jobs | Total jobs currently waiting in queue. Breakdown by engine: HTTP / Browser / Stealth |
| Processing Jobs | Total jobs currently being processed by workers. Breakdown by engine |
| Completed Today | Total jobs that completed (success + failure) today. Success rate percentage |

### Queue Depth Chart

| Property | Value |
|----------|-------|
| Chart type | Stacked area chart |
| Data series | Three areas: Queued (waiting), Active (processing), Delayed (scheduled for retry) |
| X-axis | Time (last 24 hours, 1-hour intervals) |
| Y-axis | Job count |
| Refresh | Every 30 seconds |

### Active Workers Table

| Column | Content |
|--------|---------|
| Worker ID | Unique worker identifier |
| Engine | HTTP / Browser / Stealth |
| Status | Idle / Processing |
| Current Job | Job ID being processed (if any), linked to job detail |
| Uptime | How long this worker has been running |
| Jobs Completed | Total jobs processed by this worker since startup |
| Last Activity | Timestamp of last completed or accepted job |

### Queue Management Actions

| Action | Description | Confirmation |
|--------|-------------|-------------|
| Pause Queue | Stop accepting new jobs into a specific engine queue. Jobs currently processing continue to completion | Yes -- "Pausing the [engine] queue will prevent new jobs from starting. Currently processing jobs will complete." |
| Resume Queue | Resume a paused queue | Yes |
| Drain Queue | Remove all waiting jobs from a specific queue. Does NOT affect processing jobs | Yes -- "This will remove [N] waiting jobs from the [engine] queue. These jobs will be marked as cancelled. This action cannot be undone." |
| Retry Failed | Re-queue all failed jobs from the last N hours (admin specifies) | Yes -- with hour count and estimated job count |

### Stale Job Detection

The system monitors for stale jobs -- jobs that have been in "processing" state for longer than expected.

| Engine | Expected Max Duration | Stale Threshold |
|--------|----------------------|-----------------|
| HTTP | 30 seconds | 2 minutes |
| Browser | 60 seconds | 5 minutes |
| Stealth | 90 seconds | 8 minutes |

Stale jobs appear in a "Stale Jobs" alert section at the top of the queue page.

**Admin actions for stale jobs:**

| Action | Description |
|--------|-------------|
| Force Fail | Mark the job as failed with reason "Timed out (admin intervention)" |
| Force Retry | Cancel the current processing attempt and re-queue the job |
| Investigate | Link to the job detail page for inspection |

### Dead Letter Queue

Jobs that have exhausted all retry attempts are placed in a dead letter queue (DLQ).

| Column | Content |
|--------|---------|
| Job ID | Linked to job detail |
| Engine | HTTP / Browser / Stealth |
| URL | Target URL (truncated) |
| Error | Last error message |
| Attempts | Number of attempts made |
| Failed At | Timestamp of final failure |
| User | User who submitted the job |

**DLQ Actions:**

| Action | Description |
|--------|-------------|
| Retry | Re-queue with fresh attempt count |
| Dismiss | Remove from DLQ (job remains in failed state) |
| Bulk Retry | Select multiple and retry all |
| Bulk Dismiss | Select multiple and dismiss all |

---

## 4. Engine Performance

Route: /admin/ops/engines

Detailed performance metrics for each scraping engine.

### Engine Summary Table

| Column | HTTP Engine | Browser Engine | Stealth Engine |
|--------|------------|----------------|----------------|
| Jobs Today | Count | Count | Count |
| Success Rate | Percentage | Percentage | Percentage |
| Avg Duration | Seconds | Seconds | Seconds |
| P95 Duration | Seconds | Seconds | Seconds |
| Active Workers | Count | Count | Count |
| Queue Depth | Count | Count | Count |
| Credits Consumed Today | Count | Count | Count |

### Per-Engine Detail View

Clicking an engine row navigates to a detail view with:

**Response Time Distribution Chart:**

| Property | Value |
|----------|-------|
| Chart type | Histogram |
| X-axis | Response time buckets (0-1s, 1-2s, 2-5s, 5-10s, 10-30s, 30s+) |
| Y-axis | Job count |
| Time range | Last 24 hours, 7 days, 30 days |

**Success/Failure Rate Over Time:**

| Property | Value |
|----------|-------|
| Chart type | Line chart |
| Data series | Success rate line with 95% reference line |
| X-axis | Time (hourly for 24h, daily for 7d/30d) |
| Y-axis | Percentage (0-100%) |
| Color | Green above 95%, yellow 90-95%, red below 90% |

**Top Failure Reasons Table:**

| Column | Content |
|--------|---------|
| Error Type | Timeout, Connection Refused, DNS Failure, Blocked, Rate Limited, etc. |
| Count | Number of occurrences in the selected time range |
| Percentage | Percentage of total failures |
| Trend | Up/down arrow comparing to previous equivalent period |
| Example Job | Link to a recent job with this error |

**Resource Usage (Engine-Specific):**

For Browser and Stealth engines:
- Browser instance count (active / max)
- Memory usage per instance (average, peak)
- Page load time distribution

For HTTP engine:
- Connection pool utilization
- DNS resolution time
- TLS handshake time

---

## 5. Proxy Management

Route: /admin/ops/proxies

Admin interface for monitoring and managing the proxy rotation system.

### Proxy Provider Overview

The platform supports multiple proxy providers (see Opus4.5OC APPENDICES/A-PROXY-PROVIDERS.md). This page shows the status of each configured provider.

| Column | Content |
|--------|---------|
| Provider | Provider name |
| Status | Active / Degraded / Disabled |
| Proxy Count | Number of proxies available from this provider |
| Success Rate | Percentage of requests that succeeded through this provider's proxies (last 24h) |
| Avg Latency | Average response time through this provider's proxies |
| Usage Today | Number of requests routed through this provider |
| Balance/Quota | Remaining balance or quota with the provider (if applicable) |

### Proxy Health Metrics

**Overall Proxy Pool Stats (three cards):**

| Card | Content |
|------|---------|
| Total Available Proxies | Count of healthy proxies across all providers |
| Proxy Success Rate | Overall success rate (last 24h) |
| Avg Proxy Latency | Overall average response time through proxies |

**Proxy Performance Chart:**

| Property | Value |
|----------|-------|
| Chart type | Line chart |
| Data series | One line per provider showing success rate over time |
| X-axis | Time (last 24h hourly, 7d daily) |
| Y-axis | Success rate percentage |
| Legend | Provider names, clickable to toggle |

### Proxy Rotation Configuration

Admins can view and adjust the proxy rotation strategy.

| Setting | Description | Default |
|---------|-------------|---------|
| Rotation Strategy | Round-robin, Weighted (by success rate), Random | Weighted |
| Sticky Sessions | Whether to reuse the same proxy for sequential requests to the same domain | Enabled, 5-minute window |
| Cooldown Period | Minimum time before reusing a proxy for the same target domain | 30 seconds |
| Max Failures Before Cooldown | Number of consecutive failures before a proxy is put in cooldown | 3 |
| Cooldown Duration | How long a failed proxy is excluded from rotation | 10 minutes |
| Provider Priority | Ordered list of providers (used when Weighted strategy is active) | Configurable |

**Changing rotation configuration:**

1. Admin modifies a setting
2. Changes are staged (not immediately applied)
3. Admin reviews the staged changes summary
4. Admin clicks "Apply Changes"
5. Confirmation modal: "Apply proxy rotation changes? These will take effect immediately for all new requests."
6. Changes are applied and audit-logged
7. Success toast: "Proxy configuration updated"

### Blocked Proxy Detection

Proxies that are consistently blocked by target sites are automatically detected and flagged.

| Column | Content |
|--------|---------|
| Proxy ID | Identifier |
| Provider | Source provider |
| Blocked By | Domain(s) that blocked this proxy |
| Block Rate | Percentage of requests blocked |
| Last Used | Timestamp |
| Status | Cooldown / Blocked / Retired |

Admins can manually retire a proxy (permanently exclude from rotation) or force it back into the pool.

---

## 6. Rate Limiting and Throttling

Route: /admin/ops/rate-limits

View and manage the rate limiting configuration applied to API requests.

### Global Rate Limits

These limits apply to all users unless overridden.

| Limit | Free Plan | Pro Plan | Enterprise Plan |
|-------|-----------|----------|-----------------|
| Requests per minute | 10 | 60 | 300 |
| Requests per hour | 100 | 1,000 | 10,000 |
| Concurrent jobs | 2 | 10 | 50 |
| Max URL length | 2,048 chars | 2,048 chars | 2,048 chars |
| Max request body size | 1 MB | 5 MB | 10 MB |

### Per-User Rate Limit Overrides

Admins can set custom rate limits for specific users (typically Enterprise customers with negotiated terms).

**Override Form:**

| Field | Type | Validation |
|-------|------|------------|
| User | Search selector | Must be existing user |
| Limit Type | Dropdown | Requests per minute, Requests per hour, Concurrent jobs |
| Value | Numeric input | Must be positive integer, cannot exceed 10x the Enterprise default |
| Reason | Text area | 1-500 characters |
| Expiry | Date picker or "No expiry" | If set, override automatically removes on this date |

**Active Overrides Table:**

| Column | Content |
|--------|---------|
| User | Name + email |
| Limit Type | Which limit is overridden |
| Default Value | What the limit would normally be for their plan |
| Override Value | The custom limit |
| Set By | Admin who created the override |
| Created | Date override was set |
| Expires | Expiry date or "Never" |

Admins can edit or remove overrides from this table.

### Rate Limit Monitoring

**Rate Limit Hit Chart:**

| Property | Value |
|----------|-------|
| Chart type | Bar chart |
| X-axis | Time (hourly buckets for last 24h) |
| Y-axis | Count of rate-limited requests |
| Data series | Stacked by plan (Free / Pro / Enterprise) |

**Top Rate-Limited Users Table:**

| Column | Content |
|--------|---------|
| User | Name + email |
| Plan | Current plan |
| Hits (24h) | Number of rate limit hits in the last 24 hours |
| Hits (7d) | Number of rate limit hits in the last 7 days |
| Current Rate | Requests per minute (recent average) |
| Limit | Their applicable limit |
| Override | Whether a custom override exists |

This table helps identify users who consistently hit rate limits and may need a plan upgrade or custom override.

---

## 7. System Configuration

Route: /admin/ops/config

A centralized page for viewing and adjusting platform-wide configuration values that are stored in the database rather than environment variables. Environment variables are static and require deployment changes (see APPENDICES/D-ENVIRONMENT-VARIABLES.md). Database-stored configuration can be changed at runtime.

### Configurable Settings

| Category | Setting | Type | Default | Description |
|----------|---------|------|---------|-------------|
| Jobs | Default job timeout (HTTP) | Seconds | 30 | Maximum time for an HTTP engine job |
| Jobs | Default job timeout (Browser) | Seconds | 60 | Maximum time for a Browser engine job |
| Jobs | Default job timeout (Stealth) | Seconds | 90 | Maximum time for a Stealth engine job |
| Jobs | Max retry attempts | Integer | 3 | Maximum automatic retry attempts before moving to DLQ |
| Jobs | Retry backoff base | Seconds | 5 | Base delay for exponential retry backoff |
| Jobs | Result retention (days) | Integer | 30 | Days to keep job results before cleanup |
| Jobs | Log retention (days) | Integer | 90 | Days to keep job execution logs |
| Jobs | Screenshot retention (days) | Integer | 14 | Days to keep job screenshots |
| Credits | HTTP job cost | Integer | 1 | Credits charged per HTTP engine job |
| Credits | Browser job cost | Integer | 5 | Credits charged per Browser engine job |
| Credits | Stealth job cost | Integer | 10 | Credits charged per Stealth engine job |
| Auth | Session idle timeout | Minutes | 30 | Idle session expiration time |
| Auth | Session absolute timeout | Hours | 24 | Maximum session duration regardless of activity |
| Auth | Max login attempts before lockout | Integer | 5 | Failed login attempts before temporary lockout |
| Auth | Lockout duration | Minutes | 15 | Duration of temporary account lockout |
| Auth | Email verification expiry | Hours | 24 | How long email verification tokens remain valid |
| Auth | Password reset expiry | Hours | 1 | How long password reset tokens remain valid |
| Support | Max tickets per hour | Integer | 5 | Rate limit for ticket creation per user |
| Support | Max tickets per day | Integer | 10 | Daily ticket creation limit per user |
| Support | Auto-close resolved tickets | Days | 7 | Days after which resolved tickets auto-close |
| Support | Auto-close waiting tickets | Days | 14 | Days after which "waiting on user" tickets auto-close |
| Cleanup | Unverified account cleanup | Days | 7 | Days after which unverified accounts are deleted |
| Cleanup | Soft-deleted data purge | Days | 90 | Days after which soft-deleted records are permanently purged |

### Configuration Change Flow

1. Admin navigates to the config page
2. Settings are organized by category (collapsible sections)
3. Each setting shows: current value, default value, description, last modified date and by whom
4. Admin modifies a value
5. Modified values are highlighted (yellow background)
6. Admin clicks "Save Changes" at the bottom of the section
7. Confirmation modal: "Update [N] configuration settings? Changes take effect immediately."
8. Settings are saved to the database
9. A configuration change event is broadcast to all server instances (via Redis pub/sub) so they pick up the new values without restart
10. All changes are audit-logged with: setting name, old value, new value, admin, timestamp

### Configuration Safeguards

| Safeguard | Description |
|-----------|-------------|
| Value validation | Each setting has minimum and maximum bounds. Values outside bounds are rejected with an error message |
| Impact warnings | Settings that affect billing (credit costs) or security (session timeouts, lockout rules) display an additional warning: "This setting affects [billing/security]. Review carefully." |
| Rollback | Each setting maintains a history. Admins can click "View History" to see previous values and revert to any prior value |
| No bulk import | Settings cannot be imported from a file. All changes must be made through the UI to ensure audit trail |

---

## 8. Scheduled Maintenance

Route: /admin/ops/maintenance

Admins schedule and manage maintenance windows. This integrates with the public status page (01-PUBLIC-WEBSITE.md) and the admin status page content management (14-ADMIN-MODERATION.md).

### Upcoming Maintenance Table

| Column | Content |
|--------|---------|
| Title | Short description of maintenance |
| Scheduled Start | Date and time (displayed in admin's timezone with UTC in tooltip) |
| Expected Duration | Estimated duration |
| Impact | Full Outage / Partial Degradation / No User Impact |
| Services Affected | Which services will be affected |
| Status | Scheduled / In Progress / Completed / Cancelled |
| Created By | Admin who scheduled |

### Creating a Maintenance Window

**Form Fields:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Title | Text input | 5-200 characters | Yes |
| Description | Text area (Markdown) | 10-2000 characters | Yes |
| Scheduled Start | Date/time picker | Must be in the future, at least 24 hours from now for user notification | Yes |
| Expected Duration | Duration picker (hours and minutes) | 15 minutes to 24 hours | Yes |
| Impact Level | Dropdown: Full Outage, Partial Degradation, No User Impact | Must select | Yes |
| Services Affected | Multi-select checkboxes | At least one service | Yes |
| Notify Users | Checkbox | Default: checked | No |
| Notification Timing | Dropdown | 24h before, 48h before, 72h before, 1 week before | If Notify Users checked |

**Creation Flow:**

1. Admin fills in the form
2. Preview panel shows how the maintenance notice will appear on the public status page
3. Admin submits
4. Maintenance window is created
5. If "Notify Users" is checked: a banner is scheduled to appear on the user dashboard at the specified notification timing, and an entry is added to the public status page under "Scheduled Maintenance"
6. If the maintenance is within 24 hours, the status page banner appears immediately

### Maintenance Execution

When a maintenance window begins:

1. Admin clicks "Start Maintenance" (or it auto-starts at the scheduled time)
2. Status page is automatically updated to show the maintenance in progress
3. If impact level is "Full Outage", the API returns 503 responses with a Retry-After header and a JSON body explaining the maintenance
4. Dashboard shows a persistent banner: "Scheduled maintenance is in progress. Some features may be unavailable."
5. Admin can post live updates during maintenance (text updates that appear on the status page)
6. When complete, admin clicks "Complete Maintenance"
7. Status page is updated, API resumes normal operation
8. Post-maintenance summary is generated (actual duration, any incidents)

### Maintenance History

A table of past maintenance windows with: title, scheduled time, actual duration, impact, admin, and a link to the status page incident record.

---

## 9. Platform Metrics and Analytics

Route: /admin/ops/metrics

Aggregate platform-wide usage metrics for operational planning and capacity management.

### Platform Growth Metrics

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Users | Cumulative user registrations over time | Line chart |
| Active Users (DAU/MAU) | Daily and monthly active users (users who made at least 1 API request) | Line chart with two series |
| New Registrations | Daily new user registrations | Bar chart |
| User Retention | Percentage of users active in month N who are still active in month N+1 | Line chart |

### Job Volume Metrics

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Jobs | Daily job volume | Bar chart, stacked by engine |
| Jobs by Engine | Breakdown of jobs per engine over time | Stacked area chart |
| Peak Concurrent Jobs | Maximum concurrent jobs per hour over the last 7 days | Line chart |
| Job Duration Distribution | Histogram of job durations across all engines | Histogram |

### Infrastructure Capacity

| Metric | Current | Capacity | Utilization |
|--------|---------|----------|-------------|
| API Requests/min | Live value | Configured max | Percentage bar |
| Active Job Workers | Live count | Max worker pool | Percentage bar |
| Database Connections | Live count | Pool max | Percentage bar |
| Redis Memory | Live usage | Configured max | Percentage bar |
| Queue Depth | Live count | Warning threshold | Percentage bar |

When any metric exceeds 70% utilization, it is highlighted yellow. Above 85%, highlighted red with a note: "Consider scaling this resource."

### Capacity Planning Projections

Based on growth trends, the system projects when capacity thresholds will be reached:

| Resource | Current Usage | Growth Rate (30d) | Projected 70% Date | Projected 100% Date |
|----------|--------------|--------------------|--------------------|---------------------|
| Database storage | X GB | +Y GB/month | Date | Date |
| Redis memory | X MB | +Y MB/month | Date | Date |
| Daily job volume | X jobs | +Y% per month | Date (when hits worker capacity) | Date |

These projections use simple linear extrapolation and are intended as rough guidance, not precise predictions.

---

## 10. Operational Alerts

Admins receive alerts for operational issues. These are distinct from revenue alerts (15-ADMIN-FINANCE.md) and moderation alerts (14-ADMIN-MODERATION.md).

### Alert Types

| Alert | Trigger | Severity | Delivery |
|-------|---------|----------|----------|
| Service Down | Any service status changes to Down | Critical | In-app + email to all admins |
| Service Degraded | Any service status changes to Degraded for >5 minutes | Warning | In-app |
| Queue Backlog | Queue depth exceeds 1,000 jobs for any engine | Warning | In-app + email |
| Queue Stalled | No jobs processed from a queue in the last 10 minutes while jobs are waiting | Critical | In-app + email |
| Worker Crash | A worker process exits unexpectedly | Critical | In-app + email |
| High Error Rate | Job failure rate exceeds 20% over a 15-minute window | Warning | In-app + email |
| Database Connection Pool Exhaustion | Active connections exceed 90% of pool max | Critical | In-app + email |
| Redis Memory Critical | Redis memory usage exceeds 90% of configured max | Critical | In-app + email |
| Disk Space Low | Any data partition exceeds 90% usage | Critical | In-app + email |
| Proxy Pool Degraded | Overall proxy success rate drops below 80% | Warning | In-app |
| Stale Jobs Detected | More than 5 stale jobs (exceeding engine timeout thresholds) | Warning | In-app |
| SSL Certificate Expiry | Any SSL certificate expires within 14 days | Warning | In-app + email |

### Alert Configuration

Admins can configure alert delivery preferences:

| Setting | Options |
|---------|---------|
| Email delivery | Immediate, Batched (every 15 minutes), Disabled (for Warning-level only; Critical always sends) |
| Alert suppression | After an alert fires, suppress duplicate alerts for the same trigger for N minutes (default: 30) |
| Escalation | If a Critical alert is not acknowledged within 30 minutes, re-send email |

### Alert History

A chronological log of all fired alerts with: timestamp, alert type, severity, trigger details, acknowledged by (if applicable), resolved at (if applicable). Filters by severity, type, and date range.

---

## 11. Admin Activity and Security

### Admin Session Monitoring

The operations section includes a view of all active admin sessions.

| Column | Content |
|--------|---------|
| Admin | Name + email |
| Session Start | When the session began |
| Last Activity | Most recent action timestamp |
| IP Address | Session IP |
| Browser/OS | User agent parsed |
| Current Page | Last known page the admin is viewing |

This helps detect:
- Concurrent admin sessions from unusual locations
- Idle admin sessions that should be terminated
- Potential unauthorized admin access

### Admin Action Rate Monitoring

A summary of admin actions over the last 24 hours, grouped by admin:

| Column | Content |
|--------|---------|
| Admin | Name |
| Actions (24h) | Total admin actions performed |
| Top Action | Most frequent action type |
| Sensitive Actions | Count of actions in sensitive categories (user suspend, credit adjust, config change) |
| Last Action | Most recent action with timestamp |

If any admin performs an unusually high number of actions (>3x their 30-day average), an alert is generated for other admins.

---

## 12. Edge Cases

| Scenario | Handling |
|----------|----------|
| All workers for an engine are down | Queue pauses automatically for that engine. Alert fires. Jobs remain queued but are not processed. Admin must investigate and restart workers |
| Admin pauses a queue while jobs are in "processing" state | Processing jobs continue to completion. No new jobs are picked up. The queue shows "Paused" status with a count of still-processing jobs |
| Configuration change affects currently processing jobs | Config changes apply to NEW jobs only. Jobs already in processing use the configuration values that were active when they started |
| Two admins change the same config setting simultaneously | Last-write-wins with audit trail. Both changes are logged. The setting reflects the most recent write |
| Maintenance window overlaps with another scheduled maintenance | System warns during creation but allows it. Both maintenance windows appear on the status page. Admin should consolidate manually |
| Admin schedules maintenance less than 24 hours in advance | Warning: "User notification may not reach all users in time. Consider scheduling further in advance." Allows submission with acknowledgment |
| Proxy provider's API is unreachable | Provider status set to "Degraded" or "Disabled" automatically. Requests are routed to other providers. Alert fires |
| All proxy providers are down | Proxy pool status set to "Down". Jobs requiring proxies fail with a "No proxies available" error. Direct (non-proxy) requests may still work for the HTTP engine if the job did not require a proxy |
| Rate limit override set for a user who then downgrades to Free plan | Override remains active. The custom limit applies regardless of plan. This is intentional -- overrides are explicit admin decisions. Admin should review and remove if the override was plan-dependent |
| System health check itself fails (monitoring service down) | Last known status is displayed with a "Stale" indicator and a timestamp showing when the last successful check occurred. Admin is alerted to the monitoring failure |
| Queue depth chart shows a sudden spike to zero | This may indicate a mass cancellation or a queue drain. The system logs whether this was an admin action (drain) or a system event, and the chart tooltip shows the cause if available |
| Admin attempts to change credit cost while jobs are in the queue | Warning: "Changing credit costs will affect jobs that have not yet been charged. Jobs currently queued will be charged at the new rate when they complete." Allows with acknowledgment |

---

## 13. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform architecture and technology stack |
| 01-PUBLIC-WEBSITE.md | Public status page that reflects maintenance and system health |
| 04-ROLES-AND-PERMISSIONS.md | Admin role permissions |
| 07-JOBS-AND-LOGS.md | Job lifecycle and states that the queue monitoring tracks |
| 12-ADMIN-DASHBOARD.md | Admin layout, navigation, audit log |
| 14-ADMIN-MODERATION.md | Status page content management, which integrates with maintenance scheduling |
| 15-ADMIN-FINANCE.md | Revenue alerts that are separate from operational alerts |
| 18-DATA-MODELS.md | Data entities for jobs, queues, configuration |
| 19-SECURITY-FRAMEWORK.md | Security monitoring and admin access controls |
| APPENDICES/D-ENVIRONMENT-VARIABLES.md | Static environment variables (vs runtime configuration managed here) |
