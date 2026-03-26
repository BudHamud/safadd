import { NextResponse } from 'next/server';

/**
 * Placeholder for Bank Notifications Webhook
 * This endpoint will receive notifications from external bank services
 * and automatically create transaction records.
 */
export async function POST(request: Request) {
    void request;
    return NextResponse.json(
        { error: 'notifications_endpoint_disabled_until_signed_webhook_is_implemented' },
        { status: 410 }
    );
}
