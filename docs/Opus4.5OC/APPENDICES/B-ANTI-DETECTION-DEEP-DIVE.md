# Appendix B: Anti-Detection Deep Dive

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APP-B |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Engineering Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Bot Detection Mechanisms](#2-bot-detection-mechanisms)
3. [TLS Fingerprinting](#3-tls-fingerprinting)
4. [Browser Fingerprinting](#4-browser-fingerprinting)
5. [Behavioral Analysis](#5-behavioral-analysis)
6. [Anti-Detection Implementation](#6-anti-detection-implementation)
7. [Detection Systems Analysis](#7-detection-systems-analysis)
8. [Testing and Validation](#8-testing-and-validation)

---

## 1. Overview

### 1.1 Purpose

This appendix provides a technical deep dive into anti-detection mechanisms, explaining how modern bot detection works and how ScraperX evades detection.

### 1.2 Detection Landscape

Modern bot detection operates on multiple layers:

```
+------------------------------------------------------------------+
|                    BOT DETECTION LAYERS                           |
+------------------------------------------------------------------+
|                                                                   |
|  LAYER 1: NETWORK ANALYSIS                                        |
|  +----------------------------------------------------------+    |
|  |  - IP reputation and history                              |    |
|  |  - ASN classification (datacenter vs residential)         |    |
|  |  - Geographic consistency                                 |    |
|  |  - Request rate patterns                                  |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 2: TLS FINGERPRINTING                                      |
|  +----------------------------------------------------------+    |
|  |  - Client Hello analysis                                  |    |
|  |  - Cipher suite ordering                                  |    |
|  |  - TLS extensions                                         |    |
|  |  - ALPN preferences                                       |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 3: HTTP FINGERPRINTING                                     |
|  +----------------------------------------------------------+    |
|  |  - Header order and values                                |    |
|  |  - Accept-Language consistency                            |    |
|  |  - User-Agent analysis                                    |    |
|  |  - HTTP/2 settings frame                                  |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 4: BROWSER FINGERPRINTING                                  |
|  +----------------------------------------------------------+    |
|  |  - Canvas fingerprint                                     |    |
|  |  - WebGL fingerprint                                      |    |
|  |  - Audio fingerprint                                      |    |
|  |  - Navigator properties                                   |    |
|  |  - Screen and window properties                           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 5: BEHAVIORAL ANALYSIS                                     |
|  +----------------------------------------------------------+    |
|  |  - Mouse movement patterns                                |    |
|  |  - Keyboard timing                                        |    |
|  |  - Scroll behavior                                        |    |
|  |  - Touch events                                           |    |
|  |  - Time-on-page metrics                                   |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 6: CHALLENGE-RESPONSE                                      |
|  +----------------------------------------------------------+    |
|  |  - CAPTCHA (reCAPTCHA, hCaptcha, Turnstile)               |    |
|  |  - JavaScript challenges                                  |    |
|  |  - Proof of work                                          |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 1.3 Detection Probability Matrix

| Layer | Detection Method | Difficulty to Evade | ScraperX Solution |
|-------|------------------|---------------------|-------------------|
| Network | IP Reputation | Medium | Multi-tier proxy |
| TLS | Fingerprint | Hard | impit, Camoufox |
| HTTP | Headers | Medium | fingerprint-suite |
| Browser | Canvas/WebGL | Medium | Fingerprint injection |
| Behavior | Mouse/Keyboard | Hard | Human simulation |
| Challenge | CAPTCHA | Medium | Solving services |

---

## 2. Bot Detection Mechanisms

### 2.1 IP-Based Detection

**How It Works:**

Detection systems maintain databases of IP addresses categorized by:

- **Datacenter vs Residential:** IPs from cloud providers (AWS, GCP, Hetzner) are flagged
- **IP History:** IPs with previous bot activity are scored higher risk
- **Geographic Anomalies:** IP location vs timezone/language mismatches
- **Request Velocity:** Too many requests from single IP

**IP Classification Example:**

```typescript
interface IPClassification {
  ip: string;
  type: 'datacenter' | 'residential' | 'mobile' | 'unknown';
  asn: number;
  asnOrg: string;
  country: string;
  city: string;
  riskScore: number;  // 0-100
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isKnownBot: boolean;
  lastSeenBot: Date | null;
}

// Example detection logic
function assessIPRisk(classification: IPClassification): number {
  let score = 0;
  
  if (classification.type === 'datacenter') score += 40;
  if (classification.isProxy) score += 20;
  if (classification.isVpn) score += 15;
  if (classification.isTor) score += 50;
  if (classification.isKnownBot) score += 60;
  if (classification.lastSeenBot && daysSince(classification.lastSeenBot) < 7) {
    score += 30;
  }
  
  return Math.min(score, 100);
}
```

**ScraperX Mitigation:**

1. **Residential Proxies:** Real ISP-assigned IPs from actual households
2. **Mobile Proxies:** CGNAT IPs shared by thousands of real users
3. **IP Rotation:** Never reuse same IP for same site within session
4. **Geographic Matching:** Align proxy country with fingerprint locale

### 2.2 Rate-Based Detection

**Patterns That Trigger Detection:**

| Pattern | Threshold | Detection Confidence |
|---------|-----------|---------------------|
| Requests/second from IP | >2/sec | High |
| Parallel connections | >10 concurrent | Medium |
| Regular intervals | Exactly every N seconds | High |
| No idle periods | 100% utilization | High |
| Exponential request growth | 2x every minute | Medium |

**ScraperX Mitigation:**

```typescript
// Rate limiting with jitter
class RateLimiter {
  private lastRequest: Map<string, number> = new Map();
  
  async waitForSlot(domain: string): Promise<void> {
    const minDelay = 1000;  // 1 second minimum
    const maxDelay = 3000;  // 3 seconds maximum
    const jitter = Math.random() * (maxDelay - minDelay);
    
    const lastTime = this.lastRequest.get(domain) || 0;
    const elapsed = Date.now() - lastTime;
    const waitTime = Math.max(0, minDelay + jitter - elapsed);
    
    if (waitTime > 0) {
      await sleep(waitTime);
    }
    
    this.lastRequest.set(domain, Date.now());
  }
}

// Human-like timing variation
function humanDelay(): number {
  // Log-normal distribution mimics human behavior
  const mu = 1.5;  // Mean in log space
  const sigma = 0.8;  // Standard deviation in log space
  const u = Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.exp(mu + sigma * z) * 1000;  // Convert to milliseconds
}
```

---

## 3. TLS Fingerprinting

### 3.1 How TLS Fingerprinting Works

When a client initiates a TLS connection, it sends a "Client Hello" message containing:

- **Protocol Version:** TLS 1.2, TLS 1.3
- **Cipher Suites:** Ordered list of supported encryption methods
- **Extensions:** Additional negotiation parameters
- **Supported Groups:** Elliptic curves supported
- **Signature Algorithms:** Supported signing methods

Each browser/library has a unique combination, creating a fingerprint.

**JA3 Fingerprint Format:**

```
JA3 = MD5(TLSVersion,Ciphers,Extensions,EllipticCurves,EllipticCurvePointFormats)

Example Chrome 120 JA3:
771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0

Example Node.js (detected as bot):
771,4866-4867-4865-49196-49200-159-52393-52392-52394-49195-49199-158-49188-49192-107-49187-49191-103-49162-49172-57-49161-49171-51-157-156-61-60-53-47-255,0-11-10-35-22-23-13-43-45-51,29-23-30-25-24,0-1-2
```

### 3.2 JA3 Fingerprint Comparison

| Client | JA3 Hash | Detection Risk |
|--------|----------|----------------|
| Chrome 120 (Windows) | `cd08e31494f9531f560d64c695473da9` | Low |
| Firefox 121 | `b32309a26951912be7dba376398abc3b` | Low |
| Safari 17 | `773906b0efdefa24a7f2b8eb6985bf37` | Low |
| Node.js (default) | `579ccef312d18482fc42e2b822ca2430` | High |
| Python requests | `3b5074b1b5d032e5620f69f9f700ff0e` | High |
| curl | `456523fc94726331a4d5a2e1d40b2cd7` | High |

### 3.3 TLS Fingerprint Spoofing with impit

impit (Impersonation HTTP client) provides native browser TLS fingerprints:

```typescript
// src/scraper/http-engine.ts

import { impit, BrowserType } from 'impit';

// Available browser impersonations
type ImpitBrowser = 
  | 'chrome99' | 'chrome100' | 'chrome104' | 'chrome107' 
  | 'chrome110' | 'chrome116' | 'chrome119' | 'chrome120'
  | 'firefox102' | 'firefox109' | 'firefox117' | 'firefox121'
  | 'safari15_3' | 'safari15_5' | 'safari16' | 'safari17'
  | 'edge99' | 'edge101';

interface HttpEngineConfig {
  impersonate: ImpitBrowser;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  timeout: number;
  followRedirects: boolean;
  maxRedirects: number;
}

export async function fetchWithImpit(
  url: string,
  config: HttpEngineConfig
): Promise<Response> {
  return impit(url, {
    impersonate: config.impersonate,
    proxy: config.proxy,
    timeout: config.timeout,
    followRedirects: config.followRedirects,
    maxRedirects: config.maxRedirects,
    headers: {
      // Additional headers matched to impersonation
    }
  });
}
```

### 3.4 JA3 Fingerprint Components

**Cipher Suites (in order of preference):**

```typescript
// Chrome 120 cipher suite order
const CHROME_120_CIPHERS = [
  0x1301,  // TLS_AES_128_GCM_SHA256
  0x1302,  // TLS_AES_256_GCM_SHA384
  0x1303,  // TLS_CHACHA20_POLY1305_SHA256
  0xc02b,  // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
  0xc02f,  // TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  0xc02c,  // TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
  0xc030,  // TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
  0xcca9,  // TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
  0xcca8,  // TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
  0xc013,  // TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA
  0xc014,  // TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA
  0x009c,  // TLS_RSA_WITH_AES_128_GCM_SHA256
  0x009d,  // TLS_RSA_WITH_AES_256_GCM_SHA384
  0x002f,  // TLS_RSA_WITH_AES_128_CBC_SHA
  0x0035,  // TLS_RSA_WITH_AES_256_CBC_SHA
];
```

**TLS Extensions:**

```typescript
// Chrome 120 TLS extensions order
const CHROME_120_EXTENSIONS = [
  0x0000,  // server_name (SNI)
  0x0017,  // extended_master_secret
  0xff01,  // renegotiation_info
  0x000a,  // supported_groups
  0x000b,  // ec_point_formats
  0x0023,  // session_ticket
  0x0010,  // application_layer_protocol_negotiation
  0x0005,  // status_request
  0x000d,  // signature_algorithms
  0x0012,  // signed_certificate_timestamp
  0x0033,  // key_share
  0x002d,  // psk_key_exchange_modes
  0x002b,  // supported_versions
  0x001b,  // compress_certificate
  0x4469,  // application_settings
];
```

### 3.5 HTTP/2 Fingerprinting

Beyond TLS, HTTP/2 connections have their own fingerprint via the SETTINGS frame:

```typescript
// Chrome HTTP/2 SETTINGS
const CHROME_HTTP2_SETTINGS = {
  HEADER_TABLE_SIZE: 65536,
  ENABLE_PUSH: 0,         // Chrome disables push
  MAX_CONCURRENT_STREAMS: 1000,
  INITIAL_WINDOW_SIZE: 6291456,
  MAX_FRAME_SIZE: 16384,
  MAX_HEADER_LIST_SIZE: 262144
};

// Firefox HTTP/2 SETTINGS (different!)
const FIREFOX_HTTP2_SETTINGS = {
  HEADER_TABLE_SIZE: 65536,
  ENABLE_PUSH: 1,         // Firefox enables push
  MAX_CONCURRENT_STREAMS: 100,
  INITIAL_WINDOW_SIZE: 131072,
  MAX_FRAME_SIZE: 16384,
  MAX_HEADER_LIST_SIZE: undefined  // Not set
};

// impit handles this automatically when impersonating
```

---

## 4. Browser Fingerprinting

### 4.1 Fingerprint Components

Browser fingerprinting collects dozens of data points:

**Navigator Properties:**

```javascript
// Fingerprint-detectable navigator properties
const navigatorFingerprint = {
  userAgent: navigator.userAgent,
  appVersion: navigator.appVersion,
  platform: navigator.platform,
  language: navigator.language,
  languages: navigator.languages,
  cookieEnabled: navigator.cookieEnabled,
  doNotTrack: navigator.doNotTrack,
  hardwareConcurrency: navigator.hardwareConcurrency,
  maxTouchPoints: navigator.maxTouchPoints,
  deviceMemory: navigator.deviceMemory,
  plugins: Array.from(navigator.plugins).map(p => p.name),
  mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
  webdriver: navigator.webdriver,  // TRUE = automated!
  pdfViewerEnabled: navigator.pdfViewerEnabled,
  vendor: navigator.vendor,
  vendorSub: navigator.vendorSub,
  productSub: navigator.productSub
};
```

**Screen Properties:**

```javascript
const screenFingerprint = {
  width: screen.width,
  height: screen.height,
  availWidth: screen.availWidth,
  availHeight: screen.availHeight,
  colorDepth: screen.colorDepth,
  pixelDepth: screen.pixelDepth,
  devicePixelRatio: window.devicePixelRatio,
  screenTop: window.screenTop,
  screenLeft: window.screenLeft
};
```

**Canvas Fingerprint:**

```javascript
function getCanvasFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Draw text with specific font
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('BrowserFingerprint', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('BrowserFingerprint', 4, 17);
  
  // Get data URL - unique per GPU/driver combo
  return canvas.toDataURL();
}
```

**WebGL Fingerprint:**

```javascript
function getWebGLFingerprint(): object {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  
  return {
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    extensions: gl.getSupportedExtensions(),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    unmaskedVendor: gl.getParameter(
      gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_VENDOR_WEBGL
    ),
    unmaskedRenderer: gl.getParameter(
      gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL
    )
  };
}
```

**Audio Fingerprint:**

```javascript
async function getAudioFingerprint(): Promise<number> {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const analyser = audioContext.createAnalyser();
  const gain = audioContext.createGain();
  const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
  gain.gain.setValueAtTime(0, audioContext.currentTime);
  
  oscillator.connect(analyser);
  analyser.connect(scriptProcessor);
  scriptProcessor.connect(gain);
  gain.connect(audioContext.destination);
  
  oscillator.start(0);
  
  return new Promise((resolve) => {
    scriptProcessor.onaudioprocess = (event) => {
      const output = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < output.length; i++) {
        sum += Math.abs(output[i]);
      }
      oscillator.disconnect();
      resolve(sum);
    };
  });
}
```

### 4.2 Fingerprint Injection with fingerprint-suite

```typescript
// src/fingerprint/manager.ts

import { 
  FingerprintGenerator, 
  FingerprintInjector,
  newInjectedPage 
} from 'fingerprint-suite';
import { BrowserContext, Page } from 'playwright';

export interface FingerprintConfig {
  browsers: ('chrome' | 'firefox' | 'safari' | 'edge')[];
  operatingSystems: ('windows' | 'macos' | 'linux' | 'android' | 'ios')[];
  devices: ('desktop' | 'mobile')[];
  locales: string[];
  screen?: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };
}

export class FingerprintManager {
  private generator: FingerprintGenerator;
  private injector: FingerprintInjector;

  constructor() {
    this.generator = new FingerprintGenerator();
    this.injector = new FingerprintInjector();
  }

  generateFingerprint(config: FingerprintConfig) {
    return this.generator.getFingerprint({
      browsers: config.browsers,
      operatingSystems: config.operatingSystems,
      devices: config.devices,
      locales: config.locales,
      screen: config.screen
    });
  }

  async injectIntoContext(
    context: BrowserContext,
    fingerprint: ReturnType<typeof this.generateFingerprint>
  ): Promise<void> {
    await this.injector.attachToBrowser(context.browser()!);
    
    context.on('page', async (page) => {
      await this.injector.attachToPage(page);
    });
  }

  async createInjectedPage(context: BrowserContext): Promise<Page> {
    const fingerprint = this.generateFingerprint({
      browsers: ['chrome'],
      operatingSystems: ['windows'],
      devices: ['desktop'],
      locales: ['en-US']
    });

    return newInjectedPage(context, {
      fingerprintOptions: fingerprint
    });
  }
}
```

### 4.3 Consistency Validation

Fingerprints must be internally consistent:

```typescript
// src/fingerprint/validator.ts

interface FingerprintConsistency {
  isValid: boolean;
  errors: string[];
}

export function validateFingerprint(fingerprint: any): FingerprintConsistency {
  const errors: string[] = [];
  
  // User-Agent must match navigator
  if (fingerprint.userAgent !== fingerprint.navigator?.userAgent) {
    errors.push('User-Agent mismatch');
  }
  
  // Platform must match OS
  const platform = fingerprint.navigator?.platform;
  const os = fingerprint.operatingSystem;
  if (os === 'windows' && !platform?.includes('Win')) {
    errors.push('Platform does not match Windows OS');
  }
  if (os === 'macos' && !platform?.includes('Mac')) {
    errors.push('Platform does not match macOS');
  }
  
  // Screen size must be realistic
  const { width, height } = fingerprint.screen || {};
  if (width < 320 || width > 7680 || height < 240 || height > 4320) {
    errors.push('Unrealistic screen dimensions');
  }
  
  // Device memory must be reasonable
  const memory = fingerprint.navigator?.deviceMemory;
  if (memory && (memory < 0.25 || memory > 64)) {
    errors.push('Unrealistic device memory');
  }
  
  // Hardware concurrency must be reasonable
  const cores = fingerprint.navigator?.hardwareConcurrency;
  if (cores && (cores < 1 || cores > 128)) {
    errors.push('Unrealistic CPU cores');
  }
  
  // WebGL renderer must match GPU
  const webglRenderer = fingerprint.webgl?.renderer;
  if (os === 'macos' && webglRenderer?.includes('NVIDIA')) {
    // Modern Macs don't use NVIDIA
    errors.push('WebGL renderer inconsistent with macOS');
  }
  
  // Language must match locale
  const language = fingerprint.navigator?.language;
  const locale = fingerprint.locales?.[0];
  if (language && locale && !language.startsWith(locale.split('-')[0])) {
    errors.push('Language does not match locale');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 4.4 Automation Detection Evasion

Browsers expose automation indicators that must be hidden:

```typescript
// src/stealth/automation-evasion.ts

export async function hideAutomationIndicators(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Hide webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // Hide automation-controlled window
    Object.defineProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Array', {
      get: () => undefined
    });
    
    // Remove Playwright-specific properties
    delete (window as any).__playwright;
    delete (window as any).__pw_manual;
    
    // Override permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'prompt' } as PermissionStatus);
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };
    
    // Fix plugins array (empty in headless)
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ];
      }
    });
    
    // Fix mimeTypes
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        return [
          { type: 'application/pdf', suffixes: 'pdf' },
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf' }
        ];
      }
    });
    
    // Override language getter
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
    
    // Chrome-specific runtime mock
    if (!window.chrome) {
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    }
  });
}
```

---

## 5. Behavioral Analysis

### 5.1 Human Behavior Patterns

Detection systems analyze behavior to distinguish humans from bots:

**Mouse Movement Characteristics:**

| Characteristic | Human | Bot |
|---------------|-------|-----|
| Speed | Variable (20-500 px/s) | Constant |
| Path | Curved, with jitter | Straight lines |
| Acceleration | Natural curves | Instant start/stop |
| Hovering | Pauses on elements | No pauses |
| Overshooting | Common | Never |
| Micro-corrections | Frequent | None |

**Scroll Behavior:**

| Characteristic | Human | Bot |
|---------------|-------|-----|
| Speed | Variable | Constant |
| Direction changes | Occasional | Never |
| Momentum | Natural deceleration | Instant stop |
| Reading pauses | Frequent | None |
| Scroll amount | Variable | Fixed increments |

### 5.2 Human Behavior Simulation

```typescript
// src/behavior/human-simulator.ts

import { Page, Mouse, Keyboard } from 'playwright';

interface Point {
  x: number;
  y: number;
}

export class HumanBehaviorSimulator {
  private page: Page;
  private mouse: Mouse;
  private keyboard: Keyboard;

  constructor(page: Page) {
    this.page = page;
    this.mouse = page.mouse;
    this.keyboard = page.keyboard;
  }

  async moveMouseToElement(selector: string): Promise<void> {
    const element = await this.page.$(selector);
    if (!element) return;

    const box = await element.boundingBox();
    if (!box) return;

    // Target point with slight randomization
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Get current position (or start from random edge)
    const startX = Math.random() * await this.page.evaluate(() => window.innerWidth);
    const startY = Math.random() * await this.page.evaluate(() => window.innerHeight);

    await this.moveMouseHumanlike({ x: startX, y: startY }, { x: targetX, y: targetY });
  }

  private async moveMouseHumanlike(start: Point, end: Point): Promise<void> {
    // Generate Bezier curve control points
    const controlPoints = this.generateBezierControlPoints(start, end);
    
    // Calculate path points along the curve
    const steps = this.calculateSteps(start, end);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.bezierPoint(start, controlPoints[0], controlPoints[1], end, t);
      
      // Add micro-jitter
      const jitter = this.microJitter();
      
      await this.mouse.move(point.x + jitter.x, point.y + jitter.y);
      
      // Variable delay between movements
      await this.humanDelay(5, 20);
    }
  }

  private generateBezierControlPoints(start: Point, end: Point): [Point, Point] {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    
    // Control point offset based on distance
    const offset1 = distance * (0.2 + Math.random() * 0.3);
    const offset2 = distance * (0.2 + Math.random() * 0.3);
    
    // Random angle offset from straight line
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const angleOffset1 = (Math.random() - 0.5) * Math.PI / 4;
    const angleOffset2 = (Math.random() - 0.5) * Math.PI / 4;
    
    return [
      {
        x: start.x + offset1 * Math.cos(angle + angleOffset1),
        y: start.y + offset1 * Math.sin(angle + angleOffset1)
      },
      {
        x: end.x - offset2 * Math.cos(angle + angleOffset2),
        y: end.y - offset2 * Math.sin(angle + angleOffset2)
      }
    ];
  }

  private bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  private calculateSteps(start: Point, end: Point): number {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    // More steps for longer distances, with some randomization
    return Math.floor(distance / 10 * (0.8 + Math.random() * 0.4));
  }

  private microJitter(): Point {
    // Small random displacement simulating hand tremor
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    };
  }

  async typeHumanlike(text: string): Promise<void> {
    for (const char of text) {
      await this.keyboard.type(char);
      
      // Variable delay between keystrokes
      const baseDelay = char === ' ' ? 100 : 50;
      const variance = baseDelay * 0.5;
      const delay = baseDelay + (Math.random() - 0.5) * variance * 2;
      
      await this.humanDelay(delay * 0.5, delay * 1.5);
      
      // Occasional longer pause (thinking)
      if (Math.random() < 0.02) {
        await this.humanDelay(200, 500);
      }
    }
  }

  async scrollHumanlike(direction: 'up' | 'down', amount: number): Promise<void> {
    const scrollsNeeded = Math.ceil(amount / 100);
    let scrolled = 0;
    
    for (let i = 0; i < scrollsNeeded && scrolled < amount; i++) {
      // Variable scroll increment
      const increment = Math.min(
        amount - scrolled,
        50 + Math.random() * 150
      );
      
      const delta = direction === 'down' ? increment : -increment;
      await this.page.mouse.wheel(0, delta);
      
      scrolled += Math.abs(increment);
      
      // Variable pause between scrolls
      await this.humanDelay(50, 200);
      
      // Occasional reading pause
      if (Math.random() < 0.1) {
        await this.humanDelay(500, 2000);
      }
    }
  }

  async clickHumanlike(selector: string): Promise<void> {
    await this.moveMouseToElement(selector);
    
    // Small pause before click
    await this.humanDelay(50, 150);
    
    // Click with variable duration
    await this.mouse.down();
    await this.humanDelay(50, 100);
    await this.mouse.up();
    
    // Small pause after click
    await this.humanDelay(100, 300);
  }

  private humanDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 5.3 Timing Analysis Evasion

```typescript
// src/behavior/timing.ts

export class TimingAnalysisEvasion {
  // Randomize JavaScript timing to prevent fingerprinting
  async injectTimingNoise(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Add noise to performance.now()
      const originalNow = performance.now.bind(performance);
      performance.now = () => {
        return originalNow() + (Math.random() * 0.1);
      };
      
      // Add noise to Date.now()
      const originalDateNow = Date.now;
      Date.now = () => {
        return originalDateNow() + Math.floor(Math.random() * 2);
      };
      
      // Randomize requestAnimationFrame timing slightly
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        return originalRAF((timestamp) => {
          callback(timestamp + Math.random() * 0.5);
        });
      };
    });
  }
}
```

---

## 6. Anti-Detection Implementation

### 6.1 Complete Stealth Pipeline

```typescript
// src/stealth/pipeline.ts

import { Browser, BrowserContext, Page } from 'playwright';
import { FingerprintManager } from '../fingerprint/manager';
import { HumanBehaviorSimulator } from '../behavior/human-simulator';
import { hideAutomationIndicators } from './automation-evasion';
import { TimingAnalysisEvasion } from '../behavior/timing';

export interface StealthOptions {
  fingerprint?: {
    browser: 'chrome' | 'firefox' | 'safari';
    os: 'windows' | 'macos' | 'linux';
    locale: string;
  };
  humanBehavior: boolean;
  stealthPlugins: boolean;
  timingNoise: boolean;
}

export class StealthPipeline {
  private fingerprintManager: FingerprintManager;
  private timingEvasion: TimingAnalysisEvasion;

  constructor() {
    this.fingerprintManager = new FingerprintManager();
    this.timingEvasion = new TimingAnalysisEvasion();
  }

  async createStealthContext(
    browser: Browser,
    options: StealthOptions
  ): Promise<BrowserContext> {
    // Generate consistent fingerprint
    const fingerprint = this.fingerprintManager.generateFingerprint({
      browsers: [options.fingerprint?.browser || 'chrome'],
      operatingSystems: [options.fingerprint?.os || 'windows'],
      devices: ['desktop'],
      locales: [options.fingerprint?.locale || 'en-US']
    });

    // Create context with fingerprint-matching settings
    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: {
        width: fingerprint.screen.width,
        height: fingerprint.screen.height
      },
      locale: fingerprint.locales[0],
      timezoneId: this.getTimezoneForLocale(fingerprint.locales[0]),
      geolocation: this.getGeolocationForLocale(fingerprint.locales[0]),
      permissions: ['geolocation'],
      colorScheme: 'light',
      deviceScaleFactor: fingerprint.screen.devicePixelRatio
    });

    // Inject fingerprint into all pages
    await this.fingerprintManager.injectIntoContext(context, fingerprint);

    // Add stealth scripts to each new page
    context.on('page', async (page) => {
      await this.applyPageStealth(page, options);
    });

    return context;
  }

  private async applyPageStealth(page: Page, options: StealthOptions): Promise<void> {
    // Hide automation indicators
    await hideAutomationIndicators(page);

    // Add timing noise
    if (options.timingNoise) {
      await this.timingEvasion.injectTimingNoise(page);
    }

    // Additional stealth scripts
    if (options.stealthPlugins) {
      await this.applyStealthPlugins(page);
    }
  }

  private async applyStealthPlugins(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Iframe contentWindow fix
      const originalContentWindow = Object.getOwnPropertyDescriptor(
        HTMLIFrameElement.prototype,
        'contentWindow'
      )!;
      
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function() {
          const window = originalContentWindow.get!.call(this);
          if (window) {
            // Don't expose that we're in an iframe
            Object.defineProperty(window, 'chrome', { value: (window as any).chrome });
          }
          return window;
        }
      });

      // WebGL vendor/renderer spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, [parameter]);
      };

      // Battery API spoofing
      if ('getBattery' in navigator) {
        (navigator as any).getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: () => {},
          removeEventListener: () => {}
        });
      }

      // Notification permission spoofing
      const originalNotification = window.Notification;
      (window as any).Notification = {
        permission: 'default',
        requestPermission: () => Promise.resolve('default')
      };
      Object.setPrototypeOf(window.Notification, originalNotification);
    });
  }

  private getTimezoneForLocale(locale: string): string {
    const timezones: Record<string, string> = {
      'en-US': 'America/New_York',
      'en-GB': 'Europe/London',
      'de-DE': 'Europe/Berlin',
      'fr-FR': 'Europe/Paris',
      'ja-JP': 'Asia/Tokyo',
      'zh-CN': 'Asia/Shanghai'
    };
    return timezones[locale] || 'America/New_York';
  }

  private getGeolocationForLocale(locale: string): { latitude: number; longitude: number } {
    const locations: Record<string, { latitude: number; longitude: number }> = {
      'en-US': { latitude: 40.7128, longitude: -74.0060 },  // NYC
      'en-GB': { latitude: 51.5074, longitude: -0.1278 },   // London
      'de-DE': { latitude: 52.5200, longitude: 13.4050 },   // Berlin
      'fr-FR': { latitude: 48.8566, longitude: 2.3522 },    // Paris
      'ja-JP': { latitude: 35.6762, longitude: 139.6503 },  // Tokyo
      'zh-CN': { latitude: 31.2304, longitude: 121.4737 }   // Shanghai
    };
    return locations[locale] || locations['en-US'];
  }
}
```

### 6.2 Camoufox Integration

Camoufox provides native Firefox fingerprints that are extremely difficult to detect:

```typescript
// src/stealth/camoufox-bridge.ts

