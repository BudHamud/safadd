import type { SupportedCurrency, Transaction, ExchangeRateSnapshot } from './types';

export interface CurrencyMetadata<TCode extends string = SupportedCurrency> {
  code: TCode;
  symbol: string;
  name: string;
}

export declare const SUPPORTED_CURRENCIES: readonly SupportedCurrency[];
export declare const CURRENCY_METADATA: readonly CurrencyMetadata[];
export declare const CURRENCY_METADATA_BY_CODE: Readonly<Record<SupportedCurrency, CurrencyMetadata>>;

export declare function getCurrencySymbol(currency: SupportedCurrency | string): string;

export declare function getCurrencyName(currency: SupportedCurrency | string, lang?: string): string;

export declare function getCurrencyMetadata(currency: SupportedCurrency | string, lang?: string): CurrencyMetadata<string>;

export declare function getCurrencyLabel(currency: SupportedCurrency | string, lang?: string): string;

export declare function getTransactionAmount(
  tx: Pick<Transaction, 'amount' | 'amountUSD' | 'amountARS' | 'amountILS' | 'amountEUR'>,
  currency: SupportedCurrency | string,
  snapshot?: ExchangeRateSnapshot | null,
): number;

export declare function convertAmount(
  amount: number,
  from: SupportedCurrency | string,
  to: SupportedCurrency | string,
  snapshot: ExchangeRateSnapshot
): number;

export declare function buildStoredAmountsFromSnapshot(
  amount: number,
  currency: SupportedCurrency | string,
  snapshot: ExchangeRateSnapshot
): {
  amount: number;
  amountUSD: number;
  amountARS: number;
  amountILS: number;
  amountEUR: number;
};
