import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { s } from './styles';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { Spacing, FontWeight } from '../../../constants/theme';
import { haptic } from '../../../utils/haptics';
import { apiFetch } from '../../../lib/api';
import { getRequestErrorMessage } from '../../../lib/requestErrors';

const MAX_IMAGES = 5;
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

type ImageEntry = { uri: string; base64: string | null };
type Props = { onClose: () => void };

type DebugReportItem = {
  id: string;
  description: string;
  images_count?: number | null;
  platform?: string | null;
  app_version?: string | null;
  created_at?: string | null;
  status?: 'open' | 'solved' | 'archived' | null;
};

function normalizeBase64(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/, '');
}

function serializeDebugError(error: any, extra: Record<string, unknown> = {}) {
  const payload = {
    message: error?.message ?? error?.error ?? String(error),
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    status: error?.status ?? null,
    name: error?.name ?? null,
    setupRequired: error?.setupRequired ?? null,
    ...extra,
  };

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload.message ?? 'unknown_error');
  }
}

export function ProfileDebugView({ onClose }: Props) {
  const { theme: C } = useTheme();
  const { t, lang } = useLanguage();
  const { session, user } = useAuth();

  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<DebugReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const deviceName = Constants.deviceName ?? Platform.OS;
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const osVersion = typeof Platform.Version === 'number' ? Platform.Version.toString() : Platform.Version;
  const deviceInfo = `${deviceName} · ${Platform.OS.toUpperCase()} ${osVersion} · v${appVersion}`;

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: C.primary, backgroundColor: C.surface, borderRadius: 8 }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ color: C.textMain, fontSize: 14, fontWeight: '700' }}
        text2Style={{ color: C.textMuted, fontSize: 13 }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: C.expenseText, backgroundColor: C.surface, borderRadius: 8 }}
        text1Style={{ color: C.textMain, fontSize: 14, fontWeight: '700' }}
        text2Style={{ color: C.textMuted, fontSize: 13 }}
      />
    ),
  };

  const loadReports = useCallback(async () => {
    if (!session || !user?.id) {
      setReports([]);
      setLoadingReports(false);
      return;
    }

    setLoadingReports(true);

    try {
      const response = await apiFetch('/api/debug-reports?limit=20', undefined, session);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`[DebugReport] list_failed ${serializeDebugError(payload, { userId: user.id })}`);
        setReports([]);
        Toast.show({
          type: 'error',
          text1: t('mobile.debug.submit_error'),
          text2: getRequestErrorMessage(
            typeof payload?.error === 'string' ? new Error(payload.error) : payload,
            t('mobile.debug.submit_error'),
            lang,
          ),
        });
        return;
      }

      setReports(Array.isArray(payload?.reports) ? payload.reports : []);
    } catch (error) {
      console.error(`[DebugReport] list_failed ${serializeDebugError(error, { userId: user.id })}`);
      setReports([]);
      Toast.show({ type: 'error', text1: t('mobile.debug.submit_error'), text2: getRequestErrorMessage(error, t('mobile.debug.submit_error'), lang) });
    } finally {
      setLoadingReports(false);
    }
  }, [lang, session, t, user?.id]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const pickImage = async (source: 'camera' | 'library') => {
    if (images.length >= MAX_IMAGES) return;

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Toast.show({ type: 'error', text1: t('mobile.debug.permission_denied') });
      return;
    }

    const remaining = MAX_IMAGES - images.length;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: IMAGE_MEDIA_TYPES,
            quality: 0.55,
            base64: true,
            allowsEditing: false,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: IMAGE_MEDIA_TYPES,
            quality: 0.55,
            base64: true,
            allowsEditing: false,
            exif: false,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
          });

    if (result.canceled || !result.assets.length) return;

    haptic.selection();
    setImages((prev) =>
      [...prev, ...result.assets.map((a) => ({ uri: a.uri, base64: a.base64 ?? null }))].slice(0, MAX_IMAGES),
    );
  };

  const removeImage = (index: number) => {
    haptic.selection();
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('mobile.debug.error_empty_desc') });
      return;
    }

    setSubmitting(true);
    haptic.selection();

    try {
      if (!user?.id || !session) {
        throw new Error('missing_session');
      }

      const response = await apiFetch('/api/debug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          device_info: deviceInfo,
          app_version: appVersion,
          platform: Platform.OS,
          images: images
            .map((entry) => ({ base64: normalizeBase64(entry.base64) }))
            .filter((entry) => entry.base64),
        }),
      }, session);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw typeof payload?.error === 'string'
          ? Object.assign(new Error(payload.error), { setupRequired: payload?.setupRequired ?? null })
          : new Error('debug_report_insert_failed');
      }

      haptic.success();
      Toast.show({ type: 'success', text1: t('mobile.debug.submit_success') });
      setDescription('');
      setImages([]);
      await loadReports();
    } catch (e: any) {
      haptic.error();
      console.error(
        `[DebugReport] submit_failed ${serializeDebugError(e, {
          userId: user?.id ?? null,
          platform: Platform.OS,
          imagesCount: images.length,
          backend: 'supabase',
        })}`,
      );
      Toast.show({ type: 'error', text1: t('mobile.debug.submit_error'), text2: getRequestErrorMessage(e, t('mobile.debug.submit_error'), lang) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={s.headerCopy}>
          <Text style={[s.headerTitle, { color: C.textMain }]}>{t('mobile.debug.title').toUpperCase()}</Text>
          <Text style={[s.headerSub, { color: C.textMuted }]}>{t('mobile.debug.subtitle').toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {/* @ts-ignore */}
          <X size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Device info ── */}
        <View style={[s.deviceCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.sectionLabel, { color: C.textMuted }]}>{t('mobile.debug.device_section').toUpperCase()}</Text>
          <Text style={[s.deviceText, { color: C.textMain }]}>{deviceInfo}</Text>
        </View>

        {/* ── Description ── */}
        <View style={s.fieldBlock}>
          <Text style={[s.fieldLabel, { color: C.textMuted }]}>{t('mobile.debug.description_label').toUpperCase()}</Text>
          <TextInput
            style={[s.descInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('mobile.debug.description_placeholder')}
            placeholderTextColor={C.textMuted}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />
          <Text style={[s.hint, { color: C.textMuted }]}>{t('mobile.debug.translation_hint')}</Text>
        </View>

        {/* ── Screenshots ── */}
        <View style={s.fieldBlock}>
          <View style={s.imagesLabelRow}>
            <Text style={[s.fieldLabel, { color: C.textMuted }]}>{t('mobile.debug.images_label').toUpperCase()}</Text>
            <Text style={[s.imagesCount, { color: images.length >= MAX_IMAGES ? C.textMain : C.textMuted }]}>
              {images.length}/{MAX_IMAGES}
            </Text>
          </View>

          <View style={s.imagesGrid}>
            {images.map((img, index) => (
              <View key={index} style={[s.imageSlot, { borderColor: C.border }]}>
                <Image source={{ uri: img.uri }} style={s.imageThumb} contentFit="cover" />
                <TouchableOpacity
                  style={[s.imageRemove, { backgroundColor: C.bg }]}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  {/* @ts-ignore */}
                  <X size={9} color={C.textMain} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {images.length < MAX_IMAGES && (
            <View style={s.imageActionRow}>
              <TouchableOpacity
                style={[s.imageActionBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={() => void pickImage('camera')}
                activeOpacity={0.8}
              >
                {/* @ts-ignore */}
                <Camera size={18} color={C.textMain} />
                <Text style={[s.imageActionText, { color: C.textMain }]}>{t('mobile.debug.source_camera').toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.imageActionBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={() => void pickImage('library')}
                activeOpacity={0.8}
              >
                {/* @ts-ignore */}
                <ImageIcon size={18} color={C.textMain} />
                <Text style={[s.imageActionText, { color: C.textMain }]}>{t('mobile.debug.source_library').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: C.primary }, submitting && s.submitBtnDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={C.primaryText} size="small" />
          ) : (
            <Text style={[s.submitBtnText, { color: C.primaryText }]}>{t('mobile.debug.submit').toUpperCase()}</Text>
          )}
        </TouchableOpacity>

        <View style={[s.deviceCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <View style={s.reportsHeader}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>{t('mobile.debug.reports_title').toUpperCase()}</Text>
            <TouchableOpacity onPress={() => void loadReports()} disabled={loadingReports}>
              <Text style={[s.reportsRefresh, { color: C.primary }]}>{t('mobile.debug.reports_refresh').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {loadingReports ? <ActivityIndicator color={C.primary} size="small" /> : null}

          {!loadingReports && reports.length === 0 ? (
            <Text style={[s.hint, { color: C.textMuted }]}>{t('mobile.debug.reports_empty')}</Text>
          ) : null}

          {!loadingReports ? reports.map((report) => (
            <View key={report.id} style={[s.reportRow, { borderTopColor: C.border }]}> 
              <Text style={[s.reportDate, { color: C.textMuted }]}>
                {report.created_at ? new Date(report.created_at).toLocaleString() : report.id}
              </Text>
              <Text style={[s.reportDesc, { color: C.textMain }]} numberOfLines={3}>{report.description}</Text>
              <Text style={[s.reportMeta, { color: C.textMuted }]}>
                {`${t(`mobile.debug.report_${report.status ?? 'open'}`)} · ${report.platform ?? Platform.OS} · v${report.app_version ?? appVersion} · ${report.images_count ?? 0} ${t('mobile.debug.report_images')}`}
              </Text>
            </View>
          )) : null}
        </View>
      </ScrollView>
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
}
