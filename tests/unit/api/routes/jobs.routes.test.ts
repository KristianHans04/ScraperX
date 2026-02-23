/**
 * Unit tests for Jobs Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createJobsRoutes } from '../../../../src/api/routes/jobs.routes.js';
import { scrapeJobRepository } from '../../../../src/db/repositories/scrapeJob.repository.js';

vi.mock('../../../../src/api/middleware/authExpress.js', () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', accountId: 'account-123', email: 'test@example.com', role: 'user' };
    next();
  }),
}));

vi.mock('../../../../src/db/repositories/scrapeJob.repository.js', () => ({
  scrapeJobRepository: {
    findByAccount: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', createJobsRoutes());
  return app;
}

const mockJob = {
  id: 'job-1',
  accountId: 'account-123',
  url: 'https://example.com',
  engine: 'http',
  status: 'completed',
  creditsCharged: 10,
  createdAt: '2024-03-15T10:00:00Z',
  completedAt: '2024-03-15T10:00:02Z',
  startedAt: '2024-03-15T10:00:01Z',
  errorMessage: null,
  resultId: 'result-1',
};

describe('Jobs Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('GET /', () => {
    it('should return paginated list of jobs', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed', url: 'https://test.com' },
      ]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('should return empty array when no jobs', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual([]);
    });

    it('should respect page and limit query params', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      await request(app).get('/?page=2&limit=10');

      expect(scrapeJobRepository.findByAccount).toHaveBeenCalledWith('account-123', { limit: 10, offset: 10 });
    });

    it('should cap limit at 100', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      await request(app).get('/?limit=200');

      expect(scrapeJobRepository.findByAccount).toHaveBeenCalledWith('account-123', { limit: 100, offset: 0 });
    });

    it('should map job fields correctly in response', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([mockJob]);

      const res = await request(app).get('/');

      expect(res.body.jobs[0]).toMatchObject({
        id: 'job-1',
        url: 'https://example.com',
        engine: 'http',
        status: 'completed',
        creditsUsed: 10,
      });
    });

    it('should return 500 on repository error', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch jobs');
    });
  });

  describe('GET /recent', () => {
    it('should return recent jobs with limit 10', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([mockJob]);

      const res = await request(app).get('/recent');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(scrapeJobRepository.findByAccount).toHaveBeenCalledWith('account-123', { limit: 10 });
    });

    it('should return empty array when no recent jobs', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([]);

      const res = await request(app).get('/recent');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual([]);
    });

    it('should map recent job fields correctly', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockResolvedValue([mockJob]);

      const res = await request(app).get('/recent');

      expect(res.body.jobs[0]).toMatchObject({
        id: 'job-1',
        url: 'https://example.com',
        engine: 'http',
        status: 'completed',
        creditsUsed: 10,
      });
    });

    it('should return 500 on error', async () => {
      vi.mocked(scrapeJobRepository.findByAccount).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/recent');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('should return job details', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const res = await request(app).get('/job-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('job-1');
      expect(res.body.status).toBe('completed');
      expect(res.body.url).toBe('https://example.com');
    });

    it('should include all required fields in response', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const res = await request(app).get('/job-1');

      expect(res.body).toMatchObject({
        id: 'job-1',
        url: 'https://example.com',
        engine: 'http',
        status: 'completed',
        creditsUsed: 10,
        resultId: 'result-1',
      });
    });

    it('should return 404 when job does not exist', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(null);

      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 404 when job belongs to a different account', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, accountId: 'other-account' });

      const res = await request(app).get('/job-1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should include error field for failed jobs', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'failed',
        errorMessage: 'Connection timeout',
      });

      const res = await request(app).get('/job-1');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('failed');
      expect(res.body.error).toBe('Connection timeout');
    });

    it('should return 500 on repository error', async () => {
      vi.mocked(scrapeJobRepository.findById).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/job-1');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /:id', () => {
    it('should cancel a pending job', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, status: 'pending' });
      vi.mocked(scrapeJobRepository.update).mockResolvedValue(undefined as any);

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(scrapeJobRepository.update).toHaveBeenCalledWith('job-1', {
        status: 'failed',
        errorMessage: 'Cancelled by user',
      });
    });

    it('should cancel a running job', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, status: 'running' });
      vi.mocked(scrapeJobRepository.update).mockResolvedValue(undefined as any);

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(200);
      expect(scrapeJobRepository.update).toHaveBeenCalledWith('job-1', {
        status: 'failed',
        errorMessage: 'Cancelled by user',
      });
    });

    it('should return 404 when job not found', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(null);

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 400 when cancelling a completed job', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, status: 'completed' });

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot cancel');
    });

    it('should return 400 when cancelling a failed job', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, status: 'failed' });

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(400);
    });

    it('should return 400 when job belongs to a different account', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({ ...mockJob, accountId: 'other-account' });

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(404);
    });

    it('should return 500 on repository error', async () => {
      vi.mocked(scrapeJobRepository.findById).mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/job-1');

      expect(res.status).toBe(500);
    });
  });
});
