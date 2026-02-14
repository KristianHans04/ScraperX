import { query, queryOne } from '../connection.js';
import crypto from 'crypto';

export interface MFAConfiguration {
  id: string;
  userId: string;
  secret: string; // Encrypted
  enabled: boolean;
  verifiedAt?: Date;
  backupCodes?: string; // Encrypted JSON array of hashed backup codes
  backupCodesRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MFAConfigurationRow {
  id: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  verified_at: Date | null;
  backup_codes: string | null;
  backup_codes_remaining: number;
  created_at: Date;
  updated_at: Date;
}

function rowToMFAConfiguration(row: MFAConfigurationRow): MFAConfiguration {
  return {
    id: row.id,
    userId: row.user_id,
    secret: row.secret,
    enabled: row.enabled,
    verifiedAt: row.verified_at ?? undefined,
    backupCodes: row.backup_codes ?? undefined,
    backupCodesRemaining: row.backup_codes_remaining,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Generate backup codes (hashed with SHA-256)
 */
export function generateBackupCodes(count: number = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate a random 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    codes.push(code);
    hashes.push(hash);
  }

  return { codes, hashes };
}

/**
 * Hash a backup code for verification
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const mfaConfigurationRepository = {
  async findByUserId(userId: string): Promise<MFAConfiguration | null> {
    const row = await queryOne<MFAConfigurationRow>(
      'SELECT * FROM mfa_configuration WHERE user_id = $1',
      [userId]
    );
    return row ? rowToMFAConfiguration(row) : null;
  },

  async create(data: {
    userId: string;
    secret: string; // Should be encrypted before passing
    backupCodes?: string[]; // Should be hashed backup codes
  }): Promise<MFAConfiguration> {
    const backupCodesJson = data.backupCodes ? JSON.stringify(data.backupCodes) : null;
    const backupCodesCount = data.backupCodes ? data.backupCodes.length : 10;

    const row = await queryOne<MFAConfigurationRow>(
      `INSERT INTO mfa_configuration (
        user_id, secret, enabled, backup_codes, backup_codes_remaining
      )
      VALUES ($1, $2, FALSE, $3, $4)
      RETURNING *`,
      [data.userId, data.secret, backupCodesJson, backupCodesCount]
    );

    if (!row) {
      throw new Error('Failed to create MFA configuration');
    }

    return rowToMFAConfiguration(row);
  },

  async enable(userId: string): Promise<boolean> {
    const result = await query(
      'UPDATE mfa_configuration SET enabled = TRUE, verified_at = NOW() WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async disable(userId: string): Promise<boolean> {
    const result = await query(
      'UPDATE mfa_configuration SET enabled = FALSE WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async update(
    userId: string,
    data: Partial<{
      secret: string;
      backupCodes: string[];
    }>
  ): Promise<MFAConfiguration | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.secret !== undefined) {
      updates.push(`secret = $${paramIndex++}`);
      values.push(data.secret);
    }

    if (data.backupCodes !== undefined) {
      updates.push(`backup_codes = $${paramIndex++}`);
      values.push(JSON.stringify(data.backupCodes));
      updates.push(`backup_codes_remaining = $${paramIndex++}`);
      values.push(data.backupCodes.length);
    }

    if (updates.length === 0) {
      return this.findByUserId(userId);
    }

    values.push(userId);
    const row = await queryOne<MFAConfigurationRow>(
      `UPDATE mfa_configuration SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? rowToMFAConfiguration(row) : null;
  },

  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const config = await this.findByUserId(userId);
    if (!config || !config.backupCodes) {
      return false;
    }

    const codeHash = hashBackupCode(code);
    const backupCodes: string[] = JSON.parse(config.backupCodes);

    // Check if the hash exists in the array
    const codeIndex = backupCodes.indexOf(codeHash);
    if (codeIndex === -1) {
      return false;
    }

    // Remove the used code
    backupCodes.splice(codeIndex, 1);

    // Update the database
    const result = await query(
      `UPDATE mfa_configuration 
       SET backup_codes = $1, backup_codes_remaining = $2 
       WHERE user_id = $3`,
      [JSON.stringify(backupCodes), backupCodes.length, userId]
    );

    return (result.rowCount ?? 0) > 0;
  },

  async delete(userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM mfa_configuration WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
