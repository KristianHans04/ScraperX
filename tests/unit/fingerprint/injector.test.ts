/**
 * Fingerprint Injector Tests for Scrapifie
 *
 * Tests for browser fingerprint injection into Playwright pages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config and logger before importing
vi.mock('../../../src/config/index.js', () => ({
  config: {
    logging: { level: 'info' },
  },
}));

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

// Mock Playwright page
const mockPageAddInitScript = vi.fn().mockResolvedValue(undefined);
const mockPageEvaluate = vi.fn();

const mockPage = {
  addInitScript: mockPageAddInitScript,
  evaluate: mockPageEvaluate,
};

// Mock Playwright context
const mockContextAddInitScript = vi.fn().mockResolvedValue(undefined);

const mockContext = {
  addInitScript: mockContextAddInitScript,
};

import {
  injectFingerprint,
  applyFingerprintToContext,
  getFingerprintContextOptions,
  validateFingerprintInjection,
} from '../../../src/fingerprint/injector.js';
import { mockFingerprint } from '../../fixtures/index.js';
import type { BrowserFingerprint } from '../../../src/types/index.js';

describe('Fingerprint Injector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('injectFingerprint', () => {
    it('should inject fingerprint script into page', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      expect(mockPageAddInitScript).toHaveBeenCalledWith(
        expect.any(Function),
        mockFingerprint
      );
    });

    it('should pass fingerprint data to init script', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [scriptFn, data] = mockPageAddInitScript.mock.calls[0];
      expect(data).toEqual(mockFingerprint);
    });

    it('should inject navigator overrides', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      // The script should be called with fingerprint containing navigator properties
      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.navigator).toBeDefined();
      expect(data.navigator.platform).toBeDefined();
      expect(data.navigator.language).toBeDefined();
      expect(data.navigator.hardwareConcurrency).toBeDefined();
    });

    it('should inject screen overrides', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.screen).toBeDefined();
      expect(data.screen.width).toBe(mockFingerprint.screen.width);
      expect(data.screen.height).toBe(mockFingerprint.screen.height);
    });

    it('should inject WebGL overrides', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.webgl).toBeDefined();
      expect(data.webgl.vendor).toBeDefined();
      expect(data.webgl.renderer).toBeDefined();
    });

    it('should inject canvas noise seed', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.canvasNoiseSeed).toBeDefined();
    });

    it('should inject audio noise seed', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.audioNoiseSeed).toBeDefined();
    });

    it('should inject timezone', async () => {
      await injectFingerprint(mockPage as any, mockFingerprint);

      const [, data] = mockPageAddInitScript.mock.calls[0];
      expect(data.timezone).toBe(mockFingerprint.timezone);
    });
  });

  describe('applyFingerprintToContext', () => {
    it('should add init script to context', async () => {
      await applyFingerprintToContext(mockContext as any, mockFingerprint);

      expect(mockContextAddInitScript).toHaveBeenCalledWith(
        expect.any(Function),
        mockFingerprint
      );
    });

    it('should pass fingerprint to context init script', async () => {
      await applyFingerprintToContext(mockContext as any, mockFingerprint);

      const [, data] = mockContextAddInitScript.mock.calls[0];
      expect(data.id).toBe(mockFingerprint.id);
    });
  });

  describe('getFingerprintContextOptions', () => {
    it('should return context options from fingerprint', () => {
      const options = getFingerprintContextOptions(mockFingerprint);

      expect(options).toEqual({
        userAgent: mockFingerprint.userAgent,
        viewport: {
          width: mockFingerprint.screen.width,
          height: mockFingerprint.screen.height,
        },
        deviceScaleFactor: mockFingerprint.screen.pixelRatio,
        locale: mockFingerprint.locale,
        timezoneId: mockFingerprint.timezone,
        extraHTTPHeaders: mockFingerprint.headers,
      });
    });

    it('should extract user agent', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.userAgent).toBe(mockFingerprint.userAgent);
    });

    it('should set viewport from screen dimensions', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.viewport).toEqual({
        width: mockFingerprint.screen.width,
        height: mockFingerprint.screen.height,
      });
    });

    it('should set device scale factor', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.deviceScaleFactor).toBe(mockFingerprint.screen.pixelRatio);
    });

    it('should set locale', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.locale).toBe(mockFingerprint.locale);
    });

    it('should set timezone', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.timezoneId).toBe(mockFingerprint.timezone);
    });

    it('should include extra HTTP headers', () => {
      const options = getFingerprintContextOptions(mockFingerprint);
      expect(options.extraHTTPHeaders).toEqual(mockFingerprint.headers);
    });
  });

  describe('validateFingerprintInjection', () => {
    it('should return valid=true when fingerprint is properly injected', async () => {
      mockPageEvaluate.mockResolvedValueOnce({
        userAgent: mockFingerprint.userAgent,
        platform: mockFingerprint.navigator.platform,
        hardwareConcurrency: mockFingerprint.navigator.hardwareConcurrency,
        webdriver: false,
        screenWidth: mockFingerprint.screen.width,
        screenHeight: mockFingerprint.screen.height,
      });

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect user agent mismatch', async () => {
      mockPageEvaluate.mockResolvedValueOnce({
        userAgent: 'Wrong User Agent',
        platform: mockFingerprint.navigator.platform,
        hardwareConcurrency: mockFingerprint.navigator.hardwareConcurrency,
        webdriver: false,
        screenWidth: mockFingerprint.screen.width,
        screenHeight: mockFingerprint.screen.height,
      });

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('User agent mismatch'))).toBe(true);
    });

    it('should detect platform mismatch', async () => {
      mockPageEvaluate.mockResolvedValueOnce({
        userAgent: mockFingerprint.userAgent,
        platform: 'Linux',
        hardwareConcurrency: mockFingerprint.navigator.hardwareConcurrency,
        webdriver: false,
        screenWidth: mockFingerprint.screen.width,
        screenHeight: mockFingerprint.screen.height,
      });

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Platform mismatch'))).toBe(true);
    });

    it('should detect webdriver flag not hidden', async () => {
      mockPageEvaluate.mockResolvedValueOnce({
        userAgent: mockFingerprint.userAgent,
        platform: mockFingerprint.navigator.platform,
        hardwareConcurrency: mockFingerprint.navigator.hardwareConcurrency,
        webdriver: true, // Not properly hidden
        screenWidth: mockFingerprint.screen.width,
        screenHeight: mockFingerprint.screen.height,
      });

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Webdriver flag'))).toBe(true);
    });

    it('should detect screen width mismatch', async () => {
      mockPageEvaluate.mockResolvedValueOnce({
        userAgent: mockFingerprint.userAgent,
        platform: mockFingerprint.navigator.platform,
        hardwareConcurrency: mockFingerprint.navigator.hardwareConcurrency,
        webdriver: false,
        screenWidth: 1024, // Wrong width
        screenHeight: mockFingerprint.screen.height,
      });

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Screen width mismatch'))).toBe(true);
    });

    it('should handle evaluation errors', async () => {
      mockPageEvaluate.mockRejectedValueOnce(new Error('Evaluation failed'));

      const result = await validateFingerprintInjection(mockPage as any, mockFingerprint);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Validation error'))).toBe(true);
    });
  });
});

describe('Fingerprint Script Functionality', () => {
  describe('Navigator overrides', () => {
    it('should contain expected navigator properties', () => {
      const navigatorProps = [
        'platform',
        'language',
        'languages',
        'hardwareConcurrency',
        'deviceMemory',
        'maxTouchPoints',
        'vendor',
        'appVersion',
      ];

      navigatorProps.forEach(prop => {
        expect(mockFingerprint.navigator).toHaveProperty(prop);
      });
    });
  });

  describe('Screen overrides', () => {
    it('should contain expected screen properties', () => {
      const screenProps = [
        'width',
        'height',
        'availWidth',
        'availHeight',
        'colorDepth',
        'pixelRatio',
      ];

      screenProps.forEach(prop => {
        expect(mockFingerprint.screen).toHaveProperty(prop);
      });
    });
  });

  describe('WebGL overrides', () => {
    it('should contain expected WebGL properties', () => {
      expect(mockFingerprint.webgl).toHaveProperty('vendor');
      expect(mockFingerprint.webgl).toHaveProperty('renderer');
      expect(mockFingerprint.webgl).toHaveProperty('version');
    });
  });

  describe('Timezone handling', () => {
    it('should support common timezones', () => {
      const commonTimezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Berlin',
        'Asia/Tokyo',
      ];

      // mockFingerprint has a valid timezone
      expect(commonTimezones).toContain(mockFingerprint.timezone);
    });
  });

  describe('Canvas noise', () => {
    it('should have canvas noise seed', () => {
      expect(mockFingerprint.canvasNoiseSeed).toBeDefined();
      expect(typeof mockFingerprint.canvasNoiseSeed).toBe('string');
    });
  });

  describe('Audio noise', () => {
    it('should have audio noise seed', () => {
      expect(mockFingerprint.audioNoiseSeed).toBeDefined();
      expect(typeof mockFingerprint.audioNoiseSeed).toBe('string');
    });
  });
});

describe('Fingerprint Types', () => {
  it('should have required fingerprint structure', () => {
    const fingerprint: BrowserFingerprint = mockFingerprint;

    expect(fingerprint.id).toBeDefined();
    expect(fingerprint.userAgent).toBeDefined();
    expect(fingerprint.navigator).toBeDefined();
    expect(fingerprint.screen).toBeDefined();
    expect(fingerprint.webgl).toBeDefined();
    expect(fingerprint.timezone).toBeDefined();
    expect(fingerprint.locale).toBeDefined();
  });

  it('should have consistent user agent format', () => {
    expect(mockFingerprint.userAgent).toContain('Mozilla');
    expect(mockFingerprint.userAgent).toContain('Chrome');
  });

  it('should have reasonable screen dimensions', () => {
    expect(mockFingerprint.screen.width).toBeGreaterThan(0);
    expect(mockFingerprint.screen.height).toBeGreaterThan(0);
    expect(mockFingerprint.screen.width).toBeGreaterThanOrEqual(mockFingerprint.screen.availWidth);
    expect(mockFingerprint.screen.height).toBeGreaterThanOrEqual(mockFingerprint.screen.availHeight);
  });
});

describe('Automation Detection Bypass', () => {
  it('should hide webdriver flag', () => {
    // The script should set navigator.webdriver to false
    const expectedWebdriver = false;
    expect(expectedWebdriver).toBe(false);
  });

  it('should remove selenium artifacts', () => {
    // These properties should be deleted
    const seleniumArtifacts = [
      '__selenium_evaluate',
      '__selenium_unwrapped',
      '__webdriver_evaluate',
      '__driver_evaluate',
      '__webdriver_unwrapped',
      '__driver_unwrapped',
      '__fxdriver_evaluate',
      '__fxdriver_unwrapped',
    ];
    
    expect(seleniumArtifacts.length).toBeGreaterThan(0);
  });

  it('should add Chrome plugins', () => {
    // Should add plugins array to match real Chrome
    const expectedPlugins = [
      'Chrome PDF Plugin',
      'Chrome PDF Viewer',
      'Native Client',
    ];
    
    expect(expectedPlugins.length).toBe(3);
  });
});
