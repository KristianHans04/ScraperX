/**
 * Unit tests for input validation and sanitization middleware
 * Phase 12: Security Hardening - Deliverable 1.3
 * 
 * Tests input validation as specified in PHASE-12.md Section 4.3:
 * - SQL injection prevention
 * - XSS prevention
 * - Path traversal prevention
 * - Command injection prevention
 * - Email injection prevention
 * - URL validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inputValidation,
  isValidUrl,
  isValidEmail,
  isValidUuid,
  checkForSqlInjection,
  checkForXss,
  checkForPathTraversal,
  sanitizeString,
  sanitizeObject,
} from '../../../../src/api/middleware/inputValidation.js';

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Input Validation Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      id: 'test-request-id',
      ip: '127.0.0.1',
      url: '/api/test',
      method: 'POST',
      headers: {},
      body: {},
      query: {},
      params: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('SQL Injection Detection', () => {
    it('should detect basic SQL injection patterns', () => {
      expect(checkForSqlInjection("SELECT * FROM users")).toBe(true);
      expect(checkForSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(checkForSqlInjection("1 OR 1=1")).toBe(true);
      expect(checkForSqlInjection("UNION SELECT password FROM admin")).toBe(true);
    });

    it('should not flag safe strings', () => {
      expect(checkForSqlInjection("Hello World")).toBe(false);
      expect(checkForSqlInjection("user123")).toBe(false);
      expect(checkForSqlInjection("test@example.com")).toBe(false);
      expect(checkForSqlInjection("Hello selection")).toBe(false); // contains SELECT substring
    });

    it('should detect SQL injection in request body', async () => {
      mockRequest.body = { name: "'; DROP TABLE users; --" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      }));
    });

    it('should detect SQL injection in query parameters', async () => {
      mockRequest.query = { search: "1 UNION SELECT * FROM passwords" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      }));
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(checkForXss("<script>alert('xss')</script>")).toBe(true);
      expect(checkForXss("<script src='evil.js'></script>")).toBe(true);
    });

    it('should detect iframe injection', () => {
      expect(checkForXss("<iframe src='javascript:alert(1)'></iframe>")).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      expect(checkForXss("javascript:alert('xss')")).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(checkForXss("<img onerror=alert(1)>")).toBe(true);
      expect(checkForXss("<body onload=alert(1)>")).toBe(true);
    });

    it('should not flag safe strings', () => {
      expect(checkForXss("Hello World")).toBe(false);
      expect(checkForXss("This is a normal text")).toBe(false);
      expect(checkForXss("<div>Safe HTML</div>")).toBe(false);
    });

    it('should detect XSS in request body', async () => {
      mockRequest.body = { comment: "<script>stealCookies()</script>" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      }));
    });
  });

  describe('Path Traversal Detection', () => {
    it('should detect path traversal patterns', () => {
      expect(checkForPathTraversal("../../../etc/passwd")).toBe(true);
      expect(checkForPathTraversal("..\\windows\\system32")).toBe(true);
      expect(checkForPathTraversal("%2e%2e%2fetc%2fpasswd")).toBe(true);
    });

    it('should not flag safe paths', () => {
      expect(checkForPathTraversal("/safe/path/to/file.txt")).toBe(false);
      expect(checkForPathTraversal("my-file.pdf")).toBe(false);
    });

    it('should detect path traversal in URL params', async () => {
      mockRequest.params = { filename: "../../../etc/passwd" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      }));
    });
  });

  describe('URL Validation', () => {
    it('should validate valid HTTP URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/resource')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should reject non-HTTP protocols', () => {
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject URLs with XSS patterns', () => {
      expect(isValidUrl("https://example.com/?x=<script>alert(1)</script>")).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject emails over 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('UUID Validation', () => {
    it('should validate valid UUID v4', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUuid('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
  });

  describe('String Sanitization', () => {
    it('should remove null bytes', () => {
      expect(sanitizeString("hello\0world")).toBe("helloworld");
    });

    it('should trim whitespace', () => {
      expect(sanitizeString("  hello world  ")).toBe("hello world");
    });

    it('should truncate strings over max length', () => {
      const longString = 'a'.repeat(15000);
      const result = sanitizeString(longString);
      expect(result.length).toBe(10000);
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: "test\0user",
        nested: {
          value: "  spaced  ",
        },
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe("testuser");
      expect(result.nested.value).toBe("spaced");
    });

    it('should sanitize arrays', () => {
      const input = ['item1\0', '  item2  '];
      const result = sanitizeObject(input);

      expect(result[0]).toBe('item1');
      expect(result[1]).toBe('item2');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should preserve numbers and booleans', () => {
      const input = { count: 42, active: true };
      const result = sanitizeObject(input);

      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });

  describe('Request Body Sanitization', () => {
    it('should sanitize request body', async () => {
      mockRequest.body = {
        name: "  John Doe  ",
        description: "Has\0null\0bytes",
        nested: {
          value: "  spaced  ",
        },
      };

      await inputValidation(mockRequest, mockReply);

      expect(mockRequest.body.name).toBe("John Doe");
      expect(mockRequest.body.description).toBe("Hasnullbytes");
      expect(mockRequest.body.nested.value).toBe("spaced");
    });

    it('should handle empty body', async () => {
      mockRequest.body = null;

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Query Parameter Sanitization', () => {
    it('should sanitize query parameters', async () => {
      mockRequest.query = {
        search: "  query  ",
        filter: "test\0value",
      };

      await inputValidation(mockRequest, mockReply);

      expect(mockRequest.query.search).toBe("query");
      expect(mockRequest.query.filter).toBe("testvalue");
    });
  });

  describe('Path Parameter Sanitization', () => {
    it('should sanitize path parameters', async () => {
      mockRequest.params = {
        id: "  123  ",
        name: "test\0value",
      };

      await inputValidation(mockRequest, mockReply);

      expect(mockRequest.params.id).toBe("123");
      expect(mockRequest.params.name).toBe("testvalue");
    });
  });

  describe('Header Validation', () => {
    it('should detect malicious headers', async () => {
      mockRequest.headers['user-agent'] = "<script>alert(1)</script>";

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      }));
    });

    it('should allow safe headers', async () => {
      mockRequest.headers['user-agent'] = "Mozilla/5.0 (Windows NT 10.0)";
      mockRequest.headers['referer'] = "https://example.com";

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Exemption', () => {
    it('should skip validation for health check endpoints', async () => {
      mockRequest.url = '/health';
      mockRequest.body = { malicious: "'; DROP TABLE users; --" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should skip validation for root path', async () => {
      mockRequest.url = '/';
      mockRequest.body = { malicious: "<script>alert(1)</script>" };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Force an error by making body non-serializable
      mockRequest.body = {
        toJSON: () => { throw new Error('Serialization error'); },
      };

      await inputValidation(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      }));
    });
  });
});
