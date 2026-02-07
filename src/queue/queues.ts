import { Queue, Worker, Job, QueueEvents, JobsOptions, WorkerOptions } from 'bullmq';
import { createBullMQConnection } from './redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { QueueJobData, EngineType } from '../types/index.js';

// Queue names
export const QUEUE_NAMES = {
  HTTP: `${config.queue.prefix}:http`,
  BROWSER: `${config.queue.prefix}:browser`,
  STEALTH: `${config.queue.prefix}:stealth`,
  WEBHOOK: `${config.queue.prefix}:webhook`,
  CLEANUP: `${config.queue.prefix}:cleanup`,
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Queue instances
const queues: Map<string, Queue> = new Map();
const queueEvents: Map<string, QueueEvents> = new Map();

// Default job options by queue type
const DEFAULT_JOB_OPTIONS: Record<string, JobsOptions> = {
  http: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // 24 hours
      count: 5000,
    },
  },
  browser: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 500,
    },
    removeOnFail: {
      age: 86400,
      count: 2500,
    },
  },
  stealth: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 3600,
      count: 250,
    },
    removeOnFail: {
      age: 86400,
      count: 1000,
    },
  },
  webhook: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 10000,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 10000,
    },
  },
  cleanup: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 86400,
    },
  },
};

/**
 * Create or get a queue instance
 */
export function getQueue(queueName: string): Queue {
  if (!queues.has(queueName)) {
    const connection = createBullMQConnection();
    const queue = new Queue(queueName, {
      connection,
      defaultJobOptions: getDefaultJobOptions(queueName),
    });

    queue.on('error', (err) => {
      logger.error({ err, queue: queueName }, 'Queue error');
    });

    queues.set(queueName, queue);
    logger.info({ queue: queueName }, 'Queue created');
  }

  return queues.get(queueName)!;
}

/**
 * Get default job options for a queue
 */
function getDefaultJobOptions(queueName: string): JobsOptions {
  if (queueName.includes('http')) return DEFAULT_JOB_OPTIONS.http;
  if (queueName.includes('browser')) return DEFAULT_JOB_OPTIONS.browser;
  if (queueName.includes('stealth')) return DEFAULT_JOB_OPTIONS.stealth;
  if (queueName.includes('webhook')) return DEFAULT_JOB_OPTIONS.webhook;
  if (queueName.includes('cleanup')) return DEFAULT_JOB_OPTIONS.cleanup;
  return DEFAULT_JOB_OPTIONS.http;
}

/**
 * Get queue events instance for a queue
 */
export function getQueueEvents(queueName: string): QueueEvents {
  if (!queueEvents.has(queueName)) {
    const connection = createBullMQConnection();
    const events = new QueueEvents(queueName, { connection });

    events.on('error', (err) => {
      logger.error({ err, queue: queueName }, 'QueueEvents error');
    });

    queueEvents.set(queueName, events);
  }

  return queueEvents.get(queueName)!;
}

/**
 * Get the appropriate queue for an engine type
 */
export function getQueueForEngine(engine: EngineType): Queue {
  switch (engine) {
    case 'http':
      return getQueue(QUEUE_NAMES.HTTP);
    case 'browser':
      return getQueue(QUEUE_NAMES.BROWSER);
    case 'stealth':
      return getQueue(QUEUE_NAMES.STEALTH);
    case 'auto':
    default:
      return getQueue(QUEUE_NAMES.HTTP);
  }
}

/**
 * Get queue name for engine type
 */
export function getQueueNameForEngine(engine: EngineType): QueueName {
  switch (engine) {
    case 'http':
      return QUEUE_NAMES.HTTP;
    case 'browser':
      return QUEUE_NAMES.BROWSER;
    case 'stealth':
      return QUEUE_NAMES.STEALTH;
    case 'auto':
    default:
      return QUEUE_NAMES.HTTP;
  }
}

/**
 * Add a scrape job to the appropriate queue
 */
export async function addScrapeJob(
  jobData: QueueJobData,
  options?: JobsOptions
): Promise<Job<QueueJobData>> {
  const queue = getQueueForEngine(jobData.engine);
  
  const jobOptions: JobsOptions = {
    ...options,
    priority: 10 - (jobData.attempt || 1), // Higher priority for retries
    jobId: jobData.jobId,
  };

  const job = await queue.add(jobData.jobId, jobData, jobOptions);
  
  logger.debug({
    jobId: jobData.jobId,
    queue: queue.name,
    engine: jobData.engine,
  }, 'Job added to queue');

  return job;
}

