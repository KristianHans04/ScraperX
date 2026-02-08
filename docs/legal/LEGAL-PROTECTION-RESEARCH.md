# Legal Protection Research: Web Scraping Platform

## How Leading Scraping Platforms Protect Themselves Legally

**Research Date:** February 2026  
**Platforms Analyzed:** Apify, ScrapingBee, Oxylabs, Bright Data, ZenRows  
**Disclaimer:** This document is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for your specific situation.

---

## Table of Contents

1. [Key ToS Clauses for Scraping Platforms](#1-key-tos-clauses)
2. [Liability Handling for User Actions](#2-liability-handling)
3. [Jurisdictions & Governing Law](#3-jurisdictions)
4. [GDPR/CCPA/Data Protection Considerations](#4-data-protection)
5. [Notable Legal Cases & Precedents](#5-legal-precedents)
6. [Acceptable Use Policies](#6-acceptable-use-policies)
7. [Indemnification Clause Structures](#7-indemnification)
8. [Recommended Legal Framework for a Scraping Platform](#8-recommended-framework)

---

## 1. Key ToS Clauses

### 1.1 "Tool Provider, Not Data Controller" Positioning

Every major scraping platform positions itself as a **neutral tool provider**, not as the entity performing the scraping or controlling the data. This is the single most important legal positioning.

- **Apify** (Czech Republic): "You are solely responsible for the legality, accuracy, quality, appropriateness, and use of all Customer Data." (Section 5.8) and "We are not obliged to verify the manner in which you or other Users or customers use the Website or Services, and we shall not be liable for the manner of such usage." (Section 13.1)
- **ScrapingBee** (France): "User acknowledges that the Provider only provides the Services and shall not under no circumstances be held liable as to the lawfulness of the User's use of the Services including the web scraping operations performed and the use of the data scraped."
- **Oxylabs** (Lithuania): Positions itself as providing proxy/scraper infrastructure and explicitly states it does not control what users scrape or how they use scraped data.

**Key Takeaway:** Your ToS must unambiguously state that the platform provides infrastructure/tools only, and the user is solely responsible for:
- What they scrape
- Whether they have authorization to scrape a target
- Compliance with target website ToS
- Legality of data usage after collection

### 1.2 Business-Only Use Restriction

All platforms restrict services to **business/professional use only**, explicitly excluding consumers:

- **Apify**: "The Services are intended for business use only and are not designed, marketed, or suitable for consumers."
- **ScrapingBee**: "User acknowledges and accepts that Services are dedicated to professional activities and as such consumer law is not intended to be applicable."

**Why this matters:** Consumer protection laws (especially in the EU) impose much stricter requirements. By restricting to B2B, platforms:
- Avoid consumer protection regulations
- Can enforce more aggressive limitation of liability clauses
- Have more flexibility in contract terms
- Reduce regulatory exposure

### 1.3 User Compliance Obligations

Platforms universally require users to:

1. **Comply with all applicable laws** when using the service
2. **Only process data they are authorized to access** (Apify Section 6.2)
3. **Read and respect target website ToS** before scraping (ScrapingBee Section 6)
4. **Obtain all necessary rights, consents, and authorizations** for extraction operations (ScrapingBee Section 10)
5. **Not breach IP rights** of third parties
6. **Not scrape behind authentication** unless authorized (highlighted by Oxylabs as critical)

### 1.4 "As-Is" Service Disclaimers

All platforms provide services on an **"AS IS" basis** with comprehensive warranty disclaimers:

- **Apify** (Section 10.1): Disclaims warranties of merchantability, fitness for purpose, non-infringement, security, error-free operation, and accuracy of results
- **ScrapingBee** (Section 10): Cannot warrant services meet particular needs or achieve specific objectives
- Both explicitly disclaim liability for defects resulting from third-party website changes

### 1.5 Right to Refuse/Suspend Service

Every platform reserves unilateral discretion to:
- Refuse service to anyone for any reason
- Suspend accounts immediately for ToS violations
- Terminate accounts without refund for policy breaches
- Block certain content categories proactively

---

## 2. Liability Handling for User Actions

### 2.1 Complete Liability Shift to Users

The universal pattern is a **complete transfer of liability** from platform to user:

- **Apify** (Section 13.1): "We shall not be liable for the contents of the information that you upload... We are not obliged to verify the manner in which you or other Users or customers use the Website or Services."
- **ScrapingBee** (Section 11): "Provider is not obliged to verify or control the use, the website, API, or Services, and the Provider shall not be liable for the manner of such use... Provider shall not be liable for any unlawful actions in connection with the usage."

### 2.2 Liability Caps

Platforms impose aggressive monetary caps on their own liability:

| Platform | Liability Cap |
|----------|--------------|
| **Apify** | Lesser of: total fees paid in prior 12 months, OR $1,000 where exclusion prohibited |
| **ScrapingBee** | 50% of total fees received in prior 6 months |
| **Industry Standard** | 100% of fees paid in trailing 12 months |

### 2.3 Categories of Excluded Damages

All platforms exclude liability for:
- Loss of profits
- Consequential damages
- Special/indirect damages
- Exemplary/punitive damages
- Loss of data
- Loss of opportunity
- Damage to reputation
- Business interruption

### 2.4 No Verification Obligation

A critical clause present across platforms: **the provider has no duty to monitor, verify, or police how users use the service**. This is essential for avoiding contributory liability.

---

## 3. Jurisdictions & Governing Law

### 3.1 Platform Jurisdictions

| Platform | Entity Location | Governing Law | Court Jurisdiction |
|----------|----------------|---------------|-------------------|
| **Apify** | Prague, Czech Republic | Czech Republic law | Czech courts (Prague) |
| **ScrapingBee** | Paris, France (VostokInc SAS) | French law | Courts of Paris |
| **Oxylabs** | Vilnius, Lithuania | Lithuanian law (EU) | Lithuanian courts |
| **Bright Data** | Israel (Or HaEmek) | Israeli law | Israeli courts |
| **ZenRows** | Spain (inaccessible, but registered EU) | EU jurisdiction | Likely Spanish courts |

### 3.2 Jurisdiction Strategy Observations

**EU-based platforms** (Apify, ScrapingBee, Oxylabs, ZenRows) benefit from:
- EU Digital Services Act (DSA) safe harbor provisions for intermediary services
- Established GDPR compliance frameworks they can reference
- The EU Database Directive does not protect non-EU databases

**Israel-based** (Bright Data) benefits from:
- Strong tech-sector legal infrastructure
- Not directly subject to EU consumer protection
- Won a landmark US court case (Meta v. Bright Data, 2024) establishing that scraping publicly available data without login does not violate ToS

### 3.3 Key Exclusions

- **Apify** excludes both conflict of laws rules and CISG (UN Convention on International Sale of Goods)
- **ScrapingBee** operates under French Civil Code with specific exclusions of articles 1221-1223 (judicial power to decrease financial commitments)
- All platforms exclude consumer protection frameworks

### 3.4 Sanctions Compliance

**Apify** (Section 6.4) explicitly requires compliance with sanctions from:
- Czech Republic
- European Union
- United States
- United Nations

This is becoming standard and should be included in any scraping platform's ToS.

---

## 4. GDPR/CCPA/Data Protection Considerations

### 4.1 The Core Challenge

Web scraping can inadvertently collect **personal data** (names, emails, profile information) from public websites. Under GDPR and CCPA, even publicly available personal data is still protected.

### 4.2 How Platforms Handle Data Protection

**Data Processing Agreements (DPA):**
- Both Apify and ScrapingBee maintain separate DPAs
- The platform acts as a **Data Processor** (processing on behalf of the user)
- The user acts as the **Data Controller** (decides what to scrape and why)
- This allocation is critical: the Controller bears primary GDPR liability

**ScrapingBee's GDPR Approach:**
- French-incorporated (subject to CNIL oversight)
- Maintains comprehensive GDPR disclosure page listing all sub-processors
- Uses EU-based hosting (Clever Cloud, France) for API servers
- Deletes logs after 14 days
- Does not log response content
- Maintains Data Processing Agreement as a core legal document

**Apify's Data Handling:**
- EU Data Act Addendum for EU-headquartered customers
- Retains all rights to Usage Data (anonymized/aggregated)
- Customer retains rights to Customer Data
- Maintains separate Privacy Policy and DPA

### 4.3 Key GDPR Requirements for a Scraping Platform

1. **Lawful Basis for Processing:** The user (Controller) must establish a lawful basis (legitimate interest, consent, etc.) for any personal data collected via scraping
2. **Data Minimization:** Only collect what's necessary
3. **Purpose Limitation:** Data must be used only for stated purposes
4. **Storage Limitation:** Cannot retain indefinitely
5. **Data Subject Rights:** Must be able to respond to access, deletion, and portability requests
6. **Transfer Mechanisms:** If data crosses EU borders, appropriate safeguards required (SCCs, adequacy decisions)

### 4.4 CNIL Guidance (France, April 2020)

The French Data Protection Authority issued specific guidelines on web scraping:
- **Publicly available data is still personal data** and cannot be repurposed without knowledge of the data subject
- Scraping personal data for commercial prospecting requires consent or legitimate interest assessment
- Simply being "public" does not create a free license to collect and use personal data

### 4.5 CCPA Considerations

- Applies to businesses collecting data on California residents
- Consumers can request deletion of personal information
- Consumers can opt out of sale of their data
- Right to non-discrimination for exercising CCPA rights
- A scraping platform should include CCPA disclosures if serving US customers who may scrape data about California residents

### 4.6 Recommended Data Protection Architecture

For a scraping platform:
1. **Never store scraped content** on your servers longer than necessary for delivery
2. **Act only as a Processor**, never as a Controller of scraped data
3. **Maintain a DPA** that clearly allocates Controller/Processor responsibilities
4. **Log minimally** - delete request logs on a short cycle (14 days or less)
5. **Do not inspect or analyze scraped content** - this strengthens the "mere conduit" defense
6. **Publish a GDPR compliance page** and maintain a sub-processor list
7. **Implement data residency options** (EU hosting for EU customers)

---

## 5. Notable Legal Cases & Precedents

### 5.1 hiQ Labs v. LinkedIn (2019-2022) — THE Landmark Case

**Jurisdiction:** US Ninth Circuit / US Supreme Court  
**Key Holdings:**
- Scraping **publicly available data** does not violate the Computer Fraud and Abuse Act (CFAA)
- The CFAA's "without authorization" provision does not apply to public websites that require no authentication
- A website cannot revoke "authorization" that was never required in the first place
- Public interest favors allowing access to publicly available data

**Critical Caveat:** In November 2022, the district court found hiQ **did** breach LinkedIn's User Agreement by creating fake accounts ("Turkers") to scrape data. A settlement was reached where hiQ agreed to a permanent injunction. **The line between legal and illegal scraping ultimately depended on HOW the scraping was done (fake accounts vs. public access).**

**Implications for platforms:**
- Scraping publicly available data (no login required) has strong legal backing in the US
- Scraping behind authentication or using fake accounts crosses the line
- ToS/browsewrap agreements alone may not be sufficient to prevent scraping of public data

### 5.2 Meta v. Bright Data (2023-2024)

**Jurisdiction:** US Federal Court  
**Outcome:** Court ruled **against Meta** and in favor of Bright Data  
**Key Finding:** No evidence that Bright Data scraped data under a login, meaning they scraped only publicly available data. Meta's ToS could not prevent scraping of public-facing content.

**Implications:** Reinforces hiQ v. LinkedIn — scraping public data without authentication is defensible.

### 5.3 Ryanair v. PR Aviation (2018)

**Jurisdiction:** Netherlands (EU)  
**Outcome:** Dutch court ruled **against Ryanair**  
**Key Finding:**
- Ryanair's browsewrap ToU was not a legally binding contract
- Court analogized: putting up a poster saying "whoever reads further must pay €5" does not create a binding obligation
- Data was free and accessible to everyone

**Implications:** Browsewrap agreements (where terms are linked at the bottom of a page) may not be enforceable in EU courts. Clickwrap (requiring affirmative action) is stronger.

### 5.4 Ryanair v. Expedia (2019)

**Jurisdiction:** US Court  
**Outcome:** Settled (terms confidential)  
**Key Finding:** The CFAA may apply to US companies acting internationally, even against foreign websites.

### 5.5 Craigslist v. 3Taps (2013)

**Jurisdiction:** US Federal Court  
**Key Finding:** After receiving a cease-and-desist and having IPs blocked, 3Taps' continued scraping violated the CFAA. The C&D letter + IP blocking was sufficient to establish "without authorization."

**Implications:** Continuing to scrape after receiving a C&D and being actively blocked creates serious CFAA exposure.

### 5.6 Meta v. Octopus / Meta v. Ekrem Ateş (2022)

**Jurisdiction:** US Courts  
**Claims:** Violation of Meta's terms and conditions through scraping personal information from Facebook and Instagram

### 5.7 Van Buren v. United States (2021)

**Jurisdiction:** US Supreme Court  
**Key Finding:** The CFAA's "exceeds authorized access" only applies when someone with valid access to a system accesses parts they are not intended to access. It does **not** cover public data.

**Implications:** Narrowed the CFAA's applicability, making it harder to use CFAA against scrapers of public data.

### 5.8 eBay v. Bidder's Edge (2000)

**Jurisdiction:** US Federal Court  
**Key Finding:** Established "trespass to chattels" theory — a scraper can be liable for trespass if it causes damage to the plaintiff's computer systems.

**Implications:** Excessive scraping that degrades website performance creates additional legal exposure beyond CFAA.

### 5.9 Summary: Current Legal Landscape

| Scenario | US Legal Status | EU Legal Status |
|----------|----------------|-----------------|
| Scraping publicly available data (no login) | **Generally permissible** (hiQ, Meta v. Bright Data) | **Likely permissible** but data protection laws apply (Ryanair v. PR Aviation) |
| Scraping after C&D + IP block | **CFAA violation** (Craigslist v. 3Taps) | Likely breach of contract if clickwrap |
| Scraping behind authentication | **CFAA violation** | Likely breach of contract + data protection violations |
| Scraping personal data | Permissible with restrictions | **GDPR applies** regardless of public availability |
| Scraping copyrighted content | **Copyright infringement** | **Copyright infringement** + Database Directive |
| Causing server degradation | **Trespass to chattels** (eBay v. Bidder's Edge) | Potential civil and criminal liability |

---

## 6. Acceptable Use Policies

### 6.1 Common Prohibited Activities

Based on analysis of Apify and ScrapingBee AUPs, the following activities are universally prohibited:

**Infrastructure Abuse:**
- DDoS attacks or actions causing undue server burden
- Interference with service operation
- Circumventing security mechanisms

**Fraud & Deception:**
- Phishing, malware, impersonation, spoofing
- Ad fraud, click fraud
- Creating fake accounts or deceptive content
- SEO manipulation (fake clicks in search results)

**Spam & Unauthorized Communications:**
- Unsolicited mass messaging
- Running unconfirmed mailing lists
- Spam solicitation

**Content Restrictions:**
- Content that incites violence or depicts child exploitation
- Obscene, defamatory, or threatening content
- Content violating export control laws

**Commercial Restrictions:**
- Ticket-bot purchasing
- Gambling/lottery activities
- Crypto/NFT trading
- Fake engagement (likes, comments, shares)
- Resale of platform features without authorization

**Data Access Restrictions:**
- Collection of non-public information (data behind login)
- Unauthorized access to accounts or resources
- Violation of third-party terms of service

**Additional ScrapingBee Restrictions:**
- Use of streaming-related domains
- Posting on classified sites (Craigslist etc.)
- Completion of surveys for financial benefit
- Gaming or trading in-game items

### 6.2 Platform Enforcement Rights

- **Immediate suspension/termination** without notice for AUP violations
- **No credit refunds** for service interruptions due to AUP violations
- **Right to proactively block** certain content categories (adult, governmental, harmful domains)
- **Sole discretion** to deem activities unacceptable
- **Investigation authority** for suspected violations
- **Law enforcement cooperation**

### 6.3 Accountability Framework

**ScrapingBee's approach (recommended model):**
- Users responsible for their own actions AND anyone using services on their behalf
- Responsibility covers unauthorized access resulting from failure to control credentials
- Subscriber Users responsible for all Subsidiary Users' compliance (contractual guarantee)

---

## 7. Indemnification Clause Structures

### 7.1 Apify Model (Section 11.1) — Comprehensive

The user agrees to **indemnify, defend, and hold harmless**:
- The company
- Its agents, affiliates, subsidiaries
- Directors, officers, employees
- Third parties (partners, licensors, licensees, consultants, contractors)

**Covered claims:**
- Third-party claims arising from use of services in breach of agreement
- Claims related to publication or use of any platform tools
- Disputes with third-party developers
- **Extracting data from unauthorized sources** — user compensates damages AND third-party claims; platform bears no liability

**Third-party beneficiary rights:** Each indemnified person has the right to assert and enforce indemnification rights directly.

### 7.2 ScrapingBee Model (Section 10) — Warranty-Linked

User indemnifies **all Indemnified Persons** from:
- Third-party claims, demands, suits
- Liability, loss, conviction
- Costs (advice, proceedings, settlements)
- Incidental expenses

**Triggered by:**
- Breach of user warranties (compliance with applicable law, obtaining all necessary rights/consents/authorizations)
- Any activities not in accordance with the terms
- User's use of the Services and API generally

### 7.3 Recommended Indemnification Structure

A scraping platform's indemnification clause should:

1. **Cover broad categories of indemnified parties** (company + affiliates + employees + contractors)
2. **Include "defend" obligation** — not just "indemnify" (shifts cost of defense, not just damages)
3. **Trigger on both breach AND general use** — cover situations where user's scraping activities generate claims even without a clear ToS breach
4. **Explicitly cover IP infringement claims** arising from scraped content
5. **Explicitly cover data protection claims** from third parties whose data was scraped
6. **Include third-party beneficiary rights** so individual employees can enforce directly
7. **Survive termination** of the agreement

---

## 8. Recommended Legal Framework for a Scraping Platform

### 8.1 Required Legal Documents

Based on industry analysis, a scraping platform needs:

| Document | Purpose | Priority |
|----------|---------|----------|
| **Terms of Service** | Core contractual relationship | Critical |
| **Acceptable Use Policy** | Prohibited activities, enforcement rights | Critical |
| **Privacy Policy** | Platform's own data collection practices | Critical |
| **Data Processing Agreement** | Controller/Processor allocation for scraped data | Critical |
| **GDPR/Data Protection Notice** | Specific data protection compliance disclosure | High |
| **Cookie Policy** | Website cookie usage | Medium |
| **Legal Notices / Imprint** | Company registration, contact details | Medium (required in EU) |

### 8.2 Core Legal Principles

1. **You are a tool, not a scraper.** The platform provides infrastructure. Users decide what to scrape and bear all responsibility.

2. **Business use only.** Exclude consumer protection frameworks by restricting to professional/commercial users.

3. **No verification duty.** The platform has no obligation to monitor, verify, or police user activities.

4. **Maximum liability shift.** Users indemnify the platform for all third-party claims. Platform liability capped at fees paid in trailing 6-12 months.

5. **Aggressive warranty disclaimers.** "As-is" service with no guarantees of legality, accuracy, or fitness.

6. **Comprehensive AUP.** Clear list of prohibited activities with immediate termination rights.

7. **Data minimization.** Don't store scraped data longer than necessary. Don't inspect content. Maintain "mere conduit" status.

### 8.3 Jurisdiction Selection Considerations

**For a new scraping platform, consider:**

| Factor | US (Delaware) | EU (Ireland/Netherlands) | Israel |
|--------|--------------|-------------------------|--------|
| Case law favorability | Strong (hiQ, Van Buren) | Moderate (Ryanair v. PR Aviation) | Strong (Bright Data precedent) |
| Data protection burden | Lower (CCPA applies only to CA residents) | Higher (GDPR applies broadly) | Moderate |
| Consumer protection risk | Moderate | Higher | Lower |
| Enforcement risk | Moderate (CFAA still exists) | Moderate (DSA framework) | Lower |
| Business credibility | High | High | Moderate |
| Tax considerations | Varies by state | Favorable (Ireland) | Favorable |

**Recommendation:** Incorporate in the EU (for GDPR credibility) but choose governing law carefully. Czech Republic (Apify), France (ScrapingBee), and Lithuania (Oxylabs) all work. Alternatively, Delaware incorporation with EU-compliant DPA covers both markets.

### 8.4 KYC/Compliance Best Practices

Following Oxylabs' model:
- Implement **Know Your Customer (KYC)** procedures for new users
- Maintain a **list of restricted targets** (government sites, financial data, healthcare)
- Reserve right to **proactively block** certain domains/content categories
- Implement **abuse reporting** mechanisms
- Cooperate with law enforcement when required

### 8.5 Risk Mitigation Checklist

- [ ] ToS establishes platform as neutral tool provider
- [ ] Services restricted to business/professional use
- [ ] User bears sole responsibility for scraping legality
- [ ] Comprehensive indemnification covering all third-party claims
- [ ] Liability capped at trailing 6-12 month fees
- [ ] All consequential/indirect damages excluded
- [ ] "As-is" warranty disclaimer
- [ ] Comprehensive AUP with immediate termination rights
- [ ] DPA allocating Controller/Processor roles
- [ ] GDPR compliance documentation
- [ ] KYC procedures implemented
- [ ] Restricted targets list maintained
- [ ] Abuse reporting mechanism in place
- [ ] Sanctions compliance clause
- [ ] Survival clause for key provisions post-termination
- [ ] Insurance requirement (ScrapingBee requires both parties to maintain professional liability insurance)
- [ ] Confidentiality provisions
- [ ] IP ownership clearly defined (platform retains platform IP; user retains user data)

---

## Sources

- Apify General Terms and Conditions (effective January 12, 2026)
- Apify Acceptable Use Policy
- ScrapingBee General Terms and Conditions (updated July 15, 2024)
- ScrapingBee Acceptable Use Policy (effective July 15, 2024)
- ScrapingBee GDPR Notice (updated July 22, 2024)
- Oxylabs Blog: "Is Web Scraping Legal?" (updated January 7, 2025)
- Wikipedia: hiQ Labs v. LinkedIn
- Wikipedia: Web Scraping — Legal Issues
- CNIL Guidelines on Web Scraping (April 30, 2020)
- hiQ Labs v. LinkedIn, 938 F.3d 985 (9th Cir. 2019)
- Van Buren v. United States, 593 U.S. ___ (2021)
- Meta v. Bright Data (2024, US Federal Court)
- Ryanair v. PR Aviation (2018, Netherlands)
- Craigslist v. 3Taps (2013, US Federal Court)
- eBay v. Bidder's Edge (2000, US Federal Court)
