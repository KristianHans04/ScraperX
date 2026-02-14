// Credit Pack Service
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { creditPackPurchaseRepository } from '../db/repositories/creditPackPurchase.repository.js';
import { accountRepository } from '../db/repositories/account.repository.js';
import { invoiceService } from './invoice.service.js';
import { creditService } from './credit.service.js';
import { PaymentProvider } from './payment/PaymentProvider.interface.js';
import { PlanType } from '../types/index.js';

const CREDIT_PACKS = {
  free: [],
  pro: [
    { size: 100000, price: 4900, pricePerCredit: 0.000049 },
    { size: 500000, price: 19900, pricePerCredit: 0.0000398 },
    { size: 1000000, price: 34900, pricePerCredit: 0.0000349 },
  ],
  enterprise: [
    { size: 1000000, price: 29900, pricePerCredit: 0.0000299 },
    { size: 5000000, price: 119900, pricePerCredit: 0.00002398 },
    { size: 10000000, price: 199900, pricePerCredit: 0.00001999 },
  ],
};

export class CreditPackService {
  constructor(private paymentProvider: PaymentProvider) {}

  getAvailablePacks(plan: PlanType): Array<{ size: number; price: number; pricePerCredit: number }> {
    return CREDIT_PACKS[plan] || [];
  }

  async purchaseCreditPack(data: {
    accountId: string;
    packSize: number;
    paymentMethodId?: string;
  }): Promise<{
    purchaseId: string;
    invoiceId: string;
    clientSecret?: string;
  }> {
    const account = await accountRepository.findById(data.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.plan === 'free') {
      throw new Error('Credit packs are not available for free plan');
    }

    const availablePacks = this.getAvailablePacks(account.plan);
    const pack = availablePacks.find((p) => p.size === data.packSize);

    if (!pack) {
      throw new Error('Invalid pack size for your plan');
    }

    const purchase = await creditPackPurchaseRepository.create({
      accountId: data.accountId,
      packSize: pack.size,
      amountPaid: pack.price,
      status: 'pending',
      description: `${pack.size.toLocaleString()} credits`,
    });

    const invoice = await invoiceService.createCreditPackInvoice({
      accountId: data.accountId,
      creditPackPurchaseId: purchase.id,
      packSize: pack.size,
      amount: pack.price,
    });

    await creditPackPurchaseRepository.update(purchase.id, {
      invoiceId: invoice.id,
    });

    if (!account.paystackCustomerCode) {
      throw new Error('No payment customer found for account');
    }

    const paymentIntent = await this.paymentProvider.createPaymentIntent({
      customerId: account.paystackCustomerCode,
      amount: pack.price,
      currency: 'NGN',
      description: `Credit Pack - ${pack.size.toLocaleString()} credits`,
      metadata: {
        accountId: data.accountId,
        creditPackPurchaseId: purchase.id,
        invoiceId: invoice.id,
      },
      paymentMethodId: data.paymentMethodId,
    });

    await creditPackPurchaseRepository.update(purchase.id, {
      paystackPaymentReference: paymentIntent.id,
      status: 'processing',
    });

    return {
      purchaseId: purchase.id,
      invoiceId: invoice.id,
      clientSecret: paymentIntent.clientSecret,
    };
  }

  async completePurchase(purchaseId: string): Promise<void> {
    const purchase = await creditPackPurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === 'completed') {
      return;
    }

    await creditPackPurchaseRepository.update(purchaseId, {
      status: 'completed',
      completedAt: new Date(),
      purchasedAt: new Date(),
    });

    await creditService.purchaseCreditPack(
      purchase.accountId,
      purchase.packSize,
      purchaseId,
      `Credit pack purchase - ${purchase.packSize.toLocaleString()} credits`
    );

    if (purchase.invoiceId) {
      await invoiceService.markPaid(purchase.invoiceId, purchase.paystackPaymentReference);
    }
  }

  async failPurchase(purchaseId: string, reason?: string): Promise<void> {
    const purchase = await creditPackPurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    await creditPackPurchaseRepository.update(purchaseId, {
      status: 'failed',
      metadata: {
        ...purchase.metadata,
        failureReason: reason,
        failedAt: new Date().toISOString(),
      },
    });

    if (purchase.invoiceId) {
      await invoiceService.markFailed(purchase.invoiceId, reason);
    }
  }

  async refundPurchase(purchaseId: string, reason: string): Promise<void> {
    const purchase = await creditPackPurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status !== 'completed') {
      throw new Error('Can only refund completed purchases');
    }

    if (!purchase.paystackPaymentReference) {
      throw new Error('No payment reference found');
    }

    await this.paymentProvider.createRefund({
      paymentIntentId: purchase.paystackPaymentReference,
      amount: purchase.amountPaid,
      reason: 'requested_by_customer',
      metadata: { reason },
    });

    await creditPackPurchaseRepository.update(purchaseId, {
      status: 'refunded',
      refundedAt: new Date(),
    });

    await creditService.deductCredits(
      purchase.accountId,
      purchase.packSize,
      `Refund - Credit pack purchase ${purchase.id}`,
      {
        type: 'deduction',
        metadata: { refunded: true, originalPurchaseId: purchaseId },
      }
    );
  }
}
