import { NextResponse } from 'next/server';
import { refreshExchangeRates } from '../../../../lib/exchange-rates-server';

/**
 * GET /api/cron/refresh-rates
 * Triggered daily at 05:00 UTC by the Vercel cron job defined in vercel.json.
 * Also callable manually with the same CRON_SECRET.
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    try {
        const snapshot = await refreshExchangeRates();
        return NextResponse.json({
            ok: true,
            currencies: Object.keys(snapshot.rates).length,
            usdToArs: snapshot.usdToArs,
            fetchedAt: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'fetch_failed';
        console.error('[cron/refresh-rates]', error);
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
