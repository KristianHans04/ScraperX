import { FastifyRequest, FastifyReply } from 'fastify';
import { createRateLimiter, RedisRateLimiter } from '../../queue/redis.js';
import { RateLimitedError, ConcurrentLimitError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

let rateLimiter: RedisRateLimiter | null = null;

/**
 * Get or create rate limiter instance
 */
async function getRateLimiter(): Promise<RedisRateLimiter> {
  if (!rateLimiter) {
    rateLimiter = await createRateLimiter();
  }
  return rateLimiter;
}

/**
 * Rate limit middleware
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip rate limiting if no account (for public endpoints)
  if (!request.account) {
    return;
  }

  const limiter = await getRateLimiter();
  const accountId = request.account.id;
  const apiKeyId = request.apiKey?.id;

  // Determine rate limit - API key override > default
  // TODO: Add rate limits to Account model (Phase 10+)
  let rateLimit = 100; // Default: 100 requests per second
  if (request.apiKey?.rateLimitOverride) {
    rateLimit = request.apiKey.rateLimitOverride;
  }

  // Window is always 1 second for per-second rate limiting
  const windowMs = config.rateLimit.windowMs;

  // Create rate limit key
  const rateLimitKey = apiKeyId ? `api:${apiKeyId}` : `account:${accountId}`;

  try {
    const result = await limiter.isRateLimited(rateLimitKey, rateLimit, windowMs);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', rateLimit.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (result.limited) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      reply.header('Retry-After', Math.max(1, retryAfter).toString());

      logger.warn(
        { accountId, apiKeyId, rateLimit, retryAfter },
        'Rate limit exceeded'
      );

      throw new RateLimitedError(retryAfter);
    }
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
      });
    }
    // Log but don't fail on rate limiter errors
    logger.error({ error }, 'Rate limiter error');
  }
}

/**
 * Concurrent request tracking middleware
 */
export async function concurrentLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return;
  }

  const limiter = await getRateLimiter();
  const accountId = request.account.id;

  // Determine concurrent limit
  // TODO: Add concurrent limits to Account model (Phase 10+)
  let concurrentLimit = 10; // Default: 10 concurrent requests
  if (request.apiKey?.maxConcurrentOverride) {
    concurrentLimit = request.apiKey.maxConcurrentOverride;
  }

  const concurrentKey = `account:${accountId}`;

  try {
    const result = await limiter.checkConcurrent(
      concurrentKey,
      concurrentLimit,
      60000 // 1 minute TTL for concurrent tracking
    );

    // Set concurrent limit headers
    reply.header('X-Concurrent-Limit', concurrentLimit.toString());
    reply.header('X-Concurrent-Active', result.current.toString());

    if (!result.allowed) {
      logger.warn(
        { accountId, concurrentLimit, current: result.current },
        'Concurrent limit exceeded'
      );

      throw new ConcurrentLimitError(concurrentLimit);
    }

    // Store token for cleanup on response
    if (result.token) {
      request.requestContext = {
        ...request.requestContext,
        concurrentToken: result.token,
        concurrentKey,
      };
    }
  } catch (error) {
    if (error instanceof ConcurrentLimitError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      });
    }
    logger.error({ error }, 'Concurrent limiter error');
  }
}

// Extend FastifyRequest for request context
declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: {
      concurrentToken?: string;
      concurrentKey?: string;
    };
  }
}

/**
 * Release concurrent slot on response
 */
export async function releaseConcurrentSlot(
  request: FastifyRequest
): Promise<void> {
  if (!request.requestContext?.concurrentToken || !request.requestContext?.concurrentKey) {
    return;
  }

  try {
    const limiter = await getRateLimiter();
    await limiter.releaseConcurrent(
      request.requestContext.concurrentKey,
      request.requestContext.concurrentToken
    );
  } catch (error) {
    logger.error({ error }, 'Failed to release concurrent slot');
  }
}

/**
 * Create a rate limit plugin for Fastify
 */
export function createRateLimitPlugin() {
  return {
    preHandler: rateLimitMiddleware,
    onResponse: async (request: FastifyRequest) => {
      await releaseConcurrentSlot(request);
    },
  };
}

/**
 * Check credits availability middleware
 */
export async function checkCreditsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return;
  }

  // Get estimated credits from request (set by route handler)
  const estimatedCredits = (request as FastifyRequest & { estimatedCredits?: number }).estimatedCredits ?? 1;

  // Enterprise plans have unlimited credits
  if (request.account.plan === 'enterprise') {
    return;
  }

  // Check credit balance
  if (request.account.creditBalance < estimatedCredits) {
    logger.warn(
      {
        accountId: request.account.id,
        required: estimatedCredits,
        available: request.account.creditBalance,
      },
      'Insufficient credits'
    );

    return reply.status(402).send({
      success: false,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: `Insufficient credits. Required: ${estimatedCredits}, Available: ${request.account.creditBalance}`,
        retryable: false,
        details: {
          required: estimatedCredits,
          available: request.account.creditBalance,
        },
      },
    });
  }
}

// Extend FastifyRequest for estimated credits
declare module 'fastify' {
  interface FastifyRequest {
    estimatedCredits?: number;
  }
}
