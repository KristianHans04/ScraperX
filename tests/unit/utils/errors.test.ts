/**
 * Unit tests for error utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ScraperXError,
  InvalidApiKeyError,
  ExpiredApiKeyError,
  RevokedApiKeyError,
  MissingApiKeyError,
  IpNotAllowedError,
  AccountSuspendedError,
  InvalidUrlError,
  InvalidOptionsError,
  UrlNotAllowedError,
  BatchTooLargeError,
  InsufficientCreditsError,
  RateLimitedError,
  ConcurrentLimitError,
  JobNotFoundError,
  BatchNotFoundError,
  BlockedError,
  CaptchaRequiredError,
  CaptchaFailedError,
  TimeoutError,
  TargetError,
  TargetUnavailableError,
  InternalError,
  WorkerUnavailableError,
  ServiceMaintenanceError,
  ProxyError,
  ProxyAuthenticationError,
  DatabaseError,
  DatabaseConnectionError,
  isRetryableError,
  toScraperXError,
} from '../../../src/utils/errors.js';

describe('Error Utilities', () => {
  describe('ScraperXError', () => {
    it('should create error with all properties', () => {
      const error = new ScraperXError('Test error', 'TEST_CODE', 400, true, { foo: 'bar' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('ScraperXError');
    });

    it('should use default values', () => {
      const error = new ScraperXError('Test', 'CODE');
      
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(false);
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new ScraperXError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ScraperXError);
    });

    it('should capture stack trace', () => {
      const error = new ScraperXError('Test', 'CODE');
      expect(error.stack).toBeDefined();
    });
  });

  describe('Authentication Errors', () => {
    it('InvalidApiKeyError should have correct properties', () => {
      const error = new InvalidApiKeyError();
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.message).toBe('Invalid API key');
    });

    it('InvalidApiKeyError should accept custom message', () => {
      const error = new InvalidApiKeyError('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('ExpiredApiKeyError should have correct properties', () => {
      const error = new ExpiredApiKeyError();
      expect(error.code).toBe('EXPIRED_API_KEY');
      expect(error.statusCode).toBe(401);
    });

    it('RevokedApiKeyError should have correct properties', () => {
      const error = new RevokedApiKeyError();
      expect(error.code).toBe('REVOKED_API_KEY');
      expect(error.statusCode).toBe(401);
    });

    it('MissingApiKeyError should have correct properties', () => {
      const error = new MissingApiKeyError();
      expect(error.code).toBe('MISSING_API_KEY');
      expect(error.statusCode).toBe(401);
    });

    it('IpNotAllowedError should have correct properties', () => {
      const error = new IpNotAllowedError();
      expect(error.code).toBe('IP_NOT_ALLOWED');
      expect(error.statusCode).toBe(403);
    });

    it('AccountSuspendedError should have correct properties', () => {
      const error = new AccountSuspendedError();
      expect(error.code).toBe('ACCOUNT_SUSPENDED');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('Validation Errors', () => {
    it('InvalidUrlError should have correct properties', () => {
      const error = new InvalidUrlError();
      expect(error.code).toBe('INVALID_URL');
      expect(error.statusCode).toBe(400);
    });

    it('InvalidOptionsError should have correct properties', () => {
      const error = new InvalidOptionsError();
      expect(error.code).toBe('INVALID_OPTIONS');
      expect(error.statusCode).toBe(400);
    });

    it('UrlNotAllowedError should have correct properties', () => {
      const error = new UrlNotAllowedError();
      expect(error.code).toBe('URL_NOT_ALLOWED');
      expect(error.statusCode).toBe(400);
    });

    it('BatchTooLargeError should include max size in message', () => {
      const error = new BatchTooLargeError(1000);
      expect(error.code).toBe('BATCH_TOO_LARGE');
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('1000');
    });
  });

  describe('Resource Errors', () => {
    it('InsufficientCreditsError should include credit details', () => {
      const error = new InsufficientCreditsError(100, 50);
      expect(error.code).toBe('INSUFFICIENT_CREDITS');
      expect(error.statusCode).toBe(402);
      expect(error.message).toContain('100');
      expect(error.message).toContain('50');
      expect(error.details).toEqual({ required: 100, available: 50 });
    });

    it('RateLimitedError should be retryable', () => {
      const error = new RateLimitedError(60);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
    });

    it('ConcurrentLimitError should include limit', () => {
      const error = new ConcurrentLimitError(50);
      expect(error.code).toBe('CONCURRENT_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });

    it('JobNotFoundError should include job ID', () => {
      const error = new JobNotFoundError('job_123');
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('job_123');
    });

    it('BatchNotFoundError should include batch ID', () => {
      const error = new BatchNotFoundError('batch_456');
      expect(error.code).toBe('BATCH_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('batch_456');
    });
  });

  describe('Scraping Errors', () => {
    it('BlockedError should be retryable with suggestions', () => {
      const error = new BlockedError();
      expect(error.code).toBe('BLOCKED');
      expect(error.statusCode).toBe(403);
      expect(error.retryable).toBe(true);
      expect(error.suggestions.length).toBeGreaterThan(0);
    });

    it('BlockedError should accept custom suggestions', () => {
      const suggestions = ['Try a different approach'];
      const error = new BlockedError('Blocked!', suggestions);
      expect(error.suggestions).toEqual(suggestions);
    });

    it('CaptchaRequiredError should include captcha type', () => {
      const error = new CaptchaRequiredError('recaptcha_v2');
      expect(error.code).toBe('CAPTCHA_REQUIRED');
      expect(error.statusCode).toBe(403);
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ captchaType: 'recaptcha_v2' });
    });

    it('CaptchaFailedError should have correct properties', () => {
      const error = new CaptchaFailedError();
      expect(error.code).toBe('CAPTCHA_FAILED');
      expect(error.retryable).toBe(true);
    });

    it('TimeoutError should include timeout value', () => {
      const error = new TimeoutError(30000);
      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(408);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('30000');
    });

    it('TargetError should include target status code', () => {
      const error = new TargetError(503);
      expect(error.code).toBe('TARGET_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ targetStatusCode: 503 });
    });

    it('TargetUnavailableError should have correct properties', () => {
      const error = new TargetUnavailableError();
      expect(error.code).toBe('TARGET_UNAVAILABLE');
      expect(error.statusCode).toBe(502);
      expect(error.retryable).toBe(true);
    });
  });

  describe('System Errors', () => {
    it('InternalError should be retryable', () => {
      const error = new InternalError();
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('WorkerUnavailableError should be retryable', () => {
      const error = new WorkerUnavailableError();
      expect(error.code).toBe('WORKER_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
    });

    it('ServiceMaintenanceError should not be retryable', () => {
      const error = new ServiceMaintenanceError();
      expect(error.code).toBe('SERVICE_MAINTENANCE');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(false);
    });
  });

  describe('Proxy Errors', () => {
    it('ProxyError should be retryable', () => {
      const error = new ProxyError();
      expect(error.code).toBe('PROXY_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.retryable).toBe(true);
    });

    it('ProxyAuthenticationError should be retryable', () => {
      const error = new ProxyAuthenticationError();
      expect(error.code).toBe('PROXY_AUTH_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.retryable).toBe(true);
    });
  });

  describe('Database Errors', () => {
    it('DatabaseError should be retryable', () => {
      const error = new DatabaseError();
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('DatabaseConnectionError should be retryable', () => {
      const error = new DatabaseConnectionError();
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable ScraperXError', () => {
      expect(isRetryableError(new TimeoutError(1000))).toBe(true);
      expect(isRetryableError(new RateLimitedError(60))).toBe(true);
      expect(isRetryableError(new BlockedError())).toBe(true);
    });

    it('should return false for non-retryable ScraperXError', () => {
      expect(isRetryableError(new InvalidApiKeyError())).toBe(false);
      expect(isRetryableError(new InvalidUrlError())).toBe(false);
      expect(isRetryableError(new ServiceMaintenanceError())).toBe(false);
    });

    it('should return false for regular Error', () => {
      expect(isRetryableError(new Error('test'))).toBe(false);
    });
  });

  describe('toScraperXError', () => {
    it('should return same error if already ScraperXError', () => {
      const original = new InvalidApiKeyError();
      const result = toScraperXError(original);
      expect(result).toBe(original);
    });

    it('should convert regular Error to InternalError', () => {
      const original = new Error('Something went wrong');
      const result = toScraperXError(original);
      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('Something went wrong');
    });

    it('should convert unknown value to InternalError', () => {
      const result = toScraperXError('string error');
      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe('An unknown error occurred');
    });

    it('should handle null/undefined', () => {
      expect(toScraperXError(null)).toBeInstanceOf(InternalError);
      expect(toScraperXError(undefined)).toBeInstanceOf(InternalError);
    });
  });
});
