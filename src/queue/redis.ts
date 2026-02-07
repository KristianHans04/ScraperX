import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;

/**
 * Parse Redis URL to connection options
 */
function parseRedisUrl(url: string): RedisOptions {
  const parsedUrl = new URL(url);
  
  return {
    host: parsedUrl.hostname || 'localhost',
    port: parseInt(parsedUrl.port || '6379', 10),
    password: config.redis.password || parsedUrl.password || undefined,
    db: config.redis.db,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delay }, 'Retrying Redis connection');
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some(e => err.message.includes(e));
    },
  };
}

/**
 * Create a new Redis connection
 */
export function createRedisConnection(name?: string): Redis {
  const options = parseRedisUrl(config.redis.url);
  const redis = new Redis({
    ...options,
    lazyConnect: true,
    connectionName: name || 'scraperx',
  });

  redis.on('connect', () => {
    logger.debug({ name }, 'Redis connected');
  });

  redis.on('ready', () => {
    logger.info({ name }, 'Redis ready');
  });

  redis.on('error', (err) => {
    logger.error({ err, name }, 'Redis error');
  });

  redis.on('close', () => {
    logger.debug({ name }, 'Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.debug({ name }, 'Redis reconnecting');
  });

  return redis;
}

/**
 * Get or create the main Redis client
 */
export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    redisClient = createRedisConnection('scraperx-main');
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * Get or create a subscriber Redis client (for BullMQ events)
 */
export async function getSubscriberClient(): Promise<Redis> {
  if (!subscriberClient) {
    subscriberClient = createRedisConnection('scraperx-subscriber');
    await subscriberClient.connect();
  }
  return subscriberClient;
}

/**
 * Get Redis connection for BullMQ (with required settings)
 */
export function createBullMQConnection(): Redis {
  const options = parseRedisUrl(config.redis.url);
  return new Redis({
    ...options,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  try {
    const client = await getRedisClient();
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { healthy: false, error };
  }
}

/**
 * Close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (redisClient) {
    closePromises.push(
      redisClient.quit().then(() => {
        redisClient = null;
        logger.info('Main Redis connection closed');
      })
    );
  }

  if (subscriberClient) {
    closePromises.push(
      subscriberClient.quit().then(() => {
        subscriberClient = null;
        logger.info('Subscriber Redis connection closed');
      })
    );
  }

  await Promise.all(closePromises);
}

/**
 * Rate limiter using Redis
 */
export class RedisRateLimiter {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix: string = 'ratelimit') {
    this.redis = redis;
    this.prefix = prefix;
  }

  /**
   * Check if a key is rate limited using sliding window
   */
  async isRateLimited(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ limited: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `${this.prefix}:${key}`;

    // Use a Lua script for atomic operation
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local window_ms = tonumber(ARGV[4])
      
      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
      
      -- Count current entries
      local count = redis.call('ZCARD', key)
      
      if count < limit then
        -- Add new entry
        redis.call('ZADD', key, now, now)
        redis.call('PEXPIRE', key, window_ms)
        return {0, limit - count - 1, now + window_ms}
      else
        -- Get oldest entry for reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_at = oldest[2] and (tonumber(oldest[2]) + window_ms) or (now + window_ms)
        return {1, 0, reset_at}
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      redisKey,
      now.toString(),
      windowStart.toString(),
      limit.toString(),
      windowMs.toString()
    ) as [number, number, number];

    return {
      limited: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
    };
  }

  /**
   * Track concurrent requests
   */
  async checkConcurrent(
    key: string,
    limit: number,
    ttlMs: number = 60000
  ): Promise<{ allowed: boolean; current: number; token?: string }> {
    const token = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const redisKey = `${this.prefix}:concurrent:${key}`;
    const now = Date.now();

    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local ttl_ms = tonumber(ARGV[3])
      local token = ARGV[4]
      local cutoff = now - ttl_ms
      
      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
      
      -- Count current
      local count = redis.call('ZCARD', key)
      
      if count < limit then
        -- Add new entry
        redis.call('ZADD', key, now, token)
        redis.call('PEXPIRE', key, ttl_ms)
        return {1, count + 1, token}
      else
        return {0, count, ''}
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      redisKey,
      now.toString(),
      limit.toString(),
      ttlMs.toString(),
      token
    ) as [number, number, string];

    return {
      allowed: result[0] === 1,
      current: result[1],
      token: result[0] === 1 ? result[2] : undefined,
    };
  }

  /**
   * Release a concurrent request slot
   */
  async releaseConcurrent(key: string, token: string): Promise<void> {
    const redisKey = `${this.prefix}:concurrent:${key}`;
    await this.redis.zrem(redisKey, token);
  }
}

/**
 * Create rate limiter instance
 */
export async function createRateLimiter(prefix?: string): Promise<RedisRateLimiter> {
  const client = await getRedisClient();
  return new RedisRateLimiter(client, prefix || config.queue.prefix);
}

export { Redis };
