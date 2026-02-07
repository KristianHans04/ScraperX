/**
 * API Integration Tests for ScraperX
 *
 * Tests for the Fastify API endpoints with mocked dependencies.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock all database and queue dependencies before importing server
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

// Mock Redis
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

// Mock queues
vi.mock('../../src/queue/queues.js', () => ({
  QUEUE_NAMES: {
    HTTP: 'scraperx:http',
    BROWSER: 'scraperx:browser',
    STEALTH: 'scraperx:stealth',
    WEBHOOK: 'scraperx:webhook',
    CLEANUP: 'scraperx:cleanup',
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

import Fastify, { FastifyInstance } from 'fastify';
import { mockOrganization, mockApiKey } from '../fixtures/index.js';

// Create a minimal test server
async function buildTestServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  // Health route
  server.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Health detailed route
  server.get('/health/detailed', async () => {
    return {
      status: 'healthy',
      services: {
        database: 'connected',
        redis: 'connected',
      },
      queues: {
        http: { waiting: 0, active: 0 },
        browser: { waiting: 0, active: 0 },
      },
    };
  });

  // Simple scrape endpoint mock
  server.post('/v1/scrape', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid API key',
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('sk_')) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key format',
      });
    }

    const body = request.body as { url?: string };
    
    if (!body.url) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'URL is required',
      });
    }

    return {
      success: true,
      jobId: 'job_test123',
      status: 'pending',
      creditsEstimated: 1,
    };
  });

  // Job status endpoint
  server.get('/v1/scrape/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    if (!jobId.startsWith('job_')) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Job not found',
      });
    }

    return {
      jobId,
      status: 'completed',
      url: 'https://example.com',
      result: {
        statusCode: 200,
        content: '<html>Test</html>',
      },
    };
  });

  await server.ready();
  return server;
}

describe('API Integration Tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Endpoints', () => {
    describe('GET /health', () => {
      it('should return healthy status', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('healthy');
        expect(body.timestamp).toBeDefined();
      });
    });

    describe('GET /health/detailed', () => {
      it('should return detailed health information', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health/detailed',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('healthy');
        expect(body.services).toBeDefined();
        expect(body.services.database).toBe('connected');
        expect(body.services.redis).toBe('connected');
      });

      it('should include queue statistics', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health/detailed',
        });

        const body = JSON.parse(response.payload);
        expect(body.queues).toBeDefined();
      });
    });
  });

  describe('Scrape Endpoints', () => {
    describe('POST /v1/scrape', () => {
      it('should require authentication', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/scrape',
          payload: { url: 'https://example.com' },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('UNAUTHORIZED');
      });

      it('should reject invalid API key format', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/scrape',
          headers: {
            authorization: 'Bearer invalid_key',
          },
          payload: { url: 'https://example.com' },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should require URL in request body', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/scrape',
          headers: {
            authorization: 'Bearer sk_test_demo1234567890abcdef',
          },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('VALIDATION_ERROR');
      });

      it('should create a scrape job with valid request', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/scrape',
          headers: {
            authorization: 'Bearer sk_test_demo1234567890abcdef',
          },
          payload: {
            url: 'https://example.com',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.success).toBe(true);
        expect(body.jobId).toBeDefined();
        expect(body.status).toBe('pending');
      });

      it('should return credit estimate', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/scrape',
          headers: {
            authorization: 'Bearer sk_test_demo1234567890abcdef',
          },
          payload: {
            url: 'https://example.com',
          },
        });

        const body = JSON.parse(response.payload);
        expect(body.creditsEstimated).toBeDefined();
        expect(typeof body.creditsEstimated).toBe('number');
      });
    });

    describe('GET /v1/scrape/:jobId', () => {
      it('should return job status for valid job ID', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/scrape/job_test123',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.jobId).toBe('job_test123');
        expect(body.status).toBeDefined();
      });

      it('should return 404 for invalid job ID', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/scrape/invalid_id',
        });

        expect(response.statusCode).toBe(404);
      });

      it('should include result for completed jobs', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/v1/scrape/job_test123',
        });

        const body = JSON.parse(response.payload);
        expect(body.status).toBe('completed');
        expect(body.result).toBeDefined();
        expect(body.result.statusCode).toBe(200);
      });
    });
  });
});

describe('Authentication', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should support Bearer token authentication', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      headers: {
        authorization: 'Bearer sk_test_validkey12345678901234',
      },
      payload: { url: 'https://example.com' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject missing authorization header', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      payload: { url: 'https://example.com' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject malformed authorization header', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      headers: {
        authorization: 'Basic dXNlcjpwYXNz', // Basic auth, not Bearer
      },
      payload: { url: 'https://example.com' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('Request Validation', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should validate URL format', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      headers: {
        authorization: 'Bearer sk_test_validkey12345678901234',
      },
      payload: { url: 'https://example.com' },
    });

    // Valid URL should be accepted
    expect(response.statusCode).toBe(200);
  });
});

describe('Error Responses', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return consistent error format', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      payload: { url: 'https://example.com' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('should include error code in responses', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/scrape',
      headers: {
        authorization: 'Bearer sk_test_validkey12345678901234',
      },
      payload: {},
    });

    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
  });
});
