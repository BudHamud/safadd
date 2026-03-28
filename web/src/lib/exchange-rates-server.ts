import { fetchAllowedJson } from './security';
import { prisma } from './prisma';

export type ExchangeRateSnapshot = {
    rates: Record<string, number>;
    usdToArs: number;
};

/** Maximum age of the DB-cached rates before a fresh fetch is needed (23 h). */
const CACHE_MAX_AGE_MS = 23 * 60 * 60 * 1000;

/**
 * Fetches fresh rates from exchangerate-api.com (all ~160 currencies) and
 * overrides ARS with the Argentine blue-dollar rate from dolarapi.com.
 * Persists the result to the DB cache so subsequent calls skip the network.
 */
export async function refreshExchangeRates(): Promise<ExchangeRateSnapshot> {
    const [exchangeRateData, blueDollarData] = await Promise.all([
        fetchAllowedJson<{ rates?: Record<string, number> }>('https://api.exchangerate-api.com/v4/latest/USD', {}, { timeoutMs: 8000 }),
        fetchAllowedJson<{ venta?: number }>('https://dolarapi.com/v1/dolares/blue', {}, { timeoutMs: 4000 }),
    ]);

    const allRates: Record<string, number> = { ...(exchangeRateData?.rates ?? {}), USD: 1 };

    const ars = Number(blueDollarData?.venta);
    if (Number.isFinite(ars) && ars > 0) {
        allRates.ARS = ars;
    }

    if (!allRates.ILS || !allRates.EUR) {
        throw new Error('invalid_exchange_rate_payload');
    }

    const snapshot: ExchangeRateSnapshot = {
        rates: allRates,
        usdToArs: allRates.ARS ?? 0,
    };

    await prisma.exchangeRateCache.upsert({
        where: { id: 'global' },
        update: { rates: snapshot.rates, usdToArs: snapshot.usdToArs, fetchedAt: new Date() },
        create: { id: 'global', rates: snapshot.rates, usdToArs: snapshot.usdToArs },
    });

    return snapshot;
}

/**
 * Returns exchange rates, preferring the DB-cached snapshot when it is
 * less than 23 hours old. Falls back to a live fetch on cache miss.
 */
export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
    try {
        const cached = await prisma.exchangeRateCache.findUnique({ where: { id: 'global' } });
        if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_MAX_AGE_MS) {
            return {
                rates: cached.rates as Record<string, number>,
                usdToArs: cached.usdToArs,
            };
        }
    } catch {
        // DB unavailable — fall through to live fetch.
    }

    return refreshExchangeRates();
}
