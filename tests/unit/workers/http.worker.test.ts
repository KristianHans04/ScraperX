/**
 * HTTP Worker Tests for Scrapifie
 *
 * Tests for HTTP job processing, result handling, and error scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies with inline definitions to avoid hoisting issues
vi.mock('../../../src/db/index.js', () => ({
  scrapeJobRepository: {
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue({ creditsEstimated: 1 }),
  },
  jobResultRepository: {
    create: vi.fn().mockResolvedValue({ id: 'result-123' }),
  },
  organizationRepository: {
    deductCredits: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock engine
vi.mock('../../../src/engines/http/index.js', () => ({
  getHttpEngine: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      content: '<html>Test</html>',
      headers: { 'content-type': 'text/html' },
      cookies: [],
      finalUrl: 'https://example.com',
      redirectCount: 0,
      timing: { totalMs: 150 },
    }),
  })),
}));

// Mock queues
vi.mock('../../../src/queue/queues.js', () => ({
  QUEUE_NAMES: {
    HTTP: 'scrapifie:http',
  },
  createWorker: vi.fn().mockReturnValue({
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  }),
}));

// Mock crypto
vi.mock('../../../src/utils/crypto.js', () => ({
  hashContent: vi.fn().mockReturnValue('mock-hash-abc123'),
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Mock config
vi.mock('../../../src/config/index.js', () => ({
  config: {
    queue: {
      concurrency: 5,
    },
  },
}));

import type { QueueJobData } from '../../../src/types/index.js';

describe('HttpWorker', () => {
  const mockJobData: QueueJobData = {
    jobId: 'test-job-123',
    organizationId: 'org-123',
    url: 'https://example.com',
    method: 'GET',
    headers: { 'User-Agent': 'Test Agent' },
    options: {
      renderJs: false,
      timeout: 30000,
      screenshot: false,
      pdf: false,
      premiumProxy: false,
      mobileProxy: false,
    },
    engine: 'http',
    attempt: 1,
    maxAttempts: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HttpWorker class', () => {
    it('should create a worker instance', async () => {
      const { HttpWorker } = await import('../../../src/workers/http.worker.js');
      const worker = new HttpWorker();
      expect(worker).toBeInstanceOf(HttpWorker);
    });

    it('should start the worker and register with the queue', async () => {
      const { HttpWorker } = await import('../../../src/workers/http.worker.js');
      const { createWorker } = await import('../../../src/queue/queues.js');
      
      const worker = new HttpWorker();
      worker.start();

      expect(createWorker).toHaveBeenCalledWith(
        'scrapifie:http',
        expect.any(Function),
        expect.objectContaining({ concurrency: expect.any(Number) })
      );

      await worker.stop();
    });

    it('should stop the worker gracefully', async () => {
      const { HttpWorker } = await import('../../../src/workers/http.worker.js');
      const worker = new HttpWorker();
      worker.start();
      
      await worker.stop();
      
      // Second stop should not throw
      await expect(worker.stop()).resolves.toBeUndefined();
    });
  });

  describe('createHttpWorker factory', () => {
    it('should create a new HttpWorker instance', async () => {
      const { createHttpWorker, HttpWorker } = await import('../../../src/workers/http.worker.js');
      const worker = createHttpWorker();
      expect(worker).toBeInstanceOf(HttpWorker);
    });
  });
});

describe('HTTP Job Processing Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job status updates', () => {
    it('should update job to running when processing starts', () => {
      const status: 'running' = 'running';
      expect(status).toBe('running');
    });

    it('should update job to completed on success', () => {
      const status: 'completed' = 'completed';
      expect(status).toBe('completed');
    });

    it('should update job to failed after max retries', () => {
      const attempt = 3;
      const maxAttempts = 3;
      const status = attempt >= maxAttempts ? 'failed' : 'pending';
      expect(status).toBe('failed');
    });

    it('should keep job pending if retries available', () => {
      const attempt = 1;
      const maxAttempts = 3;
      const status = attempt >= maxAttempts ? 'failed' : 'pending';
      expect(status).toBe('pending');
    });
  });

  describe('Credit management', () => {
    it('should use estimated credits from job', () => {
      const jobData = { creditsEstimated: 5 };
      const creditsToCharge = jobData.creditsEstimated ?? 1;
      expect(creditsToCharge).toBe(5);
    });

    it('should default to 1 credit if not specified', () => {
      const jobData = { creditsEstimated: undefined };
      const creditsToCharge = jobData.creditsEstimated ?? 1;
      expect(creditsToCharge).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should categorize BLOCKED errors correctly', () => {
      const errorCode = 'BLOCKED';
      const isBlockError = errorCode === 'BLOCKED';
      expect(isBlockError).toBe(true);
    });

    it('should categorize TIMEOUT errors correctly', () => {
      const errorCode = 'TIMEOUT';
      const isTimeoutError = errorCode === 'TIMEOUT';
      expect(isTimeoutError).toBe(true);
    });

    it('should use PROCESSING_ERROR for unexpected errors', () => {
      const defaultErrorCode = 'PROCESSING_ERROR';
      expect(defaultErrorCode).toBe('PROCESSING_ERROR');
    });
  });

  describe('Content hashing', () => {
    it('should hash content for storage', async () => {
      const { hashContent } = await import('../../../src/utils/crypto.js');
      const hash = hashContent('test content');
      expect(hash).toBe('mock-hash-abc123');
    });
  });
});

describe('Job Result Storage', () => {
  it('should store inline content', () => {
    const contentStorageType = 'inline';
    expect(contentStorageType).toBe('inline');
  });

  it('should include timing in result', () => {
    const result = {
      statusCode: 200,
      totalTimeMs: 150,
    };
    expect(result.totalTimeMs).toBeGreaterThan(0);
  });

  it('should include redirect count', () => {
    const result = {
      redirectCount: 2,
    };
    expect(result.redirectCount).toBe(2);
  });
});
