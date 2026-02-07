# Appendix A: Proxy Providers

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APP-A |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Engineering Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Provider Comparison](#2-provider-comparison)
3. [Bright Data](#3-bright-data)
4. [Oxylabs](#4-oxylabs)
5. [Smartproxy](#5-smartproxy)
6. [Additional Providers](#6-additional-providers)
7. [Integration Architecture](#7-integration-architecture)
8. [Cost Optimization](#8-cost-optimization)

---

## 1. Overview

### 1.1 Purpose

This appendix provides detailed information about proxy providers integrated with ScraperX, including pricing, features, API documentation, and integration code.

### 1.2 Proxy Tier Strategy

ScraperX uses a tiered proxy strategy to optimize cost and success rate:

```
+------------------------------------------------------------------+
|                    PROXY TIER HIERARCHY                           |
+------------------------------------------------------------------+
|                                                                   |
|  TIER 1: DATACENTER (Default)                                     |
|  +----------------------------------------------------------+    |
|  |  Cost: $0.50-2.00 per GB                                  |    |
|  |  Speed: Fastest                                           |    |
|  |  Detection: High risk on protected sites                  |    |
|  |  Use: Unprotected sites, APIs, high-volume                |    |
|  +----------------------------------------------------------+    |
|                           |                                       |
|                           v (On block/detection)                  |
|  TIER 2: RESIDENTIAL                                              |
|  +----------------------------------------------------------+    |
|  |  Cost: $5-15 per GB                                       |    |
|  |  Speed: Medium                                            |    |
|  |  Detection: Low risk                                      |    |
|  |  Use: Most e-commerce, social media, search engines       |    |
|  +----------------------------------------------------------+    |
|                           |                                       |
|                           v (On persistent blocks)                |
|  TIER 3: MOBILE                                                   |
|  +----------------------------------------------------------+    |
|  |  Cost: $20-50 per GB                                      |    |
|  |  Speed: Variable                                          |    |
|  |  Detection: Lowest risk (CGNAT shared IPs)                |    |
|  |  Use: Heavily protected sites, CAPTCHA-heavy              |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 1.3 Selection Criteria

| Criterion | Weight | Measurement |
|-----------|--------|-------------|
| Network Size | 25% | IP pool size, geographic coverage |
| Success Rate | 30% | Block rate on test site portfolio |
| Pricing | 20% | Cost per GB/request |
| API Quality | 15% | Documentation, reliability, features |
| Support | 10% | Response time, technical expertise |

---

## 2. Provider Comparison

### 2.1 Summary Matrix

| Feature | Bright Data | Oxylabs | Smartproxy |
|---------|-------------|---------|------------|
| **Datacenter IPs** | 770K+ | 2M+ | 400K+ |
| **Residential IPs** | 72M+ | 100M+ | 55M+ |
| **Mobile IPs** | 7M+ | 20M+ | 10M+ |
| **Countries** | 195+ | 195+ | 195+ |
| **Datacenter $/GB** | $0.60 | $0.60 | $0.80 |
| **Residential $/GB** | $8.40 | $10.00 | $7.00 |
| **Mobile $/GB** | $30.00 | $25.00 | $20.00 |
| **Session Control** | Yes | Yes | Yes |
| **Geo-Targeting** | City-level | City-level | Country-level |
| **API Type** | REST + Proxy | REST + Proxy | Proxy only |
| **Minimum Commitment** | $500/mo | $300/mo | $100/mo |

### 2.2 Detailed Scoring

| Provider | Network | Success | Price | API | Support | Total |
|----------|---------|---------|-------|-----|---------|-------|
| Bright Data | 95 | 92 | 75 | 95 | 90 | 89.3 |
| Oxylabs | 98 | 90 | 70 | 90 | 85 | 87.5 |
| Smartproxy | 80 | 85 | 90 | 75 | 80 | 82.5 |

### 2.3 Recommended Usage

| Use Case | Primary | Fallback |
|----------|---------|----------|
| High Volume Static | Smartproxy DC | Bright Data DC |
| E-commerce Scraping | Bright Data Residential | Oxylabs Residential |
| Social Media | Oxylabs Residential | Smartproxy Residential |
| Search Engines | Bright Data Residential | Oxylabs Residential |
| Maximum Stealth | Bright Data Mobile | Oxylabs Mobile |
| Cost Optimization | Smartproxy | Bright Data |

---

## 3. Bright Data

### 3.1 Overview

Bright Data (formerly Luminati) is the market leader in proxy services, offering the most comprehensive feature set and largest network.

| Attribute | Value |
|-----------|-------|
| Company | Bright Data Ltd |
| Founded | 2014 |
| Headquarters | Israel |
| Website | https://brightdata.com |
| Network Size | 72M+ residential IPs |
| Countries | 195+ |

### 3.2 Products

| Product | Description | Pricing Model |
|---------|-------------|---------------|
| Datacenter Proxies | Shared and dedicated datacenter IPs | Per GB |
| ISP Proxies | Static residential IPs | Per IP/month |
| Residential Proxies | Rotating residential IPs | Per GB |
| Mobile Proxies | Real mobile device IPs | Per GB |
| Web Unlocker | Managed unlocking service | Per request |
| SERP API | Search engine results | Per request |
| Scraping Browser | Cloud browser with proxy | Per request |

### 3.3 Pricing Details

**Datacenter Proxies:**

| Plan | Price/GB | IPs Included | Features |
|------|----------|--------------|----------|
| Pay as You Go | $0.60 | Shared pool | Basic targeting |
| Starter | $500/mo for 833GB | Shared pool | Country targeting |
| Production | $1,000/mo for 2,000GB | Shared + dedicated | City targeting |
| Enterprise | Custom | Dedicated pool | Full features |

**Residential Proxies:**

| Plan | Price/GB | Monthly Min | Features |
|------|----------|-------------|----------|
| Pay as You Go | $8.40 | $500 | Country targeting |
| Growth | $7.00 | $1,000 | City targeting |
| Business | $6.00 | $5,000 | ASN targeting |
| Enterprise | Custom | $15,000+ | All features |

**Mobile Proxies:**

| Plan | Price/GB | Monthly Min | Features |
|------|----------|-------------|----------|
| Pay as You Go | $30.00 | $500 | Country targeting |
| Growth | $25.00 | $2,000 | Carrier targeting |
| Enterprise | Custom | $10,000+ | All features |

### 3.4 API Integration

**Authentication Methods:**

```typescript
// Method 1: Username/Password in proxy URL
const proxyUrl = 'http://username-zone-residential:password@zproxy.lum-superproxy.io:22225';

// Method 2: API Key header
const headers = {
  'Authorization': `Bearer ${BRIGHT_DATA_API_KEY}`
};
```

**Proxy Configuration:**

```typescript
// src/proxy/providers/bright-data.ts

import { ProxyProvider, ProxyConfig, ProxyTier } from '../types';

export interface BrightDataConfig {
  customerId: string;
  zonePassword: string;
  zones: {
    datacenter: string;
    residential: string;
    mobile: string;
  };
}

export class BrightDataProvider implements ProxyProvider {
  private config: BrightDataConfig;
  private baseHost = 'zproxy.lum-superproxy.io';
  private ports = {
    http: 22225,
    https: 22225,
    socks5: 22226
  };

  constructor(config: BrightDataConfig) {
    this.config = config;
  }

  getProxy(options: {
    tier: ProxyTier;
    country?: string;
    city?: string;
    sessionId?: string;
    asn?: number;
  }): ProxyConfig {
    const zone = this.getZone(options.tier);
    const username = this.buildUsername(zone, options);

    return {
      host: this.baseHost,
      port: this.ports.http,
      username,
      password: this.config.zonePassword,
      protocol: 'http'
    };
  }

  private getZone(tier: ProxyTier): string {
    switch (tier) {
      case 'datacenter':
        return this.config.zones.datacenter;
      case 'residential':
        return this.config.zones.residential;
      case 'mobile':
        return this.config.zones.mobile;
      default:
        return this.config.zones.datacenter;
    }
  }

  private buildUsername(zone: string, options: {
    country?: string;
    city?: string;
    sessionId?: string;
    asn?: number;
  }): string {
    const parts = [
      `lum-customer-${this.config.customerId}`,
      `zone-${zone}`
    ];

    if (options.country) {
      parts.push(`country-${options.country.toLowerCase()}`);
    }

    if (options.city) {
      parts.push(`city-${options.city.toLowerCase()}`);
    }

    if (options.sessionId) {
      parts.push(`session-${options.sessionId}`);
    }

    if (options.asn) {
      parts.push(`asn-${options.asn}`);
    }

    return parts.join('-');
  }

  async getStats(): Promise<{
    bandwidthUsed: number;
    bandwidthLimit: number;
    requestCount: number;
  }> {
    const response = await fetch(
      `https://api.brightdata.com/zone/stats?zone=${this.config.zones.residential}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_KEY}`
        }
      }
    );
    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      const proxy = this.getProxy({ tier: 'datacenter' });
      const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
      
      const response = await fetch('https://lumtest.com/myip.json', {
        // @ts-ignore - using proxy agent
        agent: new HttpsProxyAgent(proxyUrl)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

**Usage with impit:**

```typescript
// src/scraper/http-engine.ts

import { impit } from 'impit';
import { BrightDataProvider } from '../proxy/providers/bright-data';

async function scrapeWithBrightData(url: string): Promise<string> {
  const provider = new BrightDataProvider({
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID!,
    zonePassword: process.env.BRIGHT_DATA_ZONE_PASSWORD!,
    zones: {
      datacenter: 'dc_zone1',
      residential: 'res_zone1',
      mobile: 'mobile_zone1'
    }
  });

  const proxy = provider.getProxy({
    tier: 'residential',
    country: 'US',
    sessionId: `session_${Date.now()}`
  });

  const response = await impit(url, {
    impersonate: 'chrome120',
    proxy: {
      server: `http://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    },
    timeout: 30000
  });

  return response.text();
}
```

**Usage with Playwright:**

```typescript
// src/scraper/browser-engine.ts

import { chromium, Browser, BrowserContext } from 'playwright';
import { BrightDataProvider } from '../proxy/providers/bright-data';

async function scrapeWithPlaywright(url: string): Promise<string> {
  const provider = new BrightDataProvider({
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID!,
    zonePassword: process.env.BRIGHT_DATA_ZONE_PASSWORD!,
    zones: {
      datacenter: 'dc_zone1',
      residential: 'res_zone1',
      mobile: 'mobile_zone1'
    }
  });

  const proxy = provider.getProxy({
    tier: 'residential',
    country: 'US',
    sessionId: `browser_${Date.now()}`
  });

  const browser = await chromium.launch({
    proxy: {
      server: `http://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    }
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  const content = await page.content();
  
  await browser.close();
  return content;
}
```

### 3.5 Advanced Features

**Web Unlocker API:**

```typescript
// For heavily protected sites, use Web Unlocker instead of raw proxies

async function scrapeWithUnlocker(url: string): Promise<string> {
  const response = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_KEY}`
    },
    body: JSON.stringify({
      zone: 'unlocker',
      url: url,
      format: 'raw',
      country: 'US',
      render_js: true
    })
  });

  return response.text();
}
```

**Scraping Browser:**

```typescript
// Cloud browser with built-in proxy and anti-detection

import { chromium } from 'playwright';

async function scrapeWithScrapingBrowser(url: string): Promise<string> {
  const browser = await chromium.connectOverCDP(
    `wss://brd-customer-${process.env.BRIGHT_DATA_CUSTOMER_ID}-zone-scraping_browser:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`
  );

  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  const content = await page.content();
  
  await browser.close();
  return content;
}
```

---

## 4. Oxylabs

### 4.1 Overview

Oxylabs offers one of the largest proxy networks with strong enterprise features and competitive pricing for high-volume users.

| Attribute | Value |
|-----------|-------|
| Company | Oxylabs |
| Founded | 2015 |
| Headquarters | Lithuania |
| Website | https://oxylabs.io |
| Network Size | 100M+ residential IPs |
| Countries | 195+ |

### 4.2 Products

| Product | Description | Pricing Model |
|---------|-------------|---------------|
| Datacenter Proxies | Dedicated and shared datacenter IPs | Per IP or GB |
| Residential Proxies | Rotating residential IPs | Per GB |
| Mobile Proxies | Real mobile device IPs | Per GB |
| ISP Proxies | Static residential IPs | Per IP/month |
| Web Scraper API | Managed scraping service | Per request |
| SERP Scraper API | Search engine results | Per request |

### 4.3 Pricing Details

**Datacenter Proxies:**

| Plan | Price | Included | Features |
|------|-------|----------|----------|
| Starter | $180/mo | 3GB + 100 IPs | US/EU locations |
| Advanced | $400/mo | 16GB + 200 IPs | More locations |
| Premium | $1,200/mo | 100GB + 500 IPs | All locations |
| Enterprise | Custom | Custom | Full features |

**Residential Proxies:**

| Plan | Price/GB | Monthly Min | Features |
|------|----------|-------------|----------|
| Micro | $15.00 | $300 | Basic |
| Starter | $12.00 | $600 | Country targeting |
| Advanced | $10.00 | $1,500 | City targeting |
| Premium | $8.00 | $6,000 | ASN targeting |
| Enterprise | Custom | $15,000+ | All features |

**Mobile Proxies:**

| Plan | Price/GB | Monthly Min | Features |
|------|----------|-------------|----------|
| Starter | $30.00 | $500 | Country targeting |
| Advanced | $25.00 | $2,000 | Carrier targeting |
| Enterprise | Custom | $10,000+ | All features |

### 4.4 API Integration

**Authentication:**

```typescript
// Oxylabs uses username:password authentication
const proxyUrl = `http://${username}:${password}@pr.oxylabs.io:7777`;
```

**Proxy Configuration:**

```typescript
// src/proxy/providers/oxylabs.ts

import { ProxyProvider, ProxyConfig, ProxyTier } from '../types';

export interface OxylabsConfig {
  username: string;
  password: string;
}

export class OxylabsProvider implements ProxyProvider {
  private config: OxylabsConfig;
  
  private endpoints = {
    datacenter: 'dc.pr.oxylabs.io',
    residential: 'pr.oxylabs.io',
    mobile: 'mobile.oxylabs.io'
  };
  
  private ports = {
    datacenter: 10000,
    residential: 7777,
    mobile: 7778
  };

  constructor(config: OxylabsConfig) {
    this.config = config;
  }

  getProxy(options: {
    tier: ProxyTier;
    country?: string;
    city?: string;
    sessionId?: string;
  }): ProxyConfig {
    const host = this.getEndpoint(options.tier);
    const port = this.getPort(options.tier);
    const username = this.buildUsername(options);

    return {
      host,
      port,
      username,
      password: this.config.password,
      protocol: 'http'
    };
  }

  private getEndpoint(tier: ProxyTier): string {
    return this.endpoints[tier] || this.endpoints.datacenter;
  }

  private getPort(tier: ProxyTier): number {
    return this.ports[tier] || this.ports.datacenter;
  }

  private buildUsername(options: {
    country?: string;
    city?: string;
    sessionId?: string;
  }): string {
    let username = `customer-${this.config.username}`;

    if (options.country) {
      username += `-cc-${options.country.toUpperCase()}`;
    }

    if (options.city) {
      username += `-city-${options.city}`;
    }

    if (options.sessionId) {
      username += `-sessid-${options.sessionId}`;
    }

    return username;
  }

  async getStats(): Promise<{
    bandwidthUsed: number;
    bandwidthLimit: number;
  }> {
    const response = await fetch(
      'https://api.oxylabs.io/v1/stats',
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
        }
      }
    );
    return response.json();
  }
}
```

**Web Scraper API:**

```typescript
// For complex sites, use Web Scraper API

async function scrapeWithOxylabsAPI(url: string): Promise<any> {
  const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString('base64')}`
    },
    body: JSON.stringify({
      source: 'universal',
      url: url,
      geo_location: 'United States',
      render: 'html',
      browser_instructions: [
        { type: 'wait', wait_time_s: 2 },
        { type: 'scroll', x: 0, y: 500 }
      ]
    })
  });

  const data = await response.json();
  return data.results[0].content;
}
```

**E-commerce Specific:**

```typescript
// Oxylabs has specialized e-commerce scraping

async function scrapeAmazon(asin: string): Promise<any> {
  const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString('base64')}`
    },
    body: JSON.stringify({
      source: 'amazon_product',
      domain: 'com',
      query: asin,
      parse: true
    })
  });

  return response.json();
}
```

---

## 5. Smartproxy

### 5.1 Overview

Smartproxy offers competitive pricing, making it ideal for high-volume, cost-conscious scraping operations.

| Attribute | Value |
|-----------|-------|
| Company | Smartproxy |
| Founded | 2018 |
| Headquarters | Lithuania |
| Website | https://smartproxy.com |
| Network Size | 55M+ residential IPs |
| Countries | 195+ |

### 5.2 Products

| Product | Description | Pricing Model |
|---------|-------------|---------------|
| Datacenter Proxies | Shared datacenter IPs | Per GB or request |
| Residential Proxies | Rotating residential IPs | Per GB |
| Mobile Proxies | Real mobile device IPs | Per GB |
| ISP Proxies | Static residential IPs | Per IP/month |
| Web Scraping API | Managed scraping | Per request |

### 5.3 Pricing Details

**Datacenter Proxies:**

| Plan | Price | Included | Per Extra GB |
|------|-------|----------|--------------|
| Micro | $50/mo | 62.5GB | $0.80 |
| Starter | $100/mo | 166GB | $0.60 |
| Regular | $400/mo | 1,000GB | $0.40 |
| Advanced | $1,000/mo | 3,333GB | $0.30 |

**Residential Proxies:**

| Plan | Price | GB Included | Per Extra GB |
|------|-------|-------------|--------------|
| Micro | $75/mo | 5GB | $12.50 |
| Starter | $200/mo | 20GB | $10.00 |
| Regular | $400/mo | 50GB | $8.00 |
| Advanced | $1,000/mo | 166GB | $6.00 |

**Mobile Proxies:**

| Plan | Price | GB Included | Per Extra GB |
|------|-------|-------------|--------------|
| Starter | $500/mo | 20GB | $25.00 |
| Regular | $1,000/mo | 50GB | $20.00 |
| Advanced | $2,500/mo | 166GB | $15.00 |

### 5.4 API Integration

```typescript
// src/proxy/providers/smartproxy.ts

