/**
 * Unit tests for Invoice Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test invoice generation, line items, status changes
 * - Test PDF generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from '../../../src/services/invoice.service.js';
import { invoiceRepository } from '../../../src/db/repositories/invoice.repository.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { paymentMethodRepository } from '../../../src/db/repositories/paymentMethod.repository.js';
import type { Account, Invoice, PaymentMethod } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/db/repositories/invoice.repository.js', () => ({
  invoiceRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    addLineItem: vi.fn(),
    getLineItems: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/paymentMethod.repository.js', () => ({
  paymentMethodRepository: {
    findDefaultByAccountId: vi.fn(),
  },
}));

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  const mockAccountId = 'test-account-id';
  const mockInvoiceId = 'test-invoice-id';

  beforeEach(() => {
    vi.clearAllMocks();
    invoiceService = new InvoiceService();
  });

  describe('createInvoice', () => {
    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.createInvoice({
          accountId: mockAccountId,
          description: 'Test invoice',
        })
      ).rejects.toThrow('Account not found');
    });

    it('should create invoice with default values', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        billingEmail: 'billing@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(null);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);

      const result = await invoiceService.createInvoice({
        accountId: mockAccountId,
        description: 'Test invoice',
      });

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockAccountId,
          status: 'draft',
          currency: 'USD',
          billingName: 'Test Account',
          billingEmail: 'billing@example.com',
          description: 'Test invoice',
        })
      );
    });

    it('should create invoice with default payment method', async () => {
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

      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_123',
        accountId: mockAccountId,
        paystackPaymentMethodId: 'paystack_pm_123',
        type: 'card',
        isDefault: true,
        cardBrand: 'visa',
        cardLast4: '4242',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(mockPaymentMethod);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);

      await invoiceService.createInvoice({
        accountId: mockAccountId,
        description: 'Test invoice',
      });

      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethodId: 'pm_123',
        })
      );
    });

    it('should create invoice with period dates', async () => {
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

      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        periodStart,
        periodEnd,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(null);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);

      await invoiceService.createInvoice({
        accountId: mockAccountId,
        description: 'Monthly subscription',
        periodStart,
        periodEnd,
      });

      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart,
          periodEnd,
        })
      );
    });
  });

  describe('addLineItem', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.addLineItem(mockInvoiceId, {
          type: 'subscription',
          description: 'Pro Plan',
          unitAmount: 4900,
        })
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw error when invoice is not draft', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);

      await expect(
        invoiceService.addLineItem(mockInvoiceId, {
          type: 'subscription',
          description: 'Pro Plan',
          unitAmount: 4900,
        })
      ).rejects.toThrow('Cannot add line items to a finalized invoice');
    });

    it('should add line item with default quantity', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      await invoiceService.addLineItem(mockInvoiceId, {
        type: 'subscription',
        description: 'Pro Plan Subscription',
        unitAmount: 4900,
      });

      expect(invoiceRepository.addLineItem).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: mockInvoiceId,
          type: 'subscription',
          quantity: 1,
          unitAmount: 4900,
          amount: 4900,
          currency: 'USD',
        })
      );
    });

    it('should add line item with custom quantity', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      await invoiceService.addLineItem(mockInvoiceId, {
        type: 'credit_pack',
        description: 'Credit Pack',
        quantity: 2,
        unitAmount: 1500,
      });

      expect(invoiceRepository.addLineItem).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 2,
          unitAmount: 1500,
          amount: 3000,
        })
      );
    });

    it('should update invoice totals after adding line item', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([
        { amount: 4900 },
        { amount: 1500 },
      ]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      await invoiceService.addLineItem(mockInvoiceId, {
        type: 'subscription',
        description: 'Pro Plan',
        unitAmount: 4900,
      });

      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          subtotal: 6400,
          tax: 0,
          total: 6400,
          amountDue: 6400,
        })
      );
    });

    it('should handle metadata in line item', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const metadata = { proration: true, daysRemaining: 15 };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      await invoiceService.addLineItem(mockInvoiceId, {
        type: 'proration',
        description: 'Prorated charge',
        unitAmount: 2500,
        metadata,
      });

      expect(invoiceRepository.addLineItem).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        })
      );
    });
  });

  describe('finalizeInvoice', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.finalizeInvoice(mockInvoiceId)
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw error when invoice is already finalized', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);

      await expect(
        invoiceService.finalizeInvoice(mockInvoiceId)
      ).rejects.toThrow('Invoice is already finalized');
    });

    it('should finalize draft invoice', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'draft',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        status: 'open',
      });

      const result = await invoiceService.finalizeInvoice(mockInvoiceId);

      expect(result.status).toBe('open');
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          status: 'open',
        })
      );
    });
  });

  describe('markPaid', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.markPaid(mockInvoiceId)
      ).rejects.toThrow('Invoice not found');
    });

    it('should mark invoice as paid', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
        amountPaid: 4900,
        amountDue: 0,
        paidAt: new Date(),
      });

      const result = await invoiceService.markPaid(mockInvoiceId, 'pi_123');

      expect(result.status).toBe('paid');
      expect(result.amountPaid).toBe(4900);
      expect(result.amountDue).toBe(0);
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          status: 'paid',
          amountPaid: 4900,
          amountDue: 0,
          paidAt: expect.any(Date),
          metadata: expect.objectContaining({
            paymentIntentId: 'pi_123',
          }),
        })
      );
    });

    it('should update account last payment date', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as Account);

      await invoiceService.markPaid(mockInvoiceId);

      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          lastPaymentAt: expect.any(Date),
        })
      );
    });
  });

  describe('markFailed', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.markFailed(mockInvoiceId, 'Card declined')
      ).rejects.toThrow('Invoice not found');
    });

    it('should mark invoice as uncollectible', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        status: 'uncollectible',
      });

      const result = await invoiceService.markFailed(mockInvoiceId, 'Card declined');

      expect(result.status).toBe('uncollectible');
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          status: 'uncollectible',
          metadata: expect.objectContaining({
            failureReason: 'Card declined',
            failedAt: expect.any(String),
          }),
        })
      );
    });
  });

  describe('voidInvoice', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.voidInvoice(mockInvoiceId, 'Duplicate')
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw error when invoice is already paid', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);

      await expect(
        invoiceService.voidInvoice(mockInvoiceId, 'Mistake')
      ).rejects.toThrow('Cannot void a paid invoice');
    });

    it('should void unpaid invoice', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        status: 'void',
        amountDue: 0,
      });

      const result = await invoiceService.voidInvoice(mockInvoiceId, 'Customer request');

      expect(result.status).toBe('void');
      expect(result.amountDue).toBe(0);
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          status: 'void',
          voidedAt: expect.any(Date),
          amountDue: 0,
          metadata: expect.objectContaining({
            voidReason: 'Customer request',
          }),
        })
      );
    });
  });

  describe('generatePDF', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.generatePDF(mockInvoiceId)
      ).rejects.toThrow('Invoice not found');
    });

    it('should return existing PDF URL if already generated', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        pdfUrl: '/invoices/INV-202401-0001.pdf',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);

      const result = await invoiceService.generatePDF(mockInvoiceId);

      expect(result).toBe('/invoices/INV-202401-0001.pdf');
      expect(invoiceRepository.update).not.toHaveBeenCalled();
    });

    it('should generate PDF URL and update invoice', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.update).mockResolvedValue({
        ...mockInvoice,
        pdfUrl: '/invoices/INV-202401-0001.pdf',
      });

      const result = await invoiceService.generatePDF(mockInvoiceId);

      expect(result).toBe('/invoices/INV-202401-0001.pdf');
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        mockInvoiceId,
        expect.objectContaining({
          pdfUrl: '/invoices/INV-202401-0001.pdf',
          pdfGeneratedAt: expect.any(Date),
        })
      );
    });
  });

  describe('getInvoiceWithLineItems', () => {
    it('should throw error when invoice not found', async () => {
      vi.mocked(invoiceRepository.findById).mockResolvedValue(null);

      await expect(
        invoiceService.getInvoiceWithLineItems(mockInvoiceId)
      ).rejects.toThrow('Invoice not found');
    });

    it('should return invoice with line items', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'paid',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 4900,
        amountDue: 0,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLineItems = [
        { id: 'li_1', description: 'Pro Plan', amount: 4900 },
      ];

      vi.mocked(invoiceRepository.findById).mockResolvedValue(mockInvoice);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue(mockLineItems);

      const result = await invoiceService.getInvoiceWithLineItems(mockInvoiceId);

      expect(result.invoice).toEqual(mockInvoice);
      expect(result.lineItems).toEqual(mockLineItems);
    });
  });

  describe('createSubscriptionInvoice', () => {
    it('should create subscription invoice with line item', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 4900,
        tax: 0,
        total: 4900,
        amountPaid: 0,
        amountDue: 4900,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue({
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(null);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);
      // addLineItem calls findById to check invoice status; must be 'draft' for writes to proceed
      vi.mocked(invoiceRepository.findById).mockResolvedValue({ ...mockInvoice, status: 'draft' });
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      const result = await invoiceService.createSubscriptionInvoice({
        accountId: mockAccountId,
        subscriptionId: 'sub_123',
        planName: 'Pro',
        amount: 4900,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Pro Plan - Monthly Subscription',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31'),
        })
      );
    });
  });

  describe('createCreditPackInvoice', () => {
    it('should create credit pack invoice', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 1500,
        tax: 0,
        total: 1500,
        amountPaid: 0,
        amountDue: 1500,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue({
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(null);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);
      // addLineItem calls findById to check invoice status; must be 'draft' for writes to proceed
      vi.mocked(invoiceRepository.findById).mockResolvedValue({ ...mockInvoice, status: 'draft' });
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      const result = await invoiceService.createCreditPackInvoice({
        accountId: mockAccountId,
        creditPackPurchaseId: 'purchase_123',
        packSize: 10000,
        amount: 1500,
      });

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Credit Pack Purchase - 10,000 credits',
        })
      );
    });
  });

  describe('createProrationInvoice', () => {
    it('should create proration invoice', async () => {
      const mockInvoice: Invoice = {
        id: mockInvoiceId,
        accountId: mockAccountId,
        status: 'open',
        subtotal: 2500,
        tax: 0,
        total: 2500,
        amountPaid: 0,
        amountDue: 2500,
        currency: 'USD',
        invoiceDate: new Date(),
        invoiceNumber: 'INV-202401-0001',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue({
        id: mockAccountId,
        displayName: 'Test Account',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentMethodRepository.findDefaultByAccountId).mockResolvedValue(null);
      vi.mocked(invoiceRepository.create).mockResolvedValue(mockInvoice);
      // addLineItem calls findById to check invoice status; must be 'draft' for writes to proceed
      vi.mocked(invoiceRepository.findById).mockResolvedValue({ ...mockInvoice, status: 'draft' });
      vi.mocked(invoiceRepository.addLineItem).mockResolvedValue(undefined);
      vi.mocked(invoiceRepository.getLineItems).mockResolvedValue([]);
      vi.mocked(invoiceRepository.update).mockResolvedValue(mockInvoice);

      const result = await invoiceService.createProrationInvoice({
        accountId: mockAccountId,
        subscriptionId: 'sub_123',
        description: 'Prorated upgrade charge',
        amount: 2500,
      });

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Prorated upgrade charge',
        })
      );
    });
  });
});
