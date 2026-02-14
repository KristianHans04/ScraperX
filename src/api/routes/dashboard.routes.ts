import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { scrapeJobRepository } from '../../db/repositories/scrapeJob.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/dashboard - Get dashboard stats
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    const account = await accountRepository.findById(accountId);

    const jobs = await scrapeJobRepository.findByAccount(accountId, { limit: 1000 });

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending' || j.status === 'queued').length;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(1) : '0';
    const creditsUsed = jobs.reduce((sum, j) => sum + (j.creditsCharged || 0), 0);

    res.json({
      stats: {
        totalJobs,
        completedJobs,
        failedJobs,
        runningJobs,
        successRate,
        creditsUsed,
        creditsRemaining: account?.creditBalance || 0,
      },
      account: {
        plan: account?.plan,
        status: account?.status,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch dashboard');
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export function createDashboardRoutes() {
  return router;
}