import { ProxyProvider, ProxyConfig, ProxyTier } from '../types';

export interface SmartproxyConfig {
  username: string;
  password: string;
}

export class SmartproxyProvider implements ProxyProvider {
  private config: SmartproxyConfig;
  
  private endpoints = {
    datacenter: 'dc.smartproxy.com',
    residential: 'gate.smartproxy.com',
    mobile: 'mobile.smartproxy.com'
  };
  
  private ports = {
    datacenter: 10000,
    residential: 7000,
    mobile: 7777
  };

  constructor(config: SmartproxyConfig) {
    this.config = config;
  }

  getProxy(options: {
    tier: ProxyTier;
    country?: string;
    sessionId?: string;
  }): ProxyConfig {
    const host = this.endpoints[options.tier] || this.endpoints.datacenter;
    const port = this.getPort(options.tier, options.country);
    const username = this.buildUsername(options);

    return {
      host,
      port,
      username,
      password: this.config.password,
      protocol: 'http'
    };
  }

  private getPort(tier: ProxyTier, country?: string): number {
    // Smartproxy uses port-based country selection for some plans
    if (tier === 'residential' && country) {
      const countryPorts: Record<string, number> = {
        'US': 10001,
        'GB': 10002,
        'DE': 10003,
        'FR': 10004,
        // Add more as needed
      };
      return countryPorts[country.toUpperCase()] || this.ports.residential;
    }
    return this.ports[tier];
  }

  private buildUsername(options: {
    country?: string;
    sessionId?: string;
  }): string {
    let username = this.config.username;

    if (options.country) {
      username += `-country-${options.country.toLowerCase()}`;
    }

    if (options.sessionId) {
      username += `-session-${options.sessionId}`;
    }

    return username;
  }
}
```

**Sticky Sessions:**

```typescript
// Smartproxy sticky session example

async function scrapeWithStickySession(urls: string[]): Promise<string[]> {
  const provider = new SmartproxyProvider({
    username: process.env.SMARTPROXY_USERNAME!,
    password: process.env.SMARTPROXY_PASSWORD!
  });

  // Same session for all requests = same IP
  const sessionId = `sticky_${Date.now()}`;
  const proxy = provider.getProxy({
    tier: 'residential',
    country: 'US',
    sessionId
  });

  const results: string[] = [];

  for (const url of urls) {
    const response = await impit(url, {
      impersonate: 'chrome120',
      proxy: {
        server: `http://${proxy.host}:${proxy.port}`,
        username: proxy.username,
        password: proxy.password
      }
    });
    results.push(await response.text());
  }

  return results;
}
```

---

## 6. Additional Providers

### 6.1 IPRoyal

Budget-friendly option for datacenter and residential proxies.

| Attribute | Value |
|-----------|-------|
| Website | https://iproyal.com |
| Residential IPs | 32M+ |
| Residential Price | $7/GB |
| Mobile Price | $15/GB |

### 6.2 SOAX

Strong mobile proxy network with carrier targeting.

| Attribute | Value |
|-----------|-------|
| Website | https://soax.com |
| Mobile IPs | 8.5M+ |
| Residential Price | $6.60/GB |
| Mobile Price | $12/GB |

### 6.3 NetNut

ISP proxy specialist with static residential IPs.

| Attribute | Value |
|-----------|-------|
| Website | https://netnut.io |
| ISP Proxies | 1M+ |
| Residential Price | $15/GB |
| ISP Price | $6/IP/month |

### 6.4 Provider Fallback Order

```typescript
// src/proxy/provider-manager.ts

