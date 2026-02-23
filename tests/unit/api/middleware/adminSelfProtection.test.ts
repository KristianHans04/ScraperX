/**
 * Unit tests for adminSelfProtection middleware
 * Phase 10: Admin Dashboard - Self-Protection Security Layer
 * 
 * Ensures admins cannot perform dangerous actions on themselves
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminSelfProtection } from '../../../../src/api/middleware/adminSelfProtection.js';
import { AdminRequest } from '../../../../src/api/middleware/requireAdmin.js';
import { mockAdminUser, mockRegularUser, createMockResponse, createMockNext } from '../../../fixtures/admin.fixtures.js';

describe('adminSelfProtection Middleware', () => {
  let mockRequest: Partial<AdminRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockNext: ReturnType<typeof createMockNext>;

  beforeEach(() => {
    mockRequest = {
      user: mockAdminUser,
      params: {},
      path: '',
    };
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    vi.clearAllMocks();
  });

  describe('Authentication Check', () => {
    it('should reject request when user is not authenticated', () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user is null', () => {
      mockRequest.user = null as any;
      mockRequest.params = { id: 'some-id' };

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('No Target User ID', () => {
    it('should call next when no target user ID is provided', () => {
      mockRequest.params = {};
      mockRequest.path = '/api/admin/users';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when params is empty', () => {
      mockRequest.params = {};
      mockRequest.path = '/api/admin/overview';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next for list endpoints without user ID', () => {
      mockRequest.params = {};
      mockRequest.path = '/api/admin/tickets';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Dangerous Actions - Self-Protection', () => {
    it('should block self-suspend action', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Self-modification not allowed',
        message: 'You cannot perform this action on your own account',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block self-demotion action', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/demote';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block self-delete action', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block self-ban action', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/ban';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block self-restrict action', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/restrict';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Safe Actions - No Self-Protection Needed', () => {
    it('should allow viewing own profile', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow safe actions on other users', () => {
      mockRequest.params = { id: mockRegularUser.id };
      mockRequest.path = '/api/admin/users/user-0001';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow suspend action on other users', () => {
      mockRequest.params = { id: mockRegularUser.id };
      mockRequest.path = '/api/admin/users/user-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow demote action on other admins', () => {
      const otherAdmin = { ...mockAdminUser, id: 'admin-0002' };
      mockRequest.params = { id: otherAdmin.id };
      mockRequest.path = `/api/admin/users/${otherAdmin.id}/demote`;

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow delete action on other users', () => {
      mockRequest.params = { id: mockRegularUser.id };
      mockRequest.path = '/api/admin/users/user-0001';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Alternative Parameter Names', () => {
    it('should handle userId parameter', () => {
      mockRequest.params = { userId: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prioritize id over userId when both present', () => {
      mockRequest.params = { id: mockRegularUser.id, userId: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/user-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Path Matching', () => {
    it('should detect dangerous action in path containing suspend', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should detect dangerous action anywhere in path', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/some/nested/path/suspend/action';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle path with multiple segments', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/v1/admin/users/admin-0001/suspend/now';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Response Format', () => {
    it('should return proper error format for self-protection violation', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Self-modification not allowed',
        message: 'You cannot perform this action on your own account',
      });
    });

    it('should return 403 status code for self-protection violations', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = '/api/admin/users/admin-0001/delete';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case where path is undefined', () => {
      mockRequest.params = { id: mockAdminUser.id };
      mockRequest.path = undefined as any;

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle case where params is undefined', () => {
      mockRequest.params = undefined as any;

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow action when IDs do not match', () => {
      mockRequest.params = { id: 'different-admin-id' };
      mockRequest.path = '/api/admin/users/different-admin-id/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block when target ID matches even with different format', () => {
      mockRequest.user = { ...mockAdminUser, id: 'ADMIN-0001' };
      mockRequest.params = { id: 'ADMIN-0001' };
      mockRequest.path = '/api/admin/users/ADMIN-0001/suspend';

      adminSelfProtection(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
