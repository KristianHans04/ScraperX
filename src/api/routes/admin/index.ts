import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/authExpress.js';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin.js';
import { getPool } from '../../../db/connection.js';
import overviewRoutes from './overview.routes';
import usersRoutes from './users.routes';
import auditRoutes from './audit.routes';
import financeRoutes from './finance.routes';
import operationsRoutes from './operations.routes';
import searchRoutes from './search.routes';
import ticketsRoutes from './tickets.routes';
import contentRoutes from './content.routes';

const router = Router();

// Load user from session before all admin routes
router.use(requireAuth);

router.use('/overview', overviewRoutes);
router.use('/users', usersRoutes);
router.use('/audit', auditRoutes);
router.use('/finance', financeRoutes);
router.use('/operations', operationsRoutes);
router.use('/search', searchRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/content', contentRoutes);

// GET /api/admin/accounts
router.get('/accounts', requireAdmin as any, async (req: AdminRequest, res: Response) => {
  try {
    const result = await getPool().query(`
      SELECT a.id, a.display_name as name, a.billing_email as owner_email, a.plan, a.status,
        (SELECT COUNT(*) FROM users WHERE account_id = a.id AND deleted_at IS NULL) as users_count,
        a.created_at
      FROM account a WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC LIMIT 100
    `);
    res.json({ accounts: result.rows.map(r => ({
      id: r.id, name: r.name, ownerEmail: r.owner_email, plan: r.plan, status: r.status,
      usersCount: parseInt(r.users_count), createdAt: r.created_at,
    })) });
  } catch (err) {
    console.error('Admin accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/admin/moderation
router.get('/moderation', requireAdmin as any, async (req: AdminRequest, res: Response) => {
  res.json({ reports: [] });
});

// POST /api/admin/moderation/:id/:action
router.post('/moderation/:id/:action', requireAdmin as any, async (req: AdminRequest, res: Response) => {
  res.json({ success: true });
});

export default router;