export const PROVIDER_PRIORITY: Record<ProxyTier, string[]> = {
  datacenter: ['smartproxy', 'brightdata', 'oxylabs'],
  residential: ['brightdata', 'oxylabs', 'smartproxy'],
  mobile: ['oxylabs', 'brightdata', 'smartproxy']
};

export class ProviderManager {
  private providers: Map<string, ProxyProvider> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  async getProxy(tier: ProxyTier, options: ProxyOptions): Promise<ProxyConfig> {
    const providerOrder = PROVIDER_PRIORITY[tier];

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName);
      const breaker = this.circuitBreakers.get(providerName);

      if (breaker?.isOpen()) {
        continue;
      }

      try {
        const proxy = provider.getProxy({ tier, ...options });
        return proxy;
      } catch (error) {
        breaker?.recordFailure();
        continue;
      }
    }

    throw new Error(`No available provider for tier: ${tier}`);
  }
}
```

---

## 7. Integration Architecture

### 7.1 Multi-Provider Architecture

```
+------------------------------------------------------------------+
|                    PROXY MANAGEMENT LAYER                         |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                    PROXY ROUTER                           |    |
|  |                                                           |    |
|  |  Request                                                  |    |
|  |    |                                                      |    |
|  |    v                                                      |    |
|  |  +----------------+    +----------------+                 |    |
|  |  | Tier Selector  |--->| Provider       |                 |    |
|  |  | (Cost/Success) |    | Selector       |                 |    |
|  |  +----------------+    +-------+--------+                 |    |
|  |                                |                          |    |
|  +--------------------------------|---------------------------    |
|                                   |                               |
|         +----------+--------------+--------------+                |
|         |          |              |              |                |
|         v          v              v              v                |
|  +----------+ +----------+ +-----------+ +------------+           |
|  |  Bright  | | Oxylabs  | |Smartproxy | | Additional |           |
|  |   Data   | |          | |           | | Providers  |           |
|  +-----+----+ +-----+----+ +-----+-----+ +-----+------+           |
|        |            |            |             |                  |
|        +------------+------------+-------------+                  |
|                           |                                       |
|                           v                                       |
|  +----------------------------------------------------------+    |
|  |                  HEALTH MONITOR                           |    |
|  |  - Success rate tracking per provider/tier                |    |
|  |  - Latency monitoring                                     |    |
|  |  - Cost tracking                                          |    |
|  |  - Circuit breaker status                                 |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.2 Unified Provider Interface

