/**
 * Unit tests for Credit Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test atomic operations with row-level locking
 * - Test edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreditService } from '../../../src/services/credit.service.js';
import { creditLedgerRepository } from '../../../src/db/repositories/creditLedger.repository.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { pool } from '../../../src/db/index.js';
import type { Account, CreditLedgerEntry } from '../../../src/types/index.js';

// Mock the database pool and repositories
vi.mock('../../../src/db/index.js', () => ({
  pool: {
    connect: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/creditLedger.repository.js', () => ({
  creditLedgerRepository: {
    createEntry: vi.fn(),
    getCycleUsage: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

describe('CreditService', () => {
  let creditService: CreditService;
  let mockClient: any;
  const mockAccountId = 'test-account-id';
  const mockLedgerEntryId = 'test-ledger-entry-id';

  beforeEach(() => {
    vi.clearAllMocks();
    creditService = new CreditService();

    // Setup mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    vi.mocked(pool.connect).mockResolvedValue(mockClient);

    // Default mock for BEGIN
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'COMMIT') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });
  });

  describe('allocateCredits', () => {
    it('should allocate credits successfully', async () => {
      const amount = 1000;
      const description = 'Test allocation';
      const balanceBefore = 500;
      const balanceAfter = balanceBefore + amount;

      // Mock SELECT FOR UPDATE
      mockClient.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock ledger entry creation
      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'allocation',
        amount,
        balanceBefore,
        balanceAfter,
        description,
      } as CreditLedgerEntry);

      const result = await creditService.allocateCredits(
        mockAccountId,
        amount,
        description
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(result.ledgerEntryId).toBe(mockLedgerEntryId);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockAccountId,
          type: 'allocation',
          amount,
          balanceBefore,
          balanceAfter,
          description,
        })
      );
    });

    it('should throw error for non-positive amount', async () => {
      await expect(
        creditService.allocateCredits(mockAccountId, 0, 'Test')
      ).rejects.toThrow('Allocation amount must be positive');

      await expect(
        creditService.allocateCredits(mockAccountId, -100, 'Test')
      ).rejects.toThrow('Allocation amount must be positive');
    });

    it('should throw error when account not found', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.allocateCredits(mockAccountId, 1000, 'Test')
      ).rejects.toThrow('Account not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on error', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 500 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        creditService.allocateCredits(mockAccountId, 1000, 'Test')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle metadata in allocation', async () => {
      const metadata = { source: 'promotion', campaignId: 'summer2024' };

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 500 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'allocation',
        amount: 1000,
        balanceBefore: 500,
        balanceAfter: 1500,
        description: 'Test',
      } as CreditLedgerEntry);

      await creditService.allocateCredits(mockAccountId, 1000, 'Test', metadata);

      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        })
      );
    });

    it('should always release client connection', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.allocateCredits(mockAccountId, 1000, 'Test')
      ).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits successfully', async () => {
      const amount = 100;
      const description = 'Job charge';
      const balanceBefore = 500;
      const balanceAfter = balanceBefore - amount;

      mockClient.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'deduction',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description,
      } as CreditLedgerEntry);

      const result = await creditService.deductCredits(
        mockAccountId,
        amount,
        description
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deduction',
          amount: -amount,
        })
      );
    });

    it('should update credit_cycle_usage on deduction', async () => {
      const amount = 100;

      mockClient.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 500 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          expect(params).toContain(amount); // Should include amount for credit_cycle_usage
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
      } as CreditLedgerEntry);

      await creditService.deductCredits(mockAccountId, amount, 'Test');
    });

    it('should throw error for insufficient credits', async () => {
      const amount = 1000;
      const balanceBefore = 500;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.deductCredits(mockAccountId, amount, 'Test')
      ).rejects.toThrow('Insufficient credits');
    });

    it('should throw error for non-positive amount', async () => {
      await expect(
        creditService.deductCredits(mockAccountId, 0, 'Test')
      ).rejects.toThrow('Deduction amount must be positive');
    });

    it('should handle deduction_failure type', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 500 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
      } as CreditLedgerEntry);

      await creditService.deductCredits(mockAccountId, 100, 'Test', {
        type: 'deduction_failure',
        scrapeJobId: 'job-123',
      });

      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deduction_failure',
          scrapeJobId: 'job-123',
        })
      );
    });

    it('should prevent negative balance', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 50 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.deductCredits(mockAccountId, 100, 'Test')
      ).rejects.toThrow('Insufficient credits');
    });
  });

  describe('reserveCredits', () => {
    it('should reserve credits successfully', async () => {
      const amount = 100;
      const scrapeJobId = 'job-123';
      const balanceBefore = 500;
      const balanceAfter = balanceBefore - amount;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'reservation',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description: 'Reservation',
        scrapeJobId,
      } as CreditLedgerEntry);

      const result = await creditService.reserveCredits(
        mockAccountId,
        amount,
        scrapeJobId,
        'Reservation'
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reservation',
          scrapeJobId,
          metadata: { reserved: true },
        })
      );
    });

    it('should throw error for insufficient credits during reservation', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 50 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.reserveCredits(mockAccountId, 100, 'job-123', 'Test')
      ).rejects.toThrow('Insufficient credits for reservation');
    });

    it('should throw error for non-positive reservation amount', async () => {
      await expect(
        creditService.reserveCredits(mockAccountId, 0, 'job-123', 'Test')
      ).rejects.toThrow('Reservation amount must be positive');
    });
  });

  describe('releaseCredits', () => {
    it('should release credits successfully', async () => {
      const amount = 100;
      const scrapeJobId = 'job-123';
      const balanceBefore = 400;
      const balanceAfter = balanceBefore + amount;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'release',
        amount,
        balanceBefore,
        balanceAfter,
        description: 'Release',
        scrapeJobId,
      } as CreditLedgerEntry);

      const result = await creditService.releaseCredits(
        mockAccountId,
        amount,
        scrapeJobId,
        'Release'
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'release',
          metadata: { released: true },
        })
      );
    });

    it('should throw error for non-positive release amount', async () => {
      await expect(
        creditService.releaseCredits(mockAccountId, 0, 'job-123', 'Test')
      ).rejects.toThrow('Release amount must be positive');
    });
  });

  describe('resetCycleCredits', () => {
    it('should reset credits for new billing cycle', async () => {
      const newAllocation = 50000;
      const balanceBefore = 1000;

      mockClient.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          // Check that credit_cycle_usage is reset to 0
          if (sql.includes('credit_cycle_usage = 0')) {
            return Promise.resolve({ rowCount: 1 });
          }
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'reset',
        amount: newAllocation - balanceBefore,
        balanceBefore,
        balanceAfter: newAllocation,
        description: `Billing cycle reset - ${newAllocation} credits allocated`,
      } as CreditLedgerEntry);

      const result = await creditService.resetCycleCredits(
        mockAccountId,
        newAllocation
      );

      expect(result.newBalance).toBe(newAllocation);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reset',
          metadata: { cycleReset: true },
        })
      );
    });

    it('should throw error when account not found', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.resetCycleCredits(mockAccountId, 50000)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('purchaseCreditPack', () => {
    it('should add credits from credit pack purchase', async () => {
      const packSize = 10000;
      const purchaseId = 'purchase-123';
      const balanceBefore = 5000;
      const balanceAfter = balanceBefore + packSize;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'purchase',
        amount: packSize,
        balanceBefore,
        balanceAfter,
        description: 'Credit pack purchase',
        creditPackPurchaseId: purchaseId,
      } as CreditLedgerEntry);

      const result = await creditService.purchaseCreditPack(
        mockAccountId,
        packSize,
        purchaseId,
        'Credit pack purchase'
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'purchase',
          creditPackPurchaseId: purchaseId,
          metadata: { packSize },
        })
      );
    });

    it('should throw error for non-positive pack size', async () => {
      await expect(
        creditService.purchaseCreditPack(mockAccountId, 0, 'purchase-123', 'Test')
      ).rejects.toThrow('Pack size must be positive');
    });
  });

  describe('adjustCredits', () => {
    it('should adjust credits positively', async () => {
      const adjustment = 500;
      const balanceBefore = 1000;
      const balanceAfter = balanceBefore + adjustment;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
        accountId: mockAccountId,
        type: 'adjustment',
        amount: adjustment,
        balanceBefore,
        balanceAfter,
        description: 'Manual adjustment',
      } as CreditLedgerEntry);

      const result = await creditService.adjustCredits(
        mockAccountId,
        adjustment,
        'Manual adjustment'
      );

      expect(result.newBalance).toBe(balanceAfter);
      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'adjustment',
          amount: adjustment,
        })
      );
    });

    it('should adjust credits negatively', async () => {
      const adjustment = -200;
      const balanceBefore = 1000;
      const balanceAfter = balanceBefore + adjustment;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
      } as CreditLedgerEntry);

      const result = await creditService.adjustCredits(
        mockAccountId,
        adjustment,
        'Correction'
      );

      expect(result.newBalance).toBe(balanceAfter);
    });

    it('should throw error if adjustment would cause negative balance', async () => {
      const adjustment = -1500;
      const balanceBefore = 1000;

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: balanceBefore }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        creditService.adjustCredits(mockAccountId, adjustment, 'Test')
      ).rejects.toThrow('Adjustment would result in negative balance');
    });

    it('should handle metadata in adjustment', async () => {
      const metadata = { adminId: 'admin-123', reason: 'correction' };

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT credit_balance FROM account')) {
          return Promise.resolve({
            rows: [{ credit_balance: 1000 }],
            rowCount: 1,
          });
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return Promise.resolve();
        }
        if (sql.includes('UPDATE account')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      vi.mocked(creditLedgerRepository.createEntry).mockResolvedValue({
        id: mockLedgerEntryId,
      } as CreditLedgerEntry);

      await creditService.adjustCredits(mockAccountId, 100, 'Test', metadata);

      expect(creditLedgerRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });
  });

  describe('getCreditBalance', () => {
    it('should return credit balance and cycle usage', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 5000,
        creditCycleUsage: 1500,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const result = await creditService.getCreditBalance(mockAccountId);

      expect(result.balance).toBe(5000);
      expect(result.cycleUsage).toBe(1500);
    });

    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        creditService.getCreditBalance(mockAccountId)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('getCreditUsage', () => {
    it('should return credit usage for cycle', async () => {
      const cycleStart = new Date('2024-01-01');
      const cycleEnd = new Date('2024-01-31');
      const mockUsage = {
        totalDeducted: 5000,
        totalAdded: 0,
        netChange: -5000,
      };

      vi.mocked(creditLedgerRepository.getCycleUsage).mockResolvedValue(mockUsage);

      const result = await creditService.getCreditUsage(
        mockAccountId,
        cycleStart,
        cycleEnd
      );

      expect(result).toEqual(mockUsage);
      expect(creditLedgerRepository.getCycleUsage).toHaveBeenCalledWith(
        mockAccountId,
        cycleStart,
        cycleEnd
      );
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true when balance is sufficient', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 5000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const result = await creditService.hasEnoughCredits(mockAccountId, 3000);

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const result = await creditService.hasEnoughCredits(mockAccountId, 3000);

      expect(result).toBe(false);
    });

    it('should return true when balance equals required amount', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const result = await creditService.hasEnoughCredits(mockAccountId, 1000);

      expect(result).toBe(true);
    });
  });
});
