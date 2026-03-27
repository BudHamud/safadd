import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../../../lib/supabase-server';
import { consumeRateLimit, EMAIL_REGEX, enforceSameOrigin, normalizeEmail } from '../../../../../lib/security';

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'auth:password-request',
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const { email } = await req.json();
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'missing_email' }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
        }

        const supabase = createSupabaseAuthClient();
        const redirectTo = `${new URL(req.url).origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

        if (error) {
            console.error('[AUTH PASSWORD REQUEST]', error);
            return NextResponse.json({ error: 'reset_email_error' }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD REQUEST]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}