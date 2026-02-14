# Scrapifie Roadmap -- Phase 7: User Dashboard (All Pages)

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-07 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 7 of 12 |
| Prerequisites | Phase 6 (auth, schema, roles complete) |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 05-USER-DASHBOARD.md, 06-API-KEY-MANAGEMENT.md, 07-JOBS-AND-LOGS.md, 08-USAGE-AND-ANALYTICS.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Frontend Foundation](#4-deliverable-1-frontend-foundation)
5. [Deliverable 2: Dashboard Layout Shell](#5-deliverable-2-dashboard-layout-shell)
6. [Deliverable 3: Dashboard Overview Page](#6-deliverable-3-dashboard-overview-page)
7. [Deliverable 4: API Key Management Pages](#7-deliverable-4-api-key-management-pages)
8. [Deliverable 5: Jobs and Logs Pages](#8-deliverable-5-jobs-and-logs-pages)
9. [Deliverable 6: Usage and Analytics Page](#9-deliverable-6-usage-and-analytics-page)
10. [Deliverable 7: Global Components](#10-deliverable-7-global-components)
11. [Deliverable 8: Backend API Endpoints](#11-deliverable-8-backend-api-endpoints)
12. [Testing Requirements](#12-testing-requirements)
13. [Risk Assessment](#13-risk-assessment)
14. [Definition of Done](#14-definition-of-done)
15. [Connection to Next Phase](#15-connection-to-next-phase)

---

## 1. Phase Overview

Phase 7 builds the entire user-facing dashboard. This is the first phase that creates frontend code. It establishes the React + Vite + Tailwind CSS + shadcn/ui application, the routing structure, the authenticated layout shell, and all user dashboard pages.

By the end of Phase 7, an authenticated user can log in and access a fully functional dashboard with: an overview of their account, API key management (create, view, revoke), job history with detail views and logs, and usage analytics with charts and data exports.

### What Exists Before Phase 7

- Everything from Phases 1-6 (scraping engine + auth + schema + roles)
- No frontend code exists yet
- Backend API endpoints for auth exist

### What Exists After Phase 7

- React + Vite SPA running at the root URL
- Authenticated dashboard layout (top bar, sidebar, content area)
- Dashboard overview page with stats, credit chart, recent jobs
- API keys list page with create and revoke flows
- Jobs list page with filters, search, pagination
- Job detail page with logs, result viewer, retry and cancel actions
- Usage analytics page with charts, time range controls, export
- Global components: command palette, toast notifications, modals, breadcrumbs, pagination
- Dark mode and light mode support
- Responsive layout for mobile, tablet, and desktop
- All corresponding backend API endpoints

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | Frontend SPA is bootstrapped with React, Vite, Tailwind CSS, shadcn/ui, and React Router |
| G2 | Dashboard layout renders correctly at all breakpoints (375px, 768px, 1024px, 1440px) |
| G3 | All dashboard pages display real data from the API |
| G4 | API key lifecycle works end-to-end (create, view, revoke) |
| G5 | Jobs can be browsed, filtered, searched, and viewed in detail |
| G6 | Usage analytics display charts and support time range selection |
| G7 | Dark mode and light mode both work correctly |
| G8 | Lighthouse scores meet targets (Performance >= 95, Accessibility >= 95, SEO >= 95) |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| SPA loads and renders dashboard for authenticated user | E2E test passes |
| Unauthenticated access redirects to login page | E2E test passes |
| API key creation shows key once and lists it | E2E test passes |
| API key revocation removes key from active list | E2E test passes |
| Jobs list displays with filters and pagination | E2E test passes |
| Job detail shows logs and result | E2E test passes |
| Usage charts render with correct data | E2E test passes |
| Layout is responsive at all breakpoints | Visual regression tests pass |
| Dark mode toggle works and persists | E2E test passes |
| Frontend component coverage >= 80% | Coverage report |
| All backend API endpoints return correct data | Integration tests pass |
| Lighthouse Performance >= 95 | CI Lighthouse audit |
| Lighthouse Accessibility >= 95 | CI Lighthouse audit |
| No regressions in existing tests | All previous tests pass |

---

## 3. Prerequisites Check

Before starting Phase 7, verify:

| Check | How to Verify |
|-------|--------------|
| Phase 6 Definition of Done met | All 21 criteria from PHASE-06.md Section 12 confirmed |
| User can register and log in | Manual test or run Phase 6 E2E tests |
| Sessions work correctly | Verify session creation and retrieval from Redis |
| API routes are protected | Verify 401 on unauthenticated requests |
| Test database has seed data | Run seed script, verify users and accounts exist |
| Git branch created | Create phase-07/user-dashboard branch from main |

---

## 4. Deliverable 1: Frontend Foundation

### Task 4.1: Project Initialization

Set up the React + Vite frontend application.

| Component | Details |
|-----------|---------|
| Build tool | Vite with React plugin |
| Framework | React 18+ with functional components and hooks |
| Routing | React Router v6 with lazy-loaded routes |
| Styling | Tailwind CSS v3+ with custom configuration |
| Component library | shadcn/ui (installed components, not imported package) |
| State management | React Context for global state (auth, theme), component-level state with useState/useReducer |
| Data fetching | Custom hooks wrapping fetch API with loading/error/data states |
| Type safety | TypeScript strict mode |
| Linting | ESLint with React and TypeScript rules |
| Formatting | Prettier with project configuration |

### Task 4.2: Project Structure

Organize the frontend code within the existing project structure.

| Directory | Purpose |
|-----------|---------|
| src/frontend/ | Root of all frontend code |
| src/frontend/components/ | Reusable UI components (organized by category) |
| src/frontend/components/ui/ | shadcn/ui base components |
| src/frontend/components/layout/ | Layout components (sidebar, top bar, etc.) |
| src/frontend/components/charts/ | Chart components |
| src/frontend/components/forms/ | Form components |
| src/frontend/components/feedback/ | Toasts, modals, alerts |
| src/frontend/pages/ | Page components (one per route) |
| src/frontend/pages/dashboard/ | Dashboard pages |
| src/frontend/pages/auth/ | Auth pages (login, register, etc.) |
| src/frontend/hooks/ | Custom React hooks |
| src/frontend/contexts/ | React context providers |
| src/frontend/lib/ | Utility functions, API client, constants |
| src/frontend/styles/ | Global styles, Tailwind config, CSS variables |
| src/frontend/types/ | TypeScript type definitions for frontend |

### Task 4.3: Authentication Integration

Connect the frontend to the Phase 6 authentication backend.

| Component | Details |
|-----------|---------|
| Auth context | Provides current user, loading state, login/logout/register functions |
| Auth state persistence | Session cookie handled by browser (HttpOnly), auth state checked on app mount via GET /api/auth/me |
| Protected route wrapper | Component that checks auth context, redirects to /login if unauthenticated |
| Login page | Email/password form, OAuth buttons (Google, GitHub), forgot password link, register link |
| Register page | Registration form with name, email, password, password strength indicator, terms checkbox |
| Forgot password page | Email input, submit, success message |
| Reset password page | New password input with strength indicator, token from URL |
| Email verification page | Token from URL, verification status display |
| MFA verification page | 6-digit code input, backup code link |
| Post-login redirect | After login, redirect to originally requested page (stored before redirect to login) |

### Task 4.4: Theme System

Implement light/dark mode using CSS variables.

| Component | Details |
|-----------|---------|
| CSS variables | Define color palette as CSS custom properties on :root and .dark |
| Theme context | Provides current theme (light/dark/system), toggle function |
| System detection | Respect prefers-color-scheme media query when theme is "system" |
| Persistence | Store theme preference in localStorage |
| Transition | Smooth color transition on theme change (150ms) |
| Tailwind integration | Use Tailwind's dark: variant linked to CSS class strategy |

### Task 4.5: API Client

Build a typed API client for frontend-to-backend communication.

| Feature | Details |
|---------|---------|
| Base URL | Configurable via environment variable (VITE_API_URL) |
| Request interceptor | Automatically includes CSRF token header on state-changing requests |
| Response interceptor | Handles 401 (redirect to login), 429 (show rate limit toast), 500 (show error toast) |
| Type safety | Response types match backend response shapes |
| Error handling | Consistent error object extraction from API error responses |
| Abort support | Requests are cancelled on component unmount using AbortController |

---

## 5. Deliverable 2: Dashboard Layout Shell

**Reference Document:** 05-USER-DASHBOARD.md Sections 1-3

### Task 5.1: Top Bar

| Element | Details |
|---------|---------|
| Logo | Scrapifie logo/wordmark, links to /dashboard |
| Search trigger | Search icon button, opens command palette (Cmd+K shortcut) |
| Theme toggle | Sun/moon icon button, cycles through light/dark/system |
| User menu | Avatar (or initials), dropdown with: user name, email, Settings link, Billing link, Logout button |
| Responsive | Full width at all breakpoints, user menu collapses to avatar-only on mobile |

### Task 5.2: Sidebar

| Element | Details |
|---------|---------|
| Navigation items | Overview, API Keys, Jobs, Usage, Billing, Settings, Support |
| Icons | Monochrome SVG icons for each item (no colored icons per standards) |
| Active state | Background highlight and text color change on active route |
| Badges | Unread count badge on Support item |
| Collapsed mode | On screens below 1024px, sidebar collapses to icons only with tooltip labels |
| Mobile | Sidebar hidden by default, accessible via hamburger menu in top bar, renders as overlay with backdrop |
| Width | 240px expanded, 64px collapsed |

### Task 5.3: Content Area

| Element | Details |
|---------|---------|
| Layout | Fills remaining space to the right of sidebar, below top bar |
| Padding | 24px on desktop, 16px on mobile |
| Max width | Content constrained to 1200px max width, centered within content area |
| Breadcrumbs | Displayed at top of content area on pages with depth > 1 |
| Page title | H1 heading at top of each page content area |

---

## 6. Deliverable 3: Dashboard Overview Page

**Reference Document:** 05-USER-DASHBOARD.md Section 4

### Task 6.1: Welcome Message

| Element | Details |
|---------|---------|
| Content | "Welcome back, {firstName}" or "Welcome, {firstName}" for new users |
| Position | Top of page, below breadcrumbs |
| Responsive | Full width at all breakpoints |

### Task 6.2: Stat Cards (3 cards -- NOT 4)

| Card | Label | Value | Subtext |
|------|-------|-------|---------|
| Card 1 | Credits Remaining | Formatted number (e.g., "12,450") | "of 50,000" with percentage |
| Card 2 | Jobs This Period | Formatted number | Comparison to previous period (e.g., "+12% vs last period") |
| Card 3 | Success Rate | Percentage (e.g., "97.2%") | Trend arrow up/down vs previous period |

Layout: 3 cards in a row on desktop, stacked vertically on mobile.

### Task 6.3: Credit Usage Chart

| Element | Details |
|---------|---------|
| Chart type | Line chart with area fill |
| Data | Daily credit usage over selected time range |
| Time toggles | 7d, 30d, 90d buttons above chart |
| Axes | X: dates, Y: credits used |
| Tooltip | Date and exact credit value on hover |
| Benchmark line | Dotted horizontal line showing "even usage" rate (total credits / days in period) |
| Responsive | Full width, minimum height 300px on desktop, 200px on mobile |
| Empty state | "No usage data yet" message with link to API Keys page |

### Task 6.4: Recent Jobs Table

| Element | Details |
|---------|---------|
| Rows | 5 most recent jobs |
| Columns | Status (color dot), Job ID (truncated UUID, linked to detail), URL (truncated), Engine, Created (relative time) |
| Empty state | "No jobs yet. Create an API key to get started." with CTA button |
| Link | "View all jobs" link below table |
| Responsive | On mobile, reduce to Status + URL + Engine columns, or use card layout |

### Task 6.5: Quick Start Section (New Users Only)

Shown only when user has zero jobs:

| Element | Details |
|---------|---------|
| Visibility | Hidden once user has at least 1 job |
| Content | Step-by-step mini guide: 1. Create an API key, 2. Make your first request, 3. Check your results |
| Each step | Icon, title, description, action button or link |
| Links | Step 1 links to API Keys page, Step 2 links to Docs quickstart, Step 3 links to Jobs page |

---

## 7. Deliverable 4: API Key Management Pages

**Reference Document:** 06-API-KEY-MANAGEMENT.md

### Task 7.1: API Keys List Page

| Element | Details |
|---------|---------|
| Route | /dashboard/keys |
| Page title | "API Keys" |
| Key count | "X of Y keys used" (e.g., "2 of 5 keys used" for Pro) |
| Create button | "Create API Key" button, opens create flow |
| Table columns | Name, Key (masked: prefix + first 8 chars + "..."), Type (Live/Test badge), Status (Active/Revoked badge), Created (date), Last Used (relative time or "Never"), Actions (dropdown) |
| Actions dropdown | View Details, Revoke (if active) |
| Filters | Type dropdown (All, Live, Test), Status dropdown (All, Active, Revoked) |
| Empty state | "No API keys yet" with create button |
| Plan limit reached | Create button disabled, tooltip shows "Upgrade to create more keys" |

### Task 7.2: Create API Key Flow

| Step | Details |
|------|---------|
| Trigger | Click "Create API Key" button |
| UI | Modal dialog |
| Form fields | Name (required, text, 1-50 chars), Environment (toggle: Live / Test), Expiry (dropdown: Never, 30 days, 90 days, 1 year), IP Whitelist (optional, multi-value input, IPv4/CIDR, max 20) |
| Validation | Name required, IP format validation, plan limit check |
| Submit | Creates key via POST /api/keys, returns show-once response |
| Show-once display | Full raw key displayed in monospace, copy button, warning text "This key will only be shown once", confirmation checkbox "I have saved this key", Close button (disabled until checkbox checked) |
| Post-close | Modal closes, key appears in table (masked) |
| Error | Plan limit error shows upgrade prompt, other errors show toast |

### Task 7.3: API Key Detail Page

| Element | Details |
|---------|---------|
| Route | /dashboard/keys/:id |
| Header | Key name, type badge, status badge |
| Editable fields | Name (inline edit), Expiry (date picker), IP Whitelist (multi-value input) |
| Read-only fields | Key prefix (e.g., "sk_live_"), created date, last used date and IP, total requests count |
| Save | Save button appears when editable fields are dirty, sends PATCH /api/keys/:id |
| Revoke | Revoke button at bottom (danger section), opens confirmation modal with key name and warning |

### Task 7.4: Revoke Key Flow

| Step | Details |
|------|---------|
| Trigger | Revoke action from list or detail page |
| UI | Confirmation modal |
| Content | "Revoke API Key: {name}?", warning about immediate effect, note about active jobs |
| Confirm | Sends DELETE /api/keys/:id, key status changes to Revoked |
| Post-revoke | Toast confirmation, key row updates in table (greyed out, Revoked badge) |

---

## 8. Deliverable 5: Jobs and Logs Pages

**Reference Document:** 07-JOBS-AND-LOGS.md

### Task 8.1: Jobs List Page

| Element | Details |
|---------|---------|
| Route | /dashboard/jobs |
| Page title | "Jobs" |
| Table columns | Status (color dot: green=completed, red=failed, yellow=queued, blue=processing, grey=cancelled/expired), Job ID (truncated, linked), URL (truncated with tooltip), Engine (HTTP/Browser/Stealth), API Key (name, linked), Credits (number), Duration (formatted), Created (date/time) |
| Sorting | Click column headers to sort, default: Created descending |
| Pagination | 25 rows per page, page controls at bottom, total count displayed |
| Filters | Status multi-select, Engine multi-select, API Key dropdown, Date range picker |
| Search | Text search across Job ID and URL, 300ms debounce |
| URL sync | All filters and pagination synced to URL query parameters |
| Empty state | "No jobs yet" with link to quickstart docs |
| Filtered empty state | "No jobs match your filters" with clear filters button |
| Real-time | Poll every 10 seconds for updates when tab is visible |

### Task 8.2: Job Detail Page

| Element | Details |
|---------|---------|
| Route | /dashboard/jobs/:id |
| Breadcrumb | Jobs > Job {truncated ID} |
| Overview card | Status badge, Job ID (full, with copy button), URL (full, linked), Engine, API Key (name, linked), Credits charged, Duration, Created, Completed/Failed at, Attempts count |
| Request config section | Collapsible section showing the original request parameters: URL, engine, headers, wait time, proxy settings, output format |
| Execution log | Timestamped log entries with level filtering (All, Info, Warn, Error, Debug), auto-scroll for active jobs, newest entries at bottom |
| Result viewer | Shown only for completed jobs, format-adaptive tabs (HTML with rendered preview, JSON with syntax highlighting, Text/Markdown with formatting, Screenshot with lightbox), copy content button, download button |
| Result truncation | Results over 100KB show truncation notice with download-full link |
| Error display | Shown only for failed jobs: error type, error message, number of attempts, actionable suggestions based on error type |
| Actions | Retry button (creates new job linked to this one, requires credit check), Cancel button (shown only for queued/processing jobs) |
| Real-time | Poll every 5 seconds for active jobs (queued/processing) |

### Task 8.3: Job Retry Flow

| Step | Details |
|------|---------|
| Trigger | Click Retry button on failed job detail |
| UI | Confirmation modal |
| Content | "Retry this job?", engine and credit cost shown, current balance shown |
| Insufficient credits | Modal shows insufficient balance, links to Billing page |
| Confirm | POST /api/jobs/:id/retry, creates new job with same parameters |
| Post-retry | Redirect to new job detail page |

### Task 8.4: Job Cancel Flow

| Step | Details |
|------|---------|
| Trigger | Click Cancel button on queued or processing job |
| UI | Confirmation modal |
| Content | "Cancel this job?" with note that processing jobs may still complete |
| Confirm | POST /api/jobs/:id/cancel |
| Post-cancel | Status updates to cancelled (queued) or may still complete (processing), toast notification |

### Task 8.5: Job Export

| Element | Details |
|---------|---------|
| Trigger | Export button on jobs list page |
| Formats | CSV and JSON |
| Scope | Exports jobs matching current filters, up to 10,000 rows |
| Rate limit | 5 exports per hour |
| Flow | Click export, select format, confirm, download starts |

---

## 9. Deliverable 6: Usage and Analytics Page

**Reference Document:** 08-USAGE-AND-ANALYTICS.md

### Task 9.1: Usage Page Layout

| Element | Details |
|---------|---------|
| Route | /dashboard/usage |
| Page title | "Usage and Analytics" |
| Layout | 2-column grid on desktop (charts side by side where appropriate), single column on mobile |
| Time range controls | 7d, 30d, 90d, Current Cycle, Previous Cycle, Custom range picker, synced to URL |

### Task 9.2: Credit Summary Card

| Element | Details |
|---------|---------|
| Content | Credits used / Credits total, progress bar with color thresholds (green <60%, yellow <80%, orange <90%, red >=90%) |
| Projected usage | "At this rate, you will use all credits by {date}" or "On track to use {X}% of credits" |
| Upgrade prompt | Shown on Free plan: "Upgrade to Pro for 50x more credits" |
| Refresh | Real-time credit balance (not cached) |

### Task 9.3: Credit Usage Over Time Chart

| Element | Details |
|---------|---------|
| Chart type | Line chart with area fill |
| Data | Daily credit usage aggregated by server |
| Granularity | Daily for 7d/30d, weekly for 90d |
| Benchmark line | Dotted line showing "even usage" target |
| Tooltip | Date, credits used, cumulative total |

### Task 9.4: Request Volume Chart

| Element | Details |
|---------|---------|
| Chart type | Stacked bar chart |
| Segments | Completed (green), Failed (red), Cancelled (grey), Expired (grey lighter) |
| Tooltip | Date, count per status, total |
| Summary | Below chart: total requests, completed %, failed % |
| Click interaction | Click a bar to filter jobs list to that date |

### Task 9.5: Engine Breakdown

| Element | Details |
|---------|---------|
| Chart type | Donut chart |
| Segments | HTTP, Browser, Stealth with distinct colors |
| Stats table | Below chart: engine name, job count, credits used, avg duration, success rate |

### Task 9.6: Success and Failure Rates Chart

| Element | Details |
|---------|---------|
| Chart type | Line chart |
| Lines | Success rate (primary color), 95% reference line (dotted) |
| Color | Line turns red when below 95% |
| Below chart | Failure breakdown table: error type, count, percentage of total failures, trend arrow vs previous period |

### Task 9.7: Response Time Metrics

| Element | Details |
|---------|---------|
| Chart type | Line chart with three lines |
| Lines | P50, P90, P99 response times |
| Summary card | P50, P90, P99 values for selected period |
| Per-engine table | Engine, P50, P90, P99 |

### Task 9.8: Top Domains

| Element | Details |
|---------|---------|
| Chart type | Horizontal bar chart (top 10) |
| Table | Rank, domain, requests, credits, success rate, avg duration |
| Click | Click domain to filter jobs list to that domain |

### Task 9.9: API Key Usage Table

| Element | Details |
|---------|---------|
| Columns | Key name, type badge, status badge, requests, credits used, success rate, last used |
| Click | Click key name to navigate to key detail |

### Task 9.10: Usage Export

| Element | Details |
|---------|---------|
| Trigger | Export button |
| Formats | CSV and JSON |
| Content | Daily aggregated rows with 13 fields per row (date, total requests, completed, failed, credits used, credits by engine, avg duration, success rate) |
| Limits | Max 90 rows (90 days), 5 exports per hour |

---

## 10. Deliverable 7: Global Components

**Reference Document:** 05-USER-DASHBOARD.md Section 5

### Task 10.1: Command Palette (Cmd+K)

| Element | Details |
|---------|---------|
| Trigger | Cmd+K (Mac) / Ctrl+K (Windows/Linux), or click search icon in top bar |
| UI | Centered modal overlay with search input and results list |
| Search targets | Pages (navigate to), recent jobs (navigate to detail), API keys (navigate to detail), actions (create key, toggle theme) |
| Fuzzy search | Matches partial text, highlights matched characters |
| Keyboard navigation | Arrow keys to navigate results, Enter to select, Escape to close |
| Results grouping | Group by type: Pages, Jobs, Keys, Actions |
| Max results | 5 per group |

### Task 10.2: Toast Notifications

| Element | Details |
|---------|---------|
| Variants | Success (green), Error (red), Warning (yellow), Info (blue) |
| Position | Bottom-right on desktop, bottom-center on mobile |
| Auto-dismiss | Success: 3 seconds, Error: 5 seconds (or manual dismiss), Warning: 5 seconds, Info: 4 seconds |
| Stacking | Up to 3 visible, older ones fade out |
| Actions | Optional action button (e.g., "Undo", "View") |
| Accessibility | role="alert", aria-live="polite" for info/success, "assertive" for error/warning |

### Task 10.3: Confirmation Modal

| Element | Details |
|---------|---------|
| Structure | Title, description text, cancel button, confirm button |
| Variants | Default (primary confirm button), Danger (red confirm button) |
| Focus trap | Focus trapped within modal, Tab cycles through focusable elements |
| Close | Escape key, click backdrop, click Cancel button |
| Loading | Confirm button shows loading state during async action |

### Task 10.4: Pagination Component

| Element | Details |
|---------|---------|
| Display | "Showing X-Y of Z items", page number buttons, previous/next arrows |
| Behavior | First/last page buttons if total pages > 7, ellipsis for hidden ranges |
| URL sync | Current page reflected in URL query parameter |
| Accessibility | aria-label on buttons, aria-current on active page |

### Task 10.5: Breadcrumbs

| Element | Details |
|---------|---------|
| Separator | / character |
| Segments | Each segment is a link except the last (current page) |
| Mobile | Collapsed to show only back arrow and current page on screens < 768px |

### Task 10.6: Empty States

Each page and section has a specific empty state per 05-USER-DASHBOARD.md. Build a reusable empty state component:

| Prop | Description |
|------|-------------|
| icon | SVG icon rendered at 48x48 |
| title | Primary message (e.g., "No API keys yet") |
| description | Secondary message (e.g., "Create your first API key to start making requests") |
| action | Optional CTA button with label and onClick/href |

### Task 10.7: Loading States

| Type | Implementation |
|------|---------------|
| Page loading | Full-page skeleton loader matching page structure |
| Section loading | Section-level skeleton matching chart/table shape |
| Button loading | Spinner icon replacing button text, button disabled |
| Navigation | Top progress bar (thin line at top of viewport) during route transitions |

---

## 11. Deliverable 8: Backend API Endpoints

Build the backend API endpoints that the dashboard pages consume. All endpoints require authentication (requireAuth middleware) unless noted.

### Dashboard Overview Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/dashboard/stats | GET | creditBalance, creditsTotal, jobsThisPeriod, jobsPreviousPeriod, successRate, successRatePrevious |
| /api/dashboard/credit-usage | GET | Array of {date, creditsUsed} for selected time range (query param: range=7d/30d/90d) |
| /api/dashboard/recent-jobs | GET | Array of 5 most recent jobs (status, id, url, engine, createdAt) |

### API Key Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/keys | GET | Paginated list of keys for authenticated account (masked keys) |
| /api/keys | POST | Create key, return show-once full key + key metadata |
| /api/keys/:id | GET | Key detail (masked key, metadata, usage stats) |
| /api/keys/:id | PATCH | Update key name, expiry, IP whitelist |
| /api/keys/:id | DELETE | Revoke key (soft delete) |

### Job Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/jobs | GET | Paginated, filtered, sorted list of jobs for authenticated account |
| /api/jobs/:id | GET | Full job detail including metadata |
| /api/jobs/:id/logs | GET | Paginated job log entries for a specific job |
| /api/jobs/:id/result | GET | Job result data (HTML/JSON/text/screenshot URL) |
| /api/jobs/:id/retry | POST | Create new job with same parameters, return new job ID |
| /api/jobs/:id/cancel | POST | Cancel queued or processing job |
| /api/jobs/export | POST | Generate export file (CSV/JSON) for jobs matching filters |

### Usage Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/usage/summary | GET | Credit summary (used, remaining, percentage, projected) |
| /api/usage/credits | GET | Daily credit usage over time (query: range, granularity) |
| /api/usage/requests | GET | Request volume by status over time |
| /api/usage/engines | GET | Engine breakdown (job count, credits, duration, success rate per engine) |
| /api/usage/success-rate | GET | Success/failure rate over time |
| /api/usage/response-times | GET | P50/P90/P99 response times over time and per engine |
| /api/usage/top-domains | GET | Top 10 domains by request count |
| /api/usage/api-keys | GET | Per-key usage stats |
| /api/usage/export | POST | Generate usage export (CSV/JSON) |

### General Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| /api/auth/me | GET | Current authenticated user and account data |

---

## 12. Testing Requirements

**Reference Document:** 21-TESTING-STRATEGY.md

### Frontend Unit Tests

| Component Category | Estimated Test Count |
|-------------------|---------------------|
| Layout components (sidebar, top bar, breadcrumbs) | 15-20 |
| Stat cards | 8-10 |
| Chart components (6 chart types) | 18-24 |
| Table components (jobs, keys, usage) | 15-20 |
| Form components (create key, filters) | 15-20 |
| Modal components (confirm, show-once, create) | 10-12 |
| Toast notifications | 6-8 |
| Command palette | 8-10 |
| Pagination | 6-8 |
| Empty states | 5-7 |
| Loading/skeleton states | 5-7 |
| Custom hooks (useAuth, useCredits, usePagination, etc.) | 20-25 |

### Frontend Page Tests

| Page | Key Scenarios |
|------|-------------|
| Dashboard Overview | Stats render, chart renders, recent jobs render, empty state for new user, time range toggle |
| API Keys List | Table renders, create modal works, revoke works, plan limit shown, filters work |
| Job List | Table renders, filters apply, pagination works, search works, sorting works |
| Job Detail | All sections render, logs load, result viewer works, retry/cancel work |
| Usage | All charts render, time range changes, export works |

### Backend Integration Tests

| Endpoint Category | Estimated Test Count |
|-------------------|---------------------|
| Dashboard stats endpoints | 8-10 |
| API key CRUD endpoints | 15-20 |
| Jobs list/detail/action endpoints | 20-25 |
| Usage data endpoints | 15-20 |

### E2E Tests

| Flow | Estimated Test Count |
|------|---------------------|
| Login and view dashboard | 1 |
| API key lifecycle (create, view, revoke) | 1 |
| Jobs list with filters and detail view | 1 |
| Usage page with time range | 1 |
| Responsive layout check | 1 |
| Dark mode toggle | 1 |
| Command palette navigation | 1 |

### Visual Regression Tests

Screenshots at 375px, 768px, and 1440px for both light and dark themes on:
- Dashboard overview
- API keys list
- Jobs list
- Job detail
- Usage page

Total: ~30 visual regression screenshots

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Chart library choice affects bundle size | Medium | Medium | Evaluate bundle impact before selecting, consider lazy-loading charts |
| Complex filter/pagination state management | Medium | Medium | Use URL query params as single source of truth for filter state |
| Real-time polling causes performance issues | Low | Medium | Pause polling when tab not visible, use requestIdleCallback |
| shadcn/ui components need heavy customization | Medium | Low | Customize at theme level (CSS variables), avoid forking components |
| Backend aggregation queries are slow | Medium | High | Pre-aggregate usage data hourly, cache in Redis with 5-min TTL |
| Lighthouse score below 95 due to chart library | Medium | Medium | Lazy-load chart components, use code splitting aggressively |

---

## 14. Definition of Done

Phase 7 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | React + Vite app bootstrapped and builds without errors |
| 2 | Login page works and authenticates against Phase 6 backend |
| 3 | Dashboard layout renders correctly at 375px, 768px, 1024px, 1440px |
| 4 | Dashboard overview page shows stats, credit chart, and recent jobs |
| 5 | API keys list page shows keys with create and revoke functionality |
| 6 | API key create flow shows key once and adds to list |
| 7 | Jobs list page shows jobs with filters, search, sorting, and pagination |
| 8 | Job detail page shows overview, logs, result viewer, retry, and cancel |
| 9 | Usage page shows all 8 chart/table sections with data |
| 10 | Time range controls work on usage and overview pages |
| 11 | Export works for jobs and usage data |
| 12 | Command palette opens and navigates to pages |
| 13 | Toast notifications display for all user actions |
| 14 | Dark mode toggle works and persists across sessions |
| 15 | All empty states display correctly for new users |
| 16 | All loading states display correctly during data fetch |
| 17 | Frontend component coverage >= 80% |
| 18 | All backend API endpoints return correct data with integration tests |
| 19 | E2E tests pass for all critical flows |
| 20 | Lighthouse Performance >= 95 |
| 21 | Lighthouse Accessibility >= 95 |
| 22 | Visual regression tests pass at all viewports |
| 23 | No regressions in Phase 6 tests |

---

## 15. Connection to Next Phase

Phase 7 provides the dashboard that Phase 8 extends with billing functionality:

- **Phase 8 (Billing and Credits)** adds the Billing page to the dashboard, integrates with a payment provider, and implements subscription management, credit pack purchases, and invoice display
- Phase 8 builds upon the dashboard layout, global components, and API client established in Phase 7
- The credit balance display (stat cards, charts) created in Phase 7 will be connected to live billing data in Phase 8
- The "Upgrade" prompts created in Phase 7 (on plan limit, low credits) will link to the billing page built in Phase 8

**Read before starting Phase 8:** 09-BILLING-AND-CREDITS.md (full billing system design), 15-ADMIN-FINANCE.md (admin billing views, for context)
