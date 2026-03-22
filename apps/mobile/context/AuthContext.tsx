import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { getItemWithLegacyKey } from '../lib/storage';
import { Profile, WebUser } from '../types';

const CURRENCY_STORAGE_KEY = 'safadd_currency';
const LEGACY_CURRENCY_STORAGE_KEY = 'safed_currency';
const GOAL_CURRENCY_STORAGE_KEY = 'safadd_goal_currency';
const LEGACY_GOAL_CURRENCY_STORAGE_KEY = 'safed_goal_currency';
const AVAILABLE_CURRENCIES_STORAGE_KEY = 'safadd_available_currencies';
const LEGACY_AVAILABLE_CURRENCIES_STORAGE_KEY = 'safed_available_currencies';
export type SupportedCurrency = 'ILS' | 'USD' | 'ARS' | 'EUR';
const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'ARS', 'ILS'];

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return value === 'ILS' || value === 'USD' || value === 'ARS' || value === 'EUR';
}

function normalizeStoredCurrencies(raw: string | null, fallback: SupportedCurrency): SupportedCurrency[] {
  if (!raw) return [fallback];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [fallback];

    const unique = SUPPORTED_CURRENCIES.filter((currency) => parsed.includes(currency));
    return unique.length > 0 ? unique : [fallback];
  } catch {
    return [fallback];
  }
}

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;      // Supabase auth user (auth.users)
  webUser: WebUser | null;    // Row from User table (internal profile)
  profile: Profile | null;    // Derived profile for UI
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currency: SupportedCurrency;
  availableCurrencies: SupportedCurrency[];
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  addCurrency: (currency: SupportedCurrency) => Promise<void>;
  goalCurrency: SupportedCurrency;
  setGoalCurrency: (currency: SupportedCurrency) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, webUser: null, profile: null, loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  currency: 'USD',
  availableCurrencies: ['USD'],
  setCurrency: async () => {},
  addCurrency: async () => {},
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

  useEffect(() => {
    Promise.all([
      getItemWithLegacyKey(CURRENCY_STORAGE_KEY, [LEGACY_CURRENCY_STORAGE_KEY]),
      getItemWithLegacyKey(GOAL_CURRENCY_STORAGE_KEY, [LEGACY_GOAL_CURRENCY_STORAGE_KEY]),
      getItemWithLegacyKey(AVAILABLE_CURRENCIES_STORAGE_KEY, [LEGACY_AVAILABLE_CURRENCIES_STORAGE_KEY]),
    ]).then(([storedCurrency, storedGoalCurrency, storedAvailableCurrencies]) => {
      const fallbackCurrency = isSupportedCurrency(storedCurrency) ? storedCurrency : 'USD';
      const nextAvailableCurrencies = normalizeStoredCurrencies(storedAvailableCurrencies, fallbackCurrency);
      const nextCurrency = isSupportedCurrency(storedCurrency) && nextAvailableCurrencies.includes(storedCurrency)
        ? storedCurrency
        : nextAvailableCurrencies[0] ?? 'USD';
      const nextGoalCurrency = isSupportedCurrency(storedGoalCurrency) && nextAvailableCurrencies.includes(storedGoalCurrency)
        ? storedGoalCurrency
        : nextCurrency;

      setCurrencyState(nextCurrency);
      setGoalCurrencyState(nextGoalCurrency);
      setAvailableCurrenciesState(nextAvailableCurrencies);
    }).catch(() => undefined);
  }, []);

  // Load User row from gastos-app schema by authId = auth.users.id
  const loadWebUser = useCallback(async (authUid: string) => {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id, username, authId, role, monthlyGoal, createdAt')
        .eq('authId', authUid)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] loadWebUser error:', error.message);
        return null;
      }
      if (data) {
        setWebUser(data as WebUser);
        return data as WebUser;
      }
      console.warn('[AuthContext] No User row found for authId', authUid);
      return null;
    } catch (e) {
      console.warn('[AuthContext] loadWebUser exception:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWebUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWebUser(session.user.id);
      } else {
        setWebUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadWebUser]);

  // Derive Profile for UI compatibility
  const profile: Profile | null = webUser ? {
    id: webUser.id,
    authId: webUser.authId ?? '',
    username: webUser.username,
    full_name: webUser.username,
    currency,
    monthly_goal: webUser.monthlyGoal,
    theme: 'dark',
    accent_color: null,
    notifications_enabled: true,
  } : null;

  const handleSignIn = async (identifier: string, password: string) => {
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

  const handleSignUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName ?? '' } },
    });

    if (!error) {
      setCurrencyState('USD');
      setGoalCurrencyState('USD');
      setAvailableCurrenciesState(['USD']);
      await Promise.all([
        AsyncStorage.setItem(CURRENCY_STORAGE_KEY, 'USD'),
        AsyncStorage.setItem(GOAL_CURRENCY_STORAGE_KEY, 'USD'),
        AsyncStorage.setItem(AVAILABLE_CURRENCIES_STORAGE_KEY, JSON.stringify(['USD'])),
      ]);
    }

    return { error };
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setWebUser(null);
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadWebUser(user.id);
  }, [user, loadWebUser]);

  const setCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextAvailableCurrencies = availableCurrencies.includes(nextCurrency)
      ? availableCurrencies
      : SUPPORTED_CURRENCIES.filter((currencyOption) => [...availableCurrencies, nextCurrency].includes(currencyOption));
    setAvailableCurrenciesState(nextAvailableCurrencies);
    setCurrencyState(nextCurrency);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
    await AsyncStorage.setItem(AVAILABLE_CURRENCIES_STORAGE_KEY, JSON.stringify(nextAvailableCurrencies));
  }, [availableCurrencies]);

  const addCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextAvailableCurrencies = SUPPORTED_CURRENCIES.filter((currencyOption) => currencyOption === nextCurrency || availableCurrencies.includes(currencyOption));
    setAvailableCurrenciesState(nextAvailableCurrencies);
    await AsyncStorage.setItem(AVAILABLE_CURRENCIES_STORAGE_KEY, JSON.stringify(nextAvailableCurrencies));
  }, [availableCurrencies]);

  const setGoalCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    setGoalCurrencyState(nextCurrency);
    await AsyncStorage.setItem(GOAL_CURRENCY_STORAGE_KEY, nextCurrency);
  }, []);

  return (
    <AuthContext.Provider value={{
      session, user, webUser, profile, loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      refreshProfile,
      currency,
      availableCurrencies,
      setCurrency,
      addCurrency,
      goalCurrency,
      setGoalCurrency,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
