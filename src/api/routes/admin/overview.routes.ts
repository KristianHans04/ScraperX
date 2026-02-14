import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';

const router = Router();

router.get('/stats', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const statsQuery = await getPool().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as active_users,
        (SELECT COUNT(*) FROM scrape_job) as total_jobs,
        (SELECT COUNT(*) FROM scrape_job WHERE created_at > CURRENT_DATE) as jobs_today,
        (SELECT COUNT(*) FROM support_ticket WHERE status IN ('open', 'in_progress')) as tickets_open,
        (SELECT COUNT(*) FROM support_ticket WHERE status = 'open' AND assigned_to IS NULL) as tickets_pending
    `);

    const accountQuery = await getPool().query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN plan = 'pro' THEN 990
          WHEN plan = 'enterprise' THEN 4990
          ELSE 0
        END), 0) as mrr
      FROM account
      WHERE status = 'active' AND stripe_subscription_id IS NOT NULL
    `);

    const revenue30dQuery = await getPool().query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM (
        SELECT 990 as amount FROM account 
        WHERE plan = 'pro' AND created_at > NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 4990 as amount FROM account 
        WHERE plan = 'enterprise' AND created_at > NOW() - INTERVAL '30 days'
      ) revenue_calc
    `);

    const healthQuery = await getPool().query(`
      SELECT 
        COUNT(*) FILTER (WHERE status != 'operational') as degraded_services
      FROM service_status_config
    `);

    const stats = statsQuery.rows[0];
    const account = accountQuery.rows[0];
    const revenue = revenue30dQuery.rows[0];
    const health = healthQuery.rows[0];

    res.json({
      totalUsers: parseInt(stats.total_users),
      activeUsers: parseInt(stats.active_users),
      totalJobs: parseInt(stats.total_jobs),
      jobsToday: parseInt(stats.jobs_today),
      mrr: parseInt(account.mrr),
      revenue30d: parseInt(revenue.revenue),
      ticketsOpen: parseInt(stats.tickets_open),
      ticketsPending: parseInt(stats.tickets_pending),
      systemHealth: parseInt(health.degraded_services) > 0 ? 'degraded' : 'healthy',
    });
  } catch (error) {
    console.error('Error fetching admin overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.get('/activity', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const activityQuery = await getPool().query(
      `SELECT 
        id,
        admin_email,
        action,
        category,
        resource_type,
        resource_id,
        created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );

    const activity = activityQuery.rows.map(row => ({
      id: row.id.toString(),
      adminEmail: row.admin_email,
      action: row.action,
      category: row.category,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      createdAt: row.created_at,
    }));

    res.json({ activity });
  } catch (error) {
    console.error('Error fetching admin activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
