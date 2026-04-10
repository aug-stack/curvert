export interface IExchangeRate {
  currencyA: number;  // ISO 4217
  currencyB: number;  // ISO 4217
  rateBuy?:  string;  // rate at which the bank buys currencyA (customer sells)
  rateSell?: string;  // rate at which the bank sells currencyA (customer buys)
  rateCross?: string; // pair without liquidity, calculated based on other pairs
  updatedAt: number;  // unix timestamp
}

export interface ExchangeProvider {
  getRates(): Promise<IExchangeRate[]>;
}