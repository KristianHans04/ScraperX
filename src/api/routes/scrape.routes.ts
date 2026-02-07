import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { scrapeRequestSchema, batchScrapeRequestSchema, jobIdParamSchema, paginationQuerySchema } from '../schemas/index.js';
import { scrapeJobRepository, jobResultRepository, organizationRepository } from '../../db/index.js';
import { addScrapeJob, getQueueNameForEngine } from '../../queue/queues.js';
import { calculateCredits, determineEngine, determineProxyTier, mergeScrapeOptions } from '../../utils/credits.js';
import { generateBatchId, hashUrl } from '../../utils/crypto.js';
import { JobNotFoundError, InvalidOptionsError, BatchTooLargeError, InsufficientCreditsError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { authMiddleware, requireScope } from '../middleware/auth.js';
import { rateLimitMiddleware, checkCreditsMiddleware } from '../middleware/rateLimit.js';
import type { ScrapeRequest, ScrapeOptions, EngineType, QueueJobData } from '../../types/index.js';

export const scrapeRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth to all routes in this plugin
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', rateLimitMiddleware);

  /**
   * POST /v1/scrape - Create a new scrape job
   */
  fastify.post('/scrape', {
    schema: {
      description: 'Create a new scrape job',
      tags: ['Scraping'],
      body: scrapeRequestSchema,
    },
    preHandler: [requireScope('scrape:write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = scrapeRequestSchema.parse(request.body);
    const organization = request.organization!;
    const apiKey = request.apiKey!;

    // Check for idempotency
    if (body.idempotencyKey) {
      const existingJob = await scrapeJobRepository.findByIdempotencyKey(
        organization.id,
        body.idempotencyKey
      );
      if (existingJob) {
        // Return existing job
        const result = existingJob.resultId 
          ? await jobResultRepository.findById(existingJob.resultId)
          : null;

        return reply.status(200).send({
          success: existingJob.status === 'completed',
          jobId: existingJob.id,
          url: existingJob.url,
          status: existingJob.status,
          cached: true,
          ...(result && {
            statusCode: result.statusCode,
            content: result.contentInline,
          }),
        });
      }
    }

    // Merge options with defaults
    const options = mergeScrapeOptions(body.options);
    
    // Determine engine and proxy tier
    const engine = determineEngine(options);
    const proxyTier = determineProxyTier(options);

    // Calculate credits
    const { total: creditsEstimated, breakdown: creditBreakdown } = calculateCredits(
      engine,
      proxyTier,
      options
    );

    // Attach estimated credits for middleware
    (request as FastifyRequest & { estimatedCredits: number }).estimatedCredits = creditsEstimated;
    
    // Check credits
    await checkCreditsMiddleware(request, reply);
    if (reply.sent) return;

    // Create the job in database
    const job = await scrapeJobRepository.create({
      organizationId: organization.id,
      apiKeyId: apiKey.id,
      url: body.url,
      method: body.method,
      headers: body.headers,
      body: body.body,
      engine,
      options,
      proxyTier,
      proxyCountry: options.country,
      creditsEstimated,
      creditBreakdown,
      webhookUrl: body.webhookUrl,
      webhookSecret: body.webhookSecret,
      clientReference: body.clientReference,
      idempotencyKey: body.idempotencyKey,
    });

    // Add to queue
    const queueJobData: QueueJobData = {
      jobId: job.id,
      organizationId: organization.id,
      url: body.url,
      method: body.method || 'GET',
      headers: body.headers || {},
      body: body.body,
      options,
      engine,
      attempt: 1,
      maxAttempts: 3,
    };

    await addScrapeJob(queueJobData);

    // Update job status to queued
    await scrapeJobRepository.updateStatus(job.id, 'queued', {
      queuedAt: new Date(),
      queueName: getQueueNameForEngine(engine),
    });

    logger.info(
      { jobId: job.id, url: body.url, engine, creditsEstimated },
      'Scrape job created'
    );

    return reply.status(202).send({
      success: true,
      jobId: job.id,
      url: body.url,
      status: 'queued',
      creditsEstimated,
      creditBreakdown,
    });
  });

  /**
   * POST /v1/scrape/batch - Create multiple scrape jobs
   */
  fastify.post('/scrape/batch', {
    schema: {
      description: 'Create multiple scrape jobs in a batch',
      tags: ['Scraping'],
      body: batchScrapeRequestSchema,
    },
    preHandler: [requireScope('scrape:write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = batchScrapeRequestSchema.parse(request.body);
    const organization = request.organization!;
    const apiKey = request.apiKey!;

    // Check batch size limit
    if (body.requests.length > organization.maxBatchSize) {
      throw new BatchTooLargeError(organization.maxBatchSize);
    }

    // Calculate total credits needed
    let totalCredits = 0;
    const jobsToCreate: Array<{
      request: ScrapeRequest;
      options: ScrapeOptions;
      engine: EngineType;
      proxyTier: ReturnType<typeof determineProxyTier>;
      credits: number;
      breakdown: ReturnType<typeof calculateCredits>['breakdown'];
    }> = [];

    for (const req of body.requests) {
      const options = mergeScrapeOptions(req.options);
      const engine = determineEngine(options);
      const proxyTier = determineProxyTier(options);
      const { total, breakdown } = calculateCredits(engine, proxyTier, options);
      
      totalCredits += total;
      jobsToCreate.push({ request: req, options, engine, proxyTier, credits: total, breakdown });
    }

    // Check total credits
    if (organization.planId !== 'enterprise' && organization.creditsBalance < totalCredits) {
      throw new InsufficientCreditsError(totalCredits, organization.creditsBalance);
    }

    // Generate batch ID
    const batchId = generateBatchId();

    // Create all jobs
    const createdJobs: Array<{ jobId: string; url: string }> = [];

    for (const { request: req, options, engine, proxyTier, credits, breakdown } of jobsToCreate) {
      const job = await scrapeJobRepository.create({
        organizationId: organization.id,
        apiKeyId: apiKey.id,
        batchId,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        engine,
        options,
        proxyTier,
        proxyCountry: options.country,
        creditsEstimated: credits,
        creditBreakdown: breakdown,
        webhookUrl: req.webhookUrl || body.webhookUrl,
        webhookSecret: req.webhookSecret || body.webhookSecret,
        clientReference: req.clientReference || body.clientReference,
        idempotencyKey: req.idempotencyKey,
      });

      // Add to queue
      const queueJobData: QueueJobData = {
        jobId: job.id,
        organizationId: organization.id,
        url: req.url,
        method: req.method || 'GET',
        headers: req.headers || {},
        body: req.body,
        options,
        engine,
        attempt: 1,
        maxAttempts: 3,
      };

      await addScrapeJob(queueJobData);
      await scrapeJobRepository.updateStatus(job.id, 'queued', {
        queuedAt: new Date(),
        queueName: getQueueNameForEngine(engine),
      });

      createdJobs.push({ jobId: job.id, url: req.url });
    }

    logger.info(
      { batchId, jobCount: createdJobs.length, totalCredits },
      'Batch scrape jobs created'
    );

    return reply.status(202).send({
      success: true,
      batchId,
      jobCount: createdJobs.length,
      totalCreditsEstimated: totalCredits,
      jobs: createdJobs,
    });
  });

  /**
   * GET /v1/jobs/:id - Get job status
   */
  fastify.get('/jobs/:id', {
    schema: {
      description: 'Get the status of a scrape job',
      tags: ['Jobs'],
      params: jobIdParamSchema,
    },
    preHandler: [requireScope('scrape:read')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = jobIdParamSchema.parse(request.params);
    const organization = request.organization!;

    const job = await scrapeJobRepository.findByIdAndOrganization(id, organization.id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    return reply.status(200).send({
      success: true,
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        engine: job.engine,
        createdAt: job.createdAt.toISOString(),
        queuedAt: job.queuedAt?.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        creditsEstimated: job.creditsEstimated,
        creditsCharged: job.creditsCharged,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        ...(job.errorCode && {
          error: {
            code: job.errorCode,
            message: job.errorMessage,
          },
        }),
      },
    });
  });

  /**
   * GET /v1/jobs/:id/result - Get job result
   */
  fastify.get('/jobs/:id/result', {
    schema: {
      description: 'Get the result of a completed scrape job',
      tags: ['Jobs'],
      params: jobIdParamSchema,
    },
    preHandler: [requireScope('scrape:read')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = jobIdParamSchema.parse(request.params);
    const organization = request.organization!;

    const job = await scrapeJobRepository.findByIdAndOrganization(id, organization.id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    // Check if job is completed
    if (job.status !== 'completed' && job.status !== 'failed') {
      return reply.status(200).send({
        success: false,
        jobId: job.id,
        status: job.status,
        message: `Job is still ${job.status}`,
      });
    }

    // Get the result
    const result = job.resultId 
      ? await jobResultRepository.findById(job.resultId)
      : await jobResultRepository.findByJobId(job.id);

    if (!result && job.status === 'failed') {
      return reply.status(200).send({
        success: false,
        jobId: job.id,
        status: 'failed',
        error: {
          code: job.errorCode || 'UNKNOWN_ERROR',
          message: job.errorMessage || 'Job failed without error details',
        },
      });
    }

    if (!result) {
      return reply.status(200).send({
        success: false,
        jobId: job.id,
        status: job.status,
        message: 'Result not found',
      });
    }

    return reply.status(200).send({
      success: job.status === 'completed',
      jobId: job.id,
      url: job.url,
      resolvedUrl: result.finalUrl,
      statusCode: result.statusCode,
      content: result.contentInline,
      contentType: result.contentType,
      contentLength: result.contentLength,
      headers: result.headers,
      cookies: result.cookies,
      extracted: result.extractedData,
      timing: {
        totalMs: result.totalTimeMs,
        dnsMs: result.dnsTimeMs,
        connectMs: result.connectTimeMs,
        ttfbMs: result.ttfbMs,
        downloadMs: result.downloadTimeMs,
        renderMs: result.renderTimeMs,
      },
      credits: {
        used: job.creditsCharged,
        breakdown: job.creditBreakdown,
        remaining: organization.creditsBalance,
      },
      metadata: {
        workerType: job.engine,
        proxyType: job.proxyTier,
        proxyCountry: result.proxyCountry,
        attempts: job.attempts,
      },
    });
  });

  /**
   * GET /v1/jobs - List jobs
   */
  fastify.get('/jobs', {
    schema: {
      description: 'List scrape jobs',
      tags: ['Jobs'],
      querystring: paginationQuerySchema,
    },
    preHandler: [requireScope('scrape:read')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = paginationQuerySchema.parse(request.query);
    const organization = request.organization!;

    const jobs = await scrapeJobRepository.findByOrganization(organization.id, {
      status: query.status,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return reply.status(200).send({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        url: job.url,
        status: job.status,
        engine: job.engine,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        creditsCharged: job.creditsCharged,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        hasMore: jobs.length === query.limit,
      },
    });
  });

  /**
   * DELETE /v1/jobs/:id - Cancel a job
   */
  fastify.delete('/jobs/:id', {
    schema: {
      description: 'Cancel a pending or queued job',
      tags: ['Jobs'],
      params: jobIdParamSchema,
    },
    preHandler: [requireScope('scrape:write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = jobIdParamSchema.parse(request.params);
    const organization = request.organization!;

    const job = await scrapeJobRepository.findByIdAndOrganization(id, organization.id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    // Can only cancel pending or queued jobs
    if (job.status !== 'pending' && job.status !== 'queued') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: `Cannot cancel job with status: ${job.status}`,
        },
      });
    }

    await scrapeJobRepository.updateStatus(job.id, 'canceled');

    logger.info({ jobId: job.id }, 'Job canceled');

    return reply.status(200).send({
      success: true,
      jobId: job.id,
      status: 'canceled',
    });
  });
};
