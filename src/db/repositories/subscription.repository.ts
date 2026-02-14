// Subscription Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { Subscription, PlanType, SubscriptionStatus } from '../../types/index.js';

export class SubscriptionRepository {
  async findByAccountId(accountId: string): Promise<Subscription | null> {
    const result = await pool.query<Subscription>(
      `SELECT 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscription
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [accountId]
    );

    return result.rows[0] || null;
  }

  async findById(id: string): Promise<Subscription | null> {
    const result = await pool.query<Subscription>(
      `SELECT 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscription
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const result = await pool.query<Subscription>(
      `SELECT 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscription
      WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );

    return result.rows[0] || null;
  }

  async create(data: {
    accountId: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    stripePriceId?: string;
    plan: PlanType;
    status: SubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    trialStart?: Date;
    trialEnd?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<Subscription> {
    const result = await pool.query<Subscription>(
      `INSERT INTO subscription (
        account_id, stripe_subscription_id, stripe_customer_id, stripe_price_id,
        plan, status, current_period_start, current_period_end, cancel_at_period_end,
        trial_start, trial_end, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.accountId,
        data.stripeSubscriptionId || null,
        data.stripeCustomerId || null,
        data.stripePriceId || null,
        data.plan,
        data.status,
        data.currentPeriodStart || null,
        data.currentPeriodEnd || null,
        data.cancelAtPeriodEnd || false,
        data.trialStart || null,
        data.trialEnd || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async update(
    id: string,
    data: {
      stripeSubscriptionId?: string;
      stripePriceId?: string;
      plan?: PlanType;
      status?: SubscriptionStatus;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date;
      endedAt?: Date;
      scheduledPlan?: PlanType | null;
      scheduledChangeDate?: Date | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Subscription> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.stripeSubscriptionId !== undefined) {
      fields.push(`stripe_subscription_id = $${paramIndex++}`);
      values.push(data.stripeSubscriptionId);
    }
    if (data.stripePriceId !== undefined) {
      fields.push(`stripe_price_id = $${paramIndex++}`);
      values.push(data.stripePriceId);
    }
    if (data.plan !== undefined) {
      fields.push(`plan = $${paramIndex++}`);
      values.push(data.plan);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.currentPeriodStart !== undefined) {
      fields.push(`current_period_start = $${paramIndex++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      fields.push(`current_period_end = $${paramIndex++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.cancelAtPeriodEnd !== undefined) {
      fields.push(`cancel_at_period_end = $${paramIndex++}`);
      values.push(data.cancelAtPeriodEnd);
    }
    if (data.canceledAt !== undefined) {
      fields.push(`canceled_at = $${paramIndex++}`);
      values.push(data.canceledAt);
    }
    if (data.endedAt !== undefined) {
      fields.push(`ended_at = $${paramIndex++}`);
      values.push(data.endedAt);
    }
    if (data.scheduledPlan !== undefined) {
      fields.push(`scheduled_plan = $${paramIndex++}`);
      values.push(data.scheduledPlan);
    }
    if (data.scheduledChangeDate !== undefined) {
      fields.push(`scheduled_change_date = $${paramIndex++}`);
      values.push(data.scheduledChangeDate);
    }
    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await pool.query<Subscription>(
      `UPDATE subscription
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );

    return result.rows[0];
  }

  async findPendingRenewals(beforeDate: Date): Promise<Subscription[]> {
    const result = await pool.query<Subscription>(
      `SELECT 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscription
      WHERE status = 'active' 
        AND current_period_end <= $1
        AND cancel_at_period_end = FALSE
      ORDER BY current_period_end ASC`,
      [beforeDate]
    );

    return result.rows;
  }

  async findScheduledChanges(beforeDate: Date): Promise<Subscription[]> {
    const result = await pool.query<Subscription>(
      `SELECT 
        id, account_id AS "accountId", stripe_subscription_id AS "stripeSubscriptionId",
        stripe_customer_id AS "stripeCustomerId", stripe_price_id AS "stripePriceId",
        plan, status, current_period_start AS "currentPeriodStart",
        current_period_end AS "currentPeriodEnd", cancel_at_period_end AS "cancelAtPeriodEnd",
        canceled_at AS "canceledAt", ended_at AS "endedAt", trial_start AS "trialStart",
        trial_end AS "trialEnd", scheduled_plan AS "scheduledPlan",
        scheduled_change_date AS "scheduledChangeDate", metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM subscription
      WHERE scheduled_plan IS NOT NULL 
        AND scheduled_change_date <= $1
      ORDER BY scheduled_change_date ASC`,
      [beforeDate]
    );

    return result.rows;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
