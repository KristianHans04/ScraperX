# Scraping Engines

Scrapifie uses three different engines to handle various scraping scenarios. Each engine is optimized for specific use cases and has different resource requirements.

## Engine Overview

| Engine | Technology | Speed | Stealth | Cost | Best For |
|--------|------------|-------|---------|------|----------|
| HTTP | undici | Fast | Low | 1 credit | Static pages, APIs |
| Browser | Playwright | Medium | Medium | 5 credits | JavaScript sites |
| Stealth | Camoufox | Slow | High | 10 credits | Protected sites |

## HTTP Engine

The HTTP engine uses the `undici` library for fast, efficient HTTP requests.

### Capabilities

- GET, POST, PUT, DELETE requests
- Custom headers and cookies
- Automatic redirect following
- Response streaming
- Proxy support

### Limitations

- No JavaScript execution
- No dynamic content rendering
- Easily detected by anti-bot systems

### When to Use

- Static HTML pages
- REST APIs
- Sitemaps and feeds
- Pages without JavaScript requirements

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_TIMEOUT_MS` | 30000 | Request timeout |
| `HTTP_MAX_REDIRECTS` | 5 | Maximum redirects to follow |

## Browser Engine

The Browser engine uses Playwright to control real browsers (Chromium by default).

### Capabilities

- Full JavaScript execution
- Dynamic content rendering
- Wait for selectors or network idle
- Screenshot capture
- Cookie and session handling
- Custom viewport and user agent

### Limitations

- Higher resource consumption
- Slower than HTTP requests
- Can be detected by sophisticated anti-bot systems

### When to Use

- Single Page Applications (SPAs)
- JavaScript-rendered content
- Sites requiring user interactions
- Content behind client-side routing

### Browser Pool

Scrapifie maintains a pool of browser instances to balance performance and resource usage:

- Browsers are reused across requests
- Pool automatically scales based on demand
- Idle browsers are closed after timeout

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_POOL_SIZE` | 5 | Maximum concurrent browsers |
| `BROWSER_TIMEOUT_MS` | 30000 | Page load timeout |
| `BROWSER_HEADLESS` | true | Run without GUI |

## Stealth Engine

The Stealth engine uses Camoufox, a Firefox-based stealth browser designed to evade detection.

### Capabilities

- All Browser engine capabilities
- Advanced fingerprint spoofing
- Human-like behavior patterns
- Anti-detection evasion
- Residential proxy integration

### How It Works

1. Scrapifie sends request to Camoufox service
2. Camoufox generates realistic browser fingerprint
3. Fingerprint is injected into browser context
4. Request is executed with human-like patterns
5. Result is returned to Scrapifie

### When to Use

- Cloudflare-protected sites
- Sites with bot detection
- High-value scraping targets
- When other engines fail

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMOUFOX_URL` | http://localhost:8000 | Camoufox service URL |
| `STEALTH_TIMEOUT_MS` | 60000 | Stealth request timeout |

## Auto Engine Selection

When `engine: "auto"` is specified, Scrapifie automatically selects the best engine:

### Selection Logic

```
1. Try HTTP engine first (fastest, cheapest)
   ├── Success? → Return result
   └── Failed (403, bot detection)? → Continue

2. Try Browser engine
   ├── Success? → Return result
   └── Failed (detection, challenge)? → Continue

3. Try Stealth engine
   ├── Success? → Return result
   └── Failed? → Return error
```

### Escalation Triggers

The system escalates to a more capable engine when:

- HTTP returns 403, 429, or 503 status codes
- Response contains known bot detection patterns
- JavaScript is required but HTTP was used
- Cloudflare or similar challenge detected

### Cost Optimization

Auto mode always starts with the cheapest option and only escalates when necessary, minimizing credit usage while maximizing success rate.

## Engine Selection Guide

| Scenario | Recommended Engine |
|----------|-------------------|
| Blog posts, news articles | HTTP |
| Product pages (static) | HTTP |
| Search results | HTTP or Browser |
| E-commerce with JS | Browser |
| Social media feeds | Browser or Stealth |
| Cloudflare-protected | Stealth |
| CAPTCHA-heavy sites | Stealth |
| Unknown site | Auto |

## Fingerprint Generation

Both Browser and Stealth engines can use fingerprint generation:

- Randomized screen resolution
- Realistic timezone and locale
- Hardware characteristics
- WebGL and Canvas fingerprints
- Font lists matching real systems

See [Fingerprint documentation](../api/endpoints.md) for API details.
