import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.server.logLevel,
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'scraperx',
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
