// Payment Failure Service
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { paymentFailureRepository } from '../db/repositories/paymentFailure.repository.js';
import { accountRepository } from '../db/repositories/account.repository.js';
import { apiKeyRepository } from '../db/repositories/apiKey.repository.js';
import { PaymentFailureEscalationStage } from '../types/index.js';

const ESCALATION_DAYS = {
  grace: 3,
  retry: 7,
  restricted: 14,
  suspended: 30,
};

export class PaymentFailureService {
  async recordFailure(data: {
    accountId: string;
    invoiceId?: string;
    subscriptionId?: string;
    failureCode?: string;
    failureMessage?: string;
  }): Promise<void> {
    const existingFailure = await paymentFailureRepository.findByAccountId(data.accountId);

    if (existingFailure && !existingFailure.isResolved) {
      await paymentFailureRepository.incrementRetryCount(existingFailure.id);
      return;
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + ESCALATION_DAYS.grace);

    await paymentFailureRepository.create({
      accountId: data.accountId,
      invoiceId: data.invoiceId,
      subscriptionId: data.subscriptionId,
      failureCode: data.failureCode,
      failureMessage: data.failureMessage,
      escalationStage: 'grace',
      gracePeriodEnd,
    });

    await accountRepository.update(data.accountId, {
      status: 'active',
    });
  }

  async getFailureState(accountId: string): Promise<{
    hasFailure: boolean;
    stage?: PaymentFailureEscalationStage;
    daysInStage?: number;
    nextEscalationDate?: Date;
  }> {
    const failure = await paymentFailureRepository.findByAccountId(accountId);

    if (!failure || failure.isResolved) {
      return { hasFailure: false };
    }

    const now = new Date();
    const daysSinceFailure = Math.floor(
      (now.getTime() - failure.firstFailedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let nextEscalationDate: Date | undefined;
    if (failure.escalationStage === 'grace' && failure.gracePeriodEnd) {
      nextEscalationDate = failure.gracePeriodEnd;
    } else if (failure.escalationStage === 'retry' && failure.nextRetryAt) {
      nextEscalationDate = failure.nextRetryAt;
    }

    return {
      hasFailure: true,
      stage: failure.escalationStage,
      daysInStage: daysSinceFailure,
      nextEscalationDate,
    };
  }

  async processEscalation(): Promise<void> {
    const failuresToEscalate = await paymentFailureRepository.findAccountsNeedingEscalation();

    for (const failure of failuresToEscalate) {
      const newStage = this.getNextEscalationStage(failure.escalationStage);

      if (!newStage) continue;

      await this.escalateToStage(failure.id, failure.accountId, newStage);
    }
  }

  private getNextEscalationStage(
    currentStage: PaymentFailureEscalationStage
  ): PaymentFailureEscalationStage | null {
    const stageOrder: PaymentFailureEscalationStage[] = [
      'grace',
      'retry',
      'restricted',
      'suspended',
      'canceled',
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : null;
  }

  private async escalateToStage(
    failureId: string,
    accountId: string,
    newStage: PaymentFailureEscalationStage
  ): Promise<void> {
    const updateData: any = {
      escalationStage: newStage,
    };

    switch (newStage) {
      case 'retry':
        const nextRetry = new Date();
        nextRetry.setHours(nextRetry.getHours() + 24);
        updateData.nextRetryAt = nextRetry;
        await accountRepository.update(accountId, { status: 'active' });
        break;

      case 'restricted':
        updateData.restrictedAt = new Date();
        await accountRepository.update(accountId, { status: 'restricted' });
        await this.disableTestKeys(accountId);
        break;

      case 'suspended':
        updateData.suspendedAt = new Date();
        await accountRepository.update(accountId, { status: 'suspended' });
        await this.disableAllKeys(accountId);
        break;

      case 'canceled':
        await accountRepository.update(accountId, {
          status: 'suspended',
          plan: 'free',
        });
        await this.disableAllKeys(accountId);
        break;
    }

    await paymentFailureRepository.update(failureId, updateData);
  }

  async clearFailure(accountId: string, resolvedBy: 'payment_succeeded' | 'payment_method_updated' | 'manual_resolution'): Promise<void> {
    const failure = await paymentFailureRepository.findByAccountId(accountId);

    if (!failure || failure.isResolved) {
      return;
    }

    await paymentFailureRepository.resolve(failure.id, resolvedBy);

    await accountRepository.update(accountId, {
      status: 'active',
    });

    await this.restoreKeys(accountId);
  }

  async retryPayment(accountId: string): Promise<boolean> {
    const failure = await paymentFailureRepository.findByAccountId(accountId);

    if (!failure || failure.isResolved) {
      return false;
    }

    if (failure.retryCount >= failure.maxRetries) {
      return false;
    }

    await paymentFailureRepository.incrementRetryCount(failure.id);

    return true;
  }

  private async disableTestKeys(accountId: string): Promise<void> {
    const keys = await apiKeyRepository.findByAccountId(accountId);
    for (const key of keys) {
      if (key.type === 'test') {
        await apiKeyRepository.update(key.id, { status: 'inactive' });
      }
    }
  }

  private async disableAllKeys(accountId: string): Promise<void> {
    const keys = await apiKeyRepository.findByAccountId(accountId);
    for (const key of keys) {
      await apiKeyRepository.update(key.id, { status: 'inactive' });
    }
  }

  private async restoreKeys(accountId: string): Promise<void> {
    const keys = await apiKeyRepository.findByAccountId(accountId);
    for (const key of keys) {
      if (key.status === 'inactive') {
        await apiKeyRepository.update(key.id, { status: 'active' });
      }
    }
  }
}

export const paymentFailureService = new PaymentFailureService();
