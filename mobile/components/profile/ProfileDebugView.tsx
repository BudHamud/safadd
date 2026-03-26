import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Spacing, FontWeight } from '../../constants/theme';
import { haptic } from '../../utils/haptics';
import { supabase } from '../../lib/supabase';

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
};

function normalizeBase64(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/, '');
}

async function base64ToArrayBuffer(base64: string, mimeType: string) {
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  return response.arrayBuffer();
}

function serializeDebugError(error: any, extra: Record<string, unknown> = {}) {
  const payload = {
    message: error?.message ?? String(error),
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    status: error?.status ?? null,
    name: error?.name ?? null,
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
  const { t } = useLanguage();
  const { user } = useAuth();

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
    if (!user?.id) {
      setReports([]);
      setLoadingReports(false);
      return;
    }

    setLoadingReports(true);

    const { data, error } = await supabase
      .from('debug_reports')
      .select('id, description, images_count, platform, app_version, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error(`[DebugReport] list_failed ${serializeDebugError(error, { userId: user.id })}`);
      setReports([]);
      setLoadingReports(false);
      return;
    }

    setReports((data ?? []) as DebugReportItem[]);
    setLoadingReports(false);
  }, [user?.id]);

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
      if (!user?.id) {
        throw new Error('missing_user');
      }

      const { data: report, error: insertError } = await supabase
        .from('debug_reports')
        .insert({
          user_id: user.id,
          description: description.trim(),
          device_info: deviceInfo,
          app_version: appVersion,
          platform: Platform.OS,
          images_count: images.length,
        })
        .select('id')
        .single();

      if (insertError || !report?.id) {
        throw insertError ?? new Error('debug_report_insert_failed');
      }

      for (let index = 0; index < images.length; index += 1) {
        const normalizedBase64 = normalizeBase64(images[index]?.base64 ?? null);
        if (!normalizedBase64) continue;

        const bytes = await base64ToArrayBuffer(normalizedBase64, 'image/jpeg');
        const path = `${user.id}/${report.id}/${index}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('debug-attachments')
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) {
          throw uploadError;
        }
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
      Toast.show({ type: 'error', text1: t('mobile.debug.submit_error'), text2: e?.message ?? undefined });
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
                {`${report.platform ?? Platform.OS} · v${report.app_version ?? appVersion} · ${report.images_count ?? 0} ${t('mobile.debug.report_images')}`}
              </Text>
            </View>
          )) : null}
        </View>
      </ScrollView>
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
}

const R = 2;

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 14, fontWeight: FontWeight.black, letterSpacing: 1.4 },
  headerSub: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  deviceCard: {
    borderWidth: 1,
    borderRadius: R,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  sectionLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.8 },
  deviceText: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 0.3, lineHeight: 18 },
  fieldBlock: { gap: Spacing.xs },
  fieldLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.8 },
  descInput: {
    borderWidth: 1,
    borderRadius: R,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    minHeight: 120,
    lineHeight: 20,
  },
  hint: { fontSize: 10, fontWeight: '500', lineHeight: 15, opacity: 0.85 },
  imagesLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imagesCount: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  imageSlot: {
    width: 72,
    height: 72,
    borderRadius: R,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageThumb: { width: '100%', height: '100%' },
  imageRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  addSlot: {
    width: 72,
    height: 72,
    borderRadius: R,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addSlotText: { fontSize: 6, fontWeight: FontWeight.black, letterSpacing: 0.8, textAlign: 'center' },
  imageActionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: R,
    paddingVertical: 13,
    paddingHorizontal: Spacing.sm,
  },
  imageActionText: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 1 },
  sourcePicker: {
    borderWidth: 1,
    borderRadius: R,
    padding: Spacing.sm,
    gap: Spacing.xs,
    minWidth: 140,
  },
  sourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: R,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  sourceBtnText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  sourceCancelText: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1, textAlign: 'center', paddingVertical: 2 },
  submitBtn: {
    borderRadius: R,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 1.5 },
  reportsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  reportsRefresh: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  reportRow: { borderTopWidth: 1, paddingTop: Spacing.sm, gap: 4 },
  reportDate: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  reportDesc: { fontSize: 12, fontWeight: FontWeight.black, lineHeight: 18 },
  reportMeta: { fontSize: 10, fontWeight: '600', lineHeight: 15 },
});
