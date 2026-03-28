import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { enforceSameOrigin, normalizeText } from '../../../lib/security';

export async function POST(req: Request) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const { user, error, status } = await requireAuth(req);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const body = await req.json();
    const pushToken = normalizeText(body?.pushToken, 200, '');

    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
    }

    const updated = await prisma.user.updateMany({
      where: { authId: user.id },
      data: { pushToken },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    console.error('[PUSH_TOKEN POST] unexpected error:', routeError);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
