import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { auditLogger } from '../../middleware/auditLogger';
import { RefundRequestRepository } from '../../../db/repositories/refundRequest.repository';

const router = Router();
const refundRepo = new RefundRequestRepository();

router.get('/revenue', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const period = (req.query.period as string) || '30d';
    
    const mrrQuery = await getPool().query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN plan = 'pro' THEN 990
          WHEN plan = 'enterprise' THEN 4990
          ELSE 0
        END), 0) as mrr
      FROM account
      WHERE status = 'active' AND stripe_subscription_id IS NOT NULL
    `);

    const revenueQuery = await getPool().query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM (
        SELECT 990 as amount FROM account 
        WHERE plan = 'pro' AND created_at > NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 4990 as amount FROM account 
        WHERE plan = 'enterprise' AND created_at > NOW() - INTERVAL '30 days'
      ) revenue_calc
    `);

    res.json({
      mrr: parseInt(mrrQuery.rows[0].mrr),
      arr: parseInt(mrrQuery.rows[0].mrr) * 12,
      revenue30d: parseInt(revenueQuery.rows[0].revenue),
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

router.get('/refunds', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await refundRepo.list({
      page,
      limit,
      status: req.query.status as any,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

router.post(
  '/refunds/:id/approve',
  requireAdmin,
  auditLogger({
    category: 'financial',
    action: 'refund.approve',
    resourceType: 'refund_request',
  }),
  async (req: AdminRequest, res) => {
    try {
      await refundRepo.approve(req.params.id, req.user!.id, req.body.notes);
      res.json({ message: 'Refund approved successfully' });
    } catch (error) {
      console.error('Error approving refund:', error);
      res.status(500).json({ error: 'Failed to approve refund' });
    }
  }
);

router.post(
  '/refunds/:id/deny',
  requireAdmin,
  auditLogger({
    category: 'financial',
    action: 'refund.deny',
    resourceType: 'refund_request',
  }),
  async (req: AdminRequest, res) => {
    try {
      await refundRepo.deny(req.params.id, req.user!.id, req.body.reason);
      res.json({ message: 'Refund denied successfully' });
    } catch (error) {
      console.error('Error denying refund:', error);
      res.status(500).json({ error: 'Failed to deny refund' });
    }
  }
);

// GET /api/admin/finance/credits - credit ledger overview
router.get('/credits', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const result = await getPool().query(`
      SELECT a.id, a.display_name as name, a.billing_email as email, a.plan,
        a.credit_balance, a.credit_cycle_usage, a.created_at
      FROM account a WHERE a.deleted_at IS NULL
      ORDER BY a.credit_balance DESC LIMIT 100
    `);
    res.json({ credits: result.rows.map(r => ({
      accountId: r.id, accountName: r.name, email: r.email, plan: r.plan,
      balance: parseInt(r.credit_balance), cycleUsage: parseInt(r.credit_cycle_usage),
    })) });
  } catch (error) {
    console.error('Error fetching credit ledger:', error);
    res.status(500).json({ error: 'Failed to fetch credit ledger' });
  }
});

// GET /api/admin/finance/invoices
router.get('/invoices', requireAdmin, async (_req: AdminRequest, res) => {
  res.json({ invoices: [] });
});

// GET /api/admin/finance/subscriptions
router.get('/subscriptions', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const result = await getPool().query(`
      SELECT a.id, a.display_name as name, a.billing_email as email, a.plan, a.status,
        a.created_at
      FROM account a WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC LIMIT 100
    `);
    res.json({ subscriptions: result.rows.map(r => ({
      accountId: r.id, accountName: r.name, email: r.email, plan: r.plan,
      status: r.status, nextBillingDate: null,
    })) });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/admin/finance/overview
router.get('/overview', requireAdmin, async (req: AdminRequest, res) => {
  res.json({ mrr: 0, totalRevenue: 0, activeSubscriptions: 0, revenue30d: 0, totalSubscriptions: 0 });
});

export default router;
