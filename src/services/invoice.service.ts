// Invoice Service
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { invoiceRepository } from '../db/repositories/invoice.repository.js';
import { accountRepository } from '../db/repositories/account.repository.js';
import { paymentMethodRepository } from '../db/repositories/paymentMethod.repository.js';
import { Invoice, InvoiceStatus, InvoiceLineItemType } from '../types/index.js';

export class InvoiceService {
  async createInvoice(data: {
    accountId: string;
    subscriptionId?: string;
    stripeInvoiceId?: string;
    description?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<Invoice> {
    const account = await accountRepository.findById(data.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const defaultPaymentMethod = await paymentMethodRepository.findDefaultByAccountId(
      data.accountId
    );

    const invoice = await invoiceRepository.create({
      accountId: data.accountId,
      subscriptionId: data.subscriptionId,
      stripeInvoiceId: data.stripeInvoiceId,
      status: 'draft',
      subtotal: 0,
      tax: 0,
      total: 0,
      amountPaid: 0,
      amountDue: 0,
      currency: 'USD',
      invoiceDate: new Date(),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      paymentMethodId: defaultPaymentMethod?.id,
      billingName: account.displayName,
      billingEmail: account.billingEmail,
      description: data.description,
    });

    return invoice;
  }

  async addLineItem(
    invoiceId: string,
    data: {
      type: InvoiceLineItemType;
      description: string;
      quantity?: number;
      unitAmount: number;
      periodStart?: Date;
      periodEnd?: Date;
      creditPackPurchaseId?: string;
      subscriptionId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Cannot add line items to a finalized invoice');
    }

    const quantity = data.quantity || 1;
    const amount = quantity * data.unitAmount;

    await invoiceRepository.addLineItem({
      invoiceId,
      type: data.type,
      description: data.description,
      quantity,
      unitAmount: data.unitAmount,
      amount,
      currency: invoice.currency,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      creditPackPurchaseId: data.creditPackPurchaseId,
      subscriptionId: data.subscriptionId,
      metadata: data.metadata,
    });

    const lineItems = await invoiceRepository.getLineItems(invoiceId);
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = Math.round(subtotal * 0.0);
    const total = subtotal + tax;

    await invoiceRepository.update(invoiceId, {
      subtotal,
      tax,
      total,
      amountDue: total,
    });
  }

  async finalizeInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Invoice is already finalized');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const updatedInvoice = await invoiceRepository.update(invoiceId, {
      status: 'open',
    });

    return updatedInvoice;
  }

  async markPaid(
    invoiceId: string,
    paymentIntentId?: string
  ): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const updatedInvoice = await invoiceRepository.update(invoiceId, {
      status: 'paid',
      amountPaid: invoice.total,
      amountDue: 0,
      paidAt: new Date(),
      metadata: {
        ...invoice.metadata,
        paymentIntentId,
      },
    });

    await accountRepository.update(invoice.accountId, {
      lastPaymentAt: new Date(),
    });

    return updatedInvoice;
  }

  async markFailed(invoiceId: string, failureReason?: string): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const updatedInvoice = await invoiceRepository.update(invoiceId, {
      status: 'uncollectible',
      metadata: {
        ...invoice.metadata,
        failureReason,
        failedAt: new Date().toISOString(),
      },
    });

    return updatedInvoice;
  }

  async voidInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot void a paid invoice');
    }

    const updatedInvoice = await invoiceRepository.update(invoiceId, {
      status: 'void',
      voidedAt: new Date(),
      amountDue: 0,
      metadata: {
        ...invoice.metadata,
        voidReason: reason,
      },
    });

    return updatedInvoice;
  }

  async generatePDF(invoiceId: string): Promise<string> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

    const pdfUrl = `/invoices/${invoice.invoiceNumber}.pdf`;

    await invoiceRepository.update(invoiceId, {
      pdfUrl,
      pdfGeneratedAt: new Date(),
    });

    return pdfUrl;
  }

  async getInvoiceWithLineItems(invoiceId: string): Promise<{
    invoice: Invoice;
    lineItems: any[];
  }> {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const lineItems = await invoiceRepository.getLineItems(invoiceId);

    return {
      invoice,
      lineItems,
    };
  }

  async createSubscriptionInvoice(data: {
    accountId: string;
    subscriptionId: string;
    planName: string;
    amount: number;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<Invoice> {
    const invoice = await this.createInvoice({
      accountId: data.accountId,
      subscriptionId: data.subscriptionId,
      description: `${data.planName} Plan - Monthly Subscription`,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    });

    await this.addLineItem(invoice.id, {
      type: 'subscription',
      description: `${data.planName} Plan Subscription`,
      quantity: 1,
      unitAmount: data.amount,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      subscriptionId: data.subscriptionId,
    });

    await this.finalizeInvoice(invoice.id);

    return invoice;
  }

  async createCreditPackInvoice(data: {
    accountId: string;
    creditPackPurchaseId: string;
    packSize: number;
    amount: number;
  }): Promise<Invoice> {
    const invoice = await this.createInvoice({
      accountId: data.accountId,
      description: `Credit Pack Purchase - ${data.packSize.toLocaleString()} credits`,
    });

    await this.addLineItem(invoice.id, {
      type: 'credit_pack',
      description: `${data.packSize.toLocaleString()} credits`,
      quantity: 1,
      unitAmount: data.amount,
      creditPackPurchaseId: data.creditPackPurchaseId,
    });

    await this.finalizeInvoice(invoice.id);

    return invoice;
  }

  async createProrationInvoice(data: {
    accountId: string;
    subscriptionId: string;
    description: string;
    amount: number;
  }): Promise<Invoice> {
    const invoice = await this.createInvoice({
      accountId: data.accountId,
      subscriptionId: data.subscriptionId,
      description: data.description,
    });

    await this.addLineItem(invoice.id, {
      type: 'proration',
      description: data.description,
      quantity: 1,
      unitAmount: data.amount,
      subscriptionId: data.subscriptionId,
    });

    await this.finalizeInvoice(invoice.id);

    return invoice;
  }
}

export const invoiceService = new InvoiceService();
