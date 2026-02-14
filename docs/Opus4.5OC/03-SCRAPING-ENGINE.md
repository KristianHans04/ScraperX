# Scrapifie Scraping Engine
## Core Engine Architecture and Anti-Detection Systems

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Classification:** Internal - Technical Documentation

---

## Table of Contents

1. [Engine Overview](#1-engine-overview)
2. [Multi-Engine Strategy](#2-multi-engine-strategy)
3. [HTTP Engine (impit)](#3-http-engine-impit)
4. [Browser Engine (Playwright)](#4-browser-engine-playwright)
5. [Stealth Engine (Camoufox)](#5-stealth-engine-camoufox)
6. [Anti-Detection Pipeline](#6-anti-detection-pipeline)
7. [Fingerprint Management](#7-fingerprint-management)
8. [Proxy Integration](#8-proxy-integration)
9. [CAPTCHA Handling](#9-captcha-handling)
10. [Retry and Escalation Logic](#10-retry-and-escalation-logic)

---

## 1. Engine Overview

### 1.1 Core Responsibilities

The scraping engine is responsible for:

1. Executing HTTP requests and browser automation
2. Managing anti-detection measures across all request types
3. Handling proxy rotation and session persistence
4. Detecting and responding to protection systems
5. Extracting content and structured data
6. Managing resource pools (browsers, connections, sessions)

### 1.2 Engine Selection Criteria

The engine selection process determines which scraping method to use based on multiple factors:

```
+------------------------------------------------------------------+
|                    ENGINE SELECTION FLOW                          |
+------------------------------------------------------------------+
|                                                                   |
|  Request Received                                                 |
|       |                                                           |
|       v                                                           |
|  +----+----+                                                      |
|  | Options |                                                      |
|  | Check   |                                                      |
|  +----+----+                                                      |
|       |                                                           |
|       +---> render_js = true? ---> Browser Engine                 |
|       |                                                           |
|       +---> stealth = true? ---> Stealth Engine                   |
|       |                                                           |
|       v                                                           |
|  +----+----------+                                                |
|  | Domain Cache  |                                                |
|  | Check         |                                                |
|  +----+----------+                                                |
|       |                                                           |
|       +---> Known JS required? ---> Browser Engine                |
|       |                                                           |
|       +---> Known protected? ---> Stealth Engine                  |
|       |                                                           |
|       v                                                           |
|  HTTP Engine (Default)                                            |
|                                                                   |
+------------------------------------------------------------------+
```

### 1.3 Engine Capabilities Matrix

| Capability | HTTP Engine | Browser Engine | Stealth Engine |
|------------|-------------|----------------|----------------|
| Static HTML | Yes | Yes | Yes |
| JavaScript Execution | No | Yes | Yes |
| Cookie Handling | Yes | Yes | Yes |
| Screenshot | No | Yes | Yes |
| TLS Fingerprint Control | Yes | Limited | Native Firefox |
| Resource Usage | Low | High | Very High |
| Speed | Fast | Medium | Slow |
| Anti-Detection | Good | Good | Excellent |
| Cloudflare Bypass | Partial | Good | Excellent |
| Akamai Bypass | Partial | Partial | Good |
| Kasada Bypass | No | No | Partial |

---

## 2. Multi-Engine Strategy

### 2.1 Tiered Approach

The platform employs a tiered approach to maximize success rate while minimizing cost:

**Tier 1: HTTP Engine (impit)**
- Used for: Static pages, APIs, simple sites
- Cost: 1 credit
- Speed: Fast (200-500ms typical)
- Success rate: High on unprotected sites

**Tier 2: Browser Engine (Playwright)**
- Used for: JavaScript-heavy sites, SPAs, medium protection
- Cost: 5 credits
- Speed: Medium (2-10 seconds typical)
- Success rate: High on most sites

**Tier 3: Stealth Engine (Camoufox)**
- Used for: Heavily protected sites (Akamai, PerimeterX, Kasada)
- Cost: 5 credits + mobile proxy (10 credits)
- Speed: Slow (5-20 seconds typical)
- Success rate: Good on hardest sites

### 2.2 Automatic Escalation

```typescript
interface EscalationConfig {
  // Escalation triggers
  triggers: {
    httpStatusCodes: number[];      // [403, 503]
    contentPatterns: string[];      // ['cf-browser-verification', 'captcha']
    responseTimeThreshold: number;  // Unusually fast = blocked
  };
  
  // Escalation path
  path: EngineType[];  // ['http', 'browser', 'stealth']
  
  // Per-tier attempts
  attemptsPerTier: number;  // 2
  
  // Escalation delay
  delayBetweenTiers: number;  // 1000ms
}

const defaultEscalationConfig: EscalationConfig = {
  triggers: {
    httpStatusCodes: [403, 429, 503, 520, 521, 522, 523, 524],
    contentPatterns: [
      'cf-browser-verification',
      'checking your browser',
      'please wait while we verify',
      'access denied',
      'captcha',
      'are you a robot',
      'unusual traffic'
    ],
    responseTimeThreshold: 50  // Response under 50ms often indicates block
  },
  path: ['http', 'browser', 'stealth'],
  attemptsPerTier: 2,
  delayBetweenTiers: 1000
};
```

### 2.3 Domain Learning

The system learns optimal strategies per domain:

```typescript
interface DomainProfile {
  domain: string;
  
  // Historical data
  attempts: {
    http: { success: number; fail: number; avgTime: number };
    browser: { success: number; fail: number; avgTime: number };
    stealth: { success: number; fail: number; avgTime: number };
  };
  
  // Derived optimal strategy
  optimalEngine: EngineType;
  optimalProxyTier: ProxyTier;
  requiresJs: boolean;
  
  // Protection detection
  detectedProtection: ProtectionType | null;
  
  // Timing
  lastUpdated: Date;
  ttl: number;  // Cache TTL in seconds
}

// Storage in Redis
const domainProfileKey = (domain: string) => `domain:profile:${domain}`;
```

---

## 3. HTTP Engine (impit)

### 3.1 Overview

The HTTP engine uses impit, a high-performance HTTP client built on Rust's reqwest library with browser TLS fingerprint impersonation.

### 3.2 Supported Browser Impersonations

| Browser | Versions | TLS Fingerprint | HTTP/2 Support |
|---------|----------|-----------------|----------------|
| Chrome | 99-124 | Yes | Yes |
| Firefox | 109-120 | Yes | Yes |
| Safari | 15.3-17.2 | Yes | Yes |
| Edge | 99-101 | Yes | Yes |

### 3.3 Request Configuration

```typescript
interface HttpEngineConfig {
  // Browser impersonation
  impersonate: 'chrome120' | 'firefox120' | 'safari17_2' | string;
  
  // Connection settings
  timeout: number;              // Request timeout in ms
  maxRedirects: number;         // Maximum redirects to follow
  followRedirects: boolean;     // Whether to follow redirects
  
  // TLS settings
  http2: boolean;               // Enable HTTP/2
  http3: boolean;               // Enable HTTP/3 (experimental)
  ignoreTlsErrors: boolean;     // Skip certificate verification
  
  // Proxy settings
  proxy: {
    url: string;
    username?: string;
    password?: string;
  } | null;
  
  // Headers
  headers: Record<string, string>;
  
  // Cookies
  cookies: Cookie[];
}
```

### 3.4 Implementation

```typescript
import { Impit } from 'impit';

class HttpEngine implements ScrapingEngine {
  private clients: Map<string, Impit> = new Map();
  
  async scrape(request: ScrapeRequest): Promise<ScrapeResult> {
    const config = this.buildConfig(request);
    const client = await this.getOrCreateClient(config);
    
    // Build headers with fingerprint consistency
    const headers = await this.buildHeaders(request, config);
    
    try {
      const response = await client.fetch(request.url, {
        method: 'GET',
        headers,
        redirect: config.followRedirects ? 'follow' : 'manual',
      });
      
      const content = await response.text();
      
      // Check for block indicators
      if (this.isBlocked(response, content)) {
        throw new BlockedError('Request blocked by protection system');
      }
      
      return {
        success: true,
        statusCode: response.status,
        content,
        headers: Object.fromEntries(response.headers.entries()),
        cookies: this.parseCookies(response.headers.get('set-cookie')),
      };
    } catch (error) {
      return this.handleError(error, request);
    }
  }
  
  private async buildHeaders(
    request: ScrapeRequest,
    config: HttpEngineConfig
  ): Promise<Record<string, string>> {
    // Get fingerprint-consistent headers
    const fingerprint = await this.fingerprintManager.getFingerprint({
      browser: config.impersonate,
      locale: request.options.country || 'US',
    });
    
    return {
      'User-Agent': fingerprint.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': fingerprint.acceptLanguage,
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': fingerprint.secChUa,
      'Sec-Ch-Ua-Mobile': fingerprint.secChUaMobile,
      'Sec-Ch-Ua-Platform': fingerprint.secChUaPlatform,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      ...request.options.headers,
    };
  }
  
  private isBlocked(response: Response, content: string): boolean {
    // Status code check
    if ([403, 429, 503].includes(response.status)) {
      return true;
    }
    
    // Content pattern check
    const blockPatterns = [
      /cf-browser-verification/i,
      /checking your browser/i,
      /access denied/i,
      /captcha/i,
      /unusual traffic/i,
    ];
    
    return blockPatterns.some(pattern => pattern.test(content));
  }
}
```

---

## 4. Browser Engine (Playwright)

### 4.1 Overview

The browser engine uses Playwright for full browser automation with anti-detection measures.

### 4.2 Browser Pool Management

```typescript
interface BrowserPoolConfig {
  // Pool sizing
  minInstances: number;           // Minimum warm browsers
  maxInstances: number;           // Maximum concurrent browsers
  
  // Instance lifecycle
  maxPagesPerBrowser: number;     // Recycle after N pages
  browserIdleTimeoutMs: number;   // Close idle browsers
  pageIdleTimeoutMs: number;      // Close idle pages
  
  // Launch options
  launchOptions: {
    headless: boolean;
    args: string[];
    ignoreDefaultArgs: string[];
  };
  
  // Health monitoring
  healthCheckIntervalMs: number;
  maxMemoryPerBrowserMb: number;
}

const defaultBrowserPoolConfig: BrowserPoolConfig = {
  minInstances: 2,
  maxInstances: 10,
  maxPagesPerBrowser: 20,
  browserIdleTimeoutMs: 60000,
  pageIdleTimeoutMs: 30000,
  launchOptions: {
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  },
  healthCheckIntervalMs: 30000,
  maxMemoryPerBrowserMb: 500,
};
```

### 4.3 Stealth Configuration

```typescript
interface StealthConfig {
  // Core evasions
  hideWebdriver: boolean;
  hideAutomation: boolean;
  
  // Navigator patches
  patchNavigator: {
    webdriver: boolean;
    plugins: boolean;
    languages: boolean;
    platform: boolean;
    hardwareConcurrency: boolean;
    deviceMemory: boolean;
  };
  
  // Chrome-specific
  patchChrome: {
    runtime: boolean;
    loadTimes: boolean;
    csi: boolean;
    app: boolean;
  };
  
  // Fingerprint injection
  injectFingerprint: boolean;
  fingerprint: BrowserFingerprint | null;
  
  // WebGL
  webglVendor: string | null;
  webglRenderer: string | null;
  
  // Canvas
  canvasNoise: boolean;
  canvasNoiseSeed: string | null;
}
```

### 4.4 Implementation

```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { FingerprintInjector, newInjectedContext } from 'fingerprint-injector';

class BrowserEngine implements ScrapingEngine {
  private browserPool: BrowserPool;
  private fingerprintManager: FingerprintManager;
  
  async scrape(request: ScrapeRequest): Promise<ScrapeResult> {
    const browser = await this.browserPool.acquire();
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    
    try {
      // Create context with fingerprint injection
      const fingerprint = await this.fingerprintManager.getFingerprint({
        browser: 'chrome',
        device: 'desktop',
        locale: request.options.country || 'US',
      });
      
      context = await newInjectedContext(browser, {
        fingerprintOptions: {
          browsers: ['chrome'],
          devices: ['desktop'],
          operatingSystems: ['windows'],
        },
        proxyUrl: request.proxyConfig?.url,
      });
      
      // Apply additional stealth measures
      await this.applyStealthMeasures(context);
      
      // Create page
      page = await context.newPage();
      
      // Set cookies if provided
      if (request.options.cookies?.length) {
        await context.addCookies(request.options.cookies);
      }
      
      // Navigate with wait conditions
      const response = await page.goto(request.url, {
        waitUntil: 'domcontentloaded',
        timeout: request.options.timeout || 30000,
      });
      
      // Additional wait conditions
      if (request.options.wait_for) {
        await page.waitForSelector(request.options.wait_for, {
          timeout: 10000,
        });
      }
      
      if (request.options.wait_ms) {
        await page.waitForTimeout(request.options.wait_ms);
      }
      
      // Execute scenario if provided
      if (request.options.scenario) {
        await this.executeScenario(page, request.options.scenario);
      }
      
      // Check for block indicators
      const content = await page.content();
      if (await this.isBlocked(page, content)) {
        throw new BlockedError('Request blocked by protection system');
      }
      
      // Capture screenshot if requested
      let screenshotBuffer: Buffer | null = null;
      if (request.options.screenshot) {
        screenshotBuffer = await page.screenshot({
          fullPage: request.options.screenshot_options?.full_page || false,
          type: request.options.screenshot_options?.format || 'png',
        });
      }
      
      // Extract data if rules provided
      let extracted: Record<string, any> | null = null;
      if (request.options.extract) {
        extracted = await this.extractData(page, request.options.extract);
      }
      
      // Get cookies
      const cookies = await context.cookies();
      
      return {
        success: true,
        statusCode: response?.status() || 200,
        content,
        cookies,
        extracted,
        screenshot: screenshotBuffer,
      };
    } catch (error) {
      return this.handleError(error, request);
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      await this.browserPool.release(browser);
    }
  }
  
  private async applyStealthMeasures(context: BrowserContext): Promise<void> {
    // Add initialization script
    await context.addInitScript(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Fix plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Fix permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission } as PermissionStatus);
        }
        return originalQuery(parameters);
      };
    });
  }
  
  private async executeScenario(page: Page, scenario: Scenario): Promise<void> {
    for (const step of scenario.steps) {
      switch (step.action) {
        case 'wait_for':
          await page.waitForSelector(step.selector, { timeout: step.timeout });
          break;
        case 'wait':
          await page.waitForTimeout(step.duration);
          break;
        case 'click':
          await this.humanClick(page, step.selector);
          break;
        case 'fill':
          await this.humanType(page, step.selector, step.value);
          break;
        case 'scroll':
          await page.mouse.wheel(step.x || 0, step.y || 0);
          break;
        case 'screenshot':
          // Handled separately
          break;
        case 'evaluate':
          await page.evaluate(step.script);
          break;
      }
      
      // Random delay between actions for human-like behavior
      await page.waitForTimeout(this.humanDelay(200, 500));
    }
  }
  
  private async humanClick(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    
    const box = await element.boundingBox();
    if (!box) throw new Error(`Element not visible: ${selector}`);
    
    // Move to random position within element
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
    
    // Human-like mouse movement
    await this.humanMouseMove(page, targetX, targetY);
    
    // Click with slight delay
    await page.waitForTimeout(this.humanDelay(50, 150));
    await page.mouse.click(targetX, targetY);
  }
  
  private async humanMouseMove(page: Page, targetX: number, targetY: number): Promise<void> {
    const steps = 10 + Math.floor(Math.random() * 10);
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Bezier curve for natural movement
      const x = startX + (targetX - startX) * this.easeInOutQuad(progress);
      const y = startY + (targetY - startY) * this.easeInOutQuad(progress);
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(this.humanDelay(5, 15));
    }
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  private humanDelay(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }
  
  private async extractData(
    page: Page,
    rules: Record<string, string>
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    for (const [field, selector] of Object.entries(rules)) {
      // Check if it's an array selector
      const isArray = Array.isArray(selector);
      const actualSelector = isArray ? selector[0] : selector;
      
      // Check for attribute extraction
      const attrMatch = actualSelector.match(/(.+)@(\w+)$/);
      const cssSelector = attrMatch ? attrMatch[1] : actualSelector;
      const attribute = attrMatch ? attrMatch[2] : null;
      
      if (isArray) {
        // Extract multiple values
        const elements = await page.$$(cssSelector);
        result[field] = await Promise.all(
          elements.map(el => 
            attribute 
              ? el.getAttribute(attribute)
              : el.textContent()
          )
        );
      } else {
        // Extract single value
        const element = await page.$(cssSelector);
        if (element) {
          result[field] = attribute
            ? await element.getAttribute(attribute)
            : await element.textContent();
        } else {
          result[field] = null;
        }
      }
    }
    
    return result;
  }
}
```

---

## 5. Stealth Engine (Camoufox)

### 5.1 Overview

Camoufox is a patched Firefox browser specifically designed for anti-detection. It provides native Firefox TLS fingerprints and built-in stealth features.

### 5.2 Integration Architecture

Since Camoufox is Python-based, integration requires a bridge:

```
+------------------------------------------------------------------+
|                    STEALTH ENGINE ARCHITECTURE                    |
+------------------------------------------------------------------+
|                                                                   |
|  Node.js Worker                     Python Camoufox Service       |
|  +---------------------------+      +---------------------------+ |
|  |                           |      |                           | |
|  |  Job Processor            |      |  HTTP Server (FastAPI)    | |
|  |       |                   |      |       |                   | |
|  |       v                   |      |       v                   | |
|  |  Stealth Engine           | HTTP |  Camoufox Manager         | |
|  |  Adapter         <--------|----->|       |                   | |
|  |       |                   |      |       v                   | |
|  |       v                   |      |  Browser Pool             | |
|  |  Result Handler           |      |       |                   | |
|  |                           |      |       v                   | |
|  +---------------------------+      |  Camoufox Browser         | |
|                                     |                           | |
|                                     +---------------------------+ |
+------------------------------------------------------------------+
```

### 5.3 Python Service Implementation

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from camoufox.sync_api import Camoufox
from typing import Optional, Dict, List, Any
import asyncio
import uuid

app = FastAPI()

class ScrapeRequest(BaseModel):
    job_id: str
    url: str
    proxy_url: Optional[str] = None
    wait_for: Optional[str] = None
    wait_ms: Optional[int] = None
    screenshot: bool = False
    extract: Optional[Dict[str, str]] = None
    scenario: Optional[Dict[str, Any]] = None
    timeout: int = 30000

class ScrapeResponse(BaseModel):
    success: bool
    job_id: str
    status_code: Optional[int] = None
    content: Optional[str] = None
    cookies: Optional[List[Dict]] = None
    extracted: Optional[Dict[str, Any]] = None
    screenshot_base64: Optional[str] = None
    error: Optional[str] = None

class CamoufoxPool:
    def __init__(self, max_browsers: int = 5):
        self.max_browsers = max_browsers
        self.browsers = []
        self.lock = asyncio.Lock()
    
    async def acquire(self, proxy_url: Optional[str] = None):
        async with self.lock:
            if len(self.browsers) < self.max_browsers:
                browser = Camoufox(
                    headless=True,
                    humanize=True,
                    geoip=True,
                    proxy={"server": proxy_url} if proxy_url else None
                ).__enter__()
                self.browsers.append(browser)
                return browser
            # Reuse existing browser
            return self.browsers[0]
    
    async def release(self, browser):
        # Browser reuse logic
        pass

pool = CamoufoxPool()

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    try:
        browser = await pool.acquire(request.proxy_url)
        page = browser.new_page()
        
        try:
            # Navigate
            response = page.goto(request.url, timeout=request.timeout)
            
            # Wait conditions
            if request.wait_for:
                page.wait_for_selector(request.wait_for, timeout=10000)
            
            if request.wait_ms:
                page.wait_for_timeout(request.wait_ms)
            
            # Execute scenario
            if request.scenario:
                await execute_scenario(page, request.scenario)
            
            # Get content
            content = page.content()
            
            # Extract data
            extracted = None
            if request.extract:
                extracted = extract_data(page, request.extract)
            
            # Screenshot
            screenshot_base64 = None
            if request.screenshot:
                import base64
                screenshot_bytes = page.screenshot()
                screenshot_base64 = base64.b64encode(screenshot_bytes).decode()
            
            # Cookies
            cookies = page.context.cookies()
            
            return ScrapeResponse(
                success=True,
                job_id=request.job_id,
                status_code=response.status if response else 200,
                content=content,
                cookies=cookies,
                extracted=extracted,
                screenshot_base64=screenshot_base64
            )
        finally:
            page.close()
            await pool.release(browser)
    
    except Exception as e:
        return ScrapeResponse(
            success=False,
            job_id=request.job_id,
            error=str(e)
        )

def extract_data(page, rules: Dict[str, str]) -> Dict[str, Any]:
    result = {}
    for field, selector in rules.items():
        try:
            if selector.startswith('['):
                # Array selector
                actual_selector = selector[1:-1]
                elements = page.query_selector_all(actual_selector)
                result[field] = [el.text_content() for el in elements]
            else:
                element = page.query_selector(selector)
                result[field] = element.text_content() if element else None
        except:
            result[field] = None
    return result
```

### 5.4 Node.js Adapter

```typescript
import axios, { AxiosInstance } from 'axios';

interface CamoufoxServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

class StealthEngine implements ScrapingEngine {
  private client: AxiosInstance;
  
  constructor(config: CamoufoxServiceConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
    });
  }
  
  async scrape(request: ScrapeRequest): Promise<ScrapeResult> {
    const camoufoxRequest = {
      job_id: request.jobId,
      url: request.url,
      proxy_url: request.proxyConfig?.url,
      wait_for: request.options.wait_for,
      wait_ms: request.options.wait_ms,
      screenshot: request.options.screenshot,
      extract: request.options.extract,
      scenario: request.options.scenario,
      timeout: request.options.timeout || 30000,
    };
    
    try {
      const response = await this.client.post('/scrape', camoufoxRequest);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      return {
        success: true,
        statusCode: data.status_code,
        content: data.content,
        cookies: data.cookies,
        extracted: data.extracted,
        screenshot: data.screenshot_base64 
          ? Buffer.from(data.screenshot_base64, 'base64')
          : null,
      };
    } catch (error) {
      return this.handleError(error, request);
    }
  }
}
```

---

## 6. Anti-Detection Pipeline

### 6.1 Pipeline Architecture

```
+------------------------------------------------------------------+
|                    ANTI-DETECTION PIPELINE                        |
+------------------------------------------------------------------+
|                                                                   |
|  Request                                                          |
|     |                                                             |
|     v                                                             |
|  +------------------+                                             |
|  | 1. Fingerprint   |  Generate consistent browser fingerprint   |
|  |    Generation    |  based on proxy location and browser type  |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | 2. Header        |  Generate headers consistent with          |
|  |    Consistency   |  fingerprint (UA, Sec-CH-UA, etc.)         |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | 3. Proxy         |  Select appropriate proxy tier and         |
|  |    Selection     |  ensure geo-fingerprint consistency        |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | 4. TLS           |  Apply browser-specific TLS fingerprint    |
|  |    Fingerprint   |  (JA3/JA4+ matching)                       |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | 5. Browser       |  Inject fingerprint into browser context   |
|  |    Injection     |  (if using browser engine)                 |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | 6. Behavior      |  Apply human-like timing and mouse         |
|  |    Simulation    |  movement patterns                         |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  Request Execution                                                |
|                                                                   |
+------------------------------------------------------------------+
```

### 6.2 Pipeline Implementation

```typescript
interface PipelineContext {
  request: ScrapeRequest;
  fingerprint: BrowserFingerprint | null;
  headers: Record<string, string>;
  proxy: ProxyConfig | null;
  session: SessionState | null;
  engine: EngineType;
}

interface PipelineMiddleware {
  name: string;
  order: number;
  execute(ctx: PipelineContext): Promise<PipelineContext>;
}

class AntiDetectionPipeline {
  private middlewares: PipelineMiddleware[] = [];
  
  use(middleware: PipelineMiddleware): this {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.order - b.order);
    return this;
  }
  
  async execute(request: ScrapeRequest): Promise<PipelineContext> {
    let ctx: PipelineContext = {
      request,
      fingerprint: null,
      headers: {},
      proxy: null,
      session: null,
      engine: 'http',
    };
    
    for (const middleware of this.middlewares) {
      ctx = await middleware.execute(ctx);
    }
    
    return ctx;
  }
}

// Middleware implementations
const fingerprintMiddleware: PipelineMiddleware = {
  name: 'fingerprint',
  order: 10,
  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const generator = new FingerprintGenerator();
    
    ctx.fingerprint = generator.getFingerprint({
      browsers: [{ name: 'chrome', minVersion: 120 }],
      devices: ['desktop'],
      operatingSystems: ['windows', 'macos'],
      locales: [ctx.request.options.country || 'en-US'],
    });
    
    return ctx;
  }
};

const headerMiddleware: PipelineMiddleware = {
  name: 'headers',
  order: 20,
  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.fingerprint) return ctx;
    
    ctx.headers = {
      'User-Agent': ctx.fingerprint.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': ctx.fingerprint.navigator.language,
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': ctx.fingerprint.headers['sec-ch-ua'] || '',
      'Sec-Ch-Ua-Mobile': ctx.fingerprint.headers['sec-ch-ua-mobile'] || '?0',
      'Sec-Ch-Ua-Platform': ctx.fingerprint.headers['sec-ch-ua-platform'] || '',
    };
    
    return ctx;
  }
};

const proxyMiddleware: PipelineMiddleware = {
  name: 'proxy',
  order: 30,
  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const proxyManager = ProxyManager.getInstance();
    
    ctx.proxy = await proxyManager.getProxy({
      tier: ctx.request.options.premium_proxy ? 'residential' : 'datacenter',
      country: ctx.request.options.country,
      sessionId: ctx.request.options.session_id,
    });
    
    // Ensure fingerprint matches proxy geo
    if (ctx.fingerprint && ctx.proxy.country) {
      ctx.fingerprint = this.adjustFingerprintForGeo(
        ctx.fingerprint,
        ctx.proxy.country
      );
    }
    
    return ctx;
  }
};
```

---

## 7. Fingerprint Management

### 7.1 Fingerprint Components

```typescript
interface BrowserFingerprint {
  // User Agent
  userAgent: string;
  
  // Navigator properties
  navigator: {
    platform: string;
    language: string;
    languages: string[];
    hardwareConcurrency: number;
    deviceMemory: number;
    maxTouchPoints: number;
    vendor: string;
    appVersion: string;
  };
  
  // Screen properties
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelRatio: number;
  };
  
  // WebGL
  webgl: {
    vendor: string;
    renderer: string;
    version: string;
  };
  
  // Client hints
  headers: {
    'sec-ch-ua': string;
    'sec-ch-ua-mobile': string;
    'sec-ch-ua-platform': string;
    'sec-ch-ua-full-version-list'?: string;
  };
  
  // Canvas noise seed
  canvasNoiseSeed: string;
  
  // Audio noise seed
  audioNoiseSeed: string;
  
  // Timezone
  timezone: string;
  
  // Locale
  locale: string;
}
```

### 7.2 Fingerprint Generation

```typescript
import { FingerprintGenerator } from 'fingerprint-generator';

class FingerprintManager {
  private generator: FingerprintGenerator;
  private cache: Map<string, BrowserFingerprint> = new Map();
  
  constructor() {
    this.generator = new FingerprintGenerator();
  }
  
  async getFingerprint(options: {
    browser?: string;
    device?: string;
    locale?: string;
    sessionId?: string;
  }): Promise<BrowserFingerprint> {
    // Check cache for session-based fingerprints
    if (options.sessionId) {
      const cached = this.cache.get(options.sessionId);
      if (cached) return cached;
    }
    
    const fingerprint = this.generator.getFingerprint({
      browsers: [{ name: options.browser || 'chrome', minVersion: 120 }],
      devices: [options.device || 'desktop'],
      operatingSystems: ['windows', 'macos', 'linux'],
      locales: [options.locale || 'en-US'],
    });
    
    // Ensure consistency
    const consistentFingerprint = this.ensureConsistency(fingerprint);
    
    // Cache for session
    if (options.sessionId) {
      this.cache.set(options.sessionId, consistentFingerprint);
    }
    
    return consistentFingerprint;
  }
  
  private ensureConsistency(fingerprint: BrowserFingerprint): BrowserFingerprint {
    // Ensure platform matches user agent
    if (fingerprint.userAgent.includes('Windows')) {
      fingerprint.navigator.platform = 'Win32';
    } else if (fingerprint.userAgent.includes('Mac OS X')) {
      fingerprint.navigator.platform = 'MacIntel';
    } else if (fingerprint.userAgent.includes('Linux')) {
      fingerprint.navigator.platform = 'Linux x86_64';
    }
    
    // Ensure WebGL matches platform
    if (fingerprint.navigator.platform === 'Win32') {
      // Windows typically has NVIDIA/AMD/Intel
      fingerprint.webgl.renderer = fingerprint.webgl.renderer.includes('Intel')
        ? fingerprint.webgl.renderer
        : 'ANGLE (NVIDIA GeForce GTX 1060)';
    }
    
    // Ensure timezone matches locale
    const timezoneMap: Record<string, string> = {
      'en-US': 'America/New_York',
      'en-GB': 'Europe/London',
      'de-DE': 'Europe/Berlin',
      'fr-FR': 'Europe/Paris',
    };
    fingerprint.timezone = timezoneMap[fingerprint.locale] || 'America/New_York';
    
    return fingerprint;
  }
}
```

### 7.3 Fingerprint Injection

```typescript
import { FingerprintInjector } from 'fingerprint-injector';

class BrowserFingerprintInjector {
  private injector: FingerprintInjector;
  
  constructor() {
    this.injector = new FingerprintInjector();
  }
  
  async inject(
    context: BrowserContext,
    fingerprint: BrowserFingerprint
  ): Promise<void> {
    await this.injector.attachFingerprintToPlaywright(context, fingerprint);
    
    // Additional injections not covered by fingerprint-injector
    await context.addInitScript((fp: BrowserFingerprint) => {
      // Canvas noise injection
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const imageData = originalGetImageData.apply(this, args);
        // Apply deterministic noise based on seed
        const seed = fp.canvasNoiseSeed;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const noise = (seed.charCodeAt(i % seed.length) % 3) - 1;
          imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        }
        return imageData;
      };
      
      // WebGL vendor/renderer
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return fp.webgl.vendor;
        if (parameter === 37446) return fp.webgl.renderer;
        return originalGetParameter.call(this, parameter);
      };
    }, fingerprint);
  }
}
```

---

## 8. Proxy Integration

### 8.1 Proxy Provider Interface

```typescript
interface ProxyProvider {
  name: string;
  
