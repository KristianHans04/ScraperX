import { Response, NextFunction } from 'express';
import { AdminRequest } from './requireAdmin';
import { AuditLogRepository } from '../../db/repositories/auditLog.repository';
import { AuditLogCategory } from '../../types';

const auditLogRepo = new AuditLogRepository();

interface AuditLogOptions {
  category: AuditLogCategory;
  action: string;
  resourceType: string;
  getResourceId?: (req: AdminRequest) => string | undefined;
  getDetails?: (req: AdminRequest) => Record<string, unknown>;
}

export function auditLogger(options: AuditLogOptions) {
  return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const originalSend = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = options.getResourceId ? options.getResourceId(req) : req.params.id;
        
        let details: Record<string, unknown> = options.getDetails ? options.getDetails(req) : {};
        
        if (req.body && Object.keys(req.body).length > 0) {
          details = {
            ...details,
            requestBody: sanitizeBody(req.body),
          };
        }

        auditLogRepo.create({
          adminId: req.user!.id,
          adminEmail: req.user!.email,
          action: options.action,
          category: options.category,
          resourceType: options.resourceType,
          resourceId,
          details,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(error => {
          console.error('Failed to create audit log:', error);
        });
      }

      return originalSend(body);
    };

    next();
  };
}

function sanitizeBody(body: any): any {
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'apiKey', 'secret'];
  const sanitized: any = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

export function createAuditLog(
  adminId: string,
  adminEmail: string,
  category: AuditLogCategory,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return auditLogRepo.create({
    adminId,
    adminEmail,
    action,
    category,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  }).then(() => {});
}
