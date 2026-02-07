/**
 * Queue Tests for ScraperX
 *
 * Tests for BullMQ queue management, job processing, and queue operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BullMQ inline
vi.mock('bullmq', () => {
  const mockQueue = {
    name: '',
    add: vi.fn().mockResolvedValue({ id: 'test-job-id', data: {} }),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue(['job1', 'job2']),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn().mockResolvedValue(null),
    getWaitingCount: vi.fn().mockResolvedValue(5),
    getActiveCount: vi.fn().mockResolvedValue(2),
    getCompletedCount: vi.fn().mockResolvedValue(100),
    getFailedCount: vi.fn().mockResolvedValue(3),
    getDelayedCount: vi.fn().mockResolvedValue(1),
    getPausedCount: vi.fn().mockResolvedValue(0),
    on: vi.fn(),
  };

  return {
    Queue: vi.fn().mockImplementation((name) => ({ ...mockQueue, name })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
    QueueEvents: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock Redis connection
vi.mock('../../../src/queue/redis.js', () => ({
  createBullMQConnection: vi.fn().mockReturnValue({
    host: 'localhost',
    port: 6379,
  }),
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
      prefix: 'scraperx',
      concurrency: 5,
    },
  },
}));

import type { QueueJobData, EngineType } from '../../../src/types/index.js';

describe('Queue System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to get fresh queue instances
    vi.resetModules();
  });

  describe('QUEUE_NAMES', () => {
    it('should have correct queue name prefixes', async () => {
      const { QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      expect(QUEUE_NAMES.HTTP).toContain('http');
      expect(QUEUE_NAMES.BROWSER).toContain('browser');
      expect(QUEUE_NAMES.STEALTH).toContain('stealth');
      expect(QUEUE_NAMES.WEBHOOK).toContain('webhook');
      expect(QUEUE_NAMES.CLEANUP).toContain('cleanup');
    });

    it('should have 5 queue types defined', async () => {
      const { QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      expect(Object.keys(QUEUE_NAMES)).toHaveLength(5);
    });
  });

  describe('getQueue', () => {
    it('should create and return a queue instance', async () => {
      const { getQueue } = await import('../../../src/queue/queues.js');
      const queue = getQueue('test-queue');
      
      expect(queue).toBeDefined();
      expect(queue.name).toBe('test-queue');
    });
  });

  describe('getQueueForEngine', () => {
    it('should return correct queue for each engine type', async () => {
      const { getQueueForEngine, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      const httpQueue = getQueueForEngine('http');
      expect(httpQueue.name).toBe(QUEUE_NAMES.HTTP);

      const browserQueue = getQueueForEngine('browser');
      expect(browserQueue.name).toBe(QUEUE_NAMES.BROWSER);

      const stealthQueue = getQueueForEngine('stealth');
      expect(stealthQueue.name).toBe(QUEUE_NAMES.STEALTH);
    });

    it('should default to HTTP queue for auto engine', async () => {
      const { getQueueForEngine, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      const queue = getQueueForEngine('auto');
      expect(queue.name).toBe(QUEUE_NAMES.HTTP);
    });
  });

  describe('getQueueNameForEngine', () => {
    it('should return correct queue names for each engine type', async () => {
      const { getQueueNameForEngine, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      expect(getQueueNameForEngine('http')).toBe(QUEUE_NAMES.HTTP);
      expect(getQueueNameForEngine('browser')).toBe(QUEUE_NAMES.BROWSER);
      expect(getQueueNameForEngine('stealth')).toBe(QUEUE_NAMES.STEALTH);
      expect(getQueueNameForEngine('auto')).toBe(QUEUE_NAMES.HTTP);
    });
  });

  describe('addScrapeJob', () => {
    const mockJobData: QueueJobData = {
      jobId: 'test-job-123',
      organizationId: 'org-123',
      url: 'https://example.com',
      method: 'GET',
      headers: {},
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

    it('should add a job to the appropriate queue', async () => {
      const { addScrapeJob } = await import('../../../src/queue/queues.js');
      const job = await addScrapeJob(mockJobData);
      
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });
  });

  describe('addWebhookJob', () => {
    it('should add a webhook job', async () => {
      const { addWebhookJob } = await import('../../../src/queue/queues.js');
      
      const job = await addWebhookJob(
        'job-123',
        'https://webhook.example.com',
        'secret123',
        { status: 'completed' }
      );

      expect(job).toBeDefined();
    });
  });

  describe('createWorker', () => {
    it('should create a worker for the specified queue', async () => {
      const { createWorker } = await import('../../../src/queue/queues.js');
      const processor = vi.fn().mockResolvedValue(undefined);
      
      const worker = createWorker('test-worker-queue', processor);

      expect(worker).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const { getQueueStats, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      const stats = await getQueueStats(QUEUE_NAMES.HTTP);

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      });
    });
  });

  describe('getAllQueueStats', () => {
    it('should return stats for all queues', async () => {
      const { getAllQueueStats } = await import('../../../src/queue/queues.js');
      
      const allStats = await getAllQueueStats();

      expect(allStats).toHaveProperty('http');
      expect(allStats).toHaveProperty('browser');
      expect(allStats).toHaveProperty('stealth');
      expect(allStats).toHaveProperty('webhook');
      expect(allStats).toHaveProperty('cleanup');
    });
  });

  describe('Queue Control Operations', () => {
    it('should pause the specified queue', async () => {
      const { pauseQueue, getQueue, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      await pauseQueue(QUEUE_NAMES.HTTP);
      
      const queue = getQueue(QUEUE_NAMES.HTTP);
      expect(queue.pause).toHaveBeenCalled();
    });

    it('should resume the specified queue', async () => {
      const { resumeQueue, getQueue, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      await resumeQueue(QUEUE_NAMES.HTTP);
      
      const queue = getQueue(QUEUE_NAMES.HTTP);
      expect(queue.resume).toHaveBeenCalled();
    });

    it('should drain the specified queue', async () => {
      const { drainQueue, getQueue, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      await drainQueue(QUEUE_NAMES.HTTP);
      
      const queue = getQueue(QUEUE_NAMES.HTTP);
      expect(queue.drain).toHaveBeenCalled();
    });

    it('should clean completed and failed jobs', async () => {
      const { cleanQueue, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
      
      const result = await cleanQueue(QUEUE_NAMES.HTTP);

      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('failed');
    });
  });

  describe('closeAllQueues', () => {
    it('should close all queue instances', async () => {
      const { closeAllQueues, getQueue } = await import('../../../src/queue/queues.js');
      
      // Create some queues first
      getQueue('close-test-1');
      getQueue('close-test-2');
      
      await closeAllQueues();
      
      // Should complete without error
    });
  });
});

describe('Queue Job Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should create queues with default options', async () => {
    const { getQueue, QUEUE_NAMES } = await import('../../../src/queue/queues.js');
    
    const httpQueue = getQueue(QUEUE_NAMES.HTTP);
    const browserQueue = getQueue(QUEUE_NAMES.BROWSER);
    const stealthQueue = getQueue(QUEUE_NAMES.STEALTH);
    const webhookQueue = getQueue(QUEUE_NAMES.WEBHOOK);

    expect(httpQueue).toBeDefined();
    expect(browserQueue).toBeDefined();
    expect(stealthQueue).toBeDefined();
    expect(webhookQueue).toBeDefined();
  });
});
