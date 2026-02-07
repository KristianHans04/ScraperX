import { query, queryOne, queryAll } from '../connection.js';
import type { ScrapeJob, JobStatus, EngineType, ProxyTier, ScrapeOptions, CreditBreakdown } from '../../types/index.js';
import { hashUrl, generateJobId } from '../../utils/crypto.js';

interface ScrapeJobRow {
  id: string;
  organization_id: string;
  api_key_id: string | null;
  batch_id: string | null;
  parent_job_id: string | null;
  retry_of_job_id: string | null;
  url: string;
  url_hash: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  engine: string;
  options: ScrapeOptions;
  proxy_tier: string;
  proxy_country: string | null;
  proxy_city: string | null;
  proxy_provider: string | null;
  proxy_session_id: string | null;
  fingerprint_id: string | null;
  user_agent: string | null;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  queued_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  timeout_at: Date | null;
  worker_id: string | null;
  worker_region: string | null;
  queue_name: string | null;
  result_id: string | null;
  credits_estimated: string;
  credits_charged: string;
  credit_breakdown: CreditBreakdown;
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_sent_at: Date | null;
  webhook_attempts: number;
  webhook_last_error: string | null;
  error_code: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  client_reference: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
}

function rowToScrapeJob(row: ScrapeJobRow): ScrapeJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    apiKeyId: row.api_key_id ?? undefined,
    batchId: row.batch_id ?? undefined,
    parentJobId: row.parent_job_id ?? undefined,
    retryOfJobId: row.retry_of_job_id ?? undefined,
    url: row.url,
    urlHash: row.url_hash,
    method: row.method as ScrapeJob['method'],
    headers: row.headers,
    body: row.body ?? undefined,
    engine: row.engine as EngineType,
    options: row.options,
    proxyTier: row.proxy_tier as ProxyTier,
    proxyCountry: row.proxy_country ?? undefined,
    proxyCity: row.proxy_city ?? undefined,
    proxyProvider: row.proxy_provider ?? undefined,
    proxySessionId: row.proxy_session_id ?? undefined,
    fingerprintId: row.fingerprint_id ?? undefined,
    userAgent: row.user_agent ?? undefined,
    status: row.status as JobStatus,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    queuedAt: row.queued_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    timeoutAt: row.timeout_at ?? undefined,
    workerId: row.worker_id ?? undefined,
    workerRegion: row.worker_region ?? undefined,
    queueName: row.queue_name ?? undefined,
    resultId: row.result_id ?? undefined,
    creditsEstimated: parseInt(row.credits_estimated, 10),
    creditsCharged: parseInt(row.credits_charged, 10),
    creditBreakdown: row.credit_breakdown,
    webhookUrl: row.webhook_url ?? undefined,
    webhookSecret: row.webhook_secret ?? undefined,
    webhookSentAt: row.webhook_sent_at ?? undefined,
    webhookAttempts: row.webhook_attempts,
    webhookLastError: row.webhook_last_error ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    errorDetails: row.error_details ?? undefined,
    clientReference: row.client_reference ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata,
  };
}

