import { z } from 'zod';

// Cookie schema
export const cookieSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

// Screenshot options schema
export const screenshotOptionsSchema = z.object({
  fullPage: z.boolean().default(false),
  format: z.enum(['png', 'jpeg']).default('png'),
  quality: z.number().min(1).max(100).optional(),
});

// Scenario step schema
export const scenarioStepSchema = z.object({
  action: z.enum([
    'wait_for',
    'wait',
    'wait_for_navigation',
    'click',
    'fill',
    'select',
    'scroll',
    'scroll_to',
    'screenshot',
    'evaluate',
    'hover',
    'press',
  ]),
  selector: z.string().optional(),
  value: z.string().optional(),
  timeout: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  key: z.string().optional(),
  script: z.string().optional(),
  fullPage: z.boolean().optional(),
});

// Scrape options schema
export const scrapeOptionsSchema = z.object({
  renderJs: z.boolean().default(false),
  waitFor: z.string().optional(),
  waitMs: z.number().positive().max(30000).optional(),
  timeout: z.number().positive().max(120000).default(30000),
  screenshot: z.boolean().default(false),
  screenshotOptions: screenshotOptionsSchema.optional(),
  pdf: z.boolean().default(false),
  extract: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  blockResources: z.array(z.string()).optional(),
  device: z.string().optional(),
  scenario: z.array(scenarioStepSchema).max(50).optional(),
  cookies: z.array(cookieSchema).max(100).optional(),
  premiumProxy: z.boolean().default(false),
  mobileProxy: z.boolean().default(false),
  country: z.string().length(2).optional(),
  sessionId: z.string().max(100).optional(),
});

// Scrape request schema
export const scrapeRequestSchema = z.object({
  url: z.string().url().max(2048),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().max(1024 * 1024).optional(), // 1MB max body
  options: scrapeOptionsSchema.optional(),
  webhookUrl: z.string().url().max(2048).optional(),
  webhookSecret: z.string().max(256).optional(),
  clientReference: z.string().max(255).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

// Batch scrape request schema
export const batchScrapeRequestSchema = z.object({
  requests: z.array(scrapeRequestSchema).min(1).max(1000),
  webhookUrl: z.string().url().max(2048).optional(),
  webhookSecret: z.string().max(256).optional(),
  clientReference: z.string().max(255).optional(),
});

// Job ID param schema
export const jobIdParamSchema = z.object({
  id: z.string().min(1),
});

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).default('20'),
  status: z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'canceled', 'timeout']).optional(),
});

// Scrape response schema (for documentation)
export const scrapeResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  url: z.string(),
  resolvedUrl: z.string().optional(),
  statusCode: z.number().optional(),
  content: z.string().optional(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  extracted: z.record(z.unknown()).optional(),
  screenshotUrl: z.string().optional(),
  cookies: z.array(cookieSchema).optional(),
  headers: z.record(z.string()).optional(),
  timing: z.object({
    queuedMs: z.number().optional(),
    processingMs: z.number().optional(),
    totalMs: z.number(),
  }),
  credits: z.object({
    used: z.number(),
    breakdown: z.object({
      base: z.number(),
      jsRender: z.number(),
      premiumProxy: z.number(),
      mobileProxy: z.number(),
      captcha: z.number(),
      screenshot: z.number(),
      pdf: z.number(),
    }),
    remaining: z.number(),
  }),
  metadata: z.object({
    workerType: z.enum(['auto', 'http', 'browser', 'stealth']),
    proxyType: z.enum(['datacenter', 'residential', 'mobile', 'isp']),
    proxyCountry: z.string().optional(),
    attempts: z.number(),
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
    retryable: z.boolean(),
    suggestions: z.array(z.string()).optional(),
  }).optional(),
});

// Job status response schema
export const jobStatusResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  status: z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'canceled', 'timeout']),
  engine: z.enum(['auto', 'http', 'browser', 'stealth']),
  createdAt: z.string(),
  queuedAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  creditsEstimated: z.number(),
  creditsCharged: z.number(),
  attempts: z.number(),
  maxAttempts: z.number(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// Health check response schema
export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.object({
      healthy: z.boolean(),
      latencyMs: z.number().optional(),
    }),
    redis: z.object({
      healthy: z.boolean(),
      latencyMs: z.number().optional(),
    }),
    queues: z.object({
      http: z.object({
        waiting: z.number(),
        active: z.number(),
      }),
      browser: z.object({
        waiting: z.number(),
        active: z.number(),
      }),
      stealth: z.object({
        waiting: z.number(),
        active: z.number(),
      }),
    }),
  }),
});

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryable: z.boolean().optional(),
  }),
  requestId: z.string().optional(),
});

// Types from schemas
export type ScrapeRequest = z.infer<typeof scrapeRequestSchema>;
export type BatchScrapeRequest = z.infer<typeof batchScrapeRequestSchema>;
export type ScrapeOptions = z.infer<typeof scrapeOptionsSchema>;
export type ScrapeResponse = z.infer<typeof scrapeResponseSchema>;
export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
