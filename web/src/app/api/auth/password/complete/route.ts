import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSupabaseAuthClient, updateAuthenticatedSupabaseUser } from '../../../../../lib/supabase-server';
import { prisma } from '../../../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, isSafePasswordCandidate } from '../../../../../lib/security';

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'auth:password-complete',
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const { accessToken, code, password } = await req.json();
        if ((!accessToken && !code) || !password) {
            return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
        }

        if (!isSafePasswordCandidate(password)) {
            return NextResponse.json({ error: 'weak_password' }, { status: 400 });
        }

        const supabase = createSupabaseAuthClient();
        let token = typeof accessToken === 'string' ? accessToken.trim() : '';

        if (!token && typeof code === 'string' && code.trim()) {
            const {
                data: exchangeData,
                error: exchangeError,
            } = await supabase.auth.exchangeCodeForSession(code.trim());

            if (exchangeError || !exchangeData.session?.access_token) {
                console.error('[AUTH PASSWORD COMPLETE] exchange code error', exchangeError);
                return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
            }

            token = exchangeData.session.access_token;
        }

        const {
            data: { user },
            error: getUserError,
        } = await supabase.auth.getUser(token);

        if (getUserError || !user) {
            return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
        }

        const { error: updateAuthError } = await updateAuthenticatedSupabaseUser(token, { password });

        if (updateAuthError) {
            console.error('[AUTH PASSWORD COMPLETE] update auth error', updateAuthError);
            return NextResponse.json({ error: 'update_password_error' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        try {
            await prisma.user.update({
                where: { authId: user.id },
                data: { password: hashedPassword },
            });
        } catch (updateProfileError) {
            console.error('[AUTH PASSWORD COMPLETE] update profile error', updateProfileError);
            return NextResponse.json({ error: 'update_profile_password_error' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD COMPLETE]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}