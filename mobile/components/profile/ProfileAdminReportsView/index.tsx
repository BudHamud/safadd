import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RefreshCw, Trash2, Archive, CheckCircle2, RotateCcw, X } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useDialog } from '../../../context/DialogContext';
import { useAdminReports } from '../../../context/AdminReportsContext';
import { apiFetch } from '../../../lib/api';
import { getRequestErrorMessage } from '../../../lib/requestErrors';
import { FontWeight, Spacing } from '../../../constants/theme';
import { haptic } from '../../../utils/haptics';

type ReportStatusFilter = 'all' | 'open' | 'solved' | 'archived';

type AdminDebugReport = {
  id: string;
  description: string;
  device_info: string | null;
  app_version: string | null;
  platform: string | null;
  images_count: number | null;
  created_at: string;
  reporterName: string | null;
  image_urls: string[];
  status: 'open' | 'solved' | 'archived';
};

type Props = {
  onClose: () => void;
};

function normalizeStatus(status: string | null | undefined): 'open' | 'solved' | 'archived' {
  if (status === 'solved' || status === 'archived') return status;
  return 'open';
}

export function ProfileAdminReportsView({ onClose }: Props) {
  const { theme: C } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const dialog = useDialog();
  const { markSeen, refresh: refreshNotifications } = useAdminReports();
  const [reports, setReports] = useState<AdminDebugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportStatusFilter>('open');
  const [summary, setSummary] = useState({ open: 0, solved: 0, archived: 0 });

  const loadReports = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (!session) {
      setReports([]);
      setSummary({ open: 0, solved: 0, archived: 0 });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const response = await apiFetch(`/api/debug-reports?scope=admin&status=${filter}&limit=100`, undefined, session);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === 'string' ? payload.error : t('profile.admin_reports_load_error'));
        setReports([]);
        return;
      }

      setReports(Array.isArray(payload?.reports) ? payload.reports.map((report: AdminDebugReport) => ({
        ...report,
        status: normalizeStatus(report.status),
      })) : []);
      setSummary({
        open: Number(payload?.summary?.open ?? 0),
        solved: Number(payload?.summary?.solved ?? 0),
        archived: Number(payload?.summary?.archived ?? 0),
      });
    } catch (loadError) {
      setError(getRequestErrorMessage(loadError, t('profile.admin_reports_load_error'), lang));
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, lang, session, t]);

  useEffect(() => {
    void markSeen();
    void loadReports('initial');
  }, [loadReports, markSeen]);

  const handleUpdateStatus = useCallback(async (reportId: string, status: 'open' | 'solved' | 'archived') => {
    if (!session) return;

    const confirmMessage = status === 'solved'
      ? t('mobile.admin_reports.solve_confirm')
      : status === 'archived'
        ? t('mobile.admin_reports.archive_confirm')
        : t('mobile.admin_reports.reopen_confirm');
    const confirmed = await dialog.confirm({
      title: t('profile.admin_reports_title'),
      message: confirmMessage,
      confirmText: status === 'solved'
        ? t('mobile.admin_reports.action_solve')
        : status === 'archived'
          ? t('mobile.admin_reports.action_archive')
          : t('mobile.admin_reports.action_reopen'),
      type: status === 'archived' ? 'danger' : 'confirm',
    });

    if (!confirmed) return;

    setBusyId(reportId);
    try {
      const response = await apiFetch(`/api/debug-reports?id=${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }, session);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('details.save_error'));
      }

      haptic.success();
      Toast.show({ type: 'success', text1: t('mobile.admin_reports.update_success') });
      await Promise.all([loadReports('refresh'), refreshNotifications()]);
    } catch (updateError: any) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: getRequestErrorMessage(updateError, t('details.save_error'), lang) });
    } finally {
      setBusyId(null);
    }
  }, [dialog, lang, loadReports, refreshNotifications, session, t]);

  const handleDelete = useCallback(async (reportId: string) => {
    if (!session) return;

    const confirmed = await dialog.confirm({
      title: t('btn.delete'),
      message: t('mobile.admin_reports.delete_confirm'),
      confirmText: t('btn.delete'),
      type: 'danger',
    });

    if (!confirmed) return;

    setBusyId(reportId);
    try {
      const response = await apiFetch(`/api/debug-reports?id=${reportId}`, { method: 'DELETE' }, session);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('details.save_error'));
      }

      haptic.success();
      Toast.show({ type: 'success', text1: t('mobile.admin_reports.delete_success') });
      await Promise.all([loadReports('refresh'), refreshNotifications()]);
    } catch (deleteError: any) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: getRequestErrorMessage(deleteError, t('details.save_error'), lang) });
    } finally {
      setBusyId(null);
    }
  }, [dialog, lang, loadReports, refreshNotifications, session, t]);

  const filterItems = useMemo(() => ([
    { key: 'open' as const, label: t('mobile.admin_reports.filter_open'), count: summary.open },
    { key: 'solved' as const, label: t('mobile.admin_reports.filter_solved'), count: summary.solved },
    { key: 'archived' as const, label: t('mobile.admin_reports.filter_archived'), count: summary.archived },
    { key: 'all' as const, label: t('mobile.admin_reports.filter_all'), count: summary.open + summary.solved + summary.archived },
  ]), [summary.archived, summary.open, summary.solved, t]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: C.textMain }]}>{t('profile.admin_reports_title').toUpperCase()}</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>{t('profile.admin_reports_desc').toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.filterRowWrap}>
          {filterItems.map((item) => {
            const active = item.key === filter;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? `${C.primary}18` : C.surface }]}
                onPress={() => {
                  haptic.selection();
                  setFilter(item.key);
                }}
              >
                <Text style={[styles.filterChipText, { color: active ? C.textMain : C.textMuted }]}>{item.label.toUpperCase()}</Text>
                <Text style={[styles.filterChipCount, { color: active ? C.primary : C.textMuted }]}>{item.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: C.border, backgroundColor: C.surface }]}
          onPress={() => void loadReports('refresh')}
          disabled={loading || refreshing}
        >
          {refreshing ? <ActivityIndicator color={C.primary} size="small" /> : <RefreshCw size={15} color={C.primary} />}
          <Text style={[styles.refreshText, { color: C.textMain }]}>{t('profile.admin_reports_refresh').toUpperCase()}</Text>
        </TouchableOpacity>

        {loading && reports.length === 0 ? <ActivityIndicator color={C.primary} style={styles.loader} /> : null}
        {error ? <Text style={[styles.errorText, { color: C.accent }]}>{error}</Text> : null}

        {!loading && !error && reports.length === 0 ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('mobile.admin_reports.empty_filtered')}</Text>
          </View>
        ) : null}

        {reports.map((report) => {
          const isBusy = busyId === report.id;
          return (
            <View key={report.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadCopy}>
                  <Text style={[styles.reportUser, { color: C.textMain }]}>{(report.reporterName || t('profile.admin_reports_unknown_user')).toUpperCase()}</Text>
                  <Text style={[styles.reportMeta, { color: C.textMuted }]}>{new Date(report.created_at).toLocaleString()}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: report.status === 'open' ? `${C.primary}22` : report.status === 'solved' ? `${C.incomeText}22` : `${C.textMuted}22`, borderColor: C.border }]}>
                  <Text style={[styles.statusPillText, { color: report.status === 'open' ? C.primary : report.status === 'solved' ? C.incomeText : C.textMuted }]}>
                    {t(`mobile.debug.report_${report.status}`).toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.reportDesc, { color: C.textMain }]}>{report.description}</Text>

              {report.image_urls.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
                  {report.image_urls.map((imageUrl, index) => (
                    <Image key={`${report.id}-${index}`} source={{ uri: imageUrl }} style={styles.reportImage} contentFit="cover" />
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.metaGrid}>
                <Text style={[styles.metaText, { color: C.textMuted }]}>{`${t('profile.admin_reports_platform')}: ${report.platform || '-'}`}</Text>
                <Text style={[styles.metaText, { color: C.textMuted }]}>{`${t('profile.admin_reports_version')}: ${report.app_version || '-'}`}</Text>
                <Text style={[styles.metaText, { color: C.textMuted }]}>{`${t('profile.admin_reports_device')}: ${report.device_info || '-'}`}</Text>
                <Text style={[styles.metaText, { color: C.textMuted }]}>{`${report.images_count ?? 0} ${t('profile.admin_reports_images')}`}</Text>
              </View>

              <View style={styles.actionRow}>
                {report.status !== 'solved' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                    onPress={() => void handleUpdateStatus(report.id, 'solved')}
                    disabled={isBusy}
                  >
                    <CheckCircle2 size={14} color={C.primary} />
                    <Text style={[styles.actionText, { color: C.textMain }]}>{t('mobile.admin_reports.action_solve').toUpperCase()}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                    onPress={() => void handleUpdateStatus(report.id, 'open')}
                    disabled={isBusy}
                  >
                    <RotateCcw size={14} color={C.primary} />
                    <Text style={[styles.actionText, { color: C.textMain }]}>{t('mobile.admin_reports.action_reopen').toUpperCase()}</Text>
                  </TouchableOpacity>
                )}

                {report.status !== 'archived' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                    onPress={() => void handleUpdateStatus(report.id, 'archived')}
                    disabled={isBusy}
                  >
                    <Archive size={14} color={C.textMain} />
                    <Text style={[styles.actionText, { color: C.textMain }]}>{t('mobile.admin_reports.action_archive').toUpperCase()}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: `${C.accent}55`, backgroundColor: `${C.accent}11` }]}
                  onPress={() => void handleDelete(report.id)}
                  disabled={isBusy}
                >
                  <Trash2 size={14} color={C.accent} />
                  <Text style={[styles.actionText, { color: C.accent }]}>{t('mobile.admin_reports.action_delete').toUpperCase()}</Text>
                </TouchableOpacity>

                {isBusy ? <ActivityIndicator color={C.primary} size="small" /> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
