import pino from 'pino';
import { config } from '../config/env';

const isProduction = config.nodeEnv === 'production';

export const logger = pino({
  level: config.logLevel,
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