/**
 * Add a webhook delivery job
 */
export async function addWebhookJob(
  jobId: string,
  webhookUrl: string,
  webhookSecret: string | undefined,
  payload: Record<string, unknown>
): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.WEBHOOK);
  
  return queue.add(
    `webhook:${jobId}`,
    {
      jobId,
      webhookUrl,
      webhookSecret,
      payload,
      attempt: 1,
    },
    {
      jobId: `webhook:${jobId}`,
    }
  );
}

/**
 * Create a worker for processing jobs
 */
export function createWorker<T = QueueJobData>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  const connection = createBullMQConnection();
  
  const worker = new Worker<T>(
    queueName,
    processor,
    {
      connection,
      concurrency: config.queue.concurrency,
      ...options,
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, queue: queueName }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: queueName, err }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err, queue: queueName }, 'Worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId, queue: queueName }, 'Job stalled');
  });

  logger.info({ queue: queueName, concurrency: config.queue.concurrency }, 'Worker created');

  return worker;
}

/**
 * Get job by ID from any queue
 */
export async function getJobById(jobId: string): Promise<Job | null> {
  for (const queueName of Object.values(QUEUE_NAMES)) {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) return job;
  }
  return null;
}

/**
 * Wait for a job to complete
 */
export async function waitForJob(
  jobId: string,
  queueName: string,
  timeoutMs: number = 30000
): Promise<{ completed: boolean; result?: unknown; error?: string }> {
  const events = getQueueEvents(queueName);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ completed: false, error: 'Timeout waiting for job' });
    }, timeoutMs);

    const completedHandler = ({ jobId: completedJobId, returnvalue }: { jobId: string; returnvalue: string }) => {
      if (completedJobId === jobId) {
        clearTimeout(timeout);
        events.off('completed', completedHandler);
        events.off('failed', failedHandler);
        resolve({ completed: true, result: JSON.parse(returnvalue) });
      }
    };

    const failedHandler = ({ jobId: failedJobId, failedReason }: { jobId: string; failedReason: string }) => {
      if (failedJobId === jobId) {
        clearTimeout(timeout);
        events.off('completed', completedHandler);
        events.off('failed', failedHandler);
        resolve({ completed: false, error: failedReason });
      }
    };

    events.on('completed', completedHandler);
    events.on('failed', failedHandler);
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = getQueue(queueName);
  
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, paused };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats(): Promise<Record<string, Awaited<ReturnType<typeof getQueueStats>>>> {
  const stats: Record<string, Awaited<ReturnType<typeof getQueueStats>>> = {};
  
  for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
    stats[name.toLowerCase()] = await getQueueStats(queueName);
  }
  
  return stats;
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
  logger.info({ queue: queueName }, 'Queue paused');
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
  logger.info({ queue: queueName }, 'Queue resumed');
}

/**
 * Drain a queue (remove all waiting jobs)
 */
export async function drainQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.drain();
  logger.info({ queue: queueName }, 'Queue drained');
}

/**
 * Clean completed and failed jobs
 */
export async function cleanQueue(
  queueName: string,
  gracePeriodMs: number = 3600000,
  limit: number = 1000
): Promise<{ completed: number; failed: number }> {
  const queue = getQueue(queueName);
  
  const [completedJobs, failedJobs] = await Promise.all([
    queue.clean(gracePeriodMs, limit, 'completed'),
    queue.clean(gracePeriodMs, limit, 'failed'),
  ]);

  const result = {
    completed: completedJobs.length,
    failed: failedJobs.length,
  };

  logger.info({ queue: queueName, ...result }, 'Queue cleaned');
  return result;
}

/**
 * Close all queues and queue events
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const [name, queue] of queues.entries()) {
    closePromises.push(
      queue.close().then(() => {
        logger.debug({ queue: name }, 'Queue closed');
      })
    );
  }

  for (const [name, events] of queueEvents.entries()) {
    closePromises.push(
      events.close().then(() => {
        logger.debug({ queue: name }, 'QueueEvents closed');
      })
    );
  }

  await Promise.all(closePromises);
  
  queues.clear();
  queueEvents.clear();
  
  logger.info('All queues closed');
}

export { Queue, Worker, Job, QueueEvents, JobsOptions, WorkerOptions };
