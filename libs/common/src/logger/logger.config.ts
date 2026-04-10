import * as winston  from 'winston';
import LokiTransport from 'winston-loki';

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple(),
  ),
});

export function createWinstonConfig(app: string): winston.LoggerOptions {
  return {
    transports: [
      consoleTransport,
      new LokiTransport({
        host:   process.env.LOG_HOST ?? 'http://localhost:3100',
        labels: { app, env: process.env.NODE_ENV },
        json:   true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}
