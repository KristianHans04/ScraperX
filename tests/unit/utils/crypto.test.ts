/**
 * Unit tests for crypto utilities
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config before importing crypto
vi.mock('../../../src/config/index.js', () => ({
  config: {
    apiKey: {
      prefix: 'sk_live_',
      length: 24,
    },
  },
}));

import {
  generateApiKey,
  extractApiKeyPrefix,
  hashApiKey,
  verifyApiKey,
  hashUrl,
  generateJobId,
  generateBatchId,
  generateRandomString,
  hashContent,
} from '../../../src/utils/crypto.js';

describe('Crypto Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate an API key with the correct prefix', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^sk_live_/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toEqual(key2);
    });

    it('should generate keys of consistent length', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1.length).toEqual(key2.length);
    });
  });

  describe('extractApiKeyPrefix', () => {
    it('should extract the first 12 characters', () => {
      const key = 'sk_live_abc1234567890xyz';
      const prefix = extractApiKeyPrefix(key);
      expect(prefix).toEqual('sk_live_abc1');
    });

    it('should handle short keys', () => {
      const key = 'short';
      const prefix = extractApiKeyPrefix(key);
      expect(prefix).toEqual('short');
    });
  });

  describe('hashApiKey', () => {
    it('should return a 64-character hex string', () => {
      const key = 'sk_live_test123';
      const hash = hashApiKey(key);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const key = 'sk_live_test123';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('key1');
      const hash2 = hashApiKey('key2');
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should return true for matching key and hash', () => {
      const key = 'sk_live_test123';
      const hash = hashApiKey(key);
      expect(verifyApiKey(key, hash)).toBe(true);
    });

    it('should return false for non-matching key', () => {
      const key = 'sk_live_test123';
      const hash = hashApiKey(key);
      expect(verifyApiKey('wrong_key', hash)).toBe(false);
    });

    it('should return false for non-matching hash', () => {
      const key = 'sk_live_test123';
      const wrongHash = 'a'.repeat(64);
      expect(verifyApiKey(key, wrongHash)).toBe(false);
    });

    it('should be timing-safe', () => {
      // This test ensures the function doesn't throw for edge cases
      const key = 'sk_live_test123';
      const hash = hashApiKey(key);
      
      // Should handle same length hashes
      expect(() => verifyApiKey(key, hash)).not.toThrow();
      
      // Should handle different length (return false, not throw)
      expect(verifyApiKey(key, 'short')).toBe(false);
    });
  });

  describe('hashUrl', () => {
    it('should return a 64-character hex string', () => {
      const url = 'https://example.com';
      const hash = hashUrl(url);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const url = 'https://example.com/path?query=1';
      const hash1 = hashUrl(url);
      const hash2 = hashUrl(url);
      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different URLs', () => {
      const hash1 = hashUrl('https://example1.com');
      const hash2 = hashUrl('https://example2.com');
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('generateJobId', () => {
    it('should generate a job ID with the correct prefix', () => {
      const id = generateJobId();
      expect(id).toMatch(/^job_/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateJobId();
      const id2 = generateJobId();
      expect(id1).not.toEqual(id2);
    });

    it('should include timestamp component', () => {
      const id = generateJobId();
      // Job ID format: job_<timestamp_base36><random>
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe('generateBatchId', () => {
    it('should generate a batch ID with the correct prefix', () => {
      const id = generateBatchId();
      expect(id).toMatch(/^batch_/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateBatchId();
      const id2 = generateBatchId();
      expect(id1).not.toEqual(id2);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of the specified length', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(32)).toHaveLength(32);
      expect(generateRandomString(1)).toHaveLength(1);
    });

    it('should generate unique strings', () => {
      const str1 = generateRandomString(20);
      const str2 = generateRandomString(20);
      expect(str1).not.toEqual(str2);
    });

    it('should only contain hex characters', () => {
      const str = generateRandomString(32);
      expect(str).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('hashContent', () => {
    it('should return a 64-character hex string', () => {
      const content = 'Hello, World!';
      const hash = hashContent(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const content = '<html><body>Test</body></html>';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);
      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = hashContent('content1');
      const hash2 = hashContent('content2');
      expect(hash1).not.toEqual(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashContent('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle unicode content', () => {
      const hash = hashContent('你好世界 🌍');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
