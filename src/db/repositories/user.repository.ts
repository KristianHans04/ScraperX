import { query, queryOne } from '../connection.js';
import type { User, UserRoleType } from '../../types/index.js';

interface UserRow {
  id: string;
  account_id: string;
  email: string;
  email_verified: boolean;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  timezone: string;
  date_format: string;
  theme: string;
  display_density: string;
  last_login_at: Date | null;
  last_login_ip: string | null;
  login_failed_count: number;
  locked_until: Date | null;
  terms_accepted_at: Date | null;
  terms_version: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    accountId: row.account_id,
    email: row.email,
    emailVerified: row.email_verified,
    passwordHash: row.password_hash ?? undefined,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role as UserRoleType,
    timezone: row.timezone,
    dateFormat: row.date_format,
    theme: row.theme as 'light' | 'dark' | 'system',
    displayDensity: row.display_density as 'comfortable' | 'compact',
    lastLoginAt: row.last_login_at ?? undefined,
    lastLoginIp: row.last_login_ip ?? undefined,
    loginFailedCount: row.login_failed_count,
    lockedUntil: row.locked_until ?? undefined,
    termsAcceptedAt: row.terms_accepted_at ?? undefined,
    termsVersion: row.terms_version ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return row ? rowToUser(row) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email]
    );
    return row ? rowToUser(row) : null;
  },

  async findByAccountId(accountId: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE account_id = $1 AND deleted_at IS NULL',
      [accountId]
    );
    return row ? rowToUser(row) : null;
  },

  async create(data: {
    accountId: string;
    email: string;
    passwordHash?: string;
    name: string;
    role?: UserRoleType;
    emailVerified?: boolean;
    termsAcceptedAt?: Date;
    termsVersion?: string;
  }): Promise<User> {
    const row = await queryOne<UserRow>(
      `INSERT INTO users (
        account_id, email, password_hash, name, role, email_verified,
        terms_accepted_at, terms_version
      )
      VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.accountId,
        data.email,
        data.passwordHash ?? null,
        data.name,
        data.role ?? 'user',
        data.emailVerified ?? false,
        data.termsAcceptedAt ?? null,
        data.termsVersion ?? null,
      ]
    );
    if (!row) {
      throw new Error('Failed to create user');
    }
    return rowToUser(row);
  },

  async update(
    id: string,
    data: Partial<{
      email: string;
      emailVerified: boolean;
      passwordHash: string;
      name: string;
      avatarUrl: string;
      role: UserRoleType;
      timezone: string;
      dateFormat: string;
      theme: 'light' | 'dark' | 'system';
      displayDensity: 'comfortable' | 'compact';
      lastLoginAt: Date;
      lastLoginIp: string;
      loginFailedCount: number;
      lockedUntil: Date | null;
    }>
  ): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = LOWER($${paramIndex++})`);
      values.push(data.email);
    }
    if (data.emailVerified !== undefined) {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(data.timezone);
    }
    if (data.dateFormat !== undefined) {
      updates.push(`date_format = $${paramIndex++}`);
      values.push(data.dateFormat);
    }
    if (data.theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(data.theme);
    }
    if (data.displayDensity !== undefined) {
      updates.push(`display_density = $${paramIndex++}`);
      values.push(data.displayDensity);
    }
    if (data.lastLoginAt !== undefined) {
      updates.push(`last_login_at = $${paramIndex++}`);
      values.push(data.lastLoginAt);
    }
    if (data.lastLoginIp !== undefined) {
      updates.push(`last_login_ip = $${paramIndex++}`);
      values.push(data.lastLoginIp);
    }
    if (data.loginFailedCount !== undefined) {
      updates.push(`login_failed_count = $${paramIndex++}`);
      values.push(data.loginFailedCount);
    }
    if (data.lockedUntil !== undefined) {
      updates.push(`locked_until = $${paramIndex++}`);
      values.push(data.lockedUntil);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const row = await queryOne<UserRow>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return row ? rowToUser(row) : null;
  },

  async incrementFailedLogins(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET login_failed_count = login_failed_count + 1 WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async resetFailedLogins(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET login_failed_count = 0, locked_until = NULL WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async lockAccount(id: string, until: Date): Promise<boolean> {
    const result = await query(
      'UPDATE users SET locked_until = $1 WHERE id = $2 AND deleted_at IS NULL',
      [until, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async anonymize(id: string): Promise<boolean> {
    const randomEmail = `deleted-${Date.now()}-${Math.random().toString(36).slice(2)}@deleted.local`;
    const result = await query(
      `UPDATE users 
       SET 
         email = $1,
         password_hash = NULL,
         name = 'Deleted User',
         avatar_url = NULL,
         deleted_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL`,
      [randomEmail, id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateRole(id: string, role: 'user' | 'admin'): Promise<boolean> {
    const result = await query(
      'UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id, role]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async softDelete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async verifyEmail(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
