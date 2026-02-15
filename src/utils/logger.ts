import pino from 'pino';
import { config } from '../config/index.js';

// Create simple logger without pino-pretty transport to avoid tsx compatibility issues
export const logger = pino({
  level: config.server.logLevel,
  base: {
    service: 'scrapifie',
    version: '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

export default logger;
