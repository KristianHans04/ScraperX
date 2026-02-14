import { query, queryOne } from '../connection.js';

export type OAuthProvider = 'google' | 'github';

export interface OAuthConnection {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthConnectionRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  provider_email: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToOAuthConnection(row: OAuthConnectionRow): OAuthConnection {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as OAuthProvider,
    providerUserId: row.provider_user_id,
    providerEmail: row.provider_email,
    accessToken: row.access_token ?? undefined,
    refreshToken: row.refresh_token ?? undefined,
    tokenExpiresAt: row.token_expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const oauthConnectionRepository = {
  async findByProviderAndProviderId(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthConnection | null> {
    const row = await queryOne<OAuthConnectionRow>(
      'SELECT * FROM oauth_connection WHERE provider = $1 AND provider_user_id = $2',
      [provider, providerUserId]
    );
    return row ? rowToOAuthConnection(row) : null;
  },

  async findByUserId(userId: string): Promise<OAuthConnection[]> {
    const rows = await query<OAuthConnectionRow>(
      'SELECT * FROM oauth_connection WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.rows.map(rowToOAuthConnection);
  },

  async findByUserIdAndProvider(
    userId: string,
    provider: OAuthProvider
  ): Promise<OAuthConnection | null> {
    const row = await queryOne<OAuthConnectionRow>(
      'SELECT * FROM oauth_connection WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    return row ? rowToOAuthConnection(row) : null;
  },

  async create(data: {
    userId: string;
    provider: OAuthProvider;
    providerUserId: string;
    providerEmail: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }): Promise<OAuthConnection> {
    const row = await queryOne<OAuthConnectionRow>(
      `INSERT INTO oauth_connection (
        user_id, provider, provider_user_id, provider_email,
        access_token, refresh_token, token_expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.userId,
        data.provider,
        data.providerUserId,
        data.providerEmail,
        data.accessToken ?? null,
        data.refreshToken ?? null,
        data.tokenExpiresAt ?? null,
      ]
    );
    if (!row) {
      throw new Error('Failed to create OAuth connection');
    }
    return rowToOAuthConnection(row);
  },

  async update(
    id: string,
    data: Partial<{
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
    }>
  ): Promise<OAuthConnection | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.accessToken !== undefined) {
      updates.push(`access_token = $${paramIndex++}`);
      values.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push(`refresh_token = $${paramIndex++}`);
      values.push(data.refreshToken);
    }
    if (data.tokenExpiresAt !== undefined) {
      updates.push(`token_expires_at = $${paramIndex++}`);
      values.push(data.tokenExpiresAt);
    }

    if (updates.length === 0) {
      const row = await queryOne<OAuthConnectionRow>(
        'SELECT * FROM oauth_connection WHERE id = $1',
        [id]
      );
      return row ? rowToOAuthConnection(row) : null;
    }

    values.push(id);
    const row = await queryOne<OAuthConnectionRow>(
      `UPDATE oauth_connection SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return row ? rowToOAuthConnection(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM oauth_connection WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<boolean> {
    const result = await query(
      'DELETE FROM oauth_connection WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
