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
