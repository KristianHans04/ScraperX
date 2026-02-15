// Payment Provider Abstraction Layer
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { PaymentMethod, Subscription, Invoice, Refund } from '../../types/index.js';

export interface CustomerCreateParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionCreateParams {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  paymentMethodId?: string;
}

export interface SubscriptionUpdateParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface PaymentIntentCreateParams {
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
}

export interface RefundCreateParams {
  paymentIntentId?: string;
  chargeId?: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

export interface PaymentMethodAttachParams {
  paymentMethodId: string;
  customerId: string;
}

export interface PaymentMethodDetachParams {
  paymentMethodId: string;
}

export interface InvoiceRetrieveParams {
  invoiceId: string;
}

export interface CustomerUpdateParams {
  customerId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethod?: string;
}

export abstract class PaymentProvider {
  abstract get name(): string;

  abstract createCustomer(params: CustomerCreateParams): Promise<{
    id: string;
    email: string;
    name?: string;
  }>;

  abstract createSubscription(params: SubscriptionCreateParams): Promise<{
    id: string;
    customerId: string;
    priceId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }>;

  abstract updateSubscription(params: SubscriptionUpdateParams): Promise<{
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }>;

  abstract cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<{
    id: string;
    status: string;
    canceledAt: Date;
    endedAt?: Date;
  }>;

  abstract createPaymentIntent(params: PaymentIntentCreateParams): Promise<{
    id: string;
    clientSecret: string;
    status: string;
    amount: number;
    currency: string;
  }>;

  abstract createRefund(params: RefundCreateParams): Promise<{
    id: string;
    status: string;
    amount: number;
    currency: string;
  }>;

  abstract attachPaymentMethod(params: PaymentMethodAttachParams): Promise<{
    id: string;
    customerId: string;
  }>;

  abstract detachPaymentMethod(params: PaymentMethodDetachParams): Promise<{
    id: string;
  }>;

  abstract setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  abstract retrieveInvoice(params: InvoiceRetrieveParams): Promise<{
    id: string;
    number: string;
    status: string;
    total: number;
    amountDue: number;
    amountPaid: number;
    currency: string;
    created: Date;
    pdfUrl?: string;
  }>;

  abstract verifyWebhookSignature(payload: string, signature: string, secret: string): WebhookEvent;

  abstract constructWebhookEvent(payload: string, signature: string, secret: string): WebhookEvent;
}
