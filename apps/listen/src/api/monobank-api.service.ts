import { Injectable, Logger } from "@nestjs/common";
import { ExchangeProvider, IExchangeRate } from '@app/common/exchange';

@Injectable()
export class MonobankApiService implements ExchangeProvider {
  private readonly logger = new Logger(MonobankApiService.name);

  async getRates(): Promise<IExchangeRate[]> {
    try {
      this.logger.log('Fetching rates from Monobank...');

      const res = await fetch('https://api.monobank.ua/bank/currency');

      if (!res.ok) {
        throw new Error(`Monobank fetch failed: ${res.status}`);
      }

      const rates = await res.json();
      this.logger.log(`Fetched ${rates.length} rates`);

      return rates
      .map(r => ({
        currencyA: r.currencyCodeA,
        currencyB: r.currencyCodeB,
        rateBuy:   r.rateBuy,
        rateSell:  r.rateSell,
        rateCross: r.rateCross,
        updatedAt: r.date,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch rates from Monobank', {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }
}
