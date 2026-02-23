/**
 * Unit tests for admin users routes
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

vi.mock('../../../../../src/api/middleware/adminSelfProtection.js', () => ({
  adminSelfProtection: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../../../src/api/middleware/auditLogger.js', () => ({
  auditLogger: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock('../../../../../src/db/connection.js', () => ({
  getPool: vi.fn(() => mockPool),
}));

vi.mock('../../../../../src/db/repositories/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
    updateRole: vi.fn(),
    softDelete: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock('../../../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
    suspend: vi.fn(),
    unsuspend: vi.fn(),
    adjustCredits: vi.fn(),
    updatePlan: vi.fn(),
  },
}));

const mockPool = { query: vi.fn() };

import usersRouter from '../../../../../src/api/routes/admin/users.routes.js';
import { userRepository } from '../../../../../src/db/repositories/user.repository.js';
import { accountRepository } from '../../../../../src/db/repositories/account.repository.js';
import { mockAdminUser, mockRegularUser } from '../../../../fixtures/admin.fixtures.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', usersRouter);
  return app;
}

const mockAccount = {
  id: mockRegularUser.accountId,
  displayName: 'Test Account',
  plan: 'pro',
  status: 'active',
  creditBalance: 5000,
  creditCycleUsage: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Admin Users Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it('should export router', () => {
    expect(usersRouter).toBeDefined();
    expect(usersRouter.stack).toBeDefined();
  });

  describe('GET /', () => {
    it('should return paginated users list', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'user',
            email_verified: true, last_login_at: null, created_at: new Date(),
            account_name: 'Account 1', plan: 'pro', credit_balance: 5000,
            account_status: 'active', jobs_count: '10',
          }],
        });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.pagination).toMatchObject({ total: 100 });
    });

    it('should apply search filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app).get('/?search=john');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });

    it('should apply status filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app).get('/?status=active');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.any(Array)
      );
    });

    it('should return 500 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('should return user details', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const res = await request(app).get(`/${mockRegularUser.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        user: expect.any(Object),
        account: expect.any(Object),
        jobsCount: 15,
        ticketsCount: 3,
      });
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null as any);

      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should return 404 when account not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(null as any);

      const res = await request(app).get(`/${mockRegularUser.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Account not found');
    });
  });

  describe('POST /:id/suspend', () => {
    it('should suspend user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.suspend).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockRegularUser.id}/suspend`)
        .send({ reason: 'TOS violation' });

      expect(res.status).toBe(200);
      expect(accountRepository.suspend).toHaveBeenCalledWith(mockRegularUser.accountId, 'TOS violation');
      expect(res.body.message).toBe('User suspended successfully');
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null as any);

      const res = await request(app).post('/nonexistent/suspend').send({ reason: 'test' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/unsuspend', () => {
    it('should unsuspend user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.unsuspend).mockResolvedValue(undefined as any);

      const res = await request(app).post(`/${mockRegularUser.id}/unsuspend`);

      expect(res.status).toBe(200);
      expect(accountRepository.unsuspend).toHaveBeenCalledWith(mockRegularUser.accountId);
    });
  });

  describe('POST /:id/adjust-credits', () => {
    it('should adjust user credits', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.adjustCredits).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockRegularUser.id}/adjust-credits`)
        .send({ amount: 1000, reason: 'Bonus' });

      expect(res.status).toBe(200);
      expect(accountRepository.adjustCredits).toHaveBeenCalledWith(mockRegularUser.accountId, 1000, 'Bonus');
    });

    it('should return 400 when amount or reason missing', async () => {
      const res = await request(app)
        .post(`/${mockRegularUser.id}/adjust-credits`)
        .send({ amount: 1000 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /:id/change-plan', () => {
    it('should change user plan', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(accountRepository.updatePlan).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockRegularUser.id}/change-plan`)
        .send({ plan: 'enterprise' });

      expect(res.status).toBe(200);
      expect(accountRepository.updatePlan).toHaveBeenCalledWith(mockRegularUser.accountId, 'enterprise');
    });

    it('should return 400 for invalid plan', async () => {
      const res = await request(app)
        .post(`/${mockRegularUser.id}/change-plan`)
        .send({ plan: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /:id/promote', () => {
    it('should promote user to admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(userRepository.updateRole).mockResolvedValue(undefined as any);

      const res = await request(app).post(`/${mockRegularUser.id}/promote`);

      expect(res.status).toBe(200);
      expect(userRepository.updateRole).toHaveBeenCalledWith(mockRegularUser.id, 'admin');
    });

    it('should return 400 if user is already admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockAdminUser as any);

      const res = await request(app).post(`/${mockAdminUser.id}/promote`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User is already an admin');
    });
  });

  describe('POST /:id/demote', () => {
    it('should demote admin to user', async () => {
      const anotherAdmin = { ...mockAdminUser, id: 'admin-0002' };
      vi.mocked(userRepository.findById).mockResolvedValue(anotherAdmin as any);
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      vi.mocked(userRepository.updateRole).mockResolvedValue(undefined as any);

      const res = await request(app).post(`/${anotherAdmin.id}/demote`);

      expect(res.status).toBe(200);
      expect(userRepository.updateRole).toHaveBeenCalledWith(anotherAdmin.id, 'user');
    });

    it('should prevent demoting last admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockAdminUser as any);
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const res = await request(app).post(`/${mockAdminUser.id}/demote`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot demote the last admin');
    });
  });

  describe('DELETE /:id', () => {
    it('should soft delete user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(userRepository.softDelete).mockResolvedValue(undefined as any);

      const res = await request(app).delete(`/${mockRegularUser.id}`);

      expect(res.status).toBe(200);
      expect(userRepository.softDelete).toHaveBeenCalledWith(mockRegularUser.id);
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null as any);

      const res = await request(app).delete('/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/verify-email', () => {
    it('should verify user email', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser as any);
      vi.mocked(userRepository.verifyEmail).mockResolvedValue(undefined as any);

      const res = await request(app).post(`/${mockRegularUser.id}/verify-email`);

      expect(res.status).toBe(200);
      expect(userRepository.verifyEmail).toHaveBeenCalledWith(mockRegularUser.id);
    });
  });
});
