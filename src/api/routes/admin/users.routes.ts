import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { adminSelfProtection } from '../../middleware/adminSelfProtection';
import { auditLogger } from '../../middleware/auditLogger';
import { accountRepository } from '../../../db/repositories/account.repository';
import { userRepository } from '../../../db/repositories/user.repository';

const router = Router();

router.get('/', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const search = req.query.search as string;
    const status = req.query.status as string;
    const role = req.query.role as string;
    const plan = req.query.plan as string;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    let whereConditions: string[] = ['u.deleted_at IS NULL'];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (role) {
      whereConditions.push(`u.role = $${paramIndex++}`);
      queryParams.push(role);
    }

    if (plan) {
      whereConditions.push(`a.plan = $${paramIndex++}`);
      queryParams.push(plan);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await getPool().query(
      `SELECT COUNT(*) 
       FROM users u
       INNER JOIN account a ON a.id = u.account_id
       WHERE ${whereClause}`,
      queryParams
    );

    const dataResult = await getPool().query(
      `SELECT 
        u.*,
        a.display_name as account_name,
        a.plan,
        a.credit_balance,
        a.status as account_status,
        (SELECT COUNT(*) FROM scrape_job j WHERE j.account_id = a.id) as jobs_count
       FROM users u
       INNER JOIN account a ON a.id = u.account_id
       WHERE ${whereClause}
       ORDER BY u.${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const users = dataResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      account: {
        name: row.account_name,
        plan: row.plan,
        creditBalance: row.credit_balance,
        status: row.account_status,
      },
      jobsCount: parseInt(row.jobs_count),
    }));

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const account = await accountRepository.findById(user.accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const jobsResult = await getPool().query(
      'SELECT COUNT(*) as count FROM scrape_job WHERE account_id = $1',
      [account.id]
    );

    const ticketsResult = await getPool().query(
      'SELECT COUNT(*) as count FROM support_ticket WHERE user_id = $1',
      [user.id]
    );

    res.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
      },
      account: {
        ...account,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      },
      jobsCount: parseInt(jobsResult.rows[0].count),
      ticketsCount: parseInt(ticketsResult.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

router.post(
  '/:id/suspend',
  requireAdmin,
  adminSelfProtection,
  auditLogger({
    category: 'user_management',
    action: 'user.suspend',
    resourceType: 'user',
    getDetails: (req) => ({ reason: req.body.reason }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await accountRepository.suspend(user.accountId, req.body.reason);

      res.json({ message: 'User suspended successfully' });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  }
);

router.post(
  '/:id/unsuspend',
  requireAdmin,
  auditLogger({
    category: 'user_management',
    action: 'user.unsuspend',
    resourceType: 'user',
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await accountRepository.unsuspend(user.accountId);

      res.json({ message: 'User unsuspended successfully' });
    } catch (error) {
      console.error('Error unsuspending user:', error);
      res.status(500).json({ error: 'Failed to unsuspend user' });
    }
  }
);

router.post(
  '/:id/adjust-credits',
  requireAdmin,
  auditLogger({
    category: 'financial',
    action: 'credits.adjust',
    resourceType: 'account',
    getDetails: (req) => ({
      amount: req.body.amount,
      reason: req.body.reason,
    }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const { amount, reason } = req.body;

      if (!amount || !reason) {
        return res.status(400).json({ error: 'Amount and reason are required' });
      }

      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await accountRepository.adjustCredits(user.accountId, parseInt(amount), reason);

      res.json({ message: 'Credits adjusted successfully' });
    } catch (error) {
      console.error('Error adjusting credits:', error);
      res.status(500).json({ error: 'Failed to adjust credits' });
    }
  }
);

router.post(
  '/:id/change-plan',
  requireAdmin,
  auditLogger({
    category: 'financial',
    action: 'plan.change',
    resourceType: 'account',
    getDetails: (req) => ({ newPlan: req.body.plan }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const { plan } = req.body;

      if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: 'Valid plan is required' });
      }

      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await accountRepository.updatePlan(user.accountId, plan);

      res.json({ message: 'Plan changed successfully' });
    } catch (error) {
      console.error('Error changing plan:', error);
      res.status(500).json({ error: 'Failed to change plan' });
    }
  }
);

router.post(
  '/:id/promote',
  requireAdmin,
  adminSelfProtection,
  auditLogger({
    category: 'user_management',
    action: 'user.promote',
    resourceType: 'user',
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'admin') {
        return res.status(400).json({ error: 'User is already an admin' });
      }

      await userRepository.updateRole(user.id, 'admin');

      res.json({ message: 'User promoted to admin successfully' });
    } catch (error) {
      console.error('Error promoting user:', error);
      res.status(500).json({ error: 'Failed to promote user' });
    }
  }
);

router.post(
  '/:id/demote',
  requireAdmin,
  adminSelfProtection,
  auditLogger({
    category: 'user_management',
    action: 'user.demote',
    resourceType: 'user',
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role !== 'admin') {
        return res.status(400).json({ error: 'User is not an admin' });
      }

      const adminCountResult = await getPool().query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND deleted_at IS NULL"
      );
      
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        return res.status(400).json({ 
          error: 'Cannot demote the last admin user' 
        });
      }

      await userRepository.updateRole(user.id, 'user');

      res.json({ message: 'User demoted from admin successfully' });
    } catch (error) {
      console.error('Error demoting user:', error);
      res.status(500).json({ error: 'Failed to demote user' });
    }
  }
);

router.delete(
  '/:id',
  requireAdmin,
  adminSelfProtection,
  auditLogger({
    category: 'user_management',
    action: 'user.delete',
    resourceType: 'user',
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRepository.softDelete(user.id);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

router.post(
  '/:id/verify-email',
  requireAdmin,
  auditLogger({
    category: 'user_management',
    action: 'user.verify_email',
    resourceType: 'user',
  }),
  async (req: AdminRequest, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRepository.verifyEmail(user.id);

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }
);

export default router;
