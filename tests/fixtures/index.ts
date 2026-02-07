/**
 * Test Fixtures for ScraperX
 * 
 * Provides mock data and factory functions for tests.
 */

import type { 
  Organization, 
  ApiKey, 
  ScrapeJob, 
  JobResult, 
  ScrapeOptions,
  BrowserFingerprint,
  ProxyConfig,
  Cookie,
} from '../../src/types/index.js';

// Organization Fixtures
export const mockOrganization: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Organization',
  slug: 'test-org',
  billingEmail: 'test@example.com',
  technicalEmail: 'tech@example.com',
  planId: 'starter',
  subscriptionStatus: 'active',
  creditsBalance: 100000,
  creditsIncludedMonthly: 100000,
  creditsOverageRate: 0.00005,
  rateLimitPerSecond: 10,
  maxConcurrentJobs: 50,
  maxBatchSize: 1000,
  dataRetentionDays: 7,
  features: {
    jsRendering: true,
    residentialProxies: false,
    mobileProxies: false,
    captchaSolving: false,
    webhooks: true,
    batchApi: true,
    priorityQueue: false,
    dedicatedSupport: false,
  },
  metadata: {},
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockEnterpriseOrganization: Organization = {
  ...mockOrganization,
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Enterprise Organization',
  slug: 'enterprise-org',
  planId: 'enterprise',
  creditsBalance: 10000000,
  rateLimitPerSecond: 100,
  maxConcurrentJobs: 500,
  features: {
    jsRendering: true,
    residentialProxies: true,
    mobileProxies: true,
    captchaSolving: true,
    webhooks: true,
    batchApi: true,
    priorityQueue: true,
    dedicatedSupport: true,
  },
};

// API Key Fixtures
export const mockApiKey: ApiKey = {
  id: '00000000-0000-0000-0000-000000000101',
  organizationId: mockOrganization.id,
  keyPrefix: 'sk_test_demo',
  keyHash: 'a'.repeat(64),
  name: 'Test API Key',
  description: 'API key for testing',
  scopes: ['scrape:read', 'scrape:write'],
  environment: 'development',
  usageCount: 0,
  isActive: true,
  metadata: {},
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockApiKeyWithIpRestriction: ApiKey = {
  ...mockApiKey,
  id: '00000000-0000-0000-0000-000000000102',
  name: 'Restricted API Key',
  allowedIps: ['192.168.1.1', '10.0.0.0/8'],
};

export const mockRevokedApiKey: ApiKey = {
  ...mockApiKey,
  id: '00000000-0000-0000-0000-000000000103',
  name: 'Revoked API Key',
  isActive: false,
  revokedAt: new Date('2024-01-15T00:00:00Z'),
  revokeReason: 'Compromised',
};

export const mockExpiredApiKey: ApiKey = {
  ...mockApiKey,
  id: '00000000-0000-0000-0000-000000000104',
  name: 'Expired API Key',
  expiresAt: new Date('2024-01-01T00:00:00Z'), // Expired
};

// Scrape Job Fixtures
export const mockScrapeJob: ScrapeJob = {
  id: 'job_test123abc',
  organizationId: mockOrganization.id,
  apiKeyId: mockApiKey.id,
  url: 'https://example.com',
  urlHash: 'a'.repeat(64),
  method: 'GET',
  headers: {},
  engine: 'http',
  options: {
    renderJs: false,
    timeout: 30000,
    screenshot: false,
    pdf: false,
    premiumProxy: false,
    mobileProxy: false,
  },
  proxyTier: 'datacenter',
  status: 'pending',
  priority: 5,
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  creditsEstimated: 1,
  creditsCharged: 0,
  creditBreakdown: {
    base: 1,
    jsRender: 0,
    premiumProxy: 0,
    mobileProxy: 0,
    captcha: 0,
    screenshot: 0,
    pdf: 0,
  },
  webhookAttempts: 0,
  metadata: {},
};

export const mockCompletedJob: ScrapeJob = {
  ...mockScrapeJob,
  id: 'job_completed123',
  status: 'completed',
  attempts: 1,
  startedAt: new Date('2024-01-01T00:00:01Z'),
  completedAt: new Date('2024-01-01T00:00:02Z'),
  creditsCharged: 1,
};

export const mockBrowserJob: ScrapeJob = {
  ...mockScrapeJob,
  id: 'job_browser123',
  engine: 'browser',
  options: {
    ...mockScrapeJob.options,
    renderJs: true,
    screenshot: true,
  },
  creditsEstimated: 7, // 5 (browser) + 2 (screenshot)
  creditBreakdown: {
    base: 5,
    jsRender: 0,
    premiumProxy: 0,
    mobileProxy: 0,
    captcha: 0,
    screenshot: 2,
    pdf: 0,
  },
};

// Job Result Fixtures
export const mockJobResult: JobResult = {
  id: '00000000-0000-0000-0000-000000000201',
  jobId: mockCompletedJob.id,
  organizationId: mockOrganization.id,
  statusCode: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'content-length': '1234',
  },
  contentType: 'text/html',
  contentLength: 1234,
  contentStorageType: 'inline',
  contentInline: '<html><head><title>Example</title></head><body>Hello World</body></html>',
  contentHash: 'b'.repeat(64),
  contentCompressed: false,
  redirectCount: 0,
  finalUrl: 'https://example.com',
  totalTimeMs: 500,
  captchaEncountered: false,
  captchaSolved: false,
  createdAt: new Date('2024-01-01T00:00:02Z'),
};