export const scrapeJobRepository = {
  async findById(id: string): Promise<ScrapeJob | null> {
    const row = await queryOne<ScrapeJobRow>(
      'SELECT * FROM scrape_jobs WHERE id = $1',
      [id]
    );
    return row ? rowToScrapeJob(row) : null;
  },

  async findByIdAndOrganization(id: string, organizationId: string): Promise<ScrapeJob | null> {
    const row = await queryOne<ScrapeJobRow>(
      'SELECT * FROM scrape_jobs WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return row ? rowToScrapeJob(row) : null;
  },

  async findByIdempotencyKey(organizationId: string, idempotencyKey: string): Promise<ScrapeJob | null> {
    const row = await queryOne<ScrapeJobRow>(
      'SELECT * FROM scrape_jobs WHERE organization_id = $1 AND idempotency_key = $2',
      [organizationId, idempotencyKey]
    );
    return row ? rowToScrapeJob(row) : null;
  },

  async findByOrganization(
    organizationId: string,
    options: {
      status?: JobStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ScrapeJob[]> {
    const { status, limit = 50, offset = 0 } = options;
    let sql = 'SELECT * FROM scrape_jobs WHERE organization_id = $1';
    const params: unknown[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex;
    params.push(limit, offset);

    const rows = await queryAll<ScrapeJobRow>(sql, params);
    return rows.map(rowToScrapeJob);
  },

  async findByBatch(batchId: string): Promise<ScrapeJob[]> {
    const rows = await queryAll<ScrapeJobRow>(
      'SELECT * FROM scrape_jobs WHERE batch_id = $1 ORDER BY created_at',
      [batchId]
    );
    return rows.map(rowToScrapeJob);
  },

  async create(data: {
    organizationId: string;
    apiKeyId?: string;
    batchId?: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    engine: EngineType;
    options: ScrapeOptions;
    proxyTier: ProxyTier;
    proxyCountry?: string;
    creditsEstimated: number;
    creditBreakdown: CreditBreakdown;
    webhookUrl?: string;
    webhookSecret?: string;
    clientReference?: string;
    idempotencyKey?: string;
    priority?: number;
  }): Promise<ScrapeJob> {
    const id = generateJobId();
    const urlHash = hashUrl(data.url);

    const row = await queryOne<ScrapeJobRow>(
      `INSERT INTO scrape_jobs (
        id, organization_id, api_key_id, batch_id, url, url_hash, method, headers, body,
        engine, options, proxy_tier, proxy_country, credits_estimated, credit_breakdown,
        webhook_url, webhook_secret, client_reference, idempotency_key, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id,
        data.organizationId,
        data.apiKeyId ?? null,
        data.batchId ?? null,
        data.url,
        urlHash,
        data.method ?? 'GET',
        JSON.stringify(data.headers ?? {}),
        data.body ?? null,
        data.engine,
        JSON.stringify(data.options),
        data.proxyTier,
        data.proxyCountry ?? null,
        data.creditsEstimated,
        JSON.stringify(data.creditBreakdown),
        data.webhookUrl ?? null,
        data.webhookSecret ?? null,
        data.clientReference ?? null,
        data.idempotencyKey ?? null,
        data.priority ?? 5,
      ]
    );

    if (!row) {
      throw new Error('Failed to create scrape job');
    }

    return rowToScrapeJob(row);
  },

  async updateStatus(
    id: string,
    status: JobStatus,
    additionalData?: Partial<{
      queuedAt: Date;
      startedAt: Date;
      completedAt: Date;
      workerId: string;
      workerRegion: string;
      queueName: string;
      resultId: string;
      attempts: number;
      errorCode: string;
      errorMessage: string;
      errorDetails: Record<string, unknown>;
      creditsCharged: number;
    }>
  ): Promise<ScrapeJob | null> {
    const updates = ['status = $2'];
    const values: unknown[] = [id, status];
    let paramIndex = 3;

    if (additionalData) {
      if (additionalData.queuedAt !== undefined) {
        updates.push(`queued_at = $${paramIndex++}`);
        values.push(additionalData.queuedAt);
      }
      if (additionalData.startedAt !== undefined) {
        updates.push(`started_at = $${paramIndex++}`);
        values.push(additionalData.startedAt);
      }
      if (additionalData.completedAt !== undefined) {
        updates.push(`completed_at = $${paramIndex++}`);
        values.push(additionalData.completedAt);
      }
      if (additionalData.workerId !== undefined) {
        updates.push(`worker_id = $${paramIndex++}`);
        values.push(additionalData.workerId);
      }
      if (additionalData.workerRegion !== undefined) {
        updates.push(`worker_region = $${paramIndex++}`);
        values.push(additionalData.workerRegion);
      }
      if (additionalData.queueName !== undefined) {
        updates.push(`queue_name = $${paramIndex++}`);
        values.push(additionalData.queueName);
      }
      if (additionalData.resultId !== undefined) {
        updates.push(`result_id = $${paramIndex++}`);
        values.push(additionalData.resultId);
      }
      if (additionalData.attempts !== undefined) {
        updates.push(`attempts = $${paramIndex++}`);
        values.push(additionalData.attempts);
      }
      if (additionalData.errorCode !== undefined) {
        updates.push(`error_code = $${paramIndex++}`);
        values.push(additionalData.errorCode);
      }
      if (additionalData.errorMessage !== undefined) {
        updates.push(`error_message = $${paramIndex++}`);
        values.push(additionalData.errorMessage);
      }
      if (additionalData.errorDetails !== undefined) {
        updates.push(`error_details = $${paramIndex++}`);
        values.push(JSON.stringify(additionalData.errorDetails));
      }
      if (additionalData.creditsCharged !== undefined) {
        updates.push(`credits_charged = $${paramIndex++}`);
        values.push(additionalData.creditsCharged);
      }
    }

    const row = await queryOne<ScrapeJobRow>(
      `UPDATE scrape_jobs SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return row ? rowToScrapeJob(row) : null;
  },

  async incrementAttempts(id: string): Promise<number> {
    const row = await queryOne<{ attempts: number }>(
      'UPDATE scrape_jobs SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
      [id]
    );
    return row?.attempts ?? 0;
  },

  async countByStatus(organizationId: string, status: JobStatus): Promise<number> {
    const row = await queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM scrape_jobs WHERE organization_id = $1 AND status = $2',
      [organizationId, status]
    );
    return parseInt(row?.count ?? '0', 10);
  },

  async countRunning(organizationId: string): Promise<number> {
    return this.countByStatus(organizationId, 'running');
  },
};
