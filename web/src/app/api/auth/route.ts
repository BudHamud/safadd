import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseAuthClient, ensureAppUserProfileWithSupabase } from '../../../lib/supabase-server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { consumeRateLimit, EMAIL_REGEX, enforceSameOrigin, getClientIp, getRateLimitStatus, isSafePasswordCandidate, normalizeEmail, normalizeUsername, resetRateLimit, USERNAME_REGEX } from '../../../lib/security';
import { isTurnstileEnabled, verifyTurnstileToken } from '../../../lib/turnstile';
import { SUPPORTED_CURRENCIES } from '@safed/shared/currency';
import type { SupportedCurrency } from '@safed/shared/types';
import { clampAvailableCurrenciesForPlan } from '../../../lib/plan';

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
    | 'login_identifier_not_found'
    | 'captcha_invalid'
    | 'rate_limited'
    | 'invalid_action'
    | 'server_error';

type AuthErrorResponseOptions = {
    errorDetail?: string;
    retryAfter?: number;
    canRetryAt?: string;
    requiresCaptcha?: boolean;
};

const errorResponse = (status: number, errorCode: AuthErrorCode, options: AuthErrorResponseOptions = {}) => {
    const payload: Record<string, string | number | boolean> = { errorCode };

    if (options.errorDetail) payload.errorDetail = options.errorDetail;
    if (typeof options.retryAfter === 'number') payload.retryAfter = options.retryAfter;
    if (options.canRetryAt) payload.canRetryAt = options.canRetryAt;
    if (typeof options.requiresCaptcha === 'boolean') payload.requiresCaptcha = options.requiresCaptcha;

    return NextResponse.json(payload, { status });
};

const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES as unknown as string[]);

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
    return typeof value === 'string' && SUPPORTED_CURRENCY_SET.has(value);
}

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

type LoginUserRecord = {
    id: string;
    username: string;
    password: string;
    monthlyGoal: number;
    authId: string | null;
    currency: string;
    goalCurrency: string;
    availableCurrencies: string[];
};

async function findLoginUser(identifier: string): Promise<{ user: LoginUserRecord | null; matchedBy: 'username' | 'auth_username' | 'full_name' | null }> {
    const normalizedIdentifier = normalizeUsername(identifier);

    const directUser = await prisma.user.findUnique({
        where: { username: normalizedIdentifier },
        select: {
            id: true,
            username: true,
            password: true,
            monthlyGoal: true,
            authId: true,
            currency: true,
            goalCurrency: true,
            availableCurrencies: true,
        },
    });

    if (directUser) {
        return { user: directUser, matchedBy: 'username' };
    }

    try {
        const rows = await prisma.$queryRaw<Array<LoginUserRecord & { matchedBy: 'auth_username' | 'full_name' }>>`
            select
                u.id,
                u.username,
                u.password,
                u."monthlyGoal",
                u."authId",
                u.currency,
                u."goalCurrency",
                u."availableCurrencies",
                case
                    when lower(coalesce(au.raw_user_meta_data ->> 'username', '')) = lower(${normalizedIdentifier}) then 'auth_username'
                    when lower(coalesce(au.raw_user_meta_data ->> 'full_name', '')) = lower(${normalizedIdentifier}) then 'full_name'
                    else 'full_name'
                end as "matchedBy"
            from public."User" u
            join auth.users au on au.id::text = u."authId"
            where lower(coalesce(au.raw_user_meta_data ->> 'username', '')) = lower(${normalizedIdentifier})
               or lower(coalesce(au.raw_user_meta_data ->> 'full_name', '')) = lower(${normalizedIdentifier})
            order by case
                when lower(coalesce(au.raw_user_meta_data ->> 'username', '')) = lower(${normalizedIdentifier}) then 0
                else 1
            end
            limit 1
        `;

        if (rows[0]) {
            const { matchedBy, ...user } = rows[0];
            return { user, matchedBy };
        }
    } catch (error) {
        console.error('[AUTH LOGIN LOOKUP FALLBACK]', normalizedIdentifier, error);
    }

    return { user: null, matchedBy: null };
}

