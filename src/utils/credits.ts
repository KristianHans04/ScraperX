import type { ScrapeOptions, CreditBreakdown, EngineType, ProxyTier } from '../types/index.js';
import { config } from '../config/index.js';

/**
 * Calculate credits for a scrape request
 */
export function calculateCredits(
  engine: EngineType,
  proxyTier: ProxyTier,
  options: Partial<ScrapeOptions>
): { total: number; breakdown: CreditBreakdown } {
  const breakdown: CreditBreakdown = {
    base: 0,
    jsRender: 0,
    premiumProxy: 0,
    mobileProxy: 0,
    captcha: 0,
    screenshot: 0,
    pdf: 0,
  };

  // Base credits by engine
  switch (engine) {
    case 'http':
      breakdown.base = config.credits.base.http;
      break;
    case 'browser':
      breakdown.base = config.credits.base.browser;
      breakdown.jsRender = 0; // Already included in browser base
      break;
    case 'stealth':
      breakdown.base = config.credits.base.stealth;
      breakdown.jsRender = 0; // Already included in stealth base
      break;
    case 'auto':
    default:
      breakdown.base = config.credits.base.http;
      // Will be adjusted based on actual engine used
      break;
  }

  // If HTTP engine but JS rendering requested, add browser cost
  if (engine === 'http' && options.renderJs) {
    breakdown.jsRender = config.credits.base.browser - config.credits.base.http;
  }

  // Proxy tier costs
  switch (proxyTier) {
    case 'residential':
      breakdown.premiumProxy = config.credits.proxy.residential;
      break;
    case 'mobile':
      breakdown.mobileProxy = config.credits.proxy.mobile;
      break;
    case 'isp':
      breakdown.premiumProxy = config.credits.proxy.isp;
      break;
    case 'datacenter':
    default:
      // No additional cost
      break;
  }

  // Feature costs
  if (options.screenshot) {
    breakdown.screenshot = config.credits.features.screenshot;
  }

  if (options.pdf) {
    breakdown.pdf = config.credits.features.pdf;
  }

  // Calculate total
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return { total, breakdown };
}

/**
 * Determine engine type from options
 */
export function determineEngine(options: Partial<ScrapeOptions>): EngineType {
  if (options.scenario && options.scenario.length > 0) {
    return 'stealth';
  }

  if (options.mobileProxy) {
    return 'stealth';
  }

  if (options.renderJs || options.waitFor || options.screenshot || options.pdf) {
    return 'browser';
  }

  return 'http';
}

/**
 * Determine proxy tier from options
 */
export function determineProxyTier(options: Partial<ScrapeOptions>): ProxyTier {
  if (options.mobileProxy) {
    return 'mobile';
  }

  if (options.premiumProxy) {
    return 'residential';
  }

  return 'datacenter';
}

/**
 * Get default scrape options
 */
export function getDefaultScrapeOptions(): ScrapeOptions {
  return {
    renderJs: false,
    timeout: config.scraping.timeoutMs,
    screenshot: false,
    pdf: false,
    premiumProxy: false,
    mobileProxy: false,
  };
}

/**
 * Merge user options with defaults
 */
export function mergeScrapeOptions(userOptions?: Partial<ScrapeOptions>): ScrapeOptions {
  const defaults = getDefaultScrapeOptions();
  if (!userOptions) {
    return defaults;
  }

  return {
    ...defaults,
    ...userOptions,
    screenshotOptions: userOptions.screenshotOptions
      ? { fullPage: false, format: 'png', ...userOptions.screenshotOptions }
      : undefined,
  };
}
