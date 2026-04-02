import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, X } from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { ModalSafeAreaView } from '../../layout/ModalSafeAreaView';
import { useProfileIdentity } from '../../../hooks/useProfileIdentity';
import { ProfilePlanSheet } from '../ProfilePlanSheet';
import { s } from './styles';

type Props = { onClose: () => void };

export function ProfileIdentityView({ onClose }: Props) {
  const { t } = useLanguage();
  const { theme: C } = useTheme();
  const id = useProfileIdentity();
  const { isPro } = id;

  // ── Sheet title ──────────────────────────────────────────────
  const sheetTitle = () => {
    if (id.activeSheet === 'name')     return t('profile.username_label');
    if (id.activeSheet === 'email')    return t('profile.email_section_title');
    if (id.activeSheet === 'password') return t('profile.password_section_title');
    if (id.activeSheet === 'delete')   return t('profile.delete_account_title');
    return t('plan.compare_title');
  };

  // ── Sheet content ─────────────────────────────────────────────
  const renderSheetContent = () => {
    if (id.activeSheet === 'plan') {
      return (
        <ProfilePlanSheet
          isPro={isPro}
          onCheckout={(v) => { void id.handleCheckout(v); }}
        />
      );
    }

    if (id.activeSheet === 'name') {
      return (
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.username_label').toUpperCase()}</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
              value={id.username}
              onChangeText={id.setUsername}
              placeholder={t('mobile.profile.username_placeholder')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
          </View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.surfaceAlt, borderColor: C.border }, id.loading && s.btnDisabled]}
            onPress={id.handleSaveName}
            disabled={id.loading}
          >
            <Text style={[s.btnText, { color: C.textMain }]}>
              {id.loading ? t('profile.email_change_loading') : t('profile.update_action').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (id.activeSheet === 'email') {
      return (
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.email_section_desc')}</Text>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.email_current').toUpperCase()}</Text>
            <View style={[s.inputDisabled, { backgroundColor: `${C.surfaceHover}55`, borderColor: C.borderDim }]}>
              <Text style={[s.inputTextDisabled, { color: C.textMuted }]}>{id.user?.email || t('profile.email_not_available')}</Text>
            </View>
          </View>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.email_new').toUpperCase()}</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
              value={id.newEmail}
              onChangeText={id.setNewEmail}
              placeholder={t('profile.email_new')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.surfaceAlt, borderColor: C.border }, id.emailLoading && s.btnDisabled]}
            onPress={id.handleChangeEmail}
            disabled={id.emailLoading}
          >
            <Text style={[s.btnText, { color: C.textMain }]}>
              {id.emailLoading ? t('profile.email_change_loading') : t('profile.update_action').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (id.activeSheet === 'password') {
      return (
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.password_section_desc')}</Text>
          {[
            { label: t('profile.password_current'), value: id.currentPassword, onChange: id.setCurrentPassword },
            { label: t('profile.password_new'),     value: id.newPassword,     onChange: id.setNewPassword },
            { label: t('profile.password_confirm'), value: id.confirmPassword, onChange: id.setConfirmPassword },
          ].map((f) => (
            <View key={f.label} style={s.field}>
              <Text style={[s.label, { color: C.textMuted }]}>{f.label.toUpperCase()}</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
                value={f.value}
                onChangeText={f.onChange}
                secureTextEntry
                placeholderTextColor={C.textMuted}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.surfaceAlt, borderColor: C.border }, id.passwordLoading && s.btnDisabled]}
            onPress={id.handleChangePassword}
            disabled={id.passwordLoading}
          >
            <Text style={[s.btnText, { color: C.textMain }]}>
              {id.passwordLoading ? t('profile.password_change_loading') : t('profile.update_action').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (id.activeSheet === 'delete') {
      return (
        <View style={[s.card, s.dangerCard, { backgroundColor: C.surface, borderColor: `${C.accent}55` }]}>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.delete_account_desc')}</Text>
          <View style={s.field}>
            <Text style={[s.label, { color: C.textMuted }]}>{t('profile.sensitive_email_prompt_label').toUpperCase()}</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
              value={id.confirmDeleteEmail}
              onChangeText={id.setConfirmDeleteEmail}
              placeholder={t('profile.sensitive_email_prompt_placeholder')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity
            style={[s.deleteBtn, { borderColor: C.accent }, id.deleteLoading && s.btnDisabled]}
            onPress={id.handleDeleteAccount}
            disabled={id.deleteLoading}
          >
            <Text style={[s.btnText, { color: C.accent }]}>
              {id.deleteLoading ? t('profile.delete_account_loading') : t('profile.delete_action_short').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ── Main layout ───────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[s.title, { color: C.textMain }]}>{t('profile.card_identity').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={s.content}>
        {/* Plan card */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('plan.card_title')}</Text>
          <View style={[s.currentPlanRow, { backgroundColor: C.primary, borderColor: C.primary }]}>
            <CheckCircle2 size={18} color={C.primaryText} />
            <View style={s.currentPlanText}>
              <Text style={[s.currentPlanName, { color: C.primaryText }]}>
                {isPro ? t('plan.pro_name') : t('plan.free_name')}
              </Text>
              <Text style={[s.currentPlanMeta, { color: `${C.primaryText}CC` }]}>{t('plan.current_plan')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.planBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
            onPress={() => { void id.handlePlanAction(); }}
          >
            <Text style={[s.planBtnText, { color: C.textMain }]}>{t('plan.compare_title').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Account options */}
        <View style={s.optionStack}>
          {([
            { key: 'name',     label: t('profile.username_label') },
            { key: 'email',    label: t('profile.email_section_title') },
            { key: 'password', label: t('profile.password_section_title') },
          ] as const).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[s.optionRow, { borderColor: C.borderDim, backgroundColor: C.surfaceAlt }]}
              onPress={() => id.setActiveSheet(opt.key)}
            >
              <Text style={[s.optionTitle, { color: C.textMain }]}>{opt.label}</Text>
              <Text style={[s.optionAction, { color: C.primary }]}>{t('profile.update_action').toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.optionRow, { borderColor: `${C.accent}33`, backgroundColor: `${C.accent}10` }]}
            onPress={() => id.setActiveSheet('delete')}
          >
            <Text style={[s.optionTitle, { color: C.textMain }]}>{t('profile.delete_account_title')}</Text>
            <Text style={[s.optionAction, { color: C.accent }]}>{t('profile.delete_action_short').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Linked devices placeholder */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textMain }]}>{t('profile.linked_devices')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_current_example')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_current_meta')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_secondary_example')}</Text>
          <Text style={[s.helper, { color: C.textMuted }]}>{t('profile.device_secondary_meta')}</Text>
        </View>
      </ScrollView>

      {/* Full-screen sub-sheet modal */}
      <Modal
        visible={id.activeSheet !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => id.setActiveSheet(null)}
      >
        <KeyboardAvoidingView
          style={[s.container, { backgroundColor: C.bg }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ModalSafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
            <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
              <Text style={[s.title, { color: C.textMain }]}>{sheetTitle().toUpperCase()}</Text>
              <TouchableOpacity onPress={() => id.setActiveSheet(null)} style={s.closeBtn}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              {renderSheetContent()}
            </ScrollView>
          </ModalSafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
