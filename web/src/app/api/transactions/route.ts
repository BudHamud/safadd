import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, sanitizeTransactionInput } from '../../../lib/security';
import { getPlanEntitlements, normalizePlanTier } from '../../../lib/plan';

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userProfile = await prisma.user.findUnique({ where: { authId: user.id }, select: { id: true } });
    if (!userProfile?.id) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: userProfile.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(transactions);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'transactions:post',
        limit: 120,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userProfile = await prisma.user.findUnique({ where: { authId: user.id }, select: { id: true, planTier: true } });
    if (!userProfile?.id) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();

        // Batch import
        if (Array.isArray(data)) {
            if (data.length === 0) return NextResponse.json({ count: 0 });
            if (data.length > 1000) {
                return NextResponse.json({ error: 'Import demasiado grande' }, { status: 400 });
            }

            const today = new Date().toISOString().slice(0, 10);
            const importLimit = getPlanEntitlements(normalizePlanTier(userProfile.planTier)).importRowsPerDay;
            const currentUsage = await prisma.importUsage.findUnique({
                where: {
                    userId_date: {
                        userId: userProfile.id,
                        date: today,
                    },
                },
                select: { rowCount: true },
            });
            const usedRows = currentUsage?.rowCount ?? 0;

            if (usedRows + data.length > importLimit) {
                return NextResponse.json({
                    errorCode: 'plan_limit_import_rows',
                    limit: importLimit,
                    requested: data.length,
                    remaining: Math.max(importLimit - usedRows, 0),
                    used: usedRows,
                }, { status: 403 });
            }

            const rows = [];
            for (const [index, item] of data.entries()) {
                const sanitized = sanitizeTransactionInput(item);
                if ('error' in sanitized) {
                    return NextResponse.json({
                        error: sanitized.error,
                        errorDetail: `Fila ${index + 1} con fecha ${String(item?.date ?? '') || '(vacía)'}`,
                    }, { status: 400 });
                }

                rows.push({
                id: randomUUID(),
                ...sanitized.data,
                userId: userProfile.id,
                });
            }

            await prisma.$transaction([
                prisma.transaction.createMany({ data: rows }),
                prisma.importUsage.upsert({
                    where: {
                        userId_date: {
                            userId: userProfile.id,
                            date: today,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        userId: userProfile.id,
                        date: today,
                        rowCount: data.length,
                    },
                    update: {
                        rowCount: { increment: data.length },
                    },
                }),
            ]);

            return NextResponse.json({ count: data.length });
        }

        const sanitized = sanitizeTransactionInput(data);
        if ('error' in sanitized) {
            return NextResponse.json({ error: sanitized.error }, { status: 400 });
        }

        const sanitizedData = sanitized.data;

        const tx = await prisma.transaction.create({
            data: {
                id: randomUUID(),
                userId: userProfile.id,
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
            },
        });
        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'transactions:delete',
        limit: 120,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userProfile = await prisma.user.findUnique({ where: { authId: user.id }, select: { id: true } });
    if (!userProfile?.id) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    try {
        if (id === 'all') {
            await prisma.transaction.deleteMany({ where: { userId: userProfile.id } });
        } else {
            const tx = await prisma.transaction.findFirst({ where: { id, userId: userProfile.id }, select: { id: true } });
            if (!tx) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
            await prisma.transaction.delete({ where: { id } });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'transactions:put',
        limit: 120,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userProfile = await prisma.user.findUnique({ where: { authId: user.id }, select: { id: true } });
    if (!userProfile?.id) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();
        const { id } = data;
        if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

        const sanitized = sanitizeTransactionInput(data, { partial: true });
        if ('error' in sanitized) {
            return NextResponse.json({ error: sanitized.error }, { status: 400 });
        }

        const existing = await prisma.transaction.findFirst({ where: { id, userId: userProfile.id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        const tx = await prisma.transaction.update({ where: { id }, data: sanitized.data });
        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

