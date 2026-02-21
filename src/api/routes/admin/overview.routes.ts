import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';

const router = Router();

// GET /api/admin/overview - called by AdminOverviewPage
router.get('/', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const statsQuery = await getPool().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as active_users,
        (SELECT COUNT(*) FROM scrape_jobs) as total_jobs,
        (SELECT COUNT(*) FROM scrape_jobs WHERE created_at > CURRENT_DATE) as jobs_today,
        (SELECT COUNT(*) FROM support_ticket WHERE status IN ('open', 'in_progress')) as tickets_open,
        (SELECT COUNT(*) FROM support_ticket WHERE status = 'open' AND assigned_to IS NULL) as tickets_pending
    `);

    const accountQuery = await getPool().query(`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(CASE WHEN plan = 'pro' THEN 990 WHEN plan = 'enterprise' THEN 4990 ELSE 0 END), 0) as mrr
      FROM account WHERE status = 'active'
    `);

    const stats = statsQuery.rows[0];
    const account = accountQuery.rows[0];

    res.json({
      totalUsers: parseInt(stats.total_users),
      activeUsers: parseInt(stats.active_users),
      totalJobs: parseInt(stats.total_jobs),
      jobsToday: parseInt(stats.jobs_today),
      mrr: parseInt(account.mrr),
      revenue30d: 0,
      ticketsOpen: parseInt(stats.tickets_open),
      ticketsPending: parseInt(stats.tickets_pending),
      systemHealth: 'healthy',
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /api/admin/overview/stats
router.get('/stats', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const statsQuery = await getPool().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM scrape_jobs) as total_jobs,
        (SELECT COUNT(*) FROM support_ticket WHERE status IN ('open', 'in_progress')) as tickets_open
    `);
    const stats = statsQuery.rows[0];
    res.json({
      totalUsers: parseInt(stats.total_users),
      totalJobs: parseInt(stats.total_jobs),
      ticketsOpen: parseInt(stats.tickets_open),
    });
  } catch (error) {
    console.error('Error fetching admin overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/overview/activity
router.get('/activity', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const activityQuery = await getPool().query(
      `SELECT id, admin_email, action, category, resource_type, resource_id, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ activity: activityQuery.rows.map(row => ({
      id: row.id.toString(),
      adminEmail: row.admin_email,
      action: row.action,
      category: row.category,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error('Error fetching admin activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
