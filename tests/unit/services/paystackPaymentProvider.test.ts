/**
 * Unit tests for Paystack Payment Provider
 * Phase 8: Billing and Credits
 *
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test all payment provider methods
 * - Test webhook signature verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaystackPaymentProvider } from '../../../src/services/payment/PaystackPaymentProvider.js';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

describe('PaystackPaymentProvider', () => {
  let provider: PaystackPaymentProvider;
  let mockClient: any;
  const mockSecretKey = 'sk_test_123456789';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PaystackPaymentProvider(mockSecretKey);
    mockClient = (axios.create as any).mock.results[0]?.value || {
      post: vi.fn(),
      get: vi.fn(),
    };
  });

  describe('constructor', () => {
    it('should create axios client with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.paystack.co',
        headers: {
          Authorization: `Bearer ${mockSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('name', () => {
    it('should return paystack as provider name', () => {
      expect(provider.name).toBe('paystack');
    });
  });

  describe('createCustomer', () => {
    it('should create customer with all fields', async () => {
      const mockResponse = {
        data: {
          data: {
            customer_code: 'CUS_123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createCustomer({
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { accountId: 'acc_123' },
      });

      expect(mockClient.post).toHaveBeenCalledWith('/customer', {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        metadata: { accountId: 'acc_123' },
      });
      expect(result).toEqual({
        id: 'CUS_123',
        email: 'test@example.com',
        name: 'John Doe',
      });
    });

    it('should handle customer without name', async () => {
      const mockResponse = {
        data: {
          data: {
            customer_code: 'CUS_123',
            email: 'test@example.com',
            first_name: '',
            last_name: '',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createCustomer({
        email: 'test@example.com',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/customer', {
        email: 'test@example.com',
        first_name: '',
        last_name: '',
        metadata: undefined,
      });
      expect(result.name).toBe('');
    });

    it('should handle single name', async () => {
      const mockResponse = {
        data: {
          data: {
            customer_code: 'CUS_123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: '',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createCustomer({
        email: 'test@example.com',
        name: 'John',
      });

      expect(result.name).toBe('John');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const now = new Date();
      const nextPayment = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const mockResponse = {
        data: {
          data: {
            subscription_code: 'SUB_123',
            customer: {
              customer_code: 'CUS_123',
            },
            plan: {
              plan_code: 'PLN_pro',
            },
            status: 'active',
            createdAt: now.toISOString(),
            next_payment_date: nextPayment.toISOString(),
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createSubscription({
        customerId: 'CUS_123',
        priceId: 'PLN_pro',
        paymentMethodId: 'AUTH_123',
        metadata: { accountId: 'acc_123' },
      });

      expect(mockClient.post).toHaveBeenCalledWith('/subscription', {
        customer: 'CUS_123',
        plan: 'PLN_pro',
        authorization: 'AUTH_123',
      });
      expect(result).toEqual({
        id: 'SUB_123',
        customerId: 'CUS_123',
        priceId: 'PLN_pro',
        status: 'active',
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
        cancelAtPeriodEnd: false,
      });
    });
  });

  describe('updateSubscription', () => {
    it('should throw error as Paystack does not support subscription updates', async () => {
      await expect(
        provider.updateSubscription({
          subscriptionId: 'SUB_123',
          priceId: 'PLN_enterprise',
        })
      ).rejects.toThrow('Paystack does not support subscription updates - cancel and recreate instead');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      mockClient.post.mockResolvedValue({ data: { status: true } });

      const result = await provider.cancelSubscription('SUB_123', true);

      expect(mockClient.post).toHaveBeenCalledWith('/subscription/disable', {
        code: 'SUB_123',
        token: 'SUB_123',
      });
      expect(result).toEqual({
        id: 'SUB_123',
        status: 'canceled',
        canceledAt: expect.any(Date),
        endedAt: undefined,
      });
    });

    it('should cancel subscription immediately', async () => {
      mockClient.post.mockResolvedValue({ data: { status: true } });

      const result = await provider.cancelSubscription('SUB_123', false);

      expect(result).toEqual({
        id: 'SUB_123',
        status: 'canceled',
        canceledAt: expect.any(Date),
        endedAt: expect.any(Date),
      });
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with metadata', async () => {
      const mockResponse = {
        data: {
          data: {
            reference: 'REF_123',
            access_code: 'ACCESS_123',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createPaymentIntent({
        customerId: 'CUS_123',
        amount: 4900,
        currency: 'NGN',
        description: 'Credit Pack',
        metadata: {
          email: 'test@example.com',
          accountId: 'acc_123',
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith('/transaction/initialize', {
        email: 'test@example.com',
        amount: 4900,
        currency: 'NGN',
        metadata: {
          email: 'test@example.com',
          accountId: 'acc_123',
        },
        channels: ['card'],
      });
      expect(result).toEqual({
        id: 'REF_123',
        clientSecret: 'ACCESS_123',
        status: 'pending',
        amount: 4900,
        currency: 'NGN',
      });
    });

    it('should handle empty metadata', async () => {
      const mockResponse = {
        data: {
          data: {
            reference: 'REF_123',
            access_code: 'ACCESS_123',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      await provider.createPaymentIntent({
        customerId: 'CUS_123',
        amount: 4900,
        currency: 'NGN',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/transaction/initialize',
        expect.objectContaining({
          email: '',
        })
      );
    });
  });

  describe('createRefund', () => {
    it('should create refund with all parameters', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 12345,
            status: 'success',
            amount: 4900,
            currency: 'NGN',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await provider.createRefund({
        paymentIntentId: 'REF_123',
        amount: 4900,
        reason: 'requested_by_customer',
        metadata: { reason: 'Customer request', note: 'Refund approved' },
      });

      expect(mockClient.post).toHaveBeenCalledWith('/refund', {
        transaction: 'REF_123',
        amount: 4900,
        currency: 'NGN',
        customer_note: 'Customer request',
        merchant_note: 'Refund approved',
      });
      expect(result).toEqual({
        id: '12345',
        status: 'success',
        amount: 4900,
        currency: 'NGN',
      });
    });

    it('should handle refund without metadata', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 12345,
            status: 'success',
            amount: 4900,
            currency: 'NGN',
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      await provider.createRefund({
        paymentIntentId: 'REF_123',
        amount: 4900,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/refund',
        expect.objectContaining({
          customer_note: '',
          merchant_note: '',
        })
      );
    });
  });

  describe('attachPaymentMethod', () => {
    it('should return payment method ID and customer ID', async () => {
      const result = await provider.attachPaymentMethod({
        paymentMethodId: 'AUTH_123',
        customerId: 'CUS_123',
      });

      expect(result).toEqual({
        id: 'AUTH_123',
        customerId: 'CUS_123',
      });
    });
  });

  describe('detachPaymentMethod', () => {
    it('should return payment method ID', async () => {
      const result = await provider.detachPaymentMethod({
        paymentMethodId: 'AUTH_123',
      });

      expect(result).toEqual({
        id: 'AUTH_123',
      });
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should do nothing (Paystack handles this via authorization codes)', async () => {
      const result = await provider.setDefaultPaymentMethod('CUS_123', 'AUTH_123');
      expect(result).toBeUndefined();
    });
  });

  describe('retrieveInvoice', () => {
    it('should throw error as Paystack does not have invoice API', async () => {
      await expect(
        provider.retrieveInvoice({ invoiceId: 'INV_123' })
      ).rejects.toThrow('Paystack does not have invoice API - manage invoices internally');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const crypto = require('crypto');
      const secret = 'whsec_test_secret';
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 'evt_123',
          reference: 'ref_123',
          createdAt: '2024-01-15T10:00:00Z',
        },
      });

      // Create valid signature
      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const result = provider.verifyWebhookSignature(payload, hash, secret);

      expect(result).toEqual({
        id: 'evt_123',
        type: 'charge.success',
        data: {
          object: {
            id: 'evt_123',
            reference: 'ref_123',
            createdAt: '2024-01-15T10:00:00Z',
          },
        },
        created: expect.any(Number),
      });
    });

    it('should throw error for invalid signature', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: {} });
      const invalidSignature = 'invalid_signature';
      const secret = 'whsec_test_secret';

      expect(() => {
        provider.verifyWebhookSignature(payload, invalidSignature, secret);
      }).toThrow('Invalid webhook signature');
    });

    it('should handle data without id but with reference', () => {
      const crypto = require('crypto');
      const secret = 'whsec_test_secret';
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference: 'ref_123',
        },
      });

      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const result = provider.verifyWebhookSignature(payload, hash, secret);

      expect(result.id).toBe('ref_123');
    });

    it('should handle data without createdAt', () => {
      const crypto = require('crypto');
      const secret = 'whsec_test_secret';
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 'evt_123',
        },
      });

      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const result = provider.verifyWebhookSignature(payload, hash, secret);

      expect(result.created).toBeGreaterThan(0);
    });
  });

  describe('constructWebhookEvent', () => {
    it('should call verifyWebhookSignature', () => {
      const crypto = require('crypto');
      const secret = 'whsec_test_secret';
      const payload = JSON.stringify({ event: 'charge.success', data: { id: 'evt_123' } });

      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const result = provider.constructWebhookEvent(payload, hash, secret);

      expect(result).toEqual({
        id: 'evt_123',
        type: 'charge.success',
        data: {
          object: {
            id: 'evt_123',
          },
        },
        created: expect.any(Number),
      });
    });
  });
});
