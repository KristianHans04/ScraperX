/**
 * Unit tests for Payment Failure Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test escalation ladder (grace, retry, restricted, suspended, canceled)
 * - Test payment recovery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentFailureService } from '../../../src/services/paymentFailure.service.js';
import { paymentFailureRepository } from '../../../src/db/repositories/paymentFailure.repository.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { apiKeyRepository } from '../../../src/db/repositories/apiKey.repository.js';
import type { PaymentFailure, ApiKey } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/db/repositories/paymentFailure.repository.js', () => ({
  paymentFailureRepository: {
    findByAccountId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    incrementRetryCount: vi.fn(),
    findAccountsNeedingEscalation: vi.fn(),
    resolve: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    update: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/apiKey.repository.js', () => ({
  apiKeyRepository: {
    findByAccountId: vi.fn(),
    update: vi.fn(),
  },
}));

describe('PaymentFailureService', () => {
  let paymentFailureService: PaymentFailureService;
  const mockAccountId = 'test-account-id';

  beforeEach(() => {
    vi.clearAllMocks();
    paymentFailureService = new PaymentFailureService();
  });

  describe('recordFailure', () => {
    it('should increment retry count for existing unresolved failure', async () => {
      const existingFailure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        retryCount: 1,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(existingFailure);
      vi.mocked(paymentFailureRepository.incrementRetryCount).mockResolvedValue();

      await paymentFailureService.recordFailure({
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        failureCode: 'card_declined',
        failureMessage: 'Your card was declined',
      });

      expect(paymentFailureRepository.incrementRetryCount).toHaveBeenCalledWith('failure_123');
      expect(paymentFailureRepository.create).not.toHaveBeenCalled();
    });

    it('should create new failure record when no existing failure', async () => {
      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(null);
      vi.mocked(paymentFailureRepository.create).mockResolvedValue({
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.recordFailure({
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        subscriptionId: 'sub_123',
        failureCode: 'card_declined',
        failureMessage: 'Your card was declined',
      });

      expect(paymentFailureRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockAccountId,
          invoiceId: 'inv_123',
          subscriptionId: 'sub_123',
          failureCode: 'card_declined',
          failureMessage: 'Your card was declined',
          escalationStage: 'grace',
          gracePeriodEnd: expect.any(Date),
        })
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should create new failure record when existing is resolved', async () => {
      const resolvedFailure: PaymentFailure = {
        id: 'failure_old',
        accountId: mockAccountId,
        escalationStage: 'canceled',
        firstFailedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        retryCount: 3,
        maxRetries: 3,
        isResolved: true,
        resolvedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(resolvedFailure);
      vi.mocked(paymentFailureRepository.create).mockResolvedValue({
        id: 'failure_new',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.recordFailure({
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        failureCode: 'card_declined',
        failureMessage: 'Your card was declined',
      });

      expect(paymentFailureRepository.create).toHaveBeenCalled();
    });
  });

  describe('getFailureState', () => {
    it('should return no failure when no record exists', async () => {
      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(null);

      const result = await paymentFailureService.getFailureState(mockAccountId);

      expect(result).toEqual({ hasFailure: false });
    });

    it('should return no failure when record is resolved', async () => {
      const resolvedFailure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 1,
        maxRetries: 3,
        isResolved: true,
        resolvedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(resolvedFailure);

      const result = await paymentFailureService.getFailureState(mockAccountId);

      expect(result).toEqual({ hasFailure: false });
    });

    it('should return failure state with grace period info', async () => {
      const gracePeriodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        retryCount: 1,
        maxRetries: 3,
        isResolved: false,
        gracePeriodEnd,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);

      const result = await paymentFailureService.getFailureState(mockAccountId);

      expect(result.hasFailure).toBe(true);
      expect(result.stage).toBe('grace');
      expect(result.daysInStage).toBe(1);
      expect(result.nextEscalationDate).toEqual(gracePeriodEnd);
    });

    it('should return failure state with retry info', async () => {
      const nextRetryAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'retry',
        firstFailedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        retryCount: 2,
        maxRetries: 3,
        isResolved: false,
        nextRetryAt,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);

      const result = await paymentFailureService.getFailureState(mockAccountId);

      expect(result.hasFailure).toBe(true);
      expect(result.stage).toBe('retry');
      expect(result.daysInStage).toBe(5);
      expect(result.nextEscalationDate).toEqual(nextRetryAt);
    });
  });

  describe('processEscalation', () => {
    it('should escalate from grace to retry', async () => {
      const gracePeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        retryCount: 1,
        maxRetries: 3,
        isResolved: false,
        gracePeriodEnd,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findAccountsNeedingEscalation).mockResolvedValue([failure]);
      vi.mocked(paymentFailureRepository.update).mockResolvedValue({
        ...failure,
        escalationStage: 'retry',
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.processEscalation();

      expect(paymentFailureRepository.update).toHaveBeenCalledWith(
        'failure_123',
        expect.objectContaining({
          escalationStage: 'retry',
          nextRetryAt: expect.any(Date),
        })
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should escalate from retry to restricted', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'retry',
        firstFailedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        retryCount: 3,
        maxRetries: 3,
        isResolved: false,
        nextRetryAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockKeys: ApiKey[] = [
        { id: 'key_1', accountId: mockAccountId, keyPrefix: 'test', keyHash: 'hash', name: 'Test Key', scopes: [], environment: 'development', usageCount: 0, isActive: true, type: 'test', metadata: {}, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(paymentFailureRepository.findAccountsNeedingEscalation).mockResolvedValue([failure]);
      vi.mocked(paymentFailureRepository.update).mockResolvedValue({
        ...failure,
        escalationStage: 'restricted',
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue(mockKeys);
      vi.mocked(apiKeyRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.processEscalation();

      expect(paymentFailureRepository.update).toHaveBeenCalledWith(
        'failure_123',
        expect.objectContaining({
          escalationStage: 'restricted',
          restrictedAt: expect.any(Date),
        })
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'restricted',
        })
      );
      expect(apiKeyRepository.update).toHaveBeenCalledWith('key_1', { status: 'inactive' });
    });

    it('should escalate from restricted to suspended', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'restricted',
        firstFailedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        retryCount: 3,
        maxRetries: 3,
        isResolved: false,
        restrictedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockKeys: ApiKey[] = [
        { id: 'key_1', accountId: mockAccountId, keyPrefix: 'test', keyHash: 'hash', name: 'Test Key', scopes: [], environment: 'development', usageCount: 0, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: 'key_2', accountId: mockAccountId, keyPrefix: 'prod', keyHash: 'hash2', name: 'Prod Key', scopes: [], environment: 'production', usageCount: 0, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(paymentFailureRepository.findAccountsNeedingEscalation).mockResolvedValue([failure]);
      vi.mocked(paymentFailureRepository.update).mockResolvedValue({
        ...failure,
        escalationStage: 'suspended',
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue(mockKeys);
      vi.mocked(apiKeyRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.processEscalation();

      expect(paymentFailureRepository.update).toHaveBeenCalledWith(
        'failure_123',
        expect.objectContaining({
          escalationStage: 'suspended',
          suspendedAt: expect.any(Date),
        })
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'suspended',
        })
      );
      expect(apiKeyRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should escalate from suspended to canceled', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'suspended',
        firstFailedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        retryCount: 3,
        maxRetries: 3,
        isResolved: false,
        suspendedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findAccountsNeedingEscalation).mockResolvedValue([failure]);
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([]);
      vi.mocked(apiKeyRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.processEscalation();

      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'suspended',
          plan: 'free',
        })
      );
    });
  });

  describe('clearFailure', () => {
    it('should do nothing when no failure exists', async () => {
      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(null);

      await paymentFailureService.clearFailure(mockAccountId, 'payment_succeeded');

      expect(paymentFailureRepository.resolve).not.toHaveBeenCalled();
    });

    it('should do nothing when failure is already resolved', async () => {
      const resolvedFailure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isResolved: true,
        resolvedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(resolvedFailure);

      await paymentFailureService.clearFailure(mockAccountId, 'payment_succeeded');

      expect(paymentFailureRepository.resolve).not.toHaveBeenCalled();
    });

    it('should clear failure and restore account access', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'restricted',
        firstFailedAt: new Date(),
        retryCount: 2,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockKeys: ApiKey[] = [
        { id: 'key_1', accountId: mockAccountId, keyPrefix: 'test', keyHash: 'hash', name: 'Test Key', scopes: [], environment: 'development', usageCount: 0, isActive: false, status: 'inactive', metadata: {}, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);
      vi.mocked(paymentFailureRepository.resolve).mockResolvedValue(undefined);
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue(mockKeys);
      vi.mocked(apiKeyRepository.update).mockResolvedValue({} as any);

      await paymentFailureService.clearFailure(mockAccountId, 'payment_succeeded');

      expect(paymentFailureRepository.resolve).toHaveBeenCalledWith(
        'failure_123',
        'payment_succeeded'
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          status: 'active',
        })
      );
      expect(apiKeyRepository.update).toHaveBeenCalledWith('key_1', { status: 'active' });
    });

    it('should handle manual resolution', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'suspended',
        firstFailedAt: new Date(),
        retryCount: 3,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);
      vi.mocked(paymentFailureRepository.resolve).mockResolvedValue(undefined);
      vi.mocked(accountRepository.update).mockResolvedValue({} as any);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([]);

      await paymentFailureService.clearFailure(mockAccountId, 'manual_resolution');

      expect(paymentFailureRepository.resolve).toHaveBeenCalledWith(
        'failure_123',
        'manual_resolution'
      );
    });
  });

  describe('retryPayment', () => {
    it('should return false when no failure exists', async () => {
      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(null);

      const result = await paymentFailureService.retryPayment(mockAccountId);

      expect(result).toBe(false);
    });

    it('should return false when failure is resolved', async () => {
      const resolvedFailure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isResolved: true,
        resolvedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(resolvedFailure);

      const result = await paymentFailureService.retryPayment(mockAccountId);

      expect(result).toBe(false);
    });

    it('should return false when max retries reached', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'retry',
        firstFailedAt: new Date(),
        retryCount: 3,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);

      const result = await paymentFailureService.retryPayment(mockAccountId);

      expect(result).toBe(false);
      expect(paymentFailureRepository.incrementRetryCount).not.toHaveBeenCalled();
    });

    it('should increment retry count and return true', async () => {
      const failure: PaymentFailure = {
        id: 'failure_123',
        accountId: mockAccountId,
        escalationStage: 'grace',
        firstFailedAt: new Date(),
        retryCount: 1,
        maxRetries: 3,
        isResolved: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(paymentFailureRepository.findByAccountId).mockResolvedValue(failure);
      vi.mocked(paymentFailureRepository.incrementRetryCount).mockResolvedValue(undefined);

      const result = await paymentFailureService.retryPayment(mockAccountId);

      expect(result).toBe(true);
      expect(paymentFailureRepository.incrementRetryCount).toHaveBeenCalledWith('failure_123');
    });
  });
});
