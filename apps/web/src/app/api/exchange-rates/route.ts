import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/supabase-server';
import { getExchangeRateSnapshot } from '../../../lib/exchange-rates-server';
import { consumeRateLimit, enforceSameOrigin } from '../../../lib/security';

export async function GET(req: NextRequest) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'exchange-rates:get',
        limit: 120,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const auth = await requireAuth(req);
    if (auth.error || !auth.user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
    }

    try {
        const snapshot = await getExchangeRateSnapshot();
        return NextResponse.json(snapshot, {
            headers: {
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch (error: any) {
        console.error('exchange-rates error:', error);
        return NextResponse.json({ error: 'exchange_rates_unavailable' }, { status: 502 });
    }
}