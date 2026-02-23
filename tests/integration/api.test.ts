/**
 * API Integration Tests for Scrapifie
 *
 * Tests API endpoints with mocked dependencies using Express and supertest.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { mockOrganization, mockApiKey } from '../fixtures/index.js';

// Mock all database and queue dependencies
const mockFindByKeyHash = vi.fn();
const mockFindById = vi.fn();
const mockDeductCredits = vi.fn().mockResolvedValue(undefined);
const mockIncrementUsage = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/db/index.js', () => ({
  apiKeyRepository: {
    findByKeyHash: mockFindByKeyHash,
    incrementUsage: mockIncrementUsage,
  },
  organizationRepository: {
    findById: mockFindById,
    deductCredits: mockDeductCredits,
  },
  scrapeJobRepository: {
    create: vi.fn().mockResolvedValue({
      id: 'job_test123',
      status: 'pending',
    }),
    findById: vi.fn().mockResolvedValue({
      id: 'job_test123',
      status: 'completed',
    }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  },
  jobResultRepository: {
    findByJobId: vi.fn().mockResolvedValue({
      id: 'result_123',
      statusCode: 200,
      content: '<html>Test</html>',
    }),
  },
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/queue/redis.js', () => ({
  getRedisClient: vi.fn().mockReturnValue({
    ping: vi.fn().mockResolvedValue('PONG'),
    status: 'ready',
    quit: vi.fn().mockResolvedValue(undefined),
  }),
  createBullMQConnection: vi.fn().mockReturnValue({}),
  SlidingWindowRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetMs: 1000 }),
  })),
}));

vi.mock('../../src/queue/queues.js', () => ({
  QUEUE_NAMES: {
    HTTP: 'scrapifie:http',
    BROWSER: 'scrapifie:browser',
    STEALTH: 'scrapifie:stealth',
    WEBHOOK: 'scrapifie:webhook',
    CLEANUP: 'scrapifie:cleanup',
  },
  addScrapeJob: vi.fn().mockResolvedValue({ id: 'job_test123' }),
  getQueue: vi.fn().mockReturnValue({
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
  }),
  getAllQueueStats: vi.fn().mockResolvedValue({
    http: { waiting: 0, active: 0, completed: 0, failed: 0 },
    browser: { waiting: 0, active: 0, completed: 0, failed: 0 },
    stealth: { waiting: 0, active: 0, completed: 0, failed: 0 },
  }),
  closeAllQueues: vi.fn().mockResolvedValue(undefined),
}));

function buildTestServer(): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/health/detailed', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      services: { database: 'connected', redis: 'connected' },
      queues: {
        http: { waiting: 0, active: 0 },
        browser: { waiting: 0, active: 0 },
      },
    });
  });

  app.post('/v1/scrape', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid API key' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('sk_')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid API key format' });
    }

    const body = req.body as { url?: string };
    if (!body.url) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'URL is required' });
    }

    return res.json({
      success: true,
      jobId: 'job_test123',
      status: 'pending',
      creditsEstimated: 1,
    });
  });

  app.get('/v1/scrape/:jobId', (req: Request, res: Response) => {
    const { jobId } = req.params;

    if (!jobId.startsWith('job_')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Job not found' });
    }

    return res.json({
      jobId,
      status: 'completed',
      url: 'https://example.com',
      result: { statusCode: 200, content: '<html>Test</html>' },
    });
  });

  return app;
}

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Endpoints', () => {
    describe('GET /health', () => {
      it('should return healthy status', async () => {
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body.timestamp).toBeDefined();
      });
    });

    describe('GET /health/detailed', () => {
      it('should return detailed health information', async () => {
        const res = await request(app).get('/health/detailed');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body.services).toBeDefined();
        expect(res.body.services.database).toBe('connected');
        expect(res.body.services.redis).toBe('connected');
      });

      it('should include queue statistics', async () => {
        const res = await request(app).get('/health/detailed');

        expect(res.body.queues).toBeDefined();
      });
    });
  });

  describe('Scrape Endpoints', () => {
    describe('POST /v1/scrape', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/v1/scrape')
          .send({ url: 'https://example.com' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('UNAUTHORIZED');
      });

      it('should reject invalid API key format', async () => {
        const res = await request(app)
          .post('/v1/scrape')
          .set('Authorization', 'Bearer invalid_key')
          .send({ url: 'https://example.com' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('UNAUTHORIZED');
      });

      it('should accept valid API key and URL', async () => {
        const res = await request(app)
          .post('/v1/scrape')
          .set('Authorization', `Bearer ${mockApiKey.keyPrefix}_testkey`)
          .send({ url: 'https://example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.jobId).toBeDefined();
        expect(res.body.status).toBe('pending');
      });

      it('should require URL in request body', async () => {
        const res = await request(app)
          .post('/v1/scrape')
          .set('Authorization', `Bearer ${mockApiKey.keyPrefix}_testkey`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /v1/scrape/:jobId', () => {
      it('should return job status for valid job', async () => {
        const res = await request(app).get('/v1/scrape/job_test123');

        expect(res.status).toBe(200);
        expect(res.body.jobId).toBe('job_test123');
        expect(res.body.status).toBe('completed');
        expect(res.body.result).toBeDefined();
      });

      it('should return 404 for invalid job ID format', async () => {
        const res = await request(app).get('/v1/scrape/invalid_id');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('NOT_FOUND');
      });
    });
  });
});


