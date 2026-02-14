import { getPool } from '../connection';
import { SystemConfiguration, ConfigValueType, ConfigCategory } from '../../types';

export class SystemConfigurationRepository {
  private get pool() {
    return getPool();
  }

  async get(configKey: string): Promise<SystemConfiguration | null> {
    const result = await this.pool.query(
      'SELECT * FROM system_configuration WHERE config_key = $1',
      [configKey]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getValue(configKey: string): Promise<string | null> {
    const config = await this.get(configKey);
    return config ? config.value : null;
  }

  async getTypedValue<T>(configKey: string): Promise<T | null> {
    const config = await this.get(configKey);
    if (!config) return null;

    switch (config.valueType) {
      case 'number':
        return parseFloat(config.value) as T;
      case 'boolean':
        return (config.value === 'true') as T;
      case 'json':
        return JSON.parse(config.value) as T;
      default:
        return config.value as T;
    }
  }

  async getByCategory(category: ConfigCategory): Promise<SystemConfiguration[]> {
    const result = await this.pool.query(
      'SELECT * FROM system_configuration WHERE category = $1 ORDER BY config_key ASC',
      [category]
    );
    return result.rows.map(this.mapRow);
  }

  async getAll(): Promise<SystemConfiguration[]> {
    const result = await this.pool.query(
      'SELECT * FROM system_configuration ORDER BY category, config_key ASC'
    );
    return result.rows.map(this.mapRow);
  }

  async set(configKey: string, value: string, adminId?: string): Promise<void> {
    await this.pool.query(
      `UPDATE system_configuration 
       SET value = $2, 
           last_modified_by = $3, 
           last_modified_at = NOW(),
           updated_at = NOW()
       WHERE config_key = $1`,
      [configKey, value, adminId || null]
    );
  }

  async setBatch(updates: Array<{ key: string; value: string }>, adminId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        await client.query(
          `UPDATE system_configuration 
           SET value = $2, 
               last_modified_by = $3, 
               last_modified_at = NOW(),
               updated_at = NOW()
           WHERE config_key = $1`,
          [update.key, update.value, adminId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async create(data: {
    configKey: string;
    valueType: ConfigValueType;
    value: string;
    category: ConfigCategory;
    description?: string;
    isSecret?: boolean;
    isCritical?: boolean;
    validationRegex?: string;
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
  }): Promise<SystemConfiguration> {
    const result = await this.pool.query(
      `INSERT INTO system_configuration 
       (config_key, value_type, value, category, description, is_secret, is_critical, 
        validation_regex, min_value, max_value, allowed_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.configKey,
        data.valueType,
        data.value,
        data.category,
        data.description || null,
        data.isSecret || false,
        data.isCritical || false,
        data.validationRegex || null,
        data.minValue || null,
        data.maxValue || null,
        data.allowedValues || null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(configKey: string, data: Partial<{
    value: string;
    description: string;
    isSecret: boolean;
    isCritical: boolean;
    validationRegex: string;
    minValue: number;
    maxValue: number;
    allowedValues: string[];
  }>, adminId?: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [configKey];
    let paramIndex = 2;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) return;

    updates.push(`last_modified_by = $${paramIndex++}`);
    values.push(adminId || null);

    updates.push(`last_modified_at = NOW()`);
    updates.push(`updated_at = NOW()`);

    await this.pool.query(
      `UPDATE system_configuration SET ${updates.join(', ')} WHERE config_key = $1`,
      values
    );
  }

  async delete(configKey: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM system_configuration WHERE config_key = $1',
      [configKey]
    );
  }

  async validate(configKey: string, value: string): Promise<{ valid: boolean; error?: string }> {
    const config = await this.get(configKey);
    if (!config) {
      return { valid: false, error: 'Configuration key not found' };
    }

    switch (config.valueType) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { valid: false, error: 'Value must be a number' };
        }
        if (config.minValue !== null && numValue < config.minValue) {
          return { valid: false, error: `Value must be >= ${config.minValue}` };
        }
        if (config.maxValue !== null && numValue > config.maxValue) {
          return { valid: false, error: `Value must be <= ${config.maxValue}` };
        }
        break;

      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          return { valid: false, error: 'Value must be true or false' };
        }
        break;

      case 'json':
        try {
          JSON.parse(value);
        } catch {
          return { valid: false, error: 'Value must be valid JSON' };
        }
        break;

      case 'string':
        if (config.validationRegex) {
          const regex = new RegExp(config.validationRegex);
          if (!regex.test(value)) {
            return { valid: false, error: 'Value does not match required format' };
          }
        }
        if (config.allowedValues && config.allowedValues.length > 0) {
          if (!config.allowedValues.includes(value)) {
            return { valid: false, error: `Value must be one of: ${config.allowedValues.join(', ')}` };
          }
        }
        break;
    }

    return { valid: true };
  }

  async getCriticalConfigs(): Promise<SystemConfiguration[]> {
    const result = await this.pool.query(
      'SELECT * FROM system_configuration WHERE is_critical = true ORDER BY category, config_key ASC'
    );
    return result.rows.map(this.mapRow);
  }

  async getRecentChanges(limit: number = 20): Promise<SystemConfiguration[]> {
    const result = await this.pool.query(
      `SELECT * FROM system_configuration 
       WHERE last_modified_at IS NOT NULL
       ORDER BY last_modified_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): SystemConfiguration {
    return {
      id: row.id,
      configKey: row.config_key,
      valueType: row.value_type,
      value: row.value,
      category: row.category,
      description: row.description,
      isSecret: row.is_secret,
      isCritical: row.is_critical,
      validationRegex: row.validation_regex,
      minValue: row.min_value,
      maxValue: row.max_value,
      allowedValues: row.allowed_values,
      lastModifiedBy: row.last_modified_by,
      lastModifiedAt: row.last_modified_at ? new Date(row.last_modified_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
