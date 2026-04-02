import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { parseBankNotification } from '../../../lib/bankNotificationParser';
import { getExchangeRateSnapshot } from '../../../lib/exchange-rates-server';
import { consumeRateLimit, enforceSameOrigin, normalizeText, sanitizeTransactionInput } from '../../../lib/security';

async function resolveUserId(authId: string) {
    const user = await prisma.user.findUnique({ where: { authId }, select: { id: true } });
    return user?.id ?? null;
}

/**
 * POST /api/parse-notification
 *
 * Receives a raw bank push notification from the Capacitor Android app,
 * runs it through the regex parser, and returns a structured transaction
 * ready for the user to confirm (or auto-save if autoAdd is enabled).
 *
 * Body: { packageName, title, body, userId }
 * Returns: { parsed, transaction } | { error }
 */
export async function POST(req: NextRequest) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'parse-notification:post',
            limit: 120,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const auth = await requireAuth(req);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
        }

        const userId = await resolveUserId(auth.user.id);
        if (!userId) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const payload = await req.json();
        const packageName = normalizeText(payload?.packageName, 120);
        const title = normalizeText(payload?.title, 160);
        const body = normalizeText(payload?.body, 3000);

        console.log(`[BANK NOTIF] Recibida de ${packageName}: "${body}"`);

        if (!packageName || !body || !userId) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        // Parse the notification
        const parsed = parseBankNotification(packageName, body);

        if (!parsed) {
            // Known app but unrecognized format — return for optional AI scan
            return NextResponse.json({
                parsed: null,
                rawText: body,
                packageName,
                needsAI: true,
            });
        }

        // Convert to all currencies using cached rates
        let amountUSD = 0, amountARS = 0, amountILS = 0, amountEUR = 0;
        try {
            const { rates, usdToArs } = await getExchangeRateSnapshot();

            const usdAmount =
                parsed.currency === 'USD' ? parsed.amount :
                    parsed.currency === 'ILS' ? parsed.amount / rates.ILS :
                        parsed.currency === 'EUR' ? parsed.amount / rates.EUR :
                            parsed.currency === 'ARS' ? parsed.amount / usdToArs : parsed.amount;

            amountUSD = usdAmount;
            amountILS = usdAmount * rates.ILS;
            amountEUR = usdAmount * rates.EUR;
            amountARS = usdAmount * usdToArs;
        } catch {
            // If exchange fails, just set the raw amount in its currency
            if (parsed.currency === 'ILS') amountILS = parsed.amount;
            else if (parsed.currency === 'USD') amountUSD = parsed.amount;
            else if (parsed.currency === 'EUR') amountEUR = parsed.amount;
            else if (parsed.currency === 'ARS') amountARS = parsed.amount;
        }

        const today = new Date().toISOString().split('T')[0];

        // Si el parser usó un merchant genérico (ej: Google Wallet LATAM),
        // preferir el título de la notificación que contiene el nombre real del comercio
        const effectiveMerchant = (parsed.merchant === 'Google Wallet' && title)
            ? title.trim()
            : parsed.merchant;

        const preparedTransaction = {
            desc: effectiveMerchant,
            amount: amountILS || parsed.amount,
            amountUSD,
            amountARS,
            amountILS,
            amountEUR,
            tag: parsed.tag,
            type: parsed.type,
            date: today,
            icon: iconForTag(parsed.tag),
            details: `Auto-detectado: ${parsed.bankId} · ${parsed.rawText.slice(0, 50)}...`,
            excludeFromBudget: false,
            goalType: 'unico',
            isCancelled: false,
        };

        // ── Deduplicación: Si ya existe la misma notificación en los últimos 60s, devolver esa ──
        const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const existing = await prisma.pendingNotification.findFirst({
            where: {
                userId,
                rawText: parsed.rawText,
                createdAt: { gte: new Date(sixtySecondsAgo) },
            },
            select: { id: true },
        });

        if (existing) {
            console.log(`[BANK NOTIF] Duplicado detectado para ${packageName}, devolviendo existing id=${existing.id}`);
            return NextResponse.json({
                parsed: { ...parsed, merchant: effectiveMerchant },
                id: existing.id,
                transaction: preparedTransaction,
                duplicate: true,
            });
        }

        // ── Auto-save to Pending table ──
        const pendingRecord = await prisma.pendingNotification.create({
            data: {
                userId,
                authId: auth.user.id,
                bankName: parsed.bankId,
                merchant: effectiveMerchant,
                amount: parsed.amount,
                currency: parsed.currency,
                type: parsed.type,
                tag: parsed.tag,
                rawText: parsed.rawText,
                transaction: preparedTransaction,
            },
            select: { id: true },
        });

        return NextResponse.json({
            parsed: { ...parsed, merchant: effectiveMerchant },
            id: pendingRecord.id,
            transaction: preparedTransaction
        });

    } catch (err: any) {
        console.error('parse-notification error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/parse-notification?userId=xxx
 * Retrieves all pending notifications for a user.
 */
export async function GET(req: NextRequest) {
    const rateLimitError = consumeRateLimit(req, {
        key: 'parse-notification:get',
        limit: 240,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const auth = await requireAuth(req);
    if (auth.error || !auth.user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
    }

    const userId = await resolveUserId(auth.user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const pending = await prisma.pendingNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pending);
}

/**
 * DELETE /api/parse-notification?id=xxx
 * Dismisses a pending notification.
 */
export async function DELETE(req: NextRequest) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'parse-notification:delete',
        limit: 120,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const auth = await requireAuth(req);
    if (auth.error || !auth.user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
    }

    const userId = await resolveUserId(auth.user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    await prisma.pendingNotification.deleteMany({ where: { id, userId } });
    return NextResponse.json({ ok: true });
}

/**
 * POST /api/parse-notification/save
 * Saves a confirmed transaction from notification.
 */
export async function PUT(req: NextRequest) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'parse-notification:put',
            limit: 120,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const auth = await requireAuth(req);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
        }

        const userId = await resolveUserId(auth.user.id);
        if (!userId) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const { transaction } = await req.json();
        if (!transaction) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const sanitized = sanitizeTransactionInput(transaction);
        if ('error' in sanitized) {
            return NextResponse.json({ error: sanitized.error }, { status: 400 });
        }

        const sanitizedData = sanitized.data;

        const saved = await prisma.transaction.create({
            data: {
                id: Date.now().toString(),
                desc: sanitizedData.desc ?? 'Sin titulo',
                amount: sanitizedData.amount ?? 0,
                amountUSD: sanitizedData.amountUSD ?? null,
                amountARS: sanitizedData.amountARS ?? null,
                amountILS: sanitizedData.amountILS ?? null,
                amountEUR: sanitizedData.amountEUR ?? null,
                tag: sanitizedData.tag ?? 'OTROS',
                type: sanitizedData.type ?? 'expense',
                date: sanitizedData.date ?? new Date().toISOString().split('T')[0],
                icon: sanitizedData.icon ?? '💳',
                details: sanitizedData.details ?? '',
                excludeFromBudget: sanitizedData.excludeFromBudget ?? false,
                goalType: sanitizedData.goalType ?? 'unico',
                isCancelled: sanitizedData.isCancelled ?? false,
                periodicity: sanitizedData.periodicity ?? null,
                paymentMethod: sanitizedData.paymentMethod ?? null,
                cardDigits: sanitizedData.cardDigits ?? null,
                user: { connect: { id: userId } },
            },
            select: { id: true },
        });

        return NextResponse.json({ ok: true, id: saved?.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function iconForTag(tag: string): string {
    const icons: Record<string, string> = {
        alimentacion: '🛒', transporte: '🚌', salud: '🏥',
        entretenimiento: '🎬', viajes: '✈️', suscripcion: '📱',
        servicios: '⚡', educacion: '📚', ropa: '👕',
        hogar: '🏠', tecnologia: '💻', otro: '💳',
    };
    return icons[tag] ?? '💳';
}
