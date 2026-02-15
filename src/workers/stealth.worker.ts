import { Job, Worker } from 'bullmq';
import { QUEUE_NAMES, createWorker } from '../queue/queues.js';
import { scrapeJobRepository, jobResultRepository, accountRepository } from '../db/index.js';
import { getStealthEngine } from '../engines/stealth/index.js';
import { generateFingerprint } from '../fingerprint/generator.js';
import { getProxyManager } from '../proxy/index.js';
import { hashContent } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { QueueJobData, JobStatus, ProxyConfig, BrowserFingerprint } from '../types/index.js';

/**
 * Stealth Worker - processes stealth/anti-detection scraping jobs
 */
export class StealthWorker {
  private worker: Worker<QueueJobData> | null = null;
  private workerId: string;
  private engine = getStealthEngine();
  private proxyManager = getProxyManager();

  constructor() {
    this.workerId = `stealth-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Start the stealth worker
   */
  start(): void {
    this.worker = createWorker<QueueJobData>(
      QUEUE_NAMES.STEALTH,
      this.processJob.bind(this),
      {
        concurrency: Math.max(1, Math.floor(config.queue.concurrency / 4)), // Stealth jobs are heaviest
      }
    );

    logger.info({ workerId: this.workerId }, 'Stealth worker started');
  }

  /**
   * Process a stealth scrape job
   */
  private async processJob(job: Job<QueueJobData>): Promise<void> {
    const { jobId, accountId, url, method, headers, body, options, proxyConfig, fingerprint, attempt, maxAttempts } = job.data;

    logger.info({ jobId, url, attempt }, 'Processing stealth job');

    // Check if stealth engine is available
    const isAvailable = await this.engine.isAvailable();
    if (!isAvailable) {
      logger.error({ jobId }, 'Stealth engine not available');
      await this.handleJobFailure(job, 'STEALTH_UNAVAILABLE', 'Stealth engine service is not available');
      return;
    }

    try {
      // Update job status to running
      await scrapeJobRepository.updateStatus(jobId, 'running', {
        startedAt: new Date(),
        workerId: this.workerId,
        attempts: attempt,
      });

      // Get or generate fingerprint
      const fp: BrowserFingerprint = fingerprint || generateFingerprint({
        platform: options.mobileProxy ? 'android' : 'windows',
        country: options.country,
        mobile: options.mobileProxy,
      });

      // Get proxy - stealth typically uses premium proxies
      let proxy: ProxyConfig | undefined = proxyConfig;
      if (!proxy) {
        const tier = options.mobileProxy ? 'mobile' : 'residential';
        proxy = await this.proxyManager.getProxy({
          tier,
          country: options.country,
          sessionId: options.sessionId,
        }) || undefined;
      }

      // Execute the stealth request
      const result = await this.engine.execute({
        url,
        method,
        headers,
        body,
        options,
        proxyConfig: proxy,
        fingerprint: fp,
      });

      if (result.success) {
        // Store result
        const jobResult = await jobResultRepository.create({
          jobId,
          accountId,
          statusCode: result.statusCode,
          headers: result.headers,
          cookies: result.cookies,
          contentType: result.headers?.['content-type'],
          contentLength: result.content?.length,
          finalUrl: result.finalUrl,
          redirectCount: 0,
          contentStorageType: 'inline',
          contentInline: result.content,
          contentHash: result.content ? hashContent(result.content) : undefined,
          extractedData: result.extracted,
          totalTimeMs: result.timing?.totalMs,
          screenshotFormat: result.screenshot ? 'png' : undefined,
          proxyIp: proxy?.host,
          proxyCountry: proxy?.country,
          proxyProvider: proxy?.provider,
        });

        // Get credit breakdown from job - stealth costs more
        const jobData = await scrapeJobRepository.findById(jobId);
        const creditsToCharge = jobData?.creditsEstimated ?? 10;

        // Deduct credits
        await accountRepository.deductCredits(accountId, creditsToCharge);

        // Update job status to completed
        await scrapeJobRepository.updateStatus(jobId, 'completed', {
          completedAt: new Date(),
          resultId: jobResult.id,
          creditsCharged: creditsToCharge,
        });

        logger.info({ 
          jobId, 
          statusCode: result.statusCode, 
          totalTimeMs: result.timing?.totalMs,
          usedProxy: !!proxy,
          fingerprintId: fp.id,
        }, 'Stealth job completed');

      } else {
        // Handle failure
        await this.handleJobFailure(
          job, 
          result.error?.code ?? 'STEALTH_ERROR', 
          result.error?.message ?? 'Stealth scrape failed'
        );
      }

    } catch (error) {
      logger.error({ error, jobId }, 'Stealth job processing error');
      await this.handleJobFailure(
        job,
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown processing error'
      );
      throw error;
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(
    job: Job<QueueJobData>,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const { jobId, attempt, maxAttempts } = job.data;

    const status: JobStatus = attempt >= maxAttempts ? 'failed' : 'pending';

    await scrapeJobRepository.updateStatus(jobId, status, {
      errorCode,
      errorMessage,
      attempts: attempt,
    });

    if (status === 'failed') {
      logger.warn({ jobId, errorCode, errorMessage, attempts: attempt }, 'Stealth job failed permanently');
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info({ workerId: this.workerId }, 'Stealth worker stopped');
    }
  }
}

// Factory function
export function createStealthWorker(): StealthWorker {
  return new StealthWorker();
}
