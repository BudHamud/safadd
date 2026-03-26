// ── Currency utilities ─────────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

const SUPPORTED_CURRENCIES = [
  'ILS', 'USD', 'ARS', 'EUR',
  'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF',
  'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'NZD',
  'MXN', 'BRL', 'INR', 'KRW', 'SAR', 'AED',
  'TRY', 'ZAR', 'PLN', 'CZK', 'HUF',
  'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB',
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
  const amountUSD =
    currency === 'USD' ? amount
    : currency === 'ILS' ? amount / snapshot.rates.ILS
    : currency === 'EUR' ? amount / snapshot.rates.EUR
    : amount / snapshot.rates.ARS; // ARS

  return {
    amount: amountUSD * snapshot.rates.ILS, // base is stored in ILS
    amountUSD,
    amountARS: amountUSD * snapshot.rates.ARS,
    amountILS: amountUSD * snapshot.rates.ILS,
    amountEUR: amountUSD * snapshot.rates.EUR,
  };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  getTransactionAmount,
  convertAmount,
  buildStoredAmountsFromSnapshot,
};
