import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { apiFetch } from '../../lib/api';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { X, Save } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { haptic } from '../../utils/haptics';

type Props = {
  onClose: () => void;
};

export function ProfileIdentityView({ onClose }: Props) {
  const { session, user, webUser, refreshProfile, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme: C } = useTheme();
  const dialog = useDialog();

  const [username, setUsername] = useState(webUser?.username || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    if (!webUser?.id) return;
    if (!username.trim()) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('profile.username_label'), text2: t('mobile.profile.username_required_desc') });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('User')
        .update({ username: username.trim() })
        .eq('id', webUser.id);
        
      if (error) throw error;
      
      await refreshProfile();
      haptic.success();
      Toast.show({ type: 'success', text1: t('mobile.profile.profile_saved_title'), text2: t('mobile.profile.profile_saved_desc') });
      onClose();
    } catch (e: any) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: e.message || t('mobile.profile.profile_save_error_desc') });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      Toast.show({ type: 'error', text1: t('profile.email_section_title'), text2: t('profile.email_required') });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Toast.show({ type: 'error', text1: t('profile.email_section_title'), text2: t('profile.email_invalid') });
      return;
    }

    setEmailLoading(true);
    try {
      const response = await apiFetch('/api/auth/email/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: normalizedEmail }),
      }, session);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('profile.email_change_error'));
      }

      setNewEmail('');
      Toast.show({ type: 'success', text1: t('profile.email_section_title'), text2: t('profile.email_change_success') });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.email_change_error') });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_fields_required') });
      return;
    }

    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_min_length') });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_mismatch') });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await apiFetch('/api/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      }, session);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error === 'invalid_current_password' ? t('profile.password_current_invalid') : (payload.error || t('profile.password_change_error')));
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Toast.show({ type: 'success', text1: t('profile.password_section_title'), text2: t('profile.password_change_success') });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.password_change_error') });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if ((confirmDeleteEmail.trim().toLowerCase() || '') !== (user?.email?.trim().toLowerCase() || '')) {
      Toast.show({ type: 'error', text1: t('profile.delete_account_title'), text2: t('profile.sensitive_email_mismatch') });
      return;
    }

    const confirmed = await dialog.confirm({
      title: t('profile.delete_account_title'),
      message: t('profile.delete_account_confirm'),
      confirmText: t('profile.delete_account_action'),
      type: 'danger',
    });

    if (confirmed) {
      setDeleteLoading(true);
      try {
        const response = await apiFetch('/api/user', { method: 'DELETE' }, session);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || t('profile.delete_account_error'));
        }

        Toast.show({ type: 'success', text1: t('profile.delete_account_title'), text2: t('profile.delete_account_success') });
        await signOut();
      } catch (error: any) {
        Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.delete_account_error') });
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[s.title, { color: C.textMain }]}>{t('profile.card_identity').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.field}>
          <Text style={[s.label, { color: C.textMuted }]}>{t('profile.username_label').toUpperCase()}</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('mobile.profile.username_placeholder')}
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={s.field}>
          <Text style={[s.label, { color: C.textMuted }]}>{t('mobile.profile.email_locked').toUpperCase()}</Text>
          <View style={[s.inputDisabled, { backgroundColor: `${C.surfaceHover}55`, borderColor: C.borderDim }]}>
            <Text style={[s.inputTextDisabled, { color: C.textMuted }]}>{user?.email}</Text>
          </View>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('mobile.profile.email_locked_help')}</Text>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary }, loading && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.primaryText} size="small" />
          ) : (
            <>
              <Save size={18} color={C.primaryText} />
              <Text style={[s.saveBtnText, { color: C.primaryText }]}>{t('mobile.profile.save_changes').toUpperCase()}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.email_section_title')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.email_section_desc')}</Text>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.email_current').toUpperCase()}</Text>
            <View style={[s.inputDisabled, { backgroundColor: `${C.surfaceHover}55`, borderColor: C.borderDim }]}>
              <Text style={[s.inputTextDisabled, { color: C.textMuted }]}>{user?.email || t('profile.email_not_available')}</Text>
            </View>
          </View>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.email_new').toUpperCase()}</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder={t('profile.email_new')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }, emailLoading && s.saveBtnDisabled]} onPress={handleChangeEmail} disabled={emailLoading}>
            <Text style={[s.secondaryBtnText, { color: C.textMain }]}>{emailLoading ? t('profile.email_change_loading') : t('profile.email_change_action').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.password_section_title')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.password_section_desc')}</Text>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.password_current').toUpperCase()}</Text>
            <TextInput style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholderTextColor={C.textMuted} />
          </View>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.password_new').toUpperCase()}</Text>
            <TextInput style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor={C.textMuted} />
          </View>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.password_confirm').toUpperCase()}</Text>
            <TextInput style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={C.textMuted} />
          </View>
          <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }, passwordLoading && s.saveBtnDisabled]} onPress={handleChangePassword} disabled={passwordLoading}>
            <Text style={[s.secondaryBtnText, { color: C.textMain }]}>{passwordLoading ? t('profile.password_change_loading') : t('profile.password_change_action').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.dangerCard, { backgroundColor: `${C.accent}11`, borderColor: `${C.accent}55` }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.delete_account_title')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.delete_account_desc')}</Text>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.sensitive_email_prompt_label').toUpperCase()}</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
              value={confirmDeleteEmail}
              onChangeText={setConfirmDeleteEmail}
              placeholder={t('profile.sensitive_email_prompt_placeholder')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity style={[s.deleteBtn, { borderColor: C.accent }, deleteLoading && s.saveBtnDisabled]} onPress={handleDeleteAccount} disabled={deleteLoading}>
            <Text style={[s.deleteBtnText, { color: C.accent }]}>{deleteLoading ? t('profile.delete_account_loading') : t('profile.delete_account_action').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.travel_mode')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.travel_mode_disabled_desc')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.travel_mode_disabled_help')}</Text>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.social_links')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.soon')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.google_account')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.github_repository')}</Text>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.linked_devices')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_current_example')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_current_meta')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_secondary_example')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_secondary_meta')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    gap: Spacing.sm,
    borderRadius: Radius.block,
    borderWidth: 1,
    padding: Spacing.md,
  },
  dangerCard: {
    gap: Spacing.sm,
    borderRadius: Radius.block,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  input: {
    fontSize: FontSize.base,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  inputDisabled: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  inputTextDisabled: {
    fontSize: FontSize.base,
  },
  helper: {
    fontSize: FontSize.xs, marginTop: 4,
  },
  saveBtn: {
    borderRadius: Radius.block,
    paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.black, letterSpacing: 1 },
  secondaryBtn: {
    borderRadius: Radius.block,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderRadius: Radius.block,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
});
