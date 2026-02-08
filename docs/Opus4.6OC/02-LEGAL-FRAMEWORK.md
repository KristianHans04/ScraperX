# ScraperX Legal Framework

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-002 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 01-PUBLIC-WEBSITE.md, 03-AUTHENTICATION.md, 14-ADMIN-MODERATION.md |

---

## Table of Contents

1. [Legal Positioning Strategy](#1-legal-positioning-strategy)
2. [Terms of Service](#2-terms-of-service)
3. [Privacy Policy](#3-privacy-policy)
4. [Acceptable Use Policy](#4-acceptable-use-policy)
5. [Data Processing Agreement](#5-data-processing-agreement)
6. [Cookie Policy](#6-cookie-policy)
7. [Legal Page Layout and Presentation](#7-legal-page-layout-and-presentation)
8. [Consent and Acceptance Mechanisms](#8-consent-and-acceptance-mechanisms)
9. [Version Management](#9-version-management)
10. [Dispute Resolution](#10-dispute-resolution)

---

## 1. Legal Positioning Strategy

ScraperX is positioned as a neutral tool provider. The platform provides web scraping infrastructure — it does not direct what users scrape, how they use the data, or which websites they target. This is the same legal positioning used by major competitors including Bright Data, Apify, and ScrapingBee.

### Core Legal Principles

| Principle | Detail |
|-----------|--------|
| Neutral tool provider | ScraperX provides technology. Users decide how to use it. The platform is not responsible for how users apply the tool. |
| User responsibility | Users are solely responsible for ensuring their scraping activities comply with applicable laws, regulations, and target website terms of service. |
| One-way indemnification | Users indemnify ScraperX against claims arising from their use of the platform. ScraperX does not indemnify users. |
| No data ownership | ScraperX does not claim ownership of data scraped by users. Scraped data belongs to the user (subject to applicable laws). |
| No data retention beyond stated periods | Scraped data is stored temporarily per the plan's data retention period and then permanently deleted. |
| Jurisdiction-neutral | All legal documents use placeholder jurisdiction references. The actual governing law and jurisdiction are determined at deployment time based on where the business is incorporated. |

### Relevant Legal Precedents (Informational)

These are documented for context and should be cited or referenced in legal guidance, but the actual legal documents should be drafted or reviewed by qualified legal counsel.

| Case | Relevance |
|------|-----------|
| hiQ Labs v. LinkedIn (2022) | Accessing publicly available data does not violate the Computer Fraud and Abuse Act (CFAA). Supports the position that scraping public data is generally permissible. |
| Van Buren v. United States (2021) | Supreme Court narrowed the CFAA to apply only to those who access information they are not entitled to access at all, not those who misuse access they have. |
| Meta Platforms v. Bright Data (2024) | Scraping publicly available data was found to not violate the CFAA. However, scraping data behind login walls may be different. |

### Legal Disclaimers for the Platform

The following disclaimers must appear in relevant locations:

| Location | Disclaimer Text |
|----------|----------------|
| Signup form | "By creating an account, you agree to our Terms of Service and Acceptable Use Policy. You are responsible for ensuring your use of ScraperX complies with applicable laws." |
| API documentation | "ScraperX is a neutral tool. Compliance with applicable laws and target website terms of service is your responsibility." |
| Dashboard footer (subtle) | "Use of this service is subject to our Terms of Service and Acceptable Use Policy." |

---

## 2. Terms of Service

**Route:** `/legal/terms`

### Document Structure

The Terms of Service is the primary legal agreement between ScraperX and its users. It covers account creation, acceptable use, billing, intellectual property, liability, and termination.

### Sections and Their Content

#### Section 1: Introduction and Acceptance

| Element | Content |
|---------|---------|
| Effective date | Displayed at the top. Updated when terms change. Format: "Effective Date: {DATE}" |
| Last updated | "Last Updated: {DATE}" |
| Acceptance mechanism | "By creating an account, accessing, or using ScraperX, you agree to be bound by these Terms of Service. If you do not agree, do not use the service." |
| Capacity to agree | "You must be at least 18 years old (or the age of majority in your jurisdiction) to use ScraperX. By using the service, you represent that you have the legal capacity to enter into a binding agreement." |
| Entity usage | "If you are using ScraperX on behalf of an organization, you represent that you have the authority to bind that organization to these terms." |

#### Section 2: Definitions

| Term | Definition |
|------|------------|
| Service | The ScraperX platform, including the API, dashboard, and documentation |
| User / You | Any individual or entity that creates an account or uses the Service |
| Account | The user's registered account on the platform |
| Content | Any data, text, or materials submitted to or retrieved through the Service |
| API Key | A credential used to authenticate requests to the ScraperX API |
| Credits | Units of consumption that represent API usage |
| Plan | A subscription tier (Free, Pro, or Enterprise) that determines credit allocation and feature access |

#### Section 3: Account Registration

| Clause | Detail |
|--------|--------|
| Accurate information | Users must provide accurate and complete registration information and keep it up to date |
| Account security | Users are responsible for maintaining the confidentiality of their credentials and API keys. ScraperX is not liable for unauthorized access resulting from the user's failure to secure their account. |
| One account per person | Users may not create multiple free accounts to circumvent plan limitations. ScraperX reserves the right to merge or terminate duplicate accounts. |
| Account sharing | Account credentials may not be shared with individuals outside the user's organization. API keys may be used in applications owned or operated by the user. |

#### Section 4: Use of the Service

| Clause | Detail |
|--------|--------|
| License grant | ScraperX grants users a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms and the selected Plan. |
| User responsibility | Users are solely responsible for their use of the Service, including ensuring compliance with applicable laws, regulations, and the terms of service of any third-party websites they access through the Service. |
| Neutral tool | ScraperX is a neutral technology provider. The Service provides web scraping infrastructure. ScraperX does not direct, control, or monitor the specific websites users choose to scrape or the data they collect. |
| Acceptable use | Use of the Service is subject to the Acceptable Use Policy (see Section 4 of this document and /legal/acceptable-use). |

#### Section 5: Plans, Billing, and Credits

| Clause | Detail |
|--------|--------|
| Subscription plans | The Service is offered under multiple plans with different credit allocations, rate limits, and features as described on the pricing page. |
| Billing cycle | Subscriptions are billed monthly or annually, depending on the billing period selected. |
| Credit allocation | Credits are allocated at the start of each billing cycle. Unused credits do not roll over to the next cycle. |
| Credit packs | Additional credit packs may be purchased. Credit packs do not roll over. |
| Price changes | ScraperX may change prices with 30 days written notice. Existing subscribers are grandfathered at their current price until the end of their current billing period. |
| Failed payments | If payment fails, ScraperX will attempt to collect payment according to the escalation process described in 09-BILLING-AND-CREDITS.md. Continued failure may result in account restriction or suspension. |
| Refunds | Refunds may be issued at ScraperX's discretion. For new subscriptions, a refund may be issued within 14 days if fewer than 10% of the plan's credits have been consumed. |
| Taxes | Prices are exclusive of applicable taxes. Users are responsible for any taxes, duties, or levies imposed by their jurisdiction. |

#### Section 6: Intellectual Property

| Clause | Detail |
|--------|--------|
| ScraperX IP | The Service, including its code, design, documentation, and branding, is the intellectual property of ScraperX. Users may not copy, modify, reverse-engineer, or create derivative works of the Service. |
| User data | ScraperX does not claim ownership of data scraped by users. Users retain all rights to data they collect through the Service, subject to applicable laws. |
| Feedback | If users provide feedback, suggestions, or ideas, ScraperX may use them without obligation or compensation. |

#### Section 7: Data and Privacy

| Clause | Detail |
|--------|--------|
| Privacy Policy | The collection and use of personal information is governed by the Privacy Policy (/legal/privacy). |
| Data retention | Scraped data is retained for the period specified by the user's plan (Free: 3 days, Pro: 14 days, Enterprise: custom). After this period, data is permanently deleted. |
| No data selling | ScraperX does not sell, rent, or share users' scraped data with third parties. |
| Data processing | For users who process personal data through the Service, the Data Processing Agreement (/legal/dpa) applies. |

#### Section 8: Disclaimers and Limitation of Liability

| Clause | Detail |
|--------|--------|
| As-is provision | The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. |
| No guarantee of results | ScraperX does not guarantee that any particular website can be scraped, that requests will succeed, or that data returned will be accurate or complete. |
| Liability cap | ScraperX's total aggregate liability for any claims arising from or related to the Service is limited to the amount the user paid to ScraperX in the 12 months preceding the claim. |
| Exclusion of damages | ScraperX is not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities. |
| Force majeure | ScraperX is not liable for failures or delays caused by circumstances beyond its reasonable control, including natural disasters, government actions, internet disruptions, or third-party service failures. |

#### Section 9: Indemnification

| Clause | Detail |
|--------|--------|
| User indemnification | Users agree to indemnify, defend, and hold harmless ScraperX, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from: (a) the user's use of the Service, (b) the user's violation of these Terms, (c) the user's violation of any law or regulation, (d) the user's violation of any third party's rights, or (e) data collected by the user through the Service. |
| One-way | This indemnification is one-way. ScraperX does not indemnify users against third-party claims related to their scraping activities. |

#### Section 10: Termination

| Clause | Detail |
|--------|--------|
| User termination | Users may terminate their account at any time through the dashboard settings. Upon termination, access to the Service ceases immediately. |
| ScraperX termination | ScraperX may suspend or terminate a user's account for: violation of these Terms or the Acceptable Use Policy, non-payment, fraudulent activity, or any reason with 30 days written notice. |
| Immediate termination | ScraperX may immediately suspend or terminate accounts that pose a security risk, are involved in illegal activity, or cause harm to the Service or other users. |
| Effect of termination | Upon termination: (a) the user's license to use the Service ends, (b) remaining credits are forfeited, (c) data is retained for 30 days and then permanently deleted, (d) any outstanding balance remains payable. |
| Survival | Sections on intellectual property, disclaimers, limitation of liability, indemnification, and dispute resolution survive termination. |

#### Section 11: Modifications

| Clause | Detail |
|--------|--------|
| Right to modify | ScraperX may modify these Terms at any time. |
| Notice | Material changes will be communicated via email to the address on the account and via a notice on the dashboard at least 30 days before taking effect. |
| Continued use | Continued use of the Service after the effective date of modified Terms constitutes acceptance. Users who do not agree may terminate their account. |

#### Section 12: Governing Law and Dispute Resolution

See Section 10 of this document (Dispute Resolution).

#### Section 13: General Provisions

| Clause | Detail |
|--------|--------|
| Entire agreement | These Terms, together with the Privacy Policy, Acceptable Use Policy, and DPA, constitute the entire agreement between the user and ScraperX. |
| Severability | If any provision is found unenforceable, the remaining provisions remain in effect. |
| Waiver | Failure to enforce any provision does not constitute a waiver. |
| Assignment | Users may not assign their rights or obligations. ScraperX may assign in connection with a merger, acquisition, or sale of assets. |
| Notices | Notices to users are sent to the email address on the account. Notices to ScraperX should be sent to the contact email specified on the contact page. |

---

## 3. Privacy Policy

**Route:** `/legal/privacy`

### Document Structure

The Privacy Policy explains what personal data ScraperX collects, why, how it is used, and users' rights.

### Sections and Their Content

#### Section 1: Introduction

| Element | Content |
|---------|---------|
| Scope | This policy applies to all users of the ScraperX platform, website, and API. |
| Data controller | ScraperX (with placeholder for registered entity name and address, configured via environment variable) |
| Contact | Users can contact ScraperX about privacy matters at the configured privacy email address |

#### Section 2: Data We Collect

**Data provided directly by users:**

| Data Type | Examples | Purpose | Legal Basis |
|-----------|----------|---------|-------------|
| Account information | Name, email address, password (hashed) | Account creation and authentication | Contract performance |
| Billing information | Payment method details (processed by payment provider, not stored by ScraperX), billing address, invoice history | Payment processing and billing | Contract performance |
| Support data | Support ticket content, attachments | Providing support | Contract performance |
| Contact form data | Name, email, message | Responding to inquiries | Legitimate interest |

**Data collected automatically:**

| Data Type | Examples | Purpose | Legal Basis |
|-----------|----------|---------|-------------|
| Usage data | API requests, credit consumption, job results, timestamps | Service delivery, analytics, billing | Contract performance |
| Log data | IP address, browser type, device type, operating system, referrer URL | Security, debugging, abuse prevention | Legitimate interest |
| Cookie data | Session identifiers, preferences | Authentication, user experience | Consent (for non-essential cookies) |

**Data we do NOT collect:**

| Statement | Detail |
|-----------|--------|
| Scraped data | ScraperX processes scraped data on behalf of the user but does not analyze, mine, or use it for any purpose other than delivering it to the user. Scraped data is stored temporarily per the plan's retention period and then permanently deleted. |
| Data selling | ScraperX does not sell, rent, or share personal data with third parties for their marketing purposes. |

#### Section 3: How We Use Data

| Purpose | Data Used | Detail |
|---------|-----------|--------|
| Providing the Service | Account info, usage data | Creating and managing accounts, processing API requests, delivering results |
| Billing | Account info, billing info, usage data | Processing payments, generating invoices, managing subscriptions |
| Communication | Email address | Sending transactional emails (verification, password reset, billing), service announcements, and (with consent) product updates |
| Security | Log data, usage data | Detecting and preventing fraud, abuse, and unauthorized access |
| Improvement | Usage data (aggregated, anonymized) | Analyzing usage patterns to improve the Service. No individual-level profiling. |
| Legal compliance | All data as required | Responding to legal requests, enforcing Terms of Service |

#### Section 4: Data Sharing

| Recipient | Purpose | Data Shared | Safeguards |
|-----------|---------|-------------|------------|
| Payment provider | Payment processing | Billing details (handled directly by provider) | PCI DSS compliant, data processing agreement in place |
| Email service provider | Transactional emails | Email address, name | Data processing agreement in place |
| Infrastructure providers | Hosting, CDN | All data (encrypted at rest and in transit) | Data processing agreements, encrypted storage |
| Law enforcement | Legal compliance | As required by law | Only in response to valid legal process |

ScraperX does NOT share data with:
- Advertising networks
- Data brokers
- Analytics companies that profile users
- Any party for purposes unrelated to providing the Service

#### Section 5: Data Retention

| Data Type | Retention Period | After Expiry |
|-----------|-----------------|-------------|
| Account information | Duration of the account + 30 days after deletion | Permanently deleted |
| Billing information | As required by applicable tax and financial regulations (typically 7 years for invoices) | Permanently deleted |
| Scraped data (job results) | Per plan: Free 3 days, Pro 14 days, Enterprise custom | Permanently deleted |
| Log data | 90 days | Permanently deleted |
| Support tickets | Duration of the account + 30 days after deletion | Permanently deleted |
| Contact form submissions | 1 year | Permanently deleted |
| Audit logs | 2 years | Permanently deleted |

#### Section 6: Data Security

| Measure | Detail |
|---------|--------|
| Encryption in transit | All data transmitted over TLS 1.2 or higher |
| Encryption at rest | Database and storage encrypted at rest using AES-256 |
| Password storage | Passwords are hashed using bcrypt with a cost factor of at least 12. Plaintext passwords are never stored or logged. |
| API key storage | API keys are hashed using SHA-256. The original key is shown once at creation and never stored in recoverable form. |
| Access control | Internal access to user data is restricted to authorized personnel on a need-to-know basis. All access is logged. |
| Incident response | ScraperX maintains a security incident response process. Users will be notified of breaches affecting their data within 72 hours. |

Full security details are in 19-SECURITY-FRAMEWORK.md.

#### Section 7: User Rights

Users have the following rights regarding their personal data. The mechanism for exercising these rights depends on applicable jurisdiction.

| Right | Description | How to Exercise |
|-------|-------------|----------------|
| Access | Request a copy of your personal data | Dashboard settings or email to privacy contact |
| Rectification | Correct inaccurate personal data | Dashboard settings (for profile data) or email |
| Deletion | Request deletion of your account and personal data | Dashboard settings (account deletion) or email |
| Data portability | Receive your data in a structured, machine-readable format | Email to privacy contact |
| Restriction | Request restriction of processing | Email to privacy contact |
| Objection | Object to processing based on legitimate interest | Email to privacy contact |
| Withdraw consent | Withdraw consent for optional processing (e.g., marketing emails) | Dashboard notification settings or unsubscribe link |

| Response timeline | ScraperX will respond to data subject requests within 30 days. Complex requests may take up to 60 days with notification. |

#### Section 8: International Data Transfers

| Statement | Detail |
|-----------|--------|
| Transfer basis | If personal data is transferred outside the user's jurisdiction, ScraperX ensures appropriate safeguards are in place, such as standard contractual clauses or equivalent mechanisms. |
| Infrastructure location | ScraperX infrastructure is hosted in locations disclosed on the status page. The primary hosting provider and region are configurable. |

#### Section 9: Children's Privacy

| Statement | Detail |
|-----------|--------|
| Age restriction | ScraperX is not directed to individuals under 18 (or the age of majority in their jurisdiction). We do not knowingly collect data from minors. If we become aware that a minor has provided personal data, we will delete it promptly. |

#### Section 10: Changes to This Policy

| Statement | Detail |
|-----------|--------|
| Notification | Material changes will be communicated via email and a dashboard notice at least 30 days before taking effect. |
| Version history | Previous versions of this policy are available upon request. |

---

## 4. Acceptable Use Policy

**Route:** `/legal/acceptable-use`

### Purpose

The Acceptable Use Policy (AUP) defines what users are and are not allowed to do with ScraperX. It is the primary tool for moderating abuse and protecting the platform.

### Permitted Uses

| Use | Detail |
|-----|--------|
| Public data collection | Scraping publicly available web pages that do not require authentication |
| Market research | Collecting publicly available pricing, product, or competitive data |
| Academic research | Gathering data for academic or journalistic purposes |
| SEO monitoring | Tracking search engine results and website performance |
| Content aggregation | Collecting and organizing publicly available content (subject to applicable copyright laws) |
| Application development | Using the API to build applications and services |

### Prohibited Uses

| Prohibition | Detail |
|-------------|--------|
| Illegal activities | Using the Service for any activity that violates applicable laws, including but not limited to unauthorized computer access, fraud, harassment, or copyright infringement |
| Bypassing authentication | Using the Service to access websites or data behind login walls, paywalls, or other access controls without authorization |
| Personal data harvesting | Systematically collecting personal data (names, emails, phone numbers, addresses) of individuals for the purpose of building contact databases for unsolicited marketing, spam, or sale to third parties |
| Denial of service | Using the Service in a manner that causes denial of service to target websites, including overwhelming a target with requests beyond what is reasonably necessary |
| Competitive harm | Using the Service to gain unauthorized access to a competitor's proprietary systems or trade secrets |
| Malware distribution | Using the Service to distribute malware, viruses, or other harmful software |
| Fraud | Using the Service for phishing, identity theft, financial fraud, or other deceptive practices |
| Illegal content | Using the Service to collect, store, or distribute child sexual abuse material, terrorist content, or other illegal content |
| Reselling access | Reselling access to the ScraperX API without authorization |
| System abuse | Attempting to exploit vulnerabilities in the ScraperX platform, circumventing rate limits, or using the Service in ways that degrade performance for other users |
| Multiple free accounts | Creating multiple accounts to circumvent plan limitations, free credit restrictions, or account suspensions |

### Rate and Volume Guidelines

| Guideline | Detail |
|-----------|--------|
| Respect robots.txt | While ScraperX does not enforce robots.txt compliance on behalf of users, users are encouraged to respect robots.txt directives as a best practice. |
| Reasonable request rates | Users should not send requests at rates that would constitute a denial-of-service attack on the target website. The platform's built-in rate limits provide a reasonable upper bound. |
| Crawl delays | For sustained scraping of a single domain, users are encouraged to implement reasonable crawl delays. |

### Enforcement

| Action | Trigger | Process |
|--------|---------|---------|
| Warning | First minor violation | Email notification explaining the violation and requesting correction |
| Rate limiting | Excessive request rates against a single target | Automatic throttling by the platform |
| Temporary suspension | Repeated violations after warning, or moderate severity violation | Account suspended for 24-72 hours. User notified with explanation. |
| Permanent suspension | Severe violations (illegal activity, malware, CSAM) or repeated violations after temporary suspension | Account permanently suspended. No refund. User notified. |
| Legal action | Criminal activity or significant harm to ScraperX or third parties | Referral to law enforcement and/or civil action |

### Reporting Violations

| Element | Detail |
|---------|--------|
| Report method | Users can report suspected AUP violations by emailing the configured abuse email address or using the contact form with subject "Bug Report" (which will be expanded to include "Report Abuse" in a future update). |
| Investigation | ScraperX will investigate reports and take action as appropriate. Reporters will be informed of the outcome where possible. |
| Whistleblower protection | Users who report violations in good faith will not face retaliation. |

See 14-ADMIN-MODERATION.md for the admin-side enforcement workflow.

---

## 5. Data Processing Agreement

**Route:** `/legal/dpa`

### Purpose

The Data Processing Agreement (DPA) governs the processing of personal data by ScraperX on behalf of users. It applies when users use ScraperX to scrape websites that contain personal data of third parties.

### DPA Structure

#### Scope and Roles

| Element | Detail |
|---------|--------|
| Data Controller | The user (who determines what data to scrape and for what purpose) |
| Data Processor | ScraperX (which processes the data on the user's instructions via API requests) |
| Sub-processors | ScraperX's infrastructure providers (listed in the sub-processor list, available on request and updated with 30 days notice) |
| Data subjects | Third parties whose personal data may be contained in scraped web pages |

#### Processing Details

| Element | Detail |
|---------|--------|
| Nature of processing | Automated collection, temporary storage, and delivery of web page data |
| Purpose | Execution of the user's API requests as specified by the API parameters |
| Duration | Data is processed for the duration of the API request and stored for the plan's retention period |
| Types of personal data | As determined by the user's scraping targets. ScraperX does not control what data is scraped. May include names, email addresses, or other publicly visible information. |

#### Obligations of ScraperX (as Processor)

| Obligation | Detail |
|------------|--------|
| Process only on instructions | ScraperX will process personal data only as instructed by the user through API requests. No independent use of the data. |
| Security measures | ScraperX implements appropriate technical and organizational security measures (see Section 6 of the Privacy Policy and 19-SECURITY-FRAMEWORK.md). |
| Sub-processor management | ScraperX maintains a list of sub-processors. Users will be notified of new sub-processors 30 days in advance. Users may object; if the objection cannot be resolved, the user may terminate. |
| Confidentiality | ScraperX personnel with access to personal data are bound by confidentiality obligations. |
| Assistance | ScraperX will assist users in responding to data subject requests (access, deletion, portability) to the extent technically feasible. |
| Data return and deletion | Upon termination, scraped data is deleted according to the retention schedule. Users can export their data before termination. |
| Audit rights | Users may request information about ScraperX's data processing practices. On-site audits are available for Enterprise plan customers by appointment. |

#### Obligations of the User (as Controller)

| Obligation | Detail |
|------------|--------|
| Lawful basis | Users must ensure they have a lawful basis for collecting and processing the personal data they scrape. |
| Data subject rights | Users are responsible for responding to data subject requests from individuals whose data they have collected. |
| Instructions | Users are responsible for ensuring their API requests do not instruct ScraperX to process data in violation of applicable data protection laws. |
| Notification | Users must notify ScraperX if they become aware of a data breach involving data processed through the Service. |

#### Cross-Border Transfers

| Element | Detail |
|---------|--------|
| Mechanism | Standard Contractual Clauses (or equivalent mechanism recognized in the user's jurisdiction) are incorporated by reference where required. |
| Transfer impact assessment | Available on request for Enterprise customers. |

---

## 6. Cookie Policy

**Route:** `/legal/cookies`

### Cookie Categories

| Category | Consent Required | Purpose |
|----------|-----------------|---------|
| Strictly necessary | No | Essential for the website to function. Includes session cookies, CSRF tokens, and authentication cookies. |
| Functional | Yes | Remember user preferences such as theme (light/dark) and language. |
| Analytics | Yes | Understand how visitors use the website. Aggregated, anonymized data. No third-party analytics tools that track individuals. |
| Marketing | Not used | ScraperX does not use marketing cookies, advertising trackers, or third-party pixels. |

### Cookie Details

**Strictly Necessary Cookies:**

| Cookie Name | Purpose | Duration | HTTP Only | Secure | SameSite |
|-------------|---------|----------|-----------|--------|----------|
| session_id | Identifies the user's authenticated session | Session (expires when browser closes) or as configured (e.g., 7 days with "remember me") | Yes | Yes | Strict |
| csrf_token | Prevents cross-site request forgery attacks | Session | Yes | Yes | Strict |
| cookie_consent | Stores the user's cookie consent preferences | 1 year | No | Yes | Lax |

**Functional Cookies:**

| Cookie Name | Purpose | Duration | HTTP Only | Secure | SameSite |
|-------------|---------|----------|-----------|--------|----------|
| theme | Stores the user's preferred theme (light or dark) | 1 year | No | Yes | Lax |
| locale | Stores the user's preferred language/locale (future) | 1 year | No | Yes | Lax |

**Analytics Cookies:**

| Cookie Name | Purpose | Duration | HTTP Only | Secure | SameSite |
|-------------|---------|----------|-----------|--------|----------|
| analytics_session | Groups page views into a session for aggregate analytics | 30 minutes | No | Yes | Lax |

Note: ScraperX uses self-hosted analytics (no Google Analytics, no third-party trackers). If a third-party analytics tool is ever adopted, this table must be updated.

### Cookie Consent Banner

A cookie consent banner appears on the first visit to any page if the user has not previously set their preferences.

```
+----------------------------------------------------------------------+
|  We use cookies to provide essential functionality and improve your    |
|  experience. See our Cookie Policy for details.                        |
|                                                                       |
|  [Accept All]    [Manage Preferences]    [Reject Non-Essential]       |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Position | Bottom of the viewport, full-width bar |
| Persistence | Shown until the user makes a choice. Choice is stored in the cookie_consent cookie. |
| Accept All | Enables all cookie categories. Banner disappears. |
| Reject Non-Essential | Enables only strictly necessary cookies. Banner disappears. |
| Manage Preferences | Opens a modal with toggles for each cookie category (strictly necessary is always on and cannot be toggled off). |
| Accessibility | Banner is keyboard-navigable. Buttons have sufficient contrast. Banner does not block the skip-to-content link. |

### Cookie Preference Modal

```
+----------------------------------------------+
|  Cookie Preferences                    [X]    |
|                                               |
|  Strictly Necessary        [Always On]        |
|  Required for the site to function.           |
|  Cannot be disabled.                          |
|                                               |
|  Functional                [Toggle: ON/OFF]   |
|  Remember your preferences like theme.        |
|                                               |
|  Analytics                 [Toggle: ON/OFF]   |
|  Help us understand how the site is used.     |
|  No personal data is collected.               |
|                                               |
|  [Save Preferences]                           |
+----------------------------------------------+
```

### Consent Record

| Element | Detail |
|---------|--------|
| Storage | The user's consent choices are stored in the cookie_consent cookie as a JSON-encoded string |
| Server-side record | Consent is also recorded server-side (associated with session or user ID) for compliance audit purposes |
| Withdrawal | Users can change preferences at any time via a "Cookie Settings" link in the footer |
| Granularity | Consent is per-category, not all-or-nothing |

---

## 7. Legal Page Layout and Presentation

All five legal pages share a consistent layout.

### Layout

```
+----------------------------------------------------------------------+
|  [Navbar]                                                             |
+----------------------------------------------------------------------+
|                                                                       |
|  +---------------------------+  +--------------------------------+   |
|  | Table of Contents         |  | {Legal Document Title}         |   |
|  |                           |  |                                |   |
|  | 1. Introduction           |  | Effective Date: {DATE}         |   |
|  | 2. Definitions            |  | Last Updated: {DATE}           |   |
|  | 3. Account Registration   |  |                                |   |
|  | 4. Use of the Service     |  | (Document content)             |   |
|  | 5. Plans and Billing      |  |                                |   |
|  | 6. Intellectual Property   |  |                                |   |
|  | ...                       |  |                                |   |
|  +---------------------------+  +--------------------------------+   |
|                                                                       |
|  [Footer]                                                             |
+----------------------------------------------------------------------+
```

| Element | Detail |
|---------|--------|
| Left sidebar | Table of contents with anchor links to each section. Sticky on desktop (scrolls with the page but stays visible). Hidden on mobile; replaced by a "Table of Contents" collapsible at the top of the content. |
| Content area | Maximum width 720px for comfortable reading. Body text, 1rem/16px. Headings follow h1 > h2 > h3 hierarchy. |
| Dates | Effective date and last updated date displayed prominently at the top |
| Print styling | Legal pages should have a print stylesheet that formats the content cleanly for printing |
| Reading progress | Optional: a thin progress bar at the top of the page showing how far the user has scrolled |

### Typography for Legal Pages

| Element | Style |
|---------|-------|
| Document title | h1, 2rem, weight 700 |
| Section headings | h2, 1.5rem, weight 600 |
| Subsection headings | h3, 1.25rem, weight 600 |
| Body text | 1rem, weight 400, line-height 1.6 |
| Defined terms | Bold on first use in each section |
| Lists | Numbered for sequential items, bulleted for non-sequential |

### Mobile Behavior

| Behavior | Detail |
|----------|--------|
| Sidebar | Replaced by a collapsible table of contents at the top |
| Content width | Full viewport width with 16px horizontal padding |
| Font size | Same as desktop (16px base). No reduction. |
| Touch targets | All anchor links in the table of contents have 44px minimum height |

---

## 8. Consent and Acceptance Mechanisms

### Where Consent Is Required

| Location | What the User Agrees To | Mechanism |
|----------|------------------------|-----------|
| Signup form | Terms of Service, Privacy Policy, Acceptable Use Policy | Checkbox: "I agree to the Terms of Service, Privacy Policy, and Acceptable Use Policy" with links. Must be checked to submit. |
| Cookie banner | Cookie categories | Accept All / Reject Non-Essential / Manage Preferences buttons |
| Newsletter signup (future) | Marketing emails | Explicit opt-in checkbox. Not pre-checked. |
| Plan upgrade | Updated billing terms | Confirmation button on the billing page: "I authorize this payment" |
| DPA | Data processing terms | Implicit acceptance through use of the API for Enterprise customers, or explicit signature for Enterprise contracts |

### Consent Record Storage

| Data Point | Storage |
|------------|---------|
| Terms acceptance | Stored in the users table: terms_accepted_at timestamp, terms_version accepted |
| Cookie consent | Stored in cookie_consent cookie and replicated to server-side audit log |
| Marketing consent | Stored in the users table: marketing_consent boolean, marketing_consent_at timestamp |
| DPA acceptance | Stored in the accounts table: dpa_accepted_at timestamp, dpa_version accepted |

### Re-Consent When Terms Change

| Scenario | Behavior |
|----------|----------|
| Terms of Service update | Users are notified via email 30 days before. On next login after the effective date, a modal shows a summary of changes and requires acknowledgment before proceeding. The new acceptance timestamp and version are recorded. |
| Privacy Policy update | Same as Terms of Service. |
| AUP update | Same notification process but no blocking modal — changes are informational and continued use constitutes acceptance. |
| Cookie Policy update | Cookie consent banner is re-shown to all users. Previous consent is reset for affected categories. |

---

## 9. Version Management

### Version Numbering

Legal documents use semantic versioning:
- MAJOR version for material changes that affect user rights or obligations
- MINOR version for clarifications or additions that do not materially change existing terms
- PATCH version for typo fixes and formatting changes

Example: Terms of Service v2.1.0

### Version History Table

Each legal document includes a version history table at the bottom.

| Version | Date | Change Summary |
|---------|------|---------------|
| 1.0.0 | {LAUNCH_DATE} | Initial version |

### Storage

| Element | Detail |
|---------|--------|
| Current version | Stored in the database in a legal_documents table with document_type, version, content (Markdown or HTML), effective_date, and published_at |
| Historical versions | All previous versions are retained in the same table with an is_current boolean flag |
| Content format | Legal document content is stored as Markdown and rendered on the frontend |
| API endpoint | An internal API endpoint serves the current version of each legal document. No public API for legal documents. |

---

## 10. Dispute Resolution

### Approach

ScraperX uses a jurisdiction-neutral dispute resolution framework. The specific governing law and venue are determined at deployment time based on where the business is incorporated. The legal documents use placeholders for these values.

### Dispute Resolution Process

| Step | Detail |
|------|--------|
| Step 1: Contact us | Users should first contact ScraperX through the contact form or support email to attempt informal resolution. |
| Step 2: Negotiation | If informal resolution fails, the parties will attempt to resolve the dispute through good-faith negotiation for 30 days. |
| Step 3: Mediation (optional) | If negotiation fails, either party may propose mediation through a mutually agreed mediator. |
| Step 4: Arbitration or litigation | If mediation fails or is declined, the dispute is resolved through binding arbitration or litigation in the courts of the governing jurisdiction, as specified in the Terms of Service. |

### Placeholder Variables for Jurisdiction

| Placeholder | Example Values | Where Used |
|-------------|---------------|------------|
| GOVERNING_LAW_JURISDICTION | "the laws of [Country/State]" | Terms of Service, Section 12 |
| DISPUTE_VENUE | "the courts of [City, Country]" | Terms of Service, Section 12 |
| REGISTERED_ENTITY_NAME | "ScraperX [Legal Entity Type]" | Privacy Policy, DPA |
| REGISTERED_ADDRESS | "[Street, City, Country]" | Privacy Policy, DPA |
| PRIVACY_CONTACT_EMAIL | "privacy@scraperx.io" | Privacy Policy |
| ABUSE_CONTACT_EMAIL | "abuse@scraperx.io" | Acceptable Use Policy |

All of these are configured via environment variables (see APPENDICES/D-ENVIRONMENT-VARIABLES.md).

### Class Action Waiver

| Element | Detail |
|---------|--------|
| Statement | To the extent permitted by applicable law, disputes will be resolved on an individual basis. Users waive the right to participate in class actions or class arbitrations. |
| Enforceability note | This waiver may not be enforceable in all jurisdictions. Where unenforceable, it is severed from the agreement. |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — Platform overview and glossary
- 01-PUBLIC-WEBSITE.md — Footer links to legal pages, page layout
- 03-AUTHENTICATION.md — Consent collection during signup
- 14-ADMIN-MODERATION.md — AUP enforcement workflows
- 18-DATA-MODELS.md — Legal document and consent data models
- 19-SECURITY-FRAMEWORK.md — Security measures referenced in Privacy Policy and DPA
- APPENDICES/D-ENVIRONMENT-VARIABLES.md — Jurisdiction placeholder configuration
