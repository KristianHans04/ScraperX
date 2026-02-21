import { query, queryOne, queryAll } from '../connection.js';
import type { 
  SupportTicket,
  SupportTicketMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketAttachment,
  PaginatedResult,
  PaginationParams 
} from '../../types/index.js';

interface SupportTicketRow {
  id: string;
  ticket_number: string;
  user_id: string;
  account_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to_user_id: string | null;
  resolved_at: Date | null;
  resolved_by_user_id: string | null;
  closed_at: Date | null;
  last_reply_at: Date | null;
  last_reply_by_user: boolean | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface SupportTicketMessageRow {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  message: string;
  attachments: TicketAttachment[];
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function rowToTicket(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    userId: row.user_id,
    accountId: row.account_id,
    subject: row.subject,
    category: row.category as TicketCategory,
    priority: row.priority as TicketPriority,
    status: row.status as TicketStatus,
    assignedToUserId: row.assigned_to_user_id ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedByUserId: row.resolved_by_user_id ?? undefined,
    closedAt: row.closed_at ?? undefined,
    lastReplyAt: row.last_reply_at ?? undefined,
    lastReplyByUser: row.last_reply_by_user ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: SupportTicketMessageRow): SupportTicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    isStaff: row.is_staff,
    message: row.message,
    attachments: row.attachments,
    isInternal: row.is_internal,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supportTicketRepository = {
  async create(data: {
    userId: string;
    accountId: string;
    subject: string;
    category: TicketCategory;
    priority?: TicketPriority;
    initialMessage: string;
  }): Promise<SupportTicket> {
    const ticketNumber = await this.generateTicketNumber();
    
    const ticketRow = await queryOne<SupportTicketRow>(
      `INSERT INTO support_ticket (
        ticket_number, user_id, account_id, subject, 
        category, priority, status, last_reply_at, last_reply_by_user
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), TRUE)
      RETURNING *`,
      [
        ticketNumber,
        data.userId,
        data.accountId,
        data.subject,
        data.category,
        data.priority ?? 'normal',
      ]
    );

    await query(
      `INSERT INTO support_ticket_message (
        ticket_id, user_id, is_staff, message
      ) VALUES ($1, $2, FALSE, $3)`,
      [ticketRow.id, data.userId, data.initialMessage]
    );

    return rowToTicket(ticketRow);
  },

  async generateTicketNumber(): Promise<string> {
    const row = await queryOne<{ ticket_number: string }>(
      'SELECT generate_ticket_number() as ticket_number',
      []
    );
    return row.ticket_number;
  },

  async findById(id: string): Promise<SupportTicket | null> {
    const row = await queryOne<SupportTicketRow>(
      'SELECT * FROM support_ticket WHERE id = $1',
      [id]
    );
    return row ? rowToTicket(row) : null;
  },

  async findByTicketNumber(ticketNumber: string): Promise<SupportTicket | null> {
    const row = await queryOne<SupportTicketRow>(
      'SELECT * FROM support_ticket WHERE ticket_number = $1',
      [ticketNumber]
    );
    return row ? rowToTicket(row) : null;
  },

  async findByUserId(
    userId: string,
    options?: { status?: TicketStatus; limit?: number }
  ): Promise<SupportTicket[]> {
    let sql = 'SELECT * FROM support_ticket WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (options?.status) {
      sql += ' AND status = $2';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    const rows = await queryAll<SupportTicketRow>(sql, params);
    return rows.map(rowToTicket);
  },

  async findByUserIdPaginated(
    userId: string,
    pagination: PaginationParams,
    filters?: { status?: TicketStatus; category?: TicketCategory }
  ): Promise<PaginatedResult<SupportTicket>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];
    let paramCount = 1;

    if (filters?.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters?.category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM support_ticket ${whereClause}`,
      params
    );
    const total = parseInt(countRow.count, 10);

    const rows = await queryAll<SupportTicketRow>(
      `SELECT * FROM support_ticket 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map(rowToTicket),
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

  async addMessage(data: {
    ticketId: string;
    userId: string;
    isStaff: boolean;
    message: string;
    attachments?: TicketAttachment[];
    isInternal?: boolean;
  }): Promise<SupportTicketMessage> {
    const messageRow = await queryOne<SupportTicketMessageRow>(
      `INSERT INTO support_ticket_message (
        ticket_id, user_id, is_staff, message, attachments, is_internal
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.ticketId,
        data.userId,
        data.isStaff,
        data.message,
        JSON.stringify(data.attachments ?? []),
        data.isInternal ?? false,
      ]
    );

    await query(
      `UPDATE support_ticket 
       SET last_reply_at = NOW(), 
           last_reply_by_user = $1,
           status = CASE 
             WHEN $2 = TRUE AND status = 'waiting_user' THEN 'waiting_staff'
             WHEN $2 = FALSE AND status = 'waiting_staff' THEN 'waiting_user'
             ELSE status
           END
       WHERE id = $3`,
      [!data.isStaff, !data.isStaff, data.ticketId]
    );

    return rowToMessage(messageRow);
  },

  async getMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    const rows = await queryAll<SupportTicketMessageRow>(
      `SELECT * FROM support_ticket_message 
       WHERE ticket_id = $1 AND is_internal = FALSE
       ORDER BY created_at ASC`,
      [ticketId]
    );
    return rows.map(rowToMessage);
  },

  async updateStatus(
    id: string,
    status: TicketStatus,
    userId?: string
  ): Promise<void> {
    if (status === 'resolved') {
      await query(
        `UPDATE support_ticket 
         SET status = $1, resolved_at = NOW(), resolved_by_user_id = $2
         WHERE id = $3`,
        [status, userId ?? null, id]
      );
    } else if (status === 'closed') {
      await query(
        `UPDATE support_ticket 
         SET status = $1, closed_at = NOW()
         WHERE id = $2`,
        [status, id]
      );
    } else {
      await query(
        'UPDATE support_ticket SET status = $1 WHERE id = $2',
        [status, id]
      );
    }
  },

  async assignTicket(id: string, adminUserId: string | null): Promise<void> {
    await query(
      'UPDATE support_ticket SET assigned_to_user_id = $1 WHERE id = $2',
      [adminUserId, id]
    );
  },

  async getTicketsForAutoClose(daysResolved: number, daysInactive: number): Promise<SupportTicket[]> {
    const rows = await queryAll<SupportTicketRow>(
      `SELECT * FROM support_ticket 
       WHERE status = 'resolved' 
         AND resolved_at < NOW() - INTERVAL '${daysResolved} days'
       UNION
       SELECT * FROM support_ticket 
       WHERE status IN ('open', 'waiting_user', 'waiting_staff')
         AND last_reply_at < NOW() - INTERVAL '${daysInactive} days'`,
      []
    );
    return rows.map(rowToTicket);
  },

  async checkRateLimit(userId: string, hours: number, limit: number): Promise<boolean> {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM support_ticket 
       WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '${hours} hours'`,
      [userId]
    );
    const count = parseInt(row.count, 10);
    return count < limit;
  },
};
