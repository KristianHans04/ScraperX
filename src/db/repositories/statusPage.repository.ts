import { getPool } from '../connection';
import {
  ServiceStatusConfig,
  StatusIncident,
  StatusIncidentUpdate,
  ServiceStatus,
  IncidentStatus,
  IncidentSeverity,
} from '../../types';

export class StatusPageRepository {
  private get pool() {
    return getPool();
  }

  // Service Status Config
  async getAllServices(): Promise<ServiceStatusConfig[]> {
    const result = await this.pool.query(
      'SELECT * FROM service_status_config ORDER BY display_order ASC'
    );
    return result.rows.map(this.mapServiceRow);
  }

  async getService(serviceName: string): Promise<ServiceStatusConfig | null> {
    const result = await this.pool.query(
      'SELECT * FROM service_status_config WHERE service_name = $1',
      [serviceName]
    );
    return result.rows.length > 0 ? this.mapServiceRow(result.rows[0]) : null;
  }

  async updateServiceStatus(serviceName: string, status: ServiceStatus): Promise<void> {
    await this.pool.query(
      'UPDATE service_status_config SET status = $2, updated_at = NOW() WHERE service_name = $1',
      [serviceName, status]
    );
  }

  async updateServiceConfig(serviceName: string, data: {
    serviceDisplayName?: string;
    description?: string;
    displayOrder?: number;
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [serviceName];
    let paramIndex = 2;

    if (data.serviceDisplayName !== undefined) {
      updates.push(`service_display_name = $${paramIndex++}`);
      values.push(data.serviceDisplayName);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(data.displayOrder);
    }

    if (updates.length === 0) return;

    await this.pool.query(
      `UPDATE service_status_config SET ${updates.join(', ')}, updated_at = NOW() WHERE service_name = $1`,
      values
    );
  }

  // Incidents
  async createIncident(data: {
    title: string;
    severity: IncidentSeverity;
    affectedServices: string[];
    createdBy: string;
    initialMessage: string;
  }): Promise<StatusIncident> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const incidentResult = await client.query(
        `INSERT INTO status_incident 
         (title, severity, affected_services, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.title, data.severity, data.affectedServices, data.createdBy]
      );

      const incident = incidentResult.rows[0];

      await client.query(
        `INSERT INTO status_incident_update 
         (incident_id, message, status, created_by)
         VALUES ($1, $2, $3, $4)`,
        [incident.id, data.initialMessage, 'investigating', data.createdBy]
      );

      await client.query('COMMIT');
      return this.mapIncidentRow(incident);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getIncident(id: string): Promise<StatusIncident | null> {
    const result = await this.pool.query(
      'SELECT * FROM status_incident WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapIncidentRow(result.rows[0]) : null;
  }

  async listIncidents(params: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    limit?: number;
    includeResolved?: boolean;
  }): Promise<StatusIncident[]> {
    const { status, severity, limit = 50, includeResolved = false } = params;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (severity) {
      whereConditions.push(`severity = $${paramIndex++}`);
      queryParams.push(severity);
    }

    if (!includeResolved) {
      whereConditions.push(`status != 'resolved'`);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await this.pool.query(
      `SELECT * FROM status_incident ${whereClause}
       ORDER BY started_at DESC
       LIMIT $${paramIndex}`,
      [...queryParams, limit]
    );

    return result.rows.map(this.mapIncidentRow);
  }

  async updateIncidentStatus(id: string, status: IncidentStatus, message: string, adminId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updates: any[] = [id, status];
      let setClauses = 'status = $2, updated_at = NOW()';

      if (status === 'resolved') {
        setClauses += ', resolved_at = NOW()';
      }

      await client.query(
        `UPDATE status_incident SET ${setClauses} WHERE id = $1`,
        updates
      );

      await client.query(
        `INSERT INTO status_incident_update 
         (incident_id, message, status, created_by)
         VALUES ($1, $2, $3, $4)`,
        [id, message, status, adminId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addIncidentUpdate(incidentId: string, message: string, adminId: string): Promise<StatusIncidentUpdate> {
    const result = await this.pool.query(
      `INSERT INTO status_incident_update 
       (incident_id, message, status, created_by)
       VALUES ($1, $2, (SELECT status FROM status_incident WHERE id = $1), $3)
       RETURNING *`,
      [incidentId, message, adminId]
    );
    return this.mapIncidentUpdateRow(result.rows[0]);
  }

  async getIncidentUpdates(incidentId: string): Promise<StatusIncidentUpdate[]> {
    const result = await this.pool.query(
      `SELECT * FROM status_incident_update
       WHERE incident_id = $1
       ORDER BY created_at ASC`,
      [incidentId]
    );
    return result.rows.map(this.mapIncidentUpdateRow);
  }

  async getActiveIncidents(): Promise<StatusIncident[]> {
    const result = await this.pool.query(
      `SELECT * FROM status_incident
       WHERE status != 'resolved'
       ORDER BY severity DESC, started_at DESC`
    );
    return result.rows.map(this.mapIncidentRow);
  }

  async getOverallStatus(): Promise<ServiceStatus> {
    const result = await this.pool.query(`
      SELECT status
      FROM service_status_config
      WHERE status != 'operational'
      ORDER BY 
        CASE status
          WHEN 'major_outage' THEN 1
          WHEN 'partial_outage' THEN 2
          WHEN 'under_maintenance' THEN 3
          WHEN 'degraded_performance' THEN 4
          ELSE 5
        END
      LIMIT 1
    `);

    return result.rows.length > 0 ? result.rows[0].status : 'operational';
  }

  private mapServiceRow(row: any): ServiceStatusConfig {
    return {
      id: row.id,
      serviceName: row.service_name,
      serviceDisplayName: row.service_display_name,
      description: row.description,
      status: row.status,
      displayOrder: row.display_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapIncidentRow(row: any): StatusIncident {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      severity: row.severity,
      affectedServices: row.affected_services || [],
      startedAt: new Date(row.started_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapIncidentUpdateRow(row: any): StatusIncidentUpdate {
    return {
      id: row.id,
      incidentId: row.incident_id,
      message: row.message,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
    };
  }
}
