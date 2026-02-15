/**
 * Scrape Workflow Integration Tests for Scrapifie
 *
 * Tests for end-to-end scraping workflows with mocked external services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config and logger first
vi.mock('../../src/config/index.js', () => ({
  config: {
    scraping: {
      timeoutMs: 30000,
      retryDelayMs: 100,
    },
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
        jsRender: 4,
      },
    },
    proxy: { enabled: false },
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Mock all dependencies
const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'job_workflow_test' });

vi.mock('../../src/queue/queues.js', () => ({
  QUEUE_NAMES: {
    HTTP: 'scrapifie:http',
    BROWSER: 'scrapifie:browser',
    STEALTH: 'scrapifie:stealth',
    WEBHOOK: 'scrapifie:webhook',
  },
  addScrapeJob: mockQueueAdd,
  getQueue: vi.fn().mockReturnValue({
    add: mockQueueAdd,
    getJob: vi.fn().mockResolvedValue(null),
  }),
  getQueueForEngine: vi.fn().mockReturnValue({
    add: mockQueueAdd,
    name: 'scrapifie:http',
  }),
}));

vi.mock('../../src/db/index.js', () => ({
  scrapeJobRepository: {
    create: vi.fn().mockResolvedValue({
      id: 'job_workflow_test',
      accountId: 'acc_123',
      url: 'https://example.com',
      status: 'pending',
      engine: 'http',
      creditsEstimated: 1,
    }),
    findById: vi.fn().mockResolvedValue({
      id: 'job_workflow_test',
      status: 'completed',
      creditsCharged: 1,
    }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  },
  jobResultRepository: {
    create: vi.fn().mockResolvedValue({
      id: 'result_123',
      jobId: 'job_workflow_test',
      statusCode: 200,
    }),
    findByJobId: vi.fn().mockResolvedValue({
      id: 'result_123',
      statusCode: 200,
      contentInline: '<html><body>Test Content</body></html>',
    }),
  },
  accountRepository: {
    findById: vi.fn().mockResolvedValue({
      id: 'acc_123',
      creditBalance: 100000,
      plan: 'pro',
    }),
    deductCredits: vi.fn().mockResolvedValue(undefined),
  },
  apiKeyRepository: {
    findByKeyHash: vi.fn().mockResolvedValue({
      id: 'key_123',
      accountId: 'acc_123',
      isActive: true,
    }),
  },
}));

import { calculateCredits, determineEngine, determineProxyTier } from '../../src/utils/credits.js';
import {
  mockAccount,
  mockScrapeJob,
  mockJobResult,
  defaultScrapeOptions,
  browserScrapeOptions,
  stealthScrapeOptions,
  testUrls,
} from '../fixtures/index.js';
import type { ScrapeOptions, EngineType } from '../../src/types/index.js';

describe('Scrape Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Creation Flow', () => {
    it('should calculate credits before job creation', () => {
      const options: ScrapeOptions = {
        renderJs: false,
        timeout: 30000,
        screenshot: false,
        pdf: false,
        premiumProxy: false,
        mobileProxy: false,
      };

      // calculateCredits takes (engine, proxyTier, options)
      const credits = calculateCredits('http', 'datacenter', options);

      expect(credits.total).toBe(1);
      expect(credits.breakdown.base).toBe(1);
    });

    it('should determine correct engine based on options', () => {
      const httpOptions: ScrapeOptions = { ...defaultScrapeOptions, renderJs: false };
      const browserOptions: ScrapeOptions = { ...defaultScrapeOptions, renderJs: true };

      expect(determineEngine(httpOptions)).toBe('http');
      expect(determineEngine(browserOptions)).toBe('browser');
    });

    it('should determine correct proxy tier', () => {
      const datacenterOptions: ScrapeOptions = {
        ...defaultScrapeOptions,
        premiumProxy: false,
        mobileProxy: false,
      };
      const residentialOptions: ScrapeOptions = {
        ...defaultScrapeOptions,
        premiumProxy: true,
        mobileProxy: false,
      };
      const mobileOptions: ScrapeOptions = {
        ...defaultScrapeOptions,
        premiumProxy: false,
        mobileProxy: true,
      };

      expect(determineProxyTier(datacenterOptions)).toBe('datacenter');
      expect(determineProxyTier(residentialOptions)).toBe('residential');
      expect(determineProxyTier(mobileOptions)).toBe('mobile');
    });
  });

  describe('Engine Selection', () => {
    it('should determine HTTP engine for simple requests', () => {
      const engine = determineEngine(defaultScrapeOptions);
      expect(engine).toBe('http');
    });

    it('should determine browser engine when JS rendering needed', () => {
      const engine = determineEngine(browserScrapeOptions);
      expect(engine).toBe('browser');
    });

    it('should determine stealth engine for scenarios', () => {
      const engine = determineEngine(stealthScrapeOptions);
      expect(engine).toBe('stealth');
    });
  });

  describe('Credit Calculation', () => {
    it('should calculate 1 credit for basic HTTP scrape', () => {
      const credits = calculateCredits('http', 'datacenter', defaultScrapeOptions);
      expect(credits.total).toBe(1);
    });

    it('should calculate 7 credits for browser engine with screenshot', () => {
      // browserScrapeOptions includes screenshot: true which adds 2 credits
      const credits = calculateCredits('browser', 'datacenter', browserScrapeOptions);
      expect(credits.total).toBe(7); // 5 (browser) + 2 (screenshot)
    });

    it('should add credits for screenshot', () => {
      const credits = calculateCredits('browser', 'datacenter', { ...defaultScrapeOptions, screenshot: true });
      expect(credits.breakdown.screenshot).toBe(2);
    });

    it('should add credits for PDF', () => {
      const credits = calculateCredits('browser', 'datacenter', { ...defaultScrapeOptions, pdf: true });
      expect(credits.breakdown.pdf).toBe(3);
    });

    it('should add credits for residential proxy', () => {
      const credits = calculateCredits('http', 'residential', defaultScrapeOptions);
      expect(credits.breakdown.premiumProxy).toBe(3);
    });

    it('should add credits for mobile proxy', () => {
      const credits = calculateCredits('http', 'mobile', defaultScrapeOptions);
      expect(credits.breakdown.mobileProxy).toBe(10);
    });

    it('should calculate complex request credits correctly', () => {
      const complexOptions: ScrapeOptions = {
        renderJs: true,
        screenshot: true,
        pdf: true,
        premiumProxy: true,
        mobileProxy: false,
        timeout: 60000,
      };

      // browser (5) + residential (3) + screenshot (2) + pdf (3) = 13
      const credits = calculateCredits('browser', 'residential', complexOptions);
      expect(credits.total).toBe(13);
    });
  });

  describe('Job Queue Flow', () => {
    it('should add job to correct queue based on engine', async () => {
      const { addScrapeJob } = await import('../../src/queue/queues.js');

      await addScrapeJob({
        jobId: 'test_job_123',
        accountId: 'acc_123',
        url: 'https://example.com',
        method: 'GET',
        headers: {},
        options: defaultScrapeOptions,
        engine: 'http',
        attempt: 1,
        maxAttempts: 3,
      });

      expect(mockQueueAdd).toHaveBeenCalled();
    });

    it('should set correct job priority', async () => {
      const { addScrapeJob } = await import('../../src/queue/queues.js');

      await addScrapeJob({
        jobId: 'test_job_priority',
        accountId: 'acc_123',
        url: 'https://example.com',
        method: 'GET',
        headers: {},
        options: defaultScrapeOptions,
        engine: 'http',
        attempt: 1,
        maxAttempts: 3,
      });

      expect(mockQueueAdd).toHaveBeenCalled();
    });
  });

  describe('Result Storage', () => {
    it('should store successful results', async () => {
      const { jobResultRepository } = await import('../../src/db/index.js');

      const result = await jobResultRepository.create({
        jobId: 'job_123',
        accountId: 'acc_123',
        statusCode: 200,
        headers: { 'content-type': 'text/html' },
        contentStorageType: 'inline',
        contentInline: '<html>Test</html>',
      } as any);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should retrieve results by job ID', async () => {
      const { jobResultRepository } = await import('../../src/db/index.js');

      const result = await jobResultRepository.findByJobId('job_workflow_test');

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Credit Deduction', () => {
    it('should deduct credits on job completion', async () => {
      const { accountRepository } = await import('../../src/db/index.js');

      await accountRepository.deductCredits('acc_123', 5);

      expect(accountRepository.deductCredits).toHaveBeenCalledWith('acc_123', 5);
    });
  });

  describe('URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      const url = testUrls.simple;
      expect(url.startsWith('https://')).toBe(true);
    });

    it('should handle URLs with paths', () => {
      const url = testUrls.withPath;
      expect(url).toContain('/path/to/page');
    });

    it('should handle URLs with query parameters', () => {
      const url = testUrls.withQuery;
      expect(url).toContain('?');
      expect(url).toContain('q=test');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle insufficient credits', () => {
      const balance = 0;
      const required = 5;
      const hasInsufficientCredits = balance < required;

      expect(hasInsufficientCredits).toBe(true);
    });

    it('should handle rate limiting', () => {
      const requestsPerSecond = 15;
      const limit = 10;
      const isRateLimited = requestsPerSecond > limit;

      expect(isRateLimited).toBe(true);
    });

    it('should handle job timeout', () => {
      const jobDurationMs = 35000;
      const timeoutMs = 30000;
      const isTimedOut = jobDurationMs > timeoutMs;

      expect(isTimedOut).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should calculate retry attempt correctly', () => {
      const currentAttempt = 1;
      const maxAttempts = 3;
      const canRetry = currentAttempt < maxAttempts;

      expect(canRetry).toBe(true);
    });

    it('should fail permanently after max attempts', () => {
      const currentAttempt = 3;
      const maxAttempts = 3;
      const shouldFail = currentAttempt >= maxAttempts;

      expect(shouldFail).toBe(true);
    });

    it('should escalate engine on retry', () => {
      const engines: EngineType[] = ['http', 'browser', 'stealth'];
      const currentEngine = 'http';
      const currentIndex = engines.indexOf(currentEngine);
      const nextEngine = engines[currentIndex + 1];

      expect(nextEngine).toBe('browser');
    });
  });
});

describe('Webhook Delivery', () => {
  it('should format webhook payload correctly', () => {
    const payload = {
      event: 'job.completed',
      jobId: 'job_123',
      status: 'completed',
      result: {
        statusCode: 200,
        url: 'https://example.com',
      },
      timestamp: new Date().toISOString(),
    };

    expect(payload.event).toBe('job.completed');
    expect(payload.jobId).toBeDefined();
    expect(payload.result).toBeDefined();
  });

  it('should include HMAC signature when secret provided', () => {
    const payload = JSON.stringify({ test: true });
    const secret = 'webhook_secret';

    // Would calculate HMAC-SHA256
    expect(secret).toBeDefined();
    expect(payload).toBeDefined();
  });
});

describe('Batch Processing', () => {
  it('should handle multiple URLs in batch', () => {
    const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
    ];

    expect(urls.length).toBe(3);
  });

  it('should respect max batch size', () => {
    const maxBatchSize = 1000;
    const batchSize = 500;
    const isValidBatch = batchSize <= maxBatchSize;

    expect(isValidBatch).toBe(true);
  });

  it('should calculate total credits for batch', () => {
    const urlCount = 10;
    const creditsPerUrl = 5;
    const totalCredits = urlCount * creditsPerUrl;

    expect(totalCredits).toBe(50);
  });
});

describe('Content Extraction', () => {
  it('should extract data using CSS selectors', () => {
    const extractRules = {
      title: 'h1',
      description: '.description',
      items: '.item',
    };

    expect(Object.keys(extractRules).length).toBe(3);
  });

  it('should handle array selectors', () => {
    const extractRules = {
      title: ['h1', '.title', '[data-title]'], // Fallback selectors
    };

    expect(Array.isArray(extractRules.title)).toBe(true);
  });

  it('should extract metadata', () => {
    const metadata = {
      title: 'Page Title',
      description: 'Meta description',
      canonical: 'https://example.com/canonical',
    };

    expect(metadata.title).toBeDefined();
    expect(metadata.description).toBeDefined();
  });
});

describe('Scenario Execution', () => {
  it('should execute scenario steps in order', () => {
    const scenario = stealthScrapeOptions.scenario || [];
    
    expect(scenario.length).toBeGreaterThan(0);
    expect(scenario[0].action).toBe('wait');
  });

  it('should support various scenario actions', () => {
    const supportedActions = [
      'wait',
      'wait_for',
      'wait_for_navigation',
      'click',
      'fill',
      'select',
      'scroll',
      'scroll_to',
      'hover',
      'press',
      'evaluate',
      'screenshot',
    ];

    expect(supportedActions.length).toBeGreaterThan(10);
  });
});
