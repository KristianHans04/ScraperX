/**
 * Unit tests for fingerprint generator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { 
  generateFingerprint, 
  generateFingerprintSessionId,
  createSessionFingerprint,
  validateFingerprint,
} from '../../../src/fingerprint/generator.js';

describe('Fingerprint Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateFingerprint', () => {
    it('should generate a fingerprint with all required fields', () => {
      const fp = generateFingerprint();

      expect(fp.id).toBeDefined();
      expect(fp.id.length).toBe(16);
      expect(fp.userAgent).toBeDefined();
      expect(fp.userAgent).toContain('Mozilla');
      expect(fp.navigator).toBeDefined();
      expect(fp.screen).toBeDefined();
      expect(fp.webgl).toBeDefined();
      expect(fp.headers).toBeDefined();
      expect(fp.canvasNoiseSeed).toBeDefined();
      expect(fp.audioNoiseSeed).toBeDefined();
      expect(fp.timezone).toBeDefined();
      expect(fp.locale).toBeDefined();
    });

    it('should generate Windows fingerprint by default', () => {
      const fp = generateFingerprint();

      expect(fp.navigator.platform).toBe('Win32');
      expect(fp.navigator.vendor).toBe('Google Inc.');
    });

    it('should generate macOS fingerprint', () => {
      const fp = generateFingerprint({ platform: 'macos' });

      expect(fp.navigator.platform).toBe('MacIntel');
      expect(fp.navigator.vendor).toBe('Apple Computer, Inc.');
    });

    it('should generate Linux fingerprint', () => {
      const fp = generateFingerprint({ platform: 'linux' });

      expect(fp.navigator.platform).toBe('Linux x86_64');
    });

    it('should generate Android fingerprint for mobile', () => {
      const fp = generateFingerprint({ platform: 'windows', mobile: true });

      expect(fp.navigator.platform).toBe('Linux armv8l');
      expect(fp.navigator.maxTouchPoints).toBe(5);
      expect(fp.userAgent).toContain('Android');
    });

    it('should generate iOS fingerprint for mobile macOS', () => {
      const fp = generateFingerprint({ platform: 'macos', mobile: true });

      expect(fp.navigator.platform).toBe('iPhone');
      // User agent can be iPhone or iPad (both are iOS devices)
      expect(fp.userAgent).toMatch(/iPhone|iPad/);
    });

    it('should use country-specific timezone', () => {
      const usFingerprint = generateFingerprint({ country: 'US' });
      expect(usFingerprint.timezone).toMatch(/America\//);

      const jpFingerprint = generateFingerprint({ country: 'JP' });
      expect(jpFingerprint.timezone).toBe('Asia/Tokyo');

      const ukFingerprint = generateFingerprint({ country: 'UK' });
      expect(ukFingerprint.timezone).toBe('Europe/London');
    });

    it('should use country-specific language', () => {
      const frFingerprint = generateFingerprint({ country: 'FR' });
      expect(frFingerprint.locale).toBe('fr-FR');
      expect(frFingerprint.navigator.language).toBe('fr-FR');

      const jpFingerprint = generateFingerprint({ country: 'JP' });
      expect(jpFingerprint.locale).toBe('ja-JP');
    });

    it('should generate unique fingerprints', () => {
      const fp1 = generateFingerprint();
      const fp2 = generateFingerprint();

      // IDs should be different (due to random noise seeds)
      expect(fp1.canvasNoiseSeed).not.toBe(fp2.canvasNoiseSeed);
      expect(fp1.audioNoiseSeed).not.toBe(fp2.audioNoiseSeed);
    });

    it('should generate deterministic fingerprints with seed', () => {
      const fp1 = generateFingerprint({ seed: 'test-seed-123' });
      const fp2 = generateFingerprint({ seed: 'test-seed-123' });

      // Same seed should produce same screen and user agent selection
      expect(fp1.screen).toEqual(fp2.screen);
      expect(fp1.userAgent).toBe(fp2.userAgent);
      expect(fp1.navigator.hardwareConcurrency).toBe(fp2.navigator.hardwareConcurrency);
    });

    it('should include valid screen properties', () => {
      const fp = generateFingerprint();

      expect(fp.screen.width).toBeGreaterThan(0);
      expect(fp.screen.height).toBeGreaterThan(0);
      expect(fp.screen.colorDepth).toBe(24);
      expect(fp.screen.pixelRatio).toBeGreaterThan(0);
    });

    it('should include valid WebGL properties', () => {
      const fp = generateFingerprint();

      expect(fp.webgl.vendor).toBeDefined();
      expect(fp.webgl.renderer).toBeDefined();
      expect(fp.webgl.version).toContain('WebGL');
    });

    it('should include proper headers', () => {
      const fp = generateFingerprint();

      expect(fp.headers['User-Agent']).toBe(fp.userAgent);
      expect(fp.headers['Accept']).toBeDefined();
      expect(fp.headers['Accept-Language']).toBeDefined();
      expect(fp.headers['Sec-Ch-Ua']).toBeDefined();
    });

    it('should set desktop properties correctly', () => {
      const fp = generateFingerprint({ mobile: false });

      expect(fp.navigator.maxTouchPoints).toBe(0);
      expect([4, 8, 12, 16]).toContain(fp.navigator.hardwareConcurrency);
      expect([8, 16, 32]).toContain(fp.navigator.deviceMemory);
    });

    it('should set mobile properties correctly', () => {
      const fp = generateFingerprint({ mobile: true });

      expect(fp.navigator.maxTouchPoints).toBe(5);
      expect([4, 6, 8]).toContain(fp.navigator.hardwareConcurrency);
      expect([4, 6, 8]).toContain(fp.navigator.deviceMemory);
    });
  });

  describe('generateFingerprintSessionId', () => {
    it('should generate a 32 character hex string', () => {
      const sessionId = generateFingerprintSessionId();

      expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique session IDs', () => {
      const id1 = generateFingerprintSessionId();
      const id2 = generateFingerprintSessionId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('createSessionFingerprint', () => {
    it('should create fingerprint using session ID as seed', () => {
      const sessionId = 'test-session-123';
      const fp1 = createSessionFingerprint(sessionId);
      const fp2 = createSessionFingerprint(sessionId);

      expect(fp1.userAgent).toBe(fp2.userAgent);
      expect(fp1.screen).toEqual(fp2.screen);
    });

    it('should respect other options', () => {
      const fp = createSessionFingerprint('session', {
        platform: 'macos',
        country: 'JP',
      });

      expect(fp.navigator.platform).toBe('MacIntel');
      expect(fp.locale).toBe('ja-JP');
    });
  });

  describe('validateFingerprint', () => {
    it('should return true for valid fingerprint', () => {
      const fp = generateFingerprint();
      expect(validateFingerprint(fp)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateFingerprint(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateFingerprint(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateFingerprint('string')).toBe(false);
      expect(validateFingerprint(123)).toBe(false);
      expect(validateFingerprint([])).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(validateFingerprint({ id: 'test' })).toBe(false);
      expect(validateFingerprint({ 
        id: 'test',
        userAgent: 'ua',
        navigator: {},
        screen: {},
        webgl: {},
        // missing timezone and locale
      })).toBe(false);
    });

    it('should return true for object with all required fields', () => {
      const validFp = {
        id: 'test',
        userAgent: 'Mozilla/5.0',
        navigator: { platform: 'Win32' },
        screen: { width: 1920 },
        webgl: { vendor: 'test' },
        headers: {},
        canvasNoiseSeed: 'seed',
        audioNoiseSeed: 'seed',
        timezone: 'UTC',
        locale: 'en-US',
      };

      expect(validateFingerprint(validFp)).toBe(true);
    });
  });
});
