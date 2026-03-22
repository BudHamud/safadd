import { NextResponse } from 'next/server';
import { requireAuth, supabaseAdmin } from '../../../lib/supabase-server';
import { consumeRateLimit, enforceSameOrigin, normalizeTagInput, normalizeText } from '../../../lib/security';

async function resolveUserId(authId: string) {
    const { data: user } = await supabaseAdmin
        .from('User').select('id').eq('authId', authId).maybeSingle();
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
        const { data: userTxs, error: selectError } = await supabaseAdmin
            .from('Transaction').select('id, tag').eq('userId', userId);
        if (selectError) {
            console.error('PUT select error:', selectError);
            return NextResponse.json({ error: selectError.message ?? 'Error del servidor' }, { status: 500 });
        }

        const idsToUpdate = userTxs
            .filter(tx => normalizeTagInput(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const { data: updatedRows, error: updateError } = await supabaseAdmin
                .from('Transaction')
                .update({ tag: normalizedNewTag, icon: safeNewIcon })
                .in('id', idsToUpdate)
                .select('id');
            if (updateError) {
                console.error('PUT update error:', updateError);
                return NextResponse.json({ error: updateError.message ?? 'Error del servidor' }, { status: 500 });
            }
            count = updatedRows?.length ?? 0;
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
        const { data: userTxs, error: selectError } = await supabaseAdmin
            .from('Transaction').select('id, tag').eq('userId', userId);
        if (selectError) {
            console.error('DELETE select error:', selectError);
            return NextResponse.json({ error: selectError.message ?? 'Error del servidor' }, { status: 500 });
        }

        const idsToUpdate = userTxs
            .filter(tx => normalizeTagInput(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const { data: updatedRows, error: updateError } = await supabaseAdmin
                .from('Transaction')
                .update({ tag: 'OTROS', icon: '\u2753' })
                .in('id', idsToUpdate)
                .select('id');
            if (updateError) {
                console.error('DELETE update error:', updateError);
                return NextResponse.json({ error: updateError.message ?? 'Error del servidor' }, { status: 500 });
            }
            count = updatedRows?.length ?? 0;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('DELETE Error:', err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

