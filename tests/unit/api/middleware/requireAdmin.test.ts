/**
 * Unit tests for requireAdmin middleware
 * Phase 10: Admin Dashboard - Security Layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin, AdminRequest } from '../../../../src/api/middleware/requireAdmin.js';
import { mockAdminUser, mockRegularUser, createMockResponse, createMockNext } from '../../fixtures/admin.fixtures.js';

describe('requireAdmin Middleware', () => {
  let mockRequest: Partial<AdminRequest>;
  let mockResponse: ReturnType<typeof createMockResponse>;
  let mockNext: ReturnType<typeof createMockNext>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      params: {},
      query: {},
      body: {},
    };
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    vi.clearAllMocks();
  });

  describe('Authentication Check', () => {
    it('should reject request when user is not authenticated', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user object is null', () => {
      mockRequest.user = null as any;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Authentication required',
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role Authorization', () => {
    it('should allow request when user has admin role', () => {
      mockRequest.user = mockAdminUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request when user has regular user role', () => {
      mockRequest.user = mockRegularUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        message: 'You do not have permission to access this resource',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user role is undefined', () => {
      mockRequest.user = { ...mockRegularUser, role: undefined as any };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Admin access required',
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user role is empty string', () => {
      mockRequest.user = { ...mockRegularUser, role: '' };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for moderator role (only admin allowed)', () => {
      mockRequest.user = { ...mockRegularUser, role: 'moderator' };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for superuser role (strict admin check)', () => {
      mockRequest.user = { ...mockRegularUser, role: 'superuser' };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Admin User Properties', () => {
    it('should preserve admin user object on request after successful check', () => {
      mockRequest.user = mockAdminUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockRequest.user).toEqual(mockAdminUser);
      expect(mockRequest.user?.id).toBe(mockAdminUser.id);
      expect(mockRequest.user?.email).toBe(mockAdminUser.email);
      expect(mockRequest.user?.role).toBe('admin');
    });

    it('should handle admin user with all properties', () => {
      const fullAdminUser = {
        ...mockAdminUser,
        accountId: 'account-admin-001',
      };
      mockRequest.user = fullAdminUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(fullAdminUser);
    });
  });

  describe('Case Sensitivity', () => {
    it('should reject request when role is Admin (case sensitive)', () => {
      mockRequest.user = { ...mockAdminUser, role: 'Admin' };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when role is ADMIN (case sensitive)', () => {
      mockRequest.user = { ...mockAdminUser, role: 'ADMIN' };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should return JSON response for unauthenticated requests', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      const responseData = mockResponse.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('message');
      expect(typeof responseData.error).toBe('string');
      expect(typeof responseData.message).toBe('string');
    });

    it('should return JSON response for unauthorized requests', () => {
      mockRequest.user = mockRegularUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      const responseData = mockResponse.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle request with minimal user object', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'admin',
        accountId: 'acc-123',
      };

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not modify response status code when admin check passes', () => {
      mockRequest.user = mockAdminUser;

      requireAdmin(mockRequest as AdminRequest, mockResponse, mockNext);

      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
