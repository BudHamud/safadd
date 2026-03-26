import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSupabaseAdminClient, requireAuth } from '../../../../../lib/supabase-server';
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

        const supabaseAdmin = createSupabaseAdminClient();
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('User')
            .select('id, username, password, authId')
            .eq('authId', auth.user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[AUTH PASSWORD CHANGE] profile lookup error', profileError);
            return NextResponse.json({ error: 'server_error' }, { status: 500 });
        }

        if (!profile) {
            return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
        }

        const authEmail = auth.user.email || toInternalEmail(profile.username);
        let passwordValid = false;

        if (authEmail) {
            const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: authEmail,
                password: currentPassword,
            });
            passwordValid = !signInError;
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

        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
            password: newPassword,
        });

        if (updateAuthError) {
            console.error('[AUTH PASSWORD CHANGE] update auth error', updateAuthError);
            return NextResponse.json({ error: 'update_password_error' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const { error: updateProfileError } = await supabaseAdmin
            .from('User')
            .update({ password: hashedPassword })
            .eq('id', profile.id);

        if (updateProfileError) {
            console.error('[AUTH PASSWORD CHANGE] update profile error', updateProfileError);
            return NextResponse.json({ error: 'update_profile_password_error' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD CHANGE]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}