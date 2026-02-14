# Scrapifie User Dashboard

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-005 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 04-ROLES-AND-PERMISSIONS.md, 06-API-KEY-MANAGEMENT.md, 07-JOBS-AND-LOGS.md, 08-USAGE-AND-ANALYTICS.md, 09-BILLING-AND-CREDITS.md, 11-SETTINGS-AND-SUPPORT.md |

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Dashboard Layout](#2-dashboard-layout)
3. [Sidebar Navigation](#3-sidebar-navigation)
4. [Overview Page](#4-overview-page)
5. [Empty States](#5-empty-states)
6. [Global Dashboard Components](#6-global-dashboard-components)
7. [Responsive Behavior](#7-responsive-behavior)
8. [Real-Time Updates](#8-real-time-updates)
9. [Error States](#9-error-states)
10. [Loading States](#10-loading-states)

---

## 1. Dashboard Overview

The user dashboard is the authenticated area where users manage every aspect of their Scrapifie usage. It is accessible at `/dashboard` and all sub-routes under `/dashboard/*`.

### Pages Within the Dashboard

| Page | Route | Covered In |
|------|-------|------------|
| Overview | /dashboard | This document (Section 4) |
| API Keys | /dashboard/api-keys, /dashboard/api-keys/new | 06-API-KEY-MANAGEMENT.md |
| Jobs | /dashboard/jobs, /dashboard/jobs/:jobId | 07-JOBS-AND-LOGS.md |
| Usage | /dashboard/usage | 08-USAGE-AND-ANALYTICS.md |
| Billing | /dashboard/billing, /dashboard/billing/plans, /dashboard/billing/invoices, /dashboard/billing/credits | 09-BILLING-AND-CREDITS.md |
| Settings | /dashboard/settings, /dashboard/settings/profile, /dashboard/settings/security, /dashboard/settings/notifications | 11-SETTINGS-AND-SUPPORT.md |
| Support | /dashboard/support, /dashboard/support/new, /dashboard/support/:ticketId | 11-SETTINGS-AND-SUPPORT.md |

This document covers the overall layout, navigation, and the overview page. Each sub-page is documented in its own file as listed above.

---

## 2. Dashboard Layout

### Desktop Layout (1024px and above)

```
+----------------------------------------------------------------------+
| [Logo]  Scrapifie          [Search: Cmd+K]    [Theme]  [User Menu v]  |
+----------------------------------------------------------------------+
|          |                                                            |
| Sidebar  |  Main Content Area                                        |
|          |                                                            |
| Overview |  Page Title                                                |
| API Keys |  Breadcrumbs (if applicable)                               |
| Jobs     |                                                            |
| Usage    |  (Page content)                                             |
| Billing  |                                                            |
| Settings |                                                            |
| Support  |                                                            |
|          |                                                            |
| -------- |                                                            |
| Docs     |                                                            |
| v1.0.0   |                                                            |
+----------------------------------------------------------------------+
```

| Area | Width | Behavior |
|------|-------|----------|
| Top bar | Full width, 56px height | Fixed to top. Contains logo, search, theme toggle, user menu. |
| Sidebar | 240px fixed width | Fixed position, scrolls independently if content overflows. Collapsible to 64px (icon-only mode). |
| Main content | Remaining width | Scrollable. Maximum content width of 1200px, centered within the available space. |

### Top Bar Elements

| Element | Position | Detail |
|---------|----------|--------|
| Logo | Left | Scrapifie logo (monochrome SVG, CSS-colored). Links to /dashboard. |
| Search | Center | Command palette trigger. Displays "Search... Cmd+K" (or "Ctrl+K" on non-Mac). Click or keyboard shortcut opens the command palette. |
| Theme toggle | Right | Sun/Moon icon (Lucide). Toggles between light and dark mode. Stores preference in localStorage and syncs to user profile. |
| User menu | Right | Displays user's name or email initial. Dropdown with: Profile, Settings, Documentation (external link to /docs), Sign Out. |

### User Menu Dropdown

```
+--------------------------+
|  [Avatar/Initial]        |
|  John Doe                |
|  john@example.com        |
|  Free Plan               |
|  -----------------------  |
|  Profile                 |
|  Settings                |
|  -----------------------  |
|  Documentation           |
|  -----------------------  |
|  Sign Out                |
+--------------------------+
```

| Item | Action |
|------|--------|
| Avatar/Initial | If no avatar uploaded, show first letter of name in a colored circle (color deterministic from user ID) |
| Name and email | Display only, not clickable |
| Plan badge | Shows current plan name (Free, Pro, Enterprise) |
| Profile | Navigates to /dashboard/settings/profile |
| Settings | Navigates to /dashboard/settings |
| Documentation | Opens /docs in a new tab |
| Sign Out | Calls logout endpoint, clears session, redirects to / |

---

## 3. Sidebar Navigation

### Navigation Items

| Label | Icon (Lucide) | Route | Badge |
|-------|---------------|-------|-------|
| Overview | LayoutDashboard | /dashboard | None |
| API Keys | Key | /dashboard/api-keys | Count of active keys |
| Jobs | Clock | /dashboard/jobs | None |
| Usage | BarChart3 | /dashboard/usage | None |
| Billing | CreditCard | /dashboard/billing | "Action needed" if payment failed |
| Settings | Settings | /dashboard/settings | None |
| Support | HelpCircle | /dashboard/support | Count of unread replies |

### Sidebar Bottom Section

| Label | Icon | Action |
|-------|------|--------|
| Documentation | ExternalLink | Opens /docs in new tab |
| Version | None | Displays "v1.0.0" (from environment variable). Not clickable. |

### Active State

The currently active navigation item is visually highlighted with:
- Accent-colored left border (3px)
- Accent-colored text
- Slightly different background tint

Child routes also highlight the parent. For example, /dashboard/billing/invoices highlights the "Billing" nav item.

### Collapsed Sidebar

| Element | Detail |
|---------|--------|
| Toggle | Chevron icon at the bottom of the sidebar, or a hamburger icon in the top bar |
| Collapsed width | 64px (icon only, no labels) |
| Tooltips | When collapsed, hovering over an icon shows the label in a tooltip |
| Persistence | Collapsed/expanded state is stored in localStorage |

### Mobile Sidebar

On viewports below 1024px, the sidebar is hidden by default. A hamburger icon in the top bar opens it as an overlay from the left side.

| Behavior | Detail |
|----------|--------|
| Open animation | Slide in from left, 200ms ease-out |
| Backdrop | Semi-transparent dark overlay behind the sidebar. Clicking it closes the sidebar. |
| Close triggers | Backdrop click, X button, Escape key, selecting a navigation item |
| Body scroll | Locked while sidebar is open |

---

## 4. Overview Page

**Route:** `/dashboard`

This is the first page users see after logging in. It provides a quick summary of account status and recent activity.

### Page Layout

```
+----------------------------------------------------------------------+
|  Overview                                                             |
|                                                                       |
|  Welcome back, John                         [Quick Action: New API Key]|
|                                                                       |
|  +--------------------+  +--------------------+  +------------------+ |
|  | Credits Remaining  |  | API Keys           |  | Jobs Today       | |
|  | 742 / 1,000        |  | 1 active           |  | 23 completed     | |
|  | [=======---] 74%   |  |                    |  | 2 failed         | |
|  +--------------------+  +--------------------+  +------------------+ |
|                                                                       |
|  Credit Usage (7 days)                                                |
|  +----------------------------------------------------------------+  |
|  |                         *                                       |  |
|  |              *         * *        *                              |  |
|  |     *       * *       *   *      * *                             |  |
|  |    * *     *   *     *     *    *   *       *                    |  |
|  |   *   *   *     *   *       *  *     *     * *                   |  |
|  |  *     ***       ***         **       *   *   *                  |  |
|  | *                                      ***     *                 |  |
|  +----------------------------------------------------------------+  |
|  Mon   Tue   Wed   Thu   Fri   Sat   Sun                             |
|                                                                       |
|  Recent Jobs                                                          |
|  +----------------------------------------------------------------+  |
|  | Status    | URL                    | Engine  | Credits | Time    | |
|  |-----------|------------------------|---------|---------|---------|  |
|  | Completed | example.com/page-1     | HTTP    | 1       | 2s ago  | |
|  | Completed | example.com/page-2     | Browser | 5       | 5s ago  | |
|  | Failed    | blocked-site.com       | Stealth | 0       | 1m ago  | |
|  | Completed | shop.example.com       | HTTP    | 1       | 3m ago  | |
|  | Completed | news.example.com       | Browser | 5       | 8m ago  | |
|  +----------------------------------------------------------------+  |
|  View all jobs -->                                                    |
|                                                                       |
|  Quick Start                                                          |
|  +----------------------------------------------------------------+  |
|  | Get started with Scrapifie in 3 steps:                           |  |
|  | 1. Create an API key (if you haven't already)                   |  |
|  | 2. Make your first API call                                     |  |
|  | 3. Check the documentation for advanced features                |  |
|  | [Create API Key]  [View Docs]                                   |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
+----------------------------------------------------------------------+
```

### Stat Cards

Three stat cards in a row (NOT four, per standards).

#### Card 1: Credits Remaining

| Element | Detail |
|---------|--------|
| Label | "Credits Remaining" |
| Value | "{credits_remaining} / {credits_total}" |
| Visual | Progress bar showing percentage consumed. Color changes: green (0-60%), yellow (61-80%), orange (81-90%), red (91-100%). |
| Percentage | Displayed as text below the bar: "74% used" |
| Click action | Navigates to /dashboard/usage |
| Low credit warning | If less than 10% remaining, the card border turns red and a warning message appears: "Running low on credits. Upgrade or purchase a credit pack." |

#### Card 2: API Keys

| Element | Detail |
|---------|--------|
| Label | "API Keys" |
| Value | "{count} active" |
| Subtext | If no keys: "No keys yet" with a subtle prompt |
| Click action | Navigates to /dashboard/api-keys |

#### Card 3: Jobs Today

| Element | Detail |
|---------|--------|
| Label | "Jobs Today" |
| Value | "{completed} completed" |
| Subtext | "{failed} failed" (only shown if failed > 0, in red/error color) |
| Click action | Navigates to /dashboard/jobs |

### Credit Usage Chart

| Element | Detail |
|---------|--------|
| Type | Line chart (area chart variant with filled area beneath the line) |
| Time range | Last 7 days by default. Toggle to: 7 days, 30 days, 90 days |
| X-axis | Days (abbreviated day names or dates) |
| Y-axis | Credits consumed |
| Tooltip | Hovering over a data point shows the exact date and credit count |
| Empty state | If no usage data, show a flat line at zero with a message "No usage data yet" |
| Styling | Accent color for the line/fill. Grid lines in subtle border color. No unnecessary decoration. |

### Recent Jobs Table

| Column | Content |
|--------|---------|
| Status | Badge: "Completed" (green), "Failed" (red), "Running" (blue), "Queued" (gray) |
| URL | The scraped URL, truncated with ellipsis if longer than 40 characters. Full URL shown in tooltip on hover. |
| Engine | "HTTP", "Browser", or "Stealth" |
| Credits | Number of credits consumed (0 for failed jobs) |
| Time | Relative timestamp ("2s ago", "5m ago", "1h ago") |

| Behavior | Detail |
|----------|--------|
| Row count | Show the 5 most recent jobs |
| Click action | Clicking a row navigates to /dashboard/jobs/{jobId} |
| "View all" link | Below the table, links to /dashboard/jobs |
| Empty state | "No jobs yet. Make your first API call to see results here." |

### Quick Start Section

This section is visible to new users who have not yet created an API key or made an API call. Once the user has completed all three steps, this section is hidden permanently (tracked via a user preference flag).

| Element | Detail |
|---------|--------|
| Dismissible | An X button in the top-right corner lets the user dismiss this section permanently |
| Step indicators | Checkmark icons next to completed steps, circle icons next to incomplete steps |
| Buttons | "Create API Key" links to /dashboard/api-keys/new. "View Docs" links to /docs/quickstart. |

### Welcome Message

| Element | Detail |
|---------|--------|
| Text | "Welcome back, {first_name}" (first word of the user's full name) |
| First visit | "Welcome to Scrapifie, {first_name}" on the first dashboard visit |
| Quick action button | "New API Key" button (outline style) on the right side of the welcome row |

---

## 5. Empty States

Every dashboard section has a thoughtful empty state for users who have not yet used that feature.

| Page | Empty State Message | CTA |
|------|-------------------|-----|
| Overview (no data at all) | "Welcome to Scrapifie. Create your first API key to get started." | "Create API Key" button |
| API Keys (no keys) | "You have not created any API keys yet. Create one to start using the API." | "Create API Key" button |
| Jobs (no jobs) | "No scraping jobs yet. Once you make API requests, your job history will appear here." | "View Documentation" link |
| Usage (no usage) | "No usage data yet. Start making API requests to see your usage analytics." | "View Documentation" link |
| Billing (free plan, no invoices) | "You are on the Free plan. Upgrade to Pro for more credits and features." | "View Plans" button |
| Invoices (no invoices) | "No invoices yet. Invoices are generated when you subscribe to a paid plan." | None |
| Support (no tickets) | "No support tickets. If you need help, create a ticket and we will respond within 24 hours." | "Create Ticket" button |

### Empty State Design

| Element | Detail |
|---------|--------|
| Illustration | Optional: a simple, monochrome SVG illustration. NOT a stock image. NOT an emoji. If no illustration is designed, omit it. |
| Title | Short, descriptive. Example: "No API keys yet" |
| Description | One to two sentences explaining what would appear here and how to get started |
| CTA button | Primary action button. Links to the relevant creation flow or documentation. |
| Alignment | Centered horizontally and vertically within the content area |

---

## 6. Global Dashboard Components

### Command Palette (Search)

Triggered by Cmd+K (Mac) or Ctrl+K (Windows/Linux), or by clicking the search bar in the top nav.

```
+----------------------------------------------+
|  [Search icon] Type a command or search...    |
|----------------------------------------------|
|  Quick Actions                                |
|  > Create API Key                             |
|  > View Jobs                                  |
|  > Check Usage                                |
|  > Open Documentation                         |
|                                               |
|  Navigation                                   |
|  > Go to Overview                             |
|  > Go to Billing                              |
|  > Go to Settings                             |
|                                               |
|  Recent                                       |
|  > Job #abc123 - example.com                  |
|  > Job #def456 - shop.example.com             |
+----------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Trigger | Cmd+K or Ctrl+K keyboard shortcut, or click the search area in the top bar |
| Appearance | Modal overlay with search input at top, results below |
| Search scope | Navigation pages, quick actions, recent jobs (by URL or ID) |
| Keyboard navigation | Arrow keys to move between results, Enter to select, Escape to close |
| Fuzzy matching | Search results use fuzzy matching on titles and descriptions |
| No server search | For MVP, search is client-side only (searching a preloaded list of pages, actions, and cached recent jobs). Server-side search can be added later. |

### Toast Notifications

Non-blocking notifications that appear temporarily.

| Element | Detail |
|---------|--------|
| Position | Top-right corner of the content area, below the top bar |
| Types | Success (green left border), Error (red left border), Warning (yellow left border), Info (blue left border) |
| Duration | Auto-dismiss after 5 seconds. Error toasts require manual dismissal. |
| Stacking | Maximum 3 visible at once. New toasts push older ones down. |
| Dismiss | X button on each toast. Click to dismiss. |
| Accessibility | role="alert" for errors, role="status" for success/info |

### Confirmation Modals

Used for destructive or significant actions.

```
+----------------------------------------------+
|  Revoke API Key?                       [X]    |
|                                               |
|  This will immediately revoke the key         |
|  "Production Key". Any applications using     |
|  this key will lose access.                   |
|                                               |
|  This action cannot be undone.                |
|                                               |
|  [Cancel]              [Revoke Key]           |
+----------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Backdrop | Semi-transparent dark overlay. Clicking it cancels the action (same as Cancel button). |
| Title | Describes the action: "Revoke API Key?", "Delete Account?", "Cancel Subscription?" |
| Body | Explains what will happen and any consequences |
| Warning text | "This action cannot be undone." for irreversible actions (in bold or warning color) |
| Cancel button | Secondary/outline style. Closes the modal without action. |
| Confirm button | Primary style. For destructive actions, use red/danger color. Button text describes the action: "Revoke Key", not "OK" or "Yes". |
| Focus | Focus is placed on the Cancel button by default (safer default). |
| Focus trap | Tab cycles within the modal only. |
| Escape key | Closes the modal (cancels the action). |

### Breadcrumbs

Shown on sub-pages for navigation context.

```
Overview > Billing > Invoices
```

| Element | Detail |
|---------|--------|
| Separator | ">" character or ChevronRight icon |
| Clickable | All items except the current page are clickable links |
| Current page | Last item, not clickable, muted text color |
| Mobile | Breadcrumbs are hidden on mobile viewports (below 768px). The back button (arrow-left icon + "Back" text) replaces breadcrumbs. |

### Pagination Component

Used on the Jobs, Invoices, and Audit Log pages.

| Element | Detail |
|---------|--------|
| Style | "Showing 1-10 of 247 results" text on the left. Page navigation on the right. |
| Page buttons | Previous, numbered pages (show first, last, and 2 around current), Next |
| Items per page | Dropdown: 10, 25, 50, 100. Default: 10. Stored in localStorage. |
| URL sync | Current page and items-per-page are reflected in URL query params (?page=2&per_page=25) so the page is bookmarkable and shareable. |
| Edge cases | Previous disabled on page 1. Next disabled on last page. If total items is 0, pagination is hidden. |

---

## 7. Responsive Behavior

### Breakpoint-Specific Layout Changes

| Breakpoint | Layout |
|------------|--------|
| xs-sm (320-767px) | No sidebar (hamburger overlay). Full-width content. Stat cards stack to 1 per row. Tables become card-based lists. Top bar simplified. |
| md (768-1023px) | No sidebar (hamburger overlay). Content has 16px padding. Stat cards 2 per row + 1 below (or 3 in a row if they fit). Tables may scroll horizontally. |
| lg (1024-1279px) | Sidebar visible (collapsed by default or expanded). Full content layout. |
| xl-2xl (1280px+) | Sidebar expanded. Content centered with max-width 1200px. |

### Table Responsiveness

For data tables (jobs, invoices, API keys), two approaches are used depending on the page:

**Approach 1: Horizontal scroll** (for tables with many columns)
- Table container has `overflow-x: auto`
- First column (status or identifier) is sticky
- User can scroll right to see more columns

**Approach 2: Card layout** (for tables on the overview page)
- Below 768px, each table row becomes a card
- Card shows key information vertically
- Less important fields are hidden or collapsed

### Touch Interactions

| Interaction | Detail |
|-------------|--------|
| Swipe | Sidebar can be swiped open (from left edge) and swiped closed on mobile |
| Long press | No long-press actions (avoid hidden functionality) |
| Pull to refresh | Not implemented (use a refresh button instead for explicit action) |

---

## 8. Real-Time Updates

### What Updates in Real-Time

| Data | Update Method | Frequency |
|------|--------------|-----------|
| Credit balance | Poll API every 30 seconds when dashboard is active | 30 seconds |
| Job status (on overview) | Poll API every 10 seconds when dashboard is active | 10 seconds |
| Job detail page | Poll API every 5 seconds while job is in "queued" or "running" state | 5 seconds |

### Polling vs WebSocket

For MVP, use HTTP polling. WebSocket support can be added in a future phase if real-time requirements increase.

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| HTTP Polling | Simple implementation, works everywhere, no special infrastructure | Higher latency, more requests | MVP choice |
| WebSocket | Real-time updates, efficient | Requires WebSocket infrastructure, connection management | Future enhancement |

### Stale Data Handling

| Scenario | Behavior |
|----------|----------|
| Tab is backgrounded | Polling pauses when the browser tab is not visible (using Page Visibility API). Resumes on tab focus with an immediate data fetch. |
| Network error during poll | Silently retry on next poll interval. Do not show error toast for background polling failures. Show error only if a user-initiated action fails. |
| Data changed by another session | Next poll picks up the change. No conflict resolution needed for MVP (single user per account). |

---

## 9. Error States

### Page-Level Errors

| Error | Display |
|-------|---------|
| API unreachable | Full-page error: "Unable to connect to the server. Please check your connection and try again." with a "Retry" button. |
| 500 server error | Full-page error: "Something went wrong. Our team has been notified. Please try again later." |
| 404 (page not found within dashboard) | "Page not found. The page you are looking for does not exist or has been moved." with a "Go to Overview" button. |
| Session expired | Redirect to /login with toast: "Your session has expired. Please sign in again." |

### Component-Level Errors

| Error | Display |
|-------|---------|
| Chart fails to load | Chart area shows: "Unable to load chart data." with a "Retry" link. Rest of the page functions normally. |
| Table fails to load | Table area shows: "Unable to load data." with a "Retry" link. |
| Single stat card fails | Card shows a "--" value instead of crashing. Tooltip on hover: "Data unavailable." |

### Error Boundaries

React error boundaries wrap each major section of the dashboard (sidebar, top bar, main content, individual widgets). If one component crashes, others continue to function. The error boundary shows a "Something went wrong in this section. Reload" message.

---

## 10. Loading States

### Initial Page Load

| State | Display |
|-------|---------|
| Dashboard shell loading | Show sidebar and top bar immediately (skeleton). Main content shows a skeleton loader. |
| Content loading | Skeleton placeholders for stat cards (gray pulsing rectangles), chart (gray pulsing rectangle), and table rows (gray pulsing lines). |
| Duration | Skeleton is shown for maximum 3 seconds. If data has not loaded by then, show a loading spinner with "Loading..." text. |

### Navigation Between Pages

| Behavior | Detail |
|----------|--------|
| Instant shell | Sidebar and top bar remain static. Only the main content area transitions. |
| Transition | No visible page transition animation. Content swaps immediately. Loading skeleton appears if data is not cached. |
| Back button | Browser back button works correctly. Previous page data is cached in React Query cache and displayed immediately. |

### Action Loading States

| Action | Loading State |
|--------|--------------|
| Form submission | Submit button shows a spinner and is disabled. Button text changes to "Saving..." or "Creating..." |
| Table refresh | A subtle loading indicator appears above the table (thin progress bar). Table content remains visible. |
| Modal confirmation | Confirm button shows spinner and is disabled. Modal cannot be closed during the action. |
| Delete/revoke actions | Confirm button shows spinner. On success, modal closes and item is removed from the list with a fade-out animation. |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — Platform zones, technology stack, design constraints
- 04-ROLES-AND-PERMISSIONS.md — Dashboard access control
- 06-API-KEY-MANAGEMENT.md — API Keys page details
- 07-JOBS-AND-LOGS.md — Jobs page details
- 08-USAGE-AND-ANALYTICS.md — Usage page details
- 09-BILLING-AND-CREDITS.md — Billing page details
- 11-SETTINGS-AND-SUPPORT.md — Settings and Support page details
- 20-USER-JOURNEYS.md — End-to-end user flows through the dashboard
- ROADMAP/PHASE-07.md — Dashboard implementation timeline