```typescript
// src/proxy/types.ts

export type ProxyTier = 'datacenter' | 'residential' | 'mobile';
export type ProxyProtocol = 'http' | 'https' | 'socks5';

export interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: ProxyProtocol;
}

export interface ProxyOptions {
  tier?: ProxyTier;
  country?: string;
  city?: string;
  sessionId?: string;
  asn?: number;
  carrier?: string;
}

export interface ProxyProvider {
  name: string;
  
  getProxy(options: ProxyOptions): ProxyConfig;
  
  getStats(): Promise<{
    bandwidthUsed: number;
    bandwidthLimit: number;
    requestCount?: number;
  }>;
  
  testConnection(): Promise<boolean>;
}

export interface ProxyResult {
  provider: string;
  tier: ProxyTier;
  country?: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}
```

### 7.3 Provider Factory

```typescript
// src/proxy/provider-factory.ts

import { BrightDataProvider } from './providers/bright-data';
import { OxylabsProvider } from './providers/oxylabs';
import { SmartproxyProvider } from './providers/smartproxy';
import { ProxyProvider } from './types';

export function createProviders(): Map<string, ProxyProvider> {
  const providers = new Map<string, ProxyProvider>();

  // Initialize Bright Data
  if (process.env.BRIGHT_DATA_CUSTOMER_ID) {
    providers.set('brightdata', new BrightDataProvider({
      customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
      zonePassword: process.env.BRIGHT_DATA_ZONE_PASSWORD!,
      zones: {
        datacenter: process.env.BRIGHT_DATA_DC_ZONE || 'dc_zone1',
        residential: process.env.BRIGHT_DATA_RES_ZONE || 'res_zone1',
        mobile: process.env.BRIGHT_DATA_MOBILE_ZONE || 'mobile_zone1'
      }
    }));
  }

  // Initialize Oxylabs
  if (process.env.OXYLABS_USERNAME) {
    providers.set('oxylabs', new OxylabsProvider({
      username: process.env.OXYLABS_USERNAME,
      password: process.env.OXYLABS_PASSWORD!
    }));
  }

  // Initialize Smartproxy
  if (process.env.SMARTPROXY_USERNAME) {
    providers.set('smartproxy', new SmartproxyProvider({
      username: process.env.SMARTPROXY_USERNAME,
      password: process.env.SMARTPROXY_PASSWORD!
    }));
  }

  return providers;
}
```

