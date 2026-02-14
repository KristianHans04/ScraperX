// Invoice Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { Invoice, InvoiceLineItem, InvoiceStatus, InvoiceLineItemType, PaginatedResult } from '../../types/index.js';

export class InvoiceRepository {
  async create(data: {
    accountId: string;
    subscriptionId?: string;
    stripeInvoiceId?: string;
    status: InvoiceStatus;
    subtotal: number;
    tax: number;
    total: number;
    amountPaid?: number;
    amountDue: number;
    currency?: string;
    invoiceDate?: Date;
    dueDate?: Date;
    periodStart?: Date;
    periodEnd?: Date;
    paymentMethodId?: string;
    paymentIntentId?: string;
    billingName?: string;
    billingEmail?: string;
    billingAddressLine1?: string;
    billingAddressLine2?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    description?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const result = await pool.query<Invoice>(
      `INSERT INTO invoice (
        account_id, subscription_id, stripe_invoice_id, invoice_number, status,
        subtotal, tax, total, amount_paid, amount_due, currency, invoice_date, due_date,
        period_start, period_end, payment_method_id, payment_intent_id,
        billing_name, billing_email, billing_address_line1, billing_address_line2,
        billing_city, billing_state, billing_postal_code, billing_country,
        description, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING 
        id, account_id AS "accountId", subscription_id AS "subscriptionId",
        stripe_invoice_id AS "stripeInvoiceId", invoice_number AS "invoiceNumber",
        status, subtotal, tax, total, amount_paid AS "amountPaid", amount_due AS "amountDue",
        currency, invoice_date AS "invoiceDate", due_date AS "dueDate", paid_at AS "paidAt",
        voided_at AS "voidedAt", period_start AS "periodStart", period_end AS "periodEnd",
        payment_method_id AS "paymentMethodId", payment_intent_id AS "paymentIntentId",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        pdf_url AS "pdfUrl", pdf_generated_at AS "pdfGeneratedAt",
        description, notes, metadata, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.accountId,
        data.subscriptionId || null,
        data.stripeInvoiceId || null,
        invoiceNumber,
        data.status,
        data.subtotal,
        data.tax,
        data.total,
        data.amountPaid || 0,
        data.amountDue,
        data.currency || 'USD',
        data.invoiceDate || new Date(),
        data.dueDate || null,
        data.periodStart || null,
        data.periodEnd || null,
        data.paymentMethodId || null,
        data.paymentIntentId || null,
        data.billingName || null,
        data.billingEmail || null,
        data.billingAddressLine1 || null,
        data.billingAddressLine2 || null,
        data.billingCity || null,
        data.billingState || null,
        data.billingPostalCode || null,
        data.billingCountry || null,
        data.description || null,
        data.notes || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async findById(id: string): Promise<Invoice | null> {
    const result = await pool.query<Invoice>(
      `SELECT 
        id, account_id AS "accountId", subscription_id AS "subscriptionId",
        stripe_invoice_id AS "stripeInvoiceId", invoice_number AS "invoiceNumber",
        status, subtotal, tax, total, amount_paid AS "amountPaid", amount_due AS "amountDue",
        currency, invoice_date AS "invoiceDate", due_date AS "dueDate", paid_at AS "paidAt",
        voided_at AS "voidedAt", period_start AS "periodStart", period_end AS "periodEnd",
        payment_method_id AS "paymentMethodId", payment_intent_id AS "paymentIntentId",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        pdf_url AS "pdfUrl", pdf_generated_at AS "pdfGeneratedAt",
        description, notes, metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM invoice
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null> {
    const result = await pool.query<Invoice>(
      `SELECT 
        id, account_id AS "accountId", subscription_id AS "subscriptionId",
        stripe_invoice_id AS "stripeInvoiceId", invoice_number AS "invoiceNumber",
        status, subtotal, tax, total, amount_paid AS "amountPaid", amount_due AS "amountDue",
        currency, invoice_date AS "invoiceDate", due_date AS "dueDate", paid_at AS "paidAt",
        voided_at AS "voidedAt", period_start AS "periodStart", period_end AS "periodEnd",
        payment_method_id AS "paymentMethodId", payment_intent_id AS "paymentIntentId",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        pdf_url AS "pdfUrl", pdf_generated_at AS "pdfGeneratedAt",
        description, notes, metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM invoice
      WHERE stripe_invoice_id = $1`,
      [stripeInvoiceId]
    );

    return result.rows[0] || null;
  }

  async findByAccountId(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaginatedResult<Invoice>> {
    const { page = 1, limit = 20, status, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['account_id = $1'];
    const params: unknown[] = [accountId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (startDate) {
      conditions.push(`invoice_date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`invoice_date <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM invoice WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query<Invoice>(
      `SELECT 
        id, account_id AS "accountId", subscription_id AS "subscriptionId",
        stripe_invoice_id AS "stripeInvoiceId", invoice_number AS "invoiceNumber",
        status, subtotal, tax, total, amount_paid AS "amountPaid", amount_due AS "amountDue",
        currency, invoice_date AS "invoiceDate", due_date AS "dueDate", paid_at AS "paidAt",
        voided_at AS "voidedAt", period_start AS "periodStart", period_end AS "periodEnd",
        payment_method_id AS "paymentMethodId", payment_intent_id AS "paymentIntentId",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        pdf_url AS "pdfUrl", pdf_generated_at AS "pdfGeneratedAt",
        description, notes, metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM invoice
      WHERE ${whereClause}
      ORDER BY invoice_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async update(
    id: string,
    data: {
      status?: InvoiceStatus;
      amountPaid?: number;
      amountDue?: number;
      paidAt?: Date;
      voidedAt?: Date;
      pdfUrl?: string;
      pdfGeneratedAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Invoice> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.amountPaid !== undefined) {
      fields.push(`amount_paid = $${paramIndex++}`);
      values.push(data.amountPaid);
    }
    if (data.amountDue !== undefined) {
      fields.push(`amount_due = $${paramIndex++}`);
      values.push(data.amountDue);
    }
    if (data.paidAt !== undefined) {
      fields.push(`paid_at = $${paramIndex++}`);
      values.push(data.paidAt);
    }
    if (data.voidedAt !== undefined) {
      fields.push(`voided_at = $${paramIndex++}`);
      values.push(data.voidedAt);
    }
    if (data.pdfUrl !== undefined) {
      fields.push(`pdf_url = $${paramIndex++}`);
      values.push(data.pdfUrl);
    }
    if (data.pdfGeneratedAt !== undefined) {
      fields.push(`pdf_generated_at = $${paramIndex++}`);
      values.push(data.pdfGeneratedAt);
    }
    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await pool.query<Invoice>(
      `UPDATE invoice
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id, account_id AS "accountId", subscription_id AS "subscriptionId",
        stripe_invoice_id AS "stripeInvoiceId", invoice_number AS "invoiceNumber",
        status, subtotal, tax, total, amount_paid AS "amountPaid", amount_due AS "amountDue",
        currency, invoice_date AS "invoiceDate", due_date AS "dueDate", paid_at AS "paidAt",
        voided_at AS "voidedAt", period_start AS "periodStart", period_end AS "periodEnd",
        payment_method_id AS "paymentMethodId", payment_intent_id AS "paymentIntentId",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        pdf_url AS "pdfUrl", pdf_generated_at AS "pdfGeneratedAt",
        description, notes, metadata, created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );

    return result.rows[0];
  }

  async addLineItem(data: {
    invoiceId: string;
    type: InvoiceLineItemType;
    description: string;
    quantity?: number;
    unitAmount: number;
    amount: number;
    currency?: string;
    periodStart?: Date;
    periodEnd?: Date;
    creditPackPurchaseId?: string;
    subscriptionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<InvoiceLineItem> {
    const result = await pool.query<InvoiceLineItem>(
      `INSERT INTO invoice_line_item (
        invoice_id, type, description, quantity, unit_amount, amount, currency,
        period_start, period_end, credit_pack_purchase_id, subscription_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, invoice_id AS "invoiceId", type, description, quantity, unit_amount AS "unitAmount",
        amount, currency, period_start AS "periodStart", period_end AS "periodEnd",
        credit_pack_purchase_id AS "creditPackPurchaseId", subscription_id AS "subscriptionId",
        metadata, created_at AS "createdAt"`,
      [
        data.invoiceId,
        data.type,
        data.description,
        data.quantity || 1,
        data.unitAmount,
        data.amount,
        data.currency || 'USD',
        data.periodStart || null,
        data.periodEnd || null,
        data.creditPackPurchaseId || null,
        data.subscriptionId || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async getLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    const result = await pool.query<InvoiceLineItem>(
      `SELECT 
        id, invoice_id AS "invoiceId", type, description, quantity, unit_amount AS "unitAmount",
        amount, currency, period_start AS "periodStart", period_end AS "periodEnd",
        credit_pack_purchase_id AS "creditPackPurchaseId", subscription_id AS "subscriptionId",
        metadata, created_at AS "createdAt"
      FROM invoice_line_item
      WHERE invoice_id = $1
      ORDER BY created_at ASC`,
      [invoiceId]
    );

    return result.rows;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const result = await pool.query<{ invoice_number: string }>(
      'SELECT generate_invoice_number() as invoice_number'
    );

    return result.rows[0].invoice_number;
  }
}

export const invoiceRepository = new InvoiceRepository();
