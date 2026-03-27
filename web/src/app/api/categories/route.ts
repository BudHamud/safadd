import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, normalizeTagInput, normalizeText } from '../../../lib/security';

async function resolveUserId(authId: string) {
    const user = await prisma.user.findUnique({ where: { authId }, select: { id: true } });
    return user?.id ?? null;
}

export async function PUT(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'categories:put',
        limit: 30,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const { oldTag, newTag, newIcon } = await req.json();

        const normalizedOldTag = normalizeTagInput(oldTag);
        const normalizedNewTag = normalizeTagInput(newTag);
        const safeNewIcon = normalizeText(newIcon, 8);

        if (!normalizedOldTag || !normalizedNewTag || !safeNewIcon) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const normalizedOldStr = normalizedOldTag;
        const userTxs = await prisma.transaction.findMany({ where: { userId }, select: { id: true, tag: true } });

        const idsToUpdate = userTxs
            .filter(tx => normalizeTagInput(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const updated = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: { tag: normalizedNewTag, icon: safeNewIcon },
            });
            count = updated.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('PUT Error:', err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = consumeRateLimit(req, {
        key: 'categories:delete',
        limit: 30,
        windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const oldTag = searchParams.get('oldTag');
    if (!oldTag) return NextResponse.json({ error: 'Falta oldTag' }, { status: 400 });

    try {
        const normalizedOldStr = normalizeTagInput(oldTag);
        const userTxs = await prisma.transaction.findMany({ where: { userId }, select: { id: true, tag: true } });

        const idsToUpdate = userTxs
            .filter(tx => normalizeTagInput(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const updated = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: { tag: 'OTROS', icon: '\u2753' },
            });
            count = updated.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('DELETE Error:', err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

