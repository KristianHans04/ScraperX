import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),

  // Database
  DATABASE_URL: z.string().default('postgresql://scraperx:scraperx@localhost:5432/scraperx'),
  DATABASE_POOL_SIZE: z.string().transform(Number).default('20'),
  DATABASE_SSL: z.string().transform(v => v === 'true').default('false'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),

  // Queue
  QUEUE_PREFIX: z.string().default('scraperx'),
  QUEUE_CONCURRENCY: z.string().transform(Number).default('10'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('1000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('10'),

  // API Key
  API_KEY_PREFIX: z.string().default('sk_live_'),
  API_KEY_LENGTH: z.string().transform(Number).default('32'),
  API_KEY_HASH_ROUNDS: z.string().transform(Number).default('10'),

  // Scraping
  SCRAPE_TIMEOUT_MS: z.string().transform(Number).default('30000'),
  SCRAPE_MAX_RETRIES: z.string().transform(Number).default('3'),
  SCRAPE_RETRY_DELAY_MS: z.string().transform(Number).default('1000'),

  // HTTP Engine
  HTTP_USER_AGENT: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),

  // Browser Engine
  BROWSER_HEADLESS: z.string().transform(v => v === 'true').default('true'),
  BROWSER_POOL_MIN: z.string().transform(Number).default('2'),
  BROWSER_POOL_MAX: z.string().transform(Number).default('10'),
  BROWSER_PAGE_TIMEOUT_MS: z.string().transform(Number).default('30000'),

  // Proxy
  PROXY_ENABLED: z.string().transform(v => v === 'true').default('false'),
  PROXY_DATACENTER_URL: z.string().optional(),
  PROXY_RESIDENTIAL_URL: z.string().optional(),
  PROXY_MOBILE_URL: z.string().optional(),

  // Camoufox
  CAMOUFOX_SERVICE_URL: z.string().default('http://localhost:8000'),
  CAMOUFOX_ENABLED: z.string().transform(v => v === 'true').default('false'),

  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().transform(Number).default('9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET_CONTENT: z.string().default('scraperx-content'),
  MINIO_BUCKET_SCREENSHOTS: z.string().default('scraperx-screenshots'),
  MINIO_USE_SSL: z.string().transform(v => v === 'true').default('false'),

  // Metrics
  METRICS_ENABLED: z.string().transform(v => v === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),

  // CAPTCHA
  CAPTCHA_SERVICE_ENABLED: z.string().transform(v => v === 'true').default('false'),
  TWOCAPTCHA_API_KEY: z.string().optional(),
  ANTICAPTCHA_API_KEY: z.string().optional(),
});

// Parse and validate environment
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
};

const env = parseEnv();

// Configuration object
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',

  server: {
    port: env.PORT,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
  },

  api: {
    version: env.API_VERSION,
    prefix: env.API_PREFIX,
  },

  database: {
    url: env.DATABASE_URL,
    poolSize: env.DATABASE_POOL_SIZE,
    ssl: env.DATABASE_SSL,
  },

  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },

  queue: {
    prefix: env.QUEUE_PREFIX,
    concurrency: env.QUEUE_CONCURRENCY,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  apiKey: {
    prefix: env.API_KEY_PREFIX,
    length: env.API_KEY_LENGTH,
    hashRounds: env.API_KEY_HASH_ROUNDS,
  },

  scraping: {
    timeoutMs: env.SCRAPE_TIMEOUT_MS,
    maxRetries: env.SCRAPE_MAX_RETRIES,
    retryDelayMs: env.SCRAPE_RETRY_DELAY_MS,
  },

  httpEngine: {
    userAgent: env.HTTP_USER_AGENT,
  },

  browserEngine: {
    headless: env.BROWSER_HEADLESS,
    poolMin: env.BROWSER_POOL_MIN,
    poolMax: env.BROWSER_POOL_MAX,
    pageTimeoutMs: env.BROWSER_PAGE_TIMEOUT_MS,
  },

  proxy: {
    enabled: env.PROXY_ENABLED,
    datacenterUrl: env.PROXY_DATACENTER_URL,
    residentialUrl: env.PROXY_RESIDENTIAL_URL,
    mobileUrl: env.PROXY_MOBILE_URL,
  },

  camoufox: {
    serviceUrl: env.CAMOUFOX_SERVICE_URL,
    enabled: env.CAMOUFOX_ENABLED,
  },

  minio: {
    endpoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    bucketContent: env.MINIO_BUCKET_CONTENT,
    bucketScreenshots: env.MINIO_BUCKET_SCREENSHOTS,
    useSSL: env.MINIO_USE_SSL,
  },

  metrics: {
    enabled: env.METRICS_ENABLED,
    port: env.METRICS_PORT,
  },

  captcha: {
    enabled: env.CAPTCHA_SERVICE_ENABLED,
    twoCaptchaApiKey: env.TWOCAPTCHA_API_KEY,
    antiCaptchaApiKey: env.ANTICAPTCHA_API_KEY,
  },

  // Credit multipliers for billing
  credits: {
    base: {
      http: 1,
      browser: 5,
      stealth: 10,
    },
    proxy: {
      datacenter: 0,
      residential: 3,
      mobile: 10,
      isp: 5,
    },
    features: {
      screenshot: 2,
      pdf: 3,
      captcha: 10,
    },
  },

  // Plan limits
  plans: {
    free: {
      creditsMonthly: 1000,
      rateLimit: 1,
      concurrentLimit: 5,
    },
    starter: {
      creditsMonthly: 100000,
      rateLimit: 10,
      concurrentLimit: 20,
    },
    growth: {
      creditsMonthly: 500000,
      rateLimit: 25,
      concurrentLimit: 50,
    },
    business: {
      creditsMonthly: 2000000,
      rateLimit: 50,
      concurrentLimit: 100,
    },
    enterprise: {
      creditsMonthly: -1, // Unlimited
      rateLimit: 100,
      concurrentLimit: 500,
    },
  },
} as const;

export type Config = typeof config;
export default config;
