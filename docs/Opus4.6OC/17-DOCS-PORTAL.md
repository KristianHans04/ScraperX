# ScraperX Documentation Portal

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-017 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 01-PUBLIC-WEBSITE.md, 06-API-KEY-MANAGEMENT.md, 07-JOBS-AND-LOGS.md |

---

## Table of Contents

1. [Documentation Portal Overview](#1-documentation-portal-overview)
2. [Information Architecture](#2-information-architecture)
3. [Navigation and Layout](#3-navigation-and-layout)
4. [Getting Started Section](#4-getting-started-section)
5. [Guides Section](#5-guides-section)
6. [API Reference Section](#6-api-reference-section)
7. [SDKs and Libraries](#7-sdks-and-libraries)
8. [Code Examples and Snippets](#8-code-examples-and-snippets)
9. [Search](#9-search)
10. [Content Management](#10-content-management)
11. [Versioning](#11-versioning)
12. [SEO and Discoverability](#12-seo-and-discoverability)
13. [Responsive Behavior](#13-responsive-behavior)
14. [Accessibility](#14-accessibility)
15. [Edge Cases](#15-edge-cases)
16. [Related Documents](#16-related-documents)

---

## 1. Documentation Portal Overview

The ScraperX Documentation Portal is a publicly accessible section of the website that provides comprehensive technical documentation for developers integrating with the ScraperX API. It serves as the primary self-service resource for understanding the API, onboarding new users, and reducing support ticket volume.

### Goals

| Goal | Description |
|------|-------------|
| Self-service onboarding | A developer should be able to go from zero to making their first API request within 5 minutes by following the quickstart guide |
| Comprehensive reference | Every API endpoint, parameter, header, response code, and error condition is documented |
| Progressive disclosure | Content is organized from simple (quickstart) to complex (advanced guides), allowing users to go as deep as they need |
| Reduce support load | Common questions are answered in the docs, reducing ticket volume for "how do I..." questions |
| SEO traffic | Documentation pages rank for developer search queries related to web scraping APIs |

### Documentation vs Dashboard

The documentation portal is part of the public website (accessible without authentication at /docs/*). It is distinct from the user dashboard. However, when a logged-in user visits the docs, the top navigation reflects their authenticated state (showing their avatar and a "Dashboard" link instead of "Sign In").

### Technology

The docs portal is part of the same React + Vite SPA as the rest of the public website. Documentation content is stored as Markdown files in the repository and rendered client-side using a Markdown rendering library. This approach allows developers to contribute to documentation via pull requests and keeps docs in version control alongside the codebase.

---

## 2. Information Architecture

The documentation is organized into a three-tier hierarchy inspired by research into GitHub Docs, Stripe Docs, and Anthropic Docs (see research notes).

### Content Tiers

| Tier | Purpose | Examples |
|------|---------|---------|
| Quickstart | Get a user from zero to first API call as fast as possible | "Make your first request" |
| Guides | Task-oriented tutorials that walk through specific use cases | "Scraping with JavaScript rendering", "Using proxy rotation", "Handling pagination" |
| Reference | Exhaustive, specification-level documentation of every endpoint | "POST /v1/scrape", "GET /v1/jobs/:id", error codes |

### Content Map

```
/docs
  /quickstart                    -- Quickstart guide
  /guides
    /authentication              -- API key setup and usage
    /engines                     -- Choosing the right engine
    /http-engine                 -- HTTP engine deep dive
    /browser-engine              -- Browser engine deep dive
    /stealth-engine              -- Stealth engine deep dive
    /proxy-configuration         -- Proxy options and rotation
    /error-handling              -- Error handling best practices
    /rate-limits                 -- Understanding rate limits
    /webhooks                    -- Setting up result webhooks
    /pagination                  -- Scraping paginated content
    /screenshots                 -- Capturing page screenshots
    /credits                     -- Understanding the credit system
    /test-vs-live                -- Test keys vs live keys
  /api-reference
    /overview                    -- API conventions, base URL, auth
    /scrape                      -- POST /v1/scrape
    /jobs                        -- GET /v1/jobs, GET /v1/jobs/:id
    /results                     -- GET /v1/jobs/:id/result
    /account                     -- GET /v1/account
    /usage                       -- GET /v1/usage
    /errors                      -- Error response format, all error codes
  /sdks
    /javascript                  -- JavaScript/Node.js SDK
    /python                      -- Python SDK
    /curl                        -- cURL examples
  /changelog                     -- API changelog
```

### Content Relationships

Each documentation page may link to related pages. These relationships are defined in the content metadata:

| Page Type | Related Content |
|-----------|----------------|
| Quickstart | Links to API key guide, engine selection guide, API reference overview |
| Engine guide | Links to API reference for /v1/scrape with engine-specific parameters highlighted |
| API reference endpoint | Links to relevant guides, error codes page, SDK examples |
| Error codes | Links to error handling guide, specific endpoint references |

---

## 3. Navigation and Layout

### Desktop Layout (1024px and above)

```
+---------------------------------------------------------------+
|  [Logo] ScraperX Docs    [Search bar]    [Dashboard/Sign In]  |
+---------------+-----------------------------------------------+
|               |                                               |
|  Left         |  Content Area                                 |
|  Sidebar      |                                               |
|  (260px)      |  +-------------------------------------------+|
|               |  |  Breadcrumbs                              ||
|  Quickstart   |  |                                           ||
|               |  |  Page Title                     [On This  ||
|  Guides       |  |                                  Page]    ||
|    > Auth     |  |  Content rendered from           (Right   ||
|    > Engines  |  |  Markdown with proper            sidebar  ||
|    > HTTP     |  |  typography, code blocks,        TOC,     ||
|    > Browser  |  |  tables, callouts               200px)   ||
|    > Stealth  |  |                                           ||
|    > Proxy    |  |  [Previous Page]  [Next Page]             ||
|    > Errors   |  +-------------------------------------------+|
|    > ...      |                                               |
|               |                                               |
|  API Ref      |                                               |
|    > Overview |                                               |
|    > /scrape  |                                               |
|    > /jobs    |                                               |
|    > ...      |                                               |
|               |                                               |
|  SDKs         |                                               |
|    > JS       |                                               |
|    > Python   |                                               |
|    > cURL     |                                               |
|               |                                               |
|  Changelog    |                                               |
+---------------+-----------------------------------------------+
```

### Left Sidebar

| Property | Value |
|----------|-------|
| Width | 260px fixed |
| Position | Sticky, scrolls independently from content |
| Content | Hierarchical navigation tree with collapsible sections |
| Active state | Current page highlighted with primary color left border and background tint |
| Collapse behavior | Sections (Guides, API Reference, SDKs) are collapsible. Current section auto-expands on page load |
| Scroll | If navigation exceeds viewport height, sidebar scrolls independently |

### Right Sidebar (On This Page)

| Property | Value |
|----------|-------|
| Width | 200px fixed |
| Position | Sticky |
| Content | Table of contents generated from H2 and H3 headings on the current page |
| Active state | Current section highlighted based on scroll position (intersection observer) |
| Visibility | Only appears if the page has 3 or more headings. Hidden on pages with fewer headings |

### Content Area

| Property | Value |
|----------|-------|
| Max width | 720px (text content) |
| Typography | Proportional font for prose, monospace for code. Base size 16px, line height 1.6 |
| Headings | H1 for page title (one per page), H2 for sections, H3 for subsections |
| Code blocks | Syntax-highlighted with language label, copy button, line numbers for blocks >5 lines |
| Tables | Full-width within content area, horizontal scroll on overflow |
| Images | Max-width 100% of content area, lazy loaded, alt text required |
| Callouts | Styled boxes for Note, Warning, Tip, Important with distinct colors/icons |

### Breadcrumbs

Format: `Docs > [Section] > [Page Title]`

Example: `Docs > Guides > Browser Engine`

Breadcrumbs appear above the page title and are clickable for navigation.

### Previous/Next Navigation

At the bottom of every page, navigation links to the previous and next pages in the documentation order.

```
+---------------------------+---------------------------+
|  < Previous               |               Next >      |
|  Authentication Guide     |  Stealth Engine Guide     |
+---------------------------+---------------------------+
```

The order follows the sidebar navigation sequence.

### Top Navigation Bar

The docs portal shares the global website navigation bar (01-PUBLIC-WEBSITE.md) with modifications:

| Element | Behavior |
|---------|----------|
| Logo | Links to /docs (docs home), not / (main website) |
| "ScraperX Docs" label | Appears next to the logo to indicate the docs context |
| Search bar | Centered, searches documentation content only (see Section 9) |
| Dashboard / Sign In | Right-aligned, same as global header |
| Main website link | A "Back to ScraperX" link in the header for navigating out of docs |

---

## 4. Getting Started Section

### Quickstart Page (/docs/quickstart)

The quickstart is the most important page in the documentation. It takes a developer from zero knowledge to a successful API request.

**Page Structure:**

| Section | Content |
|---------|---------|
| Introduction | One paragraph: what ScraperX does and what you will accomplish in this guide |
| Prerequisites | List: ScraperX account, API key (link to dashboard to create one) |
| Step 1: Get Your API Key | Brief instructions with link to API key creation in dashboard. Show the key format (sk_live_ prefix). Link to 06-API-KEY-MANAGEMENT.md concepts (test vs live keys) |
| Step 2: Make Your First Request | A cURL example showing a minimal POST /v1/scrape request with required parameters only. Tabbed code examples for cURL, JavaScript, and Python |
| Step 3: Understand the Response | Annotated response body showing each field and what it means |
| Step 4: Check Job Status | If the job is async, show how to poll GET /v1/jobs/:id. Show the status progression |
| Step 5: Get the Result | Show GET /v1/jobs/:id/result and the response format |
| Next Steps | Links to: choosing the right engine, proxy configuration, error handling, full API reference |

**Code Example Tabs:**

Each code example appears in a tabbed container with tabs for different languages/tools:

```
+--------+--------------+----------+
| cURL   | JavaScript   | Python   |
+--------+--------------+----------+
|                                   |
|  curl -X POST \                   |
|    https://api.scraperx.com/...   |
|    -H "Authorization: ..."       |
|    -H "Content-Type: ..."        |
|    -d '{...}'                    |
|                                   |
|                        [Copy]     |
+-----------------------------------+
```

The selected tab preference is persisted in localStorage so returning users see their preferred language.

### Quickstart Design Principles

| Principle | Implementation |
|-----------|----------------|
| Minimal friction | Only show required parameters. Advanced options are linked, not shown |
| Copy-paste ready | Every code block can be copied with one click. Placeholder values (like API key) use obvious placeholder text: YOUR_API_KEY |
| Progressive | Each step builds on the previous. The reader has a working integration by the end |
| No assumptions | Do not assume the reader knows what web scraping is, what an API key is, or how HTTP requests work. Brief explanations accompany each concept |
| Time estimate | Display "5 minutes" at the top of the page so users know the expected time commitment |

---

## 5. Guides Section

Guides are task-oriented documents that explain how to accomplish specific goals with the ScraperX API. Unlike the API reference (which is specification-level), guides explain the "why" and "when" alongside the "how."

### Guide Template

Every guide follows this structure:

| Section | Purpose |
|---------|---------|
| Title | Clear, task-oriented: "Scraping with the Browser Engine" not "Browser Engine Documentation" |
| Overview | 2-3 sentences explaining what this guide covers and who it is for |
| Prerequisites | What the reader needs before starting (account, API key, specific plan, etc.) |
| Concepts | Explanation of relevant concepts (e.g., what headless browsers are, why stealth is needed) |
| Step-by-step instructions | Numbered steps with code examples showing the API calls |
| Common patterns | Frequently used configurations or patterns for this feature |
| Troubleshooting | Common issues and how to resolve them |
| Related resources | Links to API reference, other guides, FAQ |

### Guide Inventory

| Guide | Route | Content Summary |
|-------|-------|----------------|
| Authentication | /docs/guides/authentication | How API key authentication works. Header format. Test vs live keys. Key rotation. Covers concepts from 06-API-KEY-MANAGEMENT.md in a developer-facing way |
| Choosing an Engine | /docs/guides/engines | Decision tree for selecting HTTP vs Browser vs Stealth. When to use each. Credit cost comparison. Performance characteristics |
| HTTP Engine | /docs/guides/http-engine | Deep dive into the HTTP engine. Request options (headers, cookies, method). Response formats. When HTTP is sufficient. Limitations |
| Browser Engine | /docs/guides/browser-engine | When to use browser rendering. Wait conditions (wait for selector, wait for network idle). JavaScript execution. Screenshot capture. Cookie injection |
| Stealth Engine | /docs/guides/stealth-engine | Anti-detection capabilities. Fingerprint management. When detection avoidance is necessary. Stealth vs Browser tradeoffs. Higher credit cost justification |
| Proxy Configuration | /docs/guides/proxy-configuration | How ScraperX handles proxy rotation. Geo-targeting options. Sticky sessions. When to specify proxy preferences vs letting the system choose |
| Error Handling | /docs/guides/error-handling | Error response format. Retryable vs non-retryable errors. Implementing retry logic. Interpreting error codes (links to APPENDICES/C-ERROR-CODES.md). Circuit breaker patterns |
| Rate Limits | /docs/guides/rate-limits | Rate limit headers in responses. How to detect rate limiting. Backoff strategies. Per-plan limits. Requesting limit increases |
| Webhooks | /docs/guides/webhooks | Configuring webhook URLs for async job completion. Webhook payload format. Verifying webhook signatures. Retry behavior for failed webhook deliveries. Security best practices |
| Pagination | /docs/guides/pagination | Strategies for scraping paginated content. Sequential page scraping. Using the API to handle multi-page targets. Credit cost considerations for paginated scraping |
| Screenshots | /docs/guides/screenshots | Requesting page screenshots. Full-page vs viewport screenshots. Image format and quality options. Retrieving screenshot results. Credit cost (included in browser/stealth job cost) |
| Credit System | /docs/guides/credits | How credits work. Per-engine costs. Checking balance via API. Credit deduction timing. What happens at zero credits. Plan comparison |
| Test vs Live Keys | /docs/guides/test-vs-live | Purpose of test keys. Test URL allowlist. How test keys behave differently. Using test keys during development. Switching to live keys for production |

### Guide Content Standards

| Standard | Rule |
|----------|------|
| Code examples | Every guide includes at least 3 code examples in cURL, JavaScript, and Python |
| Response examples | Show full API responses, not truncated ones. Annotate significant fields |
| Callout boxes | Use "Note" for supplementary info, "Warning" for gotchas, "Tip" for best practices |
| Cross-links | Every guide links to the relevant API reference endpoint(s) |
| Word count | Target 1,000-2,500 words per guide. Long enough to be comprehensive, short enough to read in one sitting |
| Freshness | Guides must be updated whenever the API changes. The changelog (Section 11) links to affected guides |

---

## 6. API Reference Section

The API reference is the specification-level documentation for every API endpoint. It follows a consistent two-column layout for endpoints.

### API Reference Overview Page (/docs/api-reference/overview)

This page covers conventions that apply to all endpoints:

| Topic | Content |
|-------|---------|
| Base URL | The API base URL (configured via environment variable, displayed as a placeholder: https://api.scraperx.com) |
| Authentication | All requests require an API key in the Authorization header: `Authorization: Bearer sk_live_...`. Link to authentication guide |
| Content Type | All request bodies are JSON. All responses are JSON (except result downloads). Content-Type: application/json |
| HTTP Methods | Which methods are used (POST for creating jobs, GET for retrieving data) |
| Request IDs | Every response includes an X-Request-ID header for debugging and support |
| Pagination | List endpoints use cursor-based pagination with `cursor` and `limit` parameters |
| Rate Limiting | Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. Link to rate limits guide |
| Error Format | Standard error response structure with `error` object containing `code`, `message`, `details` |
| Idempotency | POST requests accept an Idempotency-Key header to prevent duplicate job creation |
| Versioning | API version is in the URL path (/v1/). Breaking changes result in a new version |

### Endpoint Documentation Template

Each endpoint page follows a two-column layout:

```
+-------------------------------+-------------------------------+
|  Left Column (Description)    |  Right Column (Examples)      |
|                               |                               |
|  POST /v1/scrape              |  Request Example:             |
|                               |                               |
|  Description of what this     |  [cURL | JS | Python]         |
|  endpoint does.               |                               |
|                               |  curl -X POST ...             |
|  Parameters:                  |                               |
|                               |  Response Example:            |
|  | Name | Type | Required |  |                               |
|  | url  | str  | yes      |  |  {                            |
|  | engine| str | no       |  |    "id": "...",               |
|  | ...  | ...  | ...      |  |    "status": "queued",        |
|                               |    ...                        |
|  Response:                    |  }                            |
|                               |                               |
|  | Field | Type | Desc    |  |  Error Example:               |
|  | id    | str  | Job ID  |  |                               |
|  | ...   | ...  | ...     |  |  {                            |
|                               |    "error": {                 |
|  Status Codes:                |      "code": "...",           |
|  200, 400, 401, 429          |      "message": "..."         |
|                               |    }                          |
|  Errors:                      |  }                            |
|  List of possible errors      |                               |
+-------------------------------+-------------------------------+
```

### Endpoint Inventory

| Endpoint | Method | Route | Description |
|----------|--------|-------|-------------|
| Create Scrape Job | POST | /v1/scrape | Submit a new scraping job |
| List Jobs | GET | /v1/jobs | List all jobs for the authenticated account |
| Get Job | GET | /v1/jobs/:id | Get details of a specific job |
| Cancel Job | POST | /v1/jobs/:id/cancel | Cancel a queued or processing job |
| Get Job Result | GET | /v1/jobs/:id/result | Retrieve the scraped content |
| Get Job Screenshot | GET | /v1/jobs/:id/screenshot | Retrieve the page screenshot (if captured) |
| Get Account | GET | /v1/account | Get account details and plan information |
| Get Usage | GET | /v1/usage | Get credit usage statistics |

### Parameter Documentation Format

Each parameter is documented with:

| Property | Description |
|----------|-------------|
| Name | Parameter name as used in the JSON body or query string |
| Type | Data type (string, integer, boolean, object, array) |
| Required | Yes / No |
| Default | Default value if not provided |
| Description | What the parameter does |
| Constraints | Validation rules (min/max length, allowed values, format) |
| Example | An example value |

### POST /v1/scrape Parameters (Reference)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| url | string | Yes | -- | Target URL to scrape. Must be a valid HTTP/HTTPS URL. Max 2,048 characters |
| engine | string | No | "http" | Scraping engine: "http", "browser", or "stealth" |
| method | string | No | "GET" | HTTP method for the request (HTTP engine only) |
| headers | object | No | {} | Custom headers to include in the request |
| cookies | array | No | [] | Cookies to inject. Each cookie has name, value, domain, path |
| proxy | object | No | null | Proxy preferences: country (ISO 3166-1 alpha-2), sticky (boolean) |
| wait_for | string | No | null | CSS selector to wait for before capturing content (Browser/Stealth only) |
| wait_timeout | integer | No | 30000 | Milliseconds to wait for wait_for condition (Browser/Stealth only) |
| screenshot | boolean | No | false | Capture a screenshot of the page (Browser/Stealth only) |
| screenshot_full_page | boolean | No | false | Capture full page screenshot vs viewport only |
| javascript | string | No | null | JavaScript code to execute on the page before capturing (Browser/Stealth only) |
| webhook_url | string | No | null | URL to receive a POST request when the job completes |
| webhook_secret | string | No | null | Secret used to sign webhook payloads (HMAC-SHA256) |
| idempotency_key | string | No | null | Unique key to prevent duplicate job creation. Valid for 24 hours |
| metadata | object | No | {} | User-defined key-value pairs attached to the job. Max 10 keys, 256 chars per value |

### Response Documentation Format

Each response field is documented with: name, type, description, and whether it is always present or conditional.

### Status Codes

Each endpoint documents which HTTP status codes it may return:

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| 200 | OK | Successful GET requests |
| 201 | Created | Successful POST /v1/scrape (job created) |
| 400 | Bad Request | Invalid parameters, validation failure |
| 401 | Unauthorized | Missing or invalid API key |
| 402 | Payment Required | Insufficient credits |
| 403 | Forbidden | Account suspended or restricted |
| 404 | Not Found | Job ID does not exist or does not belong to the authenticated account |
| 409 | Conflict | Idempotency key reused with different parameters |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance mode or engine unavailable |

---

## 7. SDKs and Libraries

### SDK Documentation Pages

Each SDK page (/docs/sdks/javascript, /docs/sdks/python) covers:

| Section | Content |
|---------|---------|
| Installation | Package manager command (npm/pip) |
| Initialization | How to create a client instance with the API key |
| Configuration | Options: base URL override, timeout, retry behavior |
| Making a Request | Code example for a basic scrape job |
| Async/Polling | How to wait for job completion (polling helper) |
| Webhook Setup | Configuring webhooks via the SDK |
| Error Handling | How SDK-specific errors map to API errors |
| Type Definitions | Available types/interfaces for request/response objects |
| Full Example | A complete, runnable example from start to finish |

### SDK Availability (MVP)

| SDK | Status | Package Name |
|-----|--------|-------------|
| JavaScript/Node.js | Planned | @scraperx/sdk |
| Python | Planned | scraperx |
| cURL | Not a SDK, but documented as a tool | -- |

SDKs will be developed as part of a future phase (post-platform launch). The documentation portal includes placeholder pages explaining that official SDKs are coming soon, with cURL examples available immediately and community SDKs welcome.

### cURL Examples Page

Since cURL is available from day one, the /docs/sdks/curl page provides copy-paste cURL commands for every endpoint. Each command includes:

- The complete cURL command with all headers
- A placeholder for the API key: `YOUR_API_KEY`
- Pretty-printed response examples
- Notes on how to parse the JSON response using jq

---

## 8. Code Examples and Snippets

### Code Block Features

All code blocks in the documentation have:

| Feature | Description |
|---------|-------------|
| Syntax highlighting | Language-appropriate highlighting (bash for cURL, javascript, python, json) |
| Language label | A label in the top-left corner of the block showing the language |
| Copy button | A button in the top-right corner that copies the code to clipboard. Visual feedback: "Copied!" for 2 seconds |
| Line numbers | Displayed for blocks with more than 5 lines. Optional for shorter blocks |
| Wrapping | Long lines wrap rather than creating horizontal scroll. Line numbers track logical lines, not visual lines |

### Language Tab Component

Multi-language examples use a tabbed component:

| Behavior | Description |
|----------|-------------|
| Tab persistence | Selected language tab persists across all code examples on the page and across pages via localStorage |
| Tab order | cURL first (universal), then JavaScript, then Python |
| Consistent examples | Each tab shows equivalent functionality -- the same request/response in different languages |
| Independent scroll | Each tab's code block scrolls independently |

### Placeholder Values

Code examples use consistent placeholder values:

| Placeholder | Used For |
|-------------|----------|
| YOUR_API_KEY | API key in Authorization header |
| https://example.com | Target URL in scrape requests |
| job_abc123 | Job ID in status/result requests |
| https://your-server.com/webhook | Webhook URL |
| wh_secret_xyz | Webhook secret |

A callout above the first code example on each page reminds users: "Replace placeholder values with your actual credentials."

---

## 9. Search

### Search Implementation

The documentation portal includes a dedicated search feature for finding content across all documentation pages.

### Search Trigger

| Trigger | Behavior |
|---------|----------|
| Search bar | Visible in the top navigation bar, click to focus |
| Keyboard shortcut | Cmd+K (macOS) / Ctrl+K (other) opens the search modal |
| Slash key | Pressing "/" when not focused on an input field focuses the search bar |

### Search Modal

```
+-----------------------------------------------+
|  [Search icon] Search docs...          [Esc]   |
+-----------------------------------------------+
|                                                |
|  Results:                                      |
|                                                |
|  [Page icon] POST /v1/scrape                   |
|  API Reference > Scrape                        |
|  "...submit a new scraping job with the..."    |
|                                                |
|  [Page icon] Browser Engine Guide              |
|  Guides > Browser Engine                       |
|  "...configure wait conditions for dynamic..." |
|                                                |
|  [Page icon] Error Handling                    |
|  Guides > Error Handling                       |
|  "...implement retry logic for transient..."   |
|                                                |
+-----------------------------------------------+
|  [Arrow keys] Navigate  [Enter] Open  [Esc]   |
+-----------------------------------------------+
```

### Search Behavior

| Property | Value |
|----------|-------|
| Search type | Client-side full-text search using a pre-built index |
| Index | Built at build time from all Markdown documentation files. Includes title, headings, and body text. Excludes code blocks from indexing |
| Ranking | Title matches ranked highest, then heading matches, then body matches |
| Results | Maximum 10 results displayed. Each result shows: page title, breadcrumb path, and a content snippet with the matching text highlighted |
| Debounce | Search triggers 200ms after the user stops typing |
| No results | Display: "No results found for '[query]'. Try different keywords or browse the navigation." |
| Navigation | Arrow keys move through results. Enter opens the selected result. Esc closes the modal |

### Search Indexing

The search index is generated at build time:

1. All Markdown files in the docs content directory are parsed
2. Title, headings, and body text are extracted
3. Code blocks and metadata are excluded
4. Content is tokenized and added to a search index (e.g., using lunr.js, Fuse.js, or similar client-side search library)
5. The index is emitted as a JSON file and loaded on first search interaction (lazy loaded, not blocking initial page load)
6. Index size should be monitored -- if it exceeds 500KB, consider switching to a server-side search endpoint

---

## 10. Content Management

### Content Storage

Documentation content is stored as Markdown files in the application repository under a dedicated directory (e.g., content/docs/). Each file represents one documentation page.

### Markdown File Structure

Each Markdown file includes frontmatter metadata:

```
---
title: Browser Engine Guide
description: How to use the browser engine for JavaScript-rendered pages
section: guides
order: 4
last_updated: 2026-02-08
---

# Browser Engine Guide

Content starts here...
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Page title, used in sidebar nav and browser tab |
| description | string | Yes | Meta description for SEO, used in search results |
| section | string | Yes | Navigation section: quickstart, guides, api-reference, sdks, changelog |
| order | integer | Yes | Sort order within the section |
| last_updated | date | Yes | Last modification date, displayed on the page |
| tags | array | No | Tags for search relevance boosting |
| related | array | No | Slugs of related pages, displayed at the bottom |

### Content Components

Beyond standard Markdown, the documentation supports custom components rendered by the React Markdown processor:

| Component | Syntax | Rendering |
|-----------|--------|-----------|
| Callout (Note) | `:::note` ... `:::` | Blue-bordered box with info icon |
| Callout (Warning) | `:::warning` ... `:::` | Yellow-bordered box with warning icon |
| Callout (Tip) | `:::tip` ... `:::` | Green-bordered box with lightbulb icon |
| Callout (Important) | `:::important` ... `:::` | Red-bordered box with exclamation icon |
| Code tabs | ````tabs` ... ````  | Language-tabbed code block container |
| Parameter table | Standard Markdown table with specific headers | Styled parameter documentation table |
| Endpoint header | Custom syntax | Rendered as colored method badge + path |

### Content Update Process

1. Developer creates or edits a Markdown file in the docs content directory
2. Changes are submitted as a pull request
3. Pull request is reviewed for technical accuracy and writing quality
4. Upon merge, the build pipeline rebuilds the docs site with the updated content
5. The search index is regenerated
6. Changes are deployed

### Content Review Checklist

Before merging documentation changes:

| Check | Description |
|-------|-------------|
| Technical accuracy | Code examples work as shown. API parameters match the actual API |
| Formatting | Markdown renders correctly. No broken links. Images have alt text |
| Cross-references | Links to other docs pages use relative paths and are valid |
| Frontmatter | All required fields present and correct |
| Code examples | All three languages (cURL, JavaScript, Python) are provided where applicable |
| Changelog | If documenting a new feature or API change, the changelog is also updated |

---

## 11. Versioning

### API Versioning in Docs

The documentation defaults to the latest API version (v1). If a v2 is released in the future, the docs portal will support version switching.

### Version Selector (Future)

When multiple API versions exist, a version dropdown appears in the top navigation bar:

| Element | Behavior |
|---------|----------|
| Dropdown label | "v1" (current selected version) |
| Options | List of available versions with the latest marked as "(Latest)" |
| Selection | Switching versions reloads the page with version-specific content |
| URL structure | Version is embedded in the URL: /docs/v1/quickstart, /docs/v2/quickstart |
| Default | Always defaults to the latest version |
| Deprecation notice | Deprecated versions show a banner: "You are viewing documentation for API v[X], which is deprecated. [Switch to latest version]" |

### Changelog (/docs/changelog)

The changelog tracks API changes over time.

**Changelog Entry Format:**

| Field | Content |
|-------|---------|
| Date | Release date |
| Version label | Version tag (e.g., "2026-02-08") |
| Category | Added / Changed / Deprecated / Fixed / Removed |
| Description | What changed, with links to affected documentation pages |
| Migration notes | For breaking changes: what developers need to do to update their integration |

**Changelog Page Layout:**

Entries are listed in reverse chronological order (newest first). Each entry is a card with the date as the header, followed by categorized lists of changes. Categories use colored badges:
- Added: green
- Changed: blue
- Deprecated: yellow
- Fixed: gray
- Removed: red

---

## 12. SEO and Discoverability

### SEO Strategy for Docs

| Tactic | Implementation |
|--------|----------------|
| Unique titles | Each page has a unique, descriptive title tag: "[Page Title] - ScraperX Docs" |
| Meta descriptions | Each page has a unique meta description from frontmatter (max 160 characters) |
| Canonical URLs | Each page has a canonical URL to prevent duplicate content issues |
| Open Graph tags | Title, description, and a default docs OG image for social sharing |
| Structured data | HowTo schema for guide pages, FAQPage schema for the errors/FAQ page |
| Sitemap | Documentation pages are included in the site-wide sitemap.xml |
| Internal linking | Every page links to at least 2 other documentation pages |
| URL structure | Clean, descriptive URLs: /docs/guides/browser-engine not /docs/guides/3 |
| Pre-rendering | Since the app is a React SPA, documentation pages must be pre-rendered for search engine crawlers. Use a pre-rendering service or static site generation for the docs section |
| robots.txt | Allow all documentation pages. Disallow search result pages (/docs/search?q=...) |

### Performance

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 95+ |
| LCP (Largest Contentful Paint) | <2.0 seconds |
| Time to Interactive | <3.0 seconds |
| Search index load | Lazy loaded, does not block page render |
| Code highlighting | Lazy loaded per language, only loads languages present on the page |

---

## 13. Responsive Behavior

### Tablet (768px - 1023px)

| Change | Description |
|--------|-------------|
| Left sidebar | Collapses into an off-screen drawer, toggled by a hamburger icon |
| Right sidebar (TOC) | Hidden. "On This Page" accessible via a floating button |
| Content area | Full width minus padding |
| Code blocks | Maintain syntax highlighting, horizontal scroll if needed |
| Two-column API layout | Collapses to single column -- description above, code example below |

### Mobile (below 768px)

| Change | Description |
|--------|-------------|
| Left sidebar | Off-screen drawer with overlay |
| Right sidebar | Hidden entirely. Section navigation via anchor links in the content |
| Top navigation | Logo + hamburger + search icon |
| Search | Opens as full-screen overlay |
| Code blocks | Full width, horizontal scroll enabled, copy button remains visible |
| Previous/Next nav | Stacked vertically instead of side by side |
| Tables | Horizontal scroll with a visual indicator (shadow on the right edge) |
| Breadcrumbs | Truncated to show only the immediate parent: `... > Browser Engine` |
| Language tabs | Scrollable horizontally if tabs do not fit |

---

## 14. Accessibility

### Documentation Accessibility Standards

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All interactive elements (sidebar links, tabs, search, copy buttons) are keyboard accessible |
| Screen reader support | Proper heading hierarchy (H1 > H2 > H3). Code blocks have aria-label. Callout boxes have role="note" or role="alert" |
| Color contrast | All text meets WCAG 2.1 AA contrast ratios in both light and dark mode |
| Focus indicators | Visible focus ring on all interactive elements |
| Skip to content | A "Skip to main content" link appears on Tab press, bypassing navigation |
| Code blocks | Copy button has aria-label="Copy code". Copied state announced via aria-live region |
| Images | All images have descriptive alt text |
| Tables | Tables use proper thead/tbody/th structure. Complex tables have caption elements |
| Language tabs | Tabs use role="tablist", role="tab", role="tabpanel" with proper aria attributes |
| Search | Search input has proper label. Results are announced via aria-live region |
| Links | All links have descriptive text (no "click here"). External links are announced |

---

## 15. Edge Cases

| Scenario | Handling |
|----------|----------|
| User navigates to a docs URL that does not exist | 404 page within the docs context: "Page not found. This page may have been moved or deleted. Try searching or browsing the navigation." |
| Markdown content contains invalid syntax | Markdown renderer displays raw text for unparseable sections rather than crashing. Build-time linting catches most issues |
| Search index fails to load | Search bar displays a message: "Search is temporarily unavailable. Please browse using the navigation." Logs an error for monitoring |
| Code example contains characters that break the copy function | Code is stored as raw text and copied as-is. HTML entities in code blocks are decoded before copying |
| User visits docs with JavaScript disabled | Pre-rendered content is available. Navigation works via standard links. Search and language tabs are not functional without JavaScript. A noscript message: "JavaScript is required for search and interactive features" |
| Documentation references an API endpoint that has been removed | Removed endpoint pages display a deprecation banner and link to the replacement. Old URLs redirect to the new endpoint page if applicable |
| User lands on a docs page via search engine and the page structure has changed | Implement redirects for moved pages. Return 301 redirects for renamed URLs |
| Very long code examples overflow the viewport | Code blocks scroll horizontally. A visual indicator (gradient fade or shadow) on the right edge signals that more content is available |
| User copies code that includes line numbers | Copy function copies only the code content, not line numbers. Line numbers are rendered via CSS pseudo-elements, not selectable text |
| Screen reader encounters a code tab component | Each tab is properly labeled. Switching tabs announces the new content via aria-live |
| Documentation page has no H2/H3 headings | Right sidebar (On This Page) is hidden. Page renders normally without a table of contents |
| Image in documentation fails to load | Alt text is displayed. A placeholder icon indicates the broken image. Surrounding content is not disrupted |

---

## 16. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform context and URL structure (/docs/* routes) |
| 01-PUBLIC-WEBSITE.md | Global navigation and footer shared with the docs portal. SEO strategy alignment |
| 06-API-KEY-MANAGEMENT.md | API key concepts documented in the quickstart and authentication guide |
| 07-JOBS-AND-LOGS.md | Job lifecycle and states documented in the API reference |
| 08-USAGE-AND-ANALYTICS.md | Credit usage concepts documented in the credits guide |
| 09-BILLING-AND-CREDITS.md | Plan limits and credit costs documented in the rate limits and credits guides |
| 14-ADMIN-MODERATION.md | Blog/content management for status page, which may reference documentation |
| APPENDICES/C-ERROR-CODES.md | Complete error code reference that the errors documentation page draws from |
