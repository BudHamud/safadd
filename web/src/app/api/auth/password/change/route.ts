import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSupabaseAuthClient, requireAuth, updateAuthenticatedSupabaseUser } from '../../../../../lib/supabase-server';
import { prisma } from '../../../../../lib/prisma';
import { consumeRateLimit, enforceSameOrigin, isSafePasswordCandidate } from '../../../../../lib/security';

const toInternalEmail = (username: string) => `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@gastosapp.internal`;

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const rateLimitError = consumeRateLimit(req, {
            key: 'auth:password-change',
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        const auth = await requireAuth(req);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
        }

        const { currentPassword, newPassword } = await req.json();
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'missing_passwords' }, { status: 400 });
        }

        if (!isSafePasswordCandidate(newPassword)) {
            return NextResponse.json({ error: 'weak_password' }, { status: 400 });
        }

        const profile = await prisma.user.findUnique({
            where: { authId: auth.user.id },
            select: { id: true, username: true, password: true, authId: true },
        });

        if (!profile) {
            return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
        }

        const authEmail = auth.user.email || toInternalEmail(profile.username);
        let passwordValid = false;
        let freshAccessToken = auth.accessToken;

        if (authEmail) {
            const supabase = createSupabaseAuthClient();
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: currentPassword,
            });
            passwordValid = !signInError;
            freshAccessToken = signInData.session?.access_token ?? freshAccessToken;
        }

        if (!passwordValid && typeof profile.password === 'string') {
            if (profile.password.startsWith('$2')) {
                passwordValid = await bcrypt.compare(currentPassword, profile.password);
            } else {
                passwordValid = profile.password === currentPassword;
            }
        }

        if (!passwordValid) {
            return NextResponse.json({ error: 'invalid_current_password' }, { status: 401 });
        }

        const updateToken = freshAccessToken ?? auth.accessToken ?? '';
        const { error: updateAuthError } = await updateAuthenticatedSupabaseUser(updateToken, { password: newPassword });

        if (updateAuthError) {
            console.error('[AUTH PASSWORD CHANGE] update auth error', updateAuthError);
            return NextResponse.json({ error: 'update_password_error' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        try {
            await prisma.user.update({
                where: { id: profile.id },
                data: { password: hashedPassword },
            });
        } catch (updateProfileError) {
            console.error('[AUTH PASSWORD CHANGE] update profile error', updateProfileError);
            return NextResponse.json({ error: 'update_profile_password_error' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD CHANGE]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}