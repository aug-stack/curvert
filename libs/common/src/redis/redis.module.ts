import { DynamicModule, Global, Logger, Module } from "@nestjs/common";
import Redis from 'ioredis';

export interface RedisModuleOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  maxRetries?: number;
}

@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const {
      host       = process.env.REDIS_HOST     ?? 'localhost',
      port       = Number(process.env.REDIS_PORT ?? 6379),
      username   = process.env.REDIS_USERNAME  ?? undefined,
      password   = process.env.REDIS_PASSWORD  ?? undefined,
      maxRetries = 10,
    } = options;

    return {
      module: RedisModule,
      providers: [
        {
          provide: 'CACHE_SERVICE',
          useFactory: () => {
            const logger = new Logger('RedisModule');

            const client = new Redis({
              host,
              port,
              username,
              password,
              retryStrategy(times) {
                if (times > maxRetries) {
                  logger.error(`Redis max retries (${maxRetries}) reached — shutting down`);
                  process.exit(1);
                }
                logger.warn(`Redis reconnecting... attempt ${times}`);
                return Math.min(times * 200, 2000);
              },
            });

            client.on('connect',      () => logger.log('Redis connected'));
            client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
            client.on('error',   (err) => logger.error('Redis error', err.stack));

            return client;
          },
        },
      ],
      exports: ['CACHE_SERVICE'],
    };
  }
}