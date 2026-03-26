import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin, requireAuth } from '../../../lib/supabase-server';
import { consumeRateLimit, enforceSameOrigin, sanitizeTransactionInput } from '../../../lib/security';

// Helper: obtener userId interno a partir del authId de Supabase
async function resolveUserId(authId: string): Promise<string | null> {
    const { data: user } = await supabaseAdmin
        .from('User').select('id').eq('authId', authId).maybeSingle();
    return user?.id ?? null;
}

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const { data: transactions } = await supabaseAdmin
            .from('Transaction').select('*').eq('userId', userId).order('createdAt', { ascending: false });
        return NextResponse.json(transactions ?? []);
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

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();

        // Batch import
        if (Array.isArray(data)) {
            if (data.length === 0) return NextResponse.json({ count: 0 });
            if (data.length > 1000) {
                return NextResponse.json({ error: 'Import demasiado grande' }, { status: 400 });
            }

            const rows = [];
            for (const item of data) {
                const sanitized = sanitizeTransactionInput(item);
                if ('error' in sanitized) {
                    return NextResponse.json({ error: sanitized.error }, { status: 400 });
                }

                rows.push({
                id: randomUUID(),
                ...sanitized.data,
                userId,
                });
            }

            const { error: insertError } = await supabaseAdmin.from('Transaction').insert(rows);
            if (insertError) {
                console.error('[TRANSACTIONS POST batch] insert error:', insertError);
                return NextResponse.json({ error: 'Error guardando importación' }, { status: 500 });
            }

            return NextResponse.json({ count: data.length });
        }

        const sanitized = sanitizeTransactionInput(data);
        if ('error' in sanitized) {
            return NextResponse.json({ error: sanitized.error }, { status: 400 });
        }

        const { data: tx, error: insertError } = await supabaseAdmin.from('Transaction').insert({
            id: randomUUID(),
            ...sanitized.data,
            userId,
        }).select().single();
        if (insertError || !tx) {
            console.error('[TRANSACTIONS POST] insert error:', insertError);
            return NextResponse.json({ error: insertError?.message ?? 'Error guardando transacción' }, { status: 500 });
        }
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

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    try {
        if (id === 'all') {
            await supabaseAdmin.from('Transaction').delete().eq('userId', userId);
        } else {
            // Verificar ownership antes de borrar (previene IDOR)
            const { data: tx } = await supabaseAdmin
                .from('Transaction').select('id').eq('id', id).eq('userId', userId).maybeSingle();
            if (!tx) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
            await supabaseAdmin.from('Transaction').delete().eq('id', id);
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

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();
        const { id } = data;
        if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

        const sanitized = sanitizeTransactionInput(data, { partial: true });
        if ('error' in sanitized) {
            return NextResponse.json({ error: sanitized.error }, { status: 400 });
        }

        // Verificar que la transacción pertenece al usuario (previene IDOR)
        const { data: existing } = await supabaseAdmin
            .from('Transaction').select('id').eq('id', id).eq('userId', userId).maybeSingle();
        if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        const { data: tx } = await supabaseAdmin.from('Transaction').update({
            ...sanitized.data,
        }).eq('id', id).select().single();
        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

