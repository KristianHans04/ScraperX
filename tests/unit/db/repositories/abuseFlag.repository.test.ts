/**
 * Unit tests for AbuseFlagRepository
 * Phase 10: Admin Dashboard - Abuse Flag Repository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/db/connection', () => ({
  getPool: vi.fn(() => mockPool),
}));

const mockPool = {
  query: vi.fn(),
};

import { AbuseFlagRepository } from '../../../../src/db/repositories/abuseFlag.repository.js';
import { mockAbuseFlag, mockCriticalAbuseFlag, mockResolvedAbuseFlag, createMockAbuseFlag } from '../../../fixtures/admin.fixtures.js';

describe('AbuseFlagRepository', () => {
  let repository: AbuseFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new AbuseFlagRepository();
  });

  describe('create', () => {
    it('should create abuse flag', async () => {
      const mockRow = {
        id: 'abuse-001',
        user_id: 'user-001',
        account_id: 'account-001',
        signal_type: 'high_credit_consumption',
        severity: 'medium',
        status: 'active',
        detected_at: new Date(),
        threshold_value: 10000,
        actual_value: 15000,
        evidence: JSON.stringify({ jobIds: ['job-1'] }),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create({
        userId: 'user-001',
        accountId: 'account-001',
        signalType: 'high_credit_consumption',
        severity: 'medium',
        thresholdValue: 10000,
        actualValue: 15000,
        evidence: { jobIds: ['job-1'] },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO abuse_flag'),
        expect.arrayContaining(['user-001', 'account-001', 'high_credit_consumption', 'medium', 10000, 15000])
      );
      expect(result.signalType).toBe('high_credit_consumption');
      expect(result.severity).toBe('medium');
    });

    it('should handle null userId and accountId', async () => {
      const mockRow = {
        id: 'abuse-001',
        user_id: null,
        account_id: null,
        signal_type: 'failed_request_pattern',
        severity: 'high',
        status: 'active',
        detected_at: new Date(),
        evidence: '{}',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      await repository.create({
        signalType: 'failed_request_pattern',
        severity: 'high',
        evidence: {},
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, null])
      );
    });
  });

  describe('findById', () => {
    it('should return abuse flag by id', async () => {
      const mockRow = {
        id: 'abuse-001',
        user_id: 'user-001',
        account_id: 'account-001',
        signal_type: 'high_credit_consumption',
        severity: 'medium',
        status: 'active',
        detected_at: new Date(),
        evidence: '{}',
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findById('abuse-001');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM abuse_flag WHERE id = $1'),
        ['abuse-001']
      );
      expect(result).toBeDefined();
      expect(result?.id).toBe('abuse-001');
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated flags', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', user_id: 'user-1', signal_type: 'high_credit_consumption', severity: 'medium', status: 'active', detected_at: new Date(), evidence: '{}', created_at: new Date(), updated_at: new Date() },
            { id: '2', user_id: 'user-2', signal_type: 'failed_request_pattern', severity: 'critical', status: 'investigating', detected_at: new Date(), evidence: '{}', created_at: new Date(), updated_at: new Date() },
            { id: '3', user_id: 'user-3', signal_type: 'rapid_api_key_creation', severity: 'low', status: 'false_positive', detected_at: new Date(), evidence: '{}', created_at: new Date(), updated_at: new Date() },
          ],
        });

      const result = await repository.list({ page: 1, limit: 10 });

      expect(result.flags).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by userId', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ userId: 'user-001' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        expect.arrayContaining(['user-001'])
      );
    });

    it('should filter by accountId', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ accountId: 'account-001' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('account_id = $1'),
        expect.any(Array)
      );
    });

    it('should filter by signalType', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ signalType: 'high_credit_consumption' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('signal_type = $1'),
        expect.any(Array)
      );
    });

    it('should filter by severity', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ severity: 'critical' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('severity = $1'),
        expect.any(Array)
      );
    });

    it('should filter by status', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ status: 'active' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.any(Array)
      );
    });

    it('should apply sorting', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({ rows: [] });

      await repository.list({ sortBy: 'severity', sortOrder: 'asc' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY severity asc'),
        expect.any(Array)
      );
    });
  });

  describe('updateStatus', () => {
    it('should update flag status', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.updateStatus('abuse-001', 'resolved');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE abuse_flag SET status = $2'),
        ['abuse-001', 'resolved']
      );
    });

    it('should set resolved_at when status is resolved', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.updateStatus('abuse-001', 'resolved', 'Confirmed abuse');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resolved_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should set resolved_at when status is false_positive', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.updateStatus('abuse-001', 'false_positive');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resolved_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should include resolution note when provided', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.updateStatus('abuse-001', 'false_positive', 'Legitimate usage pattern');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resolution_note'),
        expect.arrayContaining(['abuse-001', 'false_positive', 'Legitimate usage pattern'])
      );
    });
  });

  describe('investigate', () => {
    it('should mark flag as investigating', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.investigate('abuse-001', 'admin-001');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = \'investigating\''),
        expect.arrayContaining(['abuse-001', 'admin-001'])
      );
    });

    it('should set investigated_by and investigated_at', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.investigate('abuse-001', 'admin-001');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('investigated_by = $2'),
        expect.arrayContaining(['abuse-001', 'admin-001'])
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('investigated_at = NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('recordAction', () => {
    it('should record action taken', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await repository.recordAction('abuse-001', 'suspend_user');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('action_taken = $2'),
        expect.arrayContaining(['abuse-001', 'suspend_user'])
      );
    });

    it('should record action with details', async () => {
      mockPool.query.mockResolvedValueOnce({});

      const details = { duration: '7d', reason: 'Repeat offender' };
      await repository.recordAction('abuse-001', 'suspend_user', details);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('action_details = $3'),
        expect.arrayContaining(['abuse-001', 'suspend_user', JSON.stringify(details)])
      );
    });
  });

  describe('getActiveByUser', () => {
    it('should return active flags for user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', user_id: 'user-001', signal_type: 'high_credit_consumption', severity: 'medium', status: 'active', detected_at: new Date(), evidence: '{}', created_at: new Date(), updated_at: new Date() },
        ],
      });

      const result = await repository.getActiveByUser('user-001');

      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1 AND status = \'active\''),
        ['user-001']
      );
    });
  });

  describe('getActiveByAccount', () => {
    it('should return active flags for account', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', account_id: 'account-001', signal_type: 'failed_request_pattern', severity: 'high', status: 'active', detected_at: new Date(), evidence: '{}', created_at: new Date(), updated_at: new Date() },
        ],
      });

      const result = await repository.getActiveByAccount('account-001');

      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('account_id = $1 AND status = \'active\''),
        ['account-001']
      );
    });
  });

  describe('getStats', () => {
    it('should return flag statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          active: '15',
          investigating: '5',
          resolved: '30',
          false_positive: '10',
          critical: '3',
        }],
      });

      const result = await repository.getStats();

      expect(result).toEqual({
        active: 15,
        investigating: 5,
        resolved: 30,
        falsePositive: 10,
        critical: 3,
      });
    });

    it('should query flags from last 30 days', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ active: '0', investigating: '0', resolved: '0', false_positive: '0', critical: '0' }],
      });

      await repository.getStats();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('detected_at > NOW() - INTERVAL \'30 days\'')
      );
    });
  });
});
