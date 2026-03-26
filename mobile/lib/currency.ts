import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedCurrency } from '../context/AuthContext';
import { getItemWithLegacyKey } from './storage';
import type { ExchangeRateSnapshot } from '@safed/shared/types';

// Pure currency utilities — re-exported from the shared package.
export type { ExchangeRateSnapshot };
export {
  getCurrencySymbol,
  getTransactionAmount,
  convertAmount,
  buildStoredAmountsFromSnapshot,
} from '@safed/shared/currency';

const EXCHANGE_RATE_CACHE_KEY = 'safadd_exchange_rates_cache';
const LEGACY_EXCHANGE_RATE_CACHE_KEY = 'safed_exchange_rates_cache';
// How long to reuse a cached snapshot before re-fetching.
// Change this constant to adjust the refresh frequency (e.g. 60 * 60 * 1000 = 1h, 15 * 60 * 1000 = 15min).
const EXCHANGE_RATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildStoredAmountsWithoutRates(amount: number, currency: SupportedCurrency) {
  return {
    amount,
    amountUSD: currency === 'USD' ? amount : null,
    amountARS: currency === 'ARS' ? amount : null,
    amountILS: currency === 'ILS' ? amount : null,
    amountEUR: currency === 'EUR' ? amount : null,
  };
}

export async function getExchangeRateSnapshot(forceRefresh = false): Promise<ExchangeRateSnapshot> {
  let staleSnapshot: ExchangeRateSnapshot | null = null;

  if (!forceRefresh) {
    const cachedRaw = await getItemWithLegacyKey(EXCHANGE_RATE_CACHE_KEY, [LEGACY_EXCHANGE_RATE_CACHE_KEY]);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { timestamp: number; snapshot: ExchangeRateSnapshot };
        if (Date.now() - cached.timestamp < EXCHANGE_RATE_TTL_MS) {
          return cached.snapshot;
        }
        // Cache expired — keep as fallback in case live fetch fails.
        staleSnapshot = cached.snapshot;
      } catch {
        // Ignore invalid cache and fetch again.
      }
    }
  }

  try {
    const ratesController = new AbortController();
    const blueController = new AbortController();
    const t1 = setTimeout(() => ratesController.abort(), 8000);
    const t2 = setTimeout(() => blueController.abort(), 8000);

    const [exchangeRateResponse, blueDollarResponse] = await Promise.all([
      fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: ratesController.signal }),
      fetch('https://dolarapi.com/v1/dolares/blue', { signal: blueController.signal }),
    ]);

    clearTimeout(t1);
    clearTimeout(t2);

    const exchangeRateData = await exchangeRateResponse.json().catch(() => ({}));
    const blueDollarData = await blueDollarResponse.json().catch(() => ({}));

    const allRates: Record<string, number> = exchangeRateData?.rates ?? {};
    const ils = Number(allRates.ILS);
    const eur = Number(allRates.EUR);
    const ars = Number(blueDollarData?.venta);

    if (!Number.isFinite(ils) || ils <= 0 || !Number.isFinite(eur) || eur <= 0 || !Number.isFinite(ars) || ars <= 0) {
      throw new Error('invalid_exchange_rate_payload');
    }

    // Override ARS with the blue-dollar rate (more accurate for Argentina)
    allRates.USD = 1;
    allRates.ARS = ars;

    const snapshot: ExchangeRateSnapshot = {
      rates: allRates,
      usdToArs: ars,
    };

    await AsyncStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), snapshot }));
    return snapshot;
  } catch {
    // If we have a stale (expired) cache, use it rather than failing completely.
    if (staleSnapshot) return staleSnapshot;
    throw new Error('exchange_rates_unavailable');
  }
}

/**
 * Builds the stored multi-currency amounts for a transaction.
 * When a session is provided, tries the web API exchange-rates endpoint first
 * (more reliable than fetching from third-party APIs directly).
 * Falls back to direct fetch + stale cache when the web API is unavailable.
 */
export async function buildStoredAmounts(
  amount: number,
  currency: SupportedCurrency,
  _session?: unknown,
) {
  const { buildStoredAmountsFromSnapshot } = await import('@safed/shared/currency');

  try {
    const snapshot = await getExchangeRateSnapshot();
    return buildStoredAmountsFromSnapshot(amount, currency, snapshot);
  } catch {
    // Do not block transaction saves when exchange-rate services are unavailable.
    return buildStoredAmountsWithoutRates(amount, currency);
  }
}

/**
 * Attempts to load a cached snapshot from AsyncStorage without triggering
 * a network fetch. Returns null when no valid cache exists.
 * Useful for display-layer conversions when you don't want to await a fetch.
 */
export async function getCachedExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
  try {
    const cachedRaw = await getItemWithLegacyKey(EXCHANGE_RATE_CACHE_KEY, [LEGACY_EXCHANGE_RATE_CACHE_KEY]);
    if (!cachedRaw) return null;
    const cached = JSON.parse(cachedRaw) as { timestamp: number; snapshot: ExchangeRateSnapshot };
    return cached.snapshot ?? null;
  } catch {
    return null;
  }
}