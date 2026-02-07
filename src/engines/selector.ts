import { getHttpEngine, HttpEngineResult } from './http/index.js';
import { getBrowserEngine, BrowserEngineResult } from './browser/index.js';
import { getStealthEngine, StealthEngineResult } from './stealth/index.js';
import { getProxyManager } from '../proxy/index.js';
import { generateFingerprint } from '../fingerprint/generator.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { EngineType, EngineResult, ScrapeOptions, ProxyConfig, BrowserFingerprint, ProxyTier } from '../types/index.js';

export interface EngineExecutionOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  options: ScrapeOptions;
  engine: EngineType;
  proxyTier: ProxyTier;
  proxyCountry?: string;
  proxySessionId?: string;
  fingerprint?: BrowserFingerprint;
  attempt: number;
  maxAttempts: number;
}

export interface EngineExecutionResult {
  result: EngineResult;
  engine: EngineType;
  escalated: boolean;
  attempts: number;
}

// Blocked indicators that should trigger escalation
const BLOCKED_CODES = ['BLOCKED', 'CAPTCHA_REQUIRED', 'TIMEOUT'];

// Sites that are known to require specific engines
const KNOWN_PROTECTIONS: Record<string, EngineType> = {
  'cloudflare.com': 'stealth',
  'amazon.com': 'browser',
  'linkedin.com': 'stealth',
  'google.com': 'browser',
  'facebook.com': 'stealth',
  'instagram.com': 'stealth',
  'twitter.com': 'stealth',
  'x.com': 'stealth',
};

/**
 * Engine Selector with automatic escalation
 */
export class EngineSelector {
  private httpEngine = getHttpEngine();
  private browserEngine = getBrowserEngine();
  private stealthEngine = getStealthEngine();
  private proxyManager = getProxyManager();

  /**
   * Select the best engine for a URL
   */
  selectEngine(url: string, requestedEngine: EngineType, options: ScrapeOptions): EngineType {
    // If user specifically requested an engine, use it
    if (requestedEngine !== 'auto') {
      return requestedEngine;
    }

    // Check for known protected sites
    try {
      const hostname = new URL(url).hostname;
      for (const [domain, engine] of Object.entries(KNOWN_PROTECTIONS)) {
        if (hostname.includes(domain)) {
          logger.debug({ hostname, engine }, 'Using known protection engine');
          return engine;
        }
      }
    } catch {
      // Invalid URL, will fail later
    }

    // If JS rendering is needed, use browser
    if (options.renderJs || options.waitFor || options.scenario?.length) {
      return options.mobileProxy || options.premiumProxy ? 'stealth' : 'browser';
    }

    // If screenshot or PDF is needed, use browser
    if (options.screenshot || options.pdf) {
      return 'browser';
    }

    // If premium proxy is requested, prefer stealth for better evasion
    if (options.mobileProxy) {
      return 'stealth';
    }

    // Default to HTTP for simple requests
    return 'http';
  }