import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';

interface CamoufoxConfig {
  pythonPath: string;
  scriptPath: string;
  wsPort: number;
}

interface ScrapeRequest {
  id: string;
  url: string;
  options: {
    waitFor?: string;
    screenshot?: boolean;
    timeout?: number;
    proxy?: {
      server: string;
      username?: string;
      password?: string;
    };
  };
}

interface ScrapeResult {
  id: string;
  success: boolean;
  html?: string;
  screenshot?: string;
  error?: string;
}

export class CamoufoxBridge {
  private process: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private config: CamoufoxConfig;
  private pendingRequests: Map<string, {
    resolve: (result: ScrapeResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: CamoufoxConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Start Python Camoufox process
    this.process = spawn(this.config.pythonPath, [
      this.config.scriptPath,
      '--ws-port', String(this.config.wsPort)
    ]);

    this.process.stdout?.on('data', (data) => {
      console.log(`Camoufox: ${data}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`Camoufox Error: ${data}`);
    });

    // Connect via WebSocket
    await this.connect();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${this.config.wsPort}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('Connected to Camoufox');
        resolve();
      });

      this.ws.on('message', (data) => {
        const result: ScrapeResult = JSON.parse(data.toString());
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          pending.resolve(result);
          this.pendingRequests.delete(result.id);
        }
      });

      this.ws.on('error', reject);
    });
  }

  async scrape(request: ScrapeRequest): Promise<ScrapeResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Camoufox not connected');
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });
      this.ws!.send(JSON.stringify(request));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Camoufox request timeout'));
        }
      }, request.options.timeout || 30000);
    });
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }
    if (this.process) {
      this.process.kill();
    }
  }
}
```

**Python Camoufox Script:**

```python
# camoufox_server.py

import asyncio
import json
import argparse
from camoufox import AsyncCamoufox
import websockets

class CamoufoxServer:
    def __init__(self, ws_port: int):
        self.ws_port = ws_port
        self.browser = None
    
    async def start(self):
        self.browser = await AsyncCamoufox().__aenter__()
        
        async with websockets.serve(self.handle_connection, "localhost", self.ws_port):
            print(f"Camoufox server listening on ws://localhost:{self.ws_port}")
            await asyncio.Future()  # Run forever
    
    async def handle_connection(self, websocket):
        async for message in websocket:
            request = json.loads(message)
            result = await self.scrape(request)
            await websocket.send(json.dumps(result))
    
    async def scrape(self, request: dict) -> dict:
        try:
            page = await self.browser.new_page()
            
            # Configure proxy if provided
            if request.get('options', {}).get('proxy'):
                proxy = request['options']['proxy']
                # Camoufox proxy configuration
            
            # Navigate
            await page.goto(
                request['url'],
                timeout=request.get('options', {}).get('timeout', 30000)
            )
            
            # Wait for selector if specified
            wait_for = request.get('options', {}).get('waitFor')
            if wait_for:
                await page.wait_for_selector(wait_for, timeout=10000)
            
            # Get content
            html = await page.content()
            
            # Screenshot if requested
            screenshot = None
            if request.get('options', {}).get('screenshot'):
                screenshot = await page.screenshot(type='png')
                screenshot = screenshot.hex()  # Convert bytes to hex string
            
            await page.close()
            
            return {
                'id': request['id'],
                'success': True,
                'html': html,
                'screenshot': screenshot
            }
            
        except Exception as e:
            return {
                'id': request['id'],
                'success': False,
                'error': str(e)
            }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ws-port', type=int, default=9222)
    args = parser.parse_args()
    
    server = CamoufoxServer(args.ws_port)
    asyncio.run(server.start())
```

---

## 7. Detection Systems Analysis

### 7.1 Cloudflare Bot Management

**Detection Techniques:**

| Technique | Weight | Evasion Method |
|-----------|--------|----------------|
| IP Reputation | 25% | Residential/mobile proxies |
| TLS Fingerprint | 20% | impit/Camoufox |
| JavaScript Challenge | 20% | Full browser rendering |
| Behavior Analysis | 15% | Human simulation |
| Canvas Fingerprint | 10% | Fingerprint injection |
| HTTP/2 Fingerprint | 10% | impit matching |

**Turnstile CAPTCHA Bypass:**

```typescript
// Cloudflare Turnstile requires solving via service
async function solveTurnstile(page: Page, siteKey: string): Promise<string> {
  const solver = new CaptchaSolver('2captcha');
  
  // Get page URL
  const pageUrl = page.url();
  
  // Submit to solving service
  const token = await solver.solve({
    type: 'turnstile',
    siteKey,
    pageUrl
  });
  
  // Inject token
  await page.evaluate((token) => {
    (window as any).turnstileCallback(token);
  }, token);
  
  return token;
}
```

### 7.2 Akamai Bot Manager

**Detection Techniques:**

| Technique | Weight | Evasion Method |
|-----------|--------|----------------|
| Sensor Data | 30% | Complex - needs native browser |
| TLS Fingerprint | 25% | Camoufox (native Firefox) |
| Device Fingerprint | 20% | Fingerprint injection |
| Behavioral | 15% | Human simulation |
| Cookie Validation | 10% | Persistent sessions |

**Akamai Sensor Bypass:**

Akamai uses a heavily obfuscated sensor script that collects:
- Mouse movements
- Keyboard events  
- Touch events
- Device orientation
- Battery status
- Audio fingerprint

Best approach: Use Camoufox with full behavior simulation

### 7.3 PerimeterX (HUMAN)

**Detection Techniques:**

| Technique | Weight | Evasion Method |
|-----------|--------|----------------|
| Press/Hold Detection | 25% | Click duration variation |
| Mouse Trajectory | 25% | Bezier curve movements |
| Timing Analysis | 20% | Randomized delays |
| Device Fingerprint | 15% | Full fingerprint spoofing |
| Network Analysis | 15% | Mobile proxies |

### 7.4 DataDome

**Detection Techniques:**

| Technique | Weight | Evasion Method |
|-----------|--------|----------------|
| Cookie Challenges | 30% | Full browser with persistence |
| JavaScript Execution | 25% | Real browser rendering |
| TLS/HTTP Fingerprint | 20% | impit/Camoufox |
| Rate Limiting | 15% | Distributed requests |
| Device Fingerprint | 10% | Fingerprint injection |

---

## 8. Testing and Validation

### 8.1 Detection Test Sites

| Site | Tests | URL |
|------|-------|-----|
| CreepJS | Full fingerprint analysis | https://abrahamjuliot.github.io/creepjs/ |
| BrowserLeaks | WebGL, Canvas, WebRTC | https://browserleaks.com/ |
| AmIUnique | Fingerprint uniqueness | https://amiunique.org/ |
| Bot.sannysoft | Automation detection | https://bot.sannysoft.com/ |
| PixelScan | Bot detection | https://pixelscan.net/ |
| Incolumitas | TLS fingerprint | https://tls.browserleaks.com/ |

### 8.2 Validation Framework

```typescript
// src/testing/stealth-validator.ts

interface ValidationResult {
  site: string;
  passed: boolean;
  issues: string[];
  fingerprint?: any;
}

export class StealthValidator {
  async validateAll(page: Page): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test CreepJS
    results.push(await this.testCreepJS(page));
    
    // Test bot.sannysoft
    results.push(await this.testSannysoft(page));
    
    // Test BrowserLeaks
    results.push(await this.testBrowserLeaks(page));
    
    return results;
  }

  private async testCreepJS(page: Page): Promise<ValidationResult> {
    await page.goto('https://abrahamjuliot.github.io/creepjs/');
    await page.waitForSelector('.visitor-info', { timeout: 30000 });
    
    const trustScore = await page.$eval(
      '.trust-score',
      el => parseFloat(el.textContent || '0')
    );
    
    const issues: string[] = [];
    
    if (trustScore < 50) {
      issues.push(`Low trust score: ${trustScore}%`);
    }
    
    // Check for specific leaks
    const leaks = await page.$$eval('.leak-detected', els => 
      els.map(el => el.textContent)
    );
    issues.push(...leaks.filter(Boolean) as string[]);
    
    return {
      site: 'CreepJS',
      passed: trustScore >= 70 && issues.length === 0,
      issues
    };
  }

  private async testSannysoft(page: Page): Promise<ValidationResult> {
    await page.goto('https://bot.sannysoft.com/');
    await page.waitForLoadState('networkidle');
    
    const issues: string[] = [];
    
    // Check for red (failed) rows
    const failedTests = await page.$$eval('tr.failed td:first-child', els =>
      els.map(el => el.textContent)
    );
    
    issues.push(...failedTests.filter(Boolean) as string[]);
    
    return {
      site: 'Bot.Sannysoft',
      passed: issues.length === 0,
      issues
    };
  }

  private async testBrowserLeaks(page: Page): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Test WebRTC leak
    await page.goto('https://browserleaks.com/webrtc');
    const localIP = await page.$eval(
      '#local-ip',
      el => el.textContent
    );
    if (localIP && !localIP.includes('n/a')) {
      issues.push(`WebRTC local IP leak: ${localIP}`);
    }
    
    // Test Canvas fingerprint
    await page.goto('https://browserleaks.com/canvas');
    const canvasHash = await page.$eval(
      '#canvas-hash',
      el => el.textContent
    );
    
    return {
      site: 'BrowserLeaks',
      passed: issues.length === 0,
      issues,
      fingerprint: { canvas: canvasHash }
    };
  }
}
```

### 8.3 Protected Site Test Suite

```typescript
// src/testing/protected-sites.ts

interface ProtectedSiteTest {
  name: string;
  url: string;
  protection: string;
  successIndicator: string;
  blockIndicator: string;
}

export const PROTECTED_SITE_TESTS: ProtectedSiteTest[] = [
  {
    name: 'Cloudflare Standard',
    url: 'https://www.cloudflare.com/',
    protection: 'Cloudflare',
    successIndicator: 'Cloudflare, Inc.',
    blockIndicator: 'Checking your browser'
  },
  {
    name: 'Nike',
    url: 'https://www.nike.com/',
    protection: 'Akamai',
    successIndicator: 'nike.com',
    blockIndicator: 'Access Denied'
  },
  {
    name: 'Ticketmaster',
    url: 'https://www.ticketmaster.com/',
    protection: 'PerimeterX',
    successIndicator: 'Ticketmaster',
    blockIndicator: 'Press & Hold'
  },
  {
    name: 'Footlocker',
    url: 'https://www.footlocker.com/',
    protection: 'DataDome',
    successIndicator: 'Foot Locker',
    blockIndicator: 'datadome'
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/',
    protection: 'Custom',
    successIndicator: 'LinkedIn',
    blockIndicator: 'authwall'
  }
];

export async function runProtectedSiteTests(
  scraper: ScraperEngine
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  for (const test of PROTECTED_SITE_TESTS) {
    try {
      const response = await scraper.scrape(test.url, {
        renderJs: true,
        stealthMode: true,
        timeout: 30000
      });
      
      const success = response.html.includes(test.successIndicator) &&
                     !response.html.includes(test.blockIndicator);
      
      results.set(test.name, success);
    } catch (error) {
      results.set(test.name, false);
    }
  }
  
  return results;
}
```

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
| Security Lead | | | |

### Distribution

| Role | Access Level |
|------|--------------|
| Engineering Team | Full |
| Security Team | Full |
| Operations Team | Summary |
