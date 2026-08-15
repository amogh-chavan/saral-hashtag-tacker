import pino from 'pino';

// Note: logger intentionally reads process.env directly.
// Importing from config/env would create a circular dependency:
// env.ts → secrets.ts → logger.ts → env.ts
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In development, use pino-pretty for readable logs.
  // In production, log raw JSON for DataDog/CloudWatch.
  ...(isProduction ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
});