  // Get proxy for request
  getProxy(options: {
    type: 'datacenter' | 'residential' | 'mobile';
    country?: string;
    city?: string;
    sessionId?: string;
  }): Promise<ProxyConfig>;
  
  // Check proxy health
  checkHealth(proxy: ProxyConfig): Promise<boolean>;
  
  // Get usage statistics
  getUsage(): Promise<ProxyUsage>;
}

interface ProxyConfig {
  id: string;
  url: string;
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  provider: string;
  type: 'datacenter' | 'residential' | 'mobile';
}

interface ProxyUsage {
  bytesUsed: number;
  bytesRemaining: number;
  requestsUsed: number;
  requestsRemaining: number;
}
```

### 8.2 Multi-Provider Manager

```typescript
class ProxyManager {
  private providers: Map<string, ProxyProvider> = new Map();
  private healthTracker: Map<string, ProxyHealth> = new Map();
  private domainPreferences: Map<string, ProxyPreference> = new Map();
  
  registerProvider(provider: ProxyProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  async getProxy(options: {
    tier: 'datacenter' | 'residential' | 'mobile';
    country?: string;
    domain?: string;
    sessionId?: string;
  }): Promise<ProxyConfig> {
    // Check domain preference
    if (options.domain) {
      const pref = this.domainPreferences.get(options.domain);
      if (pref && pref.successRate > 0.9) {
        options.tier = pref.tier;
      }
    }
    
    // Select provider based on load and health
    const provider = this.selectProvider(options.tier);
    
    // Get proxy from provider
    const proxy = await provider.getProxy({
      type: options.tier,
      country: options.country,
      sessionId: options.sessionId,
    });
    
    return proxy;
  }
  
  private selectProvider(tier: string): ProxyProvider {
    // Load balancing across providers
    const eligibleProviders = Array.from(this.providers.values())
      .filter(p => this.isProviderHealthy(p.name))
      .filter(p => this.hasCapacity(p.name, tier));
    
    if (eligibleProviders.length === 0) {
      throw new Error('No healthy proxy providers available');
    }
    
    // Round-robin with health weighting
    return eligibleProviders[Math.floor(Math.random() * eligibleProviders.length)];
  }
  
  recordSuccess(proxyId: string, domain: string, tier: string): void {
    const health = this.healthTracker.get(proxyId) || { success: 0, failure: 0 };
    health.success++;
    this.healthTracker.set(proxyId, health);
    
    // Update domain preference
    const pref = this.domainPreferences.get(domain) || { tier, success: 0, failure: 0 };
    pref.success++;
    pref.successRate = pref.success / (pref.success + pref.failure);
    this.domainPreferences.set(domain, pref);
  }
  
  recordFailure(proxyId: string, domain: string, tier: string): void {
    const health = this.healthTracker.get(proxyId) || { success: 0, failure: 0 };
    health.failure++;
    this.healthTracker.set(proxyId, health);
    
    // Update domain preference - may need to upgrade tier
    const pref = this.domainPreferences.get(domain) || { tier, success: 0, failure: 0 };
    pref.failure++;
    pref.successRate = pref.success / (pref.success + pref.failure);
    
    if (pref.successRate < 0.5 && tier !== 'mobile') {
      // Upgrade tier recommendation
      pref.tier = tier === 'datacenter' ? 'residential' : 'mobile';
    }
    
    this.domainPreferences.set(domain, pref);
  }
}
```

---

## 9. CAPTCHA Handling

### 9.1 CAPTCHA Detection

```typescript
interface CaptchaDetector {
  detect(page: Page | string): Promise<CaptchaInfo | null>;
}

interface CaptchaInfo {
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'cloudflare' | 'funcaptcha' | 'unknown';
  siteKey?: string;
  pageUrl: string;
  action?: string;  // For reCAPTCHA v3
}

class CaptchaDetectorImpl implements CaptchaDetector {
  async detect(pageOrContent: Page | string): Promise<CaptchaInfo | null> {
    const content = typeof pageOrContent === 'string'
      ? pageOrContent
      : await pageOrContent.content();
    
    // reCAPTCHA v2
    const recaptchaV2Match = content.match(/data-sitekey="([^"]+)"/);
    if (recaptchaV2Match && content.includes('g-recaptcha')) {
      return {
        type: 'recaptcha_v2',
        siteKey: recaptchaV2Match[1],
        pageUrl: typeof pageOrContent === 'string' ? '' : pageOrContent.url(),
      };
    }
    
