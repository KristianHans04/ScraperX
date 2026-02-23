/**
 * Unit tests for Usage Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createUsageRoutes } from '../../../../src/api/routes/usage.routes.js';
import { scrapeJobRepository } from '../../../../src/db/repositories/scrapeJob.repository.js';

vi.mock('../../../../src/api/middleware/authExpress.js', () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', accountId: 'account-123', email: 'test@example.com', role: 'user' };
    next();
  }),
}));

vi.mock('../../../../src/db/repositories/scrapeJob.repository.js', () => ({
  scrapeJobRepository: { findByAccount: vi.fn() },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', createUsageRoutes());
  return app;
}

const now = new Date();
const dayAgo = new Date(now.getTime() - 86400000);
const weekAgo = new Date(now.getTime() - 7 * 86400000);

const mockJobs = [
  { id: 'job-1', accountId: 'account-123', url: 'https://example.com/page1', engine: 'http', status: 'completed', creditsCharged: 10, createdAt: dayAgo.toISOString() },
  { id: 'job-2', accountId: 'account-123', url: 'https://example.com/page2', engine: 'http', status: 'completed', creditsCharged: 10, createdAt: dayAgo.toISOString() },
  { id: 'job-3', accountId: 'account-123', url: 'https://test.com/page', engine: 'browser', status: 'failed', creditsCharged: 5, createdAt: dayAgo.toISOString() },
];

describe('Usage Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('GET / - usage stats', () => {
    it('should return usage summary for default 30d period', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('period');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('byEngine');
      expect(res.body).toHaveProperty('byDay');
      expect(res.body.period).toBe('30d');
    });

    it('should calculate statistics correctly', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/');

      expect(res.body.stats.totalJobs).toBe(3);
      expect(res.body.stats.completedJobs).toBe(2);
      expect(res.body.stats.failedJobs).toBe(1);
      expect(res.body.stats.totalCredits).toBe(25);
    });

    it('should handle 7d period', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/?period=7d');

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('7d');
    });

    it('should handle 24h period', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/?period=24h');

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('24h');
    });

    it('should handle 90d period', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/?period=90d');

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('90d');
    });

    it('should return zero values when no jobs', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.stats.totalJobs).toBe(0);
      expect(res.body.stats.completedJobs).toBe(0);
      expect(res.body.stats.failedJobs).toBe(0);
      expect(res.body.stats.totalCredits).toBe(0);
      expect(res.body.stats.successRate).toBe('0');
    });

    it('should group jobs by engine', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/');

      expect(res.body.byEngine).toBeDefined();
      expect(res.body.byEngine['http']).toBe(2);
      expect(res.body.byEngine['browser']).toBe(1);
    });

    it('should group jobs by day', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/');

      expect(res.body.byDay).toBeDefined();
      expect(typeof res.body.byDay).toBe('object');
    });

    it('should filter out jobs outside the period', async () => {
      const oldJob = { ...mockJobs[0], id: 'old-job', createdAt: new Date('2020-01-01').toISOString() };
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([
        ...mockJobs,
        oldJob,
      ] as any);

      const res = await request(app).get('/?period=7d');

      expect(res.body.stats.totalJobs).toBeLessThan(4);
    });

    it('should calculate success rate correctly', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue(mockJobs as any);

      const res = await request(app).get('/');

      // 2 completed out of 3 total = 66.67%
      expect(res.body.stats.successRate).toBe('66.67');
    });

    it('should include startDate and endDate in response', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.body).toHaveProperty('startDate');
      expect(res.body).toHaveProperty('endDate');
    });

    it('should return 401 when requireAuth blocks the request', async () => {
      const { requireAuth } = await import('../../../../src/api/middleware/authExpress.js');
      vi.mocked(requireAuth).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(app).get('/');

      expect(res.status).toBe(401);
    });

    it('should return 500 on repository error', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch usage statistics');
    });
  });
});
