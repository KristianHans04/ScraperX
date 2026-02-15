/**
 * Unit tests for Redis utilities and rate limiter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock Redis instance
const mockRedisInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue('OK'),
  ping: vi.fn().mockResolvedValue('PONG'),
  on: vi.fn(),
  eval: vi.fn(),
  zrem: vi.fn().mockResolvedValue(1),
};

vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => mockRedisInstance);
  return { default: RedisMock, Redis: RedisMock };
});

vi.mock('../../../src/config/index.js', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
      password: undefined,
      db: 0,
    },
    queue: {
      prefix: 'scrapifie',
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createRedisConnection,
  createBullMQConnection,
  checkRedisHealth,
  RedisRateLimiter,
} from '../../../src/queue/redis.js';

describe('Redis Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRedisConnection', () => {
    it('should create a Redis connection with default name', () => {
      const redis = createRedisConnection();
      expect(redis).toBeDefined();
    });

    it('should create a Redis connection with custom name', () => {
      const redis = createRedisConnection('test-connection');
      expect(redis).toBeDefined();
    });

    it('should register event handlers', () => {
      createRedisConnection();
      
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('createBullMQConnection', () => {
    it('should create a connection suitable for BullMQ', () => {
      const redis = createBullMQConnection();
      expect(redis).toBeDefined();
    });
  });

  describe('checkRedisHealth', () => {
    it('should return healthy status when ping succeeds', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      
      const result = await checkRedisHealth();
      
      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeDefined();
    });

    it('should return unhealthy status when ping fails', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection refused'));
      
      const result = await checkRedisHealth();
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});

describe('RedisRateLimiter', () => {
  let limiter: RedisRateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    limiter = new RedisRateLimiter(mockRedisInstance as any, 'test');
  });

  describe('isRateLimited', () => {
    it('should return not limited when under limit', async () => {
      mockRedisInstance.eval.mockResolvedValue([0, 9, Date.now() + 1000]);

      const result = await limiter.isRateLimited('user:123', 10, 1000);

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeDefined();
    });

    it('should return limited when over limit', async () => {
      mockRedisInstance.eval.mockResolvedValue([1, 0, Date.now() + 500]);

      const result = await limiter.isRateLimited('user:123', 10, 1000);

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should call eval with correct arguments', async () => {
      mockRedisInstance.eval.mockResolvedValue([0, 5, Date.now() + 1000]);

      await limiter.isRateLimited('api:key1', 10, 1000);

      expect(mockRedisInstance.eval).toHaveBeenCalledWith(
        expect.any(String), // Lua script
        1,
        'test:api:key1',
        expect.any(String), // now
        expect.any(String), // window_start
        '10',
        '1000'
      );
    });
  });

  describe('checkConcurrent', () => {
    it('should allow when under limit', async () => {
      const token = 'token-123';
      mockRedisInstance.eval.mockResolvedValue([1, 5, token]);

      const result = await limiter.checkConcurrent('org:abc', 10);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.token).toBe(token);
    });

    it('should deny when at limit', async () => {
      mockRedisInstance.eval.mockResolvedValue([0, 10, '']);

      const result = await limiter.checkConcurrent('org:abc', 10);

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(10);
      expect(result.token).toBeUndefined();
    });

    it('should use custom TTL', async () => {
      mockRedisInstance.eval.mockResolvedValue([1, 1, 'token']);

      await limiter.checkConcurrent('org:abc', 10, 30000);

      expect(mockRedisInstance.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'test:concurrent:org:abc',
        expect.any(String),
        '10',
        '30000',
        expect.any(String)
      );
    });
  });

  describe('releaseConcurrent', () => {
    it('should remove the token from the sorted set', async () => {
      await limiter.releaseConcurrent('org:abc', 'token-123');

      expect(mockRedisInstance.zrem).toHaveBeenCalledWith(
        'test:concurrent:org:abc',
        'token-123'
      );
    });
  });
});
