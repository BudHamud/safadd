import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSupabaseAdminClient } from '../../../../../lib/supabase-server';
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

        const { accessToken, password } = await req.json();
        if (!accessToken || !password) {
            return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
        }

        if (!isSafePasswordCandidate(password)) {
            return NextResponse.json({ error: 'weak_password' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdminClient();
        const {
            data: { user },
            error: getUserError,
        } = await supabaseAdmin.auth.getUser(accessToken);

        if (getUserError || !user) {
            return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
        }

        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password,
        });

        if (updateAuthError) {
            console.error('[AUTH PASSWORD COMPLETE] update auth error', updateAuthError);
            return NextResponse.json({ error: 'update_password_error' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const { error: updateProfileError } = await supabaseAdmin
            .from('User')
            .update({ password: hashedPassword })
            .eq('authId', user.id);

        if (updateProfileError) {
            console.error('[AUTH PASSWORD COMPLETE] update profile error', updateProfileError);
            return NextResponse.json({ error: 'update_profile_password_error' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD COMPLETE]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}