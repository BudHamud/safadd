import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseAuthClient, ensureAppUserProfileWithSupabase } from '../../../lib/supabase-server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
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

async function getAuthEmailById(authId: string | null | undefined) {
    if (!authId) {
        return null;
    }

    try {
        const functionRows = await prisma.$queryRaw<Array<{ email: string | null }>>`
            select public.get_auth_email_by_id(${authId}) as email
        `;

        if (functionRows[0]?.email) {
            return functionRows[0].email;
        }
    } catch (error) {
        console.error('[AUTH EMAIL LOOKUP FUNCTION]', authId, error);
    }

    try {
        const directRows = await prisma.$queryRaw<Array<{ email: string | null }>>`
            select email::text
            from auth.users
            where id = ${authId}::uuid
            limit 1
        `;

        return directRows[0]?.email ?? null;
    } catch (error) {
        console.error('[AUTH EMAIL LOOKUP DIRECT]', authId, error);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const supabase = createSupabaseAuthClient();
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
                const existing = await prisma.user.findUnique({ where: { username: requestedUsername }, select: { id: true } });
                if (existing) {
                    return errorResponse(400, 'user_exists');
                }
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    data: {
                        full_name: typeof fullName === 'string' ? fullName.trim() : '',
                        username: requestedUsername ?? usernameBase,
                    },
                },
            });

            if (authError || !authData.user) {
                const authMessage = authError?.message?.toLowerCase() ?? '';
                if (authMessage.includes('already') || authMessage.includes('exists')) {
                    return errorResponse(400, 'email_exists');
                }
                return errorResponse(400, 'create_auth_error', authError?.message ?? 'Auth user creation failed');
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const newUserId = randomUUID();
            let newUser: { id: string; username: string; monthlyGoal: number } | null = null;
            let createError: { code?: string; message?: string } | null = null;

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const suffix = requestedUsername || attempt === 0 ? '' : `_${attempt + 1}`;
                const nextUsername = `${usernameBase.slice(0, Math.max(3, 32 - suffix.length))}${suffix}`;

                try {
                    newUser = await prisma.user.create({
                        data: {
                            id: newUserId,
                            username: nextUsername,
                            password: hashedPassword,
                            authId: authData.user.id,
                            monthlyGoal: nextMonthlyGoal,
                        },
                        select: { id: true, username: true, monthlyGoal: true },
                    });
                    createError = null;
                    break;
                } catch (error) {
                    createError = {
                        code: typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code ?? '') : undefined,
                        message: error instanceof Error ? error.message : String(error),
                    };
                    if (createError.code !== 'P2002' || requestedUsername) {
                        break;
                    }
                }
            }

            if (!newUser) {
                if (createError?.code === 'P2002' && requestedUsername) {
                    return errorResponse(400, 'user_exists');
                }
                return errorResponse(500, 'create_profile_error', createError?.message ?? 'User profile creation failed');
            }

            const signIn = authData.session
                ? { session: authData.session }
                : (await supabase.auth.signInWithPassword({ email: normalizedEmail, password })).data;

            return NextResponse.json({
                id: newUser.id,
                username: newUser.username,
                monthlyGoal: newUser.monthlyGoal,
                access_token: signIn.session?.access_token ?? null,
                refresh_token: signIn.session?.refresh_token ?? null,
            });
        }

        if (action === 'login') {
            const normalizedLoginIdentifier = String(rawLoginIdentifier).trim();
            const loginLooksLikeEmail = normalizedLoginIdentifier.includes('@');

            if (loginLooksLikeEmail) {
                const loginEmail = normalizeEmail(normalizedLoginIdentifier);
                const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });

                if (signInError || !signIn.session?.user) {
                    return errorResponse(401, 'invalid_credentials');
                }

                const user = await ensureAppUserProfileWithSupabase(signIn.session.access_token, signIn.session.user);

                return NextResponse.json({
                    id: user.id,
                    username: user.username,
                    monthlyGoal: user.monthlyGoal,
                    access_token: signIn.session.access_token,
                    refresh_token: signIn.session.refresh_token,
                });
            }

            const user = await prisma.user.findUnique({
                where: { username: normalizedUsername },
                select: { id: true, username: true, password: true, monthlyGoal: true, authId: true },
            });

            if (!user) {
                return errorResponse(401, 'invalid_credentials');
            }

            let passwordValid: boolean;

            if (user.password.startsWith('$2')) {
                passwordValid = await bcrypt.compare(password, user.password);
            } else {
                passwordValid = user.password === password;
                if (passwordValid) {
                    const hashed = await bcrypt.hash(password, 12);
                    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
                }
            }

            if (!passwordValid) {
                return errorResponse(401, 'invalid_credentials');
            }

            let authEmail = internalEmail;

            if (user.authId) {
                authEmail = (await getAuthEmailById(user.authId)) ?? internalEmail;
            }

            if (!user.authId) {
                const { data: authData } = await supabase.auth.signUp({
                    email: internalEmail,
                    password,
                });
                if (authData?.user) {
                    await prisma.user.update({ where: { id: user.id }, data: { authId: authData.user.id } });
                    authEmail = internalEmail;
                }
            }

            const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password,
            });

            if (signInError || !signIn?.session) {
                console.error('Supabase signIn error:', signInError);
                return errorResponse(401, 'invalid_credentials');
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
