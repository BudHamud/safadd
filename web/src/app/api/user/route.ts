import { NextResponse } from 'next/server';
import { requireAuth, signOutAuthenticatedSupabaseUser } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { enforceSameOrigin } from '../../../lib/security';

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const profile = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { id: true, username: true, role: true, monthlyGoal: true },
        });
        if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        return NextResponse.json({ ...profile, email: user.email ?? null });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const { monthlyGoal } = await req.json();
        const parsedGoal = Number(monthlyGoal);

        if (!Number.isFinite(parsedGoal) || parsedGoal < 0 || parsedGoal > 1_000_000_000) {
            return NextResponse.json({ error: 'Meta mensual inválida' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { authId: user.id },
            data: { monthlyGoal: parsedGoal },
            select: { id: true, username: true, monthlyGoal: true },
        });
        return NextResponse.json(updated);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const { user, accessToken, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const profile = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { id: true, authId: true },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.transaction.deleteMany({ where: { userId: profile.id } }),
            prisma.scanUsage.deleteMany({ where: { userId: profile.id } }),
            prisma.pendingNotification.deleteMany({ where: { userId: profile.id } }),
            prisma.user.delete({ where: { id: profile.id } }),
        ]);

        if (accessToken) {
            await signOutAuthenticatedSupabaseUser(accessToken);
        }

        return NextResponse.json({ success: true, authDeleted: false });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
