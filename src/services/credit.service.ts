// Credit Service
// Phase 8: Billing and Credits
// Created: 2026-02-10
// 
// This service handles all credit operations with atomic transactions and row-level locking
// to prevent race conditions and ensure credit balance integrity.

import { pool } from '../db/index.js';
import { accountRepository } from '../db/repositories/account.repository.js';
import { creditLedgerRepository } from '../db/repositories/creditLedger.repository.js';
import { CreditLedgerType } from '../types/index.js';

export class CreditService {
  async allocateCredits(
    accountId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new Error('Allocation amount must be positive');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore + amount;

      await client.query(
        'UPDATE account SET credit_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'allocation',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        metadata,
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deductCredits(
    accountId: string,
    amount: number,
    description: string,
    options: {
      scrapeJobId?: string;
      type?: 'deduction' | 'deduction_failure';
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new Error('Deduction amount must be positive');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore - amount;

      if (balanceAfter < 0) {
        throw new Error('Insufficient credits');
      }

      await client.query(
        'UPDATE account SET credit_balance = $1, credit_cycle_usage = credit_cycle_usage + $2, updated_at = NOW() WHERE id = $3',
        [balanceAfter, amount, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: options.type || 'deduction',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        scrapeJobId: options.scrapeJobId,
        description,
        metadata: options.metadata,
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reserveCredits(
    accountId: string,
    amount: number,
    scrapeJobId: string,
    description: string
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new Error('Reservation amount must be positive');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore - amount;

      if (balanceAfter < 0) {
        throw new Error('Insufficient credits for reservation');
      }

      await client.query(
        'UPDATE account SET credit_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'reservation',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        scrapeJobId,
        description,
        metadata: { reserved: true },
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseCredits(
    accountId: string,
    amount: number,
    scrapeJobId: string,
    description: string
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (amount <= 0) {
      throw new Error('Release amount must be positive');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore + amount;

      await client.query(
        'UPDATE account SET credit_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'release',
        amount,
        balanceBefore,
        balanceAfter,
        scrapeJobId,
        description,
        metadata: { released: true },
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async resetCycleCredits(
    accountId: string,
    newAllocation: number
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = newAllocation;

      await client.query(
        'UPDATE account SET credit_balance = $1, credit_cycle_usage = 0, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'reset',
        amount: balanceAfter - balanceBefore,
        balanceBefore,
        balanceAfter,
        description: `Billing cycle reset - ${newAllocation} credits allocated`,
        metadata: { cycleReset: true },
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async purchaseCreditPack(
    accountId: string,
    packSize: number,
    creditPackPurchaseId: string,
    description: string
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    if (packSize <= 0) {
      throw new Error('Pack size must be positive');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore + packSize;

      await client.query(
        'UPDATE account SET credit_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'purchase',
        amount: packSize,
        balanceBefore,
        balanceAfter,
        creditPackPurchaseId,
        description,
        metadata: { packSize },
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async adjustCredits(
    accountId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<{ newBalance: number; ledgerEntryId: string }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const accountResult = await client.query(
        'SELECT credit_balance FROM account WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const balanceBefore = accountResult.rows[0].credit_balance;
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new Error('Adjustment would result in negative balance');
      }

      await client.query(
        'UPDATE account SET credit_balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, accountId]
      );

      const ledgerEntry = await creditLedgerRepository.createEntry({
        accountId,
        type: 'adjustment',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        metadata,
      });

      await client.query('COMMIT');

      return {
        newBalance: balanceAfter,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCreditBalance(accountId: string): Promise<{
    balance: number;
    cycleUsage: number;
  }> {
    const account = await accountRepository.findById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      balance: account.creditBalance,
      cycleUsage: account.creditCycleUsage,
    };
  }

  async getCreditUsage(
    accountId: string,
    cycleStart: Date,
    cycleEnd: Date
  ): Promise<{
    totalDeducted: number;
    totalAdded: number;
    netChange: number;
  }> {
    return await creditLedgerRepository.getCycleUsage(accountId, cycleStart, cycleEnd);
  }

  async hasEnoughCredits(accountId: string, requiredAmount: number): Promise<boolean> {
    const { balance } = await this.getCreditBalance(accountId);
    return balance >= requiredAmount;
  }
}

export const creditService = new CreditService();
