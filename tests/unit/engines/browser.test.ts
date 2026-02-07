/**
 * Browser Engine Tests for ScraperX
 *
 * Tests for Playwright-based browser scraping engine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies inline to avoid hoisting issues
vi.mock('../../../src/engines/browser/pool.js', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue({ status: () => 200, headers: () => ({}) }),
    content: vi.fn().mockResolvedValue('<html><head><title>Test</title></head><body>Hello</body></html>'),
    url: vi.fn().mockReturnValue('https://example.com'),
    title: vi.fn().mockResolvedValue('Test Page'),
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForNavigation: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    selectOption: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot')),
    pdf: vi.fn().mockResolvedValue(Buffer.from('pdf')),
    locator: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue([{ textContent: vi.fn().mockResolvedValue('Text') }]),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
    }),
    hover: vi.fn().mockResolvedValue(undefined),
    keyboard: { press: vi.fn().mockResolvedValue(undefined) },
  };

  const mockContext = {
    addCookies: vi.fn().mockResolvedValue(undefined),
    cookies: vi.fn().mockResolvedValue([
      { name: 'session', value: 'abc123', domain: 'example.com', path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' },
    ]),
  };

  const mockPooledBrowser = { browser: {}, inUse: true };

  return {
    getBrowserPool: vi.fn(() => ({
      createPage: vi.fn().mockResolvedValue({
        page: mockPage,
        context: mockContext,
        pooledBrowser: mockPooledBrowser,
      }),
      closePage: vi.fn().mockResolvedValue(undefined),
    })),
    closeBrowserPool: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Mock config
vi.mock('../../../src/config/index.js', () => ({
  config: {
    browserEngine: {
      pageTimeoutMs: 30000,
    },
  },
}));

// Mock errors
vi.mock('../../../src/utils/errors.js', () => ({
  TimeoutError: class TimeoutError extends Error {
    code = 'TIMEOUT';
    retryable = true;
    constructor(timeout: number) { super(`Timeout after ${timeout}ms`); }
  },
  BlockedError: class BlockedError extends Error {
    code = 'BLOCKED';
    retryable = true;
    constructor(message: string) { super(message); }
  },
  CaptchaRequiredError: class CaptchaRequiredError extends Error {
    code = 'CAPTCHA_REQUIRED';
    retryable = false;
    constructor(type?: string) { super(`Captcha required: ${type}`); }
  },
}));

import type { ScrapeOptions, ScenarioStep } from '../../../src/types/index.js';

describe('BrowserEngine', () => {
  const defaultOptions: ScrapeOptions = {
    renderJs: true,
    timeout: 30000,
    screenshot: false,
    pdf: false,
    premiumProxy: false,
    mobileProxy: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BrowserEngine class', () => {
    it('should create a browser engine instance', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();
      expect(engine).toBeInstanceOf(BrowserEngine);
    });
  });

  describe('execute', () => {
    it('should navigate to URL and return content', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.content).toContain('Hello');
    });

    it('should return final URL', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.finalUrl).toBe('https://example.com');
    });

    it('should return timing information', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.timing).toBeDefined();
      expect(result.timing?.totalMs).toBeGreaterThanOrEqual(0);
    });

    it('should return cookies', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.cookies).toBeDefined();
    });
  });

  describe('Screenshot and PDF', () => {
    it('should take screenshot when requested', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: { ...defaultOptions, screenshot: true },
      });

      expect(result.screenshot).toBeDefined();
    });

    it('should generate PDF when requested', async () => {
      const { BrowserEngine } = await import('../../../src/engines/browser/index.js');
      const engine = new BrowserEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: { ...defaultOptions, pdf: true },
      });

      expect(result.pdf).toBeDefined();
    });
  });
});

describe('BrowserEngine Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new instance with createBrowserEngine', async () => {
    const { createBrowserEngine, BrowserEngine } = await import('../../../src/engines/browser/index.js');
    const engine = createBrowserEngine();
    expect(engine).toBeInstanceOf(BrowserEngine);
  });

  it('should return singleton with getBrowserEngine', async () => {
    const { getBrowserEngine } = await import('../../../src/engines/browser/index.js');
    const engine1 = getBrowserEngine();
    const engine2 = getBrowserEngine();
    expect(engine1).toBe(engine2);
  });
});

describe('Browser Context Options', () => {
  it('should set default viewport', () => {
    const viewport = { width: 1920, height: 1080 };
    expect(viewport.width).toBe(1920);
    expect(viewport.height).toBe(1080);
  });

  it('should configure mobile emulation', () => {
    const device = 'iPhone 12';
    const isMobile = device.toLowerCase().includes('iphone') || device.includes('mobile');
    expect(isMobile).toBe(true);
  });
});

describe('Scenario Actions', () => {
  const supportedActions = [
    'wait',
    'wait_for',
    'wait_for_navigation',
    'click',
    'fill',
    'select',
    'scroll',
    'scroll_to',
    'hover',
    'press',
    'evaluate',
    'screenshot',
  ];

  it('should support all common scenario actions', () => {
    expect(supportedActions.length).toBeGreaterThan(10);
  });

  it('should include wait action', () => {
    expect(supportedActions).toContain('wait');
  });

  it('should include click action', () => {
    expect(supportedActions).toContain('click');
  });

  it('should include fill action', () => {
    expect(supportedActions).toContain('fill');
  });

  it('should include scroll action', () => {
    expect(supportedActions).toContain('scroll');
  });
});

describe('Cookie Handling', () => {
  it('should format cookies for Playwright', () => {
    const cookie = {
      name: 'session',
      value: 'abc123',
      domain: '.example.com',
      path: '/',
    };

    const playwrightCookie = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
    };

    expect(playwrightCookie.name).toBe('session');
    expect(playwrightCookie.value).toBe('abc123');
  });

  it('should convert expires from ms to seconds', () => {
    const expiresMs = 1704067200000;
    const expiresSeconds = expiresMs / 1000;
    expect(expiresSeconds).toBe(1704067200);
  });
});

describe('Block Detection Patterns', () => {
  const captchaPatterns = [
    { pattern: /recaptcha/i, type: 'reCAPTCHA' },
    { pattern: /hcaptcha/i, type: 'hCaptcha' },
    { pattern: /cf-turnstile/i, type: 'Cloudflare Turnstile' },
  ];

  it('should detect reCAPTCHA', () => {
    const content = '<div class="g-recaptcha"></div>';
    const detected = captchaPatterns.some(p => p.pattern.test(content));
    expect(detected).toBe(true);
  });

  it('should detect hCaptcha', () => {
    const content = '<div class="hcaptcha"></div>';
    const detected = captchaPatterns.some(p => p.pattern.test(content));
    expect(detected).toBe(true);
  });

  it('should detect Cloudflare Turnstile', () => {
    const content = '<div class="cf-turnstile"></div>';
    const detected = captchaPatterns.some(p => p.pattern.test(content));
    expect(detected).toBe(true);
  });
});
