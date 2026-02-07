import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface PooledBrowser {
  browser: Browser;
  id: string;
  createdAt: number;
  lastUsedAt: number;
  pagesCreated: number;
  inUse: boolean;
}

export interface BrowserPoolOptions {
  minSize: number;
  maxSize: number;
  launchOptions?: LaunchOptions;
  maxPagesPerBrowser?: number;
  browserTTL?: number; // Time to live in ms
}

/**
 * Browser Pool Manager
 * Manages a pool of browser instances for efficient resource usage
 */
export class BrowserPool {
  private pool: Map<string, PooledBrowser> = new Map();
  private options: Required<BrowserPoolOptions>;
  private initPromise: Promise<void> | null = null;
  private closed = false;
  private idCounter = 0;

  constructor(options?: Partial<BrowserPoolOptions>) {
    this.options = {
      minSize: options?.minSize ?? config.browserEngine.poolMin,
      maxSize: options?.maxSize ?? config.browserEngine.poolMax,
      launchOptions: options?.launchOptions ?? {
        headless: config.browserEngine.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      },
      maxPagesPerBrowser: options?.maxPagesPerBrowser ?? 50,
      browserTTL: options?.browserTTL ?? 300000, // 5 minutes
    };
  }

  /**
   * Initialize the pool with minimum browsers
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    logger.info({ minSize: this.options.minSize }, 'Initializing browser pool');

    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.options.minSize; i++) {
      promises.push(this.addBrowser());
    }

    await Promise.all(promises);
    logger.info({ poolSize: this.pool.size }, 'Browser pool initialized');
  }

  /**
   * Add a new browser to the pool
   */
  private async addBrowser(): Promise<PooledBrowser> {
    if (this.closed) {
      throw new Error('Pool is closed');
    }

    const browser = await chromium.launch(this.options.launchOptions);
    const id = `browser-${++this.idCounter}`;
    
    const pooledBrowser: PooledBrowser = {
      browser,
      id,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      pagesCreated: 0,
      inUse: false,
    };

    this.pool.set(id, pooledBrowser);
    
    browser.on('disconnected', () => {
      logger.warn({ browserId: id }, 'Browser disconnected');
      this.pool.delete(id);
    });

    logger.debug({ browserId: id }, 'Browser added to pool');
    return pooledBrowser;
  }

  /**
   * Acquire a browser from the pool
   */
  async acquire(): Promise<PooledBrowser> {
    if (this.closed) {
      throw new Error('Pool is closed');
    }

    await this.initialize();

    // First, try to find an available browser
    for (const [id, pooledBrowser] of this.pool.entries()) {
      if (!pooledBrowser.inUse && pooledBrowser.browser.isConnected()) {
        // Check if browser has exceeded max pages or TTL
        if (this.shouldRecycle(pooledBrowser)) {
          await this.recycleBrowser(id);
          continue;
        }

        pooledBrowser.inUse = true;
        pooledBrowser.lastUsedAt = Date.now();
        logger.debug({ browserId: id }, 'Browser acquired from pool');
        return pooledBrowser;
      }
    }

    // No available browser, create a new one if under max
    if (this.pool.size < this.options.maxSize) {
      const browser = await this.addBrowser();
      browser.inUse = true;
      return browser;
    }

    // Wait for a browser to become available
    return this.waitForBrowser();
  }

  /**
   * Wait for a browser to become available
   */
  private async waitForBrowser(timeout = 30000): Promise<PooledBrowser> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (const [id, pooledBrowser] of this.pool.entries()) {
        if (!pooledBrowser.inUse && pooledBrowser.browser.isConnected()) {
          if (!this.shouldRecycle(pooledBrowser)) {
            pooledBrowser.inUse = true;
            pooledBrowser.lastUsedAt = Date.now();
            return pooledBrowser;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for browser');
  }

  /**
   * Release a browser back to the pool
   */
  release(pooledBrowser: PooledBrowser): void {
    if (this.pool.has(pooledBrowser.id)) {
      pooledBrowser.inUse = false;
      pooledBrowser.lastUsedAt = Date.now();
      logger.debug({ browserId: pooledBrowser.id }, 'Browser released to pool');
    }
  }

  /**
   * Check if browser should be recycled
   */
  private shouldRecycle(pooledBrowser: PooledBrowser): boolean {
    const age = Date.now() - pooledBrowser.createdAt;
    return (
      age > this.options.browserTTL ||
      pooledBrowser.pagesCreated >= this.options.maxPagesPerBrowser
    );
  }

  /**
   * Recycle a browser (close and replace)
   */
  private async recycleBrowser(id: string): Promise<void> {
    const pooledBrowser = this.pool.get(id);
    if (!pooledBrowser) return;

    this.pool.delete(id);

    try {
      await pooledBrowser.browser.close();
      logger.debug({ browserId: id }, 'Browser recycled');
    } catch (error) {
      logger.error({ error, browserId: id }, 'Error closing browser');
    }

    // Add a new browser if below minimum
    if (this.pool.size < this.options.minSize && !this.closed) {
      await this.addBrowser();
    }
  }

  /**
   * Create a new page from the pool
   */
  async createPage(contextOptions?: Parameters<Browser['newContext']>[0]): Promise<{
    page: Page;
    context: BrowserContext;
    pooledBrowser: PooledBrowser;
  }> {
    const pooledBrowser = await this.acquire();
    
    try {
      const context = await pooledBrowser.browser.newContext(contextOptions);
      const page = await context.newPage();
      pooledBrowser.pagesCreated++;

      return { page, context, pooledBrowser };
    } catch (error) {
      this.release(pooledBrowser);
      throw error;
    }
  }

  /**
   * Close a page and release the browser
   */
  async closePage(
    page: Page,
    context: BrowserContext,
    pooledBrowser: PooledBrowser
  ): Promise<void> {
    try {
      await page.close();
      await context.close();
    } catch (error) {
      logger.error({ error }, 'Error closing page/context');
    } finally {
      this.release(pooledBrowser);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    available: number;
    inUse: number;
    totalPagesCreated: number;
  } {
    let available = 0;
    let inUse = 0;
    let totalPagesCreated = 0;

    for (const browser of this.pool.values()) {
      if (browser.inUse) {
        inUse++;
      } else {
        available++;
      }
      totalPagesCreated += browser.pagesCreated;
    }

    return {
      total: this.pool.size,
      available,
      inUse,
      totalPagesCreated,
    };
  }

  /**
   * Close all browsers and the pool
   */
  async close(): Promise<void> {
    this.closed = true;
    logger.info('Closing browser pool');

    const closePromises: Promise<void>[] = [];
    for (const [id, pooledBrowser] of this.pool.entries()) {
      closePromises.push(
        pooledBrowser.browser.close().catch(error => {
          logger.error({ error, browserId: id }, 'Error closing browser');
        })
      );
    }

    await Promise.all(closePromises);
    this.pool.clear();
    logger.info('Browser pool closed');
  }
}

// Singleton pool instance
let browserPool: BrowserPool | null = null;

/**
 * Get or create the browser pool
 */
export function getBrowserPool(): BrowserPool {
  if (!browserPool) {
    browserPool = new BrowserPool();
  }
  return browserPool;
}

/**
 * Close the browser pool
 */
export async function closeBrowserPool(): Promise<void> {
  if (browserPool) {
    await browserPool.close();
    browserPool = null;
  }
}