    // reCAPTCHA v3
    const recaptchaV3Match = content.match(/grecaptcha\.execute\(['"]([^'"]+)['"]/);
    if (recaptchaV3Match) {
      return {
        type: 'recaptcha_v3',
        siteKey: recaptchaV3Match[1],
        pageUrl: typeof pageOrContent === 'string' ? '' : pageOrContent.url(),
      };
    }
    
    // hCaptcha
    const hcaptchaMatch = content.match(/data-sitekey="([^"]+)"[^>]*class="h-captcha"/);
    if (hcaptchaMatch) {
      return {
        type: 'hcaptcha',
        siteKey: hcaptchaMatch[1],
        pageUrl: typeof pageOrContent === 'string' ? '' : pageOrContent.url(),
      };
    }
    
    // Cloudflare Turnstile
    if (content.includes('challenges.cloudflare.com')) {
      const cfMatch = content.match(/data-sitekey="([^"]+)"/);
      return {
        type: 'cloudflare',
        siteKey: cfMatch?.[1],
        pageUrl: typeof pageOrContent === 'string' ? '' : pageOrContent.url(),
      };
    }
    
    return null;
  }
}
```

### 9.2 CAPTCHA Solving Integration

```typescript
interface CaptchaSolver {
  solve(captcha: CaptchaInfo): Promise<string>;
}

