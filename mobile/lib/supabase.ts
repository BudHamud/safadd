import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout, isTimeoutError } from './api';
import { reportClientError } from './clientErrorReporter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const INVALID_ANON_KEY_PLACEHOLDERS = new Set([
  'REPLACE_WITH_REAL_SUPABASE_ANON_KEY',
  'your-public-anon-key',
]);

function decodeJwtPayload(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob ? globalThis.atob(padded) : '';
    return JSON.parse(decoded) as { role?: string };
  } catch {
    return null;
  }
}

function resolveSupabaseConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Missing Supabase Expo env vars. Define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart Expo.';
  }

  if (INVALID_ANON_KEY_PLACEHOLDERS.has(supabaseAnonKey.trim())) {
    return 'Supabase anon key is still a placeholder. Replace EXPO_PUBLIC_SUPABASE_ANON_KEY with the real public anon key from Supabase before starting the mobile app.';
  }

  const supabaseAnonPayload = decodeJwtPayload(supabaseAnonKey);
  if (!supabaseAnonPayload?.role) {
    return 'Supabase anon key is malformed. Expected the public anon JWT from Supabase project settings.';
  }

  if (supabaseAnonPayload.role === 'service_role') {
    return 'Unsafe Supabase configuration: EXPO_PUBLIC_SUPABASE_ANON_KEY is using a service_role key. Replace it with the public anon key before starting the mobile app.';
  }

  if (supabaseAnonPayload.role !== 'anon') {
    return `Unexpected Supabase key role: ${supabaseAnonPayload.role}. EXPO_PUBLIC_SUPABASE_ANON_KEY must be the public anon key.`;
  }

  return null;
}

export const supabaseConfigError = resolveSupabaseConfigError();

const supabaseTimeoutFetch: typeof fetch = async (input, init) => {
  try {
    return await fetchWithTimeout(input, init);
  } catch (error) {
    if (isTimeoutError(error)) {
      await reportClientError(error, {
        context: 'supabase_request_timeout',
        metadata: {
          method: init?.method ?? 'GET',
          url: typeof input === 'string' ? input : input instanceof Request ? input.url : String(input),
        },
      });
    }

    throw error;
  }
};

export const supabase = createClient(supabaseUrl || 'https://invalid-project.supabase.co', supabaseAnonKey || 'invalid.key.placeholder', {
  auth: {
    // Persist auth session in AsyncStorage (required by the registration flow).
    storage: {
      getItem: async (key: string) => AsyncStorage.getItem(key),
      setItem: async (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: async (key: string) => AsyncStorage.removeItem(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: supabaseTimeoutFetch,
  },
});

// ── Auth helpers ────────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signUp = async (email: string, password: string, fullName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName ?? '' },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// ── Profile helpers ─────────────────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const upsertProfile = async (profile: Partial<{ id: string; full_name: string; currency: string; monthly_goal: number; accent_color: string; notifications_enabled: boolean }>) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .eq('id', profile.id)
    .select()
    .single();
  return { data, error };
};
