// Credit Ledger Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { CreditLedgerEntry, CreditLedgerType, PaginatedResult } from '../../types/index.js';

export class CreditLedgerRepository {
  async createEntry(data: {
    accountId: string;
    type: CreditLedgerType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    scrapeJobId?: string;
    creditPackPurchaseId?: string;
    invoiceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<CreditLedgerEntry> {
    const result = await pool.query<CreditLedgerEntry>(
      `INSERT INTO credit_ledger (
        account_id, type, amount, balance_before, balance_after,
        scrape_job_id, credit_pack_purchase_id, invoice_id, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, account_id AS "accountId", type, amount, balance_before AS "balanceBefore",
        balance_after AS "balanceAfter", scrape_job_id AS "scrapeJobId",
        credit_pack_purchase_id AS "creditPackPurchaseId", invoice_id AS "invoiceId",
        description, metadata, created_at AS "createdAt"`,
      [
        data.accountId,
        data.type,
        data.amount,
        data.balanceBefore,
        data.balanceAfter,
        data.scrapeJobId || null,
        data.creditPackPurchaseId || null,
        data.invoiceId || null,
        data.description,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async findByAccountId(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      type?: CreditLedgerType;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaginatedResult<CreditLedgerEntry>> {
    const { page = 1, limit = 50, type, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['account_id = $1'];
    const params: unknown[] = [accountId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_ledger WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query<CreditLedgerEntry>(
      `SELECT 
        id, account_id AS "accountId", type, amount, balance_before AS "balanceBefore",
        balance_after AS "balanceAfter", scrape_job_id AS "scrapeJobId",
        credit_pack_purchase_id AS "creditPackPurchaseId", invoice_id AS "invoiceId",
        description, metadata, created_at AS "createdAt"
      FROM credit_ledger
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

  async getCycleUsage(
    accountId: string,
    cycleStart: Date,
    cycleEnd: Date
  ): Promise<{ totalDeducted: number; totalAdded: number; netChange: number }> {
    const result = await pool.query<{
      totalDeducted: string;
      totalAdded: string;
      netChange: string;
    }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as "totalDeducted",
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as "totalAdded",
        COALESCE(SUM(amount), 0) as "netChange"
      FROM credit_ledger
      WHERE account_id = $1 
        AND created_at >= $2 
        AND created_at < $3
        AND type IN ('deduction', 'deduction_failure', 'purchase', 'allocation', 'adjustment', 'bonus')`,
      [accountId, cycleStart, cycleEnd]
    );

    return {
      totalDeducted: parseInt(result.rows[0].totalDeducted, 10),
      totalAdded: parseInt(result.rows[0].totalAdded, 10),
      netChange: parseInt(result.rows[0].netChange, 10),
    };
  }

  async findByJobId(jobId: string): Promise<CreditLedgerEntry[]> {
    const result = await pool.query<CreditLedgerEntry>(
      `SELECT 
        id, account_id AS "accountId", type, amount, balance_before AS "balanceBefore",
        balance_after AS "balanceAfter", scrape_job_id AS "scrapeJobId",
        credit_pack_purchase_id AS "creditPackPurchaseId", invoice_id AS "invoiceId",
        description, metadata, created_at AS "createdAt"
      FROM credit_ledger
      WHERE scrape_job_id = $1
      ORDER BY created_at ASC`,
      [jobId]
    );

    return result.rows;
  }

  async getRecentActivity(accountId: string, limit: number = 10): Promise<CreditLedgerEntry[]> {
    const result = await pool.query<CreditLedgerEntry>(
      `SELECT 
        id, account_id AS "accountId", type, amount, balance_before AS "balanceBefore",
        balance_after AS "balanceAfter", scrape_job_id AS "scrapeJobId",
        credit_pack_purchase_id AS "creditPackPurchaseId", invoice_id AS "invoiceId",
        description, metadata, created_at AS "createdAt"
      FROM credit_ledger
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [accountId, limit]
    );

    return result.rows;
  }

  async getTotalByType(
    accountId: string,
    type: CreditLedgerType,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const conditions: string[] = ['account_id = $1', 'type = $2'];
    const params: unknown[] = [accountId, type];
    let paramIndex = 3;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM credit_ledger
      WHERE ${whereClause}`,
      params
    );

    return parseInt(result.rows[0].total, 10);
  }
}

export const creditLedgerRepository = new CreditLedgerRepository();