class TwoCaptchaSolver implements CaptchaSolver {
  private apiKey: string;
  private baseUrl = 'https://2captcha.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async solve(captcha: CaptchaInfo): Promise<string> {
    // Submit CAPTCHA
    const submitResponse = await axios.get(`${this.baseUrl}/in.php`, {
      params: {
        key: this.apiKey,
        method: this.getMethod(captcha.type),
        googlekey: captcha.siteKey,
        pageurl: captcha.pageUrl,
        json: 1,
      },
    });
    
    if (submitResponse.data.status !== 1) {
      throw new Error(`CAPTCHA submit failed: ${submitResponse.data.error_text}`);
    }
    
    const taskId = submitResponse.data.request;
    
    // Poll for result
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await this.delay(5000);
      
      const resultResponse = await axios.get(`${this.baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: 'get',
          id: taskId,
          json: 1,
        },
      });
      
      if (resultResponse.data.status === 1) {
        return resultResponse.data.request;
      }
      
      if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`CAPTCHA solve failed: ${resultResponse.data.request}`);
      }
    }
    
    throw new Error('CAPTCHA solve timeout');
  }
  
  private getMethod(type: string): string {
    switch (type) {
      case 'recaptcha_v2':
      case 'recaptcha_v3':
        return 'userrecaptcha';
      case 'hcaptcha':
        return 'hcaptcha';
      case 'cloudflare':
        return 'turnstile';
      default:
        throw new Error(`Unsupported CAPTCHA type: ${type}`);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 9.3 CAPTCHA Injection

```typescript
class CaptchaHandler {
  private detector: CaptchaDetector;
  private solver: CaptchaSolver;
  
  async handleIfPresent(page: Page): Promise<boolean> {
    const captcha = await this.detector.detect(page);
    
    if (!captcha) {
      return false;
    }
    
    // Solve CAPTCHA
    const token = await this.solver.solve(captcha);
    
    // Inject token based on type
    switch (captcha.type) {
      case 'recaptcha_v2':
      case 'recaptcha_v3':
        await page.evaluate((token) => {
          // Find the callback function and execute it
          const textarea = document.querySelector('#g-recaptcha-response') as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = token;
          }
          // Trigger callback if available
          if ((window as any).___grecaptcha_cfg?.clients) {
            const clients = (window as any).___grecaptcha_cfg.clients;
            for (const client of Object.values(clients)) {
              const callback = (client as any)?.callback;
              if (callback) {
                callback(token);
              }
            }
          }
        }, token);
        break;
      
      case 'hcaptcha':
        await page.evaluate((token) => {
          const textarea = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = token;
          }
          // Submit form
          const form = textarea?.closest('form');
          if (form) {
            form.submit();
          }
        }, token);
        break;
      
      case 'cloudflare':
        await page.evaluate((token) => {
          const input = document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement;
          if (input) {
            input.value = token;
          }
        }, token);
        break;
    }
    
    // Wait for navigation after CAPTCHA
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
    
    return true;
  }
}
```

---

## 10. Retry and Escalation Logic

### 10.1 Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  retryableErrors: [
    'TIMEOUT',
    'CONNECTION_REFUSED',
    'CONNECTION_RESET',
    'PROXY_ERROR',
    'BOT_DETECTED',
    'BLOCKED',
    'RATE_LIMITED',
  ],
};
```

