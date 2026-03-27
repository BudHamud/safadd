import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from './prisma';
import { getRequiredServerEnv } from './security';

const supabaseUrl = getRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredServerEnv('SUPABASE_ANON_KEY');
const authUserEndpoint = new URL('/auth/v1/user', supabaseUrl).toString();
const authSignOutEndpoint = new URL('/auth/v1/logout?scope=global', supabaseUrl).toString();

export const createSupabaseAuthClient = () => createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

export const createAuthenticatedSupabaseClient = (accessToken: string) => createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    },
});

function buildUsernameBase(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
    const metadata = user.user_metadata ?? {};
    const rawBase = [metadata.username, metadata.full_name, user.email?.split('@')[0], `user_${user.id.slice(0, 8)}`]
        .find((value) => typeof value === 'string' && value.trim().length > 0);

    const normalized = String(rawBase)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .replace(/^[_\.-]+|[_\.-]+$/g, '');

    if (normalized.length >= 3) {
        return normalized.slice(0, 32);
    }

    return `user_${user.id.replace(/-/g, '').slice(0, 12)}`;
}

export async function ensureAppUserProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
    const existingProfile = await prisma.user.findUnique({
        where: { authId: user.id },
        select: {
            id: true,
            username: true,
            role: true,
            monthlyGoal: true,
            createdAt: true,
            authId: true,
        },
    });

    if (existingProfile) {
        return existingProfile;
    }

    const baseUsername = buildUsernameBase(user);
    const passwordPlaceholder = `!auth-managed!${randomUUID()}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const suffix = attempt === 0 ? '' : `_${user.id.replace(/-/g, '').slice(0, attempt + 3)}`;
        const username = `${baseUsername.slice(0, Math.max(3, 32 - suffix.length))}${suffix}`;

        try {
            return await prisma.user.create({
                data: {
                    id: randomUUID(),
                    username,
                    password: passwordPlaceholder,
                    authId: user.id,
                    monthlyGoal: 0,
                },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    monthlyGoal: true,
                    createdAt: true,
                    authId: true,
                },
            });
        } catch (error) {
            const racedProfile = await prisma.user.findUnique({
                where: { authId: user.id },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    monthlyGoal: true,
                    createdAt: true,
                    authId: true,
                },
            });

            if (racedProfile) {
                return racedProfile;
            }

            const errorCode = typeof error === 'object' && error !== null && 'code' in error
                ? String((error as { code?: string }).code ?? '')
                : '';

            if (errorCode !== 'P2002') {
                throw error;
            }
        }
    }

    throw new Error('user_profile_provision_failed');
}

export async function updateAuthenticatedSupabaseUser(accessToken: string, attributes: Record<string, unknown>) {
    const response = await fetch(authUserEndpoint, {
        method: 'PUT',
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributes),
    });

    const payload = await response.json().catch(() => null);
    return {
        data: payload,
        status: response.status,
        error: response.ok ? null : new Error(
            typeof payload?.msg === 'string'
                ? payload.msg
                : typeof payload?.error_description === 'string'
                    ? payload.error_description
                    : typeof payload?.error === 'string'
                        ? payload.error
                        : 'Supabase auth update failed'
        ),
    };
}

export async function signOutAuthenticatedSupabaseUser(accessToken: string) {
    const response = await fetch(authSignOutEndpoint, {
        method: 'POST',
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.ok;
}

// Verifica el JWT del usuario y retorna el user autenticado
// Lanza un error si el token es inválido o expiró
export async function requireAuth(req: Request) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { user: null, accessToken: null, supabase: null, error: 'No autorizado: falta token', status: 401 };
    }

    const supabase = createSupabaseAuthClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return { user: null, accessToken: null, supabase: null, error: 'Token inválido o expirado', status: 401 };
    }

    return {
        user,
        accessToken: token,
        supabase: createAuthenticatedSupabaseClient(token),
        error: null,
        status: 200,
    };
}
