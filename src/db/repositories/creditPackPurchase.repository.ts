// Credit Pack Purchase Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { CreditPackPurchase, CreditPackPurchaseStatus, PaginatedResult } from '../../types/index.js';

export class CreditPackPurchaseRepository {
  async create(data: {
    accountId: string;
    invoiceId?: string;
    stripePaymentIntentId?: string;
    packSize: number;
    amountPaid: number;
    currency?: string;
    status: CreditPackPurchaseStatus;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CreditPackPurchase> {
    const result = await pool.query<CreditPackPurchase>(
      `INSERT INTO credit_pack_purchase (
        account_id, invoice_id, stripe_payment_intent_id, pack_size, amount_paid,
        currency, status, payment_method_id, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        stripe_payment_intent_id AS "stripePaymentIntentId", pack_size AS "packSize",
        amount_paid AS "amountPaid", currency, status, purchased_at AS "purchasedAt",
        completed_at AS "completedAt", refunded_at AS "refundedAt",
        payment_method_id AS "paymentMethodId", description, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.accountId,
        data.invoiceId || null,
        data.stripePaymentIntentId || null,
        data.packSize,
        data.amountPaid,
        data.currency || 'USD',
        data.status,
        data.paymentMethodId || null,
        data.description || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async findById(id: string): Promise<CreditPackPurchase | null> {
    const result = await pool.query<CreditPackPurchase>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        stripe_payment_intent_id AS "stripePaymentIntentId", pack_size AS "packSize",
        amount_paid AS "amountPaid", currency, status, purchased_at AS "purchasedAt",
        completed_at AS "completedAt", refunded_at AS "refundedAt",
        payment_method_id AS "paymentMethodId", description, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM credit_pack_purchase
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<CreditPackPurchase | null> {
    const result = await pool.query<CreditPackPurchase>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        stripe_payment_intent_id AS "stripePaymentIntentId", pack_size AS "packSize",
        amount_paid AS "amountPaid", currency, status, purchased_at AS "purchasedAt",
        completed_at AS "completedAt", refunded_at AS "refundedAt",
        payment_method_id AS "paymentMethodId", description, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM credit_pack_purchase
      WHERE stripe_payment_intent_id = $1`,
      [stripePaymentIntentId]
    );

    return result.rows[0] || null;
  }

  async findByAccountId(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      status?: CreditPackPurchaseStatus;
    } = {}
  ): Promise<PaginatedResult<CreditPackPurchase>> {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['account_id = $1'];
    const params: unknown[] = [accountId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_pack_purchase WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query<CreditPackPurchase>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        stripe_payment_intent_id AS "stripePaymentIntentId", pack_size AS "packSize",
        amount_paid AS "amountPaid", currency, status, purchased_at AS "purchasedAt",
        completed_at AS "completedAt", refunded_at AS "refundedAt",
        payment_method_id AS "paymentMethodId", description, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM credit_pack_purchase
      WHERE ${whereClause}
      ORDER BY created_at DESC
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
      status?: CreditPackPurchaseStatus;
      purchasedAt?: Date;
      completedAt?: Date;
      refundedAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): Promise<CreditPackPurchase> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.purchasedAt !== undefined) {
      fields.push(`purchased_at = $${paramIndex++}`);
      values.push(data.purchasedAt);
    }
    if (data.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(data.completedAt);
    }
    if (data.refundedAt !== undefined) {
      fields.push(`refunded_at = $${paramIndex++}`);
      values.push(data.refundedAt);
    }
    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await pool.query<CreditPackPurchase>(
      `UPDATE credit_pack_purchase
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        stripe_payment_intent_id AS "stripePaymentIntentId", pack_size AS "packSize",
        amount_paid AS "amountPaid", currency, status, purchased_at AS "purchasedAt",
        completed_at AS "completedAt", refunded_at AS "refundedAt",
        payment_method_id AS "paymentMethodId", description, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );

    return result.rows[0];
  }

  async getTotalPurchases(accountId: string, startDate?: Date, endDate?: Date): Promise<{
    count: number;
    totalCredits: number;
    totalSpent: number;
  }> {
    const conditions: string[] = ['account_id = $1', "status = 'completed'"];
    const params: unknown[] = [accountId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`completed_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`completed_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query<{
      count: string;
      totalCredits: string;
      totalSpent: string;
    }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(pack_size), 0) as "totalCredits",
        COALESCE(SUM(amount_paid), 0) as "totalSpent"
      FROM credit_pack_purchase
      WHERE ${whereClause}`,
      params
    );

    return {
      count: parseInt(result.rows[0].count, 10),
      totalCredits: parseInt(result.rows[0].totalCredits, 10),
      totalSpent: parseInt(result.rows[0].totalSpent, 10),
    };
  }
}

export const creditPackPurchaseRepository = new CreditPackPurchaseRepository();
