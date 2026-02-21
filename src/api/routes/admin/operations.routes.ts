import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { auditLogger } from '../../middleware/auditLogger';
import { SystemConfigurationRepository } from '../../../db/repositories/systemConfiguration.repository';

const router = Router();
const configRepo = new SystemConfigurationRepository();

router.get('/health', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const dbCheck = await getPool().query('SELECT NOW()');
    const servicesQuery = await getPool().query(`
      SELECT service_name, status
      FROM service_status_config
    `);

    res.json({
      database: 'healthy',
      services: servicesQuery.rows,
      timestamp: dbCheck.rows[0].now,
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/config', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const category = req.query.category as any;
    const configs = category 
      ? await configRepo.getByCategory(category)
      : await configRepo.getAll();

    res.json({ configs });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

router.patch(
  '/config/:key',
  requireAdmin,
  auditLogger({
    category: 'operations',
    action: 'config.update',
    resourceType: 'configuration',
    getDetails: (req) => ({ key: req.params.key, newValue: req.body.value }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const validation = await configRepo.validate(req.params.key, req.body.value);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      await configRepo.set(req.params.key, req.body.value, req.user!.id);
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
);

// GET /api/admin/operations/overview
router.get('/overview', requireAdmin, async (_req: AdminRequest, res) => {
  res.json({ workerStatus: 'disabled', jobsInQueue: 0, jobsProcessing: 0 });
});

// GET /api/admin/operations/queues
router.get('/queues', requireAdmin, async (_req: AdminRequest, res) => {
  res.json({ queues: [] });
});

// POST /api/admin/operations/queues/:name/:action
router.post('/queues/:name/:action', requireAdmin, async (_req: AdminRequest, res) => {
  res.json({ success: true });
});

// GET /api/admin/operations/errors
router.get('/errors', requireAdmin, async (_req: AdminRequest, res) => {
  res.json({ errors: [] });
});

export default router;