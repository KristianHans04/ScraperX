/**
 * Unit tests for API schemas
 */

import { describe, it, expect } from 'vitest';
import {
  cookieSchema,
  screenshotOptionsSchema,
  scenarioStepSchema,
  scrapeOptionsSchema,
  scrapeRequestSchema,
  batchScrapeRequestSchema,
  jobIdParamSchema,
  paginationQuerySchema,
} from '../../../src/api/schemas/index.js';

describe('API Schemas', () => {
  describe('cookieSchema', () => {
    it('should validate a minimal cookie', () => {
      const result = cookieSchema.safeParse({
        name: 'session',
        value: 'abc123',
      });
      expect(result.success).toBe(true);
    });

    it('should validate a full cookie', () => {
      const result = cookieSchema.safeParse({
        name: 'session',
        value: 'abc123',
        domain: '.example.com',
        path: '/',
        expires: 1704067200,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = cookieSchema.safeParse({
        name: '',
        value: 'test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sameSite', () => {
      const result = cookieSchema.safeParse({
        name: 'test',
        value: 'test',
        sameSite: 'Invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('screenshotOptionsSchema', () => {
    it('should use defaults', () => {
      const result = screenshotOptionsSchema.parse({});
      expect(result.fullPage).toBe(false);
      expect(result.format).toBe('png');
    });

    it('should validate quality range', () => {
      expect(screenshotOptionsSchema.safeParse({ quality: 1 }).success).toBe(true);
      expect(screenshotOptionsSchema.safeParse({ quality: 100 }).success).toBe(true);
      expect(screenshotOptionsSchema.safeParse({ quality: 0 }).success).toBe(false);
      expect(screenshotOptionsSchema.safeParse({ quality: 101 }).success).toBe(false);
    });

    it('should accept valid format', () => {
      expect(screenshotOptionsSchema.safeParse({ format: 'png' }).success).toBe(true);
      expect(screenshotOptionsSchema.safeParse({ format: 'jpeg' }).success).toBe(true);
      expect(screenshotOptionsSchema.safeParse({ format: 'gif' }).success).toBe(false);
    });
  });

  describe('scenarioStepSchema', () => {
    it('should validate click action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'click',
        selector: '#button',
      });
      expect(result.success).toBe(true);
    });

    it('should validate fill action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'fill',
        selector: '#input',
        value: 'hello',
      });
      expect(result.success).toBe(true);
    });

    it('should validate wait action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'wait',
        duration: 2000,
      });
      expect(result.success).toBe(true);
    });

    it('should validate scroll action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'scroll',
        x: 0,
        y: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should validate evaluate action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'evaluate',
        script: 'return document.title',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'invalid_action',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative timeout', () => {
      const result = scenarioStepSchema.safeParse({
        action: 'wait_for',
        selector: '#content',
        timeout: -1000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scrapeOptionsSchema', () => {
    it('should use default values', () => {
      const result = scrapeOptionsSchema.parse({});
      expect(result.renderJs).toBe(false);
      expect(result.timeout).toBe(30000);
      expect(result.screenshot).toBe(false);
      expect(result.pdf).toBe(false);
      expect(result.premiumProxy).toBe(false);
      expect(result.mobileProxy).toBe(false);
    });

    it('should validate timeout range', () => {
      expect(scrapeOptionsSchema.safeParse({ timeout: 1 }).success).toBe(true);
      expect(scrapeOptionsSchema.safeParse({ timeout: 120000 }).success).toBe(true);
      expect(scrapeOptionsSchema.safeParse({ timeout: 0 }).success).toBe(false);
      expect(scrapeOptionsSchema.safeParse({ timeout: 130000 }).success).toBe(false);
    });

    it('should validate waitMs range', () => {
      expect(scrapeOptionsSchema.safeParse({ waitMs: 1 }).success).toBe(true);
      expect(scrapeOptionsSchema.safeParse({ waitMs: 30000 }).success).toBe(true);
      expect(scrapeOptionsSchema.safeParse({ waitMs: 31000 }).success).toBe(false);
    });

    it('should validate country code length', () => {
      expect(scrapeOptionsSchema.safeParse({ country: 'US' }).success).toBe(true);
      expect(scrapeOptionsSchema.safeParse({ country: 'USA' }).success).toBe(false);
      expect(scrapeOptionsSchema.safeParse({ country: 'U' }).success).toBe(false);
    });

    it('should validate scenario array length', () => {
      const validScenario = Array(50).fill({ action: 'wait', duration: 100 });
      expect(scrapeOptionsSchema.safeParse({ scenario: validScenario }).success).toBe(true);
      
      const tooLong = Array(51).fill({ action: 'wait', duration: 100 });
      expect(scrapeOptionsSchema.safeParse({ scenario: tooLong }).success).toBe(false);
    });

    it('should validate cookies array length', () => {
      const validCookies = Array(100).fill({ name: 'test', value: 'value' });
      expect(scrapeOptionsSchema.safeParse({ cookies: validCookies }).success).toBe(true);
      
      const tooMany = Array(101).fill({ name: 'test', value: 'value' });
      expect(scrapeOptionsSchema.safeParse({ cookies: tooMany }).success).toBe(false);
    });

    it('should validate extract format', () => {
      const result = scrapeOptionsSchema.safeParse({
        extract: {
          title: 'h1',
          links: ['a.link', 'a.nav'],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('scrapeRequestSchema', () => {
    it('should validate minimal request', () => {
      const result = scrapeRequestSchema.safeParse({
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('GET');
      }
    });

    it('should validate full request', () => {
      const result = scrapeRequestSchema.safeParse({
        url: 'https://example.com/api',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key":"value"}',
        options: { renderJs: true },
        webhookUrl: 'https://webhook.example.com/hook',
        webhookSecret: 'secret123',
        clientReference: 'ref-123',
        idempotencyKey: 'idemp-456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(scrapeRequestSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
      expect(scrapeRequestSchema.safeParse({ url: '' }).success).toBe(false);
    });

    it('should reject invalid method', () => {
      const result = scrapeRequestSchema.safeParse({
        url: 'https://example.com',
        method: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should validate all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const method of methods) {
        const result = scrapeRequestSchema.safeParse({
          url: 'https://example.com',
          method,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject too long URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      const result = scrapeRequestSchema.safeParse({ url: longUrl });
      expect(result.success).toBe(false);
    });

    it('should reject too long body', () => {
      const largeBody = 'x'.repeat(1024 * 1024 + 1);
      const result = scrapeRequestSchema.safeParse({
        url: 'https://example.com',
        body: largeBody,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('batchScrapeRequestSchema', () => {
    it('should validate batch request', () => {
      const result = batchScrapeRequestSchema.safeParse({
        requests: [
          { url: 'https://example1.com' },
          { url: 'https://example2.com' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty batch', () => {
      const result = batchScrapeRequestSchema.safeParse({
        requests: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject too large batch', () => {
      const requests = Array(1001).fill({ url: 'https://example.com' });
      const result = batchScrapeRequestSchema.safeParse({ requests });
      expect(result.success).toBe(false);
    });

    it('should validate batch with options', () => {
      const result = batchScrapeRequestSchema.safeParse({
        requests: [{ url: 'https://example.com' }],
        webhookUrl: 'https://webhook.example.com/batch',
        clientReference: 'batch-001',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('jobIdParamSchema', () => {
    it('should validate valid job ID', () => {
      const result = jobIdParamSchema.safeParse({ id: 'job_abc123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty ID', () => {
      const result = jobIdParamSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationQuerySchema', () => {
    it('should use default values', () => {
      const result = paginationQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should transform string to number', () => {
      const result = paginationQuerySchema.parse({
        page: '5',
        limit: '50',
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should reject non-positive page', () => {
      const result = paginationQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('should validate status filter', () => {
      const statuses = ['pending', 'queued', 'running', 'completed', 'failed', 'canceled', 'timeout'];
      for (const status of statuses) {
        const result = paginationQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = paginationQuerySchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});
