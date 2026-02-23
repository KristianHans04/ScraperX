/**
 * Unit tests for admin overview routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../../../src/api/middleware/requireAdmin.js', () => ({
  requireAdmin: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-0001', email: 'admin@scrapifie.com', role: 'admin', accountId: 'account-admin-001' };
    next();
  },
}));

vi.mock('../../../../../src/db/connection.js', () => ({
  getPool: vi.fn(() => mockPool),
}));

const mockPool = { query: vi.fn() };

import overviewRouter from '../../../../../src/api/routes/admin/overview.routes.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', overviewRouter);
  return app;
}

describe('Admin Overview Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it('should export router', () => {
    expect(overviewRouter).toBeDefined();
    expect(overviewRouter.stack).toBeDefined();
  });

  describe('GET / - Overview', () => {
    it('should return admin overview statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_users: '1000', active_users: '800', total_jobs: '50000',
            jobs_today: '200', tickets_open: '10', tickets_pending: '5',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ total_accounts: '500', mrr: '50000' }],
        });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalUsers: 1000,
        activeUsers: 800,
        totalJobs: 50000,
        jobsToday: 200,
        mrr: 50000,
        ticketsOpen: 10,
        ticketsPending: 5,
        systemHealth: 'healthy',
      });
    });

    it('should return 500 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch overview');
    });
  });

  describe('GET /stats', () => {
    it('should return simplified admin statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_users: '1000', total_jobs: '50000', tickets_open: '10' }],
      });

      const res = await request(app).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalUsers: 1000,
        totalJobs: 50000,
        ticketsOpen: 10,
      });
    });

    it('should return 500 on error', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/stats');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch statistics');
    });
  });

  describe('GET /activity', () => {
    it('should return recent activity', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '1', admin_email: 'admin@test.com', action: 'user.suspend',
          category: 'user_management', resource_type: 'user', resource_id: '123',
          created_at: new Date(),
        }],
      });

      const res = await request(app).get('/activity');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        activity: expect.any(Array),
      });
      expect(res.body.activity[0]).toMatchObject({
        adminEmail: 'admin@test.com',
        action: 'user.suspend',
        category: 'user_management',
      });
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app).get('/activity?limit=50');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [50]
      );
    });

    it('should return 500 on error', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/activity');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch activity');
    });
  });
});
