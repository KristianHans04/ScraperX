import { getPool } from '../connection';
import { RefundRequest, RefundStatus, RefundType } from '../../types';

export class RefundRequestRepository {
  private get pool() {
    return getPool();
  }

  async create(data: {
    userId: string;
    accountId: string;
    invoiceId?: string;
    refundType: RefundType;
    originalAmount: number;
    refundAmount: number;
    reason: string;
    userNotes?: string;
    paymentProcessor?: string;
  }): Promise<RefundRequest> {
    const result = await this.pool.query(
      `INSERT INTO refund_request 
       (user_id, account_id, invoice_id, refund_type, original_amount, refund_amount, reason, user_notes, payment_processor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.userId,
        data.accountId,
        data.invoiceId || null,
        data.refundType,
        data.originalAmount,
        data.refundAmount,
        data.reason,
        data.userNotes || null,
        data.paymentProcessor || null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<RefundRequest | null> {
    const result = await this.pool.query(
      'SELECT * FROM refund_request WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(params: {
    page?: number;
    limit?: number;
    userId?: string;
    accountId?: string;
    status?: RefundStatus;
    minAmount?: number;
    maxAmount?: number;
    sortBy?: 'created_at' | 'refund_amount';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ requests: RefundRequest[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(params.userId);
    }

    if (params.accountId) {
      whereConditions.push(`account_id = $${paramIndex++}`);
      queryParams.push(params.accountId);
    }

    if (params.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(params.status);
    }

    if (params.minAmount !== undefined) {
      whereConditions.push(`refund_amount >= $${paramIndex++}`);
      queryParams.push(params.minAmount);
    }

    if (params.maxAmount !== undefined) {
      whereConditions.push(`refund_amount <= $${paramIndex++}`);
      queryParams.push(params.maxAmount);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM refund_request ${whereClause}`,
      queryParams
    );

    const dataResult = await this.pool.query(
      `SELECT * FROM refund_request ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      requests: dataResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async approve(id: string, adminId: string, adminNotes?: string): Promise<void> {
    await this.pool.query(
      `UPDATE refund_request 
       SET status = 'approved', 
           reviewed_by = $2,
           reviewed_at = NOW(),
           admin_notes = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id, adminId, adminNotes || null]
    );
  }

  async deny(id: string, adminId: string, adminNotes: string): Promise<void> {
    await this.pool.query(
      `UPDATE refund_request 
       SET status = 'denied', 
           reviewed_by = $2,
           reviewed_at = NOW(),
           admin_notes = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [id, adminId, adminNotes]
    );
  }

  async markProcessing(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE refund_request 
       SET status = 'processing', 
           processed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async markCompleted(id: string, processorRefundId: string): Promise<void> {
    await this.pool.query(
      `UPDATE refund_request 
       SET status = 'completed', 
           processor_refund_id = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id, processorRefundId]
    );
  }

  async markFailed(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE refund_request 
       SET status = 'failed', 
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async getPendingCount(): Promise<number> {
    const result = await this.pool.query(
      "SELECT COUNT(*) FROM refund_request WHERE status = 'pending'"
    );
    return parseInt(result.rows[0].count);
  }

  private mapRow(row: any): RefundRequest {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      invoiceId: row.invoice_id,
      refundType: row.refund_type,
      status: row.status,
      originalAmount: row.original_amount,
      refundAmount: row.refund_amount,
      reason: row.reason,
      userNotes: row.user_notes,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      adminNotes: row.admin_notes,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      paymentProcessor: row.payment_processor,
      processorRefundId: row.processor_refund_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
