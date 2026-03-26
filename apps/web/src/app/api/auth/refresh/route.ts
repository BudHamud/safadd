import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase-server';
import { consumeRateLimit, enforceSameOrigin } from '../../../../lib/security';

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'auth:refresh',
            limit: 30,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const { refreshToken } = await req.json();

        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdminClient();
        const {
            data: { session },
            error,
        } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

        if (error || !session) {
            return NextResponse.json({ error: error?.message ?? 'Unable to refresh session' }, { status: 401 });
        }

        return NextResponse.json({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}