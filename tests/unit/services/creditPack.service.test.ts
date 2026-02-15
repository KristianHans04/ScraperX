/**
 * Unit tests for Credit Pack Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test credit pack availability by plan
 * - Test purchase flow (pending, processing, completed, failed, refunded)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreditPackService } from '../../../src/services/creditPack.service.js';
import { creditPackPurchaseRepository } from '../../../src/db/repositories/creditPackPurchase.repository.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { invoiceService } from '../../../src/services/invoice.service.js';
import { creditService } from '../../../src/services/credit.service.js';
import { PaymentProvider } from '../../../src/services/payment/PaymentProvider.interface.js';
import type { Account, CreditPackPurchase, Invoice } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/db/repositories/creditPackPurchase.repository.js', () => ({
  creditPackPurchaseRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/services/invoice.service.js', () => ({
  invoiceService: {
    createCreditPackInvoice: vi.fn(),
    markPaid: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock('../../../src/services/credit.service.js', () => ({
  creditService: {
    purchaseCreditPack: vi.fn(),
    deductCredits: vi.fn(),
  },
}));

describe('CreditPackService', () => {
  let creditPackService: CreditPackService;
  let mockPaymentProvider: PaymentProvider;
  const mockAccountId = 'test-account-id';

  beforeEach(() => {
    vi.clearAllMocks();

    mockPaymentProvider = {
      name: 'paystack',
      createPaymentIntent: vi.fn(),
      createRefund: vi.fn(),
    } as unknown as PaymentProvider;

    creditPackService = new CreditPackService(mockPaymentProvider);
  });

  describe('getAvailablePacks', () => {
    it('should return empty array for free plan', () => {
      const packs = creditPackService.getAvailablePacks('free');
      expect(packs).toEqual([]);
    });

    it('should return pro plan packs', () => {
      const packs = creditPackService.getAvailablePacks('pro');
      expect(packs).toHaveLength(3);
      expect(packs[0]).toEqual({
        size: 100000,
        price: 4900,
        pricePerCredit: 0.000049,
      });
      expect(packs[2]).toEqual({
        size: 1000000,
        price: 34900,
        pricePerCredit: 0.0000349,
      });
    });

    it('should return enterprise plan packs', () => {
      const packs = creditPackService.getAvailablePacks('enterprise');
      expect(packs).toHaveLength(3);
      expect(packs[0]).toEqual({
        size: 1000000,
        price: 29900,
        pricePerCredit: 0.0000299,
      });
      expect(packs[2]).toEqual({
        size: 10000000,
        price: 199900,
        pricePerCredit: 0.00001999,
      });
    });

    it('should return empty array for unknown plan', () => {
      const packs = creditPackService.getAvailablePacks('unknown' as any);
      expect(packs).toEqual([]);
    });
  });

  describe('purchaseCreditPack', () => {
    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        creditPackService.purchaseCreditPack({
          accountId: mockAccountId,
          packSize: 100000,
        })
      ).rejects.toThrow('Account not found');
    });

    it('should throw error for free plan users', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        creditPackService.purchaseCreditPack({
          accountId: mockAccountId,
          packSize: 100000,
        })
      ).rejects.toThrow('Credit packs are not available for free plan');
    });

    it('should throw error for invalid pack size', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        creditPackService.purchaseCreditPack({
          accountId: mockAccountId,
          packSize: 99999, // Not a valid pack size
        })
      ).rejects.toThrow('Invalid pack size for your plan');
    });

    it('should throw error when no paystack customer code', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        creditPackService.purchaseCreditPack({
          accountId: mockAccountId,
          packSize: 100000,
        })
      ).rejects.toThrow('No payment customer found for account');
    });

    it('should create purchase and invoice successfully', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        paystackCustomerCode: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'pending',
        description: '100,000 credits',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInvoice: Invoice = {
        id: 'inv_123',
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'NGN',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(creditPackPurchaseRepository.create).mockResolvedValue(mockPurchase);
      vi.mocked(invoiceService.createCreditPackInvoice).mockResolvedValue(mockInvoice);
      vi.mocked(mockPaymentProvider.createPaymentIntent).mockResolvedValue({
        id: 'pi_123',
        clientSecret: 'secret_123',
        status: 'pending',
        amount: 4900,
        currency: 'NGN',
      });
      vi.mocked(creditPackPurchaseRepository.update).mockResolvedValue({
        ...mockPurchase,
        invoiceId: 'inv_123',
      });

      const result = await creditPackService.purchaseCreditPack({
        accountId: mockAccountId,
        packSize: 100000,
      });

      expect(result.purchaseId).toBe('purchase_123');
      expect(result.invoiceId).toBe('inv_123');
      expect(result.clientSecret).toBe('secret_123');
      expect(creditPackPurchaseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockAccountId,
          packSize: 100000,
          amountPaid: 4900,
          status: 'pending',
        })
      );
    });

    it('should include payment method ID in payment intent when provided', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        paystackCustomerCode: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(creditPackPurchaseRepository.create).mockResolvedValue({
        id: 'purchase_123',
        accountId: mockAccountId,
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(invoiceService.createCreditPackInvoice).mockResolvedValue({
        id: 'inv_123',
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'NGN',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockPaymentProvider.createPaymentIntent).mockResolvedValue({
        id: 'pi_123',
        clientSecret: 'secret_123',
        status: 'pending',
        amount: 4900,
        currency: 'NGN',
      });

      await creditPackService.purchaseCreditPack({
        accountId: mockAccountId,
        packSize: 100000,
        paymentMethodId: 'pm_123',
      });

      expect(mockPaymentProvider.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethodId: 'pm_123',
        })
      );
    });

    it('should update purchase with invoice ID', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        paystackCustomerCode: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(creditPackPurchaseRepository.create).mockResolvedValue({
        id: 'purchase_123',
        accountId: mockAccountId,
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(invoiceService.createCreditPackInvoice).mockResolvedValue({
        id: 'inv_123',
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'NGN',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockPaymentProvider.createPaymentIntent).mockResolvedValue({
        id: 'pi_123',
        clientSecret: 'secret_123',
        status: 'pending',
        amount: 4900,
        currency: 'NGN',
      });

      await creditPackService.purchaseCreditPack({
        accountId: mockAccountId,
        packSize: 100000,
      });

      expect(creditPackPurchaseRepository.update).toHaveBeenCalledWith(
        'purchase_123',
        expect.objectContaining({
          invoiceId: 'inv_123',
        })
      );
    });
  });

  describe('completePurchase', () => {
    it('should throw error when purchase not found', async () => {
      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(null);

      await expect(
        creditPackService.completePurchase('purchase_123')
      ).rejects.toThrow('Purchase not found');
    });

    it('should do nothing if purchase already completed', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'completed',
        completedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);

      await creditPackService.completePurchase('purchase_123');

      expect(creditPackPurchaseRepository.update).not.toHaveBeenCalled();
      expect(creditService.purchaseCreditPack).not.toHaveBeenCalled();
    });

    it('should complete purchase and add credits', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        paystackPaymentReference: 'pi_123',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);
      vi.mocked(creditPackPurchaseRepository.update).mockResolvedValue({
        ...mockPurchase,
        status: 'completed',
      });
      vi.mocked(creditService.purchaseCreditPack).mockResolvedValue({
        newBalance: 150000,
        ledgerEntryId: 'ledger_123',
      });
      vi.mocked(invoiceService.markPaid).mockResolvedValue({
        id: 'inv_123',
        status: 'paid',
      } as Invoice);

      await creditPackService.completePurchase('purchase_123');

      expect(creditPackPurchaseRepository.update).toHaveBeenCalledWith(
        'purchase_123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          purchasedAt: expect.any(Date),
        })
      );
      expect(creditService.purchaseCreditPack).toHaveBeenCalledWith(
        mockAccountId,
        100000,
        'purchase_123',
        'Credit pack purchase - 100,000 credits'
      );
      expect(invoiceService.markPaid).toHaveBeenCalledWith('inv_123', 'pi_123');
    });

    it('should handle purchase without invoice', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);
      vi.mocked(creditPackPurchaseRepository.update).mockResolvedValue({
        ...mockPurchase,
        status: 'completed',
      });
      vi.mocked(creditService.purchaseCreditPack).mockResolvedValue({
        newBalance: 150000,
        ledgerEntryId: 'ledger_123',
      });

      await creditPackService.completePurchase('purchase_123');

      expect(invoiceService.markPaid).not.toHaveBeenCalled();
    });
  });

  describe('failPurchase', () => {
    it('should throw error when purchase not found', async () => {
      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(null);

      await expect(
        creditPackService.failPurchase('purchase_123', 'Card declined')
      ).rejects.toThrow('Purchase not found');
    });

    it('should mark purchase as failed', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);
      vi.mocked(creditPackPurchaseRepository.update).mockResolvedValue({
        ...mockPurchase,
        status: 'failed',
      });
      vi.mocked(invoiceService.markFailed).mockResolvedValue({
        id: 'inv_123',
        status: 'uncollectible',
      } as Invoice);

      await creditPackService.failPurchase('purchase_123', 'Card declined');

      expect(creditPackPurchaseRepository.update).toHaveBeenCalledWith(
        'purchase_123',
        expect.objectContaining({
          status: 'failed',
          metadata: expect.objectContaining({
            failureReason: 'Card declined',
            failedAt: expect.any(String),
          }),
        })
      );
      expect(invoiceService.markFailed).toHaveBeenCalledWith('inv_123', 'Card declined');
    });

    it('should preserve existing metadata when failing', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        metadata: { originalSource: 'web' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);
      vi.mocked(creditPackPurchaseRepository.update).mockImplementation((id, data) => {
        return Promise.resolve({ ...mockPurchase, ...data } as CreditPackPurchase);
      });
      vi.mocked(invoiceService.markFailed).mockResolvedValue({
        id: 'inv_123',
        status: 'uncollectible',
      } as Invoice);

      await creditPackService.failPurchase('purchase_123', 'Insufficient funds');

      const updateCall = vi.mocked(creditPackPurchaseRepository.update).mock.calls[0];
      expect(updateCall[1].metadata).toMatchObject({
        originalSource: 'web',
        failureReason: 'Insufficient funds',
      });
    });
  });

  describe('refundPurchase', () => {
    it('should throw error when purchase not found', async () => {
      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(null);

      await expect(
        creditPackService.refundPurchase('purchase_123', 'Customer request')
      ).rejects.toThrow('Purchase not found');
    });

    it('should throw error when purchase not completed', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);

      await expect(
        creditPackService.refundPurchase('purchase_123', 'Customer request')
      ).rejects.toThrow('Can only refund completed purchases');
    });

    it('should throw error when no payment reference exists', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'completed',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);

      await expect(
        creditPackService.refundPurchase('purchase_123', 'Customer request')
      ).rejects.toThrow('No payment reference found');
    });

    it('should process refund and deduct credits', async () => {
      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: mockAccountId,
        invoiceId: 'inv_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'completed',
        paystackPaymentReference: 'pi_123',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(creditPackPurchaseRepository.findById).mockResolvedValue(mockPurchase);
      vi.mocked(mockPaymentProvider.createRefund).mockResolvedValue({
        id: 'ref_123',
        status: 'succeeded',
        amount: 4900,
        currency: 'NGN',
      });
      vi.mocked(creditPackPurchaseRepository.update).mockResolvedValue({
        ...mockPurchase,
        status: 'refunded',
      });
      vi.mocked(creditService.deductCredits).mockResolvedValue({
        newBalance: 50000,
        ledgerEntryId: 'ledger_123',
      });

      await creditPackService.refundPurchase('purchase_123', 'Customer request');

      expect(mockPaymentProvider.createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        amount: 4900,
        reason: 'requested_by_customer',
        metadata: { reason: 'Customer request' },
      });
      expect(creditPackPurchaseRepository.update).toHaveBeenCalledWith(
        'purchase_123',
        expect.objectContaining({
          status: 'refunded',
          refundedAt: expect.any(Date),
        })
      );
      expect(creditService.deductCredits).toHaveBeenCalledWith(
        mockAccountId,
        100000,
        'Refund - Credit pack purchase purchase_123',
        expect.objectContaining({
          type: 'deduction',
          metadata: expect.objectContaining({
            refunded: true,
            originalPurchaseId: 'purchase_123',
          }),
        })
      );
    });
  });
});
