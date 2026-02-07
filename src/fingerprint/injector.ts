import { Page, BrowserContext } from 'playwright';
import { logger } from '../utils/logger.js';
import type { BrowserFingerprint } from '../types/index.js';

/**
 * Inject fingerprint into a Playwright page
 */
export async function injectFingerprint(
  page: Page,
  fingerprint: BrowserFingerprint
): Promise<void> {
  // Inject fingerprint before any page scripts run
  await page.addInitScript((fp) => {
    // Override navigator properties
    const navigatorOverrides: Record<string, unknown> = {
      platform: fp.navigator.platform,
      language: fp.navigator.language,
      languages: Object.freeze(fp.navigator.languages),
      hardwareConcurrency: fp.navigator.hardwareConcurrency,
      deviceMemory: fp.navigator.deviceMemory,
      maxTouchPoints: fp.navigator.maxTouchPoints,
      vendor: fp.navigator.vendor,
      appVersion: fp.navigator.appVersion,
    };

    for (const [key, value] of Object.entries(navigatorOverrides)) {
      try {
        Object.defineProperty(navigator, key, {
          get: () => value,
          configurable: true,
        });
      } catch {
        // Property may not be configurable
      }
    }

    // Override screen properties
    const screenOverrides: Record<string, unknown> = {
      width: fp.screen.width,
      height: fp.screen.height,
      availWidth: fp.screen.availWidth,
      availHeight: fp.screen.availHeight,
      colorDepth: fp.screen.colorDepth,
      pixelDepth: fp.screen.colorDepth,
    };

    for (const [key, value] of Object.entries(screenOverrides)) {
      try {
        Object.defineProperty(screen, key, {
          get: () => value,
          configurable: true,
        });
      } catch {
        // Property may not be configurable
      }
    }

    // Override devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => fp.screen.pixelRatio,
      configurable: true,
    });

    // Override WebGL
    const getParameterOriginal = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
      const VENDOR = 0x1F00;
      const RENDERER = 0x1F01;
      const VERSION = 0x1F02;
      const SHADING_LANGUAGE_VERSION = 0x8B8C;
      const UNMASKED_VENDOR_WEBGL = 0x9245;
      const UNMASKED_RENDERER_WEBGL = 0x9246;

      if (parameter === VENDOR || parameter === UNMASKED_VENDOR_WEBGL) {
        return fp.webgl.vendor;
      }
      if (parameter === RENDERER || parameter === UNMASKED_RENDERER_WEBGL) {
        return fp.webgl.renderer;
      }
      if (parameter === VERSION) {
        return fp.webgl.version;
      }
      if (parameter === SHADING_LANGUAGE_VERSION) {
        return 'WebGL GLSL ES 3.00';
      }

      return getParameterOriginal.call(this, parameter);
    };

    // WebGL2
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const getParameter2Original = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter: number) {
        const VENDOR = 0x1F00;
        const RENDERER = 0x1F01;
        const VERSION = 0x1F02;
        const UNMASKED_VENDOR_WEBGL = 0x9245;
        const UNMASKED_RENDERER_WEBGL = 0x9246;

        if (parameter === VENDOR || parameter === UNMASKED_VENDOR_WEBGL) {
          return fp.webgl.vendor;
        }
        if (parameter === RENDERER || parameter === UNMASKED_RENDERER_WEBGL) {
          return fp.webgl.renderer;
        }
        if (parameter === VERSION) {
          return fp.webgl.version;
        }

        return getParameter2Original.call(this, parameter);
      };
    }

    // Add canvas noise
    const canvasNoiseSeed = fp.canvasNoiseSeed;
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;

    // Seeded random for consistent noise
    const seededRandom = (seed: string) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash;
      }
      return () => {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        return (hash / 0x7fffffff) * 2 - 1; // -1 to 1
      };
    };

    const random = seededRandom(canvasNoiseSeed);

    HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: unknown) {
      const context = this.getContext('2d');
      if (context) {
        try {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          
          // Add subtle noise
          for (let i = 0; i < data.length; i += 4) {
            const noise = random() * 2; // Very subtle noise
            data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
          }
          
          context.putImageData(imageData, 0, 0);
        } catch {
          // Canvas may be tainted
        }
      }
      return originalToDataURL.call(this, type, quality);
    };

    HTMLCanvasElement.prototype.toBlob = function(callback, type?, quality?) {
      const context = this.getContext('2d');
      if (context) {
        try {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const noise = random() * 2;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
          }
          
          context.putImageData(imageData, 0, 0);
        } catch {
          // Canvas may be tainted
        }
      }
      return originalToBlob.call(this, callback, type, quality);
    };

    // Override AudioContext for audio fingerprint
    const audioNoiseSeed = fp.audioNoiseSeed;
    const audioRandom = seededRandom(audioNoiseSeed);

    if (typeof AudioContext !== 'undefined') {
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.call(this);
        const originalConnect = oscillator.connect.bind(oscillator);
        
        oscillator.connect = function(destination: AudioNode, ...args: unknown[]) {
          // Add slight frequency variation
          if (oscillator.frequency && oscillator.frequency.value) {
            oscillator.frequency.value *= 1 + (audioRandom() * 0.0001);
          }
          return originalConnect(destination, ...args as [number?, number?]);
        };
        
        return oscillator;
      };
    }

    // Override Date.prototype.getTimezoneOffset for timezone
    const targetTimezone = fp.timezone;
    
    // This is a simplified timezone override
    // Full implementation would need proper timezone database
    const timezoneOffsets: Record<string, number> = {
      'America/New_York': 300,
      'America/Chicago': 360,
      'America/Denver': 420,
      'America/Los_Angeles': 480,
      'Europe/London': 0,
      'Europe/Berlin': -60,
      'Europe/Paris': -60,
      'Asia/Tokyo': -540,
      'Asia/Shanghai': -480,
      'Australia/Sydney': -660,
    };

    const offset = timezoneOffsets[targetTimezone] ?? 300;
    Date.prototype.getTimezoneOffset = function() {
      return offset;
    };

    // Override Intl.DateTimeFormat for timezone
    const originalDateTimeFormat = Intl.DateTimeFormat;
    // @ts-expect-error - Overriding constructor
    Intl.DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const opts = { ...options, timeZone: options?.timeZone || targetTimezone };
      return new originalDateTimeFormat(locales, opts);
    };
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

    // Prevent webdriver detection
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true,
    });

    // Override permissions
    const originalQuery = navigator.permissions?.query?.bind(navigator.permissions);
    if (originalQuery) {
      navigator.permissions.query = async (permissionDesc: PermissionDescriptor) => {
        if (permissionDesc.name === 'notifications') {
          return { state: 'prompt', onchange: null } as PermissionStatus;
        }
        return originalQuery(permissionDesc);
      };
    }

    // Remove automation indicators
    delete (window as Record<string, unknown>).cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete (window as Record<string, unknown>).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete (window as Record<string, unknown>).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    delete (document as Record<string, unknown>).__selenium_evaluate;
    delete (document as Record<string, unknown>).__selenium_unwrapped;
    delete (document as Record<string, unknown>).__webdriver_evaluate;
    delete (document as Record<string, unknown>).__driver_evaluate;
    delete (document as Record<string, unknown>).__webdriver_unwrapped;
    delete (document as Record<string, unknown>).__driver_unwrapped;
    delete (document as Record<string, unknown>).__fxdriver_evaluate;
    delete (document as Record<string, unknown>).__fxdriver_unwrapped;

    // Add plugins array (Chrome specific)
    if (navigator.plugins.length === 0) {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];

      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const pluginArray = plugins.map(p => ({
            ...p,
            length: 1,
            item: () => null,
            namedItem: () => null,
            [Symbol.iterator]: function* () { yield this; },
          }));
          (pluginArray as unknown as { item: () => null; namedItem: () => null; refresh: () => void }).item = () => null;
          (pluginArray as unknown as { namedItem: () => null }).namedItem = () => null;
          (pluginArray as unknown as { refresh: () => void }).refresh = () => {};
          return pluginArray;
        },
        configurable: true,
      });
    }

    console.debug('[Fingerprint] Browser fingerprint injected');
  }, fingerprint);

  logger.debug({ fingerprintId: fingerprint.id }, 'Fingerprint injected into page');
}

