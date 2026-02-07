/**
 * Test Setup for ScraperX
 * 
 * This file runs before all tests and sets up the test environment.
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Set test environment variables BEFORE importing any app modules
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://scraperx:scraperx@localhost:5432/scraperx_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
process.env.PROXY_ENABLED = 'false';
process.env.CAMOUFOX_ENABLED = 'false';

// Mock pino logger to avoid pino-pretty dependency issues in tests
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  })),
}));

// Mock external dependencies that require real connections
vi.mock('pg', async (importOriginal) => {
  const mod = await importOriginal<typeof import('pg')>();
  return {
    ...mod,
    Pool: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      }),
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      end: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    })),
  };
});

vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    zadd: vi.fn().mockResolvedValue(1),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    zcard: vi.fn().mockResolvedValue(0),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    scard: vi.fn().mockResolvedValue(0),
    multi: vi.fn().mockReturnValue({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 0], [null, 1], [null, 1]]),
    }),
    on: vi.fn(),
    status: 'ready',
  }));

  return { default: RedisMock, Redis: RedisMock };
});

// Global test lifecycle hooks
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Extend expect with custom matchers if needed
declare global {
  namespace Vi {
    interface Assertion<T = unknown> {
      toBeValidUUID(): void;
    }
  }
}

// Custom matcher for UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

vi.fn().mockImplementation((_chai, utils) => {
  // Add custom matchers here if needed
});

export { UUID_REGEX };
