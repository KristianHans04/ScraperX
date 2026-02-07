/**
 * Unit tests for credits utilities
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config before importing credits
vi.mock('../../../src/config/index.js', () => ({
  config: {
    scraping: {
      timeoutMs: 30000,
    },
    credits: {
      base: {
        http: 1,
        browser: 5,
        stealth: 10,
      },
      proxy: {
        datacenter: 0,
        residential: 3,
        mobile: 10,
        isp: 5,
      },
      features: {
        screenshot: 2,
        pdf: 3,
        jsRender: 4,
      },
    },
  },
}));

import {
  calculateCredits,
  determineEngine,
  determineProxyTier,
  getDefaultScrapeOptions,
  mergeScrapeOptions,
} from '../../../src/utils/credits.js';
import type { ScrapeOptions } from '../../../src/types/index.js';

describe('Credits Utilities', () => {
  describe('calculateCredits', () => {
    it('should calculate base credits for HTTP engine', () => {
      const result = calculateCredits('http', 'datacenter', {});
      expect(result.total).toBe(1);
      expect(result.breakdown.base).toBe(1);
    });

    it('should calculate base credits for browser engine', () => {
      const result = calculateCredits('browser', 'datacenter', {});
      expect(result.total).toBe(5);
      expect(result.breakdown.base).toBe(5);
    });

    it('should calculate base credits for stealth engine', () => {
      const result = calculateCredits('stealth', 'datacenter', {});
      expect(result.total).toBe(10);
      expect(result.breakdown.base).toBe(10);
    });

    it('should add residential proxy cost', () => {
      const result = calculateCredits('http', 'residential', {});
      expect(result.total).toBe(4); // 1 + 3
      expect(result.breakdown.base).toBe(1);
      expect(result.breakdown.premiumProxy).toBe(3);
    });

    it('should add mobile proxy cost', () => {
      const result = calculateCredits('http', 'mobile', {});
      expect(result.total).toBe(11); // 1 + 10
      expect(result.breakdown.base).toBe(1);
      expect(result.breakdown.mobileProxy).toBe(10);
    });

    it('should add ISP proxy cost', () => {
      const result = calculateCredits('http', 'isp', {});
      expect(result.total).toBe(6); // 1 + 5
      expect(result.breakdown.premiumProxy).toBe(5);
    });

    it('should add screenshot cost', () => {
      const result = calculateCredits('browser', 'datacenter', { screenshot: true });
      expect(result.total).toBe(7); // 5 + 2
      expect(result.breakdown.screenshot).toBe(2);
    });

    it('should add PDF cost', () => {
      const result = calculateCredits('browser', 'datacenter', { pdf: true });
      expect(result.total).toBe(8); // 5 + 3
      expect(result.breakdown.pdf).toBe(3);
    });

    it('should add JS render cost for HTTP engine with renderJs', () => {
      const result = calculateCredits('http', 'datacenter', { renderJs: true });
      expect(result.total).toBe(5); // 1 + 4 (browser - http)
      expect(result.breakdown.base).toBe(1);
      expect(result.breakdown.jsRender).toBe(4);
    });

    it('should handle auto engine as HTTP', () => {
      const result = calculateCredits('auto', 'datacenter', {});
      expect(result.total).toBe(1);
      expect(result.breakdown.base).toBe(1);
    });

    it('should accumulate all costs correctly', () => {
      const result = calculateCredits('browser', 'residential', {
        screenshot: true,
        pdf: true,
      });
      // 5 (browser) + 3 (residential) + 2 (screenshot) + 3 (pdf) = 13
      expect(result.total).toBe(13);
      expect(result.breakdown.base).toBe(5);
      expect(result.breakdown.premiumProxy).toBe(3);
      expect(result.breakdown.screenshot).toBe(2);
      expect(result.breakdown.pdf).toBe(3);
    });
  });

  describe('determineEngine', () => {
    it('should return http for empty options', () => {
      expect(determineEngine({})).toBe('http');
    });

    it('should return browser for renderJs option', () => {
      expect(determineEngine({ renderJs: true })).toBe('browser');
    });

    it('should return browser for waitFor option', () => {
      expect(determineEngine({ waitFor: '#content' })).toBe('browser');
    });

    it('should return browser for screenshot option', () => {
      expect(determineEngine({ screenshot: true })).toBe('browser');
    });

    it('should return browser for pdf option', () => {
      expect(determineEngine({ pdf: true })).toBe('browser');
    });

    it('should return stealth for scenario option', () => {
      expect(determineEngine({ 
        scenario: [{ action: 'click', selector: '#btn' }] 
      })).toBe('stealth');
    });

    it('should return stealth for mobileProxy option', () => {
      expect(determineEngine({ mobileProxy: true })).toBe('stealth');
    });

    it('should prioritize stealth over browser', () => {
      expect(determineEngine({ 
        renderJs: true,
        scenario: [{ action: 'wait', duration: 1000 }]
      })).toBe('stealth');
    });
  });

  describe('determineProxyTier', () => {
    it('should return datacenter for empty options', () => {
      expect(determineProxyTier({})).toBe('datacenter');
    });

    it('should return mobile for mobileProxy option', () => {
      expect(determineProxyTier({ mobileProxy: true })).toBe('mobile');
    });

    it('should return residential for premiumProxy option', () => {
      expect(determineProxyTier({ premiumProxy: true })).toBe('residential');
    });

    it('should prioritize mobile over residential', () => {
      expect(determineProxyTier({ 
        mobileProxy: true, 
        premiumProxy: true 
      })).toBe('mobile');
    });
  });

  describe('getDefaultScrapeOptions', () => {
    it('should return default options', () => {
      const defaults = getDefaultScrapeOptions();
      
      expect(defaults.renderJs).toBe(false);
      expect(defaults.timeout).toBe(30000);
      expect(defaults.screenshot).toBe(false);
      expect(defaults.pdf).toBe(false);
      expect(defaults.premiumProxy).toBe(false);
      expect(defaults.mobileProxy).toBe(false);
    });

    it('should return a new object each time', () => {
      const defaults1 = getDefaultScrapeOptions();
      const defaults2 = getDefaultScrapeOptions();
      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('mergeScrapeOptions', () => {
    it('should return defaults when no user options provided', () => {
      const result = mergeScrapeOptions();
      expect(result).toEqual(getDefaultScrapeOptions());
    });

    it('should return defaults when undefined provided', () => {
      const result = mergeScrapeOptions(undefined);
      expect(result).toEqual(getDefaultScrapeOptions());
    });

    it('should merge user options with defaults', () => {
      const result = mergeScrapeOptions({ renderJs: true });
      
      expect(result.renderJs).toBe(true);
      expect(result.timeout).toBe(30000); // default
      expect(result.screenshot).toBe(false); // default
    });

    it('should override default values', () => {
      const result = mergeScrapeOptions({
        timeout: 60000,
        screenshot: true,
      });
      
      expect(result.timeout).toBe(60000);
      expect(result.screenshot).toBe(true);
    });

    it('should handle screenshot options', () => {
      const result = mergeScrapeOptions({
        screenshot: true,
        screenshotOptions: { fullPage: true, format: 'jpeg', quality: 80 },
      });
      
      expect(result.screenshotOptions).toEqual({
        fullPage: true,
        format: 'jpeg',
        quality: 80,
      });
    });

    it('should set default screenshot options when partial provided', () => {
      const result = mergeScrapeOptions({
        screenshotOptions: { quality: 50 },
      });
      
      expect(result.screenshotOptions).toEqual({
        fullPage: false,
        format: 'png',
        quality: 50,
      });
    });

    it('should not include screenshotOptions when not provided', () => {
      const result = mergeScrapeOptions({ renderJs: true });
      expect(result.screenshotOptions).toBeUndefined();
    });
  });
});
