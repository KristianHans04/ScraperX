import { query, queryOne, queryAll, transaction } from '../connection.js';
import type { Organization, OrganizationFeatures, PlanId, SubscriptionStatus } from '../../types/index.js';

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  billing_email: string;
  technical_email: string | null;
  plan_id: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  credits_balance: string;
  credits_included_monthly: string;
  credits_overage_rate: string;
  rate_limit_per_second: number;
  max_concurrent_jobs: number;
  max_batch_size: number;
  data_retention_days: number;
  features: OrganizationFeatures;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function rowToOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    billingEmail: row.billing_email,
    technicalEmail: row.technical_email ?? undefined,
    planId: row.plan_id as PlanId,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    creditsBalance: parseInt(row.credits_balance, 10),
    creditsIncludedMonthly: parseInt(row.credits_included_monthly, 10),
    creditsOverageRate: parseFloat(row.credits_overage_rate),
    rateLimitPerSecond: row.rate_limit_per_second,
    maxConcurrentJobs: row.max_concurrent_jobs,
    maxBatchSize: row.max_batch_size,
    dataRetentionDays: row.data_retention_days,
    features: row.features,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export const organizationRepository = {
  async findById(id: string): Promise<Organization | null> {
    const row = await queryOne<OrganizationRow>(
      'SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return row ? rowToOrganization(row) : null;
  },

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await queryOne<OrganizationRow>(
      'SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    return row ? rowToOrganization(row) : null;
  },

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Organization | null> {
    const row = await queryOne<OrganizationRow>(
      'SELECT * FROM organizations WHERE stripe_customer_id = $1 AND deleted_at IS NULL',
      [stripeCustomerId]
    );
    return row ? rowToOrganization(row) : null;
  },

  async create(data: {
    name: string;
    slug: string;
    billingEmail: string;
    technicalEmail?: string;
    planId?: PlanId;
  }): Promise<Organization> {
    const row = await queryOne<OrganizationRow>(
      `INSERT INTO organizations (name, slug, billing_email, technical_email, plan_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.slug, data.billingEmail, data.technicalEmail ?? null, data.planId ?? 'starter']
    );
    if (!row) {
      throw new Error('Failed to create organization');
    }
    return rowToOrganization(row);
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      billingEmail: string;
      technicalEmail: string;
      planId: PlanId;
      subscriptionStatus: SubscriptionStatus;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      rateLimitPerSecond: number;
      maxConcurrentJobs: number;
      features: OrganizationFeatures;
    }>
  ): Promise<Organization | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.billingEmail !== undefined) {
      updates.push(`billing_email = $${paramIndex++}`);
      values.push(data.billingEmail);
    }
    if (data.technicalEmail !== undefined) {
      updates.push(`technical_email = $${paramIndex++}`);
      values.push(data.technicalEmail);
    }
    if (data.planId !== undefined) {
      updates.push(`plan_id = $${paramIndex++}`);
      values.push(data.planId);
    }
    if (data.subscriptionStatus !== undefined) {
      updates.push(`subscription_status = $${paramIndex++}`);
      values.push(data.subscriptionStatus);
    }
    if (data.stripeCustomerId !== undefined) {
      updates.push(`stripe_customer_id = $${paramIndex++}`);
      values.push(data.stripeCustomerId);
    }
    if (data.stripeSubscriptionId !== undefined) {
      updates.push(`stripe_subscription_id = $${paramIndex++}`);
      values.push(data.stripeSubscriptionId);
    }
    if (data.rateLimitPerSecond !== undefined) {
      updates.push(`rate_limit_per_second = $${paramIndex++}`);
      values.push(data.rateLimitPerSecond);
    }
    if (data.maxConcurrentJobs !== undefined) {
      updates.push(`max_concurrent_jobs = $${paramIndex++}`);
      values.push(data.maxConcurrentJobs);
    }
    if (data.features !== undefined) {
      updates.push(`features = $${paramIndex++}`);
      values.push(JSON.stringify(data.features));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const row = await queryOne<OrganizationRow>(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return row ? rowToOrganization(row) : null;
  },

  async addCredits(id: string, amount: number): Promise<boolean> {
    const result = await query(
      `UPDATE organizations SET credits_balance = credits_balance + $1 WHERE id = $2 AND deleted_at IS NULL`,
      [amount, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deductCredits(id: string, amount: number): Promise<boolean> {
    const result = await query(
      `UPDATE organizations 
       SET credits_balance = credits_balance - $1 
       WHERE id = $2 AND deleted_at IS NULL AND credits_balance >= $1`,
      [amount, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async checkCredits(id: string, required: number): Promise<{ hasCredits: boolean; balance: number }> {
    const row = await queryOne<{ credits_balance: string; plan_id: string }>(
      'SELECT credits_balance, plan_id FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (!row) {
      return { hasCredits: false, balance: 0 };
    }
    const balance = parseInt(row.credits_balance, 10);
    // Enterprise has unlimited credits
    if (row.plan_id === 'enterprise') {
      return { hasCredits: true, balance };
    }
    return { hasCredits: balance >= required, balance };
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE organizations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
