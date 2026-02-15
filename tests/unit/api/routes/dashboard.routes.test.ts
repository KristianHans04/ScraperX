/**
 * Unit tests for Dashboard API Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardRoutes } from '@api/routes/dashboard.routes.js';
import { scrapeJobRepository, accountRepository, sessionRepository, userRepository } from '../../../src/db/index.js';

// Mock the repositories
vi.mock('../../../src/db/index', () => ({
  scrapeJobRepository: {
    findByAccountId: vi.fn(),
  },
  accountRepository: {
    findById: vi.fn(),
  },
  sessionRepository: {
    get: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
}));

describe('Dashboard Routes', () => {
  let mockServer: any;
  let routeHandlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};
    mockServer = {
      get: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
    };
  });

  const createMockRequest = (cookies: Record<string, string> = {}, query: Record<string, any> = {}) => ({
    cookies: cookies,
    query: query,
  });

  const mockUser = {
    id: 'user-123',
    accountId: 'account-123',
    email: 'test@example.com',
  };

  const mockAccount = {
    id: 'account-123',
    creditBalance: 5000,
    plan: 'pro',
    status: 'active',
  };

  describe('GET /api/dashboard/stats', () => {
    beforeEach(async () => {
      await dashboardRoutes(mockServer as any);
    });

    it('should return dashboard stats for authenticated user', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsUsed: 100 },
        { id: 'job-2', status: 'completed', creditsUsed: 50 },
        { id: 'job-3', status: 'failed', creditsUsed: 10 },
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/stats'](request);

      expect(result).toEqual({
        totalJobs: 3,
        successRate: 66.7,
        creditsUsed: 160,
        creditsRemaining: 5000,
      });
    });

    it('should return zero stats when no jobs exist', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/stats'](request);

      expect(result).toEqual({
        totalJobs: 0,
        successRate: 0,
        creditsUsed: 0,
        creditsRemaining: 5000,
      });
    });

    it('should throw UnauthorizedError when no session', async () => {
      const request = createMockRequest({});

      await expect(routeHandlers['/api/dashboard/stats'](request)).rejects.toThrow('Not authenticated');
    });

    it('should throw UnauthorizedError when session expired', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'expired-session' });

      await expect(routeHandlers['/api/dashboard/stats'](request)).rejects.toThrow('Session expired');
    });

    it('should throw UnauthorizedError when user not found', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'valid-session' });

      await expect(routeHandlers['/api/dashboard/stats'](request)).rejects.toThrow('User not found');
    });

    it('should handle all job statuses correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsUsed: 100 },
        { id: 'job-2', status: 'completed', creditsUsed: 50 },
        { id: 'job-3', status: 'failed', creditsUsed: 10 },
        { id: 'job-4', status: 'pending', creditsUsed: 0 },
        { id: 'job-5', status: 'running', creditsUsed: 0 },
        { id: 'job-6', status: 'cancelled', creditsUsed: 5 },
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/stats'](request);

      expect(result.totalJobs).toBe(6);
      expect(result.successRate).toBe(33.3); // 2 completed out of 6
      expect(result.creditsUsed).toBe(165);
    });

    it('should round success rate to one decimal place', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsUsed: 10 },
        { id: 'job-2', status: 'completed', creditsUsed: 10 },
        { id: 'job-3', status: 'failed', creditsUsed: 10 },
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/stats'](request);

      expect(result.successRate).toBe(66.7);
    });

    it('should handle account with zero credits', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue({
        ...mockAccount,
        creditBalance: 0,
      });

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/stats'](request);

      expect(result.creditsRemaining).toBe(0);
    });
  });

  describe('GET /api/dashboard/credit-usage', () => {
    beforeEach(async () => {
      await dashboardRoutes(mockServer as any);
    });

    it('should return credit usage for 7 days by default', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', createdAt: `${today}T10:00:00Z`, creditsUsed: 100 },
        { id: 'job-2', createdAt: `${yesterday}T10:00:00Z`, creditsUsed: 50 },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '7d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      expect(result).toHaveLength(7);
      expect(result[6].credits).toBe(100); // Today
      expect(result[5].credits).toBe(50);  // Yesterday
    });

    it('should handle 30 day range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '30d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      expect(result).toHaveLength(30);
    });

    it('should handle 90 day range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '90d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      expect(result).toHaveLength(90);
    });

    it('should aggregate multiple jobs on same day', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      
      const today = new Date().toISOString().split('T')[0];
      
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', createdAt: `${today}T10:00:00Z`, creditsUsed: 100 },
        { id: 'job-2', createdAt: `${today}T14:00:00Z`, creditsUsed: 50 },
        { id: 'job-3', createdAt: `${today}T18:00:00Z`, creditsUsed: 25 },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '7d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      const todayEntry = result.find((r: any) => r.date === today);
      expect(todayEntry.credits).toBe(175);
    });

    it('should filter out jobs outside the date range', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', createdAt: oldDate, creditsUsed: 999 },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '7d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      const totalCredits = result.reduce((sum: number, r: any) => sum + r.credits, 0);
      expect(totalCredits).toBe(0);
    });

    it('should return array with date and credits for each day', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { range: '7d' });
      const result = await routeHandlers['/api/dashboard/credit-usage'](request);

      result.forEach((entry: any) => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('credits');
        expect(typeof entry.date).toBe('string');
        expect(typeof entry.credits).toBe('number');
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      });
    });
  });

  describe('GET /api/dashboard/recent-jobs', () => {
    beforeEach(async () => {
      await dashboardRoutes(mockServer as any);
    });

    it('should return 5 recent jobs by default', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { id: 'job-1', url: 'https://example1.com', engine: 'http', status: 'completed', creditsUsed: 10, duration: 1000, createdAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:00:01Z' },
        { id: 'job-2', url: 'https://example2.com', engine: 'browser', status: 'failed', creditsUsed: 5, duration: null, createdAt: '2024-01-02T00:00:00Z', completedAt: null },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/recent-jobs'](request);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('url');
      expect(result[0]).toHaveProperty('engine');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('creditsUsed');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('completedAt');
    });

    it('should respect custom limit parameter', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(
        Array(10).fill(null).map((_, i) => ({
          id: `job-${i}`,
          url: `https://example${i}.com`,
          engine: 'http',
          status: 'completed',
          creditsUsed: 10,
          duration: 1000,
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:01Z',
        }))
      );

      const request = createMockRequest({ sessionId: 'valid-session' }, { limit: '3' });
      await routeHandlers['/api/dashboard/recent-jobs'](request);

      expect(scrapeJobRepository.findByAccountId).toHaveBeenCalledWith('account-123', {
        limit: 3,
        offset: 0,
      });
    });

    it('should parse limit as integer', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' }, { limit: '10' });
      await routeHandlers['/api/dashboard/recent-jobs'](request);

      expect(scrapeJobRepository.findByAccountId).toHaveBeenCalledWith(
        'account-123',
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should return empty array when no jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/recent-jobs'](request);

      expect(result).toEqual([]);
    });

    it('should include all required job fields', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        {
          id: 'job-1',
          url: 'https://example.com',
          engine: 'stealth',
          status: 'completed',
          creditsUsed: 50,
          duration: 5000,
          createdAt: '2024-03-15T10:00:00Z',
          completedAt: '2024-03-15T10:00:05Z',
        },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/dashboard/recent-jobs'](request);

      expect(result[0]).toEqual({
        id: 'job-1',
        url: 'https://example.com',
        engine: 'stealth',
        status: 'completed',
        creditsUsed: 50,
        duration: 5000,
        createdAt: '2024-03-15T10:00:00Z',
        completedAt: '2024-03-15T10:00:05Z',
      });
    });
  });
});
