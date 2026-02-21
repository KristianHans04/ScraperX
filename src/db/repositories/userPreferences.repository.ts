import { query, queryOne, queryAll } from '../connection.js';
import type { 
  NotificationPreference,
  EmailChangeToken,
  UserSession,
  AppearanceSettings,
  UserProfileUpdateRequest
} from '../../types/index.js';

interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

interface EmailChangeTokenRow {
  id: string;
  user_id: string;
  old_email: string;
  new_email: string;
  token: string;
  new_email_verified: boolean;
  old_email_notified: boolean;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  session_token_hash: string;
  device_type: string | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location_country: string | null;
  location_city: string | null;
  is_current: boolean;
  last_activity_at: Date;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

function rowToNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    emailEnabled: row.email_enabled,
    inAppEnabled: row.in_app_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEmailChangeToken(row: EmailChangeTokenRow): EmailChangeToken {
  return {
    id: row.id,
    userId: row.user_id,
    oldEmail: row.old_email,
    newEmail: row.new_email,
    token: row.token,
    newEmailVerified: row.new_email_verified,
    oldEmailNotified: row.old_email_notified,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToUserSession(row: UserSessionRow): UserSession {
  return {
    id: row.id,
    userId: row.user_id,
    sessionTokenHash: row.session_token_hash,
    deviceType: row.device_type as 'desktop' | 'mobile' | 'tablet' | undefined,
    deviceName: row.device_name ?? undefined,
    browser: row.browser ?? undefined,
    os: row.os ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    locationCountry: row.location_country ?? undefined,
    locationCity: row.location_city ?? undefined,
    isCurrent: row.is_current,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

export const userPreferencesRepository = {
  async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const rows = await queryAll<NotificationPreferenceRow>(
      'SELECT * FROM notification_preference WHERE user_id = $1 ORDER BY category',
      [userId]
    );
    return rows.map(rowToNotificationPreference);
  },

  async getNotificationPreference(
    userId: string,
    category: string
  ): Promise<NotificationPreference | null> {
    const row = await queryOne<NotificationPreferenceRow>(
      'SELECT * FROM notification_preference WHERE user_id = $1 AND category = $2',
      [userId, category]
    );
    return row ? rowToNotificationPreference(row) : null;
  },

  async updateNotificationPreference(
    userId: string,
    category: string,
    emailEnabled: boolean,
    inAppEnabled: boolean
  ): Promise<NotificationPreference> {
    const row = await queryOne<NotificationPreferenceRow>(
      `INSERT INTO notification_preference (user_id, category, email_enabled, in_app_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category) 
       DO UPDATE SET 
         email_enabled = $3, 
         in_app_enabled = $4,
         updated_at = NOW()
       RETURNING *`,
      [userId, category, emailEnabled, inAppEnabled]
    );
    return rowToNotificationPreference(row);
  },

  async initializeDefaultPreferences(userId: string): Promise<void> {
    await query(
      'SELECT initialize_notification_preferences($1)',
      [userId]
    );
  },

  async updateProfile(userId: string, data: UserProfileUpdateRequest): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramCount = 0;

    if (data.name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(data.name);
    }

    if (data.timezone !== undefined) {
      paramCount++;
      updates.push(`timezone = $${paramCount}`);
      params.push(data.timezone);
    }

    if (data.dateFormat !== undefined) {
      paramCount++;
      updates.push(`date_format = $${paramCount}`);
      params.push(data.dateFormat);
    }

    if (updates.length === 0) return;

    paramCount++;
    params.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      params
    );
  },

  async updateAppearance(userId: string, settings: AppearanceSettings): Promise<void> {
    await query(
      `UPDATE users 
       SET theme = $1, display_density = $2, updated_at = NOW()
       WHERE id = $3`,
      [settings.theme, settings.displayDensity, userId]
    );
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    await query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );
  },

  async deleteAvatar(userId: string): Promise<void> {
    await query(
      'UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );
  },

  async createEmailChangeToken(data: {
    userId: string;
    oldEmail: string;
    newEmail: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailChangeToken> {
    const row = await queryOne<EmailChangeTokenRow>(
      `INSERT INTO email_change_token (
        user_id, old_email, new_email, token, expires_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [data.userId, data.oldEmail, data.newEmail, data.token, data.expiresAt]
    );
    return rowToEmailChangeToken(row);
  },

  async findEmailChangeToken(token: string): Promise<EmailChangeToken | null> {
    const row = await queryOne<EmailChangeTokenRow>(
      `SELECT * FROM email_change_token 
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    return row ? rowToEmailChangeToken(row) : null;
  },

  async markEmailChangeTokenUsed(id: string): Promise<void> {
    await query(
      `UPDATE email_change_token 
       SET used_at = NOW(), new_email_verified = TRUE
       WHERE id = $1`,
      [id]
    );
  },

  async markOldEmailNotified(id: string): Promise<void> {
    await query(
      'UPDATE email_change_token SET old_email_notified = TRUE WHERE id = $1',
      [id]
    );
  },

  async createUserSession(data: {
    userId: string;
    sessionTokenHash: string;
    deviceType?: string;
    deviceName?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    locationCountry?: string;
    locationCity?: string;
    expiresAt: Date;
  }): Promise<UserSession> {
    const row = await queryOne<UserSessionRow>(
      `INSERT INTO user_session (
        user_id, session_token_hash, device_type, device_name, 
        browser, os, ip_address, location_country, location_city, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.userId,
        data.sessionTokenHash,
        data.deviceType ?? null,
        data.deviceName ?? null,
        data.browser ?? null,
        data.os ?? null,
        data.ipAddress ?? null,
        data.locationCountry ?? null,
        data.locationCity ?? null,
        data.expiresAt,
      ]
    );
    return rowToUserSession(row);
  },

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const rows = await queryAll<UserSessionRow>(
      `SELECT * FROM user_session 
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userId]
    );
    return rows.map(rowToUserSession);
  },

  async updateSessionActivity(sessionTokenHash: string): Promise<void> {
    await query(
      'UPDATE user_session SET last_activity_at = NOW() WHERE session_token_hash = $1',
      [sessionTokenHash]
    );
  },

  async revokeSession(id: string): Promise<void> {
    await query(
      'UPDATE user_session SET revoked_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await query(
      'SELECT revoke_user_sessions($1, $2)',
      [userId, exceptSessionId ?? null]
    );
    return result.rowCount ?? 0;
  },

  async cleanupExpiredTokens(): Promise<void> {
    await query('SELECT cleanup_expired_email_change_tokens()', []);
    await query('SELECT cleanup_expired_sessions()', []);
  },
};