### 7.4 Health Monitoring

```typescript
// src/proxy/health-monitor.ts

import { Gauge, Counter, Histogram } from 'prom-client';

export class ProxyHealthMonitor {
  private successRate = new Gauge({
    name: 'proxy_success_rate',
    help: 'Proxy success rate by provider and tier',
    labelNames: ['provider', 'tier', 'country']
  });

  private latency = new Histogram({
    name: 'proxy_request_duration_seconds',
    help: 'Proxy request duration',
    labelNames: ['provider', 'tier'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  });

  private cost = new Counter({
    name: 'proxy_cost_cents',
    help: 'Proxy usage cost in cents',
    labelNames: ['provider', 'tier']
  });

  private failures = new Counter({
    name: 'proxy_failures_total',
    help: 'Total proxy failures',
    labelNames: ['provider', 'tier', 'error_type']
  });

  recordSuccess(provider: string, tier: string, latencyMs: number): void {
    this.latency.labels(provider, tier).observe(latencyMs / 1000);
    this.updateSuccessRate(provider, tier, true);
  }

  recordFailure(provider: string, tier: string, errorType: string): void {
    this.failures.labels(provider, tier, errorType).inc();
    this.updateSuccessRate(provider, tier, false);
  }

  recordCost(provider: string, tier: string, bytes: number): void {
    const costPerGb = this.getCostPerGb(provider, tier);
    const costCents = (bytes / 1_000_000_000) * costPerGb * 100;
    this.cost.labels(provider, tier).inc(costCents);
  }

  private getCostPerGb(provider: string, tier: string): number {
    const rates: Record<string, Record<string, number>> = {
      brightdata: { datacenter: 0.60, residential: 8.40, mobile: 30.00 },
      oxylabs: { datacenter: 0.60, residential: 10.00, mobile: 25.00 },
      smartproxy: { datacenter: 0.80, residential: 7.00, mobile: 20.00 }
    };
    return rates[provider]?.[tier] || 10.00;
  }

  private updateSuccessRate(provider: string, tier: string, success: boolean): void {
    // Implement sliding window success rate calculation
  }
}
```

