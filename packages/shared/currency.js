// ── Currency utilities ─────────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

// ~155 ISO 4217 currencies supported. Dollar (USD) is the conversion base.
const SUPPORTED_CURRENCIES = [
  // G10 & major
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK',
  // Latin America
  'ARS', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB',
  'CRC', 'GTQ', 'HNL', 'NIO', 'PAB', 'DOP', 'JMD', 'TTD', 'GYD', 'SRD',
  'BBD', 'BSD', 'BMD', 'KYD', 'AWG', 'ANG', 'CUP', 'HTG', 'BZD',
  // Europe
  'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'MKD', 'ALL', 'BAM',
  'MDL', 'ISK', 'UAH', 'RUB', 'BYN', 'GEL', 'AMD', 'AZN',
  // Middle East
  'ILS', 'AED', 'SAR', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'TRY', 'IQD',
  'LBP', 'YER',
  // Asia
  'CNY', 'HKD', 'TWD', 'KRW', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND',
  'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'KHR', 'MMK', 'LAK', 'BTN', 'MVR',
  'KZT', 'UZS', 'TJS', 'TMT', 'KGS', 'MOP', 'MNT',
  // Oceania
  'FJD', 'PGK', 'SBD', 'TOP', 'VUV', 'WST', 'XPF',
  // Africa
  'ZAR', 'NGN', 'KES', 'GHS', 'EGP', 'MAD', 'TND', 'DZD', 'ETB', 'TZS',
  'UGX', 'ZMW', 'RWF', 'MZN', 'AOA', 'MWK', 'NAD', 'BWP', 'MUR', 'SCR',
  'GMD', 'SLL', 'SDG', 'MGA', 'CVE', 'DJF', 'KMF', 'CDF', 'SOS', 'LYD',
  'XOF', 'XAF', 'XCD', 'ERN', 'STN',
];

/**
 * Returns the display symbol for a currency using the Intl API.
 * Falls back to the currency code when Intl is unavailable.
 */
function getCurrencySymbol(currency) {
  try {
    const formatted = (0).toLocaleString('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    // Strip digits, spaces, commas, dots — keep only the symbol portion
    const symbol = formatted.replace(/[\d,.\s]/g, '').trim();
    return symbol || currency;
  } catch {
    return currency;
  }
}

/**
 * Returns the transaction amount in the requested currency.
 * For the four stored columns (USD/ARS/ILS/EUR) uses the DB value directly.
 * For any other currency, converts from amountUSD using the provided snapshot.
 * Falls back to the base `amount` field (ILS) when no snapshot is available.
 */
function getTransactionAmount(tx, currency, snapshot) {
  if (currency === 'USD' && tx.amountUSD != null) return tx.amountUSD;
  if (currency === 'ARS' && tx.amountARS != null) return tx.amountARS;
  if (currency === 'EUR' && tx.amountEUR != null) return tx.amountEUR;
  if (currency === 'ILS' && tx.amountILS != null) return tx.amountILS;
  // Extended currencies — convert from stored USD amount using snapshot rates
  if (tx.amountUSD != null && snapshot && snapshot.rates) {
    const rate = snapshot.rates[currency];
    if (Number.isFinite(rate) && rate > 0) return tx.amountUSD * rate;
  }
  return tx.amount;
}

/**
 * Converts an amount from one currency to another using the given snapshot.
 * All conversions go through USD as the base.
 */
function convertAmount(amount, from, to, snapshot) {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = snapshot.rates[from];
  const toRate = snapshot.rates[to];
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    return amount;
  }
  return (amount / fromRate) * toRate;
}

/**
 * Builds the amountXXX fields for all currencies given an input amount,
 * its currency, and a snapshot. Does NOT call any storage — pass the snapshot.
 */
function buildStoredAmountsFromSnapshot(amount, currency, snapshot) {
  let amountUSD;
  if (currency === 'USD') {
    amountUSD = amount;
  } else {
    const rate = snapshot.rates[currency];
    amountUSD = Number.isFinite(rate) && rate > 0 ? amount / rate : amount;
  }

  return {
    amount: amountUSD * (snapshot.rates.ILS ?? 1), // base column stored in ILS
    amountUSD,
    amountARS: amountUSD * (snapshot.rates.ARS ?? 0),
    amountILS: amountUSD * (snapshot.rates.ILS ?? 1),
    amountEUR: amountUSD * (snapshot.rates.EUR ?? 1),
  };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  getTransactionAmount,
  convertAmount,
  buildStoredAmountsFromSnapshot,
};
