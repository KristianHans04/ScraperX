import { query, queryOne, queryAll } from '../connection.js';
import type { ApiKey } from '../../types/index.js';
import { generateApiKey, hashApiKey, extractApiKeyPrefix } from '../../utils/crypto.js';

interface ApiKeyRow {
  id: string;
  account_id: string; // Updated from organization_id
  created_by_user_id: string | null;
  key_prefix: string;
  key_hash: string;
  name: string;
  description: string | null;
  scopes: string[];
  allowed_ips: string[] | null;
  allowed_domains: string[] | null;
  rate_limit_override: number | null;
  max_concurrent_override: number | null;
  credits_limit: string | null;
  environment: string;
  expires_at: Date | null;
  last_used_at: Date | null;
  last_used_ip: string | null;
  last_used_user_agent: string | null;
  usage_count: string;
  is_active: boolean;
  revoked_at: Date | null;
  revoked_by_user_id: string | null;
  revoke_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    accountId: row.account_id, // Updated from organizationId
    createdByUserId: row.created_by_user_id ?? undefined,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    name: row.name,
    description: row.description ?? undefined,
    scopes: row.scopes,
    allowedIps: row.allowed_ips ?? undefined,
    allowedDomains: row.allowed_domains ?? undefined,
    rateLimitOverride: row.rate_limit_override ?? undefined,
    maxConcurrentOverride: row.max_concurrent_override ?? undefined,
    creditsLimit: row.credits_limit ? parseInt(row.credits_limit, 10) : undefined,
    environment: row.environment as 'development' | 'staging' | 'production',
    expiresAt: row.expires_at ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
    lastUsedIp: row.last_used_ip ?? undefined,
    lastUsedUserAgent: row.last_used_user_agent ?? undefined,
    usageCount: parseInt(row.usage_count, 10),
    isActive: row.is_active,
    revokedAt: row.revoked_at ?? undefined,
    revokedByUserId: row.revoked_by_user_id ?? undefined,
    revokeReason: row.revoke_reason ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const apiKeyRepository = {
  async findById(id: string): Promise<ApiKey | null> {
    const row = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE id = $1',
      [id]
    );
    return row ? rowToApiKey(row) : null;
  },

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const row = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE key_hash = $1',
      [keyHash]
    );
    return row ? rowToApiKey(row) : null;
  },

  async findActiveByHash(keyHash: string): Promise<ApiKey | null> {
    const row = await queryOne<ApiKeyRow>(
      `SELECT * FROM api_keys 
       WHERE key_hash = $1 
       AND is_active = TRUE 
       AND revoked_at IS NULL 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );
    return row ? rowToApiKey(row) : null;
  },

  async findByAccount(accountId: string): Promise<ApiKey[]> {
    const rows = await queryAll<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );
    return rows.map(rowToApiKey);
  },

  async findActiveByAccount(accountId: string): Promise<ApiKey[]> {
    const rows = await queryAll<ApiKeyRow>(
      `SELECT * FROM api_keys 
       WHERE account_id = $1 
       AND is_active = TRUE 
       AND revoked_at IS NULL 
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [accountId]
    );
    return rows.map(rowToApiKey);
  },

  async create(data: {
    accountId: string; // Updated from organizationId
    createdByUserId?: string;
    name: string;
    description?: string;
    scopes?: string[];
    allowedIps?: string[];
    allowedDomains?: string[];
    rateLimitOverride?: number;
    maxConcurrentOverride?: number;
    environment?: 'development' | 'staging' | 'production';
    expiresAt?: Date;
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const { key: rawKey, hash: keyHash } = generateApiKey();
    const keyPrefix = extractApiKeyPrefix(rawKey);

    const row = await queryOne<ApiKeyRow>(
      `INSERT INTO api_keys (
        account_id, created_by_user_id, key_prefix, key_hash, name, description,
        scopes, allowed_ips, allowed_domains, rate_limit_override, max_concurrent_override,
        environment, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.accountId, // Updated from organizationId
        data.createdByUserId ?? null,
        keyPrefix,
        keyHash,
        data.name,
        data.description ?? null,
        JSON.stringify(data.scopes ?? ['scrape:read', 'scrape:write']),
        data.allowedIps ?? null,
        data.allowedDomains ?? null,
        data.rateLimitOverride ?? null,
        data.maxConcurrentOverride ?? null,
        data.environment ?? 'production',
        data.expiresAt ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create API key');
    }

    return { apiKey: rowToApiKey(row), rawKey };
  },

  async updateLastUsed(
    id: string,
    data: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await query(
      `UPDATE api_keys 
       SET last_used_at = NOW(), 
           last_used_ip = COALESCE($2, last_used_ip),
           last_used_user_agent = COALESCE($3, last_used_user_agent),
           usage_count = usage_count + 1
       WHERE id = $1`,
      [id, data.ip ?? null, data.userAgent ?? null]
    );
  },

  async revoke(
    id: string,
    data: { revokedByUserId?: string; reason?: string }
  ): Promise<boolean> {
    const result = await query(
      `UPDATE api_keys 
       SET is_active = FALSE, revoked_at = NOW(), revoked_by_user_id = $2, revoke_reason = $3
       WHERE id = $1 AND is_active = TRUE`,
      [id, data.revokedByUserId ?? null, data.reason ?? null]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM api_keys WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
