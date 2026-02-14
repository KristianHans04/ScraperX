import { query, queryOne } from '../connection.js';
import crypto from 'crypto';

export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  email: string;
  purpose: 'registration' | 'email_change';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  createdAt: Date;
}

interface EmailVerificationTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  email: string;
  purpose: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  ip_address: string;
  created_at: Date;
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

function rowToEmailToken(row: EmailVerificationTokenRow): EmailVerificationToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    email: row.email,
    purpose: row.purpose as 'registration' | 'email_change',
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToPasswordResetToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? undefined,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export const emailVerificationTokenRepository = {
  async create(data: {
    userId: string;
    token: string;
    email: string;
    purpose: 'registration' | 'email_change';
    expiresInHours?: number;
  }): Promise<EmailVerificationToken> {
    const tokenHash = hashToken(data.token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours ?? 24));

    // Invalidate any existing unused tokens for this user and purpose
    await query(
      'DELETE FROM email_verification_token WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
      [data.userId, data.purpose]
    );

    const row = await queryOne<EmailVerificationTokenRow>(
      `INSERT INTO email_verification_token (
        user_id, token_hash, email, purpose, expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [data.userId, tokenHash, data.email, data.purpose, expiresAt]
    );

    if (!row) {
      throw new Error('Failed to create email verification token');
    }

    return rowToEmailToken(row);
  },

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    const tokenHash = hashToken(token);
    const row = await queryOne<EmailVerificationTokenRow>(
      'SELECT * FROM email_verification_token WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    return row ? rowToEmailToken(row) : null;
  },

  async markAsUsed(tokenHash: string): Promise<boolean> {
    const result = await query(
      'UPDATE email_verification_token SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL',
      [tokenHash]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteExpired(): Promise<number> {
    const result = await query(
      'DELETE FROM email_verification_token WHERE expires_at < NOW() OR used_at IS NOT NULL'
    );
    return result.rowCount ?? 0;
  },
};

export const passwordResetTokenRepository = {
  async create(data: {
    userId: string;
    token: string;
    ipAddress: string;
    expiresInHours?: number;
  }): Promise<PasswordResetToken> {
    const tokenHash = hashToken(data.token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours ?? 1));

    // Invalidate any existing unused tokens for this user
    await query(
      'DELETE FROM password_reset_token WHERE user_id = $1 AND used_at IS NULL',
      [data.userId]
    );

    const row = await queryOne<PasswordResetTokenRow>(
      `INSERT INTO password_reset_token (
        user_id, token_hash, expires_at, ip_address
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [data.userId, tokenHash, expiresAt, data.ipAddress]
    );

    if (!row) {
      throw new Error('Failed to create password reset token');
    }

    return rowToPasswordResetToken(row);
  },

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const tokenHash = hashToken(token);
    const row = await queryOne<PasswordResetTokenRow>(
      'SELECT * FROM password_reset_token WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    return row ? rowToPasswordResetToken(row) : null;
  },

  async markAsUsed(tokenHash: string): Promise<boolean> {
    const result = await query(
      'UPDATE password_reset_token SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL',
      [tokenHash]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteExpired(): Promise<number> {
    const result = await query(
      'DELETE FROM password_reset_token WHERE expires_at < NOW() OR used_at IS NOT NULL'
    );
    return result.rowCount ?? 0;
  },
};
