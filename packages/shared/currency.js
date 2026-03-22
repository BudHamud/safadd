// ── Currency utilities ─────────────────────────────────────────────────────
// Pure functions — no platform dependencies. Works in Next.js and React Native.

const SUPPORTED_CURRENCIES = ['ILS', 'USD', 'ARS', 'EUR'];

/** Returns the display symbol for a supported currency. */
function getCurrencySymbol(currency) {
  if (currency === 'ILS') return '₪';
  if (currency === 'EUR') return '€';
  return '$'; // USD and ARS both use $
}

/**
 * Returns the transaction amount in the requested currency,
 * falling back to the base `amount` field if the specific field is missing.
 */
function getTransactionAmount(tx, currency) {
  if (currency === 'USD' && tx.amountUSD != null) return tx.amountUSD;
  if (currency === 'ARS' && tx.amountARS != null) return tx.amountARS;
  if (currency === 'EUR' && tx.amountEUR != null) return tx.amountEUR;
  if (currency === 'ILS' && tx.amountILS != null) return tx.amountILS;
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
