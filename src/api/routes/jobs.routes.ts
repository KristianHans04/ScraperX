import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { scrapeJobRepository } from '../../db/repositories/scrapeJob.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/jobs - List all jobs for authenticated account
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { limit = '20', page = '1' } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const offset = (pageNum - 1) * limitNum;

    const jobs = await scrapeJobRepository.findByAccount(accountId, { limit: limitNum, offset });

    res.json({
      jobs: jobs.map(job => ({
        id: job.id,
        url: job.url,
        engine: job.engine,
        status: job.status,
        creditsUsed: job.creditsCharged,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.errorMessage,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: jobs.length,
        totalPages: Math.ceil(jobs.length / limitNum),
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to list jobs');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/recent - Get recent jobs
router.get('/recent', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    const jobs = await scrapeJobRepository.findByAccount(accountId, { limit: 10 });

    res.json({
      jobs: jobs.map(job => ({
        id: job.id,
        url: job.url,
        engine: job.engine,
        status: job.status,
        creditsUsed: job.creditsCharged,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch recent jobs');
    res.status(500).json({ error: 'Failed to fetch recent jobs' });
  }
});

// GET /api/jobs/:id - Get specific job details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { id } = req.params;

    const job = await scrapeJobRepository.findById(id);

    if (!job || job.accountId !== accountId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      url: job.url,
      engine: job.engine,
      status: job.status,
      creditsUsed: job.creditsCharged,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      startedAt: job.startedAt,
      error: job.errorMessage,
      resultId: job.resultId,
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id, jobId: req.params.id }, 'Failed to fetch job');
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// DELETE /api/jobs/:id - Cancel a job
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { id } = req.params;

    const job = await scrapeJobRepository.findById(id);

    if (!job || job.accountId !== accountId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
    }

    await scrapeJobRepository.update(id, { status: 'failed', errorMessage: 'Cancelled by user' });

    logger.info({ accountId, jobId: id }, 'Job cancelled');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id, jobId: req.params.id }, 'Failed to cancel job');
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export function createJobsRoutes() {
  return router;
}
