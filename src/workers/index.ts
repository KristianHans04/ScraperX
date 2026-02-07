import { createHttpWorker, HttpWorker } from './http.worker.js';
import { createBrowserWorker, BrowserWorker } from './browser.worker.js';
import { createStealthWorker, StealthWorker } from './stealth.worker.js';
import { logger } from '../utils/logger.js';

export { HttpWorker, createHttpWorker } from './http.worker.js';
export { BrowserWorker, createBrowserWorker } from './browser.worker.js';
export { StealthWorker, createStealthWorker } from './stealth.worker.js';

export interface Workers {
  http: HttpWorker;
  browser: BrowserWorker;
  stealth: StealthWorker;
}

let workers: Workers | null = null;

/**
 * Start all workers
 */
export function startAllWorkers(): Workers {
  if (workers) {
    return workers;
  }

  const httpWorker = createHttpWorker();
  const browserWorker = createBrowserWorker();
  const stealthWorker = createStealthWorker();

  httpWorker.start();
  browserWorker.start();
  stealthWorker.start();

  workers = {
    http: httpWorker,
    browser: browserWorker,
    stealth: stealthWorker,
  };

  logger.info('All workers started');
  return workers;
}

/**
 * Stop all workers
 */
export async function stopAllWorkers(): Promise<void> {
  if (!workers) {
    return;
  }

  await Promise.all([
    workers.http.stop(),
    workers.browser.stop(),
    workers.stealth.stop(),
  ]);

  workers = null;
  logger.info('All workers stopped');
}

/**
 * Get workers (if started)
 */
export function getWorkers(): Workers | null {
  return workers;
}
