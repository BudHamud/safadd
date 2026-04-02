import { useEffect, useState } from 'react';
import { DeviceEventEmitter, View, Text, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw, Smartphone, BellRing, Palette, X } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { getItemWithLegacyKey } from '../../../lib/storage';
import { getOfflineHistory, getPendingCount, getSyncMode, setSyncMode, type OfflineHistoryEntry, type SyncMode } from '../../../lib/offlineQueue';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

const BANK_SYNC_KEY = 'safadd_bank_sync';
const LEGACY_BANK_SYNC_KEY = 'safed_bank_sync';
const ACCENT_KEY = 'safadd_accent_color';
const LEGACY_ACCENT_KEY = 'safed_accent_color';

type Props = {
  onClose: () => void;
  onSyncNow?: () => Promise<{ synced: number; failed: number; lastError?: string | null }>;
};

function isDisplayableColor(value: string | null) {
  if (!value) return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(rgb|hsl)a?\(/i.test(value);
}

export function ProfileSyncView({ onClose, onSyncNow }: Props) {
  const { user, syncStatus } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const [syncEnabled, setSyncEnabled] = useState<boolean | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline] = useState(true);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [syncMode, setSyncModeState] = useState<SyncMode>('auto');
  const [history, setHistory] = useState<OfflineHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const deviceLimitReached = syncStatus?.deviceLimitReached ?? false;
  const maxDevices = syncStatus?.maxDevices;

  useEffect(() => {
    let mounted = true;

    const loadLocalState = async () => {
      setHistoryLoading(true);
      const [syncValue, savedAccent, pending, mode, historyItems] = await Promise.all([
        getItemWithLegacyKey(BANK_SYNC_KEY, [LEGACY_BANK_SYNC_KEY]),
        getItemWithLegacyKey(ACCENT_KEY, [LEGACY_ACCENT_KEY]),
        getPendingCount(),
        getSyncMode(),
        getOfflineHistory(),
      ]);

      if (!mounted) return;
      setSyncEnabled(syncValue === 'true');
      setAccentColor(isDisplayableColor(savedAccent) ? savedAccent : null);
      setPendingOpsCount(pending);
      setSyncModeState(mode);
      setHistory(historyItems);
      setHistoryLoading(false);
    };

    void loadLocalState();

    const sub = DeviceEventEmitter.addListener('tx_saved', () => {
      void loadLocalState();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const handleRefresh = async () => {
    if (!onSyncNow) return;

    if (deviceLimitReached) {
      await dialog.alert(t('plan.device_limit_body', { count: maxDevices ?? 1 }), t('plan.device_limit_title'));
      return;
    }

    setRefreshing(true);
    try {
      const result = await onSyncNow();
      const [freshCount, historyItems] = await Promise.all([getPendingCount(), getOfflineHistory()]);
      setPendingOpsCount(freshCount);
      setHistory(historyItems);
      if (result.failed === 0) {
        dialog.alert(t('profile.sync_result_ok'), t('profile.sync_btn'));
      } else {
        const errorDetail = result.lastError ? `\n\n${t('profile.sync_error_label')}: ${result.lastError}` : '';
        dialog.alert(`${result.synced} ${t('profile.sync_result_ok')}, ${result.failed} ${t('profile.sync_result_fail')}${errorDetail}`, t('profile.sync_btn'));
      }
    } catch (error: any) {
      dialog.alert(error?.message || t('profile.sync_offline_warn'), t('details.save_error'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleSyncMode = async (value: boolean) => {
    if (deviceLimitReached) {
      await dialog.alert(t('plan.device_limit_body', { count: maxDevices ?? 1 }), t('plan.device_limit_title'));
      return;
    }

    const mode: SyncMode = value ? 'manual' : 'auto';
    setSyncModeState(mode);
    await setSyncMode(mode);
  };

  const formatHistoryTitle = (entry: OfflineHistoryEntry) => {
    if (entry.type === 'create') return t('profile.sync_history_create');
    if (entry.type === 'update') return t('profile.sync_history_update');
    if (entry.type === 'delete') return t('profile.sync_history_delete');
    return t('profile.sync_history_sync');
  };

  const formatHistoryDetail = (entry: OfflineHistoryEntry) => {
    if (entry.type === 'sync') {
      return t('profile.sync_history_sync_summary', {
        synced: entry.synced ?? 0,
        failed: entry.failed ?? 0,
      });
    }

    const desc = entry.desc?.trim();
    if (desc) return desc;
    if (entry.amount != null) return String(entry.amount);
    return entry.txId ?? entry.tempId ?? t('profile.sync_pending');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}> 
        <Text style={[styles.title, { color: C.textMain }]}>{t('profile.sync_subview_title').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? C.primary : C.accent }]} />
          <Text style={[styles.statusLabel, { color: C.textMain }]}>{isOnline ? t('profile.sync_status_online') : t('profile.sync_status_offline')}</Text>
        </View>

        {/* Sync mode toggle */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.inlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardBold, { color: C.textMain }]}>{t('profile.sync_mode_label')}</Text>
              <Text style={[styles.cardText, { color: C.textMuted }]}>
                {syncMode === 'manual' ? t('profile.sync_mode_manual_desc') : t('profile.sync_mode_auto_desc')}
              </Text>
            </View>
            <Switch
              value={syncMode === 'manual'}
              onValueChange={(value) => { void handleToggleSyncMode(value); }}
              trackColor={{ true: C.accent, false: C.primary }}
              thumbColor={C.primaryText}
            />
          </View>
          <Text style={[styles.cardCaptionRow, { color: C.textMuted }]}>
            {syncMode === 'manual' ? `⏸ ${t('profile.sync_mode_manual')}` : `⚡ ${t('profile.sync_mode_auto')}`}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <Text style={[styles.syncCountNum, { color: pendingOpsCount > 0 ? C.accent : C.primary }]}>{pendingOpsCount}</Text>
          <Text style={[styles.syncCountLabel, { color: C.textMuted }]}>{t('profile.sync_pending')}</Text>
          {pendingOpsCount === 0 ? <Text style={[styles.syncOk, { color: C.primary }]}>✓ {t('profile.sync_none')}</Text> : null}
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <View style={styles.inlineRow}>
            <Smartphone size={16} color={C.primary} />
            <Text style={[styles.cardText, { color: C.textMuted }]}>
              {`${user?.email ?? ''} · ${syncStatus?.registeredDevices ?? 0}/${maxDevices ?? '∞'}`}
            </Text>
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
            style={[styles.refreshBtn, { backgroundColor: C.primary }, (refreshing || !onSyncNow) && styles.refreshBtnDisabled]}
            onPress={handleRefresh}
            disabled={refreshing || !onSyncNow || pendingOpsCount === 0}
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

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <Text style={[styles.cardBold, { color: C.textMain }]}>{t('profile.sync_history_title')}</Text>
          {historyLoading ? <ActivityIndicator color={C.primary} size="small" /> : null}
          {!historyLoading && history.length === 0 ? (
            <Text style={[styles.cardText, { color: C.textMuted }]}>{t('profile.sync_history_empty')}</Text>
          ) : null}
          {!historyLoading ? history.slice(0, 12).map((entry) => (
            <View key={entry.id} style={[styles.historyRow, { borderTopColor: C.border }]}> 
              <View style={styles.historyCopy}>
                <Text style={[styles.historyTitle, { color: C.textMain }]}>{formatHistoryTitle(entry).toUpperCase()}</Text>
                <Text style={[styles.historyText, { color: C.textMuted }]} numberOfLines={2}>{formatHistoryDetail(entry)}</Text>
              </View>
              <Text style={[styles.historyTime, { color: C.textMuted }]}>{new Date(entry.timestamp).toLocaleString()}</Text>
            </View>
          )) : null}
        </View>

        {!isOnline ? <Text style={[styles.offlineNote, { color: C.accent }]}>⚠ {t('profile.sync_offline_warn')}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
