export type SupportedCurrency =
  // G10 & major
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD' | 'SEK' | 'NOK' | 'DKK'
  // Latin America
  | 'ARS' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU' | 'PYG' | 'BOB'
  | 'CRC' | 'GTQ' | 'HNL' | 'NIO' | 'PAB' | 'DOP' | 'JMD' | 'TTD' | 'GYD' | 'SRD'
  | 'BBD' | 'BSD' | 'BMD' | 'KYD' | 'AWG' | 'ANG' | 'CUP' | 'HTG' | 'BZD'
  // Europe
  | 'PLN' | 'CZK' | 'HUF' | 'RON' | 'BGN' | 'HRK' | 'RSD' | 'MKD' | 'ALL' | 'BAM'
  | 'MDL' | 'ISK' | 'UAH' | 'RUB' | 'BYN' | 'GEL' | 'AMD' | 'AZN'
  // Middle East
  | 'ILS' | 'AED' | 'SAR' | 'KWD' | 'BHD' | 'QAR' | 'OMR' | 'JOD' | 'TRY' | 'IQD'
  | 'LBP' | 'YER'
  // Asia
  | 'CNY' | 'HKD' | 'TWD' | 'KRW' | 'SGD' | 'MYR' | 'THB' | 'PHP' | 'IDR' | 'VND'
  | 'INR' | 'PKR' | 'BDT' | 'LKR' | 'NPR' | 'KHR' | 'MMK' | 'LAK' | 'BTN' | 'MVR'
  | 'KZT' | 'UZS' | 'TJS' | 'TMT' | 'KGS' | 'MOP' | 'MNT'
  // Oceania
  | 'FJD' | 'PGK' | 'SBD' | 'TOP' | 'VUV' | 'WST' | 'XPF'
  // Africa
  | 'ZAR' | 'NGN' | 'KES' | 'GHS' | 'EGP' | 'MAD' | 'TND' | 'DZD' | 'ETB' | 'TZS'
  | 'UGX' | 'ZMW' | 'RWF' | 'MZN' | 'AOA' | 'MWK' | 'NAD' | 'BWP' | 'MUR' | 'SCR'
  | 'GMD' | 'SLL' | 'SDG' | 'MGA' | 'CVE' | 'DJF' | 'KMF' | 'CDF' | 'SOS' | 'LYD'
  | 'XOF' | 'XAF' | 'XCD' | 'ERN' | 'STN';
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
