/**
 * Unit tests for engine selector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all engine dependencies
vi.mock('../../../src/engines/http/index.js', () => ({
  getHttpEngine: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
  })),
}));

vi.mock('../../../src/engines/browser/index.js', () => ({
  getBrowserEngine: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
  })),
}));

vi.mock('../../../src/engines/stealth/index.js', () => ({
  getStealthEngine: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
    isAvailable: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../../../src/proxy/index.js', () => ({
  getProxyManager: vi.fn(() => ({
    getProxy: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('../../../src/fingerprint/generator.js', () => ({
  generateFingerprint: vi.fn(() => ({
    id: 'fp_test',
    userAgent: 'Mozilla/5.0',
    navigator: {},
    screen: {},
    webgl: {},
    headers: {},
    canvasNoiseSeed: 'seed1',
    audioNoiseSeed: 'seed2',
    timezone: 'UTC',
    locale: 'en-US',
  })),
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/config/index.js', () => ({
  config: {
    proxy: { enabled: false },
    scraping: { retryDelayMs: 100 },
  },
}));

import { EngineSelector, getEngineSelector } from '../../../src/engines/selector.js';
import { defaultScrapeOptions } from '../../fixtures/index.js';

describe('Engine Selector', () => {
  let selector: EngineSelector;

  beforeEach(() => {
    vi.clearAllMocks();
    selector = new EngineSelector();
  });

  describe('selectEngine', () => {
    it('should return requested engine when not auto', () => {
      expect(selector.selectEngine('https://example.com', 'http', defaultScrapeOptions)).toBe('http');
      expect(selector.selectEngine('https://example.com', 'browser', defaultScrapeOptions)).toBe('browser');
      expect(selector.selectEngine('https://example.com', 'stealth', defaultScrapeOptions)).toBe('stealth');
    });

    it('should select http for simple requests', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', defaultScrapeOptions);
      expect(engine).toBe('http');
    });

    it('should select browser for JS rendering', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        renderJs: true,
      });
      expect(engine).toBe('browser');
    });

    it('should select browser for screenshots', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        screenshot: true,
      });
      expect(engine).toBe('browser');
    });

    it('should select browser for PDF', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        pdf: true,
      });
      expect(engine).toBe('browser');
    });

    it('should select browser for waitFor', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        waitFor: '#content',
      });
      expect(engine).toBe('browser');
    });

    it('should select browser for scenarios without premium/mobile proxy', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        scenario: [{ action: 'click', selector: '#btn' }],
      });
      // Scenarios use browser by default, stealth only with premium/mobile proxy
      expect(engine).toBe('browser');
    });

    it('should select stealth for scenarios with premium proxy', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        scenario: [{ action: 'click', selector: '#btn' }],
        premiumProxy: true,
      });
      expect(engine).toBe('stealth');
    });

    it('should select stealth for mobile proxy', () => {
      const engine = selector.selectEngine('https://example.com', 'auto', {
        ...defaultScrapeOptions,
        mobileProxy: true,
      });
      expect(engine).toBe('stealth');
    });

    it('should select stealth for known protected sites', () => {
      expect(selector.selectEngine('https://www.linkedin.com', 'auto', defaultScrapeOptions)).toBe('stealth');
      expect(selector.selectEngine('https://facebook.com', 'auto', defaultScrapeOptions)).toBe('stealth');
      expect(selector.selectEngine('https://instagram.com', 'auto', defaultScrapeOptions)).toBe('stealth');
    });

    it('should select browser for Amazon', () => {
      const engine = selector.selectEngine('https://amazon.com', 'auto', defaultScrapeOptions);
      expect(engine).toBe('browser');
    });

    it('should handle invalid URL gracefully', () => {
      const engine = selector.selectEngine('not-a-url', 'auto', defaultScrapeOptions);
      expect(engine).toBe('http');
    });
  });

  describe('execute', () => {
    it('should execute with selected engine', async () => {
      const result = await selector.execute({
        url: 'https://example.com',
        options: defaultScrapeOptions,
        engine: 'http',
        proxyTier: 'datacenter',
        attempt: 1,
        maxAttempts: 3,
      });

      // The execute method returns { result, engine, escalated, attempts }
      // where result is the engine's response
      expect(result.result.success).toBeDefined();
      expect(result.engine).toBe('http');
      expect(result.attempts).toBe(1);
    });

    it('should track escalation status', async () => {
      const result = await selector.execute({
        url: 'https://example.com',
        options: defaultScrapeOptions,
        engine: 'auto',
        proxyTier: 'datacenter',
        attempt: 1,
        maxAttempts: 3,
      });

      expect(result.escalated).toBe(false);
    });
  });

  describe('getEngineSelector', () => {
    it('should return singleton instance', () => {
      const selector1 = getEngineSelector();
      const selector2 = getEngineSelector();
      expect(selector1).toBe(selector2);
    });
  });

  describe('checkEngineAvailability', () => {
    it('should return availability for all engines', async () => {
      const availability = await selector.checkEngineAvailability();

      expect(availability.auto).toBe(true);
      expect(availability.http).toBe(true);
      expect(availability.browser).toBe(true);
      expect(availability.stealth).toBe(true);
    });
  });
});
