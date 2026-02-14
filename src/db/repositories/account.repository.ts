import { query, queryOne } from '../connection.js';
import type { Account, PlanType, AccountStatus } from '../../types/index.js';

interface AccountRow {
  id: string;
  display_name: string;
  plan: string;
  credit_balance: string;
  credit_cycle_usage: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    displayName: row.display_name,
    plan: row.plan as PlanType,
    creditBalance: parseInt(row.credit_balance, 10),
    creditCycleUsage: parseInt(row.credit_cycle_usage, 10),
    status: row.status as AccountStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export const accountRepository = {
  async findById(id: string): Promise<Account | null> {
    const row = await queryOne<AccountRow>(
      'SELECT * FROM account WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return row ? rowToAccount(row) : null;
  },

  async create(data: {
    displayName: string;
    plan?: PlanType;
  }): Promise<Account> {
    const plan = data.plan ?? 'free';
    const initialCredits = plan === 'free' ? 1000 : (plan === 'pro' ? 50000 : 0);
    
    const slug = data.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 8);
    const billingEmail = `billing-${Math.random().toString(36).slice(2, 10)}@temp.local`;
    
    const row = await queryOne<AccountRow>(
      `INSERT INTO account (name, slug, billing_email, display_name, plan, credit_balance, credit_cycle_usage, status)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 'active')
       RETURNING *`,
      [data.displayName, slug, billingEmail, data.displayName, plan, initialCredits]
    );
    if (!row) {
      throw new Error('Failed to create account');
    }
    return rowToAccount(row);
  },

  async update(
    id: string,
    data: Partial<{
      displayName: string;
      plan: PlanType;
      status: AccountStatus;
    }>
  ): Promise<Account | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }
    if (data.plan !== undefined) {
      updates.push(`plan = $${paramIndex++}`);
      values.push(data.plan);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const row = await queryOne<AccountRow>(
      `UPDATE account SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return row ? rowToAccount(row) : null;
  },

  async addCredits(id: string, amount: number): Promise<boolean> {
    const result = await query(
      `UPDATE account SET credit_balance = credit_balance + $1 WHERE id = $2 AND deleted_at IS NULL`,
      [amount, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deductCredits(id: string, amount: number): Promise<boolean> {
    const result = await query(
      `UPDATE account 
       SET credit_balance = credit_balance - $1,
           credit_cycle_usage = credit_cycle_usage + $1
       WHERE id = $2 AND deleted_at IS NULL AND credit_balance >= $1`,
      [amount, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async checkCredits(id: string, required: number): Promise<{ hasCredits: boolean; balance: number }> {
    const row = await queryOne<{ credit_balance: string; plan: string }>(
      'SELECT credit_balance, plan FROM account WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (!row) {
      return { hasCredits: false, balance: 0 };
    }
    const balance = parseInt(row.credit_balance, 10);
    // Enterprise has unlimited credits
    if (row.plan === 'enterprise') {
      return { hasCredits: true, balance };
    }
    return { hasCredits: balance >= required, balance };
  },

  async resetCycleUsage(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE account SET credit_cycle_usage = 0 WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE account SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async suspend(id: string, reason?: string): Promise<boolean> {
    const result = await query(
      'UPDATE account SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id, 'suspended']
    );
    return (result.rowCount ?? 0) > 0;
  },

  async unsuspend(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE account SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id, 'active']
    );
    return (result.rowCount ?? 0) > 0;
  },

  async adjustCredits(id: string, amount: number, reason: string): Promise<boolean> {
    const result = await query(
      'UPDATE account SET credit_balance = credit_balance + $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id, amount]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updatePlan(id: string, plan: PlanType): Promise<boolean> {
    const result = await query(
      'UPDATE account SET plan = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id, plan]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
