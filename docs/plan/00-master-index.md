# Scrapifie Platform Plan — Master Index

> This is the single entry point for the entire Scrapifie platform plan. Every document below is deeply detailed and cross-linked. Before any code is written for any phase, the relevant documents here should be read in full. If you are in Phase 8 building the billing page, you should still read the security document, the audit log document, and the user journeys document to understand how your work connects to the rest of the system.

---

## How to Read This Plan

Each document covers one focused area of the platform. Documents are organized into folders by domain. Within every document you will find:

- Detailed descriptions of every element on every view
- Exact behavior for every interaction, edge case, and error state
- Cross-references to related documents using relative links
- Tables describing every field, every state, every transition
- ASCII wireframes showing layout and element placement
- No source code — everything is described in plain language

---

## Document Map

### Foundation

| Document | What It Covers |
|----------|---------------|
| [Platform Overview](./01-platform-overview.md) | What Scrapifie is, the three application zones, URL structure, tech stack decisions, and the high-level sitemap of every page in the system |

### Public Website

| Document | What It Covers |
|----------|---------------|
| [Landing Page](./public-pages/landing-page.md) | Every section of the marketing homepage — hero, social proof, features, how it works, engine comparison, pricing preview, FAQ, footer — with exact content descriptions and layout |
| [Pricing Page](./public-pages/pricing-page.md) | All three plans compared feature by feature, credit add-on packs, annual vs monthly toggle, enterprise CTA, and every FAQ answer |
| [About, Contact, Blog, and Status Pages](./public-pages/about-contact-blog-status.md) | Company information, contact form fields and routing, blog listing and post structure, and the system status page with incident history |

### Legal Framework

| Document | What It Covers |
|----------|---------------|
| [Terms of Service](./legal/terms-of-service.md) | Every clause of the ToS — neutral tool provider positioning, user obligations for scraping legality, credit and billing terms, liability caps, indemnification, governing law (Delaware), and dispute resolution |
| [Privacy Policy](./legal/privacy-policy.md) | What data we collect and do not collect, how we use it, who we share with, data retention periods, GDPR and CCPA rights, international transfers, and the critical statement that we do not access scraped content |
| [Acceptable Use Policy](./legal/acceptable-use-policy.md) | Every prohibited activity organized by category — illegal scraping, data protection violations, harmful activities, platform abuse — with enforcement escalation ladder and reporting process |
| [DPA, Cookie Policy, and Sub-Processors](./legal/dpa-cookies-subprocessors.md) | Data Processing Agreement structure for GDPR, cookie categories and consent banner behavior, and the sub-processor list with change notification process |

### Authentication and Access Control

| Document | What It Covers |
|----------|---------------|
| [Authentication System](./auth/authentication-system.md) | Sign up form (every field, validation, OAuth buttons), email verification flow, post-signup onboarding wizard (every step), sign in, password reset, two-factor authentication setup and recovery, and session management rules |
| [Roles and Permissions](./auth/roles-and-permissions.md) | All seven roles defined (SuperAdmin through Billing), complete permission matrix for every action in the system, how role assignment works, what each role can and cannot see, and edge cases like the last owner leaving |

### User Dashboard

| Document | What It Covers |
|----------|---------------|
| [Dashboard Layout, Overview, and Onboarding](./dashboard/overview-and-onboarding.md) | The persistent layout (top bar, sidebar, content area), every sidebar item, the credit bar at the bottom, the organization switcher, the command palette, the first-time onboarding checklist, and the returning user overview with its four metric cards, usage chart, alerts panel, and recent jobs table |
| [API Key Management](./dashboard/api-keys.md) | The key list view with every column and status badge, the create key modal with every field and option, the one-time key reveal dialog, the revoke confirmation with typed name confirmation, test vs live key differences, IP whitelisting, expiration options, scope selection, and the security rules governing key storage and display |
| [Jobs and Request Logs](./dashboard/jobs-and-logs.md) | The jobs table with every column and filter, pagination, the job detail view with timeline and tabbed response viewer, the real-time API request log stream, log entry expansion showing full request and response, and every filter and search interaction |
| [Usage and Analytics](./dashboard/usage-and-analytics.md) | The usage overview with total jobs, credits used, and success rate cards, usage broken down by engine as bar charts, credits broken down by engine, the daily usage time-series chart with period selectors, top scraped domains table, and CSV and PDF export options |
| [Billing and Credits](./dashboard/billing-and-credits.md) | The current plan display, the credit balance bar with reset countdown, the change plan modal with upgrade and downgrade behavior, the buy credits flow, credit alert configuration, payment method management, invoice history with PDF downloads, and the complete credit lifecycle including the no-rollover rule and failed payment escalation |
| [Team Management](./dashboard/team-management.md) | The members list with role badges, the invite member modal with email and role selection, pending invitation management, role change dropdown, member removal confirmation, seat limits per plan, and the ownership transfer flow |
| [Settings and Support](./dashboard/settings-and-support.md) | Every tab of the settings page — Profile, Organization, Security, Notifications, and Danger Zone — with every field, toggle, and action described, plus the support page with ticket submission form, ticket list, and ticket detail view |

### Admin Dashboard