export async function POST(req: Request) {
    try {
        const originError = enforceSameOrigin(req);
        if (originError) return originError;

        const supabase = createSupabaseAuthClient();
        const {
            username,
            email,
            password,
            fullName,
            monthlyGoal,
            expenseGoal,
            primaryCurrency,
            secondaryCurrencies,
            turnstileToken,
            action
        } = await req.json();
        const rawLoginIdentifier = typeof username === 'string' && username.trim().length > 0
            ? username
            : typeof email === 'string'
                ? email
                : '';

        const rateLimitOptions = {
            key: `auth:${String(action ?? 'unknown')}`,
            limit: 10,
            windowMs: 15 * 60 * 1000,
        };
        const rateLimitStatus = getRateLimitStatus(req, rateLimitOptions);

        if (rateLimitStatus.limited) {
            const challengeToken = typeof turnstileToken === 'string' ? turnstileToken.trim() : '';

            if (!isTurnstileEnabled() || !challengeToken) {
                return errorResponse(429, 'rate_limited', {
                    retryAfter: rateLimitStatus.retryAfter,
                    canRetryAt: rateLimitStatus.canRetryAt ?? undefined,
                    requiresCaptcha: isTurnstileEnabled(),
                });
            }

            const verification = await verifyTurnstileToken(challengeToken, getClientIp(req));
            if (!verification.ok) {
                return errorResponse(400, 'captcha_invalid', {
                    errorDetail: verification.errorCodes.join(', '),
                    requiresCaptcha: true,
                });
            }

            resetRateLimit(req, rateLimitOptions);
        }

        const rateLimitError = consumeRateLimit(req, rateLimitOptions);
        if (rateLimitError) return rateLimitError;

        if (!password || (action === 'login' && !rawLoginIdentifier)) {
            return errorResponse(400, 'missing_credentials');
        }

        if (action === 'register' && !email) {
            return errorResponse(400, 'missing_email');
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedUsername = normalizeUsername(username);
        const normalizedLoginIdentifier = normalizeUsername(rawLoginIdentifier);
        const loginLooksLikeEmail = action === 'login' && normalizedLoginIdentifier.includes('@');
        const requestedUsername = normalizedUsername.length > 0 ? normalizedUsername : null;
        const parsedGoal = Number(expenseGoal ?? monthlyGoal);
        const nextMonthlyGoal = Number.isFinite(parsedGoal) && parsedGoal >= 0 && parsedGoal <= 1_000_000_000 ? parsedGoal : 0;

        const normalizedPrimary = typeof primaryCurrency === 'string' ? primaryCurrency.toUpperCase() : 'USD';
        const nextPrimaryCurrency: SupportedCurrency = isSupportedCurrency(normalizedPrimary) ? normalizedPrimary : 'USD';

        const normalizedSecondaryCurrencies: SupportedCurrency[] = Array.isArray(secondaryCurrencies)
            ? Array.from(
                new Set(
                    secondaryCurrencies
                        .map((c) => (typeof c === 'string' ? c.toUpperCase() : null))
                        .filter((c): c is string => c !== null && c.length > 0)
                        .filter((c): c is SupportedCurrency => isSupportedCurrency(c) && c !== nextPrimaryCurrency)
                ),
            )
            : [];
        const nextAvailableCurrencies = clampAvailableCurrenciesForPlan(
            [nextPrimaryCurrency, ...normalizedSecondaryCurrencies],
            nextPrimaryCurrency,
            'free',
        );

        if (action === 'register' && requestedUsername && !USERNAME_REGEX.test(requestedUsername)) {
            return errorResponse(400, 'invalid_username');
        }

        if (action === 'login' && normalizedLoginIdentifier && !loginLooksLikeEmail && !USERNAME_REGEX.test(normalizedLoginIdentifier)) {
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
                return errorResponse(400, 'create_auth_error', { errorDetail: authError?.message ?? 'Auth user creation failed' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const newUserId = randomUUID();
            let newUser: { id: string; username: string; monthlyGoal: number; currency: string; goalCurrency: string; availableCurrencies: string[] } | null = null;
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
                            currency: nextPrimaryCurrency,
                            goalCurrency: nextPrimaryCurrency,
                            availableCurrencies: nextAvailableCurrencies,
                        },
                        select: { id: true, username: true, monthlyGoal: true, currency: true, goalCurrency: true, availableCurrencies: true },
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
                return errorResponse(500, 'create_profile_error', { errorDetail: createError?.message ?? 'User profile creation failed' });
            }

            const signIn = authData.session
                ? { session: authData.session }
                : (await supabase.auth.signInWithPassword({ email: normalizedEmail, password })).data;

            return NextResponse.json({
                id: newUser.id,
                username: newUser.username,
                monthlyGoal: newUser.monthlyGoal,
                currency: newUser.currency,
                goalCurrency: newUser.goalCurrency,
                availableCurrencies: newUser.availableCurrencies,
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
                    if (signInError?.status === 429) {
                        return errorResponse(429, 'rate_limited', {
                            retryAfter: 60,
                            requiresCaptcha: false, // true
                        });
                    }
                    return errorResponse(401, 'invalid_credentials');
                }

                const user = await ensureAppUserProfileWithSupabase(signIn.session.access_token, signIn.session.user);

                return NextResponse.json({
                    id: user.id,
                    username: user.username,
                    monthlyGoal: user.monthlyGoal,
                    currency: user.currency,
                    goalCurrency: user.goalCurrency,
                    availableCurrencies: user.availableCurrencies,
                    access_token: signIn.session.access_token,
                    refresh_token: signIn.session.refresh_token,
                });
            }

            const { user, matchedBy } = await findLoginUser(normalizedUsername);

            if (!user) {
                return errorResponse(404, 'login_identifier_not_found');
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
                if (signInError?.status === 429) {
                    return errorResponse(429, 'rate_limited', {
                        retryAfter: 60,
                        requiresCaptcha: false, // <-- CAMBIAR A FALSE
                    });
                }
                return errorResponse(401, 'invalid_credentials');
            }

            return NextResponse.json({
                id: user.id,
                username: user.username,
                monthlyGoal: user.monthlyGoal,
                currency: user.currency,
                goalCurrency: user.goalCurrency,
                availableCurrencies: user.availableCurrencies,
                matchedBy,
                access_token: signIn.session.access_token,
                refresh_token: signIn.session.refresh_token,
            });
        }

        return errorResponse(400, 'invalid_action');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AUTH GLOBAL CATCH]', message, err);
        return errorResponse(500, 'server_error', {
            errorDetail: process.env.NODE_ENV === 'development' ? `[CATCH] ${message}` : undefined,
        });
    }
}
