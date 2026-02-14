# Scrapifie Public Website

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-001 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 02-LEGAL-FRAMEWORK.md, 17-DOCS-PORTAL.md, 20-USER-JOURNEYS.md |

---

## Table of Contents

1. [Purpose and Goals](#1-purpose-and-goals)
2. [Layout and Navigation](#2-layout-and-navigation)
3. [Landing Page](#3-landing-page)
4. [Pricing Page](#4-pricing-page)
5. [About Page](#5-about-page)
6. [Contact Page](#6-contact-page)
7. [Blog](#7-blog)
8. [Status Page](#8-status-page)
9. [SEO Strategy](#9-seo-strategy)
10. [Performance Requirements](#10-performance-requirements)
11. [Responsive Behavior](#11-responsive-behavior)
12. [Accessibility Checklist](#12-accessibility-checklist)

---

## 1. Purpose and Goals

The public website is the front door to Scrapifie. Every visitor who reaches the site should understand what Scrapifie does, how much it costs, and how to get started within seconds.

### Primary Goals

| Goal | Success Metric |
|------|---------------|
| Explain the product clearly | Visitor understands the value proposition within 5 seconds of landing |
| Drive signups | Clear, prominent calls-to-action on every page |
| Build trust | Status page, professional design, transparent pricing, legal pages |
| Support SEO | 95%+ Lighthouse score, structured data, optimized meta tags |
| Educate users | Blog content and links to documentation portal |

### Key Principles

- Every page loads in under 2 seconds on a 3G connection
- No page requires authentication to view
- All content is indexable by search engines
- No page uses JavaScript that prevents content from rendering if JS fails to load
- The site works fully on mobile devices at 320px viewport width

---

## 2. Layout and Navigation

### Global Header (Navbar)

The header is persistent across all public pages. It is fixed to the top of the viewport and uses a semi-transparent background with backdrop blur on scroll.

```
+----------------------------------------------------------------------+
|  [Logo: Scrapifie]     Product   Pricing   Docs   Blog    [Login] [Get Started] |
+----------------------------------------------------------------------+
```

| Element | Type | Behavior |
|---------|------|----------|
| Logo | Link | Navigates to / (landing page). SVG logo, monochrome, CSS-colored. |
| Product | Link | Navigates to /#features or a future /product page. Scrolls to features section on landing page for MVP. |
| Pricing | Link | Navigates to /pricing |
| Docs | Link | Navigates to /docs (documentation portal, see 17-DOCS-PORTAL.md) |
| Blog | Link | Navigates to /blog |
| Login | Button (secondary/outline style) | Navigates to /login |
| Get Started | Button (primary/accent style) | Navigates to /signup |

#### Mobile Header

On viewports below 768px, the navigation items collapse into a hamburger menu icon on the right side. Tapping the hamburger opens a full-screen overlay menu with all navigation items stacked vertically, plus Login and Get Started buttons at the bottom.

```
+----------------------------------------------+
|  [Logo: Scrapifie]              [Hamburger]    |
+----------------------------------------------+

Expanded mobile menu:
+----------------------------------------------+
|                                     [X Close] |
|                                               |
|   Product                                     |
|   Pricing                                     |
|   Docs                                        |
|   Blog                                        |
|                                               |
|   [Login]                                     |
|   [Get Started]                               |
+----------------------------------------------+
```

| Behavior | Detail |
|----------|--------|
| Open animation | Slide in from right, 200ms ease-out |
| Close triggers | X button, pressing Escape, tapping outside the menu |
| Focus trap | When open, Tab key cycles only within the menu |
| Body scroll lock | Page scroll is disabled while the menu is open |

### Global Footer

The footer appears on every public page. It is divided into columns.

```
+----------------------------------------------------------------------+
|  Scrapifie                                                             |
|  Reliable web scraping at scale.                                      |
|                                                                       |
|  Product          Resources         Legal              Company        |
|  -------          ---------         -----              -------        |
|  Features         Documentation     Terms of Service   About          |
|  Pricing          Blog              Privacy Policy     Contact        |
|  Status           API Reference     Acceptable Use     Careers        |
|                   Changelog         Cookie Policy                     |
|                                     DPA                               |
|                                                                       |
|  -------------------------------------------------------------------  |
|  (c) 2026 Scrapifie. All rights reserved.        [Twitter] [GitHub]   |
+----------------------------------------------------------------------+
```

| Column | Links |
|--------|-------|
| Product | Features (/ or /#features), Pricing (/pricing), Status (/status) |
| Resources | Documentation (/docs), Blog (/blog), API Reference (/docs/api/scrape), Changelog (/blog?tag=changelog or /changelog) |
| Legal | Terms of Service (/legal/terms), Privacy Policy (/legal/privacy), Acceptable Use (/legal/acceptable-use), Cookie Policy (/legal/cookies), DPA (/legal/dpa) |
| Company | About (/about), Contact (/contact), Careers (placeholder link or "Coming soon" text) |

| Element | Detail |
|---------|--------|
| Copyright notice | "(c) {CURRENT_YEAR} Scrapifie. All rights reserved." Year is dynamically rendered. |
| Social icons | Monochrome SVG icons for Twitter/X and GitHub. CSS-colored. Link to the Scrapifie social accounts (URLs from environment variables). |

#### Mobile Footer

On mobile, the four columns stack vertically. Each column heading is tappable to expand/collapse its links (accordion pattern). Social icons remain in a horizontal row at the bottom.

---

## 3. Landing Page

**Route:** `/`

The landing page is the highest-traffic page and the primary conversion path. It follows a proven SaaS landing page structure: hero, social proof, features, how it works, pricing summary, final CTA.

### Section 1: Hero

```
+----------------------------------------------------------------------+
|                                                                       |
|           Web Scraping API That Just Works                            |
|                                                                       |
|   Extract data from any website with a single API call.               |
|   Proxy rotation, browser rendering, and anti-detection               |
|   handled for you.                                                    |
|                                                                       |
|   [Get Started Free]          [View Documentation]                    |
|                                                                       |
|   No credit card required. 1,000 free credits.                        |
|                                                                       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Headline | Short, benefit-driven. Maximum 10 words. Example: "Web Scraping API That Just Works" |
| Subheadline | Two to three lines explaining the core value. Mentions proxy rotation, browser rendering, anti-detection. |
| Primary CTA | "Get Started Free" button. Accent color. Links to /signup. |
| Secondary CTA | "View Documentation" button. Outline style. Links to /docs. |
| Trust line | Below the buttons. "No credit card required. 1,000 free credits." |
| Background | Subtle gradient or pattern. No stock photos. Dark mode compatible. |

#### Hero on Mobile

- Headline font size reduces from 3rem to 2rem
- Buttons stack vertically with full width
- Subheadline reduces to two lines maximum
- Trust line wraps naturally

### Section 2: Social Proof Bar

A horizontal strip below the hero showing trust indicators.

```
+----------------------------------------------------------------------+
|  Trusted by 10,000+ developers     |    99.9% uptime    |    1B+ requests served  |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Format | Three to five short stat items separated by vertical dividers |
| Numbers | Dynamically updated or periodically updated from the database. Use rounded figures. |
| Mobile behavior | Stats stack vertically or wrap to two rows |

Note: Until real numbers exist, use placeholder values and mark them clearly in the codebase with a TODO comment for future replacement.

### Section 3: Feature Highlights

Three to five feature cards arranged in a grid. NOT four cards in a row (per standards). Use three cards in a row on desktop, stacking to one per row on mobile.

```
+----------------------------------------------------------------------+
|                                                                       |
|   Why Scrapifie?                                                       |
|                                                                       |
|   +------------------+  +------------------+  +------------------+   |
|   | [Icon]           |  | [Icon]           |  | [Icon]           |   |
|   | Smart Proxies    |  | JS Rendering     |  | Anti-Detection   |   |
|   |                  |  |                  |  |                  |   |
|   | Automatic proxy  |  | Full browser     |  | Bypass blocks    |   |
|   | rotation across  |  | rendering for    |  | with fingerprint |   |
|   | datacenter and   |  | JavaScript-heavy |  | randomization    |   |
|   | residential IPs. |  | websites.        |  | and stealth.     |   |
|   +------------------+  +------------------+  +------------------+   |
|                                                                       |
|   +------------------+  +------------------+  +------------------+   |
|   | [Icon]           |  | [Icon]           |  | [Icon]           |   |
|   | CAPTCHA Solving  |  | Structured Data  |  | 99.9% Uptime     |   |
|   |                  |  |                  |  |                  |   |
|   | Automatic CAPTCHA|  | Get clean JSON   |  | Enterprise-grade |   |
|   | detection and    |  | responses with   |  | infrastructure   |   |
|   | solving.         |  | CSS selectors.   |  | you can rely on. |   |
|   +------------------+  +------------------+  +------------------+   |
|                                                                       |
+----------------------------------------------------------------------+
```

Each feature card:

| Element | Detail |
|---------|--------|
| Icon | Lucide React icon. Monochrome, CSS-colored. Sized 32x32px or 40x40px. |
| Title | Short feature name. 2-4 words. Font weight 600. |
| Description | Two to three sentences explaining the benefit. Body text size. |
| Card style | Subtle border, rounded corners (8px radius), slight shadow on hover. No background color difference in light mode; slightly lighter in dark mode. |

### Section 4: How It Works

A three-step process breakdown showing how simple it is to use Scrapifie.

```
+----------------------------------------------------------------------+
|                                                                       |
|   How It Works                                                        |
|                                                                       |
|   1                        2                        3                  |
|   Sign Up                  Get Your API Key         Start Scraping     |
|                                                                        |
|   Create a free account    Generate an API key      Send a POST        |
|   in 30 seconds. No        from your dashboard.     request to our     |
|   credit card needed.      Test and live keys       endpoint. Get      |
|                            available.               clean data back.   |
|                                                                       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Step numbers | Large, accent-colored numbers (1, 2, 3). Font size 2.5rem or larger. |
| Step title | Bold, 1.25rem. |
| Step description | Two sentences. Body text. |
| Connector | On desktop, a subtle horizontal line or arrow connecting the three steps. On mobile, the steps stack vertically with a vertical line connector. |
| CTA at bottom | "Get Started in 30 Seconds" button linking to /signup |

### Section 5: Code Example

A visual code snippet showing a simple API call and the response. This is NOT real executable code in the documentation — it is a styled representation showing how easy the API is to use.

```
+----------------------------------------------------------------------+
|                                                                       |
|   Simple API, Powerful Results                                        |
|                                                                       |
|   +-----------------------------+  +-----------------------------+   |
|   | Request                     |  | Response                    |   |
|   | -------------------------   |  | -------------------------   |   |
|   | POST /v1/scrape             |  | {                           |   |
|   | Authorization: Bearer sk_.. |  |   "status": "completed",    |   |
|   | {                           |  |   "data": {                 |   |
|   |   "url": "https://...",     |  |     "title": "Example",     |   |
|   |   "engine": "browser",      |  |     "content": "..."        |   |
|   |   "extract": {              |  |   },                        |   |
|   |     "title": "h1",          |  |   "credits_used": 5,        |   |
|   |     "content": ".main"      |  |   "engine": "browser"       |   |
|   |   }                         |  | }                           |   |
|   | }                           |  |                             |   |
|   +-----------------------------+  +-----------------------------+   |
|                                                                       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Layout | Two panels side by side on desktop. Stacked on mobile (request on top, response below). |
| Style | Dark background (code block style), monospace font, syntax-highlighted. |
| Language tabs | Optional: show the same request in cURL, Python, Node.js, and Go. Tabs above the request panel. Default to cURL. |
| No copy button needed | This is a marketing display, not a docs code block. The docs portal (17-DOCS-PORTAL.md) has copyable examples. |

### Section 6: Pricing Summary

A condensed version of the full pricing page. Shows the three plans with key details and a CTA to view full pricing.

```
+----------------------------------------------------------------------+
|                                                                       |
|   Simple, Transparent Pricing                                         |
|                                                                       |
|   +-----------------+  +-------------------+  +-----------------+    |
|   | Free            |  | Pro               |  | Enterprise      |    |
|   |                 |  | POPULAR           |  |                 |    |
|   | $0/month        |  | $49/month         |  | Custom          |    |
|   |                 |  |                   |  |                 |    |
|   | 1,000 credits   |  | 50,000 credits    |  | Custom credits  |    |
|   | 2 req/sec       |  | 20 req/sec        |  | Custom limits   |    |
|   | 1 API key       |  | 5 API keys        |  | Unlimited keys  |    |
|   | Community       |  | Email support     |  | Dedicated       |    |
|   |                 |  |                   |  | support         |    |
|   | [Get Started]   |  | [Start Free Trial]|  | [Contact Sales] |    |
|   +-----------------+  +-------------------+  +-----------------+    |
|                                                                       |
|   See full plan comparison -->                                        |
|                                                                       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Cards | Three plan cards. NOT four. Pro card is visually emphasized (slightly raised, accent border, "POPULAR" badge). |
| Badge | "POPULAR" label on Pro card. Text-only, no emoji. Accent background color. |
| CTA buttons | Free: "Get Started" links to /signup. Pro: "Start Free Trial" links to /signup?plan=pro. Enterprise: "Contact Sales" links to /contact?subject=enterprise. |
| Bottom link | "See full plan comparison" links to /pricing |
| Mobile | Cards stack vertically. Pro card remains visually distinct. |

### Section 7: Testimonials (Future)

This section is a placeholder for future customer testimonials. For MVP launch, this section is omitted entirely. When implemented:

- Three testimonial cards in a row (not four)
- Each card shows a quote, name, title, and company
- No avatars unless real customer photos are provided
- Cards rotate in a carousel on mobile

### Section 8: Final CTA

A full-width section at the bottom before the footer.

```
+----------------------------------------------------------------------+
|                                                                       |
|   Ready to start scraping?                                            |
|                                                                       |
|   Create your free account and make your first API call               |
|   in under 5 minutes.                                                 |
|                                                                       |
|   [Get Started Free]                                                  |
|                                                                       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Background | Accent color or gradient. Contrasts with the rest of the page. |
| Headline | Action-oriented question. |
| Subtext | Reinforces simplicity and speed. |
| CTA | Single primary button. Links to /signup. |
| Mobile | Padding adjusts. Button becomes full-width. |

---

## 4. Pricing Page

**Route:** `/pricing`

The pricing page provides a comprehensive comparison of all plans and answers common pricing questions.

### Page Structure

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   Pricing                                                             |
|   Choose the plan that fits your scraping needs.                      |
|                                                                       |
|   [Monthly]  [Annual - Save 20%]     (toggle switch)                  |
|                                                                       |
|   +-----------------+  +-------------------+  +-----------------+    |
|   | Free            |  | Pro               |  | Enterprise      |    |
|   | ...             |  | ...               |  | ...             |    |
|   +-----------------+  +-------------------+  +-----------------+    |
|                                                                       |
|   Feature Comparison Table                                            |
|   (expanded version with all features)                                |
|                                                                       |
|   Credit Pricing Explained                                            |
|   (how credits work, what costs what)                                 |
|                                                                       |
|   FAQ                                                                 |
|   (accordion of common questions)                                     |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Billing Toggle

| Element | Detail |
|---------|--------|
| Default | Monthly selected |
| Annual option | Shows the annual price (which is the monthly price multiplied by 12 with a 20% discount applied). The displayed price is per-month equivalent. Example: Pro annual is $39/month billed $468/year instead of $49/month billed $588/year. |
| Toggle style | Pill-shaped toggle with two options. Active option has accent background. |
| Behavior | Switching the toggle updates all plan cards immediately without page reload. |
| Enterprise | Enterprise card does not change with toggle — it always shows "Custom". |

### Plan Cards (Expanded)

Each plan card on the pricing page shows more detail than the landing page summary.

**Free Plan Card:**

| Field | Value |
|-------|-------|
| Plan name | Free |
| Price | $0/month |
| Description | "Perfect for testing and evaluation" |
| Credits | 1,000 per month |
| Rate limit | 2 requests per second |
| Concurrent jobs | 2 |
| API keys | 1 |
| Data retention | 3 days |
| Support | Community (links to docs/GitHub discussions) |
| CTA | "Get Started" button. Links to /signup. |
| Feature list | Checkmarks for included features, X marks for excluded. |

**Pro Plan Card:**

| Field | Value |
|-------|-------|
| Plan name | Pro |
| Badge | "Most Popular" |
| Price | $49/month (or $39/month billed annually) |
| Description | "For developers and growing projects" |
| Credits | 50,000 per month |
| Rate limit | 20 requests per second |
| Concurrent jobs | 20 |
| API keys | 5 |
| Data retention | 14 days |
| Support | Email support |
| CTA | "Start Free Trial" button. Links to /signup?plan=pro. |
| Feature list | All Free features plus residential proxies, CAPTCHA solving, webhooks, credit packs. |

**Enterprise Plan Card:**

| Field | Value |
|-------|-------|
| Plan name | Enterprise |
| Price | "Custom" |
| Description | "For large-scale operations and teams" |
| Credits | Custom allocation |
| Rate limit | Custom |
| Concurrent jobs | Custom |
| API keys | Unlimited |
| Data retention | Custom |
| Support | Dedicated account manager |
| CTA | "Contact Sales" button. Links to /contact?subject=enterprise. |
| Feature list | All Pro features plus SLA, custom integrations, dedicated infrastructure. |

### Feature Comparison Table

A full-width table below the plan cards showing every feature and which plan includes it.

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Monthly API credits | 1,000 | 50,000 | Custom |
| Rate limit (req/sec) | 2 | 20 | Custom |
| Concurrent jobs | 2 | 20 | Custom |
| API keys | 1 | 5 | Unlimited |
| HTTP engine | Yes | Yes | Yes |
| Browser engine (JS rendering) | Yes | Yes | Yes |
| Stealth engine (anti-detection) | No | Yes | Yes |
| Datacenter proxies | Yes | Yes | Yes |
| Residential proxies | No | Yes | Yes |
| CAPTCHA solving | No | Yes | Yes |
| Webhooks | No | Yes | Yes |
| Credit packs (add-on) | No | Yes | Yes |
| Data retention | 3 days | 14 days | Custom |
| Support | Community | Email | Dedicated |
| SLA | No | No | Yes |
| Custom integrations | No | No | Yes |

Table behavior:
- On desktop: full table visible
- On mobile: horizontally scrollable or collapsed into a "compare two plans" selector

### Credit Pricing Section

This section explains how credits are consumed.

| Section | Content |
|---------|---------|
| Heading | "How Credits Work" |
| Explanation | One credit equals one basic HTTP request. Different engines and features consume different amounts. Failed requests are not charged. Credits reset each billing cycle and do not roll over. |

**Credit Multiplier Table:**

| Operation | Credit Cost |
|-----------|-------------|
| HTTP engine request | 1 credit |
| Browser engine request (JavaScript rendering) | 5 credits |
| Stealth engine request (anti-detection) | 10 credits |
| Residential proxy add-on | +2 credits |
| CAPTCHA solving add-on | +5 credits |
| Data extraction (CSS selectors) | +0 credits (included) |
| Screenshot capture | +2 credits |

Note: These multiplier values are illustrative and should be stored in a configuration table, not hardcoded. The actual values are defined in 09-BILLING-AND-CREDITS.md.

**Credit Pack Table:**

| Pack | Credits | Price (USD) | Availability |
|------|---------|-------------|-------------|
| Starter Pack | 10,000 | $15 | Pro and Enterprise only |
| Growth Pack | 50,000 | $60 | Pro and Enterprise only |
| Scale Pack | 200,000 | $200 | Pro and Enterprise only |

Credit packs do not roll over. They are consumed after the plan's base credits are exhausted.

### FAQ Section

An accordion component where each question expands to reveal the answer. Only one question is open at a time.

| Question | Answer Summary |
|----------|---------------|
| Can I try Scrapifie for free? | Yes, the Free plan gives you 1,000 credits per month with no credit card required. |
| Do unused credits roll over? | No, credits reset at the start of each billing cycle. Credit packs also do not roll over. |
| What happens when I run out of credits? | Your API requests will return a 429 error with a message indicating credits are exhausted. You can upgrade your plan or purchase a credit pack. |
| Can I upgrade or downgrade my plan? | Yes, you can change plans at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the next billing cycle. |
| What payment methods do you accept? | We accept major credit/debit cards and other payment methods through our payment provider. |
| Is there an annual discount? | Yes, annual billing saves 20% compared to monthly billing. |
| Do you offer refunds? | We offer refunds within 14 days of a new subscription if fewer than 10% of credits have been used. See our Terms of Service for details. |
| What counts as a failed request? | A request that returns an error (network failure, timeout, blocked) is not charged. Only successful responses consume credits. |
| Can I use Scrapifie for any website? | Scrapifie is a neutral tool. Users are responsible for ensuring their scraping activities comply with applicable laws and website terms of service. See our Acceptable Use Policy. |

---

## 5. About Page

**Route:** `/about`

### Page Structure

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   About Scrapifie                                                      |
|                                                                       |
|   [Mission Statement Section]                                         |
|                                                                       |
|   [What We Do Section]                                                |
|                                                                       |
|   [Values Section]                                                    |
|                                                                       |
|   [CTA Section]                                                       |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Mission Statement

| Element | Detail |
|---------|--------|
| Heading | "Our Mission" |
| Content | Two to three paragraphs explaining why Scrapifie exists. Focus on making web data accessible to everyone — individuals, developers, and businesses of all sizes. Emphasize reliability, simplicity, and transparency. |
| Tone | Professional, direct. No marketing superlatives. No emojis. |

### What We Do

| Element | Detail |
|---------|--------|
| Heading | "What We Do" |
| Content | Explanation of the platform's capabilities. Mention the three engines (HTTP, Browser, Stealth), proxy infrastructure, anti-detection, and the self-service model. |
| Format | Short paragraphs or a bulleted list (using SVG bullet icons, not emoji bullets). |

### Values

Three to five value cards (NOT four) arranged in a row on desktop.

| Value | Description |
|-------|-------------|
| Reliability | We maintain 99.9% uptime and continuously improve our infrastructure. |
| Transparency | Clear pricing, open status page, honest communication about limitations. |
| Simplicity | One API call to get the data you need. No complex setup or configuration. |
| Privacy | We do not store or sell scraped data. Your data belongs to you. |
| Support | Responsive support for every user, from free tier to enterprise. |

### CTA Section

| Element | Detail |
|---------|--------|
| Text | "Ready to see it in action?" |
| Button | "Get Started Free" linking to /signup |

---

## 6. Contact Page

**Route:** `/contact`

### Page Layout

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   Contact Us                                                          |
|                                                                       |
|   +---------------------------+  +-------------------------------+   |
|   | Contact Form              |  | Contact Information           |   |
|   |                           |  |                               |   |
|   | Name: [_____________]     |  | Email                         |   |
|   | Email: [_____________]    |  | support@scrapifie.io           |   |
|   | Subject: [v Dropdown  ]   |  |                               |   |
|   | Message:                  |  | Response Time                 |   |
|   | [____________________]    |  | We typically respond within   |   |
|   | [____________________]    |  | 24 hours on business days.    |   |
|   | [____________________]    |  |                               |   |
|   |                           |  | Looking for help?             |   |
|   | [Send Message]            |  | Check our Documentation       |   |
|   +---------------------------+  +-------------------------------+   |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Contact Form Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Name | Text input | Yes | Minimum 2 characters, maximum 100 characters | |
| Email | Email input | Yes | Valid email format | |
| Subject | Dropdown select | Yes | Must select one option | |
| Message | Textarea | Yes | Minimum 20 characters, maximum 2000 characters | |

#### Subject Options

| Option | Value |
|--------|-------|
| General Inquiry | general |
| Sales / Enterprise | enterprise |
| Technical Support | support |
| Partnership | partnership |
| Bug Report | bug |
| Feature Request | feature |
| Other | other |

If the page is loaded with a query parameter `?subject=enterprise`, the dropdown pre-selects "Sales / Enterprise".

### Form Submission

| Behavior | Detail |
|----------|--------|
| Validation | Client-side validation on blur and on submit. Server-side validation on the API. |
| Rate limiting | Maximum 3 submissions per hour per IP address. |
| CSRF | Hidden CSRF token included in the form. |
| Honeypot | Hidden field to catch bots. If filled, the submission is silently discarded. |
| Success state | Form is replaced with a success message: "Thank you for your message. We will get back to you within 24 hours." |
| Error state | If submission fails, display an error message above the form. The form content is preserved so the user does not lose their input. |
| Storage | Submissions are stored in the database as contact_messages. Each has a status field (new, read, replied, archived). |
| Notification | When a new contact message is submitted, an email notification is sent to the configured support email address (from environment variable). |

### Contact Information Panel

| Element | Detail |
|---------|--------|
| Email | Displays the support email address (from environment variable). Clickable mailto link. |
| Response time | "We typically respond within 24 hours on business days." |
| Documentation link | "Looking for help? Check our Documentation" with a link to /docs. |
| No physical address | No postal address is displayed unless the user configures one via environment variable. Jurisdiction-neutral approach. |

---

## 7. Blog

### Blog Listing Page

**Route:** `/blog`

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   Blog                                                                |
|                                                                       |
|   [All] [Guides] [Updates] [Engineering] [Changelog]   (tag filters)  |
|                                                                       |
|   +-----------------------------+  +-----------------------------+   |
|   | [Featured Image / Pattern]  |  | [Featured Image / Pattern]  |   |
|   | Guide                       |  | Engineering                 |   |
|   | How to Scrape JavaScript    |  | Building Our Stealth        |   |
|   | Websites in 2026            |  | Engine with Camoufox        |   |
|   |                             |  |                             |   |
|   | A comprehensive guide to    |  | A deep dive into how we     |   |
|   | handling dynamic content... |  | built our anti-detection... |   |
|   |                             |  |                             |   |
|   | Feb 5, 2026 · 8 min read    |  | Jan 28, 2026 · 12 min read  |   |
|   +-----------------------------+  +-----------------------------+   |
|                                                                       |
|   (more cards...)                                                     |
|                                                                       |
|   [1] [2] [3] ... [Next]        (pagination)                         |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Blog Card Elements

| Element | Detail |
|---------|--------|
| Image | Optional featured image. If none, use a generated gradient pattern based on the post slug (deterministic, no randomness at render time). |
| Tag | Category tag displayed above the title. One primary tag per post. |
| Title | Post title. Font weight 600. Links to the post. |
| Excerpt | First 150 characters of the post content, or a custom excerpt field. |
| Date | Published date in "MMM D, YYYY" format. Uses the user's locale for month name. |
| Read time | Estimated reading time based on word count (average 200 words per minute). Displayed as "X min read". |

### Tag Filters

| Tag | Description |
|-----|-------------|
| All | Shows all posts (default) |
| Guides | How-to articles and tutorials |
| Updates | Product updates and new features |
| Engineering | Technical deep dives |
| Changelog | Version releases and changes |

Clicking a tag filters the blog list to show only posts with that tag. The URL updates to `/blog?tag=guides` (or equivalent). The active tag button has an accent background.

### Pagination

| Element | Detail |
|---------|--------|
| Posts per page | 10 |
| Style | Numbered page buttons with Previous/Next arrows |
| URL format | /blog?page=2 or /blog?tag=guides&page=2 |
| Edge cases | If there is only one page, pagination is hidden. Previous is disabled on page 1. Next is disabled on the last page. |

### Blog Post Page

**Route:** `/blog/:slug`

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   [Tag: Guide]                                                        |
|                                                                       |
|   How to Scrape JavaScript Websites in 2026                           |
|                                                                       |
|   Published Feb 5, 2026 · 8 min read · Updated Feb 6, 2026           |
|                                                                       |
|   ---                                                                 |
|                                                                       |
|   (Article content rendered from Markdown)                            |
|                                                                       |
|   Headings, paragraphs, code blocks, images, tables,                  |
|   blockquotes, and lists are all supported.                           |
|                                                                       |
|   ---                                                                 |
|                                                                       |
|   Share: [Twitter] [LinkedIn] [Copy Link]                             |
|                                                                       |
|   ---                                                                 |
|                                                                       |
|   Related Posts                                                       |
|   +------------------+  +------------------+  +------------------+   |
|   | Related Post 1   |  | Related Post 2   |  | Related Post 3   |   |
|   +------------------+  +------------------+  +------------------+   |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Post Page Elements

| Element | Detail |
|---------|--------|
| Tag | Displayed above the title as a small badge. Links back to /blog?tag={tag}. |
| Title | H1. Only one per page. |
| Metadata line | Published date, read time, and (if different) updated date. |
| Content | Rendered from Markdown stored in the database. Supports headings (h2-h4), paragraphs, bold, italic, inline code, code blocks with syntax highlighting, images with alt text, tables, blockquotes, ordered lists, and unordered lists. |
| Content width | Maximum 720px, centered. Comfortable reading width. |
| Share buttons | Twitter (pre-filled tweet with title and URL), LinkedIn (share URL), Copy Link (copies URL to clipboard with "Copied!" feedback). All icons are monochrome SVG. |
| Related posts | Three posts with matching tags, excluding the current post. If fewer than three matches exist, fill with recent posts. Cards use the same format as the blog listing. |

### Blog Data Model (Summary)

Described fully in 18-DATA-MODELS.md. A blog post has: unique slug, title, content (Markdown), excerpt, tag, published_at timestamp, updated_at timestamp, author name, featured image URL (optional), status (draft or published), and reading_time_minutes (calculated on save).

### Blog Administration

Blog posts are managed by admins through the admin panel (see 12-ADMIN-DASHBOARD.md). There is no public-facing blog editor. Admins can:

- Create, edit, and delete (soft delete) blog posts
- Set posts as draft or published
- Schedule posts for future publication
- Edit slugs (with automatic redirect creation for old slugs)

---

## 8. Status Page

**Route:** `/status`

The status page shows the current operational status of all Scrapifie services.

### Page Layout

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|   System Status                                                       |
|                                                                       |
|   [Indicator] All Systems Operational                                 |
|   Last updated: Feb 8, 2026 14:32 UTC                                |
|                                                                       |
|   +----------------------------------------------------------------+ |
|   | Service                    | Status          | Uptime (90d)     | |
|   |----------------------------+-----------------+------------------| |
|   | API                        | [*] Operational | 99.98%           | |
|   | HTTP Engine                | [*] Operational | 99.99%           | |
|   | Browser Engine             | [*] Operational | 99.95%           | |
|   | Stealth Engine             | [*] Operational | 99.92%           | |
|   | Dashboard                  | [*] Operational | 99.99%           | |
|   | Webhook Delivery           | [*] Operational | 99.97%           | |
|   +----------------------------------------------------------------+ |
|                                                                       |
|   Incident History                                                    |
|   +----------------------------------------------------------------+ |
|   | Feb 7, 2026                                                     | |
|   | No incidents reported.                                          | |
|   |                                                                 | |
|   | Feb 6, 2026                                                     | |
|   | 14:20 UTC - Browser Engine Degraded Performance                 | |
|   | Resolved at 14:45 UTC. Root cause: ...                          | |
|   +----------------------------------------------------------------+ |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

### Status Indicators

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Operational | Green | Filled circle | Service is functioning normally |
| Degraded Performance | Yellow | Filled circle | Service is slow or partially impaired |
| Partial Outage | Orange | Filled circle | Some functionality is unavailable |
| Major Outage | Red | Filled circle | Service is down |
| Maintenance | Blue | Wrench icon | Planned maintenance in progress |

### Overall Status Banner

The banner at the top shows the worst status across all services:
- If all services are Operational: "All Systems Operational" with green indicator
- If any service is Degraded: "Some Systems Experiencing Issues" with yellow indicator
- If any service has an outage: "Service Disruption" with red indicator

### Uptime Display

| Element | Detail |
|---------|--------|
| Period | Rolling 90-day uptime percentage |
| Calculation | (total_minutes - downtime_minutes) / total_minutes * 100, rounded to 2 decimal places |
| Visual | Small bar chart showing daily uptime for the last 90 days. Green bars for 100%, yellow for degraded, red for outage. Each bar is clickable to show that day's incidents. |

### Incident History

| Element | Detail |
|---------|--------|
| Grouping | Incidents are grouped by date, most recent first |
| Display | Shows the last 30 days of incidents |
| No incidents | If a day has no incidents, show "No incidents reported." |
| Incident detail | Title, affected service, start time, end time (or "Ongoing"), status updates in chronological order, and root cause (if resolved) |
| Pagination | After 30 days, a "View older incidents" link shows a paginated archive |

### Data Source

Status data comes from the platform's monitoring system (see 16-ADMIN-OPERATIONS.md). Incidents are created manually by admins or automatically by monitoring alerts. The status page queries a lightweight endpoint that returns current service statuses and recent incidents.

### Subscribe to Updates

| Element | Detail |
|---------|--------|
| Position | Below the overall status banner |
| Method | Email subscription. User enters email address and receives notifications when status changes. |
| Rate limiting | Maximum 1 subscription per email address |
| Unsubscribe | Every notification email includes an unsubscribe link |

---

## 9. SEO Strategy

### Per-Page Meta Tags

Every public page must have unique meta tags. These are injected into the HTML head.

| Page | Title | Description |
|------|-------|-------------|
| Landing | "Scrapifie - Web Scraping API That Just Works" | "Extract data from any website with a single API call. Proxy rotation, browser rendering, and anti-detection included. Start free." |
| Pricing | "Pricing - Scrapifie" | "Simple, transparent pricing for web scraping. Start free with 1,000 credits. Pro plans from $49/month." |
| About | "About - Scrapifie" | "Learn about Scrapifie, our mission to make web data accessible, and the technology behind our scraping platform." |
| Contact | "Contact Us - Scrapifie" | "Get in touch with the Scrapifie team for sales inquiries, support, or partnerships." |
| Blog Listing | "Blog - Scrapifie" | "Guides, tutorials, and updates from the Scrapifie team on web scraping, data extraction, and API development." |
| Blog Post | "{Post Title} - Scrapifie Blog" | "{Post excerpt or first 155 characters}" |
| Status | "System Status - Scrapifie" | "Current operational status of all Scrapifie services including API, scraping engines, and dashboard." |

### Open Graph and Twitter Cards

Every page includes Open Graph (og:) and Twitter Card meta tags.

| Tag | Value Pattern |
|-----|--------------|
| og:type | "website" for all pages except blog posts ("article") |
| og:title | Same as page title |
| og:description | Same as meta description |
| og:image | Default social share image (configured via environment variable). Blog posts use featured image if available. |
| og:url | Canonical URL of the page |
| twitter:card | "summary_large_image" |
| twitter:site | "@scrapifie" (from environment variable) |

### Structured Data (Schema.org)

| Page | Schema Type | Properties |
|------|------------|------------|
| Landing | Organization + SoftwareApplication | name, url, logo, description, applicationCategory |
| Pricing | Product (for each plan) | name, description, offers (price, currency, availability) |
| Blog Post | Article | headline, datePublished, dateModified, author, description, image |
| FAQ (on pricing) | FAQPage | question, acceptedAnswer for each FAQ item |
| Status | WebPage | name, description |

### Technical SEO

| Requirement | Implementation |
|-------------|---------------|
| Canonical URLs | Every page has a rel="canonical" tag pointing to itself |
| Sitemap | XML sitemap at /sitemap.xml listing all public pages and blog posts. Updated when content changes. |
| Robots.txt | Allows all public pages. Disallows /dashboard/*, /admin/*, /api/*. |
| Trailing slashes | Consistent: no trailing slashes. Redirect /pricing/ to /pricing. |
| 404 page | Custom 404 page with navigation back to home. Returns proper 404 status code. |
| Redirects | Old blog slugs redirect to new slugs with 301. Maintain a redirect table in the database. |
| Hreflang | Not needed for MVP (single language). Placeholder for future internationalization. |

### SPA SEO Considerations

Since Scrapifie uses React + Vite (SPA), the public website pages need special attention for SEO:

| Approach | Detail |
|----------|--------|
| Pre-rendering | Public website pages (landing, pricing, about, contact, blog, status, legal) should be pre-rendered at build time or served via SSR through a lightweight Node.js server. This ensures search engines receive fully-rendered HTML. |
| Dynamic meta tags | Use a server-side middleware or pre-render plugin to inject correct meta tags per route before the HTML reaches the crawler. |
| Dashboard/Admin pages | These do NOT need pre-rendering or SSR. They are behind authentication and should not be indexed. |

---

## 10. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lighthouse Performance Score | 95+ | Run Lighthouse on every public page |
| Largest Contentful Paint (LCP) | Under 2.5 seconds | Measured on 3G throttled connection |
| First Input Delay (FID) | Under 100 milliseconds | Measured on mid-range mobile device |
| Cumulative Layout Shift (CLS) | Under 0.1 | No unexpected layout shifts |
| Time to Interactive (TTI) | Under 3.5 seconds | Measured on 3G throttled connection |
| Total page weight | Under 500KB initial load | Excluding cached assets |
| Image optimization | WebP/AVIF with fallbacks | All images served in modern formats |
| JavaScript bundle | Under 200KB gzipped | Code-split by route |
| CSS | Under 50KB gzipped | Purge unused Tailwind classes |

### Performance Techniques

| Technique | Application |
|-----------|-------------|
| Code splitting | Each route is a separate chunk. Dashboard, admin, and docs code is never loaded on public pages. |
| Lazy loading | Images below the fold use loading="lazy". Non-critical components use React.lazy(). |
| Font optimization | Use system font stack or self-hosted fonts with font-display: swap. No external font CDN requests. |
| Asset caching | Static assets served with immutable cache headers (1 year). HTML served with short cache (5 minutes) or no-cache with revalidation. |
| Compression | Brotli (preferred) or gzip on all text responses. Configured at the reverse proxy (Traefik) level. |
| Preloading | Critical CSS and fonts are preloaded. Above-the-fold images use fetchpriority="high". |
| CDN | All static assets served through Cloudflare CDN. |

---

## 11. Responsive Behavior

### Breakpoint Summary

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| xs (320px) | 320-639px | Single column. Hamburger menu. Stacked cards. Full-width buttons. |
| sm (640px) | 640-767px | Single column with slightly more horizontal space. |
| md (768px) | 768-1023px | Two-column layouts begin. Hamburger menu may persist or transition to horizontal nav. |
| lg (1024px) | 1024-1279px | Full horizontal nav. Three-column card grids. Side-by-side content panels. |
| xl (1280px) | 1280-1439px | Full layout with comfortable spacing. |
| 2xl (1440px) | 1440px+ | Maximum content width (1280px) centered. Extra space is margin. |

### Component-Specific Responsive Rules

| Component | Mobile (xs-sm) | Tablet (md) | Desktop (lg+) |
|-----------|---------------|-------------|----------------|
| Navbar | Logo + hamburger | Logo + hamburger or horizontal | Full horizontal nav |
| Hero | Stacked, full-width CTA | Stacked, centered CTA | Side-by-side or centered |
| Feature cards | 1 per row | 2 per row | 3 per row |
| Pricing cards | 1 per row, swipeable | 2 per row + 1 below | 3 per row |
| Blog cards | 1 per row | 2 per row | 2 per row |
| Footer columns | Accordion (expandable) | 2 columns | 4 columns |
| Contact form | Full width, stacked | Two-column (form + info) | Two-column (form + info) |
| Feature comparison table | Scroll horizontal or compare-two selector | Scroll horizontal | Full table |
| Code example | Stacked (request above, response below) | Side by side | Side by side |

### Touch Targets

All interactive elements (buttons, links, form inputs, toggles) must have a minimum touch target of 44x44 pixels on mobile. This includes:

- Navigation links in the mobile menu
- FAQ accordion headers
- Pagination buttons
- Tag filter buttons
- Social share buttons
- Form submit buttons

---

## 12. Accessibility Checklist

Every public page must pass all items on this checklist.

### Structural

| Requirement | Detail |
|-------------|--------|
| Skip link | "Skip to main content" link as the first focusable element on every page |
| Landmark regions | header, nav, main, footer properly defined |
| Heading hierarchy | h1 is unique per page. h2, h3, h4 follow without skipping levels. |
| Language attribute | html element has lang="en" |
| Page title | Unique, descriptive title element on every page |

### Navigation

| Requirement | Detail |
|-------------|--------|
| Keyboard navigation | All interactive elements reachable via Tab key |
| Focus visibility | Visible focus ring (outline) on all focused elements. Never remove outline without replacement. |
| Focus trap in modals | When mobile menu or modal is open, focus cycles within it |
| Escape key | Closes modals, dropdowns, and mobile menu |
| Active page indicator | Current page is indicated in navigation (aria-current="page") |

### Forms

| Requirement | Detail |
|-------------|--------|
| Labels | Every input has an associated label element |
| Error messages | Errors are announced to screen readers via aria-live="polite" or role="alert" |
| Required fields | Marked with aria-required="true" and visual indicator (asterisk with screen-reader text) |
| Autocomplete | Appropriate autocomplete attributes on name, email fields |
| Submit feedback | Success and error states are announced to screen readers |

### Content

| Requirement | Detail |
|-------------|--------|
| Alt text | All images have descriptive alt text. Decorative images use alt="" |
| Color contrast | Minimum 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold) |
| Link purpose | Link text is descriptive. No "click here" or "read more" without context. Use aria-label if needed. |
| Text resizing | Page remains functional when text is zoomed to 200% |
| Motion | Respect prefers-reduced-motion media query. Disable animations for users who prefer reduced motion. |
| Dark mode | Both themes meet contrast requirements independently |

### Interactive Components

| Component | Accessibility Requirements |
|-----------|--------------------------|
| Accordion (FAQ) | button with aria-expanded, aria-controls pointing to panel. Panel has role="region" and aria-labelledby pointing to button. |
| Dropdown (subject select) | Native select element or custom dropdown with role="listbox", aria-activedescendant, arrow key navigation. |
| Toggle (billing period) | role="radiogroup" with role="radio" options, or role="switch" if binary. aria-checked state. |
| Mobile menu | Dialog-like behavior: focus trap, Escape to close, aria-expanded on trigger. |
| Pagination | nav element with aria-label="Pagination". Current page marked with aria-current="page". |
| Tag filters | role="tablist" with role="tab" for each tag. aria-selected on active tag. |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — Technology stack, URL structure, design constraints
- 02-LEGAL-FRAMEWORK.md — All legal pages linked from the footer
- 17-DOCS-PORTAL.md — Documentation portal linked from navigation
- 20-USER-JOURNEYS.md — Visitor-to-signup conversion flow
- ROADMAP/PHASE-11.md — Implementation timeline for the public website
