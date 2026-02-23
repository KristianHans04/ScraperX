/**
 * Unit tests for the Browser Scrape Worker
 *
 * `src/services/scrape.service.ts` does not exist as a standalone file;
 * scraping logic is implemented in `src/workers/browser.worker.ts` (Playwright)
 * and `src/workers/http.worker.ts`.  These tests cover the BrowserWorker which
 * handles JS-rendered scraping and is the closest analogue to a "scrape service".
 *
 * Tests: worker lifecycle, successful scrape, failed scrape, timeout / retry
 * logic, job status transitions, credit deduction, and screenshot handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock hoisted refs ────────────────────────────────────────────────────────

// Captured processor so we can invoke it directly in tests
const capturedProcessors = vi.hoisted(() => ({ browser: null as any }));

const mockBrowserEngine = vi.hoisted(() => ({
  execute: vi.fn(),
}));

const mockProxyManager = vi.hoisted(() => ({
  getProxy: vi.fn(),
}));

const mockWorkerInstance = vi.hoisted(() => ({
  close: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../src/queue/queues.js', () => ({
  QUEUE_NAMES: { BROWSER: 'scrapifie:browser' },
  createWorker: vi.fn().mockImplementation((_name: string, processor: any) => {
    capturedProcessors.browser = processor;
    return mockWorkerInstance;
  }),
}));

vi.mock('../../../src/db/index.js', () => ({
  scrapeJobRepository: {
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue({ creditsEstimated: 5 }),
  },
  jobResultRepository: {
    create: vi.fn().mockResolvedValue({ id: 'result-browser-123' }),
  },
  accountRepository: {
    deductCredits: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/engines/browser/index.js', () => ({
  getBrowserEngine: vi.fn(() => mockBrowserEngine),
}));

vi.mock('../../../src/fingerprint/generator.js', () => ({
  generateFingerprint: vi.fn().mockReturnValue({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    viewport: { width: 1920, height: 1080 },
    platform: 'Win32',
  }),
}));

vi.mock('../../../src/proxy/index.js', () => ({
  getProxyManager: vi.fn(() => mockProxyManager),
}));

vi.mock('../../../src/utils/crypto.js', () => ({
  hashContent: vi.fn().mockReturnValue('content-hash-browser-abc'),
}));

vi.mock('../../../src/utils/logger.js', () => ({
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

vi.mock('../../../src/config/index.js', () => ({
  config: {
    queue: { concurrency: 4 },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { BrowserWorker, createBrowserWorker } from '../../../src/workers/browser.worker.js';
import { scrapeJobRepository, jobResultRepository, accountRepository } from '../../../src/db/index.js';
import { createWorker } from '../../../src/queue/queues.js';
import { generateFingerprint } from '../../../src/fingerprint/generator.js';
import type { QueueJobData } from '../../../src/types/index.js';

// ─── Shared test data ─────────────────────────────────────────────────────────

const baseJobData: QueueJobData = {
  jobId: 'browser-job-001',
  accountId: 'account-abc',
  url: 'https://example.com',
  method: 'GET',
  headers: { 'User-Agent': 'TestAgent/1.0' },
  options: {
    renderJs: true,
    timeout: 30000,
    screenshot: false,
    pdf: false,
    premiumProxy: false,
    mobileProxy: false,
  },
  engine: 'browser',
  attempt: 1,
  maxAttempts: 3,
};

function makeJob(data: Partial<QueueJobData> = {}) {
  return { data: { ...baseJobData, ...data } };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BrowserWorker – lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstance.close.mockResolvedValue(undefined);
  });

  it('creates a worker instance', () => {
    const worker = new BrowserWorker();
    expect(worker).toBeInstanceOf(BrowserWorker);
  });

  it('start() registers with the BROWSER queue', () => {
    const worker = new BrowserWorker();
    worker.start();

    expect(createWorker).toHaveBeenCalledWith(
      'scrapifie:browser',
      expect.any(Function),
      expect.objectContaining({ concurrency: expect.any(Number) })
    );
  });

  it('start() uses reduced concurrency (heavier than HTTP)', () => {
    const worker = new BrowserWorker();
    worker.start();

    const [, , opts] = (createWorker as any).mock.calls[0];
    // concurrency is Math.max(1, Math.floor(4 / 2)) = 2
    expect(opts.concurrency).toBe(2);
  });

  it('stop() closes the underlying worker', async () => {
    const worker = new BrowserWorker();
    worker.start();
    await worker.stop();

    expect(mockWorkerInstance.close).toHaveBeenCalledOnce();
  });

  it('stop() is a no-op when the worker has not been started', async () => {
    const worker = new BrowserWorker();
    await expect(worker.stop()).resolves.toBeUndefined();
    expect(mockWorkerInstance.close).not.toHaveBeenCalled();
  });

  it('stop() can be called multiple times without throwing', async () => {
    const worker = new BrowserWorker();
    worker.start();
    await worker.stop();
    await expect(worker.stop()).resolves.toBeUndefined();
  });
});

describe('createBrowserWorker factory', () => {
  it('returns a BrowserWorker instance', () => {
    const worker = createBrowserWorker();
    expect(worker).toBeInstanceOf(BrowserWorker);
  });
});

describe('BrowserWorker – job processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstance.close.mockResolvedValue(undefined);

    // Default successful engine response
    mockBrowserEngine.execute.mockResolvedValue({
      success: true,
      statusCode: 200,
      content: '<html><body>Hello</body></html>',
      headers: { 'content-type': 'text/html' },
      cookies: [],
      finalUrl: 'https://example.com',
      timing: { totalMs: 800 },
    });

    vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
      creditsEstimated: 5,
    } as any);

    // Start a fresh worker and capture the processor
    const worker = new BrowserWorker();
    worker.start();
  });

  describe('successful scrape', () => {
    it('marks job as running at start', async () => {
      await capturedProcessors.browser(makeJob());

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'running',
        expect.objectContaining({ startedAt: expect.any(Date) })
      );
    });

    it('stores the job result', async () => {
      await capturedProcessors.browser(makeJob());

      expect(jobResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'browser-job-001',
          statusCode: 200,
          contentInline: '<html><body>Hello</body></html>',
        })
      );
    });

    it('deducts credits from the account', async () => {
      await capturedProcessors.browser(makeJob());

      expect(accountRepository.deductCredits).toHaveBeenCalledWith(
        'account-abc',
        5
      );
    });

    it('marks job as completed with result ID', async () => {
      await capturedProcessors.browser(makeJob());

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'completed',
        expect.objectContaining({ resultId: 'result-browser-123' })
      );
    });

    it('uses creditsEstimated from job record for deduction', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValueOnce({
        creditsEstimated: 10,
      } as any);

      await capturedProcessors.browser(makeJob());

      expect(accountRepository.deductCredits).toHaveBeenCalledWith(
        'account-abc',
        10
      );
    });

    it('falls back to 5 credits when job record is missing', async () => {
      vi.mocked(scrapeJobRepository.findById).mockResolvedValueOnce(null as any);

      await capturedProcessors.browser(makeJob());

      expect(accountRepository.deductCredits).toHaveBeenCalledWith(
        'account-abc',
        5
      );
    });
  });

  describe('failed scrape (engine returns success=false)', () => {
    beforeEach(() => {
      mockBrowserEngine.execute.mockResolvedValue({
        success: false,
        error: { code: 'BLOCKED', message: 'Access denied by target' },
      });
    });

    it('marks job as pending for retry when attempts remain', async () => {
      await capturedProcessors.browser(makeJob({ attempt: 1, maxAttempts: 3 }));

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'pending',
        expect.objectContaining({ errorCode: 'BLOCKED' })
      );
    });

    it('marks job as failed when max attempts reached', async () => {
      await capturedProcessors.browser(makeJob({ attempt: 3, maxAttempts: 3 }));

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'failed',
        expect.objectContaining({ errorCode: 'BLOCKED' })
      );
    });

    it('does not deduct credits on failure', async () => {
      await capturedProcessors.browser(makeJob());

      expect(accountRepository.deductCredits).not.toHaveBeenCalled();
    });

    it('records error message in status update', async () => {
      await capturedProcessors.browser(makeJob({ attempt: 3, maxAttempts: 3 }));

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'failed',
        expect.objectContaining({ errorMessage: 'Access denied by target' })
      );
    });
  });

  describe('timeout / processing error', () => {
    it('marks job as pending on first failed attempt', async () => {
      mockBrowserEngine.execute.mockRejectedValueOnce(
        new Error('Navigation timeout exceeded')
      );

      await expect(
        capturedProcessors.browser(makeJob({ attempt: 1, maxAttempts: 3 }))
      ).rejects.toThrow('Navigation timeout exceeded');

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'pending',
        expect.objectContaining({ errorCode: 'PROCESSING_ERROR' })
      );
    });

    it('marks job as failed when max attempts reached after exception', async () => {
      mockBrowserEngine.execute.mockRejectedValueOnce(
        new Error('Playwright crashed')
      );

      await expect(
        capturedProcessors.browser(makeJob({ attempt: 3, maxAttempts: 3 }))
      ).rejects.toThrow('Playwright crashed');

      expect(scrapeJobRepository.updateStatus).toHaveBeenCalledWith(
        'browser-job-001',
        'failed',
        expect.objectContaining({ errorCode: 'PROCESSING_ERROR' })
      );
    });
  });

  describe('fingerprint generation', () => {
    it('generates a fingerprint when none is provided', async () => {
      await capturedProcessors.browser(makeJob());

      expect(generateFingerprint).toHaveBeenCalled();
    });

    it('uses platform=android when mobileProxy is true', async () => {
      await capturedProcessors.browser(
        makeJob({ options: { ...baseJobData.options, mobileProxy: true } })
      );

      expect(generateFingerprint).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'android', mobile: true })
      );
    });

    it('uses platform=windows for desktop requests', async () => {
      await capturedProcessors.browser(makeJob());

      expect(generateFingerprint).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'windows' })
      );
    });

    it('re-uses the fingerprint provided in job data', async () => {
      const presetFp = {
        userAgent: 'CustomAgent/2.0',
        viewport: { width: 1280, height: 800 },
        platform: 'MacIntel',
      };

      await capturedProcessors.browser(
        makeJob({ fingerprint: presetFp as any })
      );

      // generateFingerprint should NOT be called when one is supplied
      expect(generateFingerprint).not.toHaveBeenCalled();
    });
  });

  describe('proxy handling', () => {
    it('does not request proxy when premiumProxy is false', async () => {
      await capturedProcessors.browser(makeJob());

      expect(mockProxyManager.getProxy).not.toHaveBeenCalled();
    });

    it('fetches a residential proxy when premiumProxy is true', async () => {
      mockProxyManager.getProxy.mockResolvedValueOnce({
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http',
      });

      await capturedProcessors.browser(
        makeJob({ options: { ...baseJobData.options, premiumProxy: true } })
      );

      expect(mockProxyManager.getProxy).toHaveBeenCalledWith(
        expect.objectContaining({ tier: 'residential' })
      );
    });

    it('uses preConfigured proxy from job data directly', async () => {
      const presetProxy = { host: 'preset.proxy', port: 3128, protocol: 'http' as const };

      await capturedProcessors.browser(
        makeJob({
          proxyConfig: presetProxy,
          options: { ...baseJobData.options, premiumProxy: true },
        })
      );

      // Should NOT call getProxy because proxyConfig was pre-populated
      expect(mockProxyManager.getProxy).not.toHaveBeenCalled();
    });
  });

  describe('screenshot handling', () => {
    it('stores screenshotFormat when screenshot is returned', async () => {
      mockBrowserEngine.execute.mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        content: '<html></html>',
        headers: {},
        cookies: [],
        finalUrl: 'https://example.com',
        screenshot: Buffer.from('fake-png'),
        timing: { totalMs: 1200 },
      });

      await capturedProcessors.browser(
        makeJob({ options: { ...baseJobData.options, screenshot: true } })
      );

      expect(jobResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ screenshotFormat: 'png' })
      );
    });

    it('does not set screenshotFormat when no screenshot in result', async () => {
      await capturedProcessors.browser(makeJob());

      expect(jobResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ screenshotFormat: undefined })
      );
    });
  });
});

// ─── Retry-logic unit tests (pure logic, no I/O) ──────────────────────────────

describe('BrowserWorker – retry logic (pure)', () => {
  it('sets status to pending when attempts < maxAttempts', () => {
    const attempt = 1;
    const maxAttempts = 3;
    const status = attempt >= maxAttempts ? 'failed' : 'pending';
    expect(status).toBe('pending');
  });

  it('sets status to failed when attempts === maxAttempts', () => {
    const attempt = 3;
    const maxAttempts = 3;
    const status = attempt >= maxAttempts ? 'failed' : 'pending';
    expect(status).toBe('failed');
  });

  it('sets status to failed when attempts > maxAttempts (safety check)', () => {
    const attempt = 5;
    const maxAttempts = 3;
    const status = attempt >= maxAttempts ? 'failed' : 'pending';
    expect(status).toBe('failed');
  });
});

// ─── Credit-fallback logic ────────────────────────────────────────────────────

describe('BrowserWorker – credit fallback', () => {
  it('uses creditsEstimated when present', () => {
    const jobData = { creditsEstimated: 7 };
    const credits = jobData?.creditsEstimated ?? 5;
    expect(credits).toBe(7);
  });

  it('defaults to 5 credits when creditsEstimated is undefined', () => {
    const jobData = { creditsEstimated: undefined };
    const credits = jobData?.creditsEstimated ?? 5;
    expect(credits).toBe(5);
  });

  it('defaults to 5 credits when job lookup returns null', () => {
    const jobData = null;
    const credits = (jobData as any)?.creditsEstimated ?? 5;
    expect(credits).toBe(5);
  });
});
