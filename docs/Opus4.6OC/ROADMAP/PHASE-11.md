# Scrapifie Roadmap -- Phase 11: Public Website, Legal Pages, and Documentation Portal

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-ROADMAP-11 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Phase | 11 of 12 |
| Prerequisites | Phase 10 (admin dashboard complete) |
| Related Documents | 01-PUBLIC-WEBSITE.md, 02-LEGAL-FRAMEWORK.md, 17-DOCS-PORTAL.md, 14-ADMIN-MODERATION.md |

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Goals and Success Criteria](#2-goals-and-success-criteria)
3. [Prerequisites Check](#3-prerequisites-check)
4. [Deliverable 1: Public Website Layout and Navigation](#4-deliverable-1-public-website-layout-and-navigation)
5. [Deliverable 2: Landing Page](#5-deliverable-2-landing-page)
6. [Deliverable 3: Pricing Page](#6-deliverable-3-pricing-page)
7. [Deliverable 4: About and Contact Pages](#7-deliverable-4-about-and-contact-pages)
8. [Deliverable 5: Blog](#8-deliverable-5-blog)
9. [Deliverable 6: Status Page](#9-deliverable-6-status-page)
10. [Deliverable 7: Legal Pages](#10-deliverable-7-legal-pages)
11. [Deliverable 8: Documentation Portal](#11-deliverable-8-documentation-portal)
12. [Deliverable 9: SEO and Performance](#12-deliverable-9-seo-and-performance)
13. [Deliverable 10: Backend API Endpoints](#13-deliverable-10-backend-api-endpoints)
14. [Testing Requirements](#14-testing-requirements)
15. [Risk Assessment](#15-risk-assessment)
16. [Definition of Done](#16-definition-of-done)
17. [Connection to Next Phase](#17-connection-to-next-phase)

---

## 1. Phase Overview

Phase 11 builds the entire public-facing surface of Scrapifie. This includes the marketing website (landing, pricing, about, contact), the blog (consuming posts created by admins in Phase 10), the status page (consuming status data set by admins in Phase 10), all legal pages (Terms of Service, Privacy Policy, Acceptable Use Policy, Cookie Policy, Data Processing Agreement), and the full documentation portal (quickstart, guides, API reference, changelog).

These pages do not require authentication. They serve as the front door for prospective users, the legal backbone for the business, and the self-service technical resource for developers.

### What Exists Before Phase 11

- Everything from Phases 1-10 (complete scraping engine, user dashboard, admin dashboard)
- Blog post CRUD via admin panel (Phase 10) -- posts exist in database but have no public rendering
- Status page management via admin panel (Phase 10) -- service statuses and incidents exist in database but have no public display
- User registration and login flows (Phase 6) -- available but not yet linked from a public navbar
- Pricing plans configured in the system (Phase 8) -- plan details exist but no public pricing page
- React + Vite SPA with routing infrastructure (Phase 7)
- Theme system with light/dark mode (Phase 7)
- Component library built for dashboard (Phase 7)

### What Exists After Phase 11

- Global public header with navigation links and auth-aware state (Sign In/Dashboard toggle)
- Global public footer with link columns and legal links
- Landing page with hero, social proof, features, how it works, code example, pricing summary, testimonials, and final CTA
- Pricing page with billing toggle, plan cards, feature comparison, credit pricing, credit packs, and FAQ
- About page with mission, what we do, and values
- Contact page with validated form, honeypot spam protection, CSRF token, and contact info panel
- Blog listing page with tag filters and pagination
- Blog post page with Markdown rendering, share buttons, and related posts
- Status page with per-service status indicators, uptime bars, incident history, and subscribe-to-updates
- Terms of Service page
- Privacy Policy page
- Acceptable Use Policy page
- Cookie Policy page
- Data Processing Agreement page
- Cookie consent banner and preference modal
- Documentation portal with left sidebar, content area, and right-side table of contents
- Quickstart guide (5-step onboarding)
- Guides section (engine selection, error handling, proxy usage, pagination, rate limits, and more)
- API reference section (all endpoints with two-column layout)
- Changelog page
- Documentation search (Cmd+K within docs)
- SEO meta tags, Open Graph tags, structured data, and sitemap
- Pre-rendering configuration for SPA SEO

---

## 2. Goals and Success Criteria

### Goals

| # | Goal |
|---|------|
| G1 | A visitor can understand what Scrapifie does within 5 seconds of landing |
| G2 | A visitor can compare plans and start a free account from the pricing page |
| G3 | All legal documents are accessible and version-managed |
| G4 | Cookie consent is collected before any non-essential cookies are set |
| G5 | Blog posts published by admins render correctly on the public blog |
| G6 | Service status set by admins displays correctly on the public status page |
| G7 | A developer can go from zero to first API call within 5 minutes using the quickstart |
| G8 | Documentation search returns relevant results within 200ms |
| G9 | All public pages score 95+ on Lighthouse for performance, accessibility, best practices, and SEO |
| G10 | All public pages are fully responsive from 320px to 2560px viewports |

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Landing page renders all 8 sections correctly | Visual regression test passes at 3 viewports |
| Pricing page displays correct plan data from configuration | Integration test verifies plan details match |
| Contact form submits successfully with validation | E2E test fills form and verifies submission |
| Blog listing loads published posts with pagination | Integration test returns correct posts |
| Blog post renders Markdown content correctly | Unit test verifies Markdown rendering |
| Status page shows current service statuses | Integration test verifies status display |
| All 5 legal pages render with sidebar TOC | Visual regression test passes |
| Cookie consent banner appears on first visit | E2E test verifies banner and preference storage |
| Docs portal sidebar navigation works across all sections | E2E test navigates docs |
| Docs search returns results for known terms | Unit test verifies search index |
| Lighthouse performance score is 95+ | Automated Lighthouse audit in CI |
| All previous Phase 10 tests pass | Regression suite passes |

---

## 3. Prerequisites Check

Before starting Phase 11, verify:

| Check | How to Verify |
|-------|--------------|
| Phase 10 Definition of Done met | All 27 criteria from PHASE-10.md Section 15 confirmed |
| Blog posts exist in database | Admin creates at least 2 test posts with published status |
| Status page data exists | Admin sets service statuses and creates a test incident |
| Plan configuration is accessible | Verify billing plans return correct data from API |
| Registration and login routes work | Navigate to /register and /login, verify forms render |
| Component library available | Verify shared components (buttons, cards, modals) render correctly |
| Git branch created | Create phase-11/public-website branch from main |

---

## 4. Deliverable 1: Public Website Layout and Navigation

**Reference Document:** 01-PUBLIC-WEBSITE.md Section 2

### Task 4.1: Global Header (Navbar)

Build the persistent top navigation bar for all public pages.

| Element | Specification |
|---------|---------------|
| Position | Fixed to top of viewport, full width |
| Height | 64px desktop, 56px mobile |
| Background | Semi-transparent with backdrop blur (activates on scroll past 20px) |
| Z-index | Highest layer (above all page content) |
| Logo | Scrapifie wordmark, left-aligned, links to / |
| Navigation links (desktop) | Features, Pricing, Docs, Blog, Status -- horizontal row, center or left-of-center |
| Auth area (desktop, unauthenticated) | "Sign In" text link + "Get Started" primary button, right-aligned |
| Auth area (desktop, authenticated) | User avatar (32px circle) + "Dashboard" text link, right-aligned |
| Mobile menu trigger | Hamburger icon button, right-aligned, visible below 768px |
| Mobile menu | Full-screen overlay sliding from right, all nav links stacked vertically, auth buttons at bottom |
| Active link indicator | Underline or color change on the link matching the current route |
| Skip to content | Hidden link before navbar, visible on keyboard focus, jumps to main content area |

**Implementation steps:**

- Create a PublicHeader component
- Detect authentication state from auth context (built in Phase 7)
- If authenticated, show avatar and Dashboard link; otherwise show Sign In and Get Started
- Add scroll listener to toggle backdrop blur class when scrolled past 20px
- Add mobile menu state toggle (open/close)
- Render mobile overlay with navigation links when open
- Trap focus within mobile menu when open
- Close mobile menu on Escape key, on outside click, and on link navigation
- Add aria-expanded to hamburger button, aria-label to navigation landmark

### Task 4.2: Global Footer

Build the footer displayed on all public pages.

| Element | Specification |
|---------|---------------|
| Background | Darker surface color from theme (distinct from page background) |
| Layout (desktop) | 4 columns of links + bottom bar |
| Layout (mobile) | Accordion sections for each column, bottom bar below |
| Column 1: Product | Features, Pricing, Status, Changelog |
| Column 2: Developers | Documentation, API Reference, Quickstart, SDKs |
| Column 3: Company | About, Blog, Contact, Careers (placeholder) |
| Column 4: Legal | Terms of Service, Privacy Policy, Acceptable Use, Cookie Policy, DPA |
| Bottom bar | Copyright notice with current year (dynamic), social media icon links (placeholder hrefs) |
| Link behavior | All internal links use client-side routing, external links open in new tab with rel="noopener noreferrer" |
| Accessibility | Each column heading is a heading element (h3), accordion buttons have aria-expanded, links have descriptive text (no "click here") |

**Implementation steps:**

- Create a PublicFooter component
- Define footer link data as a constant array of sections, each with a title and array of link objects (label, href, external boolean)
- Render 4-column grid on desktop (min-width 768px)
- Render accordion on mobile (each section collapsed by default, clicking heading toggles open/close)
- Render bottom bar with dynamic year and social icon links
- Apply theme-aware colors using CSS variables

### Task 4.3: Public Page Layout Wrapper

Create a layout wrapper that wraps all public pages with the header and footer.

| Element | Specification |
|---------|---------------|
| Structure | PublicHeader + main content area + PublicFooter |
| Content area | Max width 1280px centered, horizontal padding 24px (16px on mobile) |
| Content top padding | 64px (header height) to prevent content hiding behind fixed header |
| Scroll restoration | Scroll to top on route change |
| Page transition | No animated transitions (instant swap) |
| SEO | Each page sets its own document title and meta tags via a shared hook or head manager |

**Implementation steps:**

- Create a PublicLayout component that renders header, an Outlet (React Router), and footer
- Add a scroll-to-top effect on route changes
- Create a usePageMeta hook that updates document.title and meta description on mount
- Register all public routes under the PublicLayout in the router configuration

---

## 5. Deliverable 2: Landing Page

**Reference Document:** 01-PUBLIC-WEBSITE.md Section 3

### Task 5.1: Hero Section

| Element | Specification |
|---------|---------------|
| Layout | Centered text content with optional illustration/graphic to the right on desktop, stacked on mobile |
| Headline | Large heading (h1), maximum 10 words, communicates core value proposition |
| Subheadline | 1-2 sentences below headline explaining what Scrapifie does in plain language |
| Primary CTA | "Get Started Free" button, links to /register |
| Secondary CTA | "View Documentation" text link, links to /docs |
| Visual | Abstract illustration or code-themed graphic (SVG or static image), decorative only (empty alt text) |
| Background | Subtle gradient or pattern using theme colors, not a photograph |
| Spacing | Generous vertical padding (120px top, 80px bottom on desktop; 80px top, 48px bottom on mobile) |

### Task 5.2: Social Proof Bar

| Element | Specification |
|---------|---------------|
| Position | Immediately below hero |
| Content | Horizontal row of partner/client logos or metric badges (e.g., "10,000+ API calls served") |
| Layout | Centered, evenly spaced, wraps on mobile |
| Styling | Logos in monochrome (grayscale filter), subtle opacity, no color |
| Note | Use placeholder content for launch; replace with real logos/metrics as they become available |

### Task 5.3: Features Section

| Element | Specification |
|---------|---------------|
| Layout | 3-column grid on desktop, single column on mobile |
| Cards per row | 3 (desktop), 1 (mobile) |
| Total cards | 6 feature cards (two rows of 3 on desktop) |
| Card content | Icon (monochrome SVG), heading (h3), 2-3 sentence description |
| Features to highlight | Three scraping engines, proxy rotation, anti-detection, structured data output, rate limiting/scheduling, geographic targeting |
| Card style | No border, subtle background difference from page, rounded corners, consistent padding |
| Interaction | No click action -- purely informational |

### Task 5.4: How It Works Section

| Element | Specification |
|---------|---------------|
| Layout | 3 numbered steps in a horizontal row (desktop), vertical stack (mobile) |
| Step 1 | "Get your API key" -- describe signup and key creation |
| Step 2 | "Send a request" -- describe making an API call with URL and engine choice |
| Step 3 | "Get your data" -- describe receiving structured results |
| Visual connector | Horizontal line or arrow connecting steps on desktop; vertical line on mobile |
| Step format | Large number (1, 2, 3), heading, 1-sentence description |

### Task 5.5: Code Example Section

| Element | Specification |
|---------|---------------|
| Layout | Two-column on desktop (description left, code right), stacked on mobile |
| Left side | Heading, brief explanation of how simple the API is, bullet points highlighting key features |
| Right side | Code block showing a sample API request and response |
| Code tabs | cURL, JavaScript, Python -- tabbed interface with persistent selection (stored in localStorage) |
| Code styling | Syntax highlighted, dark background regardless of theme, line numbers, copy button |
| Code content | A simple POST request to /v1/scrape with URL and engine, followed by a truncated response showing status and extracted data |

### Task 5.6: Pricing Summary Section

| Element | Specification |
|---------|---------------|
| Layout | 3 plan cards side by side (desktop), stacked (mobile) |
| Cards | Free, Pro, Enterprise -- showing plan name, price, credit count, 3-4 key features each |
| CTA per card | Free: "Start Free", Pro: "Start Free Trial" or "Get Started", Enterprise: "Contact Sales" |
| Link | "See full comparison" text link below cards, links to /pricing |
| Style | Pro card visually elevated (slightly larger, border accent, "Popular" badge) |
| Billing toggle | NOT shown here (only on the full pricing page) |

### Task 5.7: Testimonials Section

| Element | Specification |
|---------|---------------|
| Layout | Horizontal carousel or 3-card grid |
| Card content | Quote text, author name, author title/company, avatar (placeholder image) |
| Card count | 3 visible at a time on desktop, 1 on mobile with swipe/dots |
| Note | Use placeholder testimonials for launch, replace with real ones when available |
| Accessibility | Carousel has pause button, respects prefers-reduced-motion, dots/arrows are keyboard accessible |

### Task 5.8: Final CTA Section

| Element | Specification |
|---------|---------------|
| Layout | Full-width banner with centered content |
| Content | Heading ("Ready to start scraping?"), subtext (1 sentence), primary CTA button ("Get Started Free") |
| Background | Distinct from page background (accent gradient or darker surface) |
| Spacing | Generous vertical padding (80px desktop, 48px mobile) |

**Implementation steps for all landing page tasks:**

- Create a LandingPage component composed of the 8 section sub-components
- Each section is its own component for maintainability
- All text content comes from a constants file (not hardcoded in JSX)
- All sections are responsive using Tailwind breakpoint utilities
- Set page meta: title "Scrapifie -- Web Scraping API", description summarizing the value proposition
- Add structured data (Organization schema) via a script tag in the head manager

---

## 6. Deliverable 3: Pricing Page

**Reference Document:** 01-PUBLIC-WEBSITE.md Section 4

### Task 6.1: Billing Toggle

| Element | Specification |
|---------|---------------|
| Position | Top of pricing section, centered |
| Options | "Monthly" and "Annual" |
| Style | Segmented control or toggle switch with label |
| Default | Monthly selected |
| Behavior | Switching updates all plan card prices and the CTA text to reflect the selected interval |
| Annual discount | Display "Save X%" badge next to the Annual option |
| URL sync | Add ?billing=annual query parameter so the selection is shareable and bookmarkable |

### Task 6.2: Plan Cards

| Element | Specification |
|---------|---------------|
| Layout | 3 cards side by side (desktop), stacked (mobile) |
| Card content | Plan name, price (with /mo or /yr suffix), credit allocation, list of included features |
| Free card | $0/mo, 1,000 credits, feature list from plan comparison, CTA: "Get Started Free" linking to /register |
| Pro card | $49/mo ($XX/yr based on discount), 50,000 credits, feature list, CTA: "Get Started" linking to /register, visually emphasized (border, "Most Popular" badge) |
| Enterprise card | "Custom" price, custom credits, feature list, CTA: "Contact Sales" linking to /contact with subject pre-filled |
| Feature list per card | Checkmark icon + feature text, 6-8 features per card, features not included shown with X icon and muted text |

### Task 6.3: Feature Comparison Table

| Element | Specification |
|---------|---------------|
| Position | Below plan cards |
| Layout | Full-width table with plan names as column headers |
| Rows | All differentiating features grouped by category (limits, engines, support, data retention, security) |
| Cell content | Checkmark for included, X for not included, specific values (e.g., "5 keys", "90 days") for quantitative features |
| Feature categories | General, API Access, Scraping Engines, Rate Limits, Data, Support |
| Responsive | On mobile, switch to a stacked card view (one card per plan listing all features) or a horizontally scrollable table |
| Sticky header | Plan name row sticks to top when scrolling through the table |

Feature rows to include:

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Monthly credits | 1,000 | 50,000 | Custom |
| API keys | 1 | 5 | Unlimited |
| HTTP engine | Yes | Yes | Yes |
| Browser engine | No | Yes | Yes |
| Stealth engine | No | Yes | Yes |
| Requests per minute | 10 | 100 | Custom |
| Concurrent jobs | 2 | 10 | Custom |
| Data retention (results) | 7 days | 30 days | 90 days |
| Data retention (logs) | 30 days | 90 days | 1 year |
| Screenshot capture | No | Yes | Yes |
| IP whitelisting | No | Yes | Yes |
| Priority support | No | Yes | Yes |
| Dedicated account manager | No | No | Yes |
| SLA guarantee | No | No | Yes |
| Custom rate limits | No | No | Yes |

### Task 6.4: Credit Pricing Section

| Element | Specification |
|---------|---------------|
| Position | Below feature comparison table |
| Content | Explanation of the credit system: how credits work, cost per engine |
| Table | Engine name, credits per request, description |
| Engine table rows | HTTP: 1 credit, Browser: 5 credits, Stealth: 10 credits |
| Additional note | Credits reset each billing cycle. Credits do not roll over. |

### Task 6.5: Credit Packs Section

| Element | Specification |
|---------|---------------|
| Position | Below credit pricing |
| Content | Explanation that Pro and Enterprise users can purchase additional credit packs |
| Table | Pack name, credits, price, price per 1k credits |
| Pack rows | Small: 10,000 credits / $15, Medium: 25,000 credits / $30, Large: 50,000 credits / $50 |
| Note | Credit packs are one-time purchases. Pack credits do not roll over to the next billing cycle. Maximum 5 packs per billing cycle. |
| CTA | "Available on Pro and Enterprise plans" with link to registration |

### Task 6.6: FAQ Accordion

| Element | Specification |
|---------|---------------|
| Position | Bottom of pricing page |
| Layout | Accordion with question as the toggle, answer as the expandable content |
| Default state | All collapsed |
| Behavior | Clicking a question expands its answer and collapses any other open answer (single-open mode) |
| Accessibility | Button role on question, aria-expanded, aria-controls pointing to answer panel, answer panel has role="region" |
| FAQ count | 8-10 questions covering: what are credits, do credits roll over, can I upgrade mid-cycle, what happens when I run out, what payment methods, can I cancel anytime, is there a free trial, what is the refund policy, what engines are available, enterprise custom pricing |

**Implementation steps for pricing page:**

- Create a PricingPage component composed of the sub-sections
- Fetch plan data from an API endpoint or a static configuration constant (same data used by the billing system in Phase 8)
- Billing toggle state controls which prices are displayed
- Sync billing toggle to URL query parameter
- Set page meta: title "Pricing -- Scrapifie", description about transparent pricing
- Add structured data (Product schema with pricing offers)

---

## 7. Deliverable 4: About and Contact Pages

**Reference Document:** 01-PUBLIC-WEBSITE.md Sections 5 and 6

### Task 7.1: About Page

| Section | Specification |
|---------|---------------|
| Hero | Heading "About Scrapifie", 2-3 sentence mission statement |
| What we do | 1-2 paragraphs explaining what Scrapifie provides and for whom |
| Values cards | 3-4 value cards in a grid (e.g., Reliability, Transparency, Developer-First, Privacy-Respecting), each with icon, heading, and 2-sentence description |
| Layout | Single column, centered content, max-width 720px for text sections, wider for cards grid |
| Page meta | Title "About -- Scrapifie", description about the company mission |

### Task 7.2: Contact Page

| Section | Specification |
|---------|---------------|
| Layout | Two-column on desktop (form left, contact info right), stacked on mobile |
| Form fields | Name (required, 2-100 chars), Email (required, valid email format), Subject dropdown (General Inquiry, Sales, Support, Partnership, Other), Message (required, 10-2000 chars) |
| Honeypot | Hidden field (CSS display:none) named "website" -- if filled, silently reject the submission without showing an error |
| CSRF token | Include CSRF token from session in the form submission |
| Validation | Client-side validation on blur and on submit; server-side validation mirrors client-side rules |
| Submit button | "Send Message" with loading state during submission |
| Success state | Replace form with success message: "Thank you for reaching out. We'll get back to you within 2 business days." with a "Send another message" link to reset the form |
| Error state | Inline error messages below each invalid field; generic toast for server errors |
| Rate limiting | Maximum 3 submissions per hour per IP; if exceeded, show message "You've sent too many messages. Please try again later." |
| Contact info panel | Email address (support@scrapifie.com placeholder), response time expectation ("Within 2 business days"), link to documentation ("Check our docs first"), link to status page ("Current system status") |
| Page meta | Title "Contact -- Scrapifie", description about getting in touch |

**Backend endpoint for contact form:**

| Detail | Value |
|--------|-------|
| Method and path | POST /api/v1/contact |
| Request body | name, email, subject, message, _csrf, website (honeypot) |
| Validation | All fields validated server-side; honeypot checked first |
| Action on success | Store contact submission in database; optionally send notification email to admin |
| Response | 200 with success message |
| Rate limit | 3 per hour per IP |

---

## 8. Deliverable 5: Blog

**Reference Document:** 01-PUBLIC-WEBSITE.md Section 7, 14-ADMIN-MODERATION.md (blog management)

### Task 8.1: Blog Listing Page

| Element | Specification |
|---------|---------------|
| Route | /blog |
| Layout | Content area max-width 960px centered |
| Header | "Blog" heading, optional subtitle about what topics are covered |
| Post cards | Vertical list of post cards, 10 per page |
| Card content | Title (linked to post), publication date, author name, excerpt (first 160 characters of content or explicit excerpt field), tag badges, estimated read time |
| Card image | Featured image if present, placeholder graphic if not |
| Tag filter | Horizontal row of tag buttons above the list; clicking a tag filters to posts with that tag; "All" button clears filter; active tag is visually highlighted; filter syncs to URL query parameter (?tag=guides) |
| Pagination | Standard pagination component below the list (from Phase 7 global components), showing page numbers, previous/next, total count |
| Empty state | If no posts match filter: "No posts found for this topic." with CTA to clear filter |
| Data source | Fetched from API endpoint that returns published blog posts only (excludes drafts and archived) |
| Sorting | Newest first (by publication date) |
| Page meta | Title "Blog -- Scrapifie", description about developer content and updates |

### Task 8.2: Blog Post Page

| Element | Specification |
|---------|---------------|
| Route | /blog/:slug |
| Layout | Content area max-width 720px centered, right-side TOC on desktop (200px) |
| Header | Title (h1), publication date, author name, estimated read time, tag badges |
| Featured image | Full-width image below header if present |
| Content | Markdown rendered to HTML, supporting headings (h2-h4), paragraphs, lists, code blocks with syntax highlighting, images, blockquotes, tables, horizontal rules |
| Table of contents | Auto-generated from h2/h3 headings in content, sticky on desktop right sidebar, hidden on mobile (collapsible at top) |
| Share buttons | At bottom of post: copy link button, Twitter/X share (opens share intent URL), LinkedIn share (opens share intent URL) |
| Related posts | Below content: "Related Posts" section showing up to 3 posts that share tags with the current post |
| Navigation | "Previous Post" and "Next Post" links at the bottom (chronological order) |
| 404 handling | If slug not found or post is not published, render a 404 page with link back to /blog |
| SEO | Open Graph tags with post title, excerpt, featured image; article structured data with datePublished, author, tags |

### Task 8.3: Blog API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| /api/v1/blog/posts | GET | List published posts with pagination and tag filter | No |
| /api/v1/blog/posts/:slug | GET | Get single published post by slug | No |
| /api/v1/blog/tags | GET | List all tags used by published posts | No |

Query parameters for listing endpoint:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 10 | Posts per page (max 20) |
| tag | string | (none) | Filter by tag slug |

Response fields per post:

| Field | Description |
|-------|-------------|
| id | Post UUID |
| title | Post title |
| slug | URL-safe slug |
| excerpt | Short summary (160 chars max) |
| content | Full Markdown content (only on single post endpoint) |
| featured_image_url | URL to featured image or null |
| author_name | Name of the admin who wrote the post |
| tags | Array of tag objects (id, name, slug) |
| published_at | ISO 8601 timestamp |
| estimated_read_time | Integer, minutes |
| created_at | ISO 8601 timestamp |
| updated_at | ISO 8601 timestamp |

---

## 9. Deliverable 6: Status Page

**Reference Document:** 01-PUBLIC-WEBSITE.md Section 8, 14-ADMIN-MODERATION.md (status management)

### Task 9.1: Status Page

| Element | Specification |
|---------|---------------|
| Route | /status |
| Layout | Single column, max-width 800px centered |
| Overall status banner | Large banner at top showing overall system status (Operational, Degraded Performance, Partial Outage, Major Outage) with color indicator (green, yellow, orange, red) and descriptive text |
| Service list | Vertical list of individual services, each showing: service name, current status indicator (colored dot + text), 90-day uptime percentage |
| Services | API Gateway, HTTP Engine, Browser Engine, Stealth Engine, Dashboard, Database |
| Uptime bars | For each service, a horizontal bar showing 90 days of daily uptime (green = 100%, yellow = partial, red = outage, gray = no data), hovering a day shows tooltip with date and uptime percentage |
| Incident history | Below service list: chronological list of incidents (most recent first) showing date, title, severity, current status, and timeline of updates |
| Incident detail | Each incident is expandable or is its own card showing: title, severity badge, status (Investigating, Identified, Monitoring, Resolved), timeline of status updates with timestamps and descriptions |
| Scheduled maintenance | Section above incidents showing upcoming maintenance windows with date/time, expected duration, affected services, and description |
| Subscribe | "Subscribe to Updates" section with email input; when submitted, stores email for status notification distribution |
| Empty state | If no incidents: "No incidents reported. All systems operational." |
| Data refresh | Page polls for status updates every 60 seconds; status changes trigger an immediate visual update |
| Page meta | Title "System Status -- Scrapifie", description about current system health |

### Task 9.2: Status Page API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| /api/v1/status | GET | Overall status and per-service statuses | No |
| /api/v1/status/incidents | GET | Recent incidents with updates (last 90 days) | No |
| /api/v1/status/uptime | GET | Per-service daily uptime for the last 90 days | No |
| /api/v1/status/maintenance | GET | Upcoming scheduled maintenance windows | No |
| /api/v1/status/subscribe | POST | Subscribe email to status updates | No |

Subscribe endpoint details:

| Detail | Value |
|--------|-------|
| Request body | email (required, valid email format) |
| Validation | Email format, not already subscribed |
| Rate limit | 5 per hour per IP |
| Response | 200 with confirmation message |

---

## 10. Deliverable 7: Legal Pages

**Reference Document:** 02-LEGAL-FRAMEWORK.md

### Task 10.1: Legal Page Layout Component

All legal pages share a common layout:

| Element | Specification |
|---------|---------------|
| Layout | Left sidebar TOC (200px) + content area (max-width 720px) on desktop; stacked on mobile with collapsible TOC at top |
| TOC generation | Auto-generated from h2 headings in the legal document content |
| TOC behavior | Sticky on desktop; highlights the section currently in the viewport (scroll spy); clicking a TOC item smooth-scrolls to that section |
| Content typography | Body text at readable size (16px / 1rem), generous line height (1.7), heading hierarchy (h1 for title, h2 for sections, h3 for subsections) |
| Version info | Below the title: "Last updated: [date]" and "Version [X.Y.Z]" |
| Version history link | "View version history" link that shows a modal or section with a table of previous versions (date, version number, summary of changes) |
| Print styling | Clean print layout without sidebar, navigation, or footer; content fills page width; all text in black on white |
| Related links | At the bottom of each legal page: links to other legal documents |

### Task 10.2: Terms of Service Page

| Detail | Specification |
|--------|---------------|
| Route | /legal/terms |
| Title | "Terms of Service" |
| Content source | Stored as Markdown in the repository, rendered client-side |
| Sections (from 02-LEGAL-FRAMEWORK.md) | Acceptance of Terms, Definitions, Account Registration, Use of the Service, Plans Billing and Credits, Intellectual Property, Data and Privacy, Disclaimers and Limitation of Liability, Indemnification, Termination, Modifications to Terms, Governing Law, General Provisions |
| Jurisdiction placeholder | All jurisdiction references use "[Governing Jurisdiction]" placeholder text |
| Page meta | Title "Terms of Service -- Scrapifie" |

### Task 10.3: Privacy Policy Page

| Detail | Specification |
|--------|---------------|
| Route | /legal/privacy |
| Title | "Privacy Policy" |
| Sections | Data We Collect, How We Use Your Data, Data Sharing, Data Retention, Security Measures, Your Rights, International Data Transfers, Children's Privacy, Changes to This Policy, Contact Information |
| Data tables | Include tables listing: types of data collected with purpose and legal basis; retention periods per data type; user rights with how to exercise them |
| Page meta | Title "Privacy Policy -- Scrapifie" |

### Task 10.4: Acceptable Use Policy Page

| Detail | Specification |
|--------|---------------|
| Route | /legal/acceptable-use |
| Title | "Acceptable Use Policy" |
| Sections | Permitted Uses, Prohibited Uses (11 categories from 02-LEGAL-FRAMEWORK.md), Rate and Volume Guidelines, Enforcement Actions (warning, rate limit, temporary suspension, permanent suspension, legal referral), Reporting Violations |
| Enforcement ladder | Displayed as a visual progression (numbered steps or vertical timeline) |
| Page meta | Title "Acceptable Use Policy -- Scrapifie" |

### Task 10.5: Cookie Policy Page

| Detail | Specification |
|--------|---------------|
| Route | /legal/cookies |
| Title | "Cookie Policy" |
| Sections | What Are Cookies, Cookies We Use, Managing Your Preferences, Changes to This Policy |
| Cookie table | 3 categories: Necessary (always on, listed with name, purpose, expiry), Functional (optional, listed similarly), Analytics (optional, listed similarly); NO marketing cookies |
| Preference link | "Manage cookie preferences" link that opens the cookie preference modal (same modal from the cookie consent banner) |
| Page meta | Title "Cookie Policy -- Scrapifie" |

### Task 10.6: Data Processing Agreement Page

| Detail | Specification |
|--------|---------------|
| Route | /legal/dpa |
| Title | "Data Processing Agreement" |
| Sections | Definitions, Roles (controller vs processor), Processor Obligations, Sub-Processors, Data Subject Rights, Cross-Border Transfers, Security Measures, Duration and Termination, Liability |
| Note | This page is informational for transparency. Actual DPA signing is handled offline for Enterprise customers. |
| Page meta | Title "Data Processing Agreement -- Scrapifie" |

### Task 10.7: Cookie Consent Banner

| Element | Specification |
|---------|---------------|
| Trigger | Appears on first visit if no cookie preference is stored |
| Position | Fixed to bottom of viewport, full width, above footer |
| Content | Brief text explaining the site uses cookies, with links to Cookie Policy |
| Buttons | "Accept All" (primary), "Manage Preferences" (secondary), "Reject Non-Essential" (text link) |
| Accept All behavior | Sets all cookie categories to accepted, stores preference, dismisses banner |
| Reject Non-Essential | Accepts only necessary cookies, stores preference, dismisses banner |
| Manage Preferences | Opens cookie preference modal |
| Preference modal | Lists 3 cookie categories with toggle switches; Necessary is always on and disabled; Functional and Analytics are toggleable; "Save Preferences" button stores selection and dismisses both modal and banner |
| Storage | Cookie preference stored in a cookie (necessary category) with 1-year expiry |
| Subsequent visits | Banner does not appear if preference cookie exists; user can re-open preferences from Cookie Policy page or a footer link |
| Accessibility | Banner has role="dialog", aria-label, focus trapped within banner when visible, Escape key opens preferences modal rather than dismissing |

---

## 11. Deliverable 8: Documentation Portal

**Reference Document:** 17-DOCS-PORTAL.md

### Task 11.1: Documentation Layout

| Element | Specification |
|---------|---------------|
| Route prefix | /docs/* |
| Layout (desktop) | Left sidebar (260px) + content area (max 720px) + right TOC (200px) |
| Layout (tablet) | Sidebar becomes a drawer (triggered by hamburger button), TOC becomes a floating button that opens a dropdown |
| Layout (mobile) | Full-width content, sidebar as full-screen drawer, TOC as collapsible section at top of content |
| Sidebar | Tree navigation grouped by section (Getting Started, Guides, API Reference, SDKs, Changelog), collapsible groups, active page highlighted, scrollable if content exceeds viewport |
| Right TOC | Auto-generated from h2/h3 headings in the current page content, sticky, scroll-spy highlighting |
| Content area | Markdown rendered with consistent typography, 16px body, code blocks with syntax highlighting |
| Breadcrumbs | Below the content area top: "Docs > [Section] > [Page Title]" |
| Previous / Next | Navigation links at the bottom of each page, determined by the linear order defined in the sidebar |
| Search trigger | Cmd+K (or Ctrl+K on non-Mac) opens the documentation search modal |

### Task 11.2: Documentation Content Files

All documentation content is stored as Markdown files in the repository with frontmatter metadata.

Frontmatter fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Page title displayed as h1 and in browser tab |
| description | string | Yes | Short description for meta tags (max 160 chars) |
| section | string | Yes | Section grouping (getting-started, guides, api-reference, sdks, changelog) |
| order | integer | Yes | Sort order within section |
| last_updated | date | Yes | Date of last content update |
| tags | array | No | Tags for search relevance |
| related | array | No | Slugs of related doc pages for cross-linking |

Content map (pages to create):

| Section | Page | Slug | Order |
|---------|------|------|-------|
| Getting Started | Introduction | /docs/introduction | 1 |
| Getting Started | Quickstart | /docs/quickstart | 2 |
| Getting Started | Authentication | /docs/authentication | 3 |
| Guides | Choosing an Engine | /docs/guides/choosing-engine | 1 |
| Guides | HTTP Engine | /docs/guides/http-engine | 2 |
| Guides | Browser Engine | /docs/guides/browser-engine | 3 |
| Guides | Stealth Engine | /docs/guides/stealth-engine | 4 |
| Guides | Handling Errors | /docs/guides/error-handling | 5 |
| Guides | Using Proxies | /docs/guides/proxies | 6 |
| Guides | Pagination and Crawling | /docs/guides/pagination | 7 |
| Guides | Rate Limits | /docs/guides/rate-limits | 8 |
| Guides | Webhooks (Future) | /docs/guides/webhooks | 9 |
| API Reference | Overview | /docs/api/overview | 1 |
| API Reference | POST /v1/scrape | /docs/api/scrape | 2 |
| API Reference | GET /v1/scrape/:id | /docs/api/scrape-status | 3 |
| API Reference | GET /v1/scrape/:id/result | /docs/api/scrape-result | 4 |
| API Reference | GET /v1/account | /docs/api/account | 5 |
| API Reference | GET /v1/account/usage | /docs/api/account-usage | 6 |
| API Reference | GET /v1/keys | /docs/api/keys | 7 |
| API Reference | POST /v1/keys | /docs/api/keys-create | 8 |
| API Reference | DELETE /v1/keys/:id | /docs/api/keys-delete | 9 |
| SDKs | JavaScript SDK | /docs/sdks/javascript | 1 |
| SDKs | Python SDK | /docs/sdks/python | 2 |
| Changelog | Changelog | /docs/changelog | 1 |

### Task 11.3: Quickstart Page

The quickstart is the most important documentation page. It must get a developer from zero to their first successful API call in 5 minutes.

| Step | Title | Content |
|------|-------|---------|
| 1 | Create an account | Link to /register, brief instructions, mention free plan requires no credit card |
| 2 | Get your API key | Navigate to API Keys page in dashboard, click Create Key, copy the key (emphasize: you can only see it once) |
| 3 | Make your first request | Code example showing a POST to /v1/scrape with the API key header and a URL in the body, in 3 tabs: cURL, JavaScript (fetch), Python (requests) |
| 4 | Check the job status | Code example showing a GET to /v1/scrape/:id to poll for completion |
| 5 | Get the results | Code example showing a GET to /v1/scrape/:id/result, sample response showing HTML content |
| After | Next steps | Links to: choosing an engine guide, error handling guide, API reference overview |

Content rules for the quickstart:

- Every code example must be copy-paste ready (no placeholder values that would break if not replaced, except for the API key which uses "YOUR_API_KEY" and is called out explicitly)
- Include expected responses after each request example
- Callout boxes for important notes (e.g., "Your API key is shown only once. Copy it immediately.")
- Estimated time per step shown (e.g., "~30 seconds")
- No assumed knowledge -- explain what an API key is, what a POST request is

### Task 11.4: API Reference Pages

Each API endpoint page follows a two-column layout:

| Side | Content |
|------|---------|
| Left (description) | Endpoint method and path, description, authentication requirements, parameter table (name, type, required, default, description), response field descriptions, error responses |
| Right (examples) | Request example in 3 languages (tabbed), response example (JSON), error response examples |

API conventions documented on the overview page:

| Convention | Detail |
|------------|--------|
| Base URL | Configurable via environment, e.g., https://api.scrapifie.com |
| Authentication | API key in X-API-Key header |
| Content type | application/json for requests and responses |
| HTTP methods | POST for creating jobs, GET for reading data, DELETE for removing resources |
| Pagination | page and limit query parameters, response includes total, page, limit, has_more |
| Rate limiting | X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers |
| Errors | Consistent JSON error format with error object containing code, message, and optional details |
| Idempotency | X-Idempotency-Key header for POST requests |
| Versioning | Version in URL path (/v1/), current version is v1 |
| Status codes | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error, 503 Service Unavailable |

POST /v1/scrape parameter table:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| url | string | Yes | -- | The URL to scrape. Must be a valid HTTP or HTTPS URL. |
| engine | string | No | http | Scraping engine to use: "http", "browser", or "stealth" |
| format | string | No | html | Response format: "html", "json", "text", "markdown" |
| wait_for | string | No | -- | CSS selector to wait for before capturing content (browser/stealth only) |
| timeout | integer | No | 30000 | Request timeout in milliseconds (5000-120000) |
| headers | object | No | -- | Custom HTTP headers to send with the request |
| cookies | array | No | -- | Custom cookies to set before making the request |
| proxy_country | string | No | -- | ISO 3166-1 alpha-2 country code for geo-targeted proxy |
| screenshot | boolean | No | false | Whether to capture a screenshot (browser/stealth only) |
| javascript | boolean | No | true | Whether to execute JavaScript (browser/stealth only) |
| block_resources | array | No | -- | Resource types to block: "image", "stylesheet", "font", "media", "script" |
| viewport | object | No | -- | Viewport dimensions: width (integer), height (integer) |
| user_agent | string | No | -- | Custom user agent string |
| callback_url | string | No | -- | Webhook URL for async job completion notification (future feature) |

### Task 11.5: Documentation Search

| Element | Specification |
|---------|---------------|
| Trigger | Cmd+K (Mac) or Ctrl+K (Windows/Linux) from any docs page, or click search icon in docs top bar |
| Modal | Centered modal with search input at top, results below, grouped by section |
| Search method | Client-side full-text search using a build-time index |
| Index generation | At build time, process all Markdown doc files, extract title, headings, and body text, generate a search index JSON file |
| Index loading | Lazy-loaded on first search trigger (not loaded on page load) |
| Index size target | Under 500KB compressed |
| Ranking | Title matches ranked highest, then heading matches, then body text matches |
| Results display | Max 10 results, each showing: page title, section name, matching text snippet with query highlighted |
| Debounce | 200ms debounce on input |
| Keyboard navigation | Arrow keys to move through results, Enter to navigate to selected result, Escape to close |
| No results | "No results found for [query]. Try a different search term." |
| Analytics | Log search queries (anonymized, no user identity) to identify documentation gaps |

### Task 11.6: Changelog Page

| Element | Specification |
|---------|---------------|
| Route | /docs/changelog |
| Layout | Reverse-chronological list of changes |
| Entry format | Date, version (e.g., v1.2.0), category badge (Added, Changed, Deprecated, Fixed, Removed), description of change, optional migration notes |
| Category badge colors | Added: green, Changed: blue, Deprecated: orange, Fixed: purple, Removed: red (all using theme-aware colors via CSS variables) |
| Filtering | Optional filter by category |
| Content source | Markdown file with structured entries |

---

## 12. Deliverable 9: SEO and Performance

**Reference Document:** 01-PUBLIC-WEBSITE.md Sections 9-10

### Task 12.1: Meta Tags and Open Graph

For every public page, set:

| Tag | Description |
|-----|-------------|
| title | Unique per page, format: "[Page Name] -- Scrapifie" |
| meta description | Unique per page, 120-160 characters, includes primary keyword |
| meta robots | "index, follow" for all public pages; "noindex" for legal version history modals |
| canonical URL | Absolute URL of the page |
| og:title | Same as title |
| og:description | Same as meta description |
| og:image | Default Scrapifie social share image (1200x630px) or post-specific image for blog posts |
| og:url | Canonical URL |
| og:type | "website" for most pages, "article" for blog posts |
| twitter:card | "summary_large_image" |
| twitter:title | Same as title |
| twitter:description | Same as meta description |

### Task 12.2: Structured Data

| Page | Schema Type | Key Properties |
|------|-------------|----------------|
| Landing page | Organization | name, url, logo, description |
| Pricing page | Product | name, description, offers (per plan with price, priceCurrency, billingPeriod) |
| Blog listing | Blog | name, description, url |
| Blog post | Article | headline, datePublished, dateModified, author, image, description |
| Docs pages | TechArticle | headline, dateModified, description |
| FAQ section on pricing | FAQPage | mainEntity array of Question/Answer pairs |

### Task 12.3: Pre-rendering for SPA

Since Scrapifie is a React SPA, search engine crawlers may not execute JavaScript. To ensure pages are indexed:

| Approach | Description |
|----------|-------------|
| Pre-rendering service | Use a pre-rendering service or tool that serves static HTML to crawler user agents while serving the SPA to regular users |
| Detection | Detect crawler user agents (Googlebot, Bingbot, etc.) at the server or CDN level and serve pre-rendered HTML |
| Fallback meta tags | Ensure critical meta tags are present in the initial HTML document (not dynamically injected) |
| Sitemap | Generate a sitemap.xml listing all public pages with lastmod dates; submit to search engines |
| robots.txt | Allow all public paths, disallow /dashboard/*, /admin/*, /api/* |

### Task 12.4: Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 95+ |
| Lighthouse Accessibility | 95+ |
| Lighthouse Best Practices | 95+ |
| Lighthouse SEO | 95+ |
| Largest Contentful Paint (LCP) | Under 2.5 seconds |
| First Input Delay (FID) | Under 100ms |
| Cumulative Layout Shift (CLS) | Under 0.1 |
| Time to First Byte (TTFB) | Under 600ms |
| Total bundle size (initial load) | Under 200KB gzipped |
| Image optimization | WebP format with fallback, lazy loading for below-the-fold images |
| Font loading | Font-display: swap, preload critical fonts |
| Code splitting | Route-based splitting so each page loads only its own code |

---

## 13. Deliverable 10: Backend API Endpoints

Summary of all new public endpoints introduced in Phase 11:

### Blog Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/blog/posts | List published posts | No | 60/min per IP |
| GET | /api/v1/blog/posts/:slug | Get single post | No | 60/min per IP |
| GET | /api/v1/blog/tags | List tags | No | 60/min per IP |

### Status Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/status | Current system status | No | 120/min per IP |
| GET | /api/v1/status/incidents | Recent incidents | No | 60/min per IP |
| GET | /api/v1/status/uptime | Daily uptime data | No | 30/min per IP |
| GET | /api/v1/status/maintenance | Upcoming maintenance | No | 30/min per IP |
| POST | /api/v1/status/subscribe | Subscribe to updates | No | 5/hr per IP |

### Contact Endpoint

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| POST | /api/v1/contact | Submit contact form | No | 3/hr per IP |

### Documentation Endpoints (Optional)

If documentation content is fetched from the server rather than bundled at build time:

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| GET | /api/v1/docs/search-index | Pre-built search index | No | 10/min per IP |
| GET | /api/v1/docs/pages/:slug | Single doc page content | No | 120/min per IP |

Note: If documentation is bundled as static Markdown files at build time (recommended approach per 17-DOCS-PORTAL.md), these endpoints are not needed. The search index would be generated at build time as a static JSON file.

---

## 14. Testing Requirements

### Frontend Unit Tests (~80 tests)

| Module | Test Count | Key Scenarios |
|--------|------------|---------------|
| PublicHeader | 8 | Renders nav links, auth-aware state (signed in vs out), scroll blur activation, mobile menu toggle, mobile menu focus trap, skip to content link, active link highlight, Escape closes mobile menu |
| PublicFooter | 5 | Renders 4 columns, links navigate correctly, mobile accordion toggle, dynamic copyright year, external links have noopener |
| LandingPage sections | 12 | Hero renders heading and CTAs, features grid renders 6 cards, how it works renders 3 steps, code tabs switch languages, pricing summary shows 3 plans, testimonials carousel navigates, final CTA links to register |
| PricingPage | 10 | Billing toggle switches prices, plan cards show correct features, comparison table renders all rows, FAQ accordion opens/closes, credit pricing table renders, credit packs show correct data, URL syncs billing param, mobile comparison adapts, Enterprise links to contact, annual discount shown |
| AboutPage | 3 | Mission section renders, values cards render, page meta set correctly |
| ContactPage | 8 | Form renders all fields, validation triggers on blur, required fields enforced, honeypot field hidden, success state replaces form, error messages show inline, submit button shows loading, rate limit message displays |
| BlogListing | 8 | Post cards render, pagination works, tag filter toggles, empty state shows, tag syncs to URL, sorting is newest first, read time displays, featured images render or show placeholder |
| BlogPost | 6 | Markdown renders all element types, TOC generated from headings, share buttons work, related posts show, 404 for missing slug, previous/next navigation works |
| StatusPage | 6 | Overall status banner renders, service list shows all 6 services, uptime bars render, incidents display, maintenance section shows, subscribe form validates |
| LegalPages | 5 | Legal layout sidebar TOC renders, scroll spy highlights active section, version info displays, print styles applied, all 5 legal pages render content |
| CookieConsent | 5 | Banner appears on first visit, Accept All stores all preferences, Reject stores necessary only, Manage opens modal, preference persists across sessions |
| DocsLayout | 4 | Sidebar renders navigation tree, right TOC generates from content, breadcrumbs show path, previous/next links render |

### Frontend Page Tests (~12 tests)

| Page | Test Count | Key Scenarios |
|------|------------|---------------|
| Landing page | 2 | Full page renders all 8 sections, responsive layout shifts at breakpoints |
| Pricing page | 2 | Full page with billing toggle, feature comparison table complete |
| Blog listing | 2 | Loads posts from API, pagination navigates |
| Blog post | 2 | Loads post by slug, renders Markdown |
| Status page | 2 | Loads status data, displays services and incidents |
| Docs quickstart | 2 | Full quickstart page renders, code tabs switch |

### Backend Integration Tests (~30 tests)

| Area | Test Count | Key Scenarios |
|------|------------|---------------|
| Blog API | 8 | List returns only published posts, pagination works, tag filter works, single post by slug returns full content, draft posts not returned, archived posts not returned, invalid slug returns 404, tags endpoint returns used tags only |
| Status API | 8 | Status endpoint returns all services, incidents endpoint returns chronological list, uptime endpoint returns 90 days of data, maintenance endpoint returns upcoming only, subscribe validates email, subscribe rejects duplicates, subscribe rate limited, invalid email rejected |
| Contact API | 6 | Valid submission creates record, honeypot field causes silent rejection, CSRF token required, rate limit enforced, missing required fields return 422, subject validation works |
| SEO | 4 | Sitemap includes all public pages, robots.txt allows public paths, robots.txt blocks dashboard and admin, pre-rendering serves HTML to crawlers |
| Legal content | 4 | All 5 legal page routes resolve, legal content renders without errors, version history data available, cookie preference endpoint works |

### E2E Tests (~10 tests)

| Flow | Description |
|------|-------------|
| Visitor browses landing page | Load /, verify hero, scroll through sections, click Get Started, arrive at /register |
| Visitor compares pricing | Load /pricing, toggle billing, compare plans, click Get Started on Free plan |
| Visitor reads blog | Load /blog, filter by tag, click post, verify content renders, click related post |
| Visitor checks status | Load /status, verify service list, expand incident, subscribe to updates |
| Visitor reads legal pages | Navigate through all 5 legal pages via footer links, verify TOC navigation |
| Cookie consent flow | First visit shows banner, accept all, refresh page confirms no banner, clear cookies, revisit, manage preferences, toggle analytics off, save, verify |
| Developer follows quickstart | Load /docs/quickstart, verify 5 steps render, switch code tabs, click next steps links |
| Docs navigation | Navigate docs sidebar, switch sections, verify breadcrumbs, use previous/next, open search |
| Docs search | Open Cmd+K, type a query, verify results, select a result, verify navigation |
| Contact form | Fill form, submit, verify success message, attempt rapid resubmission, verify rate limit |

### Visual Regression Tests (~25 screenshots)

| Page | Viewports | Theme | Screenshot Count |
|------|-----------|-------|-----------------|
| Landing page (full) | 320, 768, 1440 | Light, Dark | 6 |
| Pricing page | 320, 768, 1440 | Light | 3 |
| Blog listing | 320, 1440 | Light | 2 |
| Blog post | 320, 1440 | Light | 2 |
| Status page | 320, 1440 | Light | 2 |
| Legal page (Terms) | 320, 1440 | Light | 2 |
| Docs quickstart | 320, 768, 1440 | Light | 3 |
| Docs API reference | 320, 1440 | Light | 2 |
| Cookie consent banner | 320, 1440 | Light | 2 |
| Contact page | 320 | Light | 1 |

### Accessibility Tests

| Area | Test Count | Key Checks |
|------|------------|------------|
| All public pages | 10 | axe-core automated scan on each page, all pages pass with zero violations at WCAG 2.1 AA level |
| Keyboard navigation | 5 | Tab through header, footer accordion, FAQ accordion, docs sidebar, cookie consent banner -- all interactive elements reachable and operable |

---

## 15. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SPA SEO is poor without pre-rendering | High | High | Configure pre-rendering service early; test with Google Search Console; ensure meta tags are in initial HTML |
| Blog Markdown rendering introduces XSS | Medium | High | Use a Markdown library that sanitizes HTML by default; never use dangerouslySetInnerHTML with raw user content; CSP headers as defense in depth |
| Documentation content becomes stale | Medium | Medium | Embed last_updated date prominently; include docs review in release checklist; track search queries to identify gaps |
| Landing page performance degrades with images | Medium | Medium | Use WebP with fallback, lazy load below-fold images, set explicit width/height to prevent CLS, enforce bundle budget in CI |
| Legal content jurisdiction issues | Low | High | All legal docs use placeholder jurisdiction; flag for legal review before launch; version management allows updates without code changes |
| Cookie consent requirements vary by region | Medium | Medium | Default to most restrictive consent model (opt-in for non-essential); jurisdiction-neutral approach; consent logged with timestamp |

---

## 16. Definition of Done

Phase 11 is complete when ALL of the following are true:

| # | Criterion |
|---|-----------|
| 1 | Public header renders with navigation and auth-aware state on all public pages |
| 2 | Public footer renders with 4 link columns and mobile accordion |
| 3 | Landing page renders all 8 sections with responsive layout at 320px, 768px, and 1440px |
| 4 | Pricing page displays correct plan data with working billing toggle and URL sync |
| 5 | Feature comparison table shows all differentiating features across all 3 plans |
| 6 | Credit pricing and credit packs sections display correct values |
| 7 | FAQ accordion opens and closes correctly with keyboard accessibility |
| 8 | About page renders mission and values sections |
| 9 | Contact form validates all fields, submits successfully, handles honeypot, shows success/error states |
| 10 | Contact form rate limit enforced at 3 per hour per IP |
| 11 | Blog listing page loads published posts with pagination and tag filtering |
| 12 | Blog post page renders Markdown content with TOC, share buttons, and related posts |
| 13 | Status page displays current service statuses, uptime bars, incidents, and maintenance |
| 14 | Status page subscribe-to-updates form works |
| 15 | All 5 legal pages render with sidebar TOC, scroll spy, and version info |
| 16 | Cookie consent banner appears on first visit, stores preferences, does not reappear |
| 17 | Cookie preference modal allows granular control of cookie categories |
| 18 | Documentation portal sidebar navigation renders all sections and pages |
| 19 | Quickstart page renders all 5 steps with working code tabs |
| 20 | API reference pages render in two-column layout with parameter tables and examples |
| 21 | Documentation search returns relevant results within 200ms |
| 22 | Changelog page renders with category badges and chronological entries |
| 23 | All public pages have unique title, meta description, Open Graph tags, and structured data |
| 24 | Sitemap.xml includes all public pages with correct lastmod dates |
| 25 | robots.txt allows public pages and blocks dashboard/admin/API paths |
| 26 | Pre-rendering serves HTML to search engine crawlers |
| 27 | Lighthouse scores are 95+ for performance, accessibility, best practices, and SEO on landing page |
| 28 | All public pages are responsive from 320px to 2560px with no horizontal overflow |
| 29 | All public pages pass axe-core accessibility scan with zero WCAG 2.1 AA violations |
| 30 | All blog and status API endpoints return correct data and handle edge cases |
| 31 | No regressions in Phase 10 tests |

---

## 17. Connection to Next Phase

Phase 11 completes the public-facing surface of Scrapifie. Phase 12 is the final phase before launch:

- **Phase 12 (Security Hardening, Testing, and Launch Preparation)** conducts a full security audit, runs comprehensive penetration testing, optimizes performance, finalizes monitoring, and prepares the deployment pipeline and launch checklist
- Phase 12 depends on Phase 11 because security testing must cover the public website, legal pages, and documentation portal
- Phase 12's SEO audit verifies that the pre-rendering and structured data from Phase 11 are working correctly in production
- Phase 12's load testing includes public page endpoints (blog, status, contact)
- After Phase 12, the platform is ready for production launch

**Read before starting Phase 12:** 19-SECURITY-FRAMEWORK.md (security requirements), 21-TESTING-STRATEGY.md (testing mandates), 00-PLATFORM-OVERVIEW.md (full system scope)
