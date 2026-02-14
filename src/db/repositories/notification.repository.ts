import { query, queryOne } from '../connection.js';
import type { 
  Notification, 
  NotificationType, 
  NotificationPriority,
  PaginatedResult,
  PaginationParams 
} from '../../types/index.js';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url: string | null;
  action_text: string | null;
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    priority: row.priority as NotificationPriority,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url ?? undefined,
    actionText: row.action_text ?? undefined,
    metadata: row.metadata,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const notificationRepository = {
  async create(data: {
    userId: string;
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const row = await queryOne<NotificationRow>(
      `INSERT INTO notification (
        user_id, type, priority, title, message, 
        action_url, action_text, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.userId,
        data.type,
        data.priority ?? 'normal',
        data.title,
        data.message,
        data.actionUrl ?? null,
        data.actionText ?? null,
        data.metadata ?? {},
      ]
    );
    return rowToNotification(row);
  },

  async findById(id: string): Promise<Notification | null> {
    const row = await queryOne<NotificationRow>(
      'SELECT * FROM notification WHERE id = $1',
      [id]
    );
    return row ? rowToNotification(row) : null;
  },

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    let sql = 'SELECT * FROM notification WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (options?.unreadOnly) {
      sql += ' AND read_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    const rows = await query<NotificationRow>(sql, params);
    return rows.map(rowToNotification);
  },

  async findByUserIdPaginated(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Notification>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const countRow = await queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM notification WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countRow.count, 10);

    const rows = await query<NotificationRow>(
      `SELECT * FROM notification 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map(rowToNotification),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  async getUnreadCount(userId: string): Promise<number> {
    const row = await queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM notification WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    return parseInt(row.count, 10);
  },

  async markAsRead(id: string): Promise<void> {
    await query(
      'UPDATE notification SET read_at = NOW() WHERE id = $1 AND read_at IS NULL',
      [id]
    );
  },

  async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      'UPDATE notification SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    return result.length;
  },

  async deleteById(id: string): Promise<void> {
    await query('DELETE FROM notification WHERE id = $1', [id]);
  },

  async deleteOldNotifications(daysOld: number): Promise<number> {
    const result = await query(
      `DELETE FROM notification 
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'`,
      []
    );
    return result.length;
  },
};
