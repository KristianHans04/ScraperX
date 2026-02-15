/**
 * Unit tests for admin users routes
 * Phase 10: Admin Dashboard - User Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/db/connection', () => ({
  getPool: vi.fn(() => mockPool),
}));

vi.mock('../../../src/db/repositories/user.repository', () => ({
  userRepository: {
    findById: vi.fn(),
    updateRole: vi.fn(),
    softDelete: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/account.repository', () => ({
  accountRepository: {
    findById: vi.fn(),
    suspend: vi.fn(),
    unsuspend: vi.fn(),
    adjustCredits: vi.fn(),
    updatePlan: vi.fn(),
  },
}));

vi.mock('../../../src/api/middleware/auditLogger', () => ({
  auditLogger: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

const mockPool = { query: vi.fn() };

import usersRouter from '../../../src/api/routes/admin/users.routes.js';
import { userRepository } from '../../../src/db/repositories/user.repository.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { mockAdminUser, mockRegularUser, createMockRequest, createMockResponse } from '../../fixtures/admin.fixtures.js';

describe('Admin Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          rows: [
            { id: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'user', account_name: 'Account 1', plan: 'pro', credit_balance: 5000, status: 'active', jobs_count: '10' },
          ],
        });

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, query: { page: '1', limit: '20' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          users: expect.any(Array),
          pagination: expect.objectContaining({ total: 100 }),
        }));
      }
    });

    it('should apply search filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({ rows: [] });

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, query: { search: 'john' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), expect.any(Array));
      }
    });

    it('should apply status filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] }).mockResolvedValueOnce({ rows: [] });

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, query: { status: 'active' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('status'), expect.any(Array));
      }
    });
  });

  describe('GET /:id', () => {
    it('should return user details', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(accountRepository.findById).mockResolvedValue({
        id: mockRegularUser.accountId,
        displayName: 'Test Account',
        plan: 'pro',
        status: 'active',
        creditBalance: 5000,
        creditCycleUsage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '15' }] }).mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          user: expect.any(Object),
          account: expect.any(Object),
          jobsCount: 15,
          ticketsCount: 3,
        }));
      }
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id' && layer.route.methods.get);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: 'nonexistent' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);
      }
    });
  });

  describe('POST /:id/suspend', () => {
    it('should suspend user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(accountRepository.suspend).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/suspend' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id }, body: { reason: 'TOS violation' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(accountRepository.suspend).toHaveBeenCalledWith(mockRegularUser.accountId, 'TOS violation');
        expect(res.json).toHaveBeenCalledWith({ message: 'User suspended successfully' });
      }
    });
  });

  describe('POST /:id/unsuspend', () => {
    it('should unsuspend user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(accountRepository.unsuspend).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/unsuspend' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(accountRepository.unsuspend).toHaveBeenCalledWith(mockRegularUser.accountId);
      }
    });
  });

  describe('POST /:id/adjust-credits', () => {
    it('should adjust user credits', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(accountRepository.adjustCredits).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/adjust-credits' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id }, body: { amount: 1000, reason: 'Bonus' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(accountRepository.adjustCredits).toHaveBeenCalledWith(mockRegularUser.accountId, 1000, 'Bonus');
      }
    });

    it('should return 400 when amount or reason missing', async () => {
      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/adjust-credits' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id }, body: { amount: 1000 } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe('POST /:id/change-plan', () => {
    it('should change user plan', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(accountRepository.updatePlan).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/change-plan' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id }, body: { plan: 'enterprise' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(accountRepository.updatePlan).toHaveBeenCalledWith(mockRegularUser.accountId, 'enterprise');
      }
    });

    it('should return 400 for invalid plan', async () => {
      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/change-plan' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id }, body: { plan: 'invalid' } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe('POST /:id/promote', () => {
    it('should promote user to admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(userRepository.updateRole).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/promote' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(userRepository.updateRole).toHaveBeenCalledWith(mockRegularUser.id, 'admin');
      }
    });

    it('should return 400 if already admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockAdminUser);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/promote' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockAdminUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe('POST /:id/demote', () => {
    it('should demote admin to user', async () => {
      const anotherAdmin = { ...mockAdminUser, id: 'admin-0002' };
      vi.mocked(userRepository.findById).mockResolvedValue(anotherAdmin);
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      vi.mocked(userRepository.updateRole).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/demote' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: anotherAdmin.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(userRepository.updateRole).toHaveBeenCalledWith(anotherAdmin.id, 'user');
      }
    });

    it('should prevent demoting last admin', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockAdminUser);
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/demote' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockAdminUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe('DELETE /:id', () => {
    it('should soft delete user', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(userRepository.softDelete).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id' && layer.route.methods.delete);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(userRepository.softDelete).toHaveBeenCalledWith(mockRegularUser.id);
      }
    });
  });

  describe('POST /:id/verify-email', () => {
    it('should verify user email', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockRegularUser);
      vi.mocked(userRepository.verifyEmail).mockResolvedValue(undefined);

      const route = usersRouter.stack.find((layer: any) => layer.route?.path === '/:id/verify-email' && layer.route.methods.post);
      
      if (route?.route) {
        const req = createMockRequest({ user: mockAdminUser, params: { id: mockRegularUser.id } });
        const res = createMockResponse();
        await route.route.stack[route.route.stack.length - 1].handle(req, res, vi.fn());

        expect(userRepository.verifyEmail).toHaveBeenCalledWith(mockRegularUser.id);
      }
    });
  });
});
