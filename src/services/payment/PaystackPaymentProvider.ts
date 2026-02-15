// Paystack Payment Provider Implementation
// Phase 8: Billing and Credits
// Created: 2026-02-10

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  PaymentProvider,
  CustomerCreateParams,
  SubscriptionCreateParams,
  SubscriptionUpdateParams,
  PaymentIntentCreateParams,
  RefundCreateParams,
  PaymentMethodAttachParams,
  PaymentMethodDetachParams,
  InvoiceRetrieveParams,
  WebhookEvent,
} from './PaymentProvider.interface.js';

export class PaystackPaymentProvider extends PaymentProvider {
  private client: AxiosInstance;
  private secretKey: string;

  constructor(secretKey: string) {
    super();
    this.secretKey = secretKey;
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  get name(): string {
    return 'paystack';
  }

  async createCustomer(params: CustomerCreateParams): Promise<{
    id: string;
    email: string;
    name?: string;
  }> {
    const response = await this.client.post('/customer', {
      email: params.email,
      first_name: params.name?.split(' ')[0] || '',
      last_name: params.name?.split(' ').slice(1).join(' ') || '',
      metadata: params.metadata,
    });

    return {
      id: response.data.data.customer_code,
      email: response.data.data.email,
      name: `${response.data.data.first_name} ${response.data.data.last_name}`.trim(),
    };
  }

  async createSubscription(params: SubscriptionCreateParams): Promise<{
    id: string;
    customerId: string;
    priceId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }> {
    const response = await this.client.post('/subscription', {
      customer: params.customerId,
      plan: params.priceId,
      authorization: params.paymentMethodId,
    });

    const subscription = response.data.data;
    
    return {
      id: subscription.subscription_code,
      customerId: subscription.customer.customer_code,
      priceId: subscription.plan.plan_code,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.createdAt),
      currentPeriodEnd: new Date(subscription.next_payment_date),
      cancelAtPeriodEnd: false,
    };
  }

  async updateSubscription(params: SubscriptionUpdateParams): Promise<{
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }> {
    throw new Error('Paystack does not support subscription updates - cancel and recreate instead');
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<{
    id: string;
    status: string;
    canceledAt: Date;
    endedAt?: Date;
  }> {
    const action = cancelAtPeriodEnd ? 'disable' : 'disable';
    
    const response = await this.client.post(`/subscription/${action}`, {
      code: subscriptionId,
      token: subscriptionId,
    });

    return {
      id: subscriptionId,
      status: 'canceled',
      canceledAt: new Date(),
      endedAt: cancelAtPeriodEnd ? undefined : new Date(),
    };
  }

  async createPaymentIntent(params: PaymentIntentCreateParams): Promise<{
    id: string;
    clientSecret: string;
    status: string;
    amount: number;
    currency: string;
  }> {
    const response = await this.client.post('/transaction/initialize', {
      email: params.metadata?.email || '',
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      metadata: params.metadata,
      channels: ['card'],
    });

    return {
      id: response.data.data.reference,
      clientSecret: response.data.data.access_code,
      status: 'pending',
      amount: params.amount,
      currency: params.currency,
    };
  }

  async createRefund(params: RefundCreateParams): Promise<{
    id: string;
    status: string;
    amount: number;
    currency: string;
  }> {
    const response = await this.client.post('/refund', {
      transaction: params.paymentIntentId,
      amount: params.amount,
      currency: 'NGN',
      customer_note: params.metadata?.reason || '',
      merchant_note: params.metadata?.note || '',
    });

    return {
      id: response.data.data.id.toString(),
      status: response.data.data.status,
      amount: response.data.data.amount,
      currency: response.data.data.currency,
    };
  }

  async attachPaymentMethod(params: PaymentMethodAttachParams): Promise<{
    id: string;
    customerId: string;
  }> {
    return {
      id: params.paymentMethodId,
      customerId: params.customerId,
    };
  }

  async detachPaymentMethod(params: PaymentMethodDetachParams): Promise<{
    id: string;
  }> {
    return {
      id: params.paymentMethodId,
    };
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // Paystack handles this through authorization codes
    return;
  }

  async retrieveInvoice(params: InvoiceRetrieveParams): Promise<{
    id: string;
    number: string;
    status: string;
    total: number;
    amountDue: number;
    amountPaid: number;
    currency: string;
    created: Date;
    pdfUrl?: string;
  }> {
    throw new Error('Paystack does not have invoice API - manage invoices internally');
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): WebhookEvent {
    const hash = crypto
      .createHmac('sha512', secret)
      .update(payload)
      .digest('hex');

    if (hash !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(payload);

    return {
      id: event.data.id?.toString() || event.data.reference,
      type: event.event,
      data: {
        object: event.data,
      },
      created: Math.floor(new Date(event.data.createdAt || Date.now()).getTime() / 1000),
    };
  }

  constructWebhookEvent(payload: string, signature: string, secret: string): WebhookEvent {
    return this.verifyWebhookSignature(payload, signature, secret);
  }
}
