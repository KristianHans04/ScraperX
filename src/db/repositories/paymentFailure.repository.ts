// Payment Failure Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { PaymentFailure, PaymentFailureEscalationStage, PaymentFailureResolvedBy } from '../../types/index.js';

export class PaymentFailureRepository {
  async create(data: {
    accountId: string;
    invoiceId?: string;
    subscriptionId?: string;
    failureCode?: string;
    failureMessage?: string;
    escalationStage: PaymentFailureEscalationStage;
    firstFailedAt?: Date;
    gracePeriodEnd?: Date;
    maxRetries?: number;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentFailure> {
    const result = await pool.query<PaymentFailure>(
      `INSERT INTO payment_failure (
        account_id, invoice_id, subscription_id, failure_code, failure_message,
        escalation_stage, first_failed_at, grace_period_end, max_retries, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.accountId,
        data.invoiceId || null,
        data.subscriptionId || null,
        data.failureCode || null,
        data.failureMessage || null,
        data.escalationStage,
        data.firstFailedAt || new Date(),
        data.gracePeriodEnd || null,
        data.maxRetries || 4,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async findByAccountId(accountId: string): Promise<PaymentFailure | null> {
    const result = await pool.query<PaymentFailure>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_failure
      WHERE account_id = $1 AND is_resolved = FALSE
      ORDER BY created_at DESC
      LIMIT 1`,
      [accountId]
    );

    return result.rows[0] || null;
  }

  async findById(id: string): Promise<PaymentFailure | null> {
    const result = await pool.query<PaymentFailure>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_failure
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async update(
    id: string,
    data: {
      escalationStage?: PaymentFailureEscalationStage;
      lastRetryAt?: Date;
      nextRetryAt?: Date;
      restrictedAt?: Date;
      suspendedAt?: Date;
      resolvedAt?: Date;
      retryCount?: number;
      isResolved?: boolean;
      resolvedBy?: PaymentFailureResolvedBy;
      metadata?: Record<string, unknown>;
    }
  ): Promise<PaymentFailure> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.escalationStage !== undefined) {
      fields.push(`escalation_stage = $${paramIndex++}`);
      values.push(data.escalationStage);
    }
    if (data.lastRetryAt !== undefined) {
      fields.push(`last_retry_at = $${paramIndex++}`);
      values.push(data.lastRetryAt);
    }
    if (data.nextRetryAt !== undefined) {
      fields.push(`next_retry_at = $${paramIndex++}`);
      values.push(data.nextRetryAt);
    }
    if (data.restrictedAt !== undefined) {
      fields.push(`restricted_at = $${paramIndex++}`);
      values.push(data.restrictedAt);
    }
    if (data.suspendedAt !== undefined) {
      fields.push(`suspended_at = $${paramIndex++}`);
      values.push(data.suspendedAt);
    }
    if (data.resolvedAt !== undefined) {
      fields.push(`resolved_at = $${paramIndex++}`);
      values.push(data.resolvedAt);
    }
    if (data.retryCount !== undefined) {
      fields.push(`retry_count = $${paramIndex++}`);
      values.push(data.retryCount);
    }
    if (data.isResolved !== undefined) {
      fields.push(`is_resolved = $${paramIndex++}`);
      values.push(data.isResolved);
    }
    if (data.resolvedBy !== undefined) {
      fields.push(`resolved_by = $${paramIndex++}`);
      values.push(data.resolvedBy);
    }
    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await pool.query<PaymentFailure>(
      `UPDATE payment_failure
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );

    return result.rows[0];
  }

  async findAccountsNeedingEscalation(): Promise<PaymentFailure[]> {
    const result = await pool.query<PaymentFailure>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_failure
      WHERE is_resolved = FALSE
        AND (
          (escalation_stage = 'grace' AND grace_period_end <= NOW()) OR
          (escalation_stage = 'retry' AND next_retry_at <= NOW()) OR
          (escalation_stage = 'restricted' AND first_failed_at <= NOW() - INTERVAL '8 days') OR
          (escalation_stage = 'suspended' AND first_failed_at <= NOW() - INTERVAL '15 days')
        )
      ORDER BY first_failed_at ASC`
    );

    return result.rows;
  }

  async findAccountsForRetry(): Promise<PaymentFailure[]> {
    const result = await pool.query<PaymentFailure>(
      `SELECT 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_failure
      WHERE is_resolved = FALSE
        AND escalation_stage = 'retry'
        AND next_retry_at <= NOW()
        AND retry_count < max_retries
      ORDER BY next_retry_at ASC`
    );

    return result.rows;
  }

  async incrementRetryCount(id: string): Promise<PaymentFailure> {
    const result = await pool.query<PaymentFailure>(
      `UPDATE payment_failure
      SET retry_count = retry_count + 1, last_retry_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id]
    );

    return result.rows[0];
  }

  async resolve(
    id: string,
    resolvedBy: PaymentFailureResolvedBy
  ): Promise<PaymentFailure> {
    const result = await pool.query<PaymentFailure>(
      `UPDATE payment_failure
      SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, account_id AS "accountId", invoice_id AS "invoiceId",
        subscription_id AS "subscriptionId", failure_code AS "failureCode",
        failure_message AS "failureMessage", escalation_stage AS "escalationStage",
        first_failed_at AS "firstFailedAt", last_retry_at AS "lastRetryAt",
        next_retry_at AS "nextRetryAt", grace_period_end AS "gracePeriodEnd",
        restricted_at AS "restrictedAt", suspended_at AS "suspendedAt",
        resolved_at AS "resolvedAt", retry_count AS "retryCount",
        max_retries AS "maxRetries", is_resolved AS "isResolved",
        resolved_by AS "resolvedBy", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, resolvedBy]
    );

    return result.rows[0];
  }
}

export const paymentFailureRepository = new PaymentFailureRepository();
