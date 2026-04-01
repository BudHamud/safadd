import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Circle, Line } from 'react-native-svg';
import { getCurrencyMetadata, SUPPORTED_CURRENCIES } from '@safed/shared/currency';
import { useAuth } from '../../context/AuthContext';
import type { SupportedCurrency } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch, getApiBase, isTimeoutError } from '../../lib/api';
import { getRequestErrorMessage } from '../../lib/requestErrors';
import { AnimatedLogoMark } from '../../components/branding/AnimatedLogoMark';
import Constants from 'expo-constants';

type Mode = 'login' | 'register' | 'recovery';

type StructuredAuthError = Error & {
  code?: string;
  retryAfter?: number;
  requiresCaptcha?: boolean;
  canRetryAt?: string;
};

const REGISTER_PRIORITY_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'JPY', 'GBP', 'ARS', 'ILS', 'BRL', 'MXN', 'COP', 'CLP'];

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { t, lang } = useLanguage();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.1.0';
  const { theme: C } = useTheme();
  const dialog = useDialog();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [primaryCurrency, setPrimaryCurrency] = useState<SupportedCurrency>('USD');
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<SupportedCurrency[]>([]);
  const [expenseGoal, setExpenseGoal] = useState('');
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);

  const registerCurrencyData = useMemo(() => {
    const query = normalizeSearchValue(currencyQuery);
    const rows = (SUPPORTED_CURRENCIES as SupportedCurrency[])
      .map((code) => getCurrencyMetadata(code, lang))
      .filter((item) => {
        if (!query) return true;
        return normalizeSearchValue(`${item.code} ${item.name} ${item.symbol}`).includes(query);
      })
      .sort((left, right) => {
        if (left.code === primaryCurrency) return -1;
        if (right.code === primaryCurrency) return 1;

        const leftSecondary = secondaryCurrencies.includes(left.code as SupportedCurrency);
        const rightSecondary = secondaryCurrencies.includes(right.code as SupportedCurrency);
        if (leftSecondary !== rightSecondary) return leftSecondary ? -1 : 1;

        const leftPriority = REGISTER_PRIORITY_CURRENCIES.indexOf(left.code as SupportedCurrency);
        const rightPriority = REGISTER_PRIORITY_CURRENCIES.indexOf(right.code as SupportedCurrency);
        if (leftPriority !== rightPriority) {
          if (leftPriority === -1) return 1;
          if (rightPriority === -1) return -1;
          return leftPriority - rightPriority;
        }

        return left.code.localeCompare(right.code);
      });

    const limit = query ? 24 : showAllCurrencies ? 12 : 4;
    return {
      rows: rows.slice(0, limit),
      total: rows.length,
      hasMore: rows.length > limit,
    };
  }, [currencyQuery, lang, primaryCurrency, secondaryCurrencies, showAllCurrencies]);

  const primaryCurrencyMeta = useMemo(() => getCurrencyMetadata(primaryCurrency, lang), [lang, primaryCurrency]);

  const resetRegisterState = () => {
    setRegisterStep(1);
    setError(null);
    setCurrencyQuery('');
    setExpenseGoal('');
    setShowAllCurrencies(false);
    setPrimaryCurrency('USD');
    setSecondaryCurrencies([]);
  };

  const parseExpenseGoal = (raw: string) => {
    const normalized = raw.trim().replace(',', '.');
    if (normalized.length === 0) return NaN;
    const nextValue = Number(normalized);
    return Number.isFinite(nextValue) ? nextValue : NaN;
  };

  const formatRetryAfter = (retryAfter?: number) => {
    if (!retryAfter || retryAfter <= 0) {
      return lang === 'en' ? 'a few minutes' : 'unos minutos';
    }

    const minutes = Math.floor(retryAfter / 60);
    const seconds = retryAfter % 60;

    if (minutes <= 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const openWebCaptchaFallback = async (message: string) => {
    const confirmed = await dialog.confirm({
      title: t('auth.secure_access'),
      message,
      confirmText: lang === 'en' ? 'Open web' : 'Abrir web',
      cancelText: lang === 'en' ? 'Wait' : 'Esperar',
      showCancel: true,
    });

    if (confirmed) {
      await Linking.openURL(`${getApiBase()}/app`);
    }
  };

  const resolveAuthErrorMessage = (error: unknown) => {
    if (isTimeoutError(error)) {
      return getRequestErrorMessage(error, t('auth.invalid_credentials'), lang);
    }

    const authError = error as StructuredAuthError;
    const code = String(authError?.code || (error instanceof Error ? error.message : '')).toLowerCase();

    if (code.includes('rate_limited') || code.includes('too many requests')) {
      const waitTime = formatRetryAfter(authError?.retryAfter);
      return authError?.requiresCaptcha
        ? t('auth.rate_limited_mobile_web', { time: waitTime })
        : t('auth.rate_limited_wait', { time: waitTime });
    }

    if (code.includes('login_identifier_not_found')) {
      return t('auth.login_identifier_not_found');
    }

    if (code.includes('captcha_invalid')) {
      return t('auth.captcha_invalid');
    }

    if (code.includes('invalid login credentials') || code.includes('invalid credentials')) {
      return t('auth.invalid_credentials');
    }

    if (code.includes('username_login_session_unavailable')) {
      return t('auth.invalid_credentials');
    }

    if (code.includes('email not confirmed')) {
      return t('auth.confirm_email_before_login');
    }

    if (code.includes('user not found')) {
      return t('auth.user_not_found');
    }

    return error instanceof Error && error.message ? `Error: ${error.message}` : t('auth.error');
  };

  const handleRecoverySubmit = async () => {
    if (!email.trim()) {
      setError(t('auth.recovery_email_required' as any) || 'Please enter an email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const recoveryError = new Error(String(payload?.errorCode || payload?.error || 'recovery_error')) as StructuredAuthError;
        recoveryError.code = String(payload?.errorCode || payload?.error || 'recovery_error');
        if (typeof payload?.retryAfter === 'number') recoveryError.retryAfter = payload.retryAfter;
        if (typeof payload?.requiresCaptcha === 'boolean') recoveryError.requiresCaptcha = payload.requiresCaptcha;
        if (typeof payload?.canRetryAt === 'string') recoveryError.canRetryAt = payload.canRetryAt;
        throw recoveryError;
      }

      await dialog.alert(t('auth.recovery_sent' as any) || 'Recovery sent.', t('auth.recovery_title' as any) || 'Recovery');
      setMode('login');
    } catch (err) {
      const nextMessage = resolveAuthErrorMessage(err);
      setError(nextMessage);
      if ((err as StructuredAuthError)?.requiresCaptcha) {
        await openWebCaptchaFallback(nextMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t('auth.complete_fields'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const identifier = email.trim();
        const { error: signInError } = await signIn(identifier, password);
        if (signInError) {
          const nextMessage = resolveAuthErrorMessage(signInError);
          setError(nextMessage);

          if ((signInError as StructuredAuthError)?.requiresCaptcha) {
            await openWebCaptchaFallback(nextMessage);
          }
        }
      }
    } catch (submitError) {
      setError(getRequestErrorMessage(submitError, t('auth.complete_fields'), lang));
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    const nextName = fullName.trim();
    const nextEmail = email.trim();
    const nextPassword = password;
    if (!nextName || !nextEmail || !nextPassword) {
      setError(t('auth.complete_fields'));
      return false;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail.toLowerCase());
    if (!emailOk) {
      setError(t('auth.invalid_email') || 'Invalid email');
      return false;
    }

    if (nextPassword.length < 6) {
      setError(t('auth.mobile_password_min_length'));
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const parsedGoal = parseExpenseGoal(expenseGoal);
    if (!Number.isFinite(parsedGoal) || parsedGoal < 0) {
      setError(lang === 'en' ? 'Please set a valid monthly limit.' : 'Defini un limite mensual valido.');
      return false;
    }

    if (!primaryCurrency) {
      setError(lang === 'en' ? 'Please select a primary currency.' : 'Elegi una moneda principal.');
      return false;
    }

    return true;
  };

  const handleRegisterStep1Next = () => {
    setError(null);
    if (!validateStep1()) return;
    setRegisterStep(2);
  };

  const handleRegisterSubmit = async () => {
    setError(null);
    if (!validateStep2()) return;

    setRegisterLoading(true);
    try {
      const { error: signUpError } = await signUp(
        email.trim().toLowerCase(),
        password,
        fullName.trim() || undefined,
        parseExpenseGoal(expenseGoal),
        primaryCurrency,
        secondaryCurrencies,
      );

      if (signUpError) {
        if (isTimeoutError(signUpError)) {
          setError(getRequestErrorMessage(signUpError, t('auth.complete_fields'), lang));
          return;
        }

        const msg = signUpError.message.toLowerCase();
        if (msg.includes('email_exists') || msg.includes('user_exists') || msg.includes('already registered') || msg.includes('already exists')) {
          setError(t('auth.email_already_registered'));
        } else if (msg.includes('weak_password') || msg.includes('password should be')) {
          setError(t('auth.mobile_password_min_length'));
        } else if (msg.includes('invalid_email')) {
          setError(t('auth.invalid_email'));
        } else if (msg.includes('rate_limited')) {
          const nextMessage = resolveAuthErrorMessage(signUpError);
          setError(nextMessage);
          if ((signUpError as StructuredAuthError)?.requiresCaptcha) {
            await openWebCaptchaFallback(nextMessage);
          }
        } else {
          setError(`Error: ${signUpError.message}`);
        }
        return;
      }

      setMode('login');
      resetRegisterState();
    } catch (submitError) {
      setError(getRequestErrorMessage(submitError, t('auth.complete_fields'), lang));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.authBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.authLogoBar, { borderBottomColor: C.borderDim }]}>
              <View style={styles.authLogoWrap}>
                <AnimatedLogoMark size={28} animate={loading || registerLoading} showHalo={loading || registerLoading} />
              </View>
              <Text style={[styles.authLogoName, { color: C.textMain }]}>SAFADD</Text>
            </View>

            <View style={styles.authBody}>
              <Text style={[styles.authTitle, { color: C.textMain }]}>
                {mode === 'recovery'
                  ? (t('auth.recovery_title' as any) || 'RECOVER PASSWORD').toUpperCase()
                  : mode === 'register'
                    ? t('auth.create').toUpperCase()
                    : t('auth.secure_access').toUpperCase()}
              </Text>

              {mode === 'recovery' && (
                <Text style={[styles.authRecoveryCopy, { color: C.textMuted }]}>
                  {t('auth.recovery_desc' as any) || 'Enter your email to receive recovery instructions.'}
                </Text>
              )}

              {mode !== 'recovery' && (
                <View style={[styles.authToggle, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                  <TouchableOpacity
                    style={[styles.authToggleOpt, mode === 'login' && { backgroundColor: C.primary }]}
                    onPress={() => { setMode('login'); setError(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.authToggleOptText, { color: mode === 'login' ? C.primaryText : C.textMuted }]}> 
                      {t('auth.login_tab').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.authToggleOpt, mode === 'register' && { backgroundColor: C.primary }]}
                    onPress={() => {
                      setMode('register');
                      resetRegisterState();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.authToggleOptText, { color: mode === 'register' ? C.primaryText : C.textMuted }]}> 
                      {t('auth.register_tab').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'register' && registerStep === 1 && (
                <View style={styles.authField}>
                  <Text style={[styles.authLabel, { color: C.textMuted }]}>{t('auth.full_name_label').toUpperCase()}</Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                      placeholder={t('auth.full_name_placeholder')}
                      placeholderTextColor={C.textMuted}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      autoComplete="name"
                    />
                  </View>
                </View>
              )}

              {(mode !== 'register' || registerStep === 1) ? (
                <View style={styles.authField}>
                  <Text style={[styles.authLabel, { color: C.textMuted }]}>{(mode === 'login' ? t('auth.login_identifier_label') : t('auth.email_label')).toUpperCase()}</Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                      placeholder={mode === 'recovery'
                        ? (t('auth.recovery_email_placeholder' as any) || 'Email')
                        : mode === 'login'
                          ? t('auth.login_identifier_placeholder')
                          : t('auth.email_placeholder')}
                      placeholderTextColor={C.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType={mode === 'login' ? 'default' : 'email-address'}
                      autoCapitalize="none"
                      autoComplete={mode === 'login' ? 'username' : 'email'}
                    />
                  </View>
                </View>
              ) : null}

              {mode === 'register' && registerStep === 2 && (
                <View style={styles.authField}>
                  <Text style={[styles.authLabel, { color: C.textMuted }]}> 
                    {lang === 'en' ? 'Step 2 · Currencies' : 'Paso 2 · Monedas'}
                  </Text>
                  <Text style={[styles.goalHelp, { color: C.textMuted }]}> 
                    {lang === 'en'
                      ? 'Set your monthly limit, choose one primary currency, and add any secondary currencies you need.'
                      : 'Defini tu limite mensual, elegi una moneda principal y suma las secundarias que necesites.'}
                  </Text>

                  <Text style={[styles.authLabel, { color: C.textMuted, marginTop: 10 }]}> 
                    {t('auth.goal_question').toUpperCase()}
                  </Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, styles.authInputCompact, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                      placeholder={`${t('auth.goal_placeholder')} · ${primaryCurrencyMeta.symbol}`}
                      placeholderTextColor={C.textMuted}
                      value={expenseGoal}
                      onChangeText={setExpenseGoal}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                    />
                  </View>

                  <Text style={[styles.authLabel, { color: C.textMuted, marginTop: 10 }]}> 
                    {lang === 'en' ? 'Primary currency' : 'Moneda principal'}
                  </Text>
                  <View style={styles.selectionChipsWrap}>
                    <View style={[styles.selectionChip, { backgroundColor: `${C.primary}18`, borderColor: C.primary }]}> 
                      <Text style={[styles.selectionChipCode, { color: C.primary }]}>{primaryCurrencyMeta.code}</Text>
                      <Text style={[styles.selectionChipName, { color: C.textMain }]}>{primaryCurrencyMeta.name}</Text>
                      <Text style={[styles.selectionChipSymbol, { color: C.primary }]}>{primaryCurrencyMeta.symbol}</Text>
                    </View>
                  </View>

                  <Text style={[styles.authLabel, { color: C.textMuted, marginTop: 10 }]}> 
                    {lang === 'en' ? 'Secondary currencies' : 'Monedas secundarias'}
                  </Text>
                  <View style={styles.selectionChipsWrap}>
                    {secondaryCurrencies.length > 0 ? secondaryCurrencies.map((code) => {
                      const meta = getCurrencyMetadata(code, lang);
                      return (
                        <View key={code} style={[styles.selectionChip, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
                          <Text style={[styles.selectionChipCode, { color: C.textMain }]}>{meta.code}</Text>
                          <Text style={[styles.selectionChipName, { color: C.textMuted }]}>{meta.name}</Text>
                        </View>
                      );
                    }) : (
                      <Text style={[styles.goalHelp, { color: C.textMuted }]}> 
                        {lang === 'en' ? 'No secondary currencies selected yet.' : 'Todavia no elegiste monedas secundarias.'}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.authLabel, { color: C.textMuted, marginTop: 10 }]}> 
                    {lang === 'en' ? 'Search currencies' : 'Buscar monedas'}
                  </Text>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, styles.authInputCompact, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                      placeholder={lang === 'en' ? 'Code, name or symbol' : 'Codigo, nombre o simbolo'}
                      placeholderTextColor={C.textMuted}
                      value={currencyQuery}
                      onChangeText={(value) => {
                        setCurrencyQuery(value);
                        if (value.trim()) setShowAllCurrencies(true);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>

                  {!currencyQuery.trim() && !showAllCurrencies ? (
                    <View style={styles.currencyGrid}>
                      {registerCurrencyData.rows.map((item) => {
                        const code = item.code as SupportedCurrency;
                        const isPrimary = code === primaryCurrency;
                        return (
                          <TouchableOpacity
                            key={code}
                            style={[styles.currencyCell, { borderColor: isPrimary ? C.primary : C.border, backgroundColor: isPrimary ? `${C.primary}12` : C.surfaceAlt }]}
                            onPress={() => {
                              setPrimaryCurrency(code);
                              setSecondaryCurrencies((prev) => prev.filter((v) => v !== code));
                            }}
                            activeOpacity={0.82}
                          >
                            <Text style={[styles.currencyCellSymbol, { color: isPrimary ? C.primary : C.textMain }]}>{item.symbol}</Text>
                            <Text style={[styles.currencyCellCode, { color: isPrimary ? C.primary : C.textMain }]}>{item.code}</Text>
                            <Text style={[styles.currencyCellName, { color: C.textMuted }]} numberOfLines={1}>{item.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.currencyList}>
                      {registerCurrencyData.rows.map((item) => {
                        const code = item.code as SupportedCurrency;
                        const isPrimary = code === primaryCurrency;
                        const isSecondary = secondaryCurrencies.includes(code);

                        return (
                          <View
                            key={code}
                            style={[
                              styles.currencyRow,
                              { borderColor: isPrimary ? C.primary : C.border, backgroundColor: isPrimary ? `${C.primary}12` : C.surfaceAlt },
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.currencyRowMain}
                              onPress={() => {
                                setPrimaryCurrency(code);
                                setSecondaryCurrencies((prev) => prev.filter((value) => value !== code));
                              }}
                              activeOpacity={0.82}
                            >
                              <View style={styles.currencyRowCopy}>
                                <Text style={[styles.currencyRowCode, { color: isPrimary ? C.primary : C.textMain }]}>{item.code}</Text>
                                <Text style={[styles.currencyRowName, { color: C.textMuted }]} numberOfLines={1}>{item.name}</Text>
                              </View>
                              <Text style={[styles.currencyRowSymbol, { color: isPrimary ? C.primary : C.textMuted }]}>{item.symbol}</Text>
                            </TouchableOpacity>

                            {isPrimary ? (
                              <View style={[styles.currencyActionPrimary, { backgroundColor: C.primary }]}>
                                <Text style={[styles.currencyActionPrimaryText, { color: C.primaryText }]}>
                                  {lang === 'en' ? 'PRIMARY' : 'PRINCIPAL'}
                                </Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={[
                                  styles.currencyActionToggle,
                                  { borderColor: isSecondary ? C.primary : C.border, backgroundColor: isSecondary ? `${C.primary}18` : C.surface },
                                ]}
                                onPress={() => {
                                  setSecondaryCurrencies((prev) => (
                                    prev.includes(code)
                                      ? prev.filter((value) => value !== code)
                                      : [...prev, code]
                                  ));
                                }}
                                activeOpacity={0.82}
                              >
                                <Text style={[styles.currencyActionToggleText, { color: isSecondary ? C.primary : C.textMuted }]}>
                                  {isSecondary
                                    ? (lang === 'en' ? 'REMOVE' : 'QUITAR')
                                    : (lang === 'en' ? 'ADD' : 'SUMAR')}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <Text style={[styles.goalHelp, { color: C.textMuted }]}> 
                    {registerCurrencyData.hasMore
                      ? (lang === 'en'
                        ? `Showing ${registerCurrencyData.rows.length} of ${registerCurrencyData.total}. Search to refine the list.`
                        : `Mostrando ${registerCurrencyData.rows.length} de ${registerCurrencyData.total}. Usa la busqueda para afinar la lista.`)
                      : (lang === 'en'
                        ? `${registerCurrencyData.total} currencies available.`
                        : `${registerCurrencyData.total} monedas disponibles.`)}
                  </Text>

                  {registerCurrencyData.hasMore && !currencyQuery.trim() ? (
                    <TouchableOpacity
                      style={[styles.inlineToggleButton, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                      onPress={() => setShowAllCurrencies((value) => !value)}
                      activeOpacity={0.82}
                    >
                      <Text style={[styles.inlineToggleButtonText, { color: C.textMain }]}>
                        {showAllCurrencies
                          ? (lang === 'en' ? 'Show less' : 'Ver menos')
                          : (lang === 'en' ? 'Show more currencies' : 'Ver mas monedas')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {(mode === 'login' || (mode === 'register' && registerStep === 1)) && (
                <View style={styles.authField}>
                  <View style={styles.authFieldHeader}>
                    <Text style={[styles.authLabel, { color: C.textMuted }]}>{t('auth.password_label').toUpperCase()}</Text>
                    {mode === 'login' && (
                      <TouchableOpacity onPress={() => { setMode('recovery'); setError(null); }}>
                        <Text style={[styles.authForgot, { color: C.primary }]}>{t('auth.forgot_password').toUpperCase()}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.authInputWrap}>
                    <TextInput
                      style={[styles.authInput, styles.authInputPassword, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                      placeholder="••••••••"
                      placeholderTextColor={C.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    />
                    <TouchableOpacity style={styles.authEyeBtn} onPress={() => setShowPassword((value) => !value)}>
                      {showPassword ? (
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
                          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <Line x1="1" y1="1" x2="23" y2="23" />
                        </Svg>
                      ) : (
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
                          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <Circle cx="12" cy="12" r="3" />
                        </Svg>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: `${C.accent}22`, borderColor: C.accent }]}>
                  <Text style={[styles.errorText, { color: C.expenseText }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.authActions}>
                {mode === 'register' && registerStep === 1 && (
                  <TouchableOpacity
                    style={[
                      styles.authSubmit,
                      { backgroundColor: C.primary, borderColor: C.primary },
                      (loading || registerLoading) && styles.authSubmitDisabled,
                    ]}
                    onPress={handleRegisterStep1Next}
                    disabled={loading || registerLoading}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.authSubmitText, { color: C.primaryText }]}>NEXT</Text>
                  </TouchableOpacity>
                )}

                {mode === 'register' && registerStep === 2 && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.authSubmit,
                        { backgroundColor: C.primary, borderColor: C.primary },
                        registerLoading && styles.authSubmitDisabled,
                      ]}
                      onPress={handleRegisterSubmit}
                      disabled={registerLoading}
                      activeOpacity={0.88}
                    >
                      {registerLoading ? (
                        <ActivityIndicator size="small" color={C.primaryText} />
                      ) : (
                        <Text style={[styles.authSubmitText, { color: C.primaryText }]}> 
                          {t('auth.register_action').toUpperCase()}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.authSubmitSecondary, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                      onPress={() => { setRegisterStep(1); setError(null); }}
                      disabled={registerLoading}
                      activeOpacity={1}
                    >
                      <Text style={[styles.authSubmitText, { color: C.textMain }]}>BACK</Text>
                    </TouchableOpacity>
                  </>
                )}

                {mode === 'login' && (
                  <TouchableOpacity
                    style={[
                      styles.authSubmit,
                      { backgroundColor: C.primary, borderColor: C.primary },
                      loading && styles.authSubmitDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.authSubmitText, { color: C.primaryText }]}> 
                      {loading ? t('auth.processing').toUpperCase() : t('auth.authenticate_action').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )}

                {mode === 'recovery' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.authSubmit,
                        { backgroundColor: C.primary, borderColor: C.primary },
                        loading && styles.authSubmitDisabled,
                      ]}
                      onPress={handleRecoverySubmit}
                      disabled={loading}
                      activeOpacity={0.88}
                    >
                      <Text style={[styles.authSubmitText, { color: C.primaryText }]}> 
                        {loading ? t('auth.processing').toUpperCase() : (t('auth.recovery_send' as any) || 'SEND').toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.authSubmitSecondary, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                      onPress={() => { setMode('login'); setError(null); }}
                      disabled={loading}
                      activeOpacity={1}
                    >
                      <Text style={[styles.authSubmitText, { color: C.textMain }]}> 
                        {(t('auth.recovery_back' as any) || 'BACK').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {mode === 'register' && (
                <View style={styles.progressBarWrap}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${registerStep === 1 ? 50 : 100}%`,
                          backgroundColor: C.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.authFooter, { borderTopColor: C.borderDim }]}>
              <Text style={[styles.authFooterVersion, { color: C.textMuted }]}>{`© SAFADD V${appVersion.toUpperCase()}`}</Text>
              <View style={styles.authFooterIcons}>
                <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2">
                  <Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </Svg>
                <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2">
                  <Circle cx="12" cy="12" r="10" /><Line x1="2" y1="12" x2="22" y2="12" /><Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </Svg>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  authBox: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  authLogoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
    paddingTop: 16,
    paddingHorizontal: 22.4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  authLogoWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLogoName: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1.25,
    textTransform: 'uppercase',
  },
  authBody: {
    paddingTop: 24,
    paddingHorizontal: 22.4,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 17.6,
  },
  authTitle: {
    fontSize: 24.8,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 25,
    textTransform: 'uppercase',
  },
  authRecoveryCopy: {
    marginTop: -4.8,
    fontSize: 12.16,
    lineHeight: 18.8,
  },
  authToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  authToggleOpt: {
    flex: 1,
    paddingVertical: 8.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authToggleOptText: {
    fontSize: 11.2,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  authField: {
    flexDirection: 'column',
    gap: 6.4,
  },
  authFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authLabel: {
    fontSize: 9.12,
    fontWeight: '800',
    letterSpacing: 1.18,
    textTransform: 'uppercase',
  },
  authForgot: {
    fontSize: 8.32,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    padding: 0,
  },
  authInputWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  authInput: {
    flex: 1,
    borderWidth: 1,
    fontSize: 14.4,
    fontWeight: '600',
    paddingVertical: 11.2,
    paddingHorizontal: 14.4,
  },
  authInputCompact: {
    paddingVertical: 9.2,
    fontSize: 13.2,
  },
  authInputPassword: {
    paddingRight: 44,
  },
  authEyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalHelp: {
    fontSize: 10.88,
    lineHeight: 16.3,
  },
  authActions: {
    flexDirection: 'column',
    gap: 8.8,
    marginTop: 1.6,
  },
  authSubmit: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 14.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  authSubmitText: {
    fontSize: 12.48,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  authSubmitSecondary: {
    borderWidth: 1,
    paddingVertical: 14.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  authSubmitDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    padding: 8,
    borderRadius: 2,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
  },
  selectionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectionChipCode: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  selectionChipName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectionChipSymbol: {
    fontSize: 12,
    fontWeight: '900',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyCell: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  currencyCellSymbol: {
    fontSize: 22,
    fontWeight: '900',
  },
  currencyCellCode: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  currencyCellName: {
    fontSize: 9.5,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  currencyList: {
    gap: 6,
  },
  currencyRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  currencyRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  currencyRowCopy: {
    flex: 1,
    gap: 2,
  },
  currencyRowCode: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  currencyRowName: {
    fontSize: 10.5,
    textTransform: 'capitalize',
  },
  currencyRowSymbol: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 32,
    textAlign: 'right',
  },
  currencyActionPrimary: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currencyActionPrimaryText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  currencyActionToggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currencyActionToggleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inlineToggleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineToggleButtonText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressBarWrap: {
    paddingHorizontal: 22.4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#00000022',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#000',
  },
  authFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11.2,
    paddingHorizontal: 22.4,
    borderTopWidth: 1,
  },
  authFooterVersion: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  authFooterIcons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});