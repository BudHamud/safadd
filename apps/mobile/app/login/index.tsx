import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, SafeAreaView
} from 'react-native';
import Svg, { Rect, Path, Circle, Line } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { C } from '../../constants/Colors';
import { apiFetch } from '../../lib/api';

type Mode = 'login' | 'register' | 'recovery';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const dialog = useDialog();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wantsGoal, setWantsGoal] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState('');

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

      if (!res.ok) {
        throw new Error(t('auth.recovery_error' as any) || 'Failed to request recovery.');
      }

      await dialog.alert(t('auth.recovery_sent' as any) || 'Recovery sent.', t('auth.recovery_title' as any) || 'Recovery');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Server connection error');
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
    if (mode === 'register' && password.length < 6) {
      setError(t('auth.mobile_password_min_length'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const identifier = email.trim();
        const { error } = await signIn(identifier, password);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
            setError(t('auth.invalid_credentials'));
          } else if (msg.includes('username_login_session_unavailable')) {
            setError(t('auth.invalid_credentials'));
          } else if (msg.includes('email not confirmed')) {
            setError(t('auth.confirm_email_before_login'));
          } else if (msg.includes('too many requests')) {
            setError(t('auth.too_many_requests'));
          } else if (msg.includes('user not found')) {
            setError(t('auth.user_not_found'));
          } else {
            setError(`Error: ${error.message}`);
          }
        }
      } else {
        const { error } = await signUp(email.trim().toLowerCase(), password, fullName.trim() || undefined);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setError(t('auth.email_already_registered'));
          } else if (msg.includes('password should be')) {
            setError(t('auth.mobile_password_min_length'));
          } else {
            setError(`Error: ${error.message}`);
          }
        } else {
          await dialog.alert(
            t('auth.register_success_desc'),
            t('auth.register_success_title')
          );
          setMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          <View style={[styles.authBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            
            {/* ── Logo bar ── */}
            <View style={[styles.authLogoBar, { borderBottomColor: C.borderDim }]}>
              <View style={[styles.authLogoIcon, { backgroundColor: C.primary }]}>
                {loading ? (
                  <ActivityIndicator size="small" color={C.primaryText} />
                ) : (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.primaryText} strokeWidth={3} strokeLinecap="round">
                    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </Svg>
                )}
              </View>
              <Text style={[styles.authLogoName, { color: C.textMain }]}>SAFADD</Text>
            </View>

            {/* ── Body ── */}
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
                    onPress={() => { setMode('register'); setError(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.authToggleOptText, { color: mode === 'register' ? C.primaryText : C.textMuted }]}>
                      {t('auth.register_tab').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Form fields ── */}
              {mode === 'register' && (
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

              {mode === 'register' && (
                <View style={styles.authField}>
                  <View style={styles.authFieldHeader}>
                    <Text style={[styles.authLabel, { color: C.textMuted }]}>{t('auth.goal_question').toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.goalCheckboxRow}
                    onPress={() => {
                      setWantsGoal(prev => !prev);
                      if (wantsGoal) setMonthlyGoal('');
                    }}
                    activeOpacity={0.8}
                  >
                     <View style={[styles.checkboxBox, wantsGoal && { backgroundColor: C.primary, borderColor: C.primary }]}>
                        {wantsGoal && <Text style={[styles.checkboxTick, { color: C.primaryText }]}>✓</Text>}
                     </View>
                     <Text style={[styles.checkboxLabel, { color: C.textMain }]}>{t('auth.goal_toggle')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.goalHelp, { color: C.textMuted, marginBottom: wantsGoal ? 10 : 0 }]}>
                    {t('auth.goal_help')}
                  </Text>
                  {wantsGoal && (
                    <View style={styles.authInputWrap}>
                      <TextInput
                        style={[styles.authInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.textMain }]}
                        placeholder={t('auth.goal_placeholder')}
                        placeholderTextColor={C.textMuted}
                        value={monthlyGoal}
                        onChangeText={setMonthlyGoal}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
              )}

              {mode !== 'recovery' && (
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
                    <TouchableOpacity style={styles.authEyeBtn} onPress={() => setShowPassword(v => !v)}>
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

              {/* ── Submit button ── */}
              <View style={styles.authActions}>
                <TouchableOpacity
                  style={[styles.authSubmit, { backgroundColor: C.primary, borderColor: C.primary }, loading && styles.authSubmitDisabled]}
                  onPress={mode === 'recovery' ? handleRecoverySubmit : handleSubmit}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.authSubmitText, { color: C.primaryText }]}>
                    {loading ? t('auth.processing').toUpperCase() : mode === 'recovery' ? (t('auth.recovery_send' as any) || 'SEND').toUpperCase() : mode === 'register' ? t('auth.register_action').toUpperCase() : t('auth.authenticate_action').toUpperCase()}
                  </Text>
                </TouchableOpacity>

                {mode === 'recovery' && (
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
                )}
              </View>

            </View>

            {/* ── Footer ── */}
            <View style={[styles.authFooter, { borderTopColor: C.borderDim }]}>
              <Text style={[styles.authFooterVersion, { color: C.textMuted }]}>© SAFADD V1.0.14</Text>
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
    backgroundColor: C.bg, // Add the background color to the SafeAreaView so it's not white
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
  /* ── Logo bar ── */
  authLogoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
    paddingTop: 16,
    paddingHorizontal: 22.4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  authLogoIcon: {
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
  /* ── Body ── */
  authBody: {
    paddingTop: 24,
    paddingHorizontal: 22.4,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 17.6,
  },
  /* ── Title ── */
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
  /* ── Toggle login / registro ── */
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
  /* ── Form fields ── */
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
  /* ── Goal Fields ── */
  goalCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
    marginBottom: 8.8,
  },
  checkboxBox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#aaa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12.8,
    fontWeight: '600',
  },
  goalHelp: {
    fontSize: 10.88,
    lineHeight: 16.3,
  },
  /* ── Submit button ── */
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
  /* ── Footer ── */
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
