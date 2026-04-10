// libs/common/src/logger/logger.config.ts
import * as winston      from 'winston';
import LokiTransport     from 'winston-loki';

export const winstonConfig: winston.LoggerOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new LokiTransport({
      host:   process.env.LOG_HOST ?? 'http://localhost:3100',
      labels: { app: 'curvert', env: process.env.NODE_ENV },
      json:   true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};