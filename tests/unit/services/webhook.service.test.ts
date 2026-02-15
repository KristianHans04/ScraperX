/**
 * Unit tests for Webhook Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test webhook signature verification
 * - Test event routing and idempotency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../../../src/services/webhook.service.js';
import { creditPackPurchaseRepository } from '../../../src/db/repositories/creditPackPurchase.repository.js';
import { invoiceRepository } from '../../../src/db/repositories/invoice.repository.js';
import { subscriptionRepository } from '../../../src/db/repositories/subscription.repository.js';
import { invoiceService } from '../../../src/services/invoice.service.js';
import { creditService } from '../../../src/services/credit.service.js';
import { paymentFailureService } from '../../../src/services/paymentFailure.service.js';
import { pool } from '../../../src/db/index.js';
import type { CreditPackPurchase, Invoice, Subscription } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/db/repositories/creditPackPurchase.repository.js', () => ({
  creditPackPurchaseRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/invoice.repository.js', () => ({
  invoiceRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findByPaystackSubscriptionCode: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/services/invoice.service.js', () => ({
  invoiceService: {
    markPaid: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock('../../../src/services/credit.service.js', () => ({
  creditService: {
    purchaseCreditPack: vi.fn(),
  },
}));

vi.mock('../../../src/services/paymentFailure.service.js', () => ({
  paymentFailureService: {
    recordFailure: vi.fn(),
    getFailureState: vi.fn(),
    clearFailure: vi.fn(),
  },
}));

vi.mock('../../../src/db/index.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock PaystackPaymentProvider
vi.mock('../../../src/services/payment/PaystackPaymentProvider.js', () => ({
  PaystackPaymentProvider: vi.fn().mockImplementation(() => ({
    verifyWebhookSignature: vi.fn(),
  })),
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = 'test_secret_key';
    webhookService = new WebhookService();
  });

  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  describe('constructor', () => {
    it('should throw error when PAYSTACK_SECRET_KEY is not configured', () => {
      delete process.env.PAYSTACK_SECRET_KEY;
      expect(() => new WebhookService()).toThrow('PAYSTACK_SECRET_KEY is not configured');
    });
  });

  describe('processPaystackWebhook', () => {
    it('should skip already processed events', async () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { id: 'evt_123' } });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.success',
        data: { object: { reference: 'ref_123' } },
        created: Date.now(),
      });

      // First call - table doesn't exist, creates it
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('Table does not exist'));
      // Second call - returns that event was processed
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ event_id: 'evt_123' }] });

      // Mock ensureProcessedEventsTable
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      await webhookService.processPaystackWebhook(payload, signature);

      expect(creditService.purchaseCreditPack).not.toHaveBeenCalled();
    });

    it('should process charge.success for credit pack', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          metadata: {
            creditPackPurchaseId: 'purchase_123',
            accountId: 'account_123',
          },
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.success',
        data: {
          object: {
            reference: 'ref_123',
            metadata: {
              creditPackPurchaseId: 'purchase_123',
              accountId: 'account_123',
            },
          },
        },
        created: Date.now(),
      });

      const mockPurchase: CreditPackPurchase = {
        id: 'purchase_123',
        accountId: 'account_123',
        packSize: 100000,
        amountPaid: 4900,
        currency: 'NGN',
        status: 'processing',
        invoiceId: 'inv_123',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check event processed
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      // Mark event processed
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

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
      } as any);
      vi.mocked(paymentFailureService.getFailureState).mockResolvedValue({
        hasFailure: false,
      });

      await webhookService.processPaystackWebhook(payload, signature);

      expect(creditPackPurchaseRepository.update).toHaveBeenCalledWith(
        'purchase_123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        })
      );
      expect(creditService.purchaseCreditPack).toHaveBeenCalledWith(
        'account_123',
        100000,
        'purchase_123',
        'Credit pack purchase - 100,000 credits'
      );
      expect(invoiceService.markPaid).toHaveBeenCalledWith('inv_123', 'ref_123');
    });

    it('should process charge.success for invoice payment', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          metadata: {
            invoiceId: 'inv_123',
          },
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.success',
        data: {
          object: {
            reference: 'ref_123',
            metadata: {
              invoiceId: 'inv_123',
            },
          },
        },
        created: Date.now(),
      });

      const mockInvoice: Invoice = {
        id: 'inv_123',
        accountId: 'account_123',
        status: 'open',
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

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceService.markPaid).mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
      });
      vi.mocked(paymentFailureService.getFailureState).mockResolvedValue({
        hasFailure: false,
      });

      await webhookService.processPaystackWebhook(payload, signature);

      expect(invoiceService.markPaid).toHaveBeenCalledWith('inv_123', 'ref_123');
    });

    it('should clear payment failure on successful payment', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          metadata: {
            invoiceId: 'inv_123',
            accountId: 'account_123',
          },
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.success',
        data: {
          object: {
            reference: 'ref_123',
            metadata: {
              invoiceId: 'inv_123',
              accountId: 'account_123',
            },
          },
        },
        created: Date.now(),
      });

      const mockInvoice: Invoice = {
        id: 'inv_123',
        accountId: 'account_123',
        status: 'open',
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

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceService.markPaid).mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
      });
      vi.mocked(paymentFailureService.getFailureState).mockResolvedValue({
        hasFailure: true,
        stage: 'grace',
      });
      vi.mocked(paymentFailureService.clearFailure).mockResolvedValue(undefined);

      await webhookService.processPaystackWebhook(payload, signature);

      expect(paymentFailureService.clearFailure).toHaveBeenCalledWith(
        'account_123',
        'payment_succeeded'
      );
    });

    it('should process charge.failed event', async () => {
      const payload = JSON.stringify({
        event: 'charge.failed',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          metadata: {
            accountId: 'account_123',
            invoiceId: 'inv_123',
          },
          gateway_response: 'Insufficient funds',
          message: 'Your card was declined',
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.failed',
        data: {
          object: {
            reference: 'ref_123',
            metadata: {
              accountId: 'account_123',
              invoiceId: 'inv_123',
            },
            gateway_response: 'Insufficient funds',
            message: 'Your card was declined',
          },
        },
        created: Date.now(),
      });

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      vi.mocked(paymentFailureService.recordFailure).mockResolvedValue(undefined);
      vi.mocked(invoiceService.markFailed).mockResolvedValue({
        id: 'inv_123',
        status: 'uncollectible',
      } as any);

      await webhookService.processPaystackWebhook(payload, signature);

      expect(paymentFailureService.recordFailure).toHaveBeenCalledWith({
        accountId: 'account_123',
        failureCode: 'Insufficient funds',
        failureMessage: 'Your card was declined',
        invoiceId: 'inv_123',
        subscriptionId: undefined,
      });
    });

    it('should handle subscription.disable event', async () => {
      const payload = JSON.stringify({
        event: 'subscription.disable',
        data: {
          id: 'evt_123',
          subscription_code: 'sub_code_123',
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'subscription.disable',
        data: {
          object: {
            subscription_code: 'sub_code_123',
          },
        },
        created: Date.now(),
      });

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      vi.mocked(subscriptionRepository.findByPaystackSubscriptionCode).mockResolvedValue({
        id: 'sub_db_123',
        accountId: 'account_123',
        plan: 'pro',
        status: 'active',
        paystackSubscriptionCode: 'sub_code_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        id: 'sub_db_123',
        status: 'canceled',
      } as Subscription);

      await webhookService.processPaystackWebhook(payload, signature);

      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          status: 'canceled',
          canceledAt: expect.any(Date),
          endedAt: expect.any(Date),
        })
      );
    });

    it('should handle subscription.not_renew event', async () => {
      const payload = JSON.stringify({
        event: 'subscription.not_renew',
        data: {
          id: 'evt_123',
          subscription_code: 'sub_code_123',
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'subscription.not_renew',
        data: {
          object: {
            subscription_code: 'sub_code_123',
          },
        },
        created: Date.now(),
      });

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      vi.mocked(subscriptionRepository.findByPaystackSubscriptionCode).mockResolvedValue({
        id: 'sub_db_123',
        accountId: 'account_123',
        plan: 'pro',
        status: 'active',
        paystackSubscriptionCode: 'sub_code_123',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        id: 'sub_db_123',
        cancelAtPeriodEnd: true,
      } as Subscription);

      await webhookService.processPaystackWebhook(payload, signature);

      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          cancelAtPeriodEnd: true,
        })
      );
    });

    it('should log unhandled event types', async () => {
      const payload = JSON.stringify({
        event: 'transfer.success',
        data: {
          id: 'evt_123',
        },
      });
      const signature = 'valid_signature';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'transfer.success',
        data: {
          object: {},
        },
        created: Date.now(),
      });

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      await webhookService.processPaystackWebhook(payload, signature);

      expect(consoleSpy).toHaveBeenCalledWith('Transfer event:', 'transfer.success');
      consoleSpy.mockRestore();
    });

    it('should handle missing metadata gracefully', async () => {
      const payload = JSON.stringify({
        event: 'charge.failed',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          gateway_response: 'Insufficient funds',
          message: 'Your card was declined',
        },
      });
      const signature = 'valid_signature';

      const mockProvider = (webhookService as any).paymentProvider;
      mockProvider.verifyWebhookSignature.mockReturnValue({
        id: 'evt_123',
        type: 'charge.failed',
        data: {
          object: {
            reference: 'ref_123',
            gateway_response: 'Insufficient funds',
            message: 'Your card was declined',
          },
        },
        created: Date.now(),
      });

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

      await webhookService.processPaystackWebhook(payload, signature);

      expect(paymentFailureService.recordFailure).not.toHaveBeenCalled();
    });
  });
});
