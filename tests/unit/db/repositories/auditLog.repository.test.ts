/**
 * Unit tests for AuditLogRepository
 * Phase 10: Admin Dashboard - Audit Log Repository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/db/connection', () => ({
  getPool: vi.fn(() => mockPool),
}));

const mockPool = {
  query: vi.fn(),
};

import { AuditLogRepository } from '../../../../src/db/repositories/auditLog.repository.js';
import { mockAuditLog, mockAuditLogFinancial, mockAuditLogSupport, createMockAuditLog } from '../../../fixtures/admin.fixtures.js';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new AuditLogRepository();
  });

  describe('create', () => {
    it('should create audit log entry', async () => {
      const mockRow = {
        id: '1',
        admin_id: 'admin-001',
        admin_email: 'admin@test.com',
        action: 'user.suspend',
        category: 'user_management',
        resource_type: 'user',
        resource_id: 'user-001',
        details: JSON.stringify({ reason: 'TOS' }),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create({
        adminId: 'admin-001',
        adminEmail: 'admin@test.com',
        action: 'user.suspend',
        category: 'user_management',
        resourceType: 'user',
        resourceId: 'user-001',
        details: { reason: 'TOS' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.arrayContaining(['admin-001', 'admin@test.com', 'user.suspend', 'user_management', 'user', 'user-001'])
      );
      expect(result).toBeDefined();
      expect(result.adminId).toBe('admin-001');
    });

    it('should handle null optional fields', async () => {
      const mockRow = {
        id: '1',
        admin_id: 'admin-001',
        admin_email: 'admin@test.com',
        action: 'test.action',
        category: 'system',
        resource_type: 'config',
        resource_id: null,
        details: '{}',
        ip_address: null,
        user_agent: null,
        created_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      await repository.create({
        adminId: 'admin-001',
        adminEmail: 'admin@test.com',
        action: 'test.action',
        category: 'system',
        resourceType: 'config',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, '{}', null, null])
      );
    });
  });

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', admin_id: 'admin-1', action: 'user.suspend', category: 'user_management', resource_type: 'user', created_at: new Date() },
            { id: '2', admin_id: 'admin-1', action: 'credits.adjust', category: 'financial', resource_type: 'account', created_at: new Date() },
            { id: '3', admin_id: 'admin-1', action: 'ticket.reply', category: 'support', resource_type: 'ticket', created_at: new Date() },
          ],
        });

      const result = await repository.list({ page: 1, limit: 10 });

      expect(result.logs).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should filter by adminId', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ adminId: 'admin-001' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_id = $1'),
        expect.arrayContaining(['admin-001'])
      );
    });

    it('should filter by category', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ category: 'user_management' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $1'),
        expect.arrayContaining(['user_management'])
      );
    });

    it('should filter by action', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ action: 'user.suspend' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $1'),
        expect.any(Array)
      );
    });

    it('should filter by resourceType', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '4' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ resourceType: 'user' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resource_type = $1'),
        expect.any(Array)
      );
    });

    it('should filter by resourceId', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ resourceId: 'user-001' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resource_id = $1'),
        expect.any(Array)
      );
    });

    it('should filter by date range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] }).mockResolvedValueOnce({ rows: [] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await repository.list({ startDate, endDate });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        expect.any(Array)
      );
    });

    it('should apply multiple filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({
        adminId: 'admin-001',
        category: 'user_management',
        action: 'user.suspend',
      });

      const countQuery = mockPool.query.mock.calls[0][0];
      expect(countQuery).toContain('admin_id');
      expect(countQuery).toContain('category');
      expect(countQuery).toContain('action');
    });
  });

  describe('export', () => {
    it('should return audit logs for export (up to 10000)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', admin_id: 'admin-1', action: 'test', category: 'system', resource_type: 'test', created_at: new Date() },
        ],
      });

      const result = await repository.export({});

      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10000'),
        expect.any(Array)
      );
    });

    it('should apply export filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await repository.export({
        adminId: 'admin-001',
        category: 'financial',
        startDate,
        endDate,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_id ='),
        expect.any(Array)
      );
    });
  });

  describe('getByResourceId', () => {
    it('should return audit logs for specific resource', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', admin_id: 'admin-1', action: 'user.suspend', category: 'user_management', resource_type: 'user', resource_id: 'user-001', created_at: new Date() },
          { id: '2', admin_id: 'admin-1', action: 'user.unsuspend', category: 'user_management', resource_type: 'user', resource_id: 'user-001', created_at: new Date() },
        ],
      });

      const result = await repository.getByResourceId('user', 'user-001');

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resource_type = $1 AND resource_id = $2'),
        ['user', 'user-001']
      );
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity with default limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: Array(20).fill(null).map((_, i) => ({
          id: String(i),
          admin_id: 'admin-1',
          action: 'test.action',
          category: 'system',
          resource_type: 'test',
          created_at: new Date(),
        })),
      });

      const result = await repository.getRecentActivity();

      expect(result).toHaveLength(20);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [20]
      );
    });

    it('should respect custom limit', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await repository.getRecentActivity(50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [50]
      );
    });
  });
});