| Document | What It Covers |
|----------|---------------|
| [Admin Overview](./admin/admin-overview.md) | The admin sidebar navigation with every item, the admin overview page with system status, four KPI cards, the action-required panel, the revenue chart, and the queue health display |
| [Organization Management](./admin/organization-management.md) | The organization list with filters and status badges, the organization detail page with every tab (overview, members, API keys, usage, billing, actions), admin actions (credit adjustment, plan change, send notice), and how admin views differ from user views |
| [Moderation, Abuse, and Verification](./admin/moderation-and-abuse.md) | The abuse report queue with severity levels, the investigation workflow, the warning-suspension-ban escalation, the ban modal with every option and consequence, the verification queue with auto-checks and manual review criteria, and the banned accounts list with appeal handling |
| [Finance and Credit Ledger](./admin/finance-and-credits.md) | The revenue dashboard with MRR, revenue breakdown, and plan distribution, the subscription list, the failed payments queue with retry and contact actions, the system-wide credit ledger with manual adjustments, and the end-of-month credit reset process |
| [Operations, System Health, and Audit Log](./admin/operations-and-audit.md) | The system health dashboard with per-component status, the queue monitor with depth and latency metrics, the job inspector for debugging individual jobs, the error log with filtering, and the audit log showing every significant action with actor, target, and metadata |

### API Documentation Portal

| Document | What It Covers |
|----------|---------------|
| [Documentation Portal Design](./docs-portal/documentation-portal.md) | The three-column layout (sidebar, content, page TOC), the information architecture with five tiers (Getting Started, API Reference, Guides, SDKs, Changelog), the endpoint page template with parameter tables, language-tabbed examples, and response displays, and every UX feature including search, dark mode, API key injection, version selector, and feedback widget |

### Data and Infrastructure

| Document | What It Covers |
|----------|---------------|
| [Data Models and Relationships](./data/data-models.md) | Every entity in the system described in plain language — what it represents, what fields it has, what each field means, how entities relate to each other, and what indexes are needed for performance — covering users, organizations, memberships, subscriptions, API keys, jobs, results, credit transactions, invoices, tickets, abuse reports, moderation actions, audit entries, sessions, and verification records |

### Security

| Document | What It Covers |
|----------|---------------|
| [Security Framework](./security/security-framework.md) | Encryption at rest and in transit, API key hashing and storage, password requirements and hashing, session token security, rate limiting as security, input validation strategy, CSRF and XSS protection, audit logging requirements for compliance, data isolation between organizations, admin access controls, secret management, dependency security, and incident response |

### Testing

| Document | What It Covers |
|----------|---------------|
| [Testing Strategy](./testing/testing-strategy.md) | What types of tests to write for each phase (unit, integration, end-to-end), what specifically must be tested in every feature area, testing authentication and authorization edge cases, testing billing webhooks and credit flows, testing admin moderation actions, performance benchmarks, and security testing requirements |

### Implementation

| Document | What It Covers |
|----------|---------------|
| [Phases and Roadmap](./implementation/phases-and-roadmap.md) | Every implementation phase (6 through 12) broken down into specific tasks, the order of operations, what must be completed before the next phase starts, dependencies between phases, and the definition of done for each phase |

### User Flows

| Document | What It Covers |
|----------|---------------|
| [User Journeys](./flows/user-journeys.md) | Step-by-step walkthroughs of every major user journey — new user signup to first scrape, free to paid upgrade, team collaboration, API key rotation, billing failure recovery, abuse detection and ban, monthly credit reset, support ticket lifecycle, account deletion, and admin investigation flow — with every page transition, notification, email, and state change documented |

---

## Cross-Reference Guide

When working on a specific area, these are the documents you should read together:

| If you are building... | Read these documents |
|------------------------|---------------------|
| Authentication pages | Authentication System, Roles and Permissions, Security Framework, User Journeys |
| Dashboard overview | Overview and Onboarding, Usage and Analytics, User Journeys, Data Models |
| API key pages | API Key Management, Security Framework, Roles and Permissions, Audit Log |
| Billing system | Billing and Credits, Finance and Credit Ledger, Data Models, User Journeys, Testing Strategy |
| Admin panel | All Admin documents, Moderation, Security Framework, Audit Log |
| Documentation portal | Documentation Portal Design, Public Pages (for nav consistency) |
| Any page at all | Security Framework (always), Testing Strategy (always), Roles and Permissions (always) |

---

## Document Status

| Document | Status |
|----------|--------|
| Platform Overview | Draft |
| Landing Page | Draft |
| Pricing Page | Draft |
| About/Contact/Blog/Status | Draft |
| Terms of Service | Draft |
| Privacy Policy | Draft |
| Acceptable Use Policy | Draft |
| DPA/Cookies/Sub-Processors | Draft |
| Authentication System | Draft |
| Roles and Permissions | Draft |
| Dashboard Overview & Onboarding | Draft |
| API Key Management | Draft |
| Jobs and Logs | Draft |
| Usage and Analytics | Draft |
| Billing and Credits | Draft |
| Team Management | Draft |
| Settings and Support | Draft |
| Admin Overview | Draft |
| Organization Management | Draft |
| Moderation and Abuse | Draft |
| Finance and Credit Ledger | Draft |
| Operations and Audit Log | Draft |
| Documentation Portal | Draft |
| Data Models | Draft |
| Security Framework | Draft |
| Testing Strategy | Draft |
| Phases and Roadmap | Draft |
| User Journeys | Draft |
