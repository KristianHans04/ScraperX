/**
 * Unit tests for rate limit middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define mockRateLimiter outside the mock
const mockRateLimiter = {
  isRateLimited: vi.fn(),
  checkConcurrent: vi.fn(),
  releaseConcurrent: vi.fn(),
};

// Define mocks inline to avoid hoisting issues
vi.mock('../../../../src/queue/redis.js', () => ({
  createRateLimiter: vi.fn().mockResolvedValue(mockRateLimiter),
  RedisRateLimiter: vi.fn(),
  getRateLimiter: vi.fn().mockReturnValue(mockRateLimiter),
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    rateLimit: {
      windowMs: 1000,
      maxRequests: 10,
    },
  },
}));

import { 
  rateLimitMiddleware, 
  concurrentLimitMiddleware, 
  releaseConcurrentSlot,
  checkCreditsMiddleware,
} from '../../../../src/api/middleware/rateLimit.js';
import { mockAccount, mockApiKey } from '../../../fixtures/index.js';

describe('Rate Limit Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      account: mockAccount,
      apiKey: mockApiKey,
      requestContext: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
  });

  describe('rateLimitMiddleware', () => {
    it('should skip rate limiting for unauthenticated requests', async () => {
      mockRequest.account = undefined;

      await rateLimitMiddleware(mockRequest, mockReply);

      expect(mockRateLimiter.isRateLimited).not.toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      mockRateLimiter.isRateLimited.mockResolvedValue({
        limited: false,
        remaining: 9,
        resetAt: Date.now() + 1000,
      });

      await rateLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding rate limit', async () => {
      mockRateLimiter.isRateLimited.mockResolvedValue({
        limited: true,
        remaining: 0,
        resetAt: Date.now() + 500,
      });

      await rateLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RATE_LIMITED',
          retryable: true,
        }),
      }));
    });

    it('should set Retry-After header when rate limited', async () => {
      mockRateLimiter.isRateLimited.mockResolvedValue({
        limited: true,
        remaining: 0,
        resetAt: Date.now() + 2000,
      });

      await rateLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should use API key rate limit override', async () => {
      mockRequest.apiKey = { ...mockApiKey, rateLimitOverride: 100 };
      mockRateLimiter.isRateLimited.mockResolvedValue({
        limited: false,
        remaining: 99,
        resetAt: Date.now() + 1000,
      });

      await rateLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });
  });

  describe('concurrentLimitMiddleware', () => {
    it('should skip for unauthenticated requests', async () => {
      mockRequest.account = undefined;

      await concurrentLimitMiddleware(mockRequest, mockReply);

      expect(mockRateLimiter.checkConcurrent).not.toHaveBeenCalled();
    });

    it('should allow requests within concurrent limit', async () => {
      mockRateLimiter.checkConcurrent.mockResolvedValue({
        allowed: true,
        current: 10,
        token: 'test-token',
      });

      await concurrentLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Concurrent-Limit', '10');
      expect(mockReply.header).toHaveBeenCalledWith('X-Concurrent-Active', '10');
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding concurrent limit', async () => {
      mockRateLimiter.checkConcurrent.mockResolvedValue({
        allowed: false,
        current: 50,
      });

      await concurrentLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'CONCURRENT_LIMIT',
        }),
      }));
    });

    it('should store concurrent token in request context', async () => {
      mockRateLimiter.checkConcurrent.mockResolvedValue({
        allowed: true,
        current: 5,
        token: 'token-123',
      });

      await concurrentLimitMiddleware(mockRequest, mockReply);

      expect(mockRequest.requestContext.concurrentToken).toBe('token-123');
    });

    it('should use API key concurrent override', async () => {
      mockRequest.apiKey = { ...mockApiKey, maxConcurrentOverride: 200 };
      mockRateLimiter.checkConcurrent.mockResolvedValue({
        allowed: true,
        current: 50,
        token: 'token',
      });

      await concurrentLimitMiddleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Concurrent-Limit', '200');
    });
  });

  describe('releaseConcurrentSlot', () => {
    it('should do nothing if no concurrent token', async () => {
      mockRequest.requestContext = {};

      await releaseConcurrentSlot(mockRequest);

      expect(mockRateLimiter.releaseConcurrent).not.toHaveBeenCalled();
    });

    it('should release slot when token exists', async () => {
      mockRequest.requestContext = {
        concurrentToken: 'token-123',
        concurrentKey: 'org:test-org',
      };

      await releaseConcurrentSlot(mockRequest);

      expect(mockRateLimiter.releaseConcurrent).toHaveBeenCalledWith(
        'org:test-org',
        'token-123'
      );
    });
  });

  describe('checkCreditsMiddleware', () => {
    it('should skip for unauthenticated requests', async () => {
      mockRequest.account = undefined;

      await checkCreditsMiddleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should skip for enterprise plans', async () => {
      mockRequest.account = { ...mockAccount, plan: 'enterprise' };
      mockRequest.estimatedCredits = 1000000;

      await checkCreditsMiddleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow request with sufficient credits', async () => {
      mockRequest.account = { ...mockAccount, creditBalance: 1000 };
      mockRequest.estimatedCredits = 10;

      await checkCreditsMiddleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject request with insufficient credits', async () => {
      mockRequest.account = { ...mockAccount, creditBalance: 5 };
      mockRequest.estimatedCredits = 10;

      await checkCreditsMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(402);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INSUFFICIENT_CREDITS',
          details: {
            required: 10,
            available: 5,
          },
        }),
      }));
    });

    it('should use default of 1 credit when not specified', async () => {
      mockRequest.account = { ...mockAccount, creditBalance: 0 };
      delete mockRequest.estimatedCredits;

      await checkCreditsMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(402);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            required: 1,
          }),
        }),
      }));
    });
  });
});
