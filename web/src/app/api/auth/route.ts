import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseAdminClient, ensureAppUserProfile } from '../../../lib/supabase-server';
import bcrypt from 'bcryptjs';
import { consumeRateLimit, EMAIL_REGEX, enforceSameOrigin, isSafePasswordCandidate, normalizeEmail, normalizeUsername, USERNAME_REGEX } from '../../../lib/security';

type AuthErrorCode =
    | 'missing_credentials'
    | 'missing_email'
    | 'invalid_email'
    | 'invalid_username'
    | 'weak_password'
    | 'user_exists'
    | 'email_exists'
    | 'create_auth_error'
    | 'create_profile_error'
    | 'invalid_credentials'
    | 'invalid_action'
    | 'server_error';

const errorResponse = (status: number, errorCode: AuthErrorCode, errorDetail?: string) => {
    return NextResponse.json(errorDetail ? { errorCode, errorDetail } : { errorCode }, { status });
};

function buildUsernameBase(username: unknown, fullName: unknown, email: string) {
    const rawBase = [username, fullName, email.split('@')[0], 'user']
        .find((value) => typeof value === 'string' && value.trim().length > 0);

    const normalized = String(rawBase)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .replace(/^[_\.-]+|[_\.-]+$/g, '');

    if (normalized.length >= 3) {
        return normalized.slice(0, 32);
    }

    return `user_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const supabaseAdmin = createSupabaseAdminClient();
        const { username, email, password, fullName, monthlyGoal, action } = await req.json();
        const rawLoginIdentifier = typeof username === 'string' && username.trim().length > 0
            ? username
            : typeof email === 'string'
                ? email
                : '';

        const rateLimitError = consumeRateLimit(req, {
            key: `auth:${String(action ?? 'unknown')}`,
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });
        if (rateLimitError) return rateLimitError;

        if (!password || (action === 'login' && !rawLoginIdentifier)) {
            return errorResponse(400, 'missing_credentials');
        }

        if (action === 'register' && !email) {
            return errorResponse(400, 'missing_email');
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedUsername = normalizeUsername(username);
        const requestedUsername = normalizedUsername.length > 0 ? normalizedUsername : null;
        const parsedGoal = Number(monthlyGoal);
        const nextMonthlyGoal = Number.isFinite(parsedGoal) && parsedGoal >= 0 && parsedGoal <= 1_000_000_000 ? parsedGoal : 0;

        if (requestedUsername && !USERNAME_REGEX.test(requestedUsername)) {
            return errorResponse(400, 'invalid_username');
        }

        if (action === 'register' && !EMAIL_REGEX.test(normalizedEmail)) {
            return errorResponse(400, 'invalid_email');
        }

        if (action === 'register' && !isSafePasswordCandidate(password)) {
            return errorResponse(400, 'weak_password');
        }

        const usernameBase = action === 'register'
            ? buildUsernameBase(requestedUsername, fullName, normalizedEmail)
            : normalizedUsername;

        // Convertir username en email interno para Supabase Auth
        // Esto mantiene compatibilidad con el sistema de usernames existente
        const internalEmail = `${normalizedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}@gastosapp.internal`;

        if (action === 'register') {
            if (requestedUsername) {
                const { data: existing, error: existingError } = await supabaseAdmin
                    .from('User').select('id').eq('username', requestedUsername).maybeSingle();
                if (existingError) {
                    console.error('[AUTH REGISTER] PASO 0 - Error al consultar tabla User:', existingError);
                    return errorResponse(500, 'server_error', `[PASO 0] ${existingError.message}`);
                }
                if (existing) {
                    return errorResponse(400, 'user_exists');
                }
            }

            // PASO 1: Crear usuario en Supabase Auth
            console.log('[AUTH REGISTER] PASO 1 - Creando usuario en Supabase Auth:', normalizedEmail);
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: typeof fullName === 'string' ? fullName.trim() : '',
                    username: requestedUsername ?? usernameBase,
                },
            });

            if (authError || !authData.user) {
                console.error('[AUTH REGISTER] PASO 1 FALLÓ - authError:', authError);
                const authMessage = authError?.message?.toLowerCase() ?? '';
                if (authMessage.includes('already') || authMessage.includes('exists')) {
                    return errorResponse(400, 'email_exists');
                }
                return errorResponse(400, 'create_auth_error', `[PASO 1] ${authError?.message ?? 'Auth user creation failed'}`);
            }
            console.log('[AUTH REGISTER] PASO 1 OK - auth.user.id:', authData.user.id);

            // PASO 2: Crear perfil en tabla User
            // NOTA: Se pasa el id explícitamente porque la columna en Supabase no tiene DEFAULT configurado.
            // Esto ocurre cuando Prisma nunca corrió las migraciones contra la DB (que añade gen_random_uuid()).
            console.log('[AUTH REGISTER] PASO 2 - Insertando perfil en tabla User...');
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUserId = randomUUID();
            let newUser: { id: string; username: string; monthlyGoal: number } | null = null;
            let createError: { code?: string; message?: string } | null = null;

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const suffix = requestedUsername || attempt === 0 ? '' : `_${attempt + 1}`;
                const nextUsername = `${usernameBase.slice(0, Math.max(3, 32 - suffix.length))}${suffix}`;

                const result = await supabaseAdmin
                    .from('User')
                    .insert({ id: newUserId, username: nextUsername, password: hashedPassword, authId: authData.user.id, monthlyGoal: nextMonthlyGoal })
                    .select('id, username, monthlyGoal')
                    .single();

                if (result.data) {
                    newUser = result.data;
                    createError = null;
                    break;
                }

                createError = result.error;
                if (createError?.code !== '23505' || requestedUsername) {
                    break;
                }
            }

            if (!newUser) {
                console.error('[AUTH REGISTER] PASO 2 FALLÓ - createError:', createError);
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => { });
                if (createError?.code === '23505' && requestedUsername) {
                    return errorResponse(400, 'user_exists');
                }
                return errorResponse(500, 'create_profile_error', `[PASO 2] ${createError?.message ?? 'User profile creation failed'}`);
            }
            console.log('[AUTH REGISTER] PASO 2 OK - newUser.id:', newUser.id);

            // PASO 3: Sign-in para obtener el JWT real
            console.log('[AUTH REGISTER] PASO 3 - signInWithPassword...');
            const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (signInError) {
                console.error('[AUTH REGISTER] PASO 3 FALLÓ (no crítico) - signInError:', signInError);
            }

            return NextResponse.json({
                id: newUser.id,
                username: newUser.username,
                monthlyGoal: newUser.monthlyGoal,
                access_token: signIn?.session?.access_token ?? null,
                refresh_token: signIn?.session?.refresh_token ?? null,
            });
        }

        if (action === 'login') {
            const normalizedLoginIdentifier = String(rawLoginIdentifier).trim();
            const loginLooksLikeEmail = normalizedLoginIdentifier.includes('@');

            if (loginLooksLikeEmail) {
                const loginEmail = normalizeEmail(normalizedLoginIdentifier);
                const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });

                if (signInError || !signIn.session?.user) {
                    return errorResponse(401, 'invalid_credentials');
                }

                const user = await ensureAppUserProfile(signIn.session.user);

                return NextResponse.json({
                    id: user.id,
                    username: user.username,
                    monthlyGoal: user.monthlyGoal,
                    access_token: signIn.session.access_token,
                    refresh_token: signIn.session.refresh_token,
                });
            }

            const { data: user } = await supabaseAdmin
                .from('User').select('id, username, password, monthlyGoal, authId').eq('username', normalizedUsername).maybeSingle();

            if (!user) {
                return errorResponse(401, 'invalid_credentials');
            }

            let authEmail = internalEmail;

            if (user.authId) {
                const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(user.authId);
                authEmail = authUserData?.user?.email || internalEmail;
            }

            let passwordValid: boolean;

            if (user.authId) {
                // Usuario con Supabase Auth — verificar contraseña directamente contra Supabase.
                // Esto cubre casos donde el campo password es un placeholder (ej: creado via script).
                const { error: signInCheckError } = await supabaseAdmin.auth.signInWithPassword({
                    email: authEmail,
                    password,
                });
                passwordValid = !signInCheckError;
            } else if (user.password.startsWith('$2')) {
                // Usuario con hash bcrypt (registrado via app)
                passwordValid = await bcrypt.compare(password, user.password);
            } else {
                // Usuario legacy con contraseña en texto plano — verificar y migrar
                passwordValid = user.password === password;
                if (passwordValid) {
                    const hashed = await bcrypt.hash(password, 12);
                    await supabaseAdmin.from('User').update({ password: hashed }).eq('id', user.id);
                }
            }

            if (!passwordValid) {
                return errorResponse(401, 'invalid_credentials');
            }

            // Si no tiene authId aún (usuario legacy con password válido), crearlo en Supabase
            if (!user.authId) {
                const { data: authData } = await supabaseAdmin.auth.admin.createUser({
                    email: internalEmail,
                    password,
                    email_confirm: true,
                });
                if (authData?.user) {
                    await supabaseAdmin.from('User').update({ authId: authData.user.id }).eq('id', user.id);
                }
            }

            // Obtener JWT real de Supabase
            const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: authEmail,
                password,
            });

            if (signInError || !signIn?.session) {
                // Fallback: si Supabase falla, aún retornamos datos básicos (temporal)
                console.error('Supabase signIn error:', signInError);
                return NextResponse.json({ id: user.id, username: user.username, monthlyGoal: user.monthlyGoal });
            }

            return NextResponse.json({
                id: user.id,
                username: user.username,
                monthlyGoal: user.monthlyGoal,
                access_token: signIn.session.access_token,
                refresh_token: signIn.session.refresh_token,
            });
        }

        return errorResponse(400, 'invalid_action');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AUTH GLOBAL CATCH]', message, err);
        return errorResponse(500, 'server_error', process.env.NODE_ENV === 'development' ? `[CATCH] ${message}` : undefined);
    }
}
