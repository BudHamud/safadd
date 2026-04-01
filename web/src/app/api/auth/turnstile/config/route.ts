import { NextResponse } from 'next/server';
import { getTurnstileSiteKey, isTurnstileEnabled } from '../../../../../lib/turnstile';

export async function GET() {
    return NextResponse.json(
        {
            enabled: isTurnstileEnabled(),
            siteKey: getTurnstileSiteKey(),
        },
        {
            headers: {
                'Cache-Control': 'no-store',
            },
        }
    );
}