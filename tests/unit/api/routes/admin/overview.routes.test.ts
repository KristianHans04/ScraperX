/**
 * Unit tests for admin overview routes
 * Phase 10: Admin Dashboard - Overview Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/db/connection', () => ({
  getPool: vi.fn(() => mockPool),
}));

const mockPool = {
  query: vi.fn(),
};

import overviewRouter from '../../../src/api/routes/admin/overview.routes.js';
import { mockAdminUser, createMockRequest, createMockResponse } from '../../fixtures/admin.fixtures.js';

describe('Admin Overview Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export router', () => {
    expect(overviewRouter).toBeDefined();
    expect(overviewRouter.stack).toBeDefined();
  });

  describe('GET /stats', () => {
    it('should return admin statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_users: '1000', active_users: '800', total_jobs: '50000', jobs_today: '200', tickets_open: '10', tickets_pending: '5' }] })
        .mockResolvedValueOnce({ rows: [{ mrr: '50000' }] })
        .mockResolvedValueOnce({ rows: [{ revenue: '55000' }] })
        .mockResolvedValueOnce({ rows: [{ degraded_services: '0' }] });

      const route = overviewRouter.stack.find((layer: any) => layer.route?.path === '/stats' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          totalUsers: 1000,
          mrr: 50000,
          systemHealth: 'healthy',
        }));
      }
    });

    it('should return 500 on error', async () => {
      mockPool.query.mockRejectedValue(new Error('DB Error'));

      const route = overviewRouter.stack.find((layer: any) => layer.route?.path === '/stats' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
      }
    });
  });

  describe('GET /activity', () => {
    it('should return recent activity', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', admin_email: 'admin@test.com', action: 'user.suspend', category: 'user_management', resource_type: 'user', resource_id: '123', created_at: new Date() },
        ],
      });

      const route = overviewRouter.stack.find((layer: any) => layer.route?.path === '/activity' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          activity: expect.any(Array),
        }));
      }
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const route = overviewRouter.stack.find((layer: any) => layer.route?.path === '/activity' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, query: { limit: '50' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT'), [50]);
      }
    });
  });
});
