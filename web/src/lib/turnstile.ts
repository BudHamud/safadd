type TurnstileVerificationResponse = {
    success?: boolean;
    'error-codes'?: string[];
};

type TurnstileVerificationResult = {
    ok: boolean;
    errorCodes: string[];
};

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function getTurnstileSiteKey() {
    const value = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY?.trim();
    return value ? value : null;
}

export function isTurnstileEnabled() {
    const siteKey = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY?.trim();
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();
    return Boolean(siteKey && secretKey);
}

export async function verifyTurnstileToken(token: string, remoteIp?: string | null): Promise<TurnstileVerificationResult> {
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();

    if (!secretKey || !token.trim()) {
        return {
            ok: false,
            errorCodes: ['missing-input-response'],
        };
    }

    const body = new URLSearchParams({
        secret: secretKey,
        response: token.trim(),
    });

    if (remoteIp?.trim()) {
        body.set('remoteip', remoteIp.trim());
    }

    try {
        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            cache: 'no-store',
        });

        if (!response.ok) {
            return {
                ok: false,
                errorCodes: ['turnstile-request-failed'],
            };
        }

        const payload = await response.json() as TurnstileVerificationResponse;
        return {
            ok: Boolean(payload.success),
            errorCodes: Array.isArray(payload['error-codes']) ? payload['error-codes'] : [],
        };
    } catch (error) {
        console.error('[TURNSTILE VERIFY]', error);
        return {
            ok: false,
            errorCodes: ['turnstile-network-error'],
        };
    }
}