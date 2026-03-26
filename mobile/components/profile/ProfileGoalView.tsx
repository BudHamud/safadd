import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { X, Save } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { haptic } from '../../utils/haptics';
import { getCurrencySymbol } from '../../lib/currency';

type Props = {
  onClose: () => void;
};

export function ProfileGoalView({ onClose }: Props) {
  const { webUser, refreshProfile, currency, setGoalCurrency } = useAuth();
  const { t } = useLanguage();
  const { theme: C } = useTheme();
  const displayGoal = useDisplayGoalAmount(webUser?.monthlyGoal ?? 0);

  const [goal, setGoal] = useState(() => String(Math.round(displayGoal || 0)));
  const [loading, setLoading] = useState(false);
  const sym = getCurrencySymbol(currency);

  useEffect(() => {
    setGoal(String(Math.round(displayGoal || 0)));
  }, [displayGoal]);

  const handleSave = async () => {
    if (!webUser?.id) return;
    const numGoal = Number(goal);
    if (isNaN(numGoal) || numGoal < 0) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('profile.goal_max_amount'), text2: t('profile.goal_save_error') });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('User')
        .update({ monthlyGoal: numGoal })
        .eq('id', webUser.id);
        
      if (error) throw error;

      await setGoalCurrency(currency);
      await refreshProfile();
      haptic.success();
      Toast.show({ type: 'success', text1: t('profile.goal_save_btn'), text2: t('profile.goal_hint') });
      onClose();
    } catch (e: any) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: e.message || t('profile.goal_save_error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[s.title, { color: C.textMain }]}>{t('profile.monthly_goal').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <Text style={[s.description, { color: C.textMain, backgroundColor: C.surfaceAlt, borderColor: C.border }]}>{t('profile.goal_hint')}</Text>

        <View style={s.field}>
          <Text style={[s.label, { color: C.textMuted }]}>{`${t('profile.goal_max_amount')} (${sym})`.toUpperCase()}</Text>
          <TextInput
            style={[s.input, s.amountInput, { backgroundColor: C.surfaceAlt, color: C.textMain, borderColor: C.border }]}
            value={goal}
            onChangeText={setGoal}
            placeholder="0.00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />
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
              <Text style={[s.saveBtnText, { color: C.primaryText }]}>{t('profile.goal_save_btn').toUpperCase()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    gap: Spacing.lg,
  },
  description: {
    fontSize: FontSize.sm, lineHeight: 20,
    padding: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  input: {
    fontSize: FontSize.base,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  amountInput: {
    fontSize: FontSize.xl, fontWeight: FontWeight.black, textAlign: 'center',
  },
  saveBtn: {
    borderRadius: Radius.block,
    paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.black, letterSpacing: 1 },
});