// Scrape Options Fixtures
export const defaultScrapeOptions: ScrapeOptions = {
  renderJs: false,
  timeout: 30000,
  screenshot: false,
  pdf: false,
  premiumProxy: false,
  mobileProxy: false,
};

export const browserScrapeOptions: ScrapeOptions = {
  renderJs: true,
  waitFor: '#content',
  waitMs: 1000,
  timeout: 60000,
  screenshot: true,
  screenshotOptions: {
    fullPage: true,
    format: 'png',
  },
  pdf: false,
  premiumProxy: false,
  mobileProxy: false,
};

export const stealthScrapeOptions: ScrapeOptions = {
  renderJs: true,
  timeout: 60000,
  screenshot: false,
  pdf: false,
  premiumProxy: true,
  mobileProxy: false,
  scenario: [
    { action: 'wait', duration: 2000 },
    { action: 'scroll', y: 500 },
    { action: 'click', selector: '#load-more' },
  ],
};

// Fingerprint Fixtures
export const mockFingerprint: BrowserFingerprint = {
  id: 'fp_test123',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  navigator: {
    platform: 'Win32',
    language: 'en-US',
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    vendor: 'Google Inc.',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  screen: {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelRatio: 1,
  },
  webgl: {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)',
  },
  headers: {
    'Accept-Language': 'en-US,en;q=0.9',
  },
  canvasNoiseSeed: 'canvas123',
  audioNoiseSeed: 'audio456',
  timezone: 'America/New_York',
  locale: 'en-US',
};

// Proxy Fixtures
export const mockDatacenterProxy: ProxyConfig = {
  id: 'proxy_dc_1',
  url: 'http://user:pass@proxy.example.com:8080',
  protocol: 'http',
  host: 'proxy.example.com',
  port: 8080,
  username: 'user',
  password: 'pass',
  provider: 'example',
  type: 'datacenter',
};

export const mockResidentialProxy: ProxyConfig = {
  id: 'proxy_res_1',
  url: 'http://user:pass@residential.example.com:8080',
  protocol: 'http',
  host: 'residential.example.com',
  port: 8080,
  username: 'user',
  password: 'pass',
  country: 'US',
  provider: 'example',
  type: 'residential',
};

// Cookie Fixtures
export const mockCookies: Cookie[] = [
  {
    name: 'session_id',
    value: 'abc123',
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  },
  {
    name: 'preferences',
    value: 'dark_mode=true',
    domain: 'example.com',
    path: '/',
  },
];

// Factory Functions
export function createMockOrganization(overrides?: Partial<Organization>): Organization {
  return { ...mockOrganization, ...overrides };
}

export function createMockApiKey(overrides?: Partial<ApiKey>): ApiKey {
  return { ...mockApiKey, ...overrides };
}

export function createMockScrapeJob(overrides?: Partial<ScrapeJob>): ScrapeJob {
  return { ...mockScrapeJob, ...overrides };
}

export function createMockJobResult(overrides?: Partial<JobResult>): JobResult {
  return { ...mockJobResult, ...overrides };
}

// Test URLs
export const testUrls = {
  simple: 'https://example.com',
  withPath: 'https://example.com/path/to/page',
  withQuery: 'https://example.com/search?q=test&page=1',
  httpbin: 'https://httpbin.org/html',
  blocked: 'https://blocked-site.example.com',
  slow: 'https://httpbin.org/delay/5',
  invalid: 'not-a-valid-url',
  localFile: 'file:///etc/passwd',
  internalIp: 'http://192.168.1.1/admin',
};

// HTML Content for Testing
export const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>Welcome</h1>
  <p class="description">This is a test page.</p>
  <ul id="items">
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
  <a href="/link1">Link 1</a>
  <a href="/link2">Link 2</a>
  <img src="/image1.jpg" alt="Image 1">
</body>
</html>
`;

export const blockedHtml = `
<!DOCTYPE html>
<html>
<head><title>Access Denied</title></head>
<body>
  <h1>Access Denied</h1>
  <p>Your request has been blocked.</p>
</body>
</html>
`;

export const captchaHtml = `
<!DOCTYPE html>
<html>
<head><title>Verify you are human</title></head>
<body>
  <div class="cf-browser-verification">
    <div class="g-recaptcha"></div>
  </div>
</body>
</html>
`;
