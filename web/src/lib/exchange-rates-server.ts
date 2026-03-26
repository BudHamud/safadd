import { fetchAllowedJson } from './security';

export type ExchangeRateSnapshot = {
    rates: {
        USD: number;
        ARS: number;
        ILS: number;
        EUR: number;
    };
    usdToArs: number;
};

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
    const [exchangeRateData, blueDollarData] = await Promise.all([
        fetchAllowedJson<{ rates?: Record<string, number> }>('https://api.exchangerate-api.com/v4/latest/USD', {}, { timeoutMs: 4000 }),
        fetchAllowedJson<{ venta?: number }>('https://dolarapi.com/v1/dolares/blue', {}, { timeoutMs: 4000 }),
    ]);

    const ils = Number(exchangeRateData?.rates?.ILS);
    const eur = Number(exchangeRateData?.rates?.EUR);
    const ars = Number(blueDollarData?.venta);

    if (!Number.isFinite(ils) || ils <= 0 || !Number.isFinite(eur) || eur <= 0 || !Number.isFinite(ars) || ars <= 0) {
        throw new Error('invalid_exchange_rate_payload');
    }

    return {
        rates: {
            USD: 1,
            ARS: ars,
            ILS: ils,
            EUR: eur,
        },
        usdToArs: ars,
    };
}