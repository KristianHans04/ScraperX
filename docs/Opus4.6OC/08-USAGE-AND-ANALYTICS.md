# ScraperX Usage and Analytics

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-008 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 05-USER-DASHBOARD.md, 07-JOBS-AND-LOGS.md, 09-BILLING-AND-CREDITS.md, 12-ADMIN-DASHBOARD.md |

---

## Table of Contents

1. [Usage and Analytics Overview](#1-usage-and-analytics-overview)
2. [Usage Page Layout](#2-usage-page-layout)
3. [Credit Usage Section](#3-credit-usage-section)
4. [Request Volume Section](#4-request-volume-section)
5. [Engine Breakdown Section](#5-engine-breakdown-section)
6. [Success and Failure Rates](#6-success-and-failure-rates)
7. [Response Time Metrics](#7-response-time-metrics)
8. [Top Domains Section](#8-top-domains-section)
9. [API Key Usage Section](#9-api-key-usage-section)
10. [Time Range Controls](#10-time-range-controls)
11. [Data Refresh and Caching](#11-data-refresh-and-caching)
12. [Usage Export](#12-usage-export)
13. [Usage Alerts](#13-usage-alerts)
14. [Empty and Error States](#14-empty-and-error-states)
15. [Edge Cases](#15-edge-cases)
16. [Related Documents](#16-related-documents)

---

## 1. Usage and Analytics Overview

The Usage and Analytics page gives users visibility into how they are consuming the ScraperX platform. It aggregates job data into meaningful metrics, charts, and breakdowns so users can understand their spending patterns, optimize their scraping strategies, and anticipate credit needs.

This page is read-only. Users cannot modify any data here. All data is derived from the job records described in 07-JOBS-AND-LOGS.md and the credit transactions described in 09-BILLING-AND-CREDITS.md.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| Glanceable | Key metrics are visible immediately without scrolling (above the fold on desktop) |
| Time-aware | All metrics respect the selected time range and update when the range changes |
| Actionable | Each metric section includes context that helps users make decisions (e.g., "You're on pace to use 80% of your credits by cycle end") |
| Consistent | All charts use the same color palette, axis formatting, and interaction patterns |
| Performant | Analytics data is pre-aggregated server-side, not computed from raw job records on each page load |

---

## 2. Usage Page Layout

**Route**: `/dashboard/usage`

```
+------------------------------------------------------------------+
| Sidebar |  Usage and Analytics                                     |
|         |                                                         |
|  [nav]  |  [Time Range: Last 30 days v] [Billing Cycle v]         |
|         |                                                         |
|         |  +--- Credit Summary Card ---------------------------+ |
|         |  | Credits Used | Credits Remaining | Days Left       | |
|         |  | 12,450       | 37,550            | 18              | |
|         |  | of 50,000    | 75.1% remaining   | until reset     | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Credit Usage Chart ---+  +--- Requests Chart --+ |
|         |  | [line chart over time]   |  | [bar chart by day]  | |
|         |  +--------------------------+  +---------------------+ |
|         |                                                         |
|         |  +--- Engine Breakdown ----+  +--- Success Rate -----+ |
|         |  | [donut chart]           |  | [line chart]         | |
|         |  +--------------------------+  +---------------------+ |
|         |                                                         |
|         |  +--- Response Times --------------------------------+ |
|         |  | [histogram or percentile chart]                    | |
|         |  +--------------------------------------------------+ |
|         |                                                         |
|         |  +--- Top Domains ---+  +--- API Key Usage ----------+ |
|         |  | [horizontal bar]  |  | [table]                    | |
|         |  +-------------------+  +----------------------------+ |
|         |                                                         |
|         |  [Export Usage Report v]                                 |
+------------------------------------------------------------------+
```

### Layout Rules

| Rule | Detail |
|------|--------|
| Grid | 2-column grid on desktop (1440px+), single column on tablet/mobile |
| Card sizing | Each chart card has equal height within its row. Minimum height: 300px |
| Spacing | 24px gap between cards, 32px vertical gap between rows |
| Responsiveness | Charts resize to fill available width. Below 768px, all cards stack vertically in a single column |

---

## 3. Credit Usage Section

### Credit Summary Card

This card appears at the top of the page and provides an at-a-glance view of the user's credit status for the current billing cycle.

**Fields:**

| Field | Content | Calculation |
|-------|---------|-------------|
| Credits Used | Total credits consumed in the current billing cycle | Sum of all job credit charges since the last billing cycle reset |
| Credits Remaining | Credits available to use | Plan allocation + purchased credit packs - credits used |
| Percentage Used | Visual and numeric indicator | (Credits Used / Total Credits) * 100, shown as a progress bar |
| Days Left | Days until the billing cycle resets | Billing cycle end date minus today |
| Projected Usage | Estimated total usage by cycle end | (Credits Used / Days Elapsed) * Total Days in Cycle |

**Progress Bar Behavior:**

| Usage Percentage | Bar Color | Additional Indicator |
|-----------------|-----------|---------------------|
| 0-59% | Default (primary color) | None |
| 60-79% | Yellow/amber | None |
| 80-89% | Orange | Warning text: "Approaching credit limit" |
| 90-99% | Red | Warning text: "Credit limit nearly reached" |
| 100% | Red (full) | Warning text: "Credit limit reached. Jobs will fail until credits are replenished." |

**Projected Usage Indicator:**

Below the progress bar, a projected usage line shows where usage is trending:

- If projected usage is below 80% of allocation: "On pace to use {X}% of your credits this cycle"
- If projected usage is between 80-99%: "On pace to use {X}% of your credits. Consider upgrading or purchasing a credit pack."
- If projected usage exceeds 100%: "On pace to exceed your credit limit in {Y} days." with a "Buy Credits" link

**Free Plan Special Handling:**

For Free plan users (1,000 credits), the summary card includes an additional prompt below the progress bar:
- "Upgrade to Pro for 50,000 monthly credits" with a "View Plans" link

### Credit Usage Over Time Chart

A line chart showing daily credit consumption over the selected time range.

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Line chart with area fill |
| X-axis | Date (one tick per day for ranges up to 30 days, one tick per week for longer ranges) |
| Y-axis | Credits consumed (integer scale, auto-ranging) |
| Line | Single line representing daily credit usage |
| Area fill | Semi-transparent fill below the line |
| Tooltip | Hovering on any point shows: "{Date}: {credits} credits used" |
| Interaction | Hover to see tooltip. Click on a data point opens the jobs list filtered to that date |
| Benchmark line | Horizontal dashed line showing the daily average needed to use all credits evenly (plan credits / days in cycle) |
| Zero days | Days with zero usage show as zero on the chart (not gaps) |

**Aggregation by Time Range:**

| Time Range | Data Granularity | X-Axis Ticks |
|------------|-----------------|--------------|
| Last 7 days | Daily | Every day |
| Last 30 days | Daily | Every 3rd day |
| Last 90 days | Weekly | Every week |
| Current billing cycle | Daily | Adaptive (every day if < 31 days, every 3rd day otherwise) |

---

## 4. Request Volume Section

A bar chart showing the number of API requests (jobs) over time, broken down by status.

### Request Volume Chart

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Stacked bar chart |
| X-axis | Date (same granularity as credit usage chart) |
| Y-axis | Number of requests (integer scale) |
| Stacking | Bars stacked by status: completed, failed, cancelled, expired |
| Colors | Completed: green, Failed: red, Cancelled: gray, Expired: orange |
| Tooltip | Hover shows breakdown: "{Date}: {total} requests ({completed} completed, {failed} failed, {cancelled} cancelled, {expired} expired)" |
| Legend | Below the chart, showing color mapping for each status. Clicking a legend item toggles its visibility |
| Interaction | Click on a bar segment opens the jobs list filtered to that date and status |

### Summary Statistics

Below the chart, three inline metrics:

| Metric | Calculation | Display |
|--------|-------------|---------|
| Total Requests | Count of all jobs in the selected time range | "{count} requests" |
| Daily Average | Total requests / number of days | "{avg} requests/day" |
| Peak Day | The day with the most requests | "{date}: {count} requests" |

---

## 5. Engine Breakdown Section

A donut chart showing the distribution of jobs across the three scraping engines.

### Engine Donut Chart

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Donut chart (ring chart) |
| Segments | One segment per engine type (HTTP, Browser, Stealth) |
| Center text | Total number of jobs in the selected time range |
| Colors | HTTP: one color, Browser: another, Stealth: a third (from the design system palette) |
| Tooltip | Hover on segment shows: "{Engine}: {count} jobs ({percentage}%)" |
| Legend | Below the chart with color, engine name, count, and percentage |

### Engine Statistics Table

Below the donut chart, a detailed breakdown table:

| Engine | Jobs | Credits Used | Avg Duration | Success Rate |
|--------|------|-------------|-------------|-------------|
| HTTP | {count} | {credits} | {avg_seconds}s | {rate}% |
| Browser | {count} | {credits} | {avg_seconds}s | {rate}% |
| Stealth | {count} | {credits} | {avg_seconds}s | {rate}% |

This table helps users understand which engines they rely on and their relative performance.

---

## 6. Success and Failure Rates

A line chart showing the success rate over time, with an accompanying breakdown of failure reasons.

### Success Rate Chart

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Line chart |
| X-axis | Date (same granularity as other charts) |
| Y-axis | Success rate as percentage (0-100%) |
| Line | Single line representing daily success rate |
| Reference line | Horizontal dashed line at 95% (target success rate) |
| Tooltip | Hover shows: "{Date}: {rate}% success rate ({completed} of {total} jobs)" |
| Color | Green when above 95%, yellow when 80-95%, red when below 80% |
| Zero-job days | Days with no jobs are shown as gaps in the line (not 0%) |

### Failure Breakdown Table

Below the success rate chart, a table showing the distribution of failure reasons:

| Error Type | Count | Percentage | Trend |
|------------|-------|-----------|-------|
| PROXY_CONNECTION_FAILED | {count} | {pct}% | {arrow up/down/flat} |
| TARGET_BLOCKED | {count} | {pct}% | {arrow up/down/flat} |
| TIMEOUT | {count} | {pct}% | {arrow up/down/flat} |
| CAPTCHA_DETECTED | {count} | {pct}% | {arrow up/down/flat} |
| SELECTOR_NOT_FOUND | {count} | {pct}% | {arrow up/down/flat} |
| OTHER | {count} | {pct}% | {arrow up/down/flat} |

**Trend Calculation:**

The trend arrow compares the error count in the current time period to the previous equivalent period:
- Up arrow: errors increased by more than 10%
- Down arrow: errors decreased by more than 10%
- Flat: errors changed by less than 10%

The trend column helps users identify whether specific failure types are getting worse or improving.

---

## 7. Response Time Metrics

A visualization of job execution times to help users understand performance characteristics.

### Response Time Chart

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Line chart with percentile bands |
| X-axis | Date (same granularity as other charts) |
| Y-axis | Response time in seconds |
| Lines | Three lines: P50 (median), P90, P99 |
| Band fill | Shaded area between P50 and P90 |
| Tooltip | Hover shows: "{Date}: P50={x}s, P90={y}s, P99={z}s" |
| Legend | Below chart: "Median (P50)", "90th percentile (P90)", "99th percentile (P99)" |

### Response Time Summary

Below the chart, a summary card:

| Metric | Value | Description |
|--------|-------|-------------|
| Median (P50) | {x}s | Half of your jobs complete faster than this |
| P90 | {y}s | 90% of your jobs complete faster than this |
| P99 | {z}s | 99% of your jobs complete faster than this |
| Fastest | {min}s | Your fastest job in this period |
| Slowest | {max}s | Your slowest job in this period |

### Response Time by Engine

An additional small table showing median response time per engine:

| Engine | Median | P90 | P99 |
|--------|--------|-----|-----|
| HTTP | {x}s | {y}s | {z}s |
| Browser | {x}s | {y}s | {z}s |
| Stealth | {x}s | {y}s | {z}s |

---

## 8. Top Domains Section

A horizontal bar chart showing the most frequently scraped domains.

### Top Domains Chart

**Chart Specifications:**

| Property | Value |
|----------|-------|
| Chart type | Horizontal bar chart |
| Display | Top 10 domains by request count |
| Bars | One bar per domain, sorted descending by count |
| Labels | Domain name on the left, count on the right of each bar |
| Tooltip | Hover shows: "{domain}: {count} requests, {credits} credits used, {success_rate}% success rate" |
| Interaction | Click on a domain bar opens the jobs list filtered by that domain (URL search) |

### Domain Details Table

Below the chart, a table with more detail:

| Rank | Domain | Requests | Credits | Success Rate | Avg Duration |
|------|--------|----------|---------|-------------|-------------|
| 1 | example.com | {count} | {credits} | {rate}% | {avg}s |
| 2 | site.org | {count} | {credits} | {rate}% | {avg}s |
| ... | ... | ... | ... | ... | ... |
| 10 | other.net | {count} | {credits} | {rate}% | {avg}s |

If the user has scraped more than 10 unique domains, a "View all {count} domains" link appears below the table. This link navigates to the jobs list page with no filters, where the user can use the search to explore specific domains.

---

## 9. API Key Usage Section

A table showing usage broken down by API key, helping users understand which applications or integrations consume the most resources.

### API Key Usage Table

| Column | Content | Notes |
|--------|---------|-------|
| Key Name | User-assigned name of the API key | Links to key detail page (06-API-KEY-MANAGEMENT.md) |
| Type | Live or Test | Badge indicator |
| Status | Active or Revoked | Revoked keys with historical usage still appear |
| Requests | Total request count in the time range | Integer |
| Credits | Total credits consumed | Integer (0 for test keys) |
| Success Rate | Percentage of successful jobs | Formatted as percentage |
| Last Used | When the key was last used for a request | Relative time (e.g., "2 hours ago") |

### Table Behavior

- Sorted by credits consumed (descending) by default
- Includes both active and revoked keys that have usage data in the selected time range
- Revoked keys are visually distinguished with muted text and "(revoked)" suffix
- Test keys show credits as "0" with a "(test)" indicator
- Maximum rows: all keys are shown (no pagination needed since key limits are low)

---

## 10. Time Range Controls

All analytics data on the page respects the selected time range. The time range control appears at the top of the page and applies globally to all charts and metrics.

### Time Range Selector

A dropdown with the following options:

| Option | Range | Default |
|--------|-------|---------|
| Last 7 days | Today minus 7 days to today | No |
| Last 30 days | Today minus 30 days to today | Yes (default) |
| Last 90 days | Today minus 90 days to today | No |
| Current billing cycle | Start of current billing cycle to today | No |
| Previous billing cycle | Start to end of the previous billing cycle | No |
| Custom range | User-defined date range with calendar picker | No |

### Billing Cycle Shortcut

A separate "Billing Cycle" toggle next to the time range dropdown:

| Option | Behavior |
|--------|----------|
| Current Cycle | Sets the time range to the current billing cycle dates. The credit summary card data always reflects the current billing cycle regardless of this toggle |
| Previous Cycle | Sets the time range to the previous billing cycle. Useful for comparing month-over-month usage |

### Custom Range Rules

| Rule | Detail |
|------|--------|
| Maximum span | 90 days |
| Minimum span | 1 day |
| Future dates | Not selectable |
| Date picker | Calendar popover with month navigation. Selecting a "From" date automatically focuses the "To" date picker |
| Validation | "To" date must be on or after "From" date. Error message: "End date must be after start date" |

### URL Sync

The selected time range syncs to URL query parameters:
- Preset ranges: `?range=7d`, `?range=30d`, `?range=90d`, `?range=current`, `?range=previous`
- Custom ranges: `?from=2026-01-15&to=2026-02-08`

This allows bookmarking and sharing specific analytics views.

---

## 11. Data Refresh and Caching

### Aggregation Strategy

Analytics data is pre-aggregated on the server to avoid expensive real-time computation:

| Data | Aggregation | Freshness |
|------|------------|-----------|
| Daily credit usage | Aggregated hourly into daily buckets | Up to 1 hour behind real-time |
| Request counts by status | Aggregated hourly into daily buckets | Up to 1 hour behind real-time |
| Engine breakdown | Computed per day, cached | Up to 1 hour behind real-time |
| Success/failure rates | Computed per day from aggregated counts | Up to 1 hour behind real-time |
| Response time percentiles | Computed per day from sampled job durations | Up to 1 hour behind real-time |
| Top domains | Computed per day, merged across days at query time | Up to 1 hour behind real-time |
| API key usage | Computed per day per key | Up to 1 hour behind real-time |
| Credit summary (current cycle) | Real-time from credit balance | Live (no caching) |

### Client-Side Caching

| Rule | Detail |
|------|--------|
| Cache duration | Analytics API responses are cached client-side for 5 minutes |
| Cache invalidation | Changing the time range fetches fresh data (cache key includes time range) |
| Manual refresh | No explicit refresh button. Navigating away and returning triggers a fresh fetch if the cache has expired |
| Stale indicator | If data is more than 1 hour old (based on the server's last-aggregated timestamp), show: "Data last updated {time}. Analytics are updated hourly." |

---

## 12. Usage Export

Users can export their usage data for external analysis or reporting.

### Export Button

A dropdown at the bottom of the page:

| Option | Description |
|--------|-------------|
| Export Usage Report (CSV) | Exports daily aggregated usage data as CSV |
| Export Usage Report (JSON) | Exports daily aggregated usage data as JSON |

### Export Content

The export file contains one row per day in the selected time range:

| Field | Description |
|-------|-------------|
| Date | Calendar date (YYYY-MM-DD) |
| Total Requests | Number of jobs submitted |
| Completed | Number of completed jobs |
| Failed | Number of failed jobs |
| Cancelled | Number of cancelled jobs |
| Expired | Number of expired jobs |
| Credits Used | Total credits consumed |
| HTTP Requests | Number of HTTP engine jobs |
| Browser Requests | Number of Browser engine jobs |
| Stealth Requests | Number of Stealth engine jobs |
| Success Rate | Percentage of successful jobs |
| Median Duration | P50 response time in seconds |
| P90 Duration | P90 response time in seconds |

### Export Rules

| Rule | Detail |
|------|--------|
| Scope | All days in the selected time range |
| Maximum rows | 90 rows (90 days maximum range) |
| Filename | `scraperx-usage-{from}-to-{to}.{ext}` |
| Rate limit | Maximum 5 exports per hour per user |
| Generation | Server-side, with loading indicator |

---

## 13. Usage Alerts

The platform provides automated alerts when usage approaches or reaches certain thresholds. These are not configurable by the user in MVP (future feature).

### Credit Usage Alerts

| Threshold | Alert Method | Message |
|-----------|-------------|---------|
| 50% of credits used | In-app only (banner on usage page) | "You have used 50% of your monthly credits. {remaining} credits remaining." |
| 75% of credits used | In-app banner + email | "You have used 75% of your monthly credits. Consider purchasing a credit pack or upgrading your plan." |
| 90% of credits used | In-app banner + email | "You have used 90% of your monthly credits. Only {remaining} credits remaining." |
| 100% of credits used | In-app banner + email | "You have reached your credit limit. New jobs will fail until credits are replenished. Buy a credit pack or upgrade your plan." |

### Alert Display

- In-app alerts appear as a dismissible banner at the top of the usage page (below the page header, above the credit summary card)
- Each alert level is shown at most once per billing cycle (dismissing it does not re-show until the next cycle)
- The dismiss action is stored per user per billing cycle
- Email alerts link directly to the usage page with a CTA to purchase credits or upgrade

### Future Alert Enhancements (Not MVP)

The following are documented for future implementation:
- Custom threshold alerts (user-configurable percentages)
- Webhook notifications for usage thresholds
- Daily/weekly usage digest emails
- Anomaly detection (unusual spike in failures, unexpected credit drain)

---

## 14. Empty and Error States

### Empty States

| Scenario | Message | CTA |
|----------|---------|-----|
| No usage data at all (new account) | "No usage data yet. Submit your first API request to start seeing analytics here." | "View API Documentation" button |
| No data in selected time range | "No usage data for the selected time range." | "Try a different time range" link that resets to "Last 30 days" |
| No failed jobs (in failure breakdown) | "No failed jobs in this period. Your success rate is 100%." | None (positive state) |
| No domains scraped (top domains) | Same as "no usage data at all" | Same as above |

### Error States

| Scenario | Message | Recovery |
|----------|---------|----------|
| Analytics API fails to load | "Unable to load usage data. Please try again." | "Retry" button |
| Single chart fails to load | The failed chart card shows "Unable to load this chart" | "Retry" link within the card. Other charts remain functional |
| Export fails | Toast: "Export failed. Please try again." | User can retry the export |
| Time range API error | Toast: "Unable to fetch data for this time range." | Falls back to previous time range selection |

### Chart-Level Error Isolation

Each chart section loads its data independently. If one chart's API call fails:
- That chart shows its error state
- All other charts continue to display normally
- The page does not show a full-page error unless ALL chart requests fail

---

## 15. Edge Cases

| Scenario | Handling |
|----------|----------|
| User upgrades plan mid-cycle | Credit summary shows the new plan's allocation. Usage history reflects jobs from before and after the upgrade. The "Credits Used" counter does not reset mid-cycle |
| User purchases a credit pack mid-cycle | Credit summary increases "Credits Remaining" by the pack amount. No chart change since credit packs are additive |
| Billing cycle resets while user is viewing the page | The credit summary card updates on next data refresh. A subtle notification appears: "Your billing cycle has reset." Charts for the new cycle will initially show minimal data |
| User has test keys only | Credit metrics show 0 for all credit-related fields. Request metrics still show test job counts. A note appears: "Credit usage is not tracked for test keys" |
| User has no API keys | Same as "no usage data" empty state |
| Very high volume user (100k+ jobs) | Server-side aggregation handles this efficiently. Client receives pre-aggregated daily summaries, not raw job data |
| User's timezone differs from UTC | All date-based aggregation uses UTC internally. Display timestamps use the user's configured timezone (see 11-SETTINGS-AND-SUPPORT.md). A note on the page clarifies: "All dates are shown in {timezone}" |
| Single day has extreme outlier (e.g., 10x normal usage) | Charts auto-scale Y-axis to accommodate. Tooltip clearly shows the value. No special capping or truncation |
| Custom range spans two billing cycles | Credit summary card always shows the current cycle (not the custom range). Charts show data across both cycles without distinction |
| Account suspended during the cycle | Analytics remain viewable (read-only page). Credit summary shows "Account Suspended" badge. No new jobs can be created |
| Concurrent page views across tabs | Each tab independently loads analytics data. No conflicts since the page is read-only |

---

## 16. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform architecture and routing |
| 05-USER-DASHBOARD.md | Dashboard layout, overview page with credit usage chart |
| 07-JOBS-AND-LOGS.md | Source job data that feeds all analytics |
| 09-BILLING-AND-CREDITS.md | Credit allocation, billing cycles, credit pack purchases |
| 11-SETTINGS-AND-SUPPORT.md | User timezone setting that affects date display |
| 12-ADMIN-DASHBOARD.md | Admin-level analytics aggregated across all users |
| 18-DATA-MODELS.md | Aggregation table schemas, analytics query patterns |
