export type SupportedCurrency =
  | 'ILS' | 'USD' | 'ARS' | 'EUR'
  | 'GBP' | 'JPY' | 'CNY' | 'CAD' | 'AUD' | 'CHF'
  | 'HKD' | 'SGD' | 'SEK' | 'NOK' | 'DKK' | 'NZD'
  | 'MXN' | 'BRL' | 'INR' | 'KRW' | 'SAR' | 'AED'
  | 'TRY' | 'ZAR' | 'PLN' | 'CZK' | 'HUF'
  | 'CLP' | 'COP' | 'PEN' | 'UYU' | 'PYG' | 'BOB';
export type TransactionType = 'income' | 'expense';

/** Unified Transaction shape — superset of web and mobile fields. */
export interface Transaction {
  id: string;
  /** Internal user ID from the User table (mobile-side). */
  userId?: string;
  desc: string;
  amount: number;
  amountUSD?: number | null;
  amountARS?: number | null;
  amountILS?: number | null;
  amountEUR?: number | null;
  tag: string;
  icon: string;
  type: TransactionType;
  date: string;
  details?: string | null;
  excludeFromBudget?: boolean;
  goalType?: string;
  isCancelled?: boolean;
  periodicity?: number | null;
  paymentMethod?: string | null;
  cardDigits?: string | null;
  createdAt?: string;
}

/** Exchange rate snapshot returned by the /api/exchange-rates endpoint. */
export interface ExchangeRateSnapshot {
  rates: Record<string, number>;
  usdToArs: number;
}

export interface MovementFilters {
  month: number;
  year: number;
  type: TransactionType | 'all';
  tag: string | null;
  search: string;
}

export interface MonthStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface SpendingTrendPoint {
  label: string;
  income: number;
  expense: number;
}
