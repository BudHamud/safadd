import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { reportClientError } from '../lib/clientErrorReporter';
import { getItemWithLegacyKey } from '../lib/storage';
import { PlanTier, Profile, UserPlan, UserPlanSyncStatus, WebUser } from '../types';
import type { SupportedCurrency } from '@safed/shared/types';
import { SUPPORTED_CURRENCIES } from '@safed/shared/currency';

export type { SupportedCurrency };

const CURRENCY_STORAGE_KEY = 'safadd_currency';
const LEGACY_CURRENCY_STORAGE_KEY = 'safed_currency';
const GOAL_CURRENCY_STORAGE_KEY = 'safadd_goal_currency';
const LEGACY_GOAL_CURRENCY_STORAGE_KEY = 'safed_goal_currency';
const AVAILABLE_CURRENCIES_STORAGE_KEY = 'safadd_available_currencies';
const LEGACY_AVAILABLE_CURRENCIES_STORAGE_KEY = 'safed_available_currencies';
const INSTALLATION_ID_STORAGE_KEY = 'safadd_installation_id';
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

const NON_REPORTABLE_AUTH_ERROR_FRAGMENTS = [
  'already exists',
  'already registered',
  'captcha_invalid',
  'email_exists',
  'invalid_credentials',
  'invalid_email',
  'login_identifier_not_found',
  'missing_credentials',
  'password should be',
  'rate_limited',
  'too many requests',
  'user not found',
  'user_exists',
  'weak_password',
];

type StructuredAppError = Error & {
  code?: string;
  retryAfter?: number;
  requiresCaptcha?: boolean;
  canRetryAt?: string;
  limit?: number;
  remaining?: number;
  requested?: number;
  used?: number;
};

function createStructuredAppError(payload: any, fallbackCode: string): StructuredAppError {
  const code = String(payload?.errorCode || payload?.error || fallbackCode);
  const error = new Error(code) as StructuredAppError;

  error.code = code;

  if (typeof payload?.retryAfter === 'number') {
    error.retryAfter = payload.retryAfter;
  }

  if (typeof payload?.requiresCaptcha === 'boolean') {
    error.requiresCaptcha = payload.requiresCaptcha;
  }

  if (typeof payload?.canRetryAt === 'string' && payload.canRetryAt.trim()) {
    error.canRetryAt = payload.canRetryAt;
  }

  if (typeof payload?.limit === 'number') {
    error.limit = payload.limit;
  }

  if (typeof payload?.remaining === 'number') {
    error.remaining = payload.remaining;
  }

  if (typeof payload?.requested === 'number') {
    error.requested = payload.requested;
  }

  if (typeof payload?.used === 'number') {
    error.used = payload.used;
  }

  return error;
}

function normalizePlanTier(value: unknown): PlanTier {
  return value === 'pro' ? 'pro' : 'free';
}

function createFallbackPlan(tier: PlanTier = 'free'): UserPlan {
  const isPro = tier === 'pro';

  return {
    tier,
    entitlements: {
      advancedAnalytics: isPro,
      categoryGoals: isPro,
      customCategories: true,
      maxCustomCategories: isPro ? null : 10,
      dataExport: isPro,
      importRowsPerDay: isPro ? 500 : 50,
      maxDevices: null,
      maxSecondaryCurrencies: isPro ? null : 2,
      prioritySupport: true,
      travelMode: 'none',
    },
    sync: {
      currentDeviceAllowed: true,
      currentDeviceId: null,
      deviceLimitReached: false,
      maxDevices: null,
      registeredDevices: 0,
    },
  };
}

