import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireApiKey, requireScope } from '../../middleware/apiKeyAuth.js';
import { scrapeJobRepository } from '../../../db/repositories/scrapeJob.repository.js';
import { accountRepository } from '../../../db/repositories/account.repository.js';
import { calculateCredits, determineEngine, mergeScrapeOptions } from '../../../utils/credits.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

const scrapeRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  engine: z.enum(['http', 'browser', 'stealth', 'auto']).optional(),
  options: z.object({
    renderJs: z.boolean().optional(),
    screenshot: z.boolean().optional(),
    pdf: z.boolean().optional(),
    premiumProxy: z.boolean().optional(),
    mobileProxy: z.boolean().optional(),
    proxy: z.boolean().optional(),
    proxyCountry: z.string().optional(),
    waitFor: z.string().optional(),
    timeout: z.number().optional(),
    cache: z.boolean().optional(),
    format: z.enum(['html', 'text', 'markdown', 'json']).optional(),
  }).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  clientReference: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// POST /api/v1/scrape
router.post('/scrape', requireApiKey, requireScope('scrape:write'), async (req: Request, res: Response) => {
  try {
    const validation = scrapeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: validation.error.errors },
      });
    }

    const body = validation.data;
    const account = req.apiKeyAccount!;
    const apiKey = req.apiKey!;

    // Determine engine and options
    const options = mergeScrapeOptions(body.options);
    const engine = (body.engine || determineEngine(options)) as any;
    const proxyTier: any = options.premiumProxy ? 'residential' : options.mobileProxy ? 'mobile' : 'datacenter';

    // Calculate credit cost
    const { total: creditsRequired, breakdown } = calculateCredits(engine, proxyTier, options);

    // Check sufficient credits
    if ((account.creditBalance ?? 0) < creditsRequired) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits',
          details: { required: creditsRequired, available: account.creditBalance ?? 0 },
        },
      });
    }

    // Check idempotency
    if (body.idempotencyKey) {
      const existing = await scrapeJobRepository.findByIdempotencyKey(account.id, body.idempotencyKey);
      if (existing) {
        return res.json({
          success: existing.status === 'completed',
          jobId: existing.id,
          url: existing.url,
          status: existing.status,
          cached: true,
          creditsUsed: existing.creditsCharged || 0,
        });
      }
    }

    // Create scrape job
    const job = await scrapeJobRepository.create({
      accountId: account.id,
      apiKeyId: apiKey.id,
      url: body.url,
      method: body.method,
      headers: body.headers,
      body: body.body,
      engine,
      options,
      proxyTier,
      proxyCountry: body.options?.proxyCountry,
      creditsEstimated: creditsRequired,
      creditBreakdown: breakdown,
      webhookUrl: body.webhookUrl,
      webhookSecret: body.webhookSecret,
      clientReference: body.clientReference,
      idempotencyKey: body.idempotencyKey,
    });

    logger.info({ jobId: job.id, url: body.url, accountId: account.id }, 'Scrape job created via API');

    return res.status(202).json({
      success: true,
      jobId: job.id,
      url: job.url,
      status: job.status,
      creditsEstimated: creditsRequired,
      message: 'Job queued for processing. Workers are disabled in dev mode - use /api/v1/jobs/:id to check status.',
    });
  } catch (error: any) {
    logger.error({ error, url: req.body?.url }, 'Scrape API error');
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// GET /api/v1/jobs/:id - Get job status
router.get('/jobs/:id', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = req.apiKeyAccount!;

    const job = await scrapeJobRepository.findById(id);
    if (!job || job.accountId !== account.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found' },
      });
    }

    return res.json({
      success: job.status === 'completed',
      jobId: job.id,
      url: job.url,
      status: job.status,
      creditsUsed: job.creditsCharged || 0,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error: any) {
    logger.error({ error }, 'Get job error');
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// GET /api/v1/account - Get account info via API key
router.get('/account', requireApiKey, async (req: Request, res: Response) => {
  const account = req.apiKeyAccount!;
  return res.json({
    id: account.id,
    plan: account.plan,
    creditBalance: account.creditBalance,
    status: account.status,
  });
});

export function createV1Routes() {
  return router;
}
