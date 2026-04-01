import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '../../../../../lib/supabase-server';
import { consumeRateLimit, EMAIL_REGEX, enforceSameOrigin, getAppOrigin, getClientIp, getRateLimitStatus, normalizeEmail, resetRateLimit } from '../../../../../lib/security';
import { isTurnstileEnabled, verifyTurnstileToken } from '../../../../../lib/turnstile';

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const { email, turnstileToken } = await req.json();
        const rateLimitOptions = {
            key: 'auth:password-request',
            limit: 5,
            windowMs: 15 * 60 * 1000,
        };
        const rateLimitStatus = getRateLimitStatus(req, rateLimitOptions);

        if (rateLimitStatus.limited) {
            const challengeToken = typeof turnstileToken === 'string' ? turnstileToken.trim() : '';

            if (!isTurnstileEnabled() || !challengeToken) {
                return NextResponse.json({
                    error: 'rate_limited',
                    errorCode: 'rate_limited',
                    retryAfter: rateLimitStatus.retryAfter,
                    canRetryAt: rateLimitStatus.canRetryAt,
                    requiresCaptcha: isTurnstileEnabled(),
                }, { status: 429 });
            }

            const verification = await verifyTurnstileToken(challengeToken, getClientIp(req));
            if (!verification.ok) {
                return NextResponse.json({
                    error: 'captcha_invalid',
                    errorCode: 'captcha_invalid',
                    errorDetail: verification.errorCodes.join(', '),
                    requiresCaptcha: true,
                }, { status: 400 });
            }

            resetRateLimit(req, rateLimitOptions);
        }

        const rateLimitError = consumeRateLimit(req, rateLimitOptions);
        if (rateLimitError) return rateLimitError;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'missing_email' }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
        }

        const supabase = createSupabaseAuthClient({ flowType: 'implicit' });
        const redirectTo = `${getAppOrigin(req)}/reset-password`;
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