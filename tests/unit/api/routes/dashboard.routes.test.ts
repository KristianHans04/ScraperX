/**
 * Unit tests for Dashboard API Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDashboardRoutes } from '../../../../src/api/routes/dashboard.routes.js';
import { scrapeJobRepository } from '../../../../src/db/repositories/scrapeJob.repository.js';
import { accountRepository } from '../../../../src/db/repositories/account.repository.js';
import { apiKeyRepository } from '../../../../src/db/repositories/apiKey.repository.js';

vi.mock('../../../../src/api/middleware/authExpress.js', () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', accountId: 'account-123', email: 'test@example.com', role: 'user' };
    next();
  }),
}));

vi.mock('../../../../src/db/repositories/scrapeJob.repository.js', () => ({
  scrapeJobRepository: { findByAccount: vi.fn() },
}));

vi.mock('../../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: { findById: vi.fn() },
}));

vi.mock('../../../../src/db/repositories/apiKey.repository.js', () => ({
  apiKeyRepository: { findByAccount: vi.fn() },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', createDashboardRoutes());
  return app;
}

const mockAccount = {
  id: 'account-123',
  creditBalance: 5000,
  plan: 'pro',
  status: 'active',
};

describe('Dashboard Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('GET /', () => {
    it('should return dashboard stats for authenticated user', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsCharged: 100 } as any,
        { id: 'job-2', status: 'completed', creditsCharged: 50 } as any,
        { id: 'job-3', status: 'failed', creditsCharged: 10 } as any,
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalJobs).toBe(3);
      expect(res.body.stats.completedJobs).toBe(2);
      expect(res.body.stats.failedJobs).toBe(1);
      expect(res.body.stats.creditsUsed).toBe(160);
      expect(res.body.stats.creditsRemaining).toBe(5000);
    });

    it('should return zero stats when no jobs exist', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.stats.totalJobs).toBe(0);
      expect(res.body.stats.creditsUsed).toBe(0);
      expect(res.body.stats.successRate).toBe('0');
    });

    it('should return 401 when requireAuth blocks the request', async () => {
      const { requireAuth } = await import('../../../../src/api/middleware/authExpress.js');
      vi.mocked(requireAuth).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(401);
    });

    it('should handle all job statuses correctly', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsCharged: 100 } as any,
        { id: 'job-2', status: 'completed', creditsCharged: 50 } as any,
        { id: 'job-3', status: 'failed', creditsCharged: 10 } as any,
        { id: 'job-4', status: 'pending', creditsCharged: 0 } as any,
        { id: 'job-5', status: 'running', creditsCharged: 0 } as any,
        { id: 'job-6', status: 'queued', creditsCharged: 5 } as any,
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.body.stats.totalJobs).toBe(6);
      expect(res.body.stats.completedJobs).toBe(2);
      expect(res.body.stats.activeJobs).toBe(3);
    });

    it('should round success rate to one decimal place', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([
        { id: 'job-1', status: 'completed', creditsCharged: 10 } as any,
        { id: 'job-2', status: 'completed', creditsCharged: 10 } as any,
        { id: 'job-3', status: 'failed', creditsCharged: 10 } as any,
      ]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.body.stats.successRate).toBe('66.7');
    });

    it('should handle account with zero credits', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue({ ...mockAccount, creditBalance: 0 } as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.body.stats.creditsRemaining).toBe(0);
    });

    it('should include account info in response', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.body.account).toBeDefined();
      expect(res.body.account.email).toBe('test@example.com');
      expect(res.body.account.plan).toBe('pro');
    });

    it('should include recent jobs in response', async () => {
      const job = { id: 'job-1', status: 'completed', creditsCharged: 10, url: 'https://example.com', createdAt: new Date().toISOString() } as any;
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([job]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(Array.isArray(res.body.recentJobs)).toBe(true);
    });

    it('should include api key count in stats', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([{ id: 'key-1' } as any, { id: 'key-2' } as any]);

      const res = await request(app).get('/');

      expect(res.body.stats.apiKeysCount).toBe(2);
    });

    it('should return 500 on repository error', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch dashboard data');
    });
  });
});
