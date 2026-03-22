import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCw, Smartphone, BellRing, Palette, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { getItemWithLegacyKey } from '../../lib/storage';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

const BANK_SYNC_KEY = 'safadd_bank_sync';
const LEGACY_BANK_SYNC_KEY = 'safed_bank_sync';
const ACCENT_KEY = 'safadd_accent_color';
const LEGACY_ACCENT_KEY = 'safed_accent_color';

type Props = {
  onClose: () => void;
};

function isDisplayableColor(value: string | null) {
  if (!value) return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(rgb|hsl)a?\(/i.test(value);
}

export function ProfileSyncView({ onClose }: Props) {
  const { user, refreshProfile } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const [syncEnabled, setSyncEnabled] = useState<boolean | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline] = useState(true);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadLocalState = async () => {
      const [syncValue, savedAccent] = await Promise.all([
        getItemWithLegacyKey(BANK_SYNC_KEY, [LEGACY_BANK_SYNC_KEY]),
        getItemWithLegacyKey(ACCENT_KEY, [LEGACY_ACCENT_KEY]),
      ]);

      if (!mounted) return;
      setSyncEnabled(syncValue === 'true');
      setAccentColor(isDisplayableColor(savedAccent) ? savedAccent : null);
      setPendingOpsCount(syncValue === 'true' ? 1 : 0);
    };

    loadLocalState();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      dialog.alert(t('profile.sync_result_ok'), t('profile.sync_btn'));
      setPendingOpsCount(0);
    } catch (error: any) {
      dialog.alert(error?.message || t('profile.sync_offline_warn'), t('details.save_error'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}> 
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}> 
        <Text style={[styles.title, { color: C.textMain }]}>{t('profile.sync_subview_title').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? C.primary : C.accent }]} />
          <Text style={[styles.statusLabel, { color: C.textMain }]}>{isOnline ? t('profile.sync_status_online') : t('profile.sync_status_offline')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <Text style={[styles.syncCountNum, { color: pendingOpsCount > 0 ? C.accent : C.primary }]}>{pendingOpsCount}</Text>
          <Text style={[styles.syncCountLabel, { color: C.textMuted }]}>{t('profile.sync_pending')}</Text>
          {pendingOpsCount === 0 ? <Text style={[styles.syncOk, { color: C.primary }]}>✓ {t('profile.sync_none')}</Text> : null}
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <View style={styles.inlineRow}>
            <Smartphone size={16} color={C.primary} />
            <Text style={[styles.cardText, { color: C.textMuted }]}>{user?.email ?? ''}</Text>
          </View>
          <View style={styles.inlineRow}>
            <BellRing size={16} color={C.primary} />
            <Text style={[styles.cardText, { color: C.textMuted }]}>{syncEnabled ? t('common.active') : t('common.inactive')}</Text>
          </View>
          <View style={styles.inlineRow}>
            <Palette size={16} color={C.primary} />
            <Text style={[styles.cardText, { color: C.textMuted }]}>{accentColor ?? C.primary}</Text>
            <View style={[styles.swatch, { backgroundColor: accentColor ?? C.primary, borderColor: C.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: C.primary }, refreshing && styles.refreshBtnDisabled]}
            onPress={handleRefresh}
            disabled={refreshing || !isOnline || pendingOpsCount === 0}
          >
            {refreshing ? (
              <ActivityIndicator color={C.primaryText} size="small" />
            ) : (
              <>
                <RefreshCw size={16} color={C.primaryText} />
                <Text style={[styles.refreshText, { color: C.primaryText }]}>{t('profile.sync_btn').toUpperCase()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!isOnline ? <Text style={[styles.offlineNote, { color: C.accent }]}>⚠ {t('profile.sync_offline_warn')}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, gap: Spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cardText: { fontSize: FontSize.sm, lineHeight: 20 },
  syncCountNum: { fontSize: 36, fontWeight: FontWeight.black },
  syncCountLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase' },
  syncOk: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  refreshBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.block,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  refreshBtnDisabled: { opacity: 0.7 },
  refreshText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 1 },
  offlineNote: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});