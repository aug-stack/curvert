import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrencyNotFoundException, RateUnavailableException } from './app.exceptions';
import { IExchangeRate } from '@app/common/exchange';
import Redis from 'ioredis';
import Decimal from 'decimal.js';


@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  private readonly baseCurrency;

  constructor(
    @Inject('CACHE_SERVICE') private readonly redisClient: Redis,
    private readonly configService: ConfigService
  ) {
    Decimal.set({ rounding: Decimal.ROUND_DOWN })
    this.baseCurrency = this.configService.getOrThrow<number>('BASE_CURRENCY');
  }

  async getExchangeRate(from: number, to: number, amount: string): Promise<string> {
    this.logger.log(`Calculating exchange rate from ${from} to ${to} for amount ${amount}`);
    if (from === to) return this.calculatePriceAmount(amount, '1');

    const rateKey = `rate:${from}:${to}`;

    try {
      const rateCached = await this.redisClient.get(rateKey);
      if (rateCached) return this.calculatePriceAmount(amount, rateCached);
    } catch (err) {
      this.logger.error(`Redis GET(${rateKey}) failed, falling through to raw rates`, err);
    }
    this.logger.log('Cache miss, fetching raw rates');

    let rate: Decimal;

    if (to === this.baseCurrency) {
      rate = await this.getDirectRateToBase(from);
    } else if (from === this.baseCurrency) {
      rate = await this.getDirectRateFromBase(to);
    } else {
      rate = await this.getCrossRate(from, to);
    }

    await this.redisClient.set(rateKey, rate.toString(), 'EX', 60);

    return this.calculatePriceAmount(amount, rate.toString());
  }

  private async getDirectRateToBase(from: number): Promise<Decimal> {
    this.logger.log('Direct pair to base currency, fetching raw rate');

    const raw = await this.redisClient.get(`raw:${from}:${this.baseCurrency}`);
    if (!raw) throw new CurrencyNotFoundException(from);

    const parsed = JSON.parse(raw) as IExchangeRate;

    const rateValue = parsed.rateBuy ?? parsed.rateCross;
    if (!rateValue) throw new RateUnavailableException(from, this.baseCurrency)

    return new Decimal(rateValue);
  }

  private async getDirectRateFromBase(to: number): Promise<Decimal> {
    this.logger.log('Direct pair from base currency, fetching raw rate');
    // direto invertido — ex: 980:840, 980:978
    const raw = await this.redisClient.get(`raw:${to}:${this.baseCurrency}`);
    if (!raw) throw new CurrencyNotFoundException(to);

    const parsed = JSON.parse(raw) as IExchangeRate;

    const rateValue = parsed.rateBuy ?? parsed.rateCross;
    if (!rateValue) throw new RateUnavailableException(this.baseCurrency, to)

    return new Decimal(1).div(rateValue);
  }

  private async getCrossRate(from: number, to: number): Promise<Decimal> {
    this.logger.log('No direct pair, fetching both raw rates for cross calculation');
    // ponte via UAH — ex: 840:978, 36:978
    const [rawFrom, rawTo] = await this.redisClient.mget(
      `raw:${from}:${this.baseCurrency}`,
      `raw:${to}:${this.baseCurrency}`
    );

    if (!rawFrom) throw new CurrencyNotFoundException(from);
    if (!rawTo) throw new CurrencyNotFoundException(to);

    return this.calculateRate(JSON.parse(rawFrom), JSON.parse(rawTo));
  }

  private calculatePriceAmount(amount: string, rate: string): string {
    return new Decimal(amount).mul(rate).toFixed(2);
  }

  private calculateRate(rawFrom: IExchangeRate, rawTo: IExchangeRate): Decimal {
    const fromRate = rawFrom.rateBuy ?? rawFrom.rateCross;
    const toRate = rawTo.rateSell ?? rawTo.rateCross;

    if (fromRate == null || toRate == null) {
      throw new RateUnavailableException(
        rawFrom.currencyA ?? 'unknown',
        rawTo.currencyA ?? 'unknown'
      );
    }

    return new Decimal(fromRate).div(new Decimal(toRate));
  }

}
