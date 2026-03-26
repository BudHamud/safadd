import type { SupportedCurrency, Transaction, ExchangeRateSnapshot } from './types';

export declare const SUPPORTED_CURRENCIES: readonly SupportedCurrency[];

export declare function getCurrencySymbol(currency: SupportedCurrency | string): string;

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
