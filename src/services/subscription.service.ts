// Subscription Service
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { accountRepository } from '../db/repositories/account.repository.js';
import { subscriptionRepository } from '../db/repositories/subscription.repository.js';
import { invoiceRepository } from '../db/repositories/invoice.repository.js';
import { creditService } from './credit.service.js';
import { PaymentProvider } from './payment/PaymentProvider.interface.js';
import { PlanType, Subscription } from '../types/index.js';

function getPlanPrices() {
  return {
    free: { monthlyPrice: 0, priceId: null as string | null, credits: 1000 },
    pro: { monthlyPrice: 4900, priceId: process.env.PAYSTACK_PRO_PLAN_CODE ?? null, credits: 50000 },
    enterprise: { monthlyPrice: 19900, priceId: process.env.PAYSTACK_ENTERPRISE_PLAN_CODE ?? null, credits: 250000 },
  };
}

export class SubscriptionService {
  constructor(private paymentProvider: PaymentProvider) {}

  async createSubscription(
    accountId: string,
    plan: PlanType,
    paymentMethodId?: string
  ): Promise<Subscription> {
    if (plan === 'free') {
      throw new Error('Cannot create subscription for free plan');
    }

    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.plan !== 'free') {
      throw new Error('Account already has an active subscription');
    }

    let stripeCustomerId = account.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.paymentProvider.createCustomer({
        email: account.billingEmail || '',
        name: account.displayName,
        metadata: { accountId },
      });
      stripeCustomerId = customer.id;

