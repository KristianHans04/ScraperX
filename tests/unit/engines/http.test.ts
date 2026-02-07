/**
 * HTTP Engine Tests for ScraperX
 *
 * Tests for HTTP scraping engine functionality using undici.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These mocks are hoisted by Vitest - define inline to avoid reference issues
vi.mock('undici', () => {
  const mockRequest = vi.fn();
  return { request: mockRequest };
});

vi.mock('cheerio', () => ({
  load: vi.fn((html: string) => {
    const mockElement = {
      text: () => 'Mock Text',
      attr: (name: string) => name === 'content' ? 'Mock description' : null,
      map: () => ({ get: () => ['Item 1', 'Item 2'] }),
      length: 1,
    };
    
    return (selector: string) => {
      if (selector === 'title') return { text: () => 'Test Title', trim: () => 'Test Title' };
      if (selector === 'meta[name="description"]') return { attr: () => 'Test description' };
      if (selector === 'link[rel="canonical"]') return { attr: () => 'https://example.com' };
      return mockElement;
    };
  }),
}));

// Mock the logger to avoid pino-pretty issues
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
    httpEngine: {
      userAgent: 'ScraperX/1.0',
    },
    scraping: {
      timeoutMs: 30000,
    },
    isDevelopment: false,
  },
}));

import { request } from 'undici';
import type { ScrapeOptions, Cookie } from '../../../src/types/index.js';

// Get mocked request function
const mockRequest = vi.mocked(request);

describe('HttpEngine', () => {
  const defaultOptions: ScrapeOptions = {
    renderJs: false,
    timeout: 30000,
    screenshot: false,
    pdf: false,
    premiumProxy: false,
    mobileProxy: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockResponse = (overrides: Partial<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }> = {}) => {
    const body = overrides.body || '<html><title>Test</title><body>Hello</body></html>';
    return {
      statusCode: overrides.statusCode || 200,
      headers: overrides.headers || { 'content-type': 'text/html' },
      body: {
        arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode(body).buffer),
      },
    };
  };

  describe('HTTP Request Execution', () => {
    it('should make basic HTTP request', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      // Import dynamically to get mocked version
      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockRequest).toHaveBeenCalled();
    });

    it('should include default headers', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            'Accept': expect.any(String),
          }),
        })
      );
    });

    it('should use POST method when specified', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      await engine.execute({
        url: 'https://example.com/api',
        method: 'POST',
        body: '{"test": true}',
        options: defaultOptions,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          body: '{"test": true}',
        })
      );
    });

    it('should include custom headers', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      await engine.execute({
        url: 'https://example.com',
        headers: { 'X-Custom-Header': 'custom-value' },
        options: defaultOptions,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should include cookies in request', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      const cookies: Cookie[] = [
        { name: 'session', value: 'abc123' },
        { name: 'token', value: 'xyz789' },
      ];

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      await engine.execute({
        url: 'https://example.com',
        options: { ...defaultOptions, cookies },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'session=abc123; token=xyz789',
          }),
        })
      );
    });
  });

  describe('Response Status Handling', () => {
    it('should return success=true for 2xx status codes', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ statusCode: 200 }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(true);
    });

    it('should return success=true for 3xx status codes', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ statusCode: 301 }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(true);
    });

    it('should return success=false for 5xx status codes', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ 
        statusCode: 500,
        body: 'Server Error',
      }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Block Detection', () => {
    it('should detect 403 as blocked', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ 
        statusCode: 403,
        body: 'Forbidden',
      }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BLOCKED');
    });

    it('should detect 429 as blocked', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ 
        statusCode: 429,
        body: 'Too Many Requests',
      }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BLOCKED');
    });

    it('should detect captcha content as blocked', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse({ 
        statusCode: 200,
        body: '<html><body>Please verify you are human by solving the CAPTCHA</body></html>',
      }) as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BLOCKED');
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      mockRequest.mockRejectedValueOnce(timeoutError);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const { TimeoutError: AppTimeoutError } = await import('../../../src/utils/errors.js');
      const engine = new HttpEngine();

      await expect(
        engine.execute({
          url: 'https://example.com',
          options: defaultOptions,
        })
      ).rejects.toThrow(AppTimeoutError);
    });

    it('should handle connection refused errors', async () => {
      mockRequest.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const { TargetUnavailableError } = await import('../../../src/utils/errors.js');
      const engine = new HttpEngine();

      await expect(
        engine.execute({
          url: 'https://example.com',
          options: defaultOptions,
        })
      ).rejects.toThrow(TargetUnavailableError);
    });

    it('should return error result for other errors', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Unknown network error'));

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_ERROR');
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('Timing', () => {
    it('should return timing information', async () => {
      mockRequest.mockResolvedValueOnce(createMockResponse() as any);

      const { HttpEngine } = await import('../../../src/engines/http/index.js');
      const engine = new HttpEngine();

      const result = await engine.execute({
        url: 'https://example.com',
        options: defaultOptions,
      });

      expect(result.timing).toBeDefined();
      expect(result.timing?.totalMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('HttpEngine Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new HttpEngine instance with createHttpEngine', async () => {
    const { createHttpEngine, HttpEngine } = await import('../../../src/engines/http/index.js');
    const engine = createHttpEngine();
    expect(engine).toBeInstanceOf(HttpEngine);
  });

  it('should return singleton with getHttpEngine', async () => {
    const { getHttpEngine } = await import('../../../src/engines/http/index.js');
    const engine1 = getHttpEngine();
    const engine2 = getHttpEngine();
    expect(engine1).toBe(engine2);
  });
});
