import { Page, BrowserContext } from 'playwright';
import { getBrowserPool, PooledBrowser } from './pool.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { TimeoutError, BlockedError, CaptchaRequiredError } from '../../utils/errors.js';
import type { EngineResult, ScrapeOptions, Cookie, ScenarioStep, ProxyConfig, BrowserFingerprint } from '../../types/index.js';

export interface BrowserEngineOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  options: ScrapeOptions;
  proxyConfig?: ProxyConfig;
  fingerprint?: BrowserFingerprint;
}

export interface BrowserEngineResult extends EngineResult {
  screenshotBuffer?: Buffer;
  pdfBuffer?: Buffer;
}

/**
 * Browser Scraping Engine using Playwright
 */
export class BrowserEngine {
  private timeout: number;

  constructor() {
    this.timeout = config.browserEngine.pageTimeoutMs;
  }

  /**
   * Execute a browser-based scrape
   */
  async execute(options: BrowserEngineOptions): Promise<BrowserEngineResult> {
    const startTime = Date.now();
    const pool = getBrowserPool();
    
    let page: Page | null = null;
    let context: BrowserContext | null = null;
    let pooledBrowser: PooledBrowser | null = null;

    try {
      // Create context options
      const contextOptions = this.buildContextOptions(options);
      
      // Get page from pool
      const result = await pool.createPage(contextOptions);
      page = result.page;
      context = result.context;
      pooledBrowser = result.pooledBrowser;

      // Set timeout
      const timeout = options.options.timeout || this.timeout;
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);

      // Set extra headers
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Set cookies if provided
      if (options.options.cookies && options.options.cookies.length > 0) {
        await this.setCookies(context, options.options.cookies, options.url);
      }

      // Navigate to URL
      const response = await page.goto(options.url, {
        waitUntil: 'domcontentloaded',
        timeout,
      });

      // Wait for additional conditions
      await this.handleWait(page, options.options);

      // Execute scenario steps
      if (options.options.scenario && options.options.scenario.length > 0) {
        await this.executeScenario(page, options.options.scenario);
      }

      // Check for blocks
      const blocked = await this.checkForBlocks(page);
      if (blocked.isBlocked) {
        if (blocked.hasCaptcha) {
          throw new CaptchaRequiredError(blocked.captchaType);
        }
        throw new BlockedError(blocked.message);
      }

      // Get content
      const content = await page.content();
      const statusCode = response?.status() || 200;
      const headers = response?.headers() || {};

      // Get cookies after navigation
      const cookies = await this.getCookies(context);

      // Extract data if requested
      let extracted: Record<string, unknown> | undefined;
      if (options.options.extract && Object.keys(options.options.extract).length > 0) {
        extracted = await this.extractData(page, options.options.extract);
      }

      // Take screenshot if requested
      let screenshotBuffer: Buffer | undefined;
      if (options.options.screenshot) {
        screenshotBuffer = await page.screenshot({
          fullPage: options.options.screenshotOptions?.fullPage ?? false,
          type: options.options.screenshotOptions?.format ?? 'png',
          quality: options.options.screenshotOptions?.quality,
        });
      }

      // Generate PDF if requested
      let pdfBuffer: Buffer | undefined;
      if (options.options.pdf) {
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
        });
      }

      const renderMs = Date.now() - startTime;

      return {
        success: statusCode >= 200 && statusCode < 400,
        statusCode,
        content,
        headers,
        cookies,
        finalUrl: page.url(),
        screenshot: screenshotBuffer,
        pdf: pdfBuffer,
        extracted,
        timing: {
          totalMs: Date.now() - startTime,
          renderMs,
        },
      };

    } catch (error) {
      const totalMs = Date.now() - startTime;
      
      if (error instanceof TimeoutError || 
          (error instanceof Error && error.name === 'TimeoutError')) {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Page load timed out after ${options.options.timeout || this.timeout}ms`,
            retryable: true,
          },
          timing: { totalMs },
        };
      }

      if (error instanceof BlockedError || error instanceof CaptchaRequiredError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
          },
          timing: { totalMs },
        };
      }

      logger.error({ error, url: options.url }, 'Browser engine error');

      return {
        success: false,
        error: {
          code: 'BROWSER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown browser error',
          retryable: true,
        },
        timing: { totalMs },
      };

    } finally {
      // Clean up
      if (page && context && pooledBrowser) {
        await pool.closePage(page, context, pooledBrowser);
      }
    }
  }

  /**
   * Build browser context options
   */
  private buildContextOptions(options: BrowserEngineOptions): Parameters<typeof getBrowserPool>['0'] extends undefined ? Record<string, unknown> : Record<string, unknown> {
    const contextOptions: Record<string, unknown> = {
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    };

    // Apply fingerprint if provided
    if (options.fingerprint) {
      contextOptions.userAgent = options.fingerprint.userAgent;
      contextOptions.locale = options.fingerprint.locale;
      contextOptions.timezoneId = options.fingerprint.timezone;
      
      if (options.fingerprint.screen) {
        contextOptions.viewport = {
          width: options.fingerprint.screen.width,
          height: options.fingerprint.screen.height,
        };
        contextOptions.deviceScaleFactor = options.fingerprint.screen.pixelRatio;
      }
    }

    // Apply device emulation
    if (options.options.device) {
      // Could use playwright devices here
      contextOptions.isMobile = options.options.device.includes('mobile');
    }

    // Apply proxy
    if (options.proxyConfig) {
      contextOptions.proxy = {
        server: `${options.proxyConfig.protocol}://${options.proxyConfig.host}:${options.proxyConfig.port}`,
        username: options.proxyConfig.username,
        password: options.proxyConfig.password,
      };
    }

    return contextOptions;
  }

  /**
   * Set cookies on context
   */
  private async setCookies(context: BrowserContext, cookies: Cookie[], url: string): Promise<void> {
    const parsedUrl = new URL(url);
    
    const playwrightCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || parsedUrl.hostname,
      path: cookie.path || '/',
      expires: cookie.expires ? cookie.expires / 1000 : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite?.toLowerCase() as 'Strict' | 'Lax' | 'None' | undefined,
    }));

    await context.addCookies(playwrightCookies);
  }

  /**
   * Get cookies from context
   */
  private async getCookies(context: BrowserContext): Promise<Cookie[]> {
    const cookies = await context.cookies();
    
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires !== -1 ? cookie.expires * 1000 : undefined,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite === 'None' || cookie.sameSite === 'Lax' || cookie.sameSite === 'Strict' 
        ? cookie.sameSite 
        : undefined,
    }));
  }

  /**
   * Handle wait conditions
   */
  private async handleWait(page: Page, options: ScrapeOptions): Promise<void> {
    // Wait for selector
    if (options.waitFor) {
      await page.waitForSelector(options.waitFor, { 
        timeout: options.timeout || this.timeout 
      });
    }

    // Wait for fixed duration
    if (options.waitMs) {
      await page.waitForTimeout(options.waitMs);
    }
  }

  /**
   * Execute scenario steps
   */
  private async executeScenario(page: Page, steps: ScenarioStep[]): Promise<void> {
    for (const step of steps) {
      const timeout = step.timeout || 30000;

      switch (step.action) {
        case 'wait_for':
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout });
          }
          break;

        case 'wait':
          await page.waitForTimeout(step.duration || 1000);
          break;

        case 'wait_for_navigation':
          await page.waitForNavigation({ timeout });
          break;

        case 'click':
          if (step.selector) {
            await page.click(step.selector, { timeout });
          }
          break;

        case 'fill':
          if (step.selector && step.value !== undefined) {
            await page.fill(step.selector, step.value, { timeout });
          }
          break;

        case 'select':
          if (step.selector && step.value !== undefined) {
            await page.selectOption(step.selector, step.value, { timeout });
          }
          break;

        case 'scroll':
          if (step.y !== undefined) {
            await page.evaluate((y) => window.scrollBy(0, y), step.y);
          }
          break;

        case 'scroll_to':
          if (step.selector) {
            await page.locator(step.selector).scrollIntoViewIfNeeded({ timeout });
          }
          break;

        case 'hover':
          if (step.selector) {
            await page.hover(step.selector, { timeout });
          }
          break;

        case 'press':
          if (step.key) {
            await page.keyboard.press(step.key);
          }
          break;

        case 'evaluate':
          if (step.script) {
            await page.evaluate(step.script);
          }
          break;

        case 'screenshot':
          // Handled separately
          break;

        default:
          logger.warn({ action: step.action }, 'Unknown scenario action');
      }
    }
  }

  /**
   * Check for blocks and captchas
   */
  private async checkForBlocks(page: Page): Promise<{
    isBlocked: boolean;
    hasCaptcha: boolean;
    captchaType?: string;
    message?: string;
  }> {
    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Check for common CAPTCHA indicators
    const captchaPatterns = [
      { pattern: /recaptcha/i, type: 'reCAPTCHA' },
      { pattern: /hcaptcha/i, type: 'hCaptcha' },
      { pattern: /cf-turnstile/i, type: 'Cloudflare Turnstile' },
      { pattern: /challenge-running/i, type: 'Cloudflare Challenge' },
      { pattern: /captcha/i, type: 'Unknown CAPTCHA' },
    ];

    for (const { pattern, type } of captchaPatterns) {
      if (pattern.test(content)) {
        return { isBlocked: true, hasCaptcha: true, captchaType: type };
      }
    }

    // Check for block indicators
    const blockPatterns = [
      /access denied/i,
      /blocked/i,
      /security check/i,
      /please verify you are human/i,
      /automated access/i,
      /rate limit/i,
      /too many requests/i,
      /forbidden/i,
    ];

    for (const pattern of blockPatterns) {
      if (pattern.test(lowerContent)) {
        return { 
          isBlocked: true, 
          hasCaptcha: false, 
          message: 'Request blocked by target site' 
        };
      }
    }

    return { isBlocked: false, hasCaptcha: false };
  }

  /**
   * Extract data using selectors
   */
  private async extractData(
    page: Page,
    extractRules: Record<string, string | string[]>
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const [key, selector] of Object.entries(extractRules)) {
      if (Array.isArray(selector)) {
        // Multiple selectors - try each until one works
        for (const sel of selector) {
          const elements = await page.locator(sel).all();
          if (elements.length > 0) {
            if (elements.length === 1) {
              result[key] = await elements[0].textContent();
            } else {
              result[key] = await Promise.all(
                elements.map(el => el.textContent())
              );
            }
            break;
          }
        }
      } else {
        const elements = await page.locator(selector).all();
        if (elements.length === 0) {
          result[key] = null;
        } else if (elements.length === 1) {
          result[key] = await elements[0].textContent();
        } else {
          result[key] = await Promise.all(
            elements.map(el => el.textContent())
          );
        }
      }
    }

    // Extract metadata
    result._metadata = {
      title: await page.title(),
      url: page.url(),
    };

    return result;
  }
}

/**
 * Create browser engine instance
 */
export function createBrowserEngine(): BrowserEngine {
  return new BrowserEngine();
}

// Singleton instance
let browserEngine: BrowserEngine | null = null;

/**
 * Get singleton browser engine instance
 */
export function getBrowserEngine(): BrowserEngine {
  if (!browserEngine) {
    browserEngine = createBrowserEngine();
  }
  return browserEngine;
}

export { getBrowserPool, closeBrowserPool } from './pool.js';
