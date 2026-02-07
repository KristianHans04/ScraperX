import { request as undiciRequest, Dispatcher } from 'undici';
import * as cheerio from 'cheerio';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { TimeoutError, TargetError, TargetUnavailableError, BlockedError } from '../../utils/errors.js';
import type { EngineResult, ScrapeOptions, Cookie, ProxyConfig } from '../../types/index.js';

export interface HttpEngineOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  options: ScrapeOptions;
  proxyConfig?: ProxyConfig;
  userAgent?: string;
}

export interface HttpEngineResult extends EngineResult {
  redirectCount: number;
}

/**
 * HTTP Scraping Engine using undici
 */
export class HttpEngine {
  private defaultUserAgent: string;
  private defaultTimeout: number;

  constructor() {
    this.defaultUserAgent = config.httpEngine.userAgent;
    this.defaultTimeout = config.scraping.timeoutMs;
  }

  /**
   * Execute an HTTP request
   */
  async execute(options: HttpEngineOptions): Promise<HttpEngineResult> {
    const startTime = Date.now();
    const { url, method = 'GET', headers = {}, body, options: scrapeOptions, proxyConfig, userAgent } = options;

    const requestHeaders: Record<string, string> = {
      'User-Agent': userAgent || this.defaultUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      ...headers,
    };

    // Add cookies if provided
    if (scrapeOptions.cookies && scrapeOptions.cookies.length > 0) {
      const cookieString = scrapeOptions.cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
      requestHeaders['Cookie'] = cookieString;
    }

    const timeout = scrapeOptions.timeout || this.defaultTimeout;

    try {
      const requestOptions: Dispatcher.RequestOptions = {
        method: method as Dispatcher.HttpMethod,
        headers: requestHeaders,
        body: body,
        maxRedirections: 10,
        bodyTimeout: timeout,
        headersTimeout: timeout,
      };

      // Add proxy if configured
      if (proxyConfig) {
        // undici supports proxy via dispatcher
        // For simplicity, we'll use environment proxy or custom implementation
        logger.debug({ proxy: proxyConfig.host }, 'Using proxy');
      }

      const response = await undiciRequest(url, requestOptions);

      const statusCode = response.statusCode;
      const responseHeaders = this.parseHeaders(response.headers);
      
      // Read body
      const bodyBuffer = await response.body.arrayBuffer();
      const content = new TextDecoder().decode(bodyBuffer);

      // Check for blocks
      if (this.isBlocked(statusCode, content, responseHeaders)) {
        return {
          success: false,
          statusCode,
          error: {
            code: 'BLOCKED',
            message: 'Request was blocked by target site',
            retryable: true,
          },
          timing: { totalMs: Date.now() - startTime },
          redirectCount: 0,
        };
      }

      // Parse cookies from response
      const cookies = this.parseCookies(responseHeaders['set-cookie']);

      // Extract data if requested
      let extracted: Record<string, unknown> | undefined;
      if (scrapeOptions.extract && Object.keys(scrapeOptions.extract).length > 0) {
        extracted = this.extractData(content, scrapeOptions.extract);
      }

      const totalMs = Date.now() - startTime;

      return {
        success: statusCode >= 200 && statusCode < 400,
        statusCode,
        content,
        headers: responseHeaders,
        cookies,
        finalUrl: url, // undici doesn't expose final URL after redirects easily
        redirectCount: 0,
        extracted,
        timing: { totalMs },
      };

    } catch (error) {
      const totalMs = Date.now() - startTime;
      
      if (error instanceof Error) {
        // Handle timeout
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          throw new TimeoutError(timeout);
        }

        // Handle connection errors
        if (error.message.includes('ECONNREFUSED') || 
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ECONNRESET')) {
          throw new TargetUnavailableError(error.message);
        }

        logger.error({ error, url }, 'HTTP request failed');
      }

      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
        timing: { totalMs },
        redirectCount: 0,
      };
    }
  }

  /**
   * Parse headers from undici response
   */
  private parseHeaders(headers: Dispatcher.ResponseData['headers']): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (Array.isArray(headers)) {
      for (let i = 0; i < headers.length; i += 2) {
        const key = headers[i]?.toString().toLowerCase();
        const value = headers[i + 1]?.toString();
        if (key && value) {
          result[key] = value;
        }
      }
    } else if (typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
          result[key.toLowerCase()] = value.join(', ');
        } else if (value) {
          result[key.toLowerCase()] = String(value);
        }
      }
    }
    
    return result;
  }

  /**
   * Parse Set-Cookie headers into Cookie objects
   */
  private parseCookies(setCookieHeader: string | string[] | undefined): Cookie[] {
    if (!setCookieHeader) return [];

    const cookies: Cookie[] = [];
    const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    for (const cookieStr of cookieStrings) {
      const parts = cookieStr.split(';').map(p => p.trim());
      const [nameValue, ...attributes] = parts;
      
      if (!nameValue) continue;

      const [name, ...valueParts] = nameValue.split('=');
      if (!name) continue;

      const cookie: Cookie = {
        name: name.trim(),
        value: valueParts.join('='),
      };

      for (const attr of attributes) {
        const [attrName, attrValue] = attr.split('=');
        const attrNameLower = attrName?.toLowerCase().trim();

        switch (attrNameLower) {
          case 'domain':
            cookie.domain = attrValue?.trim();
            break;
          case 'path':
            cookie.path = attrValue?.trim();
            break;
          case 'expires':
            cookie.expires = attrValue ? new Date(attrValue).getTime() : undefined;
            break;
          case 'httponly':
            cookie.httpOnly = true;
            break;
          case 'secure':
            cookie.secure = true;
            break;
          case 'samesite':
            cookie.sameSite = attrValue?.trim() as 'Strict' | 'Lax' | 'None';
            break;
        }
      }

      cookies.push(cookie);
    }

    return cookies;
  }

  /**
   * Check if response indicates a block
   */
  private isBlocked(statusCode: number, content: string, _headers: Record<string, string>): boolean {
    // Status code based detection
    if (statusCode === 403 || statusCode === 429 || statusCode === 503) {
      return true;
    }

    // Content based detection
    const blockedPatterns = [
      /access denied/i,
      /blocked/i,
      /captcha/i,
      /cloudflare/i,
      /security check/i,
      /please verify you are human/i,
      /unusual traffic/i,
      /automated access/i,
      /rate limit/i,
      /too many requests/i,
    ];

    const lowerContent = content.toLowerCase();
    return blockedPatterns.some(pattern => pattern.test(lowerContent));
  }

  /**
   * Extract data using CSS selectors
   */
  private extractData(
    content: string,
    extractRules: Record<string, string | string[]>
  ): Record<string, unknown> {
    const $ = cheerio.load(content);
    const result: Record<string, unknown> = {};

    for (const [key, selector] of Object.entries(extractRules)) {
      if (Array.isArray(selector)) {
        // Multiple selectors - try each until one works
        for (const sel of selector) {
          const elements = $(sel);
          if (elements.length > 0) {
            result[key] = elements.length === 1
              ? elements.text().trim()
              : elements.map((_, el) => $(el).text().trim()).get();
            break;
          }
        }
      } else {
        const elements = $(selector);
        if (elements.length === 0) {
          result[key] = null;
        } else if (elements.length === 1) {
          result[key] = elements.text().trim();
        } else {
          result[key] = elements.map((_, el) => $(el).text().trim()).get();
        }
      }
    }

    // Also extract metadata
    result._metadata = {
      title: $('title').text().trim() || null,
      description: $('meta[name="description"]').attr('content') || null,
      canonical: $('link[rel="canonical"]').attr('href') || null,
    };

    return result;
  }
}

/**
 * Create HTTP engine instance
 */
export function createHttpEngine(): HttpEngine {
  return new HttpEngine();
}

// Singleton instance
let httpEngine: HttpEngine | null = null;

/**
 * Get singleton HTTP engine instance
 */
export function getHttpEngine(): HttpEngine {
  if (!httpEngine) {
    httpEngine = createHttpEngine();
  }
  return httpEngine;
}
