import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getRequiredServerEnv } from './security';

const supabaseUrl = getRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');

// Service role client — bypasea RLS, solo usar en server-side.
// Se expone también como factory para evitar reutilizar una sesión mutada entre requests.
export const createSupabaseAdminClient = () => createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// Cliente compartido para rutas que solo hacen operaciones admin/read-only.
export const supabaseAdmin = createSupabaseAdminClient();

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
    const existingProfileQuery = await supabaseAdmin
        .from('User')
        .select('id, username, role, monthlyGoal, createdAt, authId')
        .eq('authId', user.id)
        .maybeSingle();

    if (existingProfileQuery.data) {
        return existingProfileQuery.data;
    }

    if (existingProfileQuery.error) {
        throw existingProfileQuery.error;
    }

    const baseUsername = buildUsernameBase(user);
    const passwordPlaceholder = `!auth-managed!${randomUUID()}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const suffix = attempt === 0 ? '' : `_${user.id.replace(/-/g, '').slice(0, attempt + 3)}`;
        const username = `${baseUsername.slice(0, Math.max(3, 32 - suffix.length))}${suffix}`;

        const { data: insertedProfile, error: insertError } = await supabaseAdmin
            .from('User')
            .insert({
                id: randomUUID(),
                username,
                password: passwordPlaceholder,
                authId: user.id,
                monthlyGoal: 0,
            })
            .select('id, username, role, monthlyGoal, createdAt, authId')
            .single();

        if (insertedProfile) {
            return insertedProfile;
        }

        const racedProfileQuery = await supabaseAdmin
            .from('User')
            .select('id, username, role, monthlyGoal, createdAt, authId')
            .eq('authId', user.id)
            .maybeSingle();

        if (racedProfileQuery.data) {
            return racedProfileQuery.data;
        }

        const errorCode = insertError?.code ?? '';
        if (errorCode !== '23505') {
            throw insertError;
        }
    }

    throw new Error('user_profile_provision_failed');
}

// Verifica el JWT del usuario y retorna el user autenticado
// Lanza un error si el token es inválido o expiró
export async function requireAuth(req: Request) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { user: null, error: 'No autorizado: falta token', status: 401 };
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        return { user: null, error: 'Token inválido o expirado', status: 401 };
    }

    return { user, error: null, status: 200 };
}