  /**
   * Execute a scrape with automatic engine selection and escalation
   */
  async execute(options: EngineExecutionOptions): Promise<EngineExecutionResult> {
    let currentEngine = this.selectEngine(options.url, options.engine, options.options);
    let attempts = 0;
    let escalated = false;

    // Get proxy if needed
    let proxyConfig: ProxyConfig | undefined;
    if (options.proxyTier !== 'datacenter' || config.proxy.enabled) {
      proxyConfig = await this.proxyManager.getProxy({
        tier: options.proxyTier,
        country: options.proxyCountry,
        sessionId: options.proxySessionId,
      }) || undefined;
    }

    // Generate fingerprint for browser/stealth engines
    let fingerprint = options.fingerprint;
    if (!fingerprint && (currentEngine === 'browser' || currentEngine === 'stealth')) {
      fingerprint = generateFingerprint({
        platform: options.options.mobileProxy ? 'android' : 'windows',
        country: options.proxyCountry,
        mobile: options.options.mobileProxy,
      });
    }

    // Execution loop with escalation
    while (attempts < options.maxAttempts) {
      attempts++;

      logger.debug({
        url: options.url,
        engine: currentEngine,
        attempt: attempts,
        proxyTier: options.proxyTier,
      }, 'Executing engine');

      const result = await this.executeEngine(currentEngine, {
        ...options,
        proxyConfig,
        fingerprint,
      });

      // If successful, return
      if (result.success) {
        return {
          result,
          engine: currentEngine,
          escalated,
          attempts,
        };
      }

      // Check if we should escalate
      if (this.shouldEscalate(result, currentEngine)) {
        const nextEngine = this.getNextEngine(currentEngine);
        
        if (nextEngine && nextEngine !== currentEngine) {
          logger.info({
            url: options.url,
            fromEngine: currentEngine,
            toEngine: nextEngine,
            reason: result.error?.code,
          }, 'Escalating to next engine');

          currentEngine = nextEngine;
          escalated = true;

          // Generate fingerprint for new engine if needed
          if (!fingerprint && (currentEngine === 'browser' || currentEngine === 'stealth')) {
            fingerprint = generateFingerprint({
              platform: options.options.mobileProxy ? 'android' : 'windows',
              country: options.proxyCountry,
              mobile: options.options.mobileProxy,
            });
          }

          continue;
        }
      }

      // Check if error is retryable
      if (!result.error?.retryable || attempts >= options.maxAttempts) {
        return {
          result,
          engine: currentEngine,
          escalated,
          attempts,
        };
      }

      // Wait before retry
      const delay = this.getRetryDelay(attempts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Should not reach here
    return {
      result: {
        success: false,
        error: {
          code: 'MAX_ATTEMPTS',
          message: `Max attempts (${options.maxAttempts}) reached`,
          retryable: false,
        },
        timing: { totalMs: 0 },
      },
      engine: currentEngine,
      escalated,
      attempts,
    };
  }

  /**
   * Execute a specific engine
   */
  private async executeEngine(
    engine: EngineType,
    options: EngineExecutionOptions & { proxyConfig?: ProxyConfig; fingerprint?: BrowserFingerprint }
  ): Promise<EngineResult> {
    const engineOptions = {
      url: options.url,
      method: options.method,
      headers: options.headers,
      body: options.body,
      options: options.options,
      proxyConfig: options.proxyConfig,
      fingerprint: options.fingerprint,
    };

    switch (engine) {
      case 'http':
        return this.httpEngine.execute(engineOptions);
      
      case 'browser':
        return this.browserEngine.execute(engineOptions);
      
      case 'stealth':
        return this.stealthEngine.execute(engineOptions);
      
      case 'auto':
      default:
        // Auto should be resolved before this point
        return this.httpEngine.execute(engineOptions);
    }
  }

  /**
   * Check if we should escalate to a more capable engine
   */
  private shouldEscalate(result: EngineResult, currentEngine: EngineType): boolean {
    if (!result.error) return false;

    // Check for blocked/captcha errors
    if (BLOCKED_CODES.includes(result.error.code)) {
      return currentEngine !== 'stealth'; // Can't escalate beyond stealth
    }

    return false;
  }

  /**
   * Get the next engine in escalation order
   */
  private getNextEngine(currentEngine: EngineType): EngineType | null {
    const escalationOrder: EngineType[] = ['http', 'browser', 'stealth'];
    const currentIndex = escalationOrder.indexOf(currentEngine);

    if (currentIndex === -1 || currentIndex >= escalationOrder.length - 1) {
      return null;
    }

    return escalationOrder[currentIndex + 1];
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    const baseDelay = config.scraping.retryDelayMs;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Check engine availability
   */
  async checkEngineAvailability(): Promise<Record<EngineType, boolean>> {
    const stealthAvailable = await this.stealthEngine.isAvailable();

    return {
      auto: true,
      http: true,
      browser: true,
      stealth: stealthAvailable,
    };
  }
}

// Singleton instance
let engineSelector: EngineSelector | null = null;

/**
 * Get engine selector instance
 */
export function getEngineSelector(): EngineSelector {
  if (!engineSelector) {
    engineSelector = new EngineSelector();
  }
  return engineSelector;
}

/**
 * Quick engine execution helper
 */
export async function executeWithBestEngine(
  options: EngineExecutionOptions
): Promise<EngineExecutionResult> {
  const selector = getEngineSelector();
  return selector.execute(options);
}
