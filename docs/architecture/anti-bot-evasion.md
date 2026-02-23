# Anti-Bot Evasion Architecture

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Active |
| Classification | Internal |

---

## Overview

This document describes the architectural strategies Scrapifie employs to extract data reliably from protected environments. It covers proxy infrastructure, headless browser automation, fingerprint management, TLS-level evasion, header consistency, CAPTCHA handling, behavioral randomization, and anti-honeypot measures.

---

## 1. Proxy Infrastructure and IP Management

The foundation of a scalable scraping architecture is disciplined IP address management. High request volumes from a single IP trigger rate limits and bans.

### Proxy Types

| Type | Description | Use Case |
|------|-------------|----------|
| Datacenter | Hosted on cloud infrastructure (AWS, DigitalOcean). Fast and inexpensive but flagged easily due to known IP ranges. | Low-security targets |
| Residential | IPs assigned by ISPs to homeowners. Highly trusted because they mimic legitimate user traffic. | Strict anti-scraping systems |
| Mobile (3G/4G/5G) | IPs from mobile network operators. Use CGNAT so thousands of users share a public IP; blocking them risks blocking legitimate users. | Maximum resilience |
| Stealth | Specialized infrastructure that masks proxy protocol headers to make traffic appear as a direct connection. | Fingerprint-sensitive targets |

### Rotation Strategy

Two complementary rotation modes are available depending on the scraping task:

- **Request-based rotation** assigns a new IP for every HTTP request. Suitable for stateless page fetches.
- **Session-based (sticky) rotation** maintains the same IP for a configurable duration or user session, which is required when persistent cookies or login state must be preserved across requests.

### Infrastructure Implementation

A centralized proxy gateway handles upstream proxy authentication and rotation logic. Containerized proxy managers can be deployed across multiple cloud providers to create ephemeral proxy instances that are discarded after use.

---

## 2. Headless Browsers and Automation

Static HTTP requests are insufficient for Single Page Applications and JavaScript-heavy sites. Headless browsers execute the full DOM and JavaScript stack.

### Browser Engines

| Engine | Description |
|--------|-------------|
| Playwright | Supports Chromium, Firefox, and WebKit. Fast and reliable for modern web applications. |
| Puppeteer | High-level control over Chrome. Well-suited for deep interactions and performance profiling. |
| Selenium | The legacy standard. Larger ecosystem but higher resource consumption. |

### Evasion-Focused Builds

Standard headless browsers expose their nature through JavaScript properties such as `navigator.webdriver`. Specialized builds remove these signals:

| Tool | Description |
|------|-------------|
| Camoufox | A custom Firefox build designed for evasion with built-in fingerprint spoofing and stealth patches. Used as the Stealth engine in Scrapifie. |
| Undetected Chromedriver | A modified Selenium WebDriver that patches the binary to remove standard bot markers. |
| Nodriver | Uses the Chrome DevTools Protocol directly, bypassing standard WebDriver detection vectors. |
| Puppeteer Stealth | A plugin suite that patches runtime JavaScript leaks in Puppeteer sessions. |

---

## 3. Browser Fingerprinting

Anti-bot systems construct a unique fingerprint of the client to identify bots even when the IP address changes.

### Detection Vectors

| Vector | Mechanism |
|--------|-----------|
| Canvas fingerprinting | Renders invisible shapes on a canvas element and hashes the resulting pixel data. GPU and driver differences produce unique values. |
| AudioContext | Analyses audio stack and oscillator waveforms to produce a hardware-specific signature. |
| Hardware concurrency | Reads the CPU core count via `navigator.hardwareConcurrency`. |
| Navigator properties | Checks `userAgent`, `platform`, `languages`, `plugins`, and screen resolution for consistency. |

### Countermeasures

- **Spoofing** — JavaScript injection overwrites dangerous properties, for example setting `navigator.webdriver` to `undefined`.
- **Consistency** — Spoofed values must align with the declared User-Agent. Reporting a macOS platform while sending a Windows User-Agent is an immediate signal.
- **Randomization** — Subtle noise is injected into canvas and audio outputs to alter the fingerprint per session, preventing persistent cross-session tracking.

The fingerprint generation and injection system is implemented in `src/fingerprint/`.

---

## 4. TLS Fingerprinting

TLS negotiation occurs before any HTTP data is transmitted. Anti-bot systems analyze the `ClientHello` packet to identify the client library.

### The Mechanism

The server inspects the following attributes of the TLS handshake:

- **Cipher suites** — The order and selection of supported encryption methods.
- **TLS extensions** — Supported features including ALPN and SNI.
- **Elliptic curves** — Supported algorithms for key exchange.

Standard HTTP libraries (Python `requests`, Node.js `axios`) have distinct signatures that differ from real browser handshakes. Systems such as Cloudflare and Akamai block requests based on mismatching TLS fingerprints (JA3 hashes).

### Mitigation

- Cipher suites are explicitly configured to match the target browser's known order.
- Specialized TLS clients mimic browser handshakes at the protocol level rather than patching JavaScript properties.
- In Node.js, custom HTTPS agents or native bindings can be used to modify the TLS handshake order.

---

## 5. Request Headers and User Agents

