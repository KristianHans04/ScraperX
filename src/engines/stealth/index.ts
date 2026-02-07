import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { WorkerUnavailableError, TimeoutError, BlockedError } from '../../utils/errors.js';
import { generateFingerprint } from '../../fingerprint/generator.js';
import { formatProxyForPlaywright, getProxyManager } from '../../proxy/index.js';
import type { EngineResult, ScrapeOptions, Cookie, ProxyConfig, BrowserFingerprint } from '../../types/index.js';

export interface StealthEngineOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  options: ScrapeOptions;
  proxyConfig?: ProxyConfig;
  fingerprint?: BrowserFingerprint;
}

export interface StealthEngineResult extends EngineResult {
  screenshotBuffer?: Buffer;
  pdfBuffer?: Buffer;
}

export interface CamoufoxRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  options: {
    timeout: number;
    waitFor?: string;
    waitMs?: number;
    screenshot: boolean;
    pdf: boolean;
    extract?: Record<string, string | string[]>;
    cookies?: Cookie[];
    scenario?: unknown[];
  };
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  fingerprint?: BrowserFingerprint;
}

export interface CamoufoxResponse {
  success: boolean;
  statusCode?: number;
  content?: string;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  finalUrl?: string;
  screenshot?: string; // Base64
  pdf?: string; // Base64
  extracted?: Record<string, unknown>;
  timing?: {
    totalMs: number;
    renderMs?: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Stealth Engine using Camoufox (Python-based Firefox with anti-detection)
 */
export class StealthEngine {
  private serviceUrl: string;
  private enabled: boolean;
  private timeout: number;

  constructor() {
    this.serviceUrl = config.camoufox.serviceUrl;
    this.enabled = config.camoufox.enabled;
    this.timeout = config.scraping.timeoutMs;
  }

  /**
   * Check if stealth engine is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Execute a stealth scrape using Camoufox
   */
  async execute(options: StealthEngineOptions): Promise<StealthEngineResult> {
    const startTime = Date.now();

    if (!this.enabled) {
      return {
        success: false,
        error: {
          code: 'STEALTH_DISABLED',
          message: 'Stealth engine is not enabled',
          retryable: false,
        },
        timing: { totalMs: Date.now() - startTime },
      };
    }

    // Generate fingerprint if not provided
    const fingerprint = options.fingerprint || generateFingerprint({
      platform: options.options.mobileProxy ? 'android' : 'windows',
      country: options.options.country,
      mobile: options.options.mobileProxy,
    });

    // Get proxy if needed
    let proxyConfig = options.proxyConfig;
    if (!proxyConfig && (options.options.premiumProxy || options.options.mobileProxy)) {
      const proxyManager = getProxyManager();
      const proxyTier = options.options.mobileProxy ? 'mobile' : 'residential';
      proxyConfig = await proxyManager.getProxy({
        tier: proxyTier,
        country: options.options.country,
        sessionId: options.options.sessionId,
      }) || undefined;
    }

    try {
      // Build request for Camoufox service
      const camoufoxRequest: CamoufoxRequest = {
        url: options.url,
        method: options.method || 'GET',
        headers: {
          ...fingerprint.headers,
          ...options.headers,
        },
        body: options.body,
        options: {
          timeout: options.options.timeout || this.timeout,
          waitFor: options.options.waitFor,
          waitMs: options.options.waitMs,
          screenshot: options.options.screenshot,
          pdf: options.options.pdf,
          extract: options.options.extract,
          cookies: options.options.cookies,
          scenario: options.options.scenario,
        },
        fingerprint,
      };

      // Add proxy if available
      if (proxyConfig) {
        camoufoxRequest.proxy = formatProxyForPlaywright(proxyConfig);
      }

      // Call Camoufox service
      const response = await this.callCamoufoxService(camoufoxRequest);

      // Convert base64 buffers if present
      let screenshotBuffer: Buffer | undefined;
      let pdfBuffer: Buffer | undefined;

      if (response.screenshot) {
        screenshotBuffer = Buffer.from(response.screenshot, 'base64');
      }

      if (response.pdf) {
        pdfBuffer = Buffer.from(response.pdf, 'base64');
      }

      const totalMs = Date.now() - startTime;

      if (response.success) {
        return {
          success: true,
          statusCode: response.statusCode,
          content: response.content,
          headers: response.headers,
          cookies: response.cookies,
          finalUrl: response.finalUrl,
          screenshot: screenshotBuffer,
          pdf: pdfBuffer,
          extracted: response.extracted,
          timing: {
            totalMs,
            renderMs: response.timing?.renderMs,
          },
        };
      } else {
        return {
          success: false,
          statusCode: response.statusCode,
          error: response.error || {
            code: 'STEALTH_ERROR',
            message: 'Stealth scrape failed',
            retryable: true,
          },
          timing: { totalMs },
        };
      }

    } catch (error) {
      const totalMs = Date.now() - startTime;
      logger.error({ error, url: options.url }, 'Stealth engine error');

      if (error instanceof WorkerUnavailableError) {
        return {
          success: false,
          error: {
            code: 'STEALTH_UNAVAILABLE',
            message: 'Stealth service unavailable',
            retryable: true,
          },
          timing: { totalMs },
        };
      }

      return {
        success: false,
        error: {
          code: 'STEALTH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
        timing: { totalMs },
      };
    }
  }

  /**
   * Call the Camoufox service
   */
  private async callCamoufoxService(request: CamoufoxRequest): Promise<CamoufoxResponse> {
    const timeout = request.options.timeout + 30000; // Extra time for service overhead

    try {
      const response = await fetch(`${this.serviceUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new WorkerUnavailableError('Camoufox service unavailable');
        }
        const errorText = await response.text();
        throw new Error(`Camoufox service error: ${response.status} - ${errorText}`);
      }

      return await response.json() as CamoufoxResponse;

    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new TimeoutError(timeout);
      }
      throw error;
    }
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<{ healthy: boolean; workers?: number; queueSize?: number }> {
    if (!this.enabled) {
      return { healthy: false };
    }

    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { healthy: false };
      }

      const data = await response.json() as { workers?: number; queueSize?: number };
      return {
        healthy: true,
        workers: data.workers,
        queueSize: data.queueSize,
      };
    } catch {
      return { healthy: false };
    }
  }
}

/**
 * Create stealth engine instance
 */
export function createStealthEngine(): StealthEngine {
  return new StealthEngine();
}

// Singleton instance
let stealthEngine: StealthEngine | null = null;

/**
 * Get singleton stealth engine instance
 */
export function getStealthEngine(): StealthEngine {
  if (!stealthEngine) {
    stealthEngine = createStealthEngine();
  }
  return stealthEngine;
}