async function getOrCreateInstallationId() {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_STORAGE_KEY);
  if (existing && existing.trim()) {
    return existing.trim();
  }

  const nextId = `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(INSTALLATION_ID_STORAGE_KEY, nextId);
  return nextId;
}

function shouldReportAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return !NON_REPORTABLE_AUTH_ERROR_FRAGMENTS.some((fragment) => message.includes(fragment));
}

async function reportAuthError(error: unknown, userEmail: string | undefined, context: string) {
  if (!shouldReportAuthError(error)) return;

  await reportClientError(error, {
    context,
    userEmail,
    metadata: {
      flow: 'auth',
    },
  });
}

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;      // Supabase auth user (auth.users)
  webUser: WebUser | null;    // Row from User table (internal profile)
  plan: UserPlan | null;
  planTier: PlanTier;
  syncStatus: UserPlanSyncStatus | null;
  profile: Profile | null;    // Derived profile for UI
  loading: boolean;
  configError: string | null;
  signIn: (identifier: string, password: string) => Promise<{ error: any | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    expenseGoal?: number,
    primaryCurrency?: SupportedCurrency,
    secondaryCurrencies?: SupportedCurrency[],
  ) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currency: SupportedCurrency;
  availableCurrencies: SupportedCurrency[];
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  addCurrency: (currency: SupportedCurrency) => Promise<void>;
  removeCurrency: (currency: SupportedCurrency) => Promise<void>;
  goalCurrency: SupportedCurrency;
  setGoalCurrency: (currency: SupportedCurrency) => Promise<void>;
  setMonthlyGoal: (goal: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, webUser: null, profile: null, loading: true,
  plan: null,
  planTier: 'free',
  syncStatus: null,
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
  setMonthlyGoal: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [webUser, setWebUser] = useState<WebUser | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [currency, setCurrencyState] = useState<SupportedCurrency>('USD');
  const [goalCurrency, setGoalCurrencyState] = useState<SupportedCurrency>('USD');
  const [availableCurrencies, setAvailableCurrenciesState] = useState<SupportedCurrency[]>(['USD']);
  const [loading, setLoading] = useState(true);
  const profileLoadPromiseRef = useRef<Promise<WebUser | null> | null>(null);
  const lastProfileTimeoutAtRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const webUserRef = useRef<WebUser | null>(null);

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

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    webUserRef.current = webUser;
  }, [webUser]);

  const applyRemoteProfile = useCallback(async (payload: (WebUser & { email?: string | null; plan?: UserPlan | null }) | null) => {
    if (!payload) {
      setWebUser(null);
      setPlan(null);
      webUserRef.current = null;
      return null;
    }

    const typedData: WebUser = {
      ...payload,
      planTier: normalizePlanTier(payload.planTier),
      deviceIds: Array.isArray(payload.deviceIds) ? payload.deviceIds : [],
    };
    const nextPrefs = resolveCurrencyPreferences({
      currency: typedData.currency,
      goalCurrency: typedData.goalCurrency,
      availableCurrencies: typedData.availableCurrencies,
    });

    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);
    setWebUser(typedData);
    setPlan(payload.plan ?? createFallbackPlan(normalizePlanTier(payload.planTier)));
    webUserRef.current = typedData;
    return typedData;
  }, [applyCurrencyPreferences, persistCurrencyPreferencesLocally]);

  const loadWebUserFallback = useCallback(async (authUid: string) => {
    const { data, error } = await supabase
      .from('User')
      .select('id, username, authId, role, planTier, monthlyGoal, currency, goalCurrency, availableCurrencies, deviceIds, createdAt')
      .eq('authId', authUid)
      .maybeSingle();

    if (error) {
      console.warn('[AuthContext] loadWebUser fallback error:', error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    return await applyRemoteProfile({
      ...(data as WebUser),
      plan: createFallbackPlan(normalizePlanTier((data as WebUser).planTier)),
    });
  }, [applyRemoteProfile]);

  const updateProfileRemotely = useCallback(async (patch: Record<string, unknown>) => {
    if (supabaseConfigError) {
      throw new Error(supabaseConfigError);
    }

    const activeSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession?.access_token) {
      throw new Error('missing_session');
    }

    const installationId = await getOrCreateInstallationId();
    const response = await apiFetch('/api/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-safadd-device-id': installationId,
      },
      body: JSON.stringify({ ...patch, deviceId: installationId }),
    }, activeSession);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw createStructuredAppError(payload, 'profile_update_failed');
    }

    await applyRemoteProfile(payload as WebUser & { email?: string | null; plan?: UserPlan | null });
  }, [applyRemoteProfile, session]);

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
  const loadWebUser = useCallback((authUid: string, options?: { force?: boolean; silent?: boolean }) => {
    if (profileLoadPromiseRef.current && !options?.force) {
      return profileLoadPromiseRef.current;
    }

    if (!options?.force && Date.now() - lastProfileTimeoutAtRef.current < 15000) {
      return Promise.resolve(webUserRef.current);
    }

    const request = (async () => {
      try {
        if (supabaseConfigError) {
          return null;
        }

        const activeSession = sessionRef.current ?? (await supabase.auth.getSession()).data.session;
        if (!activeSession?.access_token) {
          return null;
        }

        const installationId = await getOrCreateInstallationId();
        const response = await apiFetch('/api/user', {
          headers: {
            'x-safadd-device-id': installationId,
          },
          timeoutMs: 4000,
          timeoutMessage: 'profile_request_timeout',
        }, activeSession);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!options?.silent) {
            console.warn('[AuthContext] loadWebUser error:', payload?.error || response.status);
          }
          return await loadWebUserFallback(authUid);
        }

        return await applyRemoteProfile(payload as WebUser & { email?: string | null; plan?: UserPlan | null });
      } catch (error) {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.message === 'profile_request_timeout' || error.message === 'request_timeout')) {
          lastProfileTimeoutAtRef.current = Date.now();
          if (!options?.silent) {
            console.warn('[AuthContext] loadWebUser timeout, using fallback');
          }
          return await loadWebUserFallback(authUid);
        }

        if (!options?.silent) {
          console.warn('[AuthContext] loadWebUser exception:', authUid, error);
        }
        return await loadWebUserFallback(authUid);
      } finally {
        profileLoadPromiseRef.current = null;
      }
    })();

    profileLoadPromiseRef.current = request;
    return request;
  }, [applyRemoteProfile, loadWebUserFallback]);

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
        sessionRef.current = session;
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadWebUser(session.user.id, { silent: true });
        } else {
          setWebUser(null);
          setPlan(null);
        }
      } catch (error) {
        if (isMounted) {
          console.warn('[AuthContext] getSession failed:', error);
          setSession(null);
          setUser(null);
          setWebUser(null);
          setPlan(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      setSession(session);
      sessionRef.current = session;
      setUser(session?.user ?? null);
      if (session?.user) {
        const shouldBlockUI = event === 'SIGNED_IN' || !webUserRef.current;
        if (shouldBlockUI) {
          setLoading(true);
        }

        void loadWebUser(session.user.id, { force: event === 'SIGNED_IN' }).finally(() => {
          if (isMounted && shouldBlockUI) {
            setLoading(false);
          }
        });
      } else {
        setWebUser(null);
        setPlan(null);
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
      if (error) {
        await reportAuthError(error, normalizedIdentifier.toLowerCase(), 'auth_signin_email');
      }
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
        const authError = createStructuredAppError(payload, 'invalid_credentials');
        await reportAuthError(authError, undefined, 'auth_signin_username');
        return { error: authError };
      }

      if (!payload?.access_token || !payload?.refresh_token) {
        const sessionError = new Error('username_login_session_unavailable');
        await reportAuthError(sessionError, undefined, 'auth_signin_username');
        return { error: sessionError };
      }

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (error) {
        await reportAuthError(error, undefined, 'auth_signin_username');
      }
      return { error };
    } catch (error) {
      await reportAuthError(error, undefined, 'auth_signin_username');
      return { error };
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    fullName?: string,
    expenseGoal?: number,
    primaryCurrency?: SupportedCurrency,
    secondaryCurrencies?: SupportedCurrency[],
  ) => {
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
          monthlyGoal: Number.isFinite(expenseGoal) && (expenseGoal ?? 0) >= 0 ? expenseGoal : 0,
          expenseGoal: Number.isFinite(expenseGoal) && (expenseGoal ?? 0) >= 0 ? expenseGoal : 0,
          primaryCurrency: primaryCurrency ?? DEFAULT_CURRENCY,
          secondaryCurrencies: Array.isArray(secondaryCurrencies) ? secondaryCurrencies : [],
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const registrationError = createStructuredAppError(payload, 'register_failed');
        await reportAuthError(registrationError, email.trim().toLowerCase(), 'auth_register');
        return { error: registrationError };
      }

      if (!payload?.access_token || !payload?.refresh_token) {
        const sessionError = new Error('registration_session_unavailable');
        await reportAuthError(sessionError, email.trim().toLowerCase(), 'auth_register');
        return { error: sessionError };
      }

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });

      if (error) {
        await reportAuthError(error, email.trim().toLowerCase(), 'auth_register');
        return { error };
      }

    } catch (error) {
      await reportAuthError(error, email.trim().toLowerCase(), 'auth_register');
      return { error };
    }

    const safePrimary = primaryCurrency ?? DEFAULT_CURRENCY;
    const safeSecondary = Array.isArray(secondaryCurrencies) ? secondaryCurrencies.filter((c) => c !== safePrimary) : [];
    const availableCurrencies = Array.from(new Set([safePrimary, ...safeSecondary]));

    const prefs = { currency: safePrimary, goalCurrency: safePrimary, availableCurrencies };
    applyCurrencyPreferences(prefs);
    await persistCurrencyPreferencesLocally(prefs);

    return { error: null };
  };

  const handleSignOut = async () => {
    if (supabaseConfigError) {
      setSession(null);
      sessionRef.current = null;
      setUser(null);
      setWebUser(null);
      setPlan(null);
      webUserRef.current = null;
      return;
    }

    await supabase.auth.signOut();
    setWebUser(null);
    setPlan(null);
    sessionRef.current = null;
    webUserRef.current = null;
  };

  const refreshProfile = useCallback(async () => {
    if (supabaseConfigError) return;
    if (user?.id) await loadWebUser(user.id);
  }, [user, loadWebUser]);

  const commitCurrencyPreferences = useCallback(async (nextPrefs: {
    currency: SupportedCurrency;
    goalCurrency: SupportedCurrency;
    availableCurrencies: SupportedCurrency[];
  }) => {
    const previousPrefs = { currency, goalCurrency, availableCurrencies };

    applyCurrencyPreferences(nextPrefs);
    await persistCurrencyPreferencesLocally(nextPrefs);

    try {
      await updateProfileRemotely(nextPrefs);
    } catch (error) {
      applyCurrencyPreferences(previousPrefs);
      await persistCurrencyPreferencesLocally(previousPrefs);
      throw error;
    }
  }, [availableCurrencies, currency, goalCurrency, applyCurrencyPreferences, persistCurrencyPreferencesLocally, updateProfileRemotely]);

  const setCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextAvailableCurrencies = availableCurrencies.includes(nextCurrency)
      ? availableCurrencies
      : [...availableCurrencies, nextCurrency];
    const nextPrefs = {
      currency: nextCurrency,
      goalCurrency: nextAvailableCurrencies.includes(goalCurrency) ? goalCurrency : nextCurrency,
      availableCurrencies: nextAvailableCurrencies,
    };
    await commitCurrencyPreferences(nextPrefs);
  }, [availableCurrencies, goalCurrency, commitCurrencyPreferences]);

  const addCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    if (availableCurrencies.includes(nextCurrency)) return;
    const nextPrefs = {
      currency,
      goalCurrency,
      availableCurrencies: [...availableCurrencies, nextCurrency],
    };
    await commitCurrencyPreferences(nextPrefs);
  }, [availableCurrencies, currency, goalCurrency, commitCurrencyPreferences]);

  const removeCurrency = useCallback(async (code: SupportedCurrency) => {
    if (code === currency || availableCurrencies.length <= 1) return;
    const nextAvailableCurrencies = availableCurrencies.filter((c) => c !== code);
    const nextPrefs = {
      currency,
      goalCurrency: code === goalCurrency ? currency : goalCurrency,
      availableCurrencies: nextAvailableCurrencies,
    };
    await commitCurrencyPreferences(nextPrefs);
  }, [availableCurrencies, currency, goalCurrency, commitCurrencyPreferences]);

  const setGoalCurrency = useCallback(async (nextCurrency: SupportedCurrency) => {
    const nextPrefs = {
      currency,
      goalCurrency: availableCurrencies.includes(nextCurrency) ? nextCurrency : currency,
      availableCurrencies,
    };
    await commitCurrencyPreferences(nextPrefs);
  }, [availableCurrencies, currency, commitCurrencyPreferences]);

  const setMonthlyGoal = useCallback(async (nextGoal: number) => {
    if (!Number.isFinite(nextGoal) || nextGoal < 0) {
      throw new Error('invalid_monthly_goal');
    }

    await updateProfileRemotely({ monthlyGoal: nextGoal });
  }, [updateProfileRemotely]);

  const planTier = plan?.tier ?? normalizePlanTier(webUser?.planTier);
  const syncStatus = plan?.sync ?? null;

  return (
    <AuthContext.Provider value={{
      session, user, webUser, profile, loading,
      plan,
      planTier,
      syncStatus,
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
      setMonthlyGoal,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
