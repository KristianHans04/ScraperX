/**
 * Unit tests for auth middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the imports before importing the module
vi.mock('../../../../src/db/index.js', () => ({
  apiKeyRepository: {
    findByHash: vi.fn(),
    findActiveByHash: vi.fn(),
    updateLastUsed: vi.fn().mockResolvedValue(undefined),
  },
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/crypto.js', () => ({
  hashApiKey: vi.fn((key: string) => `hash_${key}`),
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
    auth: {
      trustProxy: true,
    },
  },
}));

// Import after mocks are set up
import { authMiddleware, optionalAuthMiddleware, requireScope, requireFeature } from '../../../../src/api/middleware/auth.js';
import { apiKeyRepository, accountRepository } from '../../../../src/db/index.js';
import { mockApiKey, mockAccount } from '../../../fixtures/index.js';

describe('Auth Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
      query: {},
      ip: '127.0.0.1',
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
  });

  describe('authMiddleware', () => {
    it('should reject request without API key', async () => {
      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'MISSING_API_KEY',
        }),
      }));
    });

    it('should extract API key from Authorization Bearer header', async () => {
      mockRequest.headers.authorization = 'Bearer sk_live_test123';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await authMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toEqual(mockApiKey);
      expect(mockRequest.account).toEqual(mockAccount);
    });

    it('should extract API key from X-API-Key header', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await authMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toEqual(mockApiKey);
    });

    it('should extract API key from query parameter', async () => {
      mockRequest.query.api_key = 'sk_live_test123';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await authMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toEqual(mockApiKey);
    });

    it('should reject invalid API key', async () => {
      mockRequest.headers['x-api-key'] = 'invalid_key';
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(null);

      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_API_KEY',
        }),
      }));
    });

    it('should reject revoked API key', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue({
        ...mockApiKey,
        isActive: false,
      });

      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'REVOKED_API_KEY',
        }),
      }));
    });

    it('should reject expired API key', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue({
        ...mockApiKey,
        expiresAt: new Date('2020-01-01'), // Expired
      });

      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'EXPIRED_API_KEY',
        }),
      }));
    });

    it('should reject request from non-whitelisted IP', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      mockRequest.ip = '10.0.0.1';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue({
        ...mockApiKey,
        allowedIps: ['192.168.1.1'],
      });

      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'IP_NOT_ALLOWED',
        }),
      }));
    });

    it('should allow request from whitelisted IP', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      mockRequest.ip = '192.168.1.1';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue({
        ...mockApiKey,
        allowedIps: ['192.168.1.1'],
      });
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await authMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toBeDefined();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should extract client IP from X-Forwarded-For header', async () => {
      mockRequest.headers.authorization = 'Bearer sk_live_test123';
      mockRequest.headers['x-forwarded-for'] = '203.0.113.1, 70.41.3.18';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await authMiddleware(mockRequest, mockReply);

      expect(mockRequest.clientIp).toBe('203.0.113.1');
    });

    it('should reject suspended account', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      
      vi.mocked(apiKeyRepository.findByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue({
        ...mockAccount,
        status: 'suspended',
      });

      await authMiddleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'ACCOUNT_SUSPENDED',
        }),
      }));
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should continue without auth if no API key provided', async () => {
      await optionalAuthMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toBeUndefined();
      expect(mockRequest.account).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should authenticate if valid API key provided', async () => {
      mockRequest.headers['x-api-key'] = 'sk_live_test123';
      
      vi.mocked(apiKeyRepository.findActiveByHash).mockResolvedValue(mockApiKey);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await optionalAuthMiddleware(mockRequest, mockReply);

      expect(mockRequest.apiKey).toEqual(mockApiKey);
      expect(mockRequest.account).toEqual(mockAccount);
    });
  });

  describe('requireScope', () => {
    it('should reject unauthenticated request', async () => {
      const middleware = requireScope('scrape:write');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
    });

    it('should reject request without required scope', async () => {
      mockRequest.apiKey = { ...mockApiKey, scopes: ['scrape:read'] };
      
      const middleware = requireScope('scrape:write');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INSUFFICIENT_SCOPE',
        }),
      }));
    });

    it('should allow request with required scope', async () => {
      mockRequest.apiKey = { ...mockApiKey, scopes: ['scrape:read', 'scrape:write'] };
      
      const middleware = requireScope('scrape:write');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow request with wildcard scope', async () => {
      mockRequest.apiKey = { ...mockApiKey, scopes: ['*'] };
      
      const middleware = requireScope('admin:delete');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('requireFeature', () => {
    it('should reject unauthenticated request', async () => {
      const middleware = requireFeature('residentialProxies');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
    });

    it('should reject request without required feature', async () => {
      mockRequest.account = { ...mockAccount, plan: 'free' };
      
      const middleware = requireFeature('residentialProxies');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'FEATURE_NOT_AVAILABLE',
        }),
      }));
    });

    it('should allow request with required feature', async () => {
      mockRequest.account = { ...mockAccount, plan: 'enterprise' };
      
      const middleware = requireFeature('residentialProxies');
      await middleware(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });
});
