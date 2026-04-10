import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { MonobankApiService } from './api/monobank-api.service';

@Injectable()
export class ListenService {
  private readonly logger = new Logger(ListenService.name);
  private readonly UAH = parseInt(process.env.BASE_CURRENCY as string, 10);

  constructor(
    @Inject('CACHE_SERVICE') private readonly redisClient: Redis,
    private readonly monobankApiService: MonobankApiService,
  ) { this.sync() }

  
  @Cron(CronExpression.EVERY_MINUTE)
  async sync(): Promise<void> {
    try {
      this.logger.log('Syncing rates...');

      const rates = await this.monobankApiService.getRates();

      const uahRates = rates.filter((rate) => {
        const valid = rate.currencyB === this.UAH;
        if (!valid) this.logger.warn(`Skipping unexpected pair: ${rate.currencyA}:${rate.currencyB}`);
        return valid;
      });

      const pipeline = this.redisClient.pipeline();

      for (const {currencyA, currencyB, rateBuy, rateSell, rateCross, updatedAt } of uahRates) {
        pipeline.set(
          `raw:${currencyA}:${currencyB}`,
          JSON.stringify({ rateBuy, rateSell, rateCross, updatedAt }),
        );
      }

      await pipeline.exec();
      this.logger.log(`Synced ${uahRates.length} UAH rates`);
    } catch (err) {
      this.logger.error('Failed to sync rates', err instanceof Error ? err.stack : err);
    }
  }

}