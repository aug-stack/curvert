export class CurrencyNotFoundException extends Error {
  constructor(code: number) {
    super(`Currency not found: ${code}`);
  }
}

export class RateUnavailableException extends Error {
  constructor(from: number, to: number) {
    super(`Rate unavailable for pair: ${from}→${to}`);
  }
}