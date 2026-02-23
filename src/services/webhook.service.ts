// Webhook Service
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { PaystackPaymentProvider } from './payment/PaystackPaymentProvider.js';
import { subscriptionRepository } from '../db/repositories/subscription.repository.js';
import { invoiceRepository } from '../db/repositories/invoice.repository.js';
import { creditPackPurchaseRepository } from '../db/repositories/creditPackPurchase.repository.js';
import { invoiceService } from './invoice.service.js';
import { creditService } from './credit.service.js';
import { paymentFailureService } from './paymentFailure.service.js';
import { pool } from '../db/index.js';

const PROCESSED_EVENTS_TABLE = 'webhook_processed_events';

export class WebhookService {
  private paymentProvider: PaystackPaymentProvider;

  constructor() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
    this.paymentProvider = new PaystackPaymentProvider(secretKey);
  }

  async processPaystackWebhook(payload: string, signature: string): Promise<void> {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';

    const event = this.paymentProvider.verifyWebhookSignature(payload, signature, secret);

    if (await this.isEventProcessed(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    await this.routeEvent(event);

    await this.markEventProcessed(event.id);
  }

  private async routeEvent(event: any): Promise<void> {
    const eventType = event.type;

    console.log(`Processing Paystack event: ${eventType}`);

    switch (eventType) {
      case 'charge.success':
        await this.handleChargeSuccess(event);
        break;

      case 'charge.failed':
        await this.handleChargeFailed(event);
        break;

      case 'subscription.create':
        await this.handleSubscriptionCreate(event);
        break;

      case 'subscription.disable':
        await this.handleSubscriptionDisable(event);
        break;

      case 'subscription.not_renew':
        await this.handleSubscriptionNotRenew(event);
        break;

      case 'invoice.create':
      case 'invoice.update':
        await this.handleInvoiceEvent(event);
        break;

      case 'transfer.success':
      case 'transfer.failed':
        await this.handleTransferEvent(event);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
  }

  private async handleChargeSuccess(event: any): Promise<void> {
    const data = event.data.object;
    const reference = data.reference;
    const metadata = data.metadata || {};

    const creditPackPurchaseId = metadata.creditPackPurchaseId;
    if (creditPackPurchaseId) {
      const purchase = await creditPackPurchaseRepository.findById(creditPackPurchaseId);
      if (purchase && purchase.status !== 'completed') {
        await creditPackPurchaseRepository.update(creditPackPurchaseId, {
          status: 'completed',
          completedAt: new Date(),
        });

        await creditService.purchaseCreditPack(
          purchase.accountId,
          purchase.packSize,
          creditPackPurchaseId,
          `Credit pack purchase - ${purchase.packSize.toLocaleString()} credits`
        );

        if (purchase.invoiceId) {
          await invoiceService.markPaid(purchase.invoiceId, reference);
        }

        const failure = await paymentFailureService.getFailureState(purchase.accountId);
        if (failure.hasFailure) {
          await paymentFailureService.clearFailure(purchase.accountId, 'payment_succeeded');
        }
      }
    }

    const invoiceId = metadata.invoiceId;
    if (invoiceId) {
      const invoice = await invoiceRepository.findById(invoiceId);
      if (invoice && invoice.status !== 'paid') {
        await invoiceService.markPaid(invoiceId, reference);

        const failure = await paymentFailureService.getFailureState(invoice.accountId);
        if (failure.hasFailure) {
          await paymentFailureService.clearFailure(invoice.accountId, 'payment_succeeded');
        }
      }
    }
  }

  private async handleChargeFailed(event: any): Promise<void> {
    const data = event.data.object;
    const metadata = data.metadata || {};

    const accountId = metadata.accountId;
    if (!accountId) return;

    await paymentFailureService.recordFailure({
      accountId,
      failureCode: data.gateway_response,
      failureMessage: data.message || 'Payment failed',
      invoiceId: metadata.invoiceId,
      subscriptionId: metadata.subscriptionId,
    });

    const creditPackPurchaseId = metadata.creditPackPurchaseId;
    if (creditPackPurchaseId) {
      await creditPackPurchaseRepository.update(creditPackPurchaseId, {
        status: 'failed',
      });
    }

    const invoiceId = metadata.invoiceId;
    if (invoiceId) {
      await invoiceService.markFailed(invoiceId, data.gateway_response);
    }
  }

  private async handleSubscriptionCreate(event: any): Promise<void> {
    const data = event.data.object;
    const metadata = data.metadata || {};

    console.log('Subscription created:', data.subscription_code);
  }

  private async handleSubscriptionDisable(event: any): Promise<void> {
    const data = event.data.object;

    const subscription = await subscriptionRepository.findByPaystackSubscriptionCode(
      data.subscription_code
    );

    if (subscription) {
      await subscriptionRepository.update(subscription.id, {
        status: 'canceled',
        canceledAt: new Date(),
        endedAt: new Date(),
      });
    }
  }

  private async handleSubscriptionNotRenew(event: any): Promise<void> {
    const data = event.data.object;

    const subscription = await subscriptionRepository.findByPaystackSubscriptionCode(
      data.subscription_code
    );

    if (subscription) {
      await subscriptionRepository.update(subscription.id, {
        cancelAtPeriodEnd: true,
      });
    }
  }

  private async handleInvoiceEvent(event: any): Promise<void> {
    console.log('Invoice event:', event.type);
  }

  private async handleTransferEvent(event: any): Promise<void> {
    console.log('Transfer event:', event.type);
  }

  private async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM ${PROCESSED_EVENTS_TABLE} WHERE event_id = $1`,
        [eventId]
      );
      return result.rows.length > 0;
    } catch (error) {
      await this.ensureProcessedEventsTable();
      return false;
    }
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ${PROCESSED_EVENTS_TABLE} (event_id, processed_at) VALUES ($1, NOW())
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId]
      );
    } catch (error) {
      await this.ensureProcessedEventsTable();
      await pool.query(
        `INSERT INTO ${PROCESSED_EVENTS_TABLE} (event_id, processed_at) VALUES ($1, NOW())
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId]
      );
    }
  }

  private async ensureProcessedEventsTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${PROCESSED_EVENTS_TABLE} (
        event_id VARCHAR(255) PRIMARY KEY,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_processed_events_processed_at 
      ON ${PROCESSED_EVENTS_TABLE}(processed_at)
    `);
  }
}

export const webhookService = new WebhookService();
