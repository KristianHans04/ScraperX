# ScraperX Full-Stack Platform Overview

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-000 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Classification | Internal |

---

## Table of Contents

1. [What ScraperX Is](#1-what-scraperx-is)
2. [Platform Zones](#2-platform-zones)
3. [Technology Stack](#3-technology-stack)
4. [URL Structure and Routing](#4-url-structure-and-routing)
5. [Complete Sitemap](#5-complete-sitemap)
6. [User Types](#6-user-types)
7. [Plan Tiers](#7-plan-tiers)
8. [Design System Constraints](#8-design-system-constraints)
9. [Cross-Document Reference Map](#9-cross-document-reference-map)
10. [Glossary](#10-glossary)

---

## 1. What ScraperX Is

ScraperX is a web scraping platform that provides developers, businesses, and individuals with reliable, scalable data extraction through a simple API. Users sign up, pick a plan, get an API key, and start scraping. The platform handles proxy rotation, browser rendering, anti-detection, CAPTCHA solving, and result delivery so customers do not have to.

The scraping engine (backend) is already built. This document set covers everything needed to build the full-stack platform around it: the public website, the user dashboard, the admin panel, the documentation portal, authentication, billing, moderation, and all supporting systems.

### What Already Exists (Phases 1-5)

The following backend systems are complete and tested (413 tests passing):

| System | Description | Location |
|--------|-------------|----------|
| Fastify API Server | Request handling, validation, routing | src/api/ |
| Three Scraping Engines | HTTP (impit), Browser (Playwright), Stealth (Camoufox) | src/engines/ |
| Job Queue | BullMQ-based distributed job processing | src/queue/ |
| Proxy Manager | Multi-provider proxy rotation with tier escalation | src/proxy/ |
| Fingerprint System | Browser fingerprint generation and injection | src/fingerprint/ |
| Database Layer | PostgreSQL repositories and connection management | src/db/ |
| Redis Integration | Caching, rate limiting, session data | src/queue/ |
| Docker Infrastructure | Multi-service containerized deployment | docker/ |

### What This Documentation Covers (Phases 6-12)

Everything that must be built on top of the existing engine to create a production SaaS platform:

| Area | Covered In |
|------|------------|
| Public-facing website | 01-PUBLIC-WEBSITE.md |
| Legal pages and policies | 02-LEGAL-FRAMEWORK.md |
| User authentication and onboarding | 03-AUTHENTICATION.md |
| Role and permission system | 04-ROLES-AND-PERMISSIONS.md |
| User dashboard | 05-USER-DASHBOARD.md |
| API key management | 06-API-KEY-MANAGEMENT.md |
| Job history and logs | 07-JOBS-AND-LOGS.md |
| Usage tracking and analytics | 08-USAGE-AND-ANALYTICS.md |
| Billing, subscriptions, and credits | 09-BILLING-AND-CREDITS.md |
| Team and organization management (future) | 10-TEAM-MANAGEMENT.md |
| User settings and support system | 11-SETTINGS-AND-SUPPORT.md |
| Admin dashboard overview | 12-ADMIN-DASHBOARD.md |
| Admin user and account management | 13-ADMIN-ORGANIZATIONS.md |
| Admin moderation and abuse handling | 14-ADMIN-MODERATION.md |
| Admin finance and revenue tracking | 15-ADMIN-FINANCE.md |
| Admin operations and system health | 16-ADMIN-OPERATIONS.md |
| API documentation portal | 17-DOCS-PORTAL.md |
| Data models (all entities described) | 18-DATA-MODELS.md |
| Security framework | 19-SECURITY-FRAMEWORK.md |
| End-to-end user journeys | 20-USER-JOURNEYS.md |
| Testing strategy | 21-TESTING-STRATEGY.md |
| Implementation phases (separate files) | ROADMAP/ |
| Permission matrix, emails, error codes, env vars | APPENDICES/ |

---

## 2. Platform Zones

The platform is divided into three distinct zones, each with its own layout, navigation, and access rules.

### Zone 1: Public Website

The public-facing marketing site. Accessible to everyone, no authentication required.

| Aspect | Detail |
|--------|--------|
| Purpose | Attract visitors, explain the product, convert signups |
| Access | Unauthenticated |
| Layout | Marketing layout with top navbar, hero sections, footer |
| Domain | scraperx.io (primary domain, configurable via environment variable) |
| SEO | Fully optimized, server-rendered landing pages or pre-rendered static pages |
| Pages | Landing, Pricing, About, Contact, Blog, Status, Legal pages |

### Zone 2: Application Dashboard

The authenticated user area where customers manage their account, view usage, handle billing, and manage API keys.

| Aspect | Detail |
|--------|--------|
| Purpose | Self-service management of the user's scraping operations |
| Access | Authenticated users only |
| Layout | Sidebar navigation on left, content area on right |
| URL prefix | /dashboard/* |
| Session | Cookie-based session with CSRF protection |
| Pages | Overview, API Keys, Jobs, Usage, Billing, Settings |

### Zone 3: Admin Panel

The internal administration area for platform operators. Only accessible to users with the Admin role.

| Aspect | Detail |
|--------|--------|
| Purpose | Platform management, moderation, finance, operations |
| Access | Admin role only |
| Layout | Separate sidebar with admin-specific navigation |
| URL prefix | /admin/* |
| Security | Requires admin role check on every request, all actions audit-logged |
| Pages | Overview, Users, Accounts, Moderation, Finance, Operations, System |

### Zone Diagram

```
+------------------------------------------------------------------+
|                         SCRAPERX PLATFORM                         |
+------------------------------------------------------------------+
|                                                                    |
|  ZONE 1: PUBLIC WEBSITE          No auth required                  |
|  +------------------------------------------------------------+   |
|  |  /              Landing page                                |   |
|  |  /pricing        Plan comparison                            |   |
|  |  /about          Company information                        |   |
|  |  /contact        Contact form                               |   |
|  |  /blog           Articles and guides                        |   |
|  |  /status         Service health                             |   |
|  |  /legal/*        Terms, Privacy, AUP, DPA, Cookies          |   |
|  |  /login          Sign in                                    |   |
|  |  /signup         Register                                   |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  ZONE 2: USER DASHBOARD         Authenticated users                |
|  +------------------------------------------------------------+   |
|  |  /dashboard              Overview and quick stats           |   |
|  |  /dashboard/api-keys     Key management                     |   |
|  |  /dashboard/jobs         Job history and detail             |   |
|  |  /dashboard/usage        Usage analytics                    |   |
|  |  /dashboard/billing      Plans, credits, invoices           |   |
|  |  /dashboard/settings     Profile, security, notifications   |   |
|  |  /dashboard/support      Help and tickets                   |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  ZONE 3: ADMIN PANEL            Admin role only                    |
|  +------------------------------------------------------------+   |
|  |  /admin                  Admin overview                     |   |
|  |  /admin/users            User management                    |   |
|  |  /admin/accounts         Account management                 |   |
|  |  /admin/moderation       Abuse and reports                  |   |
|  |  /admin/finance          Revenue and billing                |   |
|  |  /admin/operations       System health and queues           |   |
|  |  /admin/audit            Audit log viewer                   |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  DOCS PORTAL                    Separate layout                    |
|  +------------------------------------------------------------+   |
|  |  /docs                   API documentation hub              |   |
|  |  /docs/quickstart        Getting started guide              |   |
|  |  /docs/api/*             Endpoint reference                 |   |
|  |  /docs/guides/*          Tutorials and how-to               |   |
|  |  /docs/sdks/*            SDK documentation                  |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React.js | Component-based SPA, widely supported ecosystem |
| Build Tool | Vite | Fast development builds, optimized production output |
| Routing | React Router | Standard routing for React SPAs |
| UI Components | shadcn/ui | Accessible, themeable, copy-paste component model |
| Styling | Tailwind CSS | Utility-first CSS, consistent with shadcn/ui |
| State Management | React Context + useReducer for global state, React Query for server state | Avoids unnecessary complexity |
| HTTP Client | Fetch API wrapped in a typed client | No extra dependency, standardized |
| Forms | React Hook Form + Zod validation | Performance, type-safe validation |
| Charts | Recharts or Tremor | Composable, React-native charting |
| Icons | Lucide React (monochrome, CSS-colored) | SVG icon set, no colored icons per standards |
| Theming | CSS variables with data-theme attribute | Light and dark mode support |

### Backend (Existing)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js with TypeScript |
| API Framework | Fastify |
| Database | PostgreSQL |
| Cache and Queue | Redis + BullMQ |
| Object Storage | MinIO (S3-compatible) |
| Containerization | Docker + Docker Compose |

### Backend (New, Phases 6-12)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Session Management | Fastify session plugin with Redis store | Secure cookie-based sessions |
| Email Service | Configurable provider (environment variable) | Transactional emails, password resets |
| Payment Integration | Provider-agnostic adapter pattern | Support any payment provider without rewriting core billing logic |
| File Upload | Multer or Fastify multipart | Profile images, support attachments |
| Search | PostgreSQL full-text search (initially) | No extra infrastructure for MVP |

### Infrastructure

| Layer | Technology |
|-------|------------|
| Hosting | Hetzner dedicated servers |
| Orchestration | Docker Swarm |
| Reverse Proxy | Traefik |
| SSL | Let's Encrypt via Traefik |
| Monitoring | Prometheus + Grafana |
| Alerting | Alertmanager + Slack/PagerDuty |
| CI/CD | GitHub Actions |
| CDN | Cloudflare |

---

## 4. URL Structure and Routing

All URLs use clean slugs. No auto-incremented IDs appear in any URL. Public-facing resources use slugs; internal references use UUIDs.

### Public Website Routes

| Route | Page | Notes |
|-------|------|-------|
| / | Landing page | Marketing hero, feature highlights, CTA |
| /pricing | Pricing page | Plan comparison table, FAQ |
| /about | About page | Mission, team, company info |
| /contact | Contact page | Contact form, support email |
| /blog | Blog listing | Article cards, pagination |
| /blog/:slug | Blog post | Individual article |
| /status | Status page | Current service health |
| /legal/terms | Terms of Service | |
| /legal/privacy | Privacy Policy | |
| /legal/acceptable-use | Acceptable Use Policy | |
| /legal/dpa | Data Processing Agreement | |
| /legal/cookies | Cookie Policy | |

### Authentication Routes

| Route | Page | Notes |
|-------|------|-------|
| /login | Sign in | Email/password, OAuth buttons |
| /signup | Register | Registration form |
| /forgot-password | Password reset request | Email input |
| /reset-password/:token | Password reset form | Token-validated, time-limited |
| /verify-email/:token | Email verification | Auto-redirect on success |
| /mfa/setup | MFA enrollment | QR code, backup codes |
| /mfa/verify | MFA challenge | TOTP input during login |

### Dashboard Routes

| Route | Page | Notes |
|-------|------|-------|
| /dashboard | Overview | Welcome, quick stats, credit bar, recent activity |
| /dashboard/api-keys | API key list | Table of keys with actions |
| /dashboard/api-keys/new | Create API key | Name, environment, scopes, IP whitelist |
| /dashboard/jobs | Job history | Filterable, sortable table |
| /dashboard/jobs/:jobId | Job detail | Timeline, request/response, metadata |
| /dashboard/usage | Usage analytics | Charts, breakdowns, exports |
| /dashboard/billing | Billing overview | Current plan, credits, payment method |
| /dashboard/billing/plans | Plan selection | Change plan modal or page |
| /dashboard/billing/invoices | Invoice history | Downloadable invoices |
| /dashboard/billing/credits | Credit packs | Purchase additional credits |
| /dashboard/settings | Settings hub | Tabs for profile, security, notifications |
| /dashboard/settings/profile | Profile settings | Name, email, avatar |
| /dashboard/settings/security | Security settings | Password, MFA, sessions |
| /dashboard/settings/notifications | Notification preferences | Email preferences |
| /dashboard/support | Support hub | FAQ, ticket list |
| /dashboard/support/new | New support ticket | Ticket form |
| /dashboard/support/:ticketId | Ticket detail | Conversation thread |

### Admin Routes

| Route | Page | Notes |
|-------|------|-------|
| /admin | Admin overview | KPIs, action-required panel |
| /admin/users | User list | Search, filter, sort |
| /admin/users/:userId | User detail | User info, account, activity |
| /admin/accounts | Account list | All accounts with status |
| /admin/accounts/:accountId | Account detail | Tabs for info, usage, billing, keys, jobs |
| /admin/moderation | Moderation queue | Pending reviews, flagged accounts |
| /admin/moderation/:reportId | Report detail | Investigation view |
| /admin/finance | Finance overview | Revenue, MRR, subscriptions |
| /admin/finance/subscriptions | Subscription list | All active subscriptions |
| /admin/finance/invoices | Invoice list | All invoices across accounts |
| /admin/finance/credits | Credit ledger | All credit transactions |
| /admin/operations | System health | Queue status, error rates |
| /admin/operations/queues | Queue monitor | Per-queue stats |
| /admin/operations/jobs/:jobId | Job inspector | Admin-level job detail |
| /admin/operations/errors | Error log | Aggregated errors |
| /admin/audit | Audit log | Searchable action history |

### Documentation Routes

| Route | Page | Notes |
|-------|------|-------|
| /docs | Docs landing | Three-tier navigation entry |
| /docs/quickstart | Quick start guide | Signup to first scrape in 5 minutes |
| /docs/api/scrape | POST /v1/scrape reference | |
| /docs/api/jobs | GET /v1/jobs reference | |
| /docs/api/batch | POST /v1/batch reference | |
| /docs/api/usage | GET /v1/usage reference | |
| /docs/api/webhooks | Webhook configuration | |
| /docs/api/errors | Error code reference | |
| /docs/guides/javascript-rendering | JS rendering guide | |
| /docs/guides/proxy-selection | Proxy guide | |
| /docs/guides/captcha-solving | CAPTCHA guide | |
| /docs/guides/data-extraction | Extraction guide | |
| /docs/sdks/python | Python SDK docs | |
| /docs/sdks/node | Node.js SDK docs | |

---

## 5. Complete Sitemap

Total distinct pages across all zones:

| Zone | Page Count | Authentication |
|------|------------|---------------|
| Public Website | 13 pages | None |
| Authentication | 7 pages | None (or partial) |
| User Dashboard | 17 pages | Required |
| Admin Panel | 15 pages | Admin role |
| Documentation | 14+ pages | None |
| **Total** | **66+ pages** | |

---

## 6. User Types

### MVP Launch Roles (Phase 6)

The platform launches with two core roles. This keeps the initial implementation simple and allows individual developers to sign up instantly.

| Role | Description | Access |
|------|-------------|--------|
| User | Any registered individual or developer. Signs up, manages their own account, API keys, billing, and jobs. | Dashboard (Zone 2) |
| Admin | Platform operator. Manages all accounts, handles moderation, views finance, monitors operations. | Dashboard (Zone 2) + Admin Panel (Zone 3) |

### How a User Gets Started

1. Visit the landing page
2. Click "Get Started" or "Sign Up"
3. Register with email/password or OAuth (Google, GitHub)
4. Verify email address
5. Land on the dashboard overview
6. Create an API key
7. Make first API call
8. Subscribe to a paid plan when free credits are exhausted (or before)

### Future Team Roles (Phase 10+)

Documented in 10-TEAM-MANAGEMENT.md for future implementation. These roles are not needed for launch but are designed so the data model and permission system can accommodate them later without restructuring.

| Future Role | Description |
|-------------|-------------|
| Owner | The account creator. Full control including billing and account deletion. |
| OrgAdmin | Can manage team members, API keys, and view billing. Cannot delete the account. |
| Member | Can create and view API keys, run jobs, view usage. Cannot manage billing or team. |
| Viewer | Read-only access. Can view jobs, usage, and keys but cannot create or modify anything. |
| Billing | Can only manage billing, payment methods, and view invoices. No API or team access. |

---

## 7. Plan Tiers

### Subscription Plans

| Plan | Monthly Price (USD) | Credits Included | Target User |
|------|---------------------|-------------------|-------------|
| Free | $0 | 1,000 | Evaluation, testing |
| Pro | $49/month | 50,000 | Individual developers, small projects |
| Enterprise | Custom pricing | Custom | Large organizations, high volume |

### Credit Rules

| Rule | Detail |
|------|--------|
| Credit rollover | Credits do NOT roll over. Hard reset each billing cycle. |
| Credit packs | Users can purchase additional credit packs. These also do not roll over. |
| Failed requests | Failed requests are NOT charged. Only successful requests consume credits. |
| Credit multipliers | Different engines and features consume different credit amounts (see 09-BILLING-AND-CREDITS.md) |

### Plan Feature Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| API credits per month | 1,000 | 50,000 | Custom |
| Rate limit (requests/second) | 2 | 20 | Custom |
| Concurrent jobs | 2 | 20 | Custom |
| API keys | 1 | 5 | Unlimited |
| JavaScript rendering | Yes | Yes | Yes |
| Residential proxies | No | Yes | Yes |
| CAPTCHA solving | No | Yes | Yes |
| Data retention | 3 days | 14 days | Custom |
| Support | Community | Email | Dedicated |
| Webhooks | No | Yes | Yes |
| Credit packs | No | Yes | Yes |

---

## 8. Design System Constraints

All frontend development must follow these constraints, derived from the project standards (docs/development/standards.md).

### Mandatory Rules

| Rule | Enforcement |
|------|-------------|
| No emojis anywhere in the application | Use Lucide React SVG icons, CSS-colored |
| No colored SVG icons | All icons are monochrome, colored via CSS classes |
| 60/30/10 color rule | 60% dominant (background), 30% secondary, 10% accent |
| No 4 stat cards in a row | Use 3 or 5 cards, or a different layout pattern |
| Light and dark mode | CSS variables with data-theme attribute |
| Mobile-first responsive | Test at 320px, 768px, 1024px, 1440px |
| WCAG 2.1 AA | 4.5:1 contrast, keyboard navigation, ARIA labels, skip links |
| SEO: 95%+ Lighthouse score | Meta tags, semantic HTML, Core Web Vitals |
| No file over 1,000 lines | Split into modules and components |
| No business logic in templates | Logic in hooks, utils, or services |
| No hardcoded URLs or config | All configurable via environment variables |
| No auto-incremented IDs in URLs | Use UUIDs or slugs |
| No easily guessable tokens | Cryptographically secure random generation only |
| Touch targets 44x44px minimum | All interactive elements |
| Soft deletes only | Never destroy data |

### Color System

Colors are defined as CSS variables so both light and dark themes can override them. The exact palette is not prescribed here but must follow the 60/30/10 rule.

| Variable | Purpose |
|----------|---------|
| --color-bg-primary | Main page background (60%) |
| --color-bg-secondary | Card and section backgrounds (30%) |
| --color-accent | Buttons, links, active states (10%) |
| --color-text-primary | Body text |
| --color-text-secondary | Muted text, descriptions |
| --color-text-inverse | Text on accent-colored backgrounds |
| --color-border | Borders, dividers |
| --color-success | Success states |
| --color-warning | Warning states |
| --color-error | Error states, destructive actions |
| --color-info | Informational states |

### Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Page title (h1) | 2rem / 32px | 700 | One per page |
| Section heading (h2) | 1.5rem / 24px | 600 | |
| Subsection heading (h3) | 1.25rem / 20px | 600 | |
| Body text | 1rem / 16px | 400 | Base size |
| Small text | 0.875rem / 14px | 400 | Labels, captions |
| Monospace | 0.875rem / 14px | 400 | Code, API keys, IDs |

### Spacing System

Use a consistent 4px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 pixels.

### Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| xs | 320px | Small phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1280px | Desktops |
| 2xl | 1440px | Large desktops |

---

## 9. Cross-Document Reference Map

Each document in this set connects to others. This map shows the primary relationships.

```
00-PLATFORM-OVERVIEW (this doc)
  |
  +-- 01-PUBLIC-WEBSITE ------------ references --> 02-LEGAL-FRAMEWORK
  |                                  references --> 17-DOCS-PORTAL
  |
  +-- 02-LEGAL-FRAMEWORK ---------- referenced by --> 01-PUBLIC-WEBSITE
  |                                  referenced by --> 03-AUTHENTICATION
  |
  +-- 03-AUTHENTICATION ----------- references --> 04-ROLES-AND-PERMISSIONS
  |                                  references --> 18-DATA-MODELS (users)
  |                                  references --> 19-SECURITY-FRAMEWORK
  |
  +-- 04-ROLES-AND-PERMISSIONS ---- references --> APPENDICES/A-PERMISSION-MATRIX
  |                                  referenced by --> 05 through 16 (all dashboard/admin)
  |
  +-- 05-USER-DASHBOARD ----------- references --> 06, 07, 08, 09 (sub-pages)
  |
  +-- 06-API-KEY-MANAGEMENT ------- references --> 19-SECURITY-FRAMEWORK
  |                                  references --> 18-DATA-MODELS (api_keys)
  |
  +-- 07-JOBS-AND-LOGS ------------ references --> 18-DATA-MODELS (jobs)
  |
  +-- 08-USAGE-AND-ANALYTICS ------ references --> 09-BILLING-AND-CREDITS
  |
  +-- 09-BILLING-AND-CREDITS ------ references --> 08-USAGE-AND-ANALYTICS
  |                                  references --> 18-DATA-MODELS (subscriptions, invoices)
  |                                  references --> APPENDICES/B-EMAIL-TEMPLATES
  |
  +-- 10-TEAM-MANAGEMENT ---------- references --> 04-ROLES-AND-PERMISSIONS
  |                                  (future phase, not MVP)
  |
  +-- 11-SETTINGS-AND-SUPPORT ----- references --> 03-AUTHENTICATION (security tab)
  |                                  references --> APPENDICES/B-EMAIL-TEMPLATES
  |
  +-- 12-ADMIN-DASHBOARD ---------- references --> 13, 14, 15, 16 (admin sub-areas)
  |
  +-- 13-ADMIN-ORGANIZATIONS ------ references --> 09-BILLING-AND-CREDITS
  |
  +-- 14-ADMIN-MODERATION --------- references --> 02-LEGAL-FRAMEWORK (AUP enforcement)
  |
  +-- 15-ADMIN-FINANCE ------------ references --> 09-BILLING-AND-CREDITS
  |
  +-- 16-ADMIN-OPERATIONS --------- references --> 07-JOBS-AND-LOGS
  |
  +-- 17-DOCS-PORTAL --------------- standalone, references API spec
  |
  +-- 18-DATA-MODELS --------------- referenced by --> all documents
  |
  +-- 19-SECURITY-FRAMEWORK -------- referenced by --> 03, 06, 12-16
  |
  +-- 20-USER-JOURNEYS ------------- references --> 01, 03, 05, 06, 09, 11, 14
  |
  +-- 21-TESTING-STRATEGY ---------- references --> all documents
  |
  +-- ROADMAP/ --------------------- references --> all documents by phase
  |
  +-- APPENDICES/ ------------------ referenced by --> specific documents as noted
```

---

## 10. Glossary

| Term | Definition |
|------|------------|
| Account | A user's account on the platform. In MVP, one user equals one account. In future team phases, an account becomes an organization with multiple members. |
| API Key | A secret credential used to authenticate API requests. Stored as a SHA-256 hash. Shown once at creation. |
| Credit | The unit of consumption. One basic HTTP request costs one credit. Browser rendering, proxies, and features add multipliers. |
| Credit Pack | An add-on purchase of additional credits beyond the plan allocation. Does not roll over. |
| Engine | The scraping method: HTTP (static fetch via impit), Browser (JavaScript rendering via Playwright), or Stealth (anti-detection via Camoufox). |
| Job | A single scrape request. Has a lifecycle: pending, queued, running, completed, failed. |
| Live Key | An API key for production use. Consumes real credits and counts toward billing. |
| MFA | Multi-Factor Authentication. Optional TOTP-based second factor. |
| Plan | A subscription tier (Free, Pro, Enterprise) that determines credit allocation, rate limits, and feature access. |
| Proxy Tier | The type of proxy used: datacenter (cheapest), residential (medium), or mobile (most expensive). |
| Show-Once | A security pattern where sensitive data (like an API key) is displayed exactly once at creation and never shown again. |
| Soft Delete | Marking a record as deleted (via a deleted_at timestamp) without physically removing it from the database. |
| Test Key | An API key for development and testing. Does not consume production credits. Requests are processed but may have limited functionality. |
| Webhook | An HTTP callback that the platform sends to a user-configured URL when a job completes. |

---

## Related Documents

- Previous backend documentation: docs/Opus4.5OC/
- Development standards: docs/development/standards.md
- Implementation roadmap: ROADMAP/ (separate files per phase)