### 10.2 Escalation Strategy

```typescript
interface EscalationStrategy {
  // Define escalation path
  path: Array<{
    engine: EngineType;
    proxyTier: ProxyTier;
  }>;
  
  // Escalation triggers
  triggers: {
    statusCodes: number[];
    errorCodes: string[];
    contentPatterns: RegExp[];
  };
}

const defaultEscalationStrategy: EscalationStrategy = {
  path: [
    { engine: 'http', proxyTier: 'datacenter' },
    { engine: 'http', proxyTier: 'residential' },
    { engine: 'browser', proxyTier: 'residential' },
    { engine: 'stealth', proxyTier: 'mobile' },
  ],
  triggers: {
    statusCodes: [403, 429, 503, 520, 521, 522, 523, 524],
    errorCodes: ['BLOCKED', 'BOT_DETECTED', 'CAPTCHA_REQUIRED'],
    contentPatterns: [
      /cf-browser-verification/i,
      /checking your browser/i,
      /please verify you are human/i,
      /access denied/i,
      /blocked/i,
    ],
  },
};
```

### 10.3 Retry Handler Implementation

```typescript
class RetryHandler {
  constructor(
    private config: RetryConfig,
    private escalation: EscalationStrategy
  ) {}
  
  async execute<T>(
    fn: (attempt: number, options: RetryOptions) => Promise<T>,
    initialOptions: RetryOptions
  ): Promise<T> {
    let currentPathIndex = 0;
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < this.config.maxAttempts * this.escalation.path.length) {
      const pathEntry = this.escalation.path[currentPathIndex];
      const options: RetryOptions = {
        ...initialOptions,
        engine: pathEntry.engine,
        proxyTier: pathEntry.proxyTier,
      };
      
      try {
        const result = await fn(attempt, options);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryable(error as Error)) {
          throw error;
        }
        
        // Check if we should escalate
        if (this.shouldEscalate(error as Error)) {
          currentPathIndex = Math.min(
            currentPathIndex + 1,
            this.escalation.path.length - 1
          );
        }
        
        // Calculate delay
        const delay = this.calculateDelay(attempt);
        await this.delay(delay);
        
        attempt++;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
  
  private isRetryable(error: Error): boolean {
    const errorCode = (error as any).code || error.message;
    return this.config.retryableErrors.some(code => 
      errorCode.includes(code)
    );
  }
  
  private shouldEscalate(error: Error): boolean {
    const errorCode = (error as any).code || '';
    const statusCode = (error as any).statusCode;
    
    if (statusCode && this.escalation.triggers.statusCodes.includes(statusCode)) {
      return true;
    }
    
    if (this.escalation.triggers.errorCodes.includes(errorCode)) {
      return true;
    }
    
    return false;
  }
  
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelayMs * 
      Math.pow(this.config.backoffMultiplier, attempt);
    
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    // Add jitter
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() - 0.5);
    
    return Math.floor(cappedDelay + jitter);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Senior Developer | | | |
| Security Engineer | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | | Initial document creation |
