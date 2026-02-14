import { Router } from 'express';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { AuditLogRepository } from '../../../db/repositories/auditLog.repository';

const router = Router();
const auditLogRepo = new AuditLogRepository();

router.get('/', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await auditLogRepo.list({
      page,
      limit,
      adminId: req.query.adminId as string,
      category: req.query.category as any,
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      resourceId: req.query.resourceId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });

    res.json({
      logs: result.logs,
      total: result.total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.post('/export', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const logs = await auditLogRepo.export({
      adminId: req.body.adminId,
      category: req.body.category,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    });

    const csv = [
      'Timestamp,Admin,Action,Category,Resource Type,Resource ID',
      ...logs.map(log => 
        `${log.createdAt.toISOString()},${log.adminEmail},${log.action},${log.category},${log.resourceType},${log.resourceId || ''}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