/**
 * Apply fingerprint settings to browser context
 */
export async function applyFingerprintToContext(
  context: BrowserContext,
  fingerprint: BrowserFingerprint
): Promise<void> {
  // Set timezone
  // Note: Playwright doesn't have a direct method for this after context creation
  // The timezone is typically set during context creation

  // Add init script to all pages in context
  await context.addInitScript((fp) => {
    // This is a simplified version - the full injection is done per-page
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true,
    });
  }, fingerprint);

  logger.debug({ fingerprintId: fingerprint.id }, 'Fingerprint applied to context');
}

/**
 * Get browser context options from fingerprint
 */
export function getFingerprintContextOptions(fingerprint: BrowserFingerprint): Record<string, unknown> {
  return {
    userAgent: fingerprint.userAgent,
    viewport: {
      width: fingerprint.screen.width,
      height: fingerprint.screen.height,
    },
    deviceScaleFactor: fingerprint.screen.pixelRatio,
    locale: fingerprint.locale,
    timezoneId: fingerprint.timezone,
    extraHTTPHeaders: fingerprint.headers,
  };
}

/**
 * Validate that fingerprint was properly injected
 */
export async function validateFingerprintInjection(page: Page, fingerprint: BrowserFingerprint): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const injectedValues = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      webdriver: (navigator as Navigator & { webdriver?: boolean }).webdriver,
      screenWidth: screen.width,
      screenHeight: screen.height,
    }));

    if (injectedValues.userAgent !== fingerprint.userAgent) {
      errors.push(`User agent mismatch: expected ${fingerprint.userAgent}, got ${injectedValues.userAgent}`);
    }

    if (injectedValues.platform !== fingerprint.navigator.platform) {
      errors.push(`Platform mismatch: expected ${fingerprint.navigator.platform}, got ${injectedValues.platform}`);
    }

    if (injectedValues.webdriver !== false) {
      errors.push('Webdriver flag not properly hidden');
    }

    if (injectedValues.screenWidth !== fingerprint.screen.width) {
      errors.push(`Screen width mismatch: expected ${fingerprint.screen.width}, got ${injectedValues.screenWidth}`);
    }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
