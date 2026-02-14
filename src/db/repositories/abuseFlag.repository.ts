import { getPool } from '../connection';
import { 
  AbuseFlag, 
  AbuseSignalType, 
  AbuseSeverity, 
  AbuseFlagStatus 
} from '../../types';

export class AbuseFlagRepository {
  private get pool() {
    return getPool();
  }

  async create(data: {
    userId?: string;
    accountId?: string;
    signalType: AbuseSignalType;
    severity: AbuseSeverity;
    thresholdValue?: number;
    actualValue?: number;
    evidence: Record<string, unknown>;
  }): Promise<AbuseFlag> {
    const result = await this.pool.query(
      `INSERT INTO abuse_flag 
       (user_id, account_id, signal_type, severity, threshold_value, actual_value, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId || null,
        data.accountId || null,
        data.signalType,
        data.severity,
        data.thresholdValue || null,
        data.actualValue || null,
        JSON.stringify(data.evidence),
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<AbuseFlag | null> {
    const result = await this.pool.query(
      'SELECT * FROM abuse_flag WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(params: {
    page?: number;
    limit?: number;
    userId?: string;
    accountId?: string;
    signalType?: AbuseSignalType;
    severity?: AbuseSeverity;
    status?: AbuseFlagStatus;
    sortBy?: 'detected_at' | 'severity';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ flags: AbuseFlag[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'detected_at';
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

    if (params.signalType) {
      whereConditions.push(`signal_type = $${paramIndex++}`);
      queryParams.push(params.signalType);
    }

    if (params.severity) {
      whereConditions.push(`severity = $${paramIndex++}`);
      queryParams.push(params.severity);
    }

    if (params.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(params.status);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM abuse_flag ${whereClause}`,
      queryParams
    );

    const dataResult = await this.pool.query(
      `SELECT * FROM abuse_flag ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      flags: dataResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async updateStatus(id: string, status: AbuseFlagStatus, resolutionNote?: string): Promise<void> {
    const updates: any[] = [id, status];
    let setClauses = 'status = $2, updated_at = NOW()';

    if (status === 'resolved' || status === 'false_positive') {
      setClauses += ', resolved_at = NOW()';
      if (resolutionNote) {
        setClauses += ', resolution_note = $3';
        updates.push(resolutionNote);
      }
    }

    await this.pool.query(
      `UPDATE abuse_flag SET ${setClauses} WHERE id = $1`,
      updates
    );
  }

  async investigate(id: string, adminId: string): Promise<void> {
    await this.pool.query(
      `UPDATE abuse_flag 
       SET status = 'investigating', 
           investigated_by = $2, 
           investigated_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id, adminId]
    );
  }

  async recordAction(id: string, actionTaken: string, actionDetails?: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `UPDATE abuse_flag 
       SET action_taken = $2, 
           action_details = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [id, actionTaken, JSON.stringify(actionDetails || {})]
    );
  }

  async getActiveByUser(userId: string): Promise<AbuseFlag[]> {
    const result = await this.pool.query(
      `SELECT * FROM abuse_flag
       WHERE user_id = $1 AND status = 'active'
       ORDER BY detected_at DESC`,
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async getActiveByAccount(accountId: string): Promise<AbuseFlag[]> {
    const result = await this.pool.query(
      `SELECT * FROM abuse_flag
       WHERE account_id = $1 AND status = 'active'
       ORDER BY detected_at DESC`,
      [accountId]
    );
    return result.rows.map(this.mapRow);
  }

  async getStats(): Promise<{
    active: number;
    investigating: number;
    resolved: number;
    falsePositive: number;
    critical: number;
  }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'investigating') as investigating,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'false_positive') as false_positive,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('active', 'investigating')) as critical
      FROM abuse_flag
      WHERE detected_at > NOW() - INTERVAL '30 days'
    `);
    
    return {
      active: parseInt(result.rows[0].active),
      investigating: parseInt(result.rows[0].investigating),
      resolved: parseInt(result.rows[0].resolved),
      falsePositive: parseInt(result.rows[0].false_positive),
      critical: parseInt(result.rows[0].critical),
    };
  }

  private mapRow(row: any): AbuseFlag {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      signalType: row.signal_type,
      severity: row.severity,
      status: row.status,
      detectedAt: new Date(row.detected_at),
      thresholdValue: row.threshold_value,
      actualValue: row.actual_value,
      evidence: row.evidence,
      investigatedBy: row.investigated_by,
      investigatedAt: row.investigated_at ? new Date(row.investigated_at) : undefined,
      resolutionNote: row.resolution_note,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      actionTaken: row.action_taken,
      actionDetails: row.action_details,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
