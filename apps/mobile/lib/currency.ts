import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import type { SupportedCurrency } from '../context/AuthContext';
import { getItemWithLegacyKey } from './storage';
import type { ExchangeRateSnapshot } from '@safed/shared/types';
import { apiFetch } from '@safed/shared/api';

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
const EXCHANGE_RATE_TTL_MS = 5 * 60 * 1000;

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
    const [exchangeRateResponse, blueDollarResponse] = await Promise.all([
      fetch('https://api.exchangerate-api.com/v4/latest/USD'),
      fetch('https://dolarapi.com/v1/dolares/blue'),
    ]);

    const exchangeRateData = await exchangeRateResponse.json().catch(() => ({}));
    const blueDollarData = await blueDollarResponse.json().catch(() => ({}));

    const ils = Number(exchangeRateData?.rates?.ILS);
    const eur = Number(exchangeRateData?.rates?.EUR);
    const ars = Number(blueDollarData?.venta);

    if (!Number.isFinite(ils) || ils <= 0 || !Number.isFinite(eur) || eur <= 0 || !Number.isFinite(ars) || ars <= 0) {
      throw new Error('invalid_exchange_rate_payload');
    }

    const snapshot: ExchangeRateSnapshot = {
      rates: {
        USD: 1,
        ARS: ars,
        ILS: ils,
        EUR: eur,
      },
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
  session?: Session | null,
) {
  const { buildStoredAmountsFromSnapshot } = await import('@safed/shared/currency');

  // Prefer the web API when authenticated — it runs server-side and is more reliable.
  if (session) {
    try {
      const res = await apiFetch('/api/exchange-rates', {}, session);
      if (res.ok) {
        const snapshot = await res.json() as ExchangeRateSnapshot;
        return buildStoredAmountsFromSnapshot(amount, currency, snapshot);
      }
    } catch {
      // Fall through to direct fetch.
    }
  }

  try {
    const snapshot = await getExchangeRateSnapshot();
    return buildStoredAmountsFromSnapshot(amount, currency, snapshot);
  } catch {
    // Do not block transaction saves when exchange-rate services are unavailable.
    return buildStoredAmountsWithoutRates(amount, currency);
  }
}