import { getPool } from '../connection';
import { AuditLog, AuditLogCategory } from '../../types';

export class AuditLogRepository {
  private get pool() {
    return getPool();
  }

  async create(data: {
    adminId?: string;
    adminEmail?: string;
    action: string;
    category: AuditLogCategory;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const result = await this.pool.query(
      `INSERT INTO audit_log 
       (admin_id, admin_email, action, category, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.adminId || null,
        data.adminEmail || null,
        data.action,
        data.category,
        data.resourceType,
        data.resourceId || null,
        JSON.stringify(data.details || {}),
        data.ipAddress || null,
        data.userAgent || null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async logAuthEvent(data: {
    userId?: string;
    userEmail?: string;
    action: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.create({
      adminId: data.userId,
      adminEmail: data.userEmail,
      action: data.action,
      category: 'security' as AuditLogCategory,
      resourceType: 'auth',
      details: {
        ...data.details,
        success: data.success,
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  async list(params: {
    page?: number;
    limit?: number;
    adminId?: string;
    category?: AuditLogCategory;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.adminId) {
      whereConditions.push(`admin_id = $${paramIndex++}`);
      queryParams.push(params.adminId);
    }

    if (params.category) {
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(params.category);
    }

    if (params.action) {
      whereConditions.push(`action = $${paramIndex++}`);
      queryParams.push(params.action);
    }

    if (params.resourceType) {
      whereConditions.push(`resource_type = $${paramIndex++}`);
      queryParams.push(params.resourceType);
    }

    if (params.resourceId) {
      whereConditions.push(`resource_id = $${paramIndex++}`);
      queryParams.push(params.resourceId);
    }

    if (params.startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(params.endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM audit_log ${whereClause}`,
      queryParams
    );

    const dataResult = await this.pool.query(
      `SELECT * FROM audit_log ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      logs: dataResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async export(params: {
    adminId?: string;
    category?: AuditLogCategory;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.adminId) {
      whereConditions.push(`admin_id = $${paramIndex++}`);
      queryParams.push(params.adminId);
    }

    if (params.category) {
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(params.category);
    }

    if (params.startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(params.endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await this.pool.query(
      `SELECT * FROM audit_log ${whereClause}
       ORDER BY created_at DESC
       LIMIT 10000`,
      queryParams
    );

    return result.rows.map(this.mapRow);
  }

  async getByResourceId(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const result = await this.pool.query(
      `SELECT * FROM audit_log
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY created_at DESC`,
      [resourceType, resourceId]
    );

    return result.rows.map(this.mapRow);
  }

  async getRecentActivity(limit: number = 20): Promise<AuditLog[]> {
    const result = await this.pool.query(
      `SELECT * FROM audit_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): AuditLog {
    return {
      id: row.id.toString(),
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      category: row.category,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
    };
  }
}
