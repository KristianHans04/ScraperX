import { Job, Worker } from 'bullmq';
import { QUEUE_NAMES, createWorker } from '../queue/queues.js';
import { scrapeJobRepository, jobResultRepository, organizationRepository } from '../db/index.js';
import { getBrowserEngine } from '../engines/browser/index.js';
import { generateFingerprint } from '../fingerprint/generator.js';
import { getProxyManager } from '../proxy/index.js';
import { hashContent } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { QueueJobData, JobStatus, ProxyConfig, BrowserFingerprint } from '../types/index.js';

/**
 * Browser Worker - processes browser-based scraping jobs
 */
export class BrowserWorker {
  private worker: Worker<QueueJobData> | null = null;
  private workerId: string;
  private engine = getBrowserEngine();
  private proxyManager = getProxyManager();

  constructor() {
    this.workerId = `browser-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Start the browser worker
   */
  start(): void {
    this.worker = createWorker<QueueJobData>(
      QUEUE_NAMES.BROWSER,
      this.processJob.bind(this),
      {
        concurrency: Math.max(1, Math.floor(config.queue.concurrency / 2)), // Browser jobs are heavier
      }
    );

    logger.info({ workerId: this.workerId }, 'Browser worker started');
  }

  /**
   * Process a browser scrape job
   */
  private async processJob(job: Job<QueueJobData>): Promise<void> {
    const { jobId, organizationId, url, method, headers, body, options, proxyConfig, fingerprint, attempt, maxAttempts } = job.data;

    logger.info({ jobId, url, attempt }, 'Processing browser job');

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

      // Get proxy if needed
      let proxy: ProxyConfig | undefined = proxyConfig;
      if (!proxy && options.premiumProxy) {
        proxy = await this.proxyManager.getProxy({
          tier: 'residential',
          country: options.country,
          sessionId: options.sessionId,
        }) || undefined;
      }

      // Execute the browser request
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
          organizationId,
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
          // Screenshot would go to MinIO in production
          screenshotFormat: result.screenshot ? 'png' : undefined,
        });

        // Get credit breakdown from job
        const jobData = await scrapeJobRepository.findById(jobId);
        const creditsToCharge = jobData?.creditsEstimated ?? 5;

        // Deduct credits
        await organizationRepository.deductCredits(organizationId, creditsToCharge);

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
          hasScreenshot: !!result.screenshot,
        }, 'Browser job completed');

      } else {
        // Handle failure
        await this.handleJobFailure(job, result.error?.code ?? 'UNKNOWN_ERROR', result.error?.message ?? 'Unknown error');
      }

    } catch (error) {
      logger.error({ error, jobId }, 'Browser job processing error');
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
      logger.warn({ jobId, errorCode, errorMessage, attempts: attempt }, 'Browser job failed permanently');
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info({ workerId: this.workerId }, 'Browser worker stopped');
    }
  }
}

// Factory function
export function createBrowserWorker(): BrowserWorker {
  return new BrowserWorker();
}