HTTP headers provide context about the client. Inconsistencies are among the easiest detection vectors.

### User-Agent Management

- A database of current User-Agent strings across Chrome, Firefox, and Safari on multiple operating systems is maintained.
- Modern browsers send structured Client Hints headers (`Sec-CH-UA`) in addition to the traditional User-Agent string. These must match exactly.

### Header Consistency Rules

| Header | Requirement |
|--------|-------------|
| `Referer` | Send a realistic value (the site's own homepage or a search engine result page) to simulate natural navigation. |
| `Accept-Language` | Match the proxy's geographic region. Sending `en-US` from a German residential IP is a consistency failure. |
| Header order | Browsers transmit headers in a specific order. The order used by the impersonated browser must be replicated. |

---

## 6. CAPTCHA Solving Architecture

When evasion is insufficient, CAPTCHAs act as a secondary gatekeeper.

### CAPTCHA Types

| Type | Examples |
|------|----------|
| Traditional | Text and image recognition challenges |
| Behavioral | reCAPTCHA v3, hCaptcha — analyse user interaction score rather than presenting a visible challenge |

### Solving Strategies

| Strategy | Description | Trade-offs |
|----------|-------------|------------|
| AI/ML solvers | Use OCR and object detection models (YOLO, ResNet) to solve image challenges locally. | Fastest; no per-solve cost; limited to image types |
| Human solving services | Delegate challenges to human click-farm services (2Captcha, Anti-Captcha) via API. | Highest success rate; introduces latency and per-solve cost |
| Token injection | For reCAPTCHA, intercept the callback token and inject it directly into the form payload. | Effective when the token alone satisfies the server-side verification |

---

## 7. Behavioral Analysis and Pattern Randomization

Static, predictable behavior is a reliable bot indicator.

### Timing Randomization

Fixed sleep intervals are a clear signal. Request timing should follow a Poisson distribution or a randomized range that mimics human reading and interaction time. Sequential scraping of resource IDs (1, 2, 3) should be replaced with randomized access or queue-based distribution.

### Navigation Simulation

Direct access to deep links frequently triggers protection mechanisms. A natural user journey — landing page, search, click through to target — distributes traffic across the site in a pattern consistent with organic users.

### Human Input Simulation

- Mouse movement should follow Bezier curves between points. Instantaneous cursor teleportation is a reliable bot marker.
- Random scrolls, incidental hovers over neutral elements, and occasional clicks on non-target areas generate interaction noise that behavioral analysis systems expect from real users.

---

## 8. Rate Limiting and Backoff Strategies

Operating within server constraints extends the longevity of a scraping session.

- The `X-RateLimit-Limit` and `X-RateLimit-Remaining` response headers are monitored to detect approaching limits before a 429 is issued.
- On receiving a 429 response, the affected worker pauses for an exponentially increasing duration before retrying.
- Concurrency is adjusted dynamically based on observed success rates and response latency.

---

## 9. API Reverse Engineering

Bypassing the HTML frontend to query internal APIs directly is the most efficient scraping approach when available.

### Process

1. Open browser DevTools and inspect the Network tab for XHR and Fetch requests that return JSON.
2. Identify dynamic authentication tokens (CSRF tokens, JWTs, or proprietary signatures) that must be reproduced.
3. Replicate the request with all required headers, cookies, and payload structure.
4. For mobile applications, APK decompilation or mobile traffic interception often reveals API endpoints with less aggressive rate limiting than their web equivalents.

---

## 10. Honeypots and Traps

Invisible defenses are designed to flag bot IP addresses or poison scraped data.

### Common Trap Types

| Trap | Description |
|------|-------------|
| Hidden links | Links concealed via CSS (`display: none` or off-screen positioning). Real users never interact with these; bots that parse raw HTML do. |
| Decoy form fields | Hidden input fields designed to catch automated form fillers. Submitting a value in these fields flags the request as automated. |

### Evasion

Before interacting with any element, its computed CSS style is evaluated to confirm it is visible in the viewport. The `robots.txt` file may explicitly list honeypot paths under `Disallow` directives.

---

## 11. Caching and Archival Sources

External caches reduce direct load on the target and bypass real-time defenses entirely where historical data is acceptable.

- Google Cache: `https://webcache.googleusercontent.com/search?q=cache:<URL>`
- Wayback Machine: Useful for historical data or when the live target is temporarily inaccessible.

---

## Summary

| Defense Mechanism | Architectural Countermeasure |
|-------------------|------------------------------|
| IP blocking | High-quality residential and mobile proxy pool with rotation logic |
| Browser fingerprinting | Camoufox (patched Firefox), JavaScript property spoofing |
| TLS fingerprinting | JA3-matching TLS clients |
| Behavioral analysis | Randomized timing, non-linear navigation, human input simulation |
| Rate limiting | Distributed architecture, exponential backoff, header monitoring |
| CAPTCHA | AI solvers or human-in-the-loop API integration |
| Honeypots | Computed style validation, visibility checks before interaction |

---

## Related Documentation

- Scraping engines: `docs/architecture/engines.md`
- Proxy system: see proxy configuration in `src/proxy/`
- Fingerprint system: see `src/fingerprint/`