---

## 8. Cost Optimization

### 8.1 Cost Comparison (1M Requests)

| Scenario | Bright Data | Oxylabs | Smartproxy |
|----------|-------------|---------|------------|
| 100% Datacenter (10GB) | $6.00 | $6.00 | $8.00 |
| 100% Residential (100GB) | $840.00 | $1,000.00 | $700.00 |
| 100% Mobile (200GB) | $6,000.00 | $5,000.00 | $4,000.00 |
| Mixed (70/25/5) | $325.00 | $375.00 | $280.00 |

### 8.2 Optimization Strategies

**1. Start Low, Escalate:**

```typescript
// Always try cheapest tier first
async function optimizedScrape(url: string): Promise<ScrapeResult> {
  const tiers: ProxyTier[] = ['datacenter', 'residential', 'mobile'];
  
  for (const tier of tiers) {
    try {
      const result = await scrapeWithTier(url, tier);
      if (result.success) {
        return result;
      }
    } catch (error) {
      // Try next tier
    }
  }
  
  throw new Error('All tiers exhausted');
}
```

**2. Cache Optimal Tier:**

```typescript
// Remember which tier works for each domain
class TierCache {
  private cache: Map<string, { tier: ProxyTier; successRate: number }> = new Map();
  
  getRecommendedTier(domain: string): ProxyTier {
    const cached = this.cache.get(domain);
    if (cached && cached.successRate > 0.9) {
      return cached.tier;
    }
    return 'datacenter'; // Default to cheapest
  }
  
  recordResult(domain: string, tier: ProxyTier, success: boolean): void {
    // Update moving average success rate
  }
}
```

