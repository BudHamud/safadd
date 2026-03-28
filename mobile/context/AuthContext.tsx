import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { getItemWithLegacyKey } from '../lib/storage';
import { Profile, WebUser } from '../types';
import type { SupportedCurrency } from '@safed/shared/types';
import { SUPPORTED_CURRENCIES } from '@safed/shared/currency';

export type { SupportedCurrency };

const CURRENCY_STORAGE_KEY = 'safadd_currency';
const LEGACY_CURRENCY_STORAGE_KEY = 'safed_currency';
const GOAL_CURRENCY_STORAGE_KEY = 'safadd_goal_currency';
const LEGACY_GOAL_CURRENCY_STORAGE_KEY = 'safed_goal_currency';
const AVAILABLE_CURRENCIES_STORAGE_KEY = 'safadd_available_currencies';
const LEGACY_AVAILABLE_CURRENCIES_STORAGE_KEY = 'safed_available_currencies';
const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

const SUPPORTED_CURRENCIES_SET = new Set<string>(SUPPORTED_CURRENCIES as string[]);

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && SUPPORTED_CURRENCIES_SET.has(value);
}

function normalizeStoredCurrencies(raw: string | null, fallback: SupportedCurrency): SupportedCurrency[] {
  if (!raw) return [fallback];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [fallback];

    const valid = (parsed as unknown[]).filter((c): c is SupportedCurrency => isSupportedCurrency(c));
    return valid.length > 0 ? valid : [fallback];
  } catch {
    return [fallback];
  }
}

function normalizeCurrencyList(raw: unknown, fallback: SupportedCurrency): SupportedCurrency[] {
  if (!Array.isArray(raw)) return [fallback];

  const valid = Array.from(new Set(raw.filter((value): value is SupportedCurrency => isSupportedCurrency(value))));
  return valid.length > 0 ? valid : [fallback];
}

function resolveCurrencyPreferences(input: {
  currency?: unknown;
  goalCurrency?: unknown;
  availableCurrencies?: unknown;
}) {
  const fallbackCurrency = isSupportedCurrency(input.currency) ? input.currency : DEFAULT_CURRENCY;
  const nextAvailableCurrencies = normalizeCurrencyList(input.availableCurrencies, fallbackCurrency);
  const nextCurrency = nextAvailableCurrencies.includes(fallbackCurrency) ? fallbackCurrency : nextAvailableCurrencies[0] ?? DEFAULT_CURRENCY;
  const nextGoalCurrency = isSupportedCurrency(input.goalCurrency) && nextAvailableCurrencies.includes(input.goalCurrency)
    ? input.goalCurrency
    : nextCurrency;

  return {
    currency: nextCurrency,
    goalCurrency: nextGoalCurrency,
    availableCurrencies: nextAvailableCurrencies,
  };
}

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;      // Supabase auth user (auth.users)
  webUser: WebUser | null;    // Row from User table (internal profile)
  profile: Profile | null;    // Derived profile for UI
  loading: boolean;
  configError: string | null;
  signIn: (identifier: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, fullName?: string, monthlyGoal?: number) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currency: SupportedCurrency;
  availableCurrencies: SupportedCurrency[];
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  addCurrency: (currency: SupportedCurrency) => Promise<void>;
  removeCurrency: (currency: SupportedCurrency) => Promise<void>;
  goalCurrency: SupportedCurrency;
  setGoalCurrency: (currency: SupportedCurrency) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, webUser: null, profile: null, loading: true,
  configError: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  currency: 'USD',
  availableCurrencies: ['USD'],
  setCurrency: async () => {},
  addCurrency: async () => {},
  removeCurrency: async () => {},
  goalCurrency: 'USD',
  setGoalCurrency: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [webUser, setWebUser] = useState<WebUser | null>(null);
  const [currency, setCurrencyState] = useState<SupportedCurrency>('USD');
  const [goalCurrency, setGoalCurrencyState] = useState<SupportedCurrency>('USD');
  const [availableCurrencies, setAvailableCurrenciesState] = useState<SupportedCurrency[]>(['USD']);
  const [loading, setLoading] = useState(true);

  const persistCurrencyPreferencesLocally = useCallback(async (prefs: {
    currency: SupportedCurrency;
    goalCurrency: SupportedCurrency;
    availableCurrencies: SupportedCurrency[];
  }) => {
    await Promise.all([
      AsyncStorage.setItem(CURRENCY_STORAGE_KEY, prefs.currency),
      AsyncStorage.setItem(GOAL_CURRENCY_STORAGE_KEY, prefs.goalCurrency),
      AsyncStorage.setItem(AVAILABLE_CURRENCIES_STORAGE_KEY, JSON.stringify(prefs.availableCurrencies)),
    ]);
  }, []);

  const applyCurrencyPreferences = useCallback((prefs: {
    currency: SupportedCurrency;
    goalCurrency: SupportedCurrency;
    availableCurrencies: SupportedCurrency[];
  }) => {
    setCurrencyState(prefs.currency);
    setGoalCurrencyState(prefs.goalCurrency);
    setAvailableCurrenciesState(prefs.availableCurrencies);
  }, []);

  const syncCurrencyPreferencesRemotely = useCallback(async (prefs: {
    currency: SupportedCurrency;
    goalCurrency: SupportedCurrency;
    availableCurrencies: SupportedCurrency[];
  }) => {
    if (supabaseConfigError || !user?.id) return;

    const { error } = await supabase
      .from('User')
      .update({
        currency: prefs.currency,
        goalCurrency: prefs.goalCurrency,
        availableCurrencies: prefs.availableCurrencies,
      })
      .eq('authId', user.id);

    if (error) {
      console.warn('[AuthContext] syncCurrencyPreferencesRemotely error:', error.message);
      return;
    }

    setWebUser((current) => current
      ? {
          ...current,
          currency: prefs.currency,
          goalCurrency: prefs.goalCurrency,
          availableCurrencies: prefs.availableCurrencies,
        }
      : current);
  }, [user?.id]);

  useEffect(() => {
    Promise.all([
      getItemWithLegacyKey(CURRENCY_STORAGE_KEY, [LEGACY_CURRENCY_STORAGE_KEY]),
      getItemWithLegacyKey(GOAL_CURRENCY_STORAGE_KEY, [LEGACY_GOAL_CURRENCY_STORAGE_KEY]),
      getItemWithLegacyKey(AVAILABLE_CURRENCIES_STORAGE_KEY, [LEGACY_AVAILABLE_CURRENCIES_STORAGE_KEY]),
    ]).then(([storedCurrency, storedGoalCurrency, storedAvailableCurrencies]) => {
      const fallbackCurrency = isSupportedCurrency(storedCurrency) ? storedCurrency : DEFAULT_CURRENCY;
      const nextAvailableCurrencies = normalizeStoredCurrencies(storedAvailableCurrencies, fallbackCurrency);
      const nextCurrency = isSupportedCurrency(storedCurrency) && nextAvailableCurrencies.includes(storedCurrency)
        ? storedCurrency
        : nextAvailableCurrencies[0] ?? DEFAULT_CURRENCY;
      const nextGoalCurrency = isSupportedCurrency(storedGoalCurrency) && nextAvailableCurrencies.includes(storedGoalCurrency)
        ? storedGoalCurrency
        : nextCurrency;

      applyCurrencyPreferences({
        currency: nextCurrency,
        goalCurrency: nextGoalCurrency,
        availableCurrencies: nextAvailableCurrencies,
      });
    }).catch(() => undefined);
  }, [applyCurrencyPreferences]);

  // Load User row from gastos-app schema by authId = auth.users.id
  const loadWebUser = useCallback(async (authUid: string) => {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id, username, authId, role, monthlyGoal, currency, goalCurrency, availableCurrencies, createdAt')
        .eq('authId', authUid)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] loadWebUser error:', error.message);
        return null;
      }
      if (data) {
        const typedData = data as WebUser;
        const nextPrefs = resolveCurrencyPreferences({
          currency: typedData.currency,
          goalCurrency: typedData.goalCurrency,
          availableCurrencies: typedData.availableCurrencies,
        });

        applyCurrencyPreferences(nextPrefs);
        await persistCurrencyPreferencesLocally(nextPrefs);
        setWebUser(typedData);
        return typedData;
      }
      console.warn('[AuthContext] No User row found for authId', authUid);
      return null;
    } catch (e) {
      console.warn('[AuthContext] loadWebUser exception:', e);
      return null;
    }
  }, [applyCurrencyPreferences, persistCurrencyPreferencesLocally]);

  useEffect(() => {
    if (supabaseConfigError) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadWebUser(session.user.id);
        } else {
          setWebUser(null);
        }
      } catch (error) {
        if (isMounted) {
          console.warn('[AuthContext] getSession failed:', error);
          setSession(null);
          setUser(null);
          setWebUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadWebUser(session.user.id).finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
      } else {
        setWebUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadWebUser]);

  // Derive Profile for UI compatibility
  const profile: Profile | null = webUser ? {
    id: webUser.id,
    authId: webUser.authId ?? '',
    username: webUser.username,
    full_name: webUser.username,
    currency,
    goal_currency: goalCurrency,
    available_currencies: availableCurrencies,
    monthly_goal: webUser.monthlyGoal,
    theme: 'dark',
    accent_color: null,
    notifications_enabled: true,
  } : null;

  const handleSignIn = async (identifier: string, password: string) => {
    if (supabaseConfigError) {
      return { error: new Error(supabaseConfigError) };
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      return { error: new Error('missing_credentials') };
    }

    if (normalizedIdentifier.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedIdentifier.toLowerCase(), password });
      return { error };
    }

    try {
      const response = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: normalizedIdentifier, password }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { error: new Error(String(payload?.errorCode || payload?.error || 'invalid_credentials')) };
      }

      if (!payload?.access_token || !payload?.refresh_token) {
        return { error: new Error('username_login_session_unavailable') };
      }

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const handleSignUp = async (email: string, password: string, fullName?: string, monthlyGoal?: number) => {
    if (supabaseConfigError) {
      return { error: new Error(supabaseConfigError) };
    }

    try {
      const response = await apiFetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName?.trim() || undefined,
          monthlyGoal: Number.isFinite(monthlyGoal) && (monthlyGoal ?? 0) >= 0 ? monthlyGoal : 0,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { error: new Error(String(payload?.errorCode || payload?.error || 'register_failed')) };
      }

      if (!payload?.access_token || !payload?.refresh_token) {
        return { error: new Error('registration_session_unavailable') };
      }

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });

      if (error) {
        return { error };
      }

    } catch (error) {
      return { error };
    }

    const defaultPrefs = { currency: DEFAULT_CURRENCY, goalCurrency: DEFAULT_CURRENCY, availableCurrencies: [DEFAULT_CURRENCY] };
    applyCurrencyPreferences(defaultPrefs);
    await persistCurrencyPreferencesLocally(defaultPrefs);

    return { error: null };
  };

  const handleSignOut = async () => {
    if (supabaseConfigError) {
      setSession(null);
      setUser(null);
      setWebUser(null);
      return;
    }

    await supabase.auth.signOut();
    setWebUser(null);
  };

  const refreshProfile = useCallback(async () => {
    if (supabaseConfigError) return;
    if (user?.id) await loadWebUser(user.id);
  }, [user, loadWebUser]);

  const setCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextAvailableCurrencies = availableCurrencies.includes(nextCurrency)
      ? availableCurrencies
      : [...availableCurrencies, nextCurrency];
    const nextPrefs = {
      currency: nextCurrency,
      goalCurrency: nextAvailableCurrencies.includes(goalCurrency) ? goalCurrency : nextCurrency,
      availableCurrencies: nextAvailableCurrencies,
    };

    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);
    await syncCurrencyPreferencesRemotely(nextPrefs);
  }, [availableCurrencies, goalCurrency, applyCurrencyPreferences, persistCurrencyPreferencesLocally, syncCurrencyPreferencesRemotely]);

  const addCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    if (availableCurrencies.includes(nextCurrency)) return;
    const nextPrefs = {
      currency,
      goalCurrency,
      availableCurrencies: [...availableCurrencies, nextCurrency],
    };
    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);
    await syncCurrencyPreferencesRemotely(nextPrefs);
  }, [availableCurrencies, currency, goalCurrency, applyCurrencyPreferences, persistCurrencyPreferencesLocally, syncCurrencyPreferencesRemotely]);

  const removeCurrency = useCallback(async (code: SupportedCurrency) => {
    if (code === currency || availableCurrencies.length <= 1) return;
    const nextAvailableCurrencies = availableCurrencies.filter((c) => c !== code);
    const nextPrefs = {
      currency,
      goalCurrency: code === goalCurrency ? currency : goalCurrency,
      availableCurrencies: nextAvailableCurrencies,
    };
    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);
    await syncCurrencyPreferencesRemotely(nextPrefs);
  }, [availableCurrencies, currency, goalCurrency, applyCurrencyPreferences, persistCurrencyPreferencesLocally, syncCurrencyPreferencesRemotely]);

  const setGoalCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextPrefs = {
      currency,
      goalCurrency: availableCurrencies.includes(nextCurrency) ? nextCurrency : currency,
      availableCurrencies,
    };
    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);
    await syncCurrencyPreferencesRemotely(nextPrefs);
  }, [availableCurrencies, currency, applyCurrencyPreferences, persistCurrencyPreferencesLocally, syncCurrencyPreferencesRemotely]);

  return (
    <AuthContext.Provider value={{
      session, user, webUser, profile, loading,
      configError: supabaseConfigError,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      refreshProfile,
      currency,
      availableCurrencies,
      setCurrency,
      addCurrency,
      removeCurrency,
      goalCurrency,
      setGoalCurrency,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
