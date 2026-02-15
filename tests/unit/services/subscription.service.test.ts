/**
 * Unit tests for Subscription Service
 * Phase 8: Billing and Credits
 * 
 * Requirements:
 * - 100% line and branch coverage for all billing operations
 * - Test subscription lifecycle (create, upgrade, downgrade, cancel, reactivate)
 * - Test proration calculations
 */

// Set environment variables BEFORE importing the service module
process.env.PAYSTACK_PRO_PLAN_CODE = 'PLN_pro_plan';
process.env.PAYSTACK_ENTERPRISE_PLAN_CODE = 'PLN_enterprise_plan';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionService } from '../../../src/services/subscription.service.js';
import { accountRepository } from '../../../src/db/repositories/account.repository.js';
import { subscriptionRepository } from '../../../src/db/repositories/subscription.repository.js';
import { invoiceRepository } from '../../../src/db/repositories/invoice.repository.js';
import { creditService } from '../../../src/services/credit.service.js';
import { PaymentProvider } from '../../../src/services/payment/PaymentProvider.interface.js';
import type { Account, Subscription, PlanType } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findById: vi.fn(),
    findByAccountId: vi.fn(),
    findByStripeSubscriptionId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findPendingRenewals: vi.fn(),
    findScheduledChanges: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/invoice.repository.js', () => ({
  invoiceRepository: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/services/credit.service.js', () => ({
  creditService: {
    allocateCredits: vi.fn(),
    resetCycleCredits: vi.fn(),
  },
}));



describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockPaymentProvider: PaymentProvider;
  const mockAccountId = 'test-account-id';

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock payment provider
    mockPaymentProvider = {
      name: 'paystack',
      createCustomer: vi.fn(),
      createSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
      createPaymentIntent: vi.fn(),
      createRefund: vi.fn(),
      attachPaymentMethod: vi.fn(),
      detachPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      retrieveInvoice: vi.fn(),
      verifyWebhookSignature: vi.fn(),
      constructWebhookEvent: vi.fn(),
    } as unknown as PaymentProvider;

    subscriptionService = new SubscriptionService(mockPaymentProvider);
  });

  describe('createSubscription', () => {
    it('should throw error for free plan', async () => {
      await expect(
        subscriptionService.createSubscription(mockAccountId, 'free')
      ).rejects.toThrow('Cannot create subscription for free plan');
    });

    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        subscriptionService.createSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Account not found');
    });

    it('should throw error when account already has subscription', async () => {
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

      await expect(
        subscriptionService.createSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Account already has an active subscription');
    });

    it('should create customer if not exists', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        billingEmail: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(mockPaymentProvider.createCustomer).mockResolvedValue({
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test User',
      });
      vi.mocked(mockPaymentProvider.createSubscription).mockResolvedValue({
        id: 'sub_123',
        customerId: 'cus_123',
        priceId: 'PLN_pro_plan',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.create).mockResolvedValue({
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        paystackSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 51000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.createSubscription(mockAccountId, 'pro');

      expect(mockPaymentProvider.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { accountId: mockAccountId },
      });
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({ stripeCustomerId: 'cus_123' })
      );
    });

    it('should attach payment method if provided', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        billingEmail: 'test@example.com',
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(mockPaymentProvider.attachPaymentMethod).mockResolvedValue({
        id: 'pm_123',
        customerId: 'cus_123',
      });
      vi.mocked(mockPaymentProvider.setDefaultPaymentMethod).mockResolvedValue(undefined);
      vi.mocked(mockPaymentProvider.createSubscription).mockResolvedValue({
        id: 'sub_123',
        customerId: 'cus_123',
        priceId: 'PLN_pro_plan',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.create).mockResolvedValue({
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 51000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.createSubscription(mockAccountId, 'pro', 'pm_123');

      expect(mockPaymentProvider.attachPaymentMethod).toHaveBeenCalledWith({
        paymentMethodId: 'pm_123',
        customerId: 'cus_123',
      });
      expect(mockPaymentProvider.setDefaultPaymentMethod).toHaveBeenCalledWith(
        'cus_123',
        'pm_123'
      );
    });

    it('should throw error if plan price ID not configured', async () => {
      delete process.env.PAYSTACK_PRO_PLAN_CODE;

      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.createSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('No price ID configured for plan: pro');
    });

    it('should allocate initial credits for the plan', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        billingEmail: 'test@example.com',
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(mockPaymentProvider.createSubscription).mockResolvedValue({
        id: 'sub_123',
        customerId: 'cus_123',
        priceId: 'PLN_pro_plan',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.create).mockResolvedValue({
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 51000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.createSubscription(mockAccountId, 'pro');

      expect(creditService.allocateCredits).toHaveBeenCalledWith(
        mockAccountId,
        50000, // Pro plan credits
        'Initial pro plan credit allocation'
      );
    });

    it('should update account with subscription details', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        billingEmail: 'test@example.com',
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(mockPaymentProvider.createSubscription).mockResolvedValue({
        id: 'sub_123',
        customerId: 'cus_123',
        priceId: 'PLN_pro_plan',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.create).mockResolvedValue({
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Subscription);
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 51000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.createSubscription(mockAccountId, 'pro');

      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          plan: 'pro',
          stripeSubscriptionId: 'sub_123',
          billingCycleStart: now,
          billingCycleEnd: periodEnd,
        })
      );
    });
  });

  describe('upgradeSubscription', () => {
    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        subscriptionService.upgradeSubscription(mockAccountId, 'enterprise')
      ).rejects.toThrow('Account not found');
    });

    it('should throw error when already on same plan', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.upgradeSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Already on this plan');
    });

    it('should throw error when upgrading from free plan', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'free',
        creditBalance: 1000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.upgradeSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Use createSubscription for upgrades from free plan');
    });

    it('should throw error when trying to downgrade via upgrade', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'enterprise',
        creditBalance: 250000,
        creditCycleUsage: 0,
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.upgradeSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Use downgradeSubscription for downgrades');
    });

    it('should throw error when no active subscription found', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(null);

      await expect(
        subscriptionService.upgradeSubscription(mockAccountId, 'enterprise')
      ).rejects.toThrow('No active subscription found');
    });

    it('should upgrade subscription successfully', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const periodStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        plan: 'enterprise',
      });
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 290000,
        ledgerEntryId: 'ledger_123',
      });

      const result = await subscriptionService.upgradeSubscription(
        mockAccountId,
        'enterprise'
      );

      expect(result.subscription.plan).toBe('enterprise');
      expect(mockPaymentProvider.updateSubscription).toHaveBeenCalledWith({
        subscriptionId: 'sub_123',
        priceId: 'PLN_enterprise_plan',
        prorationBehavior: 'create_prorations',
        metadata: {
          accountId: mockAccountId,
          plan: 'enterprise',
          upgraded: 'true',
        },
      });
    });

    it('should allocate additional credits for upgrade', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        plan: 'enterprise',
      });
      vi.mocked(creditService.allocateCredits).mockResolvedValue({
        newBalance: 290000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.upgradeSubscription(mockAccountId, 'enterprise');

      // Enterprise (250000) - Pro (50000) = 200000 additional credits
      expect(creditService.allocateCredits).toHaveBeenCalledWith(
        mockAccountId,
        200000,
        'Upgrade to enterprise - additional credits'
      );
    });
  });

  describe('downgradeSubscription', () => {
    it('should throw error when account not found', async () => {
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      await expect(
        subscriptionService.downgradeSubscription(mockAccountId, 'free')
      ).rejects.toThrow('Account not found');
    });

    it('should throw error when already on same plan', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.downgradeSubscription(mockAccountId, 'pro')
      ).rejects.toThrow('Already on this plan');
    });

    it('should throw error when trying to upgrade via downgrade', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      await expect(
        subscriptionService.downgradeSubscription(mockAccountId, 'enterprise')
      ).rejects.toThrow('Use upgradeSubscription for upgrades');
    });

    it('should schedule downgrade at period end', async () => {
      const mockAccount: Account = {
        id: mockAccountId,
        displayName: 'Test User',
        plan: 'pro',
        creditBalance: 50000,
        creditCycleUsage: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        scheduledPlan: 'free',
        scheduledChangeDate: periodEnd,
      });

      const result = await subscriptionService.downgradeSubscription(
        mockAccountId,
        'free'
      );

      expect(result.scheduledPlan).toBe('free');
      expect(result.scheduledChangeDate).toEqual(periodEnd);
      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          scheduledPlan: 'free',
          scheduledChangeDate: periodEnd,
        })
      );
    });
  });

  describe('cancelDowngrade', () => {
    it('should throw error when no subscription found', async () => {
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(null);

      await expect(
        subscriptionService.cancelDowngrade(mockAccountId)
      ).rejects.toThrow('No active subscription found');
    });

    it('should throw error when no scheduled downgrade', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);

      await expect(
        subscriptionService.cancelDowngrade(mockAccountId)
      ).rejects.toThrow('No scheduled downgrade to cancel');
    });

    it('should cancel scheduled downgrade', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        scheduledPlan: 'free',
        scheduledChangeDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        scheduledPlan: null,
        scheduledChangeDate: null,
      });

      const result = await subscriptionService.cancelDowngrade(mockAccountId);

      expect(result.scheduledPlan).toBeNull();
      expect(result.scheduledChangeDate).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('should throw error when no active subscription found', async () => {
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(null);

      await expect(
        subscriptionService.cancelSubscription(mockAccountId)
      ).rejects.toThrow('No active subscription found');
    });

    it('should cancel subscription at period end by default', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.cancelSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        canceledAt: new Date(),
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      });

      const result = await subscriptionService.cancelSubscription(mockAccountId);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockPaymentProvider.cancelSubscription).toHaveBeenCalledWith(
        'sub_123',
        true
      );
    });

    it('should cancel subscription immediately when specified', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.cancelSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
        canceledAt: new Date(),
        endedAt: new Date(),
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
        endedAt: new Date(),
      });
      vi.mocked(creditService.resetCycleCredits).mockResolvedValue({
        newBalance: 1000,
        ledgerEntryId: 'ledger_123',
      });

      const result = await subscriptionService.cancelSubscription(mockAccountId, true);

      expect(result.status).toBe('canceled');
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          plan: 'free',
          stripeSubscriptionId: null,
        })
      );
      expect(creditService.resetCycleCredits).toHaveBeenCalledWith(mockAccountId, 1000);
    });
  });

  describe('reactivateSubscription', () => {
    it('should throw error when no subscription found', async () => {
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(null);

      await expect(
        subscriptionService.reactivateSubscription(mockAccountId)
      ).rejects.toThrow('No subscription found');
    });

    it('should throw error when subscription not scheduled for cancellation', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);

      await expect(
        subscriptionService.reactivateSubscription(mockAccountId)
      ).rejects.toThrow('Subscription is not scheduled for cancellation');
    });

    it('should reactivate subscription successfully', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: false,
      });

      const result = await subscriptionService.reactivateSubscription(mockAccountId);

      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(mockPaymentProvider.updateSubscription).toHaveBeenCalledWith({
        subscriptionId: 'sub_123',
        cancelAtPeriodEnd: false,
      });
    });
  });

  describe('processScheduledDowngrade', () => {
    it('should do nothing if no scheduled plan', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findById).mockResolvedValue(mockSubscription);

      await subscriptionService.processScheduledDowngrade('sub_db_123');

      expect(subscriptionRepository.update).not.toHaveBeenCalled();
    });

    it('should cancel subscription when scheduled to free', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        scheduledPlan: 'free',
        stripeSubscriptionId: 'sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findById).mockResolvedValue(mockSubscription);
      vi.mocked(subscriptionRepository.findByAccountId).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.cancelSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
        canceledAt: new Date(),
        endedAt: new Date(),
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
      });
      vi.mocked(creditService.resetCycleCredits).mockResolvedValue({
        newBalance: 1000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.processScheduledDowngrade('sub_db_123');

      expect(creditService.resetCycleCredits).toHaveBeenCalledWith(mockAccountId, 1000);
    });

    it('should process downgrade to lower paid plan', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'enterprise',
        status: 'active',
        cancelAtPeriodEnd: false,
        scheduledPlan: 'pro',
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findById).mockResolvedValue(mockSubscription);
      vi.mocked(mockPaymentProvider.updateSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
      });
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        plan: 'pro',
        scheduledPlan: null,
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as Account);
      vi.mocked(creditService.resetCycleCredits).mockResolvedValue({
        newBalance: 50000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.processScheduledDowngrade('sub_db_123');

      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          plan: 'pro',
          scheduledPlan: null,
          scheduledChangeDate: null,
        })
      );
      expect(creditService.resetCycleCredits).toHaveBeenCalledWith(mockAccountId, 50000);
    });
  });

  describe('renewBillingCycle', () => {
    it('should do nothing if subscription not found', async () => {
      vi.mocked(subscriptionRepository.findById).mockResolvedValue(null);

      await subscriptionService.renewBillingCycle('sub_123');

      expect(creditService.resetCycleCredits).not.toHaveBeenCalled();
    });

    it('should reset credits and advance billing period', async () => {
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-02-01');

      const mockSubscription: Subscription = {
        id: 'sub_db_123',
        accountId: mockAccountId,
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(subscriptionRepository.findById).mockResolvedValue(mockSubscription);
      vi.mocked(subscriptionRepository.update).mockResolvedValue({
        ...mockSubscription,
        currentPeriodStart: periodEnd,
        currentPeriodEnd: new Date('2024-03-01'),
      });
      vi.mocked(accountRepository.update).mockResolvedValue({} as Account);
      vi.mocked(creditService.resetCycleCredits).mockResolvedValue({
        newBalance: 50000,
        ledgerEntryId: 'ledger_123',
      });

      await subscriptionService.renewBillingCycle('sub_db_123');

      expect(creditService.resetCycleCredits).toHaveBeenCalledWith(mockAccountId, 50000);
      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          currentPeriodStart: periodEnd,
          currentPeriodEnd: expect.any(Date),
        })
      );
      expect(accountRepository.update).toHaveBeenCalledWith(
        mockAccountId,
        expect.objectContaining({
          billingCycleStart: periodEnd,
          billingCycleEnd: expect.any(Date),
        })
      );
    });
  });
});