**3. Provider Arbitrage:**

```typescript
// Route to cheapest provider that works
function selectProvider(tier: ProxyTier, successRates: Map<string, number>): string {
  const providers = [
    { name: 'smartproxy', cost: { residential: 7.00, mobile: 20.00 } },
    { name: 'oxylabs', cost: { residential: 10.00, mobile: 25.00 } },
    { name: 'brightdata', cost: { residential: 8.40, mobile: 30.00 } }
  ];
  
  // Filter by acceptable success rate
  const viable = providers.filter(p => 
    (successRates.get(p.name) || 0) > 0.85
  );
  
  // Sort by cost
  viable.sort((a, b) => a.cost[tier] - b.cost[tier]);
  
  return viable[0]?.name || 'brightdata'; // Default to most reliable
}
```

### 8.3 Monthly Cost Projections

**At 100K pages/day (70% DC, 25% Residential, 5% Mobile):**

| Component | Usage | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| Datacenter | 30GB | $0.60/GB | $18 |
| Residential | 100GB | $7.00/GB | $700 |
| Mobile | 40GB | $20.00/GB | $800 |
| **Total** | | | **$1,518** |

**At 1M pages/day (70% DC, 25% Residential, 5% Mobile):**

| Component | Usage | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| Datacenter | 300GB | $0.50/GB | $150 |
| Residential | 1TB | $6.00/GB | $6,000 |
| Mobile | 400GB | $15.00/GB | $6,000 |
| **Total** | | | **$12,150** |

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Engineering Team | Initial document |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| Product Manager | | | |

### Distribution

| Role | Access Level |
|------|--------------|
| Engineering Team | Full |
| Operations Team | Full |
| Finance Team | Summary |