      await accountRepository.update(accountId, {
        stripeCustomerId,
      });
    }

    if (paymentMethodId) {
      await this.paymentProvider.attachPaymentMethod({
        paymentMethodId,
        customerId: stripeCustomerId,
      });

      await this.paymentProvider.setDefaultPaymentMethod(stripeCustomerId, paymentMethodId);
    }

    const planConfig = getPlanPrices()[plan];
    if (!planConfig.priceId) {
      throw new Error(`No price ID configured for plan: ${plan}`);
    }

    const stripeSubscription = await this.paymentProvider.createSubscription({
      customerId: stripeCustomerId,
      priceId: planConfig.priceId,
      paymentMethodId,
      metadata: { accountId, plan },
    });

    const subscription = await subscriptionRepository.create({
      accountId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId,
      stripePriceId: planConfig.priceId,
      plan,
      status: stripeSubscription.status as any,
      currentPeriodStart: stripeSubscription.currentPeriodStart,
      currentPeriodEnd: stripeSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
      metadata: { createdBySystem: true },
    });

    await accountRepository.update(accountId, {
      plan,
      stripeSubscriptionId: stripeSubscription.id,
      billingCycleStart: stripeSubscription.currentPeriodStart,
      billingCycleEnd: stripeSubscription.currentPeriodEnd,
    });

    await creditService.allocateCredits(
      accountId,
      planConfig.credits,
      `Initial ${plan} plan credit allocation`
    );

    return subscription;
  }

  async upgradeSubscription(
    accountId: string,
    newPlan: PlanType
  ): Promise<{ subscription: Subscription; proratedAmount: number }> {
    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const currentPlan = account.plan;

    if (currentPlan === newPlan) {
      throw new Error('Already on this plan');
    }

    if (currentPlan === 'free') {
      throw new Error('Use createSubscription for upgrades from free plan');
    }

    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    if (planHierarchy[newPlan] <= planHierarchy[currentPlan]) {
      throw new Error('Use downgradeSubscription for downgrades');
    }

    const subscription = await subscriptionRepository.findByAccountId(accountId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const newPlanConfig = getPlanPrices()[newPlan];
    if (!newPlanConfig.priceId) {
      throw new Error(`No price ID configured for plan: ${newPlan}`);
    }

    const updatedStripeSubscription = await this.paymentProvider.updateSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      priceId: newPlanConfig.priceId,
      prorationBehavior: 'create_prorations',
      metadata: { accountId, plan: newPlan, upgraded: 'true' },
    });

    const updatedSubscription = await subscriptionRepository.update(subscription.id, {
      plan: newPlan,
      stripePriceId: newPlanConfig.priceId,
      status: updatedStripeSubscription.status as any,
      currentPeriodStart: updatedStripeSubscription.currentPeriodStart,
      currentPeriodEnd: updatedStripeSubscription.currentPeriodEnd,
    });

    await accountRepository.update(accountId, {
      plan: newPlan,
      billingCycleEnd: updatedStripeSubscription.currentPeriodEnd,
    });

    const currentPlanConfig = getPlanPrices()[currentPlan];
    const creditDifference = newPlanConfig.credits - currentPlanConfig.credits;

    if (creditDifference > 0) {
      await creditService.allocateCredits(
        accountId,
        creditDifference,
        `Upgrade to ${newPlan} - additional credits`
      );
    }

    const proratedAmount = this.calculateProration(
      currentPlanConfig.monthlyPrice,
      newPlanConfig.monthlyPrice,
      subscription.currentPeriodStart!,
      subscription.currentPeriodEnd!,
      new Date()
    );

    return {
      subscription: updatedSubscription,
      proratedAmount,
    };
  }

  async downgradeSubscription(accountId: string, newPlan: PlanType): Promise<Subscription> {
    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const currentPlan = account.plan;

    if (currentPlan === newPlan) {
      throw new Error('Already on this plan');
    }

    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    if (planHierarchy[newPlan] >= planHierarchy[currentPlan]) {
      throw new Error('Use upgradeSubscription for upgrades');
    }

    const subscription = await subscriptionRepository.findByAccountId(accountId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const updatedSubscription = await subscriptionRepository.update(subscription.id, {
      scheduledPlan: newPlan,
      scheduledChangeDate: subscription.currentPeriodEnd!,
      metadata: {
        ...subscription.metadata,
        downgradeTo: newPlan,
        downgradeScheduledAt: new Date().toISOString(),
      },
    });

    return updatedSubscription;
  }

  async cancelDowngrade(accountId: string): Promise<Subscription> {
    const subscription = await subscriptionRepository.findByAccountId(accountId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (!subscription.scheduledPlan) {
      throw new Error('No scheduled downgrade to cancel');
    }

    const updatedSubscription = await subscriptionRepository.update(subscription.id, {
      scheduledPlan: null,
      scheduledChangeDate: null,
      metadata: {
        ...subscription.metadata,
        downgradeCanceled: true,
        downgradeCanceledAt: new Date().toISOString(),
      },
    });

    return updatedSubscription;
  }

  async cancelSubscription(accountId: string, immediate: boolean = false): Promise<Subscription> {
    const subscription = await subscriptionRepository.findByAccountId(accountId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const canceledStripeSubscription = await this.paymentProvider.cancelSubscription(
      subscription.stripeSubscriptionId,
      !immediate
    );

    const updatedSubscription = await subscriptionRepository.update(subscription.id, {
      status: canceledStripeSubscription.status as any,
      cancelAtPeriodEnd: !immediate,
      canceledAt: canceledStripeSubscription.canceledAt,
      endedAt: canceledStripeSubscription.endedAt,
    });

    if (immediate) {
      await accountRepository.update(accountId, {
        plan: 'free',
        stripeSubscriptionId: null,
      });

      await creditService.resetCycleCredits(accountId, getPlanPrices().free.credits);
    }

    return updatedSubscription;
  }

  async reactivateSubscription(accountId: string): Promise<Subscription> {
    const subscription = await subscriptionRepository.findByAccountId(accountId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    const updatedStripeSubscription = await this.paymentProvider.updateSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd: false,
    });

    const updatedSubscription = await subscriptionRepository.update(subscription.id, {
      cancelAtPeriodEnd: false,
      status: updatedStripeSubscription.status as any,
    });

    return updatedSubscription;
  }

  async processScheduledDowngrade(subscriptionId: string): Promise<void> {
    const subscription = await subscriptionRepository.findById(subscriptionId);
    if (!subscription || !subscription.scheduledPlan) {
      return;
    }

    if (subscription.scheduledPlan === 'free') {
      await this.cancelSubscription(subscription.accountId, true);
      return;
    }

    const newPlanConfig = getPlanPrices()[subscription.scheduledPlan];
    if (!newPlanConfig.priceId) {
      throw new Error(`No price ID configured for plan: ${subscription.scheduledPlan}`);
    }

    if (subscription.stripeSubscriptionId) {
      await this.paymentProvider.updateSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        priceId: newPlanConfig.priceId,
        prorationBehavior: 'none',
      });
    }

    await subscriptionRepository.update(subscription.id, {
      plan: subscription.scheduledPlan,
      stripePriceId: newPlanConfig.priceId,
      scheduledPlan: null,
      scheduledChangeDate: null,
    });

    await accountRepository.update(subscription.accountId, {
      plan: subscription.scheduledPlan,
    });

    await creditService.resetCycleCredits(subscription.accountId, newPlanConfig.credits);
  }

  async renewBillingCycle(subscriptionId: string): Promise<void> {
    const subscription = await subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      return;
    }

    const planConfig = getPlanPrices()[subscription.plan];

    await creditService.resetCycleCredits(subscription.accountId, planConfig.credits);

    const newPeriodStart = subscription.currentPeriodEnd!;
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    await subscriptionRepository.update(subscription.id, {
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
    });

    await accountRepository.update(subscription.accountId, {
      billingCycleStart: newPeriodStart,
      billingCycleEnd: newPeriodEnd,
      lastPaymentAt: new Date(),
    });
  }

  private calculateProration(
    oldPrice: number,
    newPrice: number,
    periodStart: Date,
    periodEnd: Date,
    upgradeDate: Date
  ): number {
    const totalSeconds = (periodEnd.getTime() - periodStart.getTime()) / 1000;
    const elapsedSeconds = (upgradeDate.getTime() - periodStart.getTime()) / 1000;
    const remainingSeconds = totalSeconds - elapsedSeconds;

    const unusedOldPlanCredit = (oldPrice * remainingSeconds) / totalSeconds;
    const newPlanCharge = (newPrice * remainingSeconds) / totalSeconds;

    return Math.round(newPlanCharge - unusedOldPlanCredit);
  }
}
