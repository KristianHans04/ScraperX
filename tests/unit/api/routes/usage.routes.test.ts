/**
 * Unit tests for Usage Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usageRoutes } from '@api/routes/usage.routes.js';
import { 
  scrapeJobRepository, 
  apiKeyRepository,
  sessionRepository, 
  userRepository,
  accountRepository,
} from '../../../src/db/index.js';

// Mock the dependencies
vi.mock('../../../src/db/index', () => ({
  scrapeJobRepository: {
    findByAccountId: vi.fn(),
  },
  apiKeyRepository: {
    findByAccountId: vi.fn(),
  },
  sessionRepository: {
    get: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
  accountRepository: {
    findById: vi.fn(),
  },
}));

describe('Usage Routes', () => {
  let mockServer: any;
  let routeHandlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};
    mockServer = {
      get: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
      post: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
    };
  });

  const createMockRequest = (
    cookies: Record<string, string> = {},
    body: Record<string, any> = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ) => ({
    cookies,
    body,
    params,
    query,
  });

  const mockReply = () => ({
    code: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  });

  const mockUser = {
    id: 'user-123',
    accountId: 'account-123',
    email: 'test@example.com',
  };

  const mockJobs = [
    { id: 'job-1', accountId: 'account-123', apiKeyId: 'key-1', url: 'https://example.com/page1', engine: 'http', status: 'completed', creditsUsed: 10, duration: 1000, createdAt: '2024-03-15T10:00:00Z', completedAt: '2024-03-15T10:00:01Z' },
    { id: 'job-2', accountId: 'account-123', apiKeyId: 'key-1', url: 'https://example.com/page2', engine: 'http', status: 'completed', creditsUsed: 10, duration: 1500, createdAt: '2024-03-14T10:00:00Z', completedAt: '2024-03-14T10:00:02Z' },
    { id: 'job-3', accountId: 'account-123', apiKeyId: 'key-2', url: 'https://test.com/page', engine: 'browser', status: 'failed', creditsUsed: 5, duration: null, createdAt: '2024-03-13T10:00:00Z', completedAt: '2024-03-13T10:00:05Z' },
  ];

  describe('GET /api/usage/summary', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should return usage summary for 30 days by default', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/summary'](request);

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('successfulRequests');
      expect(result).toHaveProperty('failedRequests');
      expect(result).toHaveProperty('totalCreditsUsed');
      expect(result).toHaveProperty('avgResponseTime');
    });

    it('should calculate statistics correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/summary'](request);

      expect(result.totalRequests).toBe(3);
      expect(result.successfulRequests).toBe(2);
      expect(result.failedRequests).toBe(1);
      expect(result.totalCreditsUsed).toBe(25);
      expect(result.avgResponseTime).toBe(1250); // (1000 + 1500) / 2
    });

    it('should handle 7 day range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '7d' }
      );
      await routeHandlers['/api/usage/summary'](request);

      expect(scrapeJobRepository.findByAccountId).toHaveBeenCalled();
    });

    it('should handle 90 day range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '90d' }
      );
      await routeHandlers['/api/usage/summary'](request);

      expect(scrapeJobRepository.findByAccountId).toHaveBeenCalled();
    });

    it('should return zero values when no jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/summary'](request);

      expect(result.totalRequests).toBe(0);
      expect(result.successfulRequests).toBe(0);
      expect(result.failedRequests).toBe(0);
      expect(result.totalCreditsUsed).toBe(0);
      expect(result.avgResponseTime).toBe(0);
    });

    it('should handle jobs without duration', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], duration: null },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/summary'](request);

      expect(result.avgResponseTime).toBe(0);
    });

    it('should filter jobs by date range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      
      const oldJob = { ...mockJobs[0], createdAt: '2023-01-01T00:00:00Z' };
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        ...mockJobs,
        oldJob,
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '7d' }
      );
      const result = await routeHandlers['/api/usage/summary'](request);

      // Should not include the old job
      expect(result.totalRequests).toBeLessThan(4);
    });
  });

  describe('GET /api/usage/credits', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should return daily credit usage', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '7d' }
      );
      const result = await routeHandlers['/api/usage/credits'](request);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('credits');
    });

    it('should aggregate credits by date', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      
      const today = new Date().toISOString().split('T')[0];
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], createdAt: `${today}T10:00:00Z`, creditsUsed: 50 },
        { ...mockJobs[1], createdAt: `${today}T14:00:00Z`, creditsUsed: 30 },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '7d' }
      );
      const result = await routeHandlers['/api/usage/credits'](request);

      const todayEntry = result.find((r: any) => r.date === today);
      expect(todayEntry.credits).toBe(80);
    });

    it('should return all days even with no usage', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { range: '30d' }
      );
      const result = await routeHandlers['/api/usage/credits'](request);

      expect(result.length).toBe(30);
      expect(result.every((r: any) => r.credits === 0)).toBe(true);
    });
  });

  describe('GET /api/usage/engines', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should return engine breakdown', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/engines'](request);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('engine');
      expect(result[0]).toHaveProperty('requests');
      expect(result[0]).toHaveProperty('percentage');
    });

    it('should calculate percentages correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        ...mockJobs,
        { ...mockJobs[0], id: 'job-4', engine: 'stealth' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/engines'](request);

      const httpEntry = result.find((r: any) => r.engine === 'http');
      expect(httpEntry.requests).toBe(2);
      expect(httpEntry.percentage).toBe(50); // 2 out of 4
    });

    it('should return zero percentage when no jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/engines'](request);

      expect(result).toEqual([]);
    });
  });

  describe('GET /api/usage/top-domains', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should return top domains by request count', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        ...mockJobs,
        { ...mockJobs[0], id: 'job-4', url: 'https://example.com/another', creditsUsed: 15 },
        { ...mockJobs[0], id: 'job-5', url: 'https://test.com/page2' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/top-domains'](request);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('domain');
      expect(result[0]).toHaveProperty('requests');
      expect(result[0]).toHaveProperty('credits');
    });

    it('should sort by request count descending', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], url: 'https://popular.com/1' },
        { ...mockJobs[0], url: 'https://popular.com/2' },
        { ...mockJobs[0], url: 'https://popular.com/3' },
        { ...mockJobs[0], url: 'https://rare.com/1' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/top-domains'](request);

      expect(result[0].domain).toBe('popular.com');
      expect(result[0].requests).toBe(3);
      expect(result[1].domain).toBe('rare.com');
      expect(result[1].requests).toBe(1);
    });

    it('should aggregate credits per domain', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], url: 'https://example.com/1', creditsUsed: 10 },
        { ...mockJobs[0], url: 'https://example.com/2', creditsUsed: 20 },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/top-domains'](request);

      expect(result[0].credits).toBe(30);
    });

    it('should respect limit parameter', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], url: 'https://site1.com' },
        { ...mockJobs[0], url: 'https://site2.com' },
        { ...mockJobs[0], url: 'https://site3.com' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { limit: '2' }
      );
      const result = await routeHandlers['/api/usage/top-domains'](request);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle invalid URLs gracefully', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        ...mockJobs,
        { ...mockJobs[0], id: 'job-bad', url: 'not-a-valid-url' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/top-domains'](request);

      // Should not include invalid URL
      expect(result.every((r: any) => r.domain !== 'not-a-valid-url')).toBe(true);
    });
  });

  describe('GET /api/usage/api-keys', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should return usage per API key', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([
        { id: 'key-1', name: 'Production Key', accountId: 'account-123' },
        { id: 'key-2', name: 'Test Key', accountId: 'account-123' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/api-keys'](request);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('keyId');
      expect(result[0]).toHaveProperty('keyName');
      expect(result[0]).toHaveProperty('requests');
      expect(result[0]).toHaveProperty('credits');
    });

    it('should map key IDs to names', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([
        { id: 'key-1', name: 'Production Key', accountId: 'account-123' },
        { id: 'key-2', name: 'Test Key', accountId: 'account-123' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/api-keys'](request);

      const key1Entry = result.find((r: any) => r.keyId === 'key-1');
      expect(key1Entry.keyName).toBe('Production Key');
    });

    it('should show Unknown for deleted keys', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], apiKeyId: 'deleted-key' },
      ]);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/api-keys'](request);

      expect(result[0].keyName).toBe('Unknown');
    });

    it('should aggregate requests and credits per key', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJobs[0], apiKeyId: 'key-1', creditsUsed: 10 },
        { ...mockJobs[1], apiKeyId: 'key-1', creditsUsed: 20 },
        { ...mockJobs[2], apiKeyId: 'key-2', creditsUsed: 5 },
      ]);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([
        { id: 'key-1', name: 'Key 1', accountId: 'account-123' },
        { id: 'key-2', name: 'Key 2', accountId: 'account-123' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/usage/api-keys'](request);

      const key1Entry = result.find((r: any) => r.keyId === 'key-1');
      expect(key1Entry.requests).toBe(2);
      expect(key1Entry.credits).toBe(30);
    });
  });

  describe('POST /api/usage/export', () => {
    beforeEach(async () => {
      await usageRoutes(mockServer as any);
    });

    it('should export usage data as CSV', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { range: '30d' }
      );
      const reply = mockReply();
      const result = await routeHandlers['/api/usage/export'](request, reply);

      expect(reply.type).toHaveBeenCalledWith('text/csv');
      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('usage-')
      );
      expect(typeof result).toBe('string');
      expect(result).toContain('Date,URL,Engine,Status');
    });

    it('should filter by range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(mockJobs);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { range: '7d' }
      );
      const reply = mockReply();
      await routeHandlers['/api/usage/export'](request, reply);

      expect(scrapeJobRepository.findByAccountId).toHaveBeenCalled();
    });

    it('should include all job fields in CSV', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([mockJobs[0]]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { range: '30d' }
      );
      const reply = mockReply();
      const result = await routeHandlers['/api/usage/export'](request, reply);

      expect(result).toContain(mockJobs[0].url);
      expect(result).toContain(mockJobs[0].engine);
      expect(result).toContain(mockJobs[0].status);
      expect(result).toContain(mockJobs[0].creditsUsed.toString());
    });
  });
});
