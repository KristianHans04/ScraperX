import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { scrapeJobRepository } from '../../db/repositories/scrapeJob.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/usage - Get usage stats for authenticated account
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
      default:
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
    }

    const jobs = await scrapeJobRepository.findByAccount(accountId, { limit: 10000 });

    // Filter jobs by date range
    const periodJobs = jobs.filter(job => new Date(job.createdAt) >= startDate);

    // Calculate stats
    const totalJobs = periodJobs.length;
    const completedJobs = periodJobs.filter(j => j.status === 'completed').length;
    const failedJobs = periodJobs.filter(j => j.status === 'failed').length;
    const totalCredits = periodJobs.reduce((sum, j) => sum + (j.creditsCharged || 0), 0);

    // Group by engine
    const byEngine: Record<string, number> = {};
    periodJobs.forEach(job => {
      byEngine[job.engine] = (byEngine[job.engine] || 0) + 1;
    });

    // Group by day
    const byDay: Record<string, number> = {};
    periodJobs.forEach(job => {
      const day = new Date(job.createdAt).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    res.json({
      period,
      startDate,
      endDate: now,
      stats: {
        totalJobs,
        completedJobs,
        failedJobs,
        totalCredits,
        successRate: totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(2) : '0',
      },
      byEngine,
      byDay,
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch usage stats');
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

export function createUsageRoutes() {
  return router;
}
