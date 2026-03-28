import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Calendar, Camera, ChevronLeft, ChevronRight, CreditCard, Image as ImageIcon, Receipt, Wallet, X } from 'lucide-react-native';
import { Transaction, Category, TransactionType } from '../../types';
import { CategoryPicker } from './CategoryPicker';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { haptic } from '../../utils/haptics';
import { buildStoredAmounts, getCurrencySymbol } from '../../lib/currency';
import { useDialog } from '../../context/DialogContext';
import { ModalSafeAreaView } from '../layout/ModalSafeAreaView';
import type { SupportedCurrency } from '../../context/AuthContext';

type Props = {
  tx: Transaction | null;
  initialData?: Partial<Transaction> | null;
  categories: Category[];
  userId: string;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<boolean | void>;
  onClose: () => void;
};

type GoalType = 'unico' | 'mensual' | 'periodo';
type ScanResult = { confidence: number; desc: string; remaining: number | null } | null;
type DateMode = 'calendar' | 'manual';
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

const GOAL_OPTIONS: { value: GoalType; labelKey: string }[] = [
  { value: 'unico', labelKey: 'order.goal_single' },
  { value: 'mensual', labelKey: 'order.goal_monthly' },
  { value: 'periodo', labelKey: 'order.goal_period' },
];
const PERIOD_OPTIONS = [3, 6, 12, 24] as const;

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const normalized = value.trim().replace(/\//g, '-');
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days = [] as { key: string; value: Date; outside: boolean }[];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstWeekday + 1;
    let value: Date;
    let outside = false;

    if (dayOffset <= 0) {
      value = new Date(year, month - 1, daysInPrevMonth + dayOffset);
      outside = true;
    } else if (dayOffset > daysInMonth) {
      value = new Date(year, month + 1, dayOffset - daysInMonth);
      outside = true;
    } else {
      value = new Date(year, month, dayOffset);
    }

    days.push({ key: `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}-${index}`, value, outside });
  }

  return days;
}

function stripOriginalCurrencyNote(value: string) {
  return value
    .replace(/\n?\n?\*?\((?:Originally loaded as|Cargado originalmente como)[^)]+\)\*?/gi, '')
    .trim();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function inferImageMimeType(value?: string | null) {
  const normalized = value?.toLowerCase().trim();

  if (!normalized) return null;
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized.startsWith('image/')) return normalized;
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg') || normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
  if (normalized.endsWith('.png') || normalized === 'png') return 'image/png';
  if (normalized.endsWith('.webp') || normalized === 'webp') return 'image/webp';
  if (normalized.endsWith('.heic') || normalized === 'heic') return 'image/heic';
  if (normalized.endsWith('.heif') || normalized === 'heif') return 'image/heif';

  return null;
}

function chunkBytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof globalThis.btoa !== 'function') {
    throw new Error('scan_file_read_failed');
  }

  return globalThis.btoa(binary);
}

async function resolveScanPayload(asset: ImagePicker.ImagePickerAsset) {
  const fallbackMimeType = inferImageMimeType(asset.mimeType) ?? inferImageMimeType(asset.fileName) ?? inferImageMimeType(asset.uri) ?? 'image/jpeg';

  if (asset.base64) {
    return {
      imageBase64: asset.base64,
      mimeType: fallbackMimeType,
    };
  }

  const response = await fetch(asset.uri);
  const buffer = await response.arrayBuffer();

  if (!buffer.byteLength) {
    throw new Error('scan_file_read_failed');
  }

  return {
    imageBase64: chunkBytesToBase64(new Uint8Array(buffer)),
    mimeType: fallbackMimeType,
  };
}

async function resolveActiveSupabaseSession(preferredSession: typeof supabase.auth extends { getSession: any } ? any : never) {
  const { data: { session: storedSession } } = await supabase.auth.getSession();
  const baseSession = preferredSession ?? storedSession ?? null;

  if (baseSession?.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: baseSession.refresh_token });
    if (!error && data.session?.access_token) {
      return data.session;
    }
  }

  if (baseSession?.access_token) {
    return baseSession;
  }

  const { data: { session: latestSession } } = await supabase.auth.getSession();
  return latestSession ?? null;
}

function resolveScannedCategory(rawTag: string, categories: Category[]) {
  const scanTag = normalizeText(rawTag);
  const aliases: Record<string, string[]> = {
    alimentacion: ['alimentacion', 'comida', 'food'],
    transporte: ['transporte', 'transport', 'movilidad'],
    salud: ['salud', 'health'],
    entretenimiento: ['entretenimiento', 'ocio', 'fun'],
    viajes: ['viajes', 'travel'],
    suscripcion: ['suscripcion', 'subscription'],
    servicios: ['servicios', 'service'],
    educacion: ['educacion', 'education'],
    ropa: ['ropa', 'clothes'],
    hogar: ['hogar', 'home'],
    tecnologia: ['tecnologia', 'technology', 'tech'],
    otro: ['otro', 'otros', 'other'],
  };

  const candidates = aliases[scanTag] ?? [scanTag];
  return categories.find((category) => candidates.some((candidate) => normalizeText(category.name).includes(candidate)));
}

export function TransactionEditView({ tx, initialData, categories, userId, onSave, onClose }: Props) {
  const { t, lang } = useLanguage();
  const { currency, availableCurrencies, session } = useAuth();
  const { theme: C } = useTheme();
  const dialog = useDialog();
  const seed = tx ?? initialData ?? null;
  const isNew = !tx;
  const today = new Date().toISOString().split('T')[0];

  const [type, setType] = useState<TransactionType>(seed?.type ?? 'expense');
  const [goalType, setGoalType] = useState<GoalType>((seed?.goalType as GoalType) ?? 'unico');
  const [inputCurrency, setInputCurrency] = useState<SupportedCurrency>(currency);
  const [amount, setAmount] = useState(seed?.amount != null ? String(seed.amount) : '');
  const [description, setDescription] = useState(seed?.desc ?? '');
  const [details, setDetails] = useState(seed?.details ?? '');
  const [date, setDate] = useState(seed?.date ?? today);
  const [dateMode, setDateMode] = useState<DateMode>('calendar');
  const [tag, setTag] = useState<string | null>(seed?.tag ?? null);
  const [icon, setIcon] = useState<string>(seed?.icon ?? '💳');
  const [paymentMethod, setPaymentMethod] = useState(seed?.paymentMethod ?? '');
  const [cardDigits, setCardDigits] = useState(seed?.cardDigits ?? '');
  const [excludeFromBudget, setExcludeFromBudget] = useState<boolean>(seed?.excludeFromBudget ?? false);
  const [periodicity, setPeriodicity] = useState<number>(seed?.periodicity ?? 12);
  const [customPeriodicity, setCustomPeriodicity] = useState<string>(() => {
    const initial = seed?.periodicity;
    return initial && !PERIOD_OPTIONS.includes(initial as (typeof PERIOD_OPTIONS)[number]) ? String(initial) : '';
  });
  const [usesCustomPeriodicity, setUsesCustomPeriodicity] = useState<boolean>(() => {
    const initial = seed?.periodicity;
    return Boolean(initial && !PERIOD_OPTIONS.includes(initial as (typeof PERIOD_OPTIONS)[number]));
  });
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scanPreviewUri, setScanPreviewUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parsedSeedDate = parseDateInput(seed?.date ?? today) ?? new Date();
    return new Date(parsedSeedDate.getFullYear(), parsedSeedDate.getMonth(), 1);
  });

  const selectedCat = categories.find((category) => category.name === tag);
  const canExclude = type === 'expense';
  const pickerText = selectedCat
    ? `${selectedCat.icon} ${selectedCat.name}`
    : tag
      ? `${icon} ${tag}`
      : `+ ${t('mobile.category.add')}`;
  const cameraLabel = lang === 'en' ? 'Take photo' : 'Tomar foto';
  const galleryLabel = lang === 'en' ? 'Gallery' : 'Galeria';
  const parsedDate = useMemo(() => parseDateInput(date), [date]);
  const weekdayLabels = useMemo(
    () => (lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D']),
    [lang],
  );
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const monthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', { month: 'long', year: 'numeric' }),
    [calendarMonth, lang],
  );
  const currencyChoices = availableCurrencies.length > 0 ? availableCurrencies : [currency];
  const titlePromptKey = type === 'income' ? 'mobile.order.income_title_prompt' : 'mobile.order.expense_title_prompt';
  const formattedDateLabel = useMemo(() => {
    const parsed = parseDateInput(date);
    return parsed
      ? parsed.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
      : date;
  }, [date, lang]);
  const resolvedPeriodicity = usesCustomPeriodicity ? Number(customPeriodicity) : periodicity;

  useEffect(() => {
    const parsed = parseDateInput(date);
    if (parsed) {
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [date]);

  useEffect(() => {
    if (!currencyChoices.includes(inputCurrency)) {
      setInputCurrency(currencyChoices[0]);
    }
  }, [currencyChoices, inputCurrency]);

  useEffect(() => {
    if (type === 'income') {
      setPaymentMethod('');
      setCardDigits('');
    }
  }, [type]);

  useEffect(() => {
    let active = true;

    const recoverPendingPickerResult = async () => {
      try {
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (!active || !pendingResult || 'code' in pendingResult || pendingResult.canceled || !pendingResult.assets?.[0]) {
          return;
        }

        await analyzeAsset(pendingResult.assets[0]);
      } catch {
        if (!active) return;
        Toast.show({ type: 'error', text1: t('order.scan_read_error_prefix'), text2: t('order.scan_error') });
      }
    };

    void recoverPendingPickerResult();

    return () => {
      active = false;
    };
  }, [session, t]);

  const applyScanPayload = (payload: { amount?: number; desc?: string; details?: string; date?: string; tag?: string }) => {
    if (typeof payload.amount === 'number' && !Number.isNaN(payload.amount)) setAmount(String(payload.amount));
    if (payload.desc) setDescription(payload.desc);
    if (payload.details) setDetails(payload.details);
    if (payload.date) setDate(payload.date);
    if (payload.tag) {
      const matched = resolveScannedCategory(payload.tag, categories);
      if (matched) {
        setTag(matched.name);
        setIcon(matched.icon);
      }
    }
  };

  const analyzeAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsScanning(true);
    setScanLimitReached(false);
    setScanPreviewUri(asset.uri);
    setScanResult(null);

    try {
      const activeSession = await resolveActiveSupabaseSession(session);
      if (!activeSession?.access_token) {
        throw new Error(lang === 'en' ? 'Sign in again to scan receipts.' : 'Volvé a iniciar sesión para escanear tickets.');
      }

      const { imageBase64, mimeType } = await resolveScanPayload(asset);
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      };

      let response = await apiFetch('/api/scan-ticket', requestOptions, activeSession);

      if (response.status === 401) {
        const refreshedSession = await resolveActiveSupabaseSession(activeSession);
        if (!refreshedSession?.access_token) {
          throw new Error(lang === 'en' ? 'Sign in again to scan receipts.' : 'Volvé a iniciar sesión para escanear tickets.');
        }

        response = await apiFetch('/api/scan-ticket', requestOptions, refreshedSession);
      }

      const payload = await response.json();
      if (!response.ok) {
        if (payload?.isLimited) {
          setScanLimitReached(true);
        }
        // Use localized message instead of raw API error (which may be in a different language)
        throw new Error(t('order.scan_error'));
      }

      applyScanPayload(payload);
      setScanResult({ confidence: payload.confidence ?? 70, desc: payload.desc ?? '', remaining: payload.remaining ?? null });
      haptic.success();
    } catch (error) {
      const message = error instanceof Error && error.message === 'scan_file_read_failed'
        ? t('order.scan_error')
        : error instanceof Error
          ? error.message
          : t('order.scan_error');
      Toast.show({ type: 'error', text1: t('order.scan_read_error_prefix'), text2: message });
      if (!scanPreviewUri) setScanPreviewUri(null);
    } finally {
      setIsScanning(false);
    }
  };

  const pickReceipt = async (source: 'camera' | 'library') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        await dialog.alert(
          lang === 'en' ? 'Allow image access to scan receipts.' : 'Permití acceso a imágenes para escanear tickets.',
          lang === 'en' ? 'Permission required' : 'Permiso requerido'
        );
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: IMAGE_MEDIA_TYPES, quality: 0.45, base64: true, allowsEditing: false, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: IMAGE_MEDIA_TYPES, quality: 0.45, base64: true, allowsEditing: false, exif: false });

      if (result.canceled || !result.assets[0]) return;
      await analyzeAsset(result.assets[0]);
    } catch {
      Toast.show({ type: 'error', text1: t('order.scan_read_error_prefix'), text2: t('order.scan_error') });
    }
  };

  const handleSave = async () => {
    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('field.amount'), text2: t('order.amount_required') });
      return;
    }
    if (!description.trim()) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('field.description'), text2: t('mobile.order.description_required') });
      return;
    }
    if (!tag) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('field.category'), text2: t('order.select_category_required') });
      return;
    }
    if (!parseDateInput(date)) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('field.date'), text2: 'YYYY-MM-DD' });
      return;
    }
    if (goalType === 'periodo') {
      if (!Number.isInteger(resolvedPeriodicity) || resolvedPeriodicity <= 0) {
        haptic.error();
        Toast.show({
          type: 'error',
          text1: t('order.period_frequency'),
          text2: t('mobile.order.custom_periodicity_required'),
        });
        return;
      }
    }

    setSaving(true);
    try {
      const numericAmount = Number(amount);
      const storedAmounts = await buildStoredAmounts(numericAmount, inputCurrency, session);
      const cleanedDetails = stripOriginalCurrencyNote(details.trim());
      const originalAmountNote = inputCurrency !== 'ILS'
        ? t('order.originally_loaded_as', {
            currency: inputCurrency,
            amount: numericAmount.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR', { maximumFractionDigits: 2 }),
          } as never)
        : '';
      const nextDetails = originalAmountNote
        ? `${cleanedDetails ? `${cleanedDetails}\n\n` : ''}*${originalAmountNote}*`
        : cleanedDetails || null;

      const result = await onSave({
        userId,
        type,
        amount: storedAmounts.amount,
        amountUSD: storedAmounts.amountUSD,
        amountARS: storedAmounts.amountARS,
        amountILS: storedAmounts.amountILS,
        amountEUR: storedAmounts.amountEUR,
        desc: description.trim(),
        date,
        tag,
        icon,
        paymentMethod: type === 'expense' ? paymentMethod || null : null,
        periodicity: goalType === 'periodo' ? resolvedPeriodicity : null,
        excludeFromBudget: canExclude ? excludeFromBudget : false,
        isCancelled: tx?.isCancelled ?? false,
        goalType,
        details: nextDetails,
        cardDigits: type === 'expense' && paymentMethod === 'tarjeta' ? cardDigits || null : null,
      });
      if (result === false) {
        haptic.error();
        Toast.show({ type: 'error', text1: t('details.save_error'), text2: t('details.recalculate_save_error') });
        return;
      }
      haptic.success();
      onClose();
    } catch {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: t('details.recalculate_save_error') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}> 
          <Text style={[styles.headerTitle, { color: C.textMain }]}>
            {isNew ? t('order.new_title').toUpperCase() : t('order.edit_title').toUpperCase()}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.typeToggle, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: type === 'expense' ? C.accent : 'transparent' }]}
              onPress={() => {
                haptic.selection();
                setType('expense');
              }}
            >
              <Text style={[styles.typeBtnText, { color: type === 'expense' ? C.accentText : C.textMuted }]}>
                ↓ {t('type.expense').toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: type === 'income' ? C.primary : 'transparent' }]}
              onPress={() => {
                haptic.selection();
                setType('income');
              }}
            >
              <Text style={[styles.typeBtnText, { color: type === 'income' ? C.primaryText : C.textMuted }]}>
                ↑ {t('type.income').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.goalToggle, { backgroundColor: C.surface, borderColor: C.border }]}>
            {GOAL_OPTIONS.map((option) => {
              const active = goalType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.goalBtn,
                    {
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.surfaceHover : C.surface,
                    },
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setGoalType(option.value);
                  }}
                >
                  <Text style={[styles.goalBtnText, { color: active ? C.textMain : C.textMuted }]}>{t(option.labelKey as never)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {goalType === 'periodo' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textMuted }]}>{t('order.period_frequency').toUpperCase()}</Text>
              <View style={styles.periodRow}>
                {PERIOD_OPTIONS.map((value) => {
                  const active = periodicity === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.periodBtn, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.surfaceHover : C.surface }]}
                      onPress={() => {
                        haptic.selection();
                        setUsesCustomPeriodicity(false);
                        setPeriodicity(value);
                      }}
                    >
                      <Text style={[styles.periodBtnText, { color: active ? C.textMain : C.textMuted }]}>{value}M</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.periodBtn,
                    {
                      borderColor: usesCustomPeriodicity ? C.primary : C.border,
                      backgroundColor: usesCustomPeriodicity ? C.surfaceHover : C.surface,
                    },
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setUsesCustomPeriodicity(true);
                    if (!customPeriodicity.trim()) {
                      setCustomPeriodicity(String(periodicity));
                    }
                  }}
                >
                  <Text style={[styles.periodBtnText, { color: usesCustomPeriodicity ? C.textMain : C.textMuted }]}>
                    {t('mobile.order.custom_months').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
              {usesCustomPeriodicity ? (
                <TextInput
                  style={[styles.input, styles.customPeriodInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
                  value={customPeriodicity}
                  onChangeText={(value) => {
                    const sanitized = value.replace(/\D/g, '').slice(0, 3);
                    setCustomPeriodicity(sanitized);
                  }}
                  placeholder={t('mobile.order.custom_periodicity_placeholder')}
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              ) : null}
            </View>
          ) : null}

          <View style={[styles.ticketBlock, { backgroundColor: C.surface, borderColor: scanLimitReached ? C.accent : C.border }]}> 
            <View style={styles.ticketHeader}>
              <View style={styles.ticketTitleRow}>
                <Receipt size={16} color={scanLimitReached ? C.expenseText : C.primary} />
                <Text style={[styles.ticketTitle, { color: C.textMain }]}>{t('order.scan_ticket_invoice')}</Text>
              </View>
              {scanResult ? <Text style={[styles.ticketConfidence, { color: C.textMuted }]}>{scanResult.confidence}%</Text> : null}
            </View>

            <Text style={[styles.ticketHint, { color: scanLimitReached ? C.expenseText : C.textMuted }]}>
              {scanLimitReached ? t('order.daily_limit_help') : t('order.scan_ticket_invoice_help')}
            </Text>

            <View style={styles.ticketActions}>
              <TouchableOpacity
                style={[styles.ticketActionBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                onPress={() => void pickReceipt('camera')}
                disabled={isScanning}
              >
                <Camera size={16} color={C.textMain} />
                <Text style={[styles.ticketActionText, { color: C.textMain }]}>{cameraLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ticketActionBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                onPress={() => void pickReceipt('library')}
                disabled={isScanning}
              >
                <ImageIcon size={16} color={C.textMain} />
                <Text style={[styles.ticketActionText, { color: C.textMain }]}>{galleryLabel}</Text>
              </TouchableOpacity>
            </View>

            {scanPreviewUri ? (
              <View style={[styles.ticketPreview, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}> 
                <Image source={{ uri: scanPreviewUri }} style={styles.ticketPreviewImage} contentFit="cover" />
                <View style={styles.ticketPreviewCopy}>
                  <Text style={[styles.ticketPreviewTitle, { color: isScanning ? C.primary : C.textMain }]}>
                    {isScanning ? t('order.scanning_ticket') : scanResult ? t('order.ticket_scanned') : t('order.change_image')}
                  </Text>
                  <Text style={[styles.ticketPreviewMeta, { color: C.textMuted }]}>
                    {scanResult?.desc || t('order.scanning_ticket_help')}
                  </Text>
                  {scanResult?.remaining !== null && scanResult ? (
                    <Text style={[styles.ticketRemaining, { color: C.textMuted }]}>
                      {t('order.remaining_scans_today', { count: scanResult.remaining })}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>{t('order.amount_label').toUpperCase()}</Text>
            <View style={[styles.amountRow, { borderColor: C.border, backgroundColor: C.surface }]}>
              <TouchableOpacity
                style={[styles.currencyPill, styles.currencyPillButton, { borderRightColor: C.border, backgroundColor: C.surfaceAlt }]}
                onPress={() => setShowCurrencyPicker(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.currencyCode, { color: C.textMuted }]}>{inputCurrency}</Text>
                <Text style={[styles.currencySymbol, { color: C.textMain }]}>{getCurrencySymbol(inputCurrency)}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.amountInput, { backgroundColor: C.surface, color: C.textMain }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                autoFocus={isNew}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>{t(titlePromptKey as never).toUpperCase()}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t(titlePromptKey as never)}
              placeholderTextColor={C.textMuted}
            />
          </View>

          {type === 'expense' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textMuted }]}>{t('field.payment_method').toUpperCase()}</Text>
              <View style={styles.paymentRow}>
                <TouchableOpacity
                  style={[styles.paymentBtn, { borderColor: paymentMethod === 'billete' ? C.primary : C.border, backgroundColor: paymentMethod === 'billete' ? C.surfaceHover : C.surface }]}
                  onPress={() => {
                    haptic.selection();
                    setPaymentMethod(paymentMethod === 'billete' ? '' : 'billete');
                    setCardDigits('');
                  }}
                >
                  <Wallet size={16} color={paymentMethod === 'billete' ? C.primary : C.textMuted} />
                  <Text style={[styles.paymentBtnText, { color: paymentMethod === 'billete' ? C.textMain : C.textMuted }]}>{t('order.payment_cash')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentBtn, { borderColor: paymentMethod === 'tarjeta' ? C.primary : C.border, backgroundColor: paymentMethod === 'tarjeta' ? C.surfaceHover : C.surface }]}
                  onPress={() => {
                    haptic.selection();
                    setPaymentMethod(paymentMethod === 'tarjeta' ? '' : 'tarjeta');
                  }}
                >
                  <CreditCard size={16} color={paymentMethod === 'tarjeta' ? C.primary : C.textMuted} />
                  <Text style={[styles.paymentBtnText, { color: paymentMethod === 'tarjeta' ? C.textMain : C.textMuted }]}>{t('order.payment_card')}</Text>
                </TouchableOpacity>
              </View>
              {paymentMethod === 'tarjeta' ? (
                <View style={[styles.cardDigitsWrap, { backgroundColor: C.surface, borderColor: C.border }]}> 
                  <View style={styles.cardDigitsMask}>
                    <Text style={[styles.cardDigitsMaskText, { color: C.textMuted }]}>•••• •••• ••••</Text>
                  </View>
                  <TextInput
                    style={[styles.cardDigitsInput, { color: C.textMain }]}
                    value={cardDigits}
                    onChangeText={(value) => setCardDigits(value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>{t('mobile.category.add').toUpperCase()}</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => setShowCatPicker(true)}>
              <Text style={[styles.selectorText, { color: selectedCat ? C.textMain : C.textMuted }]}>{pickerText}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>{t('field.date').toUpperCase()}</Text>
            <TouchableOpacity
              style={[styles.selectorBtn, styles.metaSelectorBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.metaSelectorLabel, { color: C.textMuted }]}>{dateMode === 'calendar' ? t('mobile.order.date_calendar').toUpperCase() : t('mobile.order.date_manual').toUpperCase()}</Text>
              <Text style={[styles.metaSelectorValue, { color: C.textMain }]}>{formattedDateLabel}</Text>
            </TouchableOpacity>
          </View>

          {canExclude ? (
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setExcludeFromBudget((value) => !value)} activeOpacity={0.8}>
              <View style={[styles.checkboxBox, { borderColor: excludeFromBudget ? C.primary : C.border, backgroundColor: excludeFromBudget ? C.primary : 'transparent' }]}>
                {excludeFromBudget ? <Text style={[styles.checkboxTick, { color: C.primaryText }]}>✓</Text> : null}
              </View>
              <Text style={[styles.checkboxLabel, { color: C.textMain }]}>{t('order.exclude_from_goal').toUpperCase()}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>{t('order.description_optional').toUpperCase()}</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
              value={details}
              onChangeText={setDetails}
              placeholder={t('order.description_placeholder')}
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity style={[styles.footerBtnSecondary, { borderColor: C.border, backgroundColor: C.surface }]} onPress={onClose}>
              <Text style={[styles.footerBtnSecondaryText, { color: C.textMain }]}>{t('btn.cancel').toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtnPrimary, { borderColor: C.primary, backgroundColor: C.primary }, saving && styles.footerBtnDisabled]} onPress={() => void handleSave()} disabled={saving}>
              <Text style={[styles.footerBtnPrimaryText, { color: C.primaryText }]}>{saving ? t('details.saving').toUpperCase() : t('btn.save').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {showCatPicker ? (
          <CategoryPicker
            categories={categories}
            selectedTag={tag}
            type={type}
            onSelect={(name, nextIcon) => {
              if (name) {
                setTag(name);
                setIcon(nextIcon ?? icon);
              } else {
                setTag(null);
              }
              setShowCatPicker(false);
            }}
            onClose={() => setShowCatPicker(false)}
          />
        ) : null}

        <Modal
          transparent
          visible={showCurrencyPicker}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setShowCurrencyPicker(false)}
        >
          <ModalSafeAreaView style={[styles.sheetOverlay, styles.sheetViewport, { backgroundColor: 'rgba(0,0,0,0.72)' }]}> 
            <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)} />
            <View style={[styles.sheetCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.textMain }]}>{t('profile.card_currency').toUpperCase()}</Text>
                <Text style={[styles.sheetSubtitle, { color: C.textMuted }]}>{t('profile.currency_sub').toUpperCase()}</Text>
              </View>
              {currencyChoices.map((option) => {
                const selected = option === inputCurrency;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sheetOption, { borderColor: C.border, backgroundColor: selected ? C.surfaceHover : C.surfaceAlt }]}
                    onPress={() => {
                      haptic.selection();
                      setInputCurrency(option);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.sheetOptionLabel, { color: selected ? C.textMain : C.textMuted }]}>{option}</Text>
                      <Text style={[styles.sheetOptionValue, { color: C.textMain }]}>{getCurrencySymbol(option)} {option}</Text>
                    </View>
                    <View style={[styles.sheetOptionRadio, { borderColor: selected ? C.primary : C.border, backgroundColor: selected ? C.primary : 'transparent' }]}> 
                      {selected ? <View style={[styles.sheetOptionDot, { backgroundColor: C.primaryText }]} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ModalSafeAreaView>
        </Modal>

        <Modal
          transparent
          visible={showDatePicker}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setShowDatePicker(false)}
        >
          <ModalSafeAreaView style={[styles.sheetOverlay, styles.sheetViewport, { backgroundColor: 'rgba(0,0,0,0.72)' }]}> 
            <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
            <View style={[styles.dateSheetCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.textMain }]}>{t('field.date').toUpperCase()}</Text>
                <Text style={[styles.sheetSubtitle, { color: C.textMuted }]}>{formattedDateLabel}</Text>
              </View>

              <View style={[styles.dateModeToggle, { backgroundColor: C.surface, borderColor: C.border }]}> 
                <TouchableOpacity
                  style={[styles.dateModeBtn, { borderColor: dateMode === 'calendar' ? C.primary : 'transparent', backgroundColor: dateMode === 'calendar' ? C.surfaceHover : 'transparent' }]}
                  onPress={() => setDateMode('calendar')}
                >
                  <Calendar size={14} color={dateMode === 'calendar' ? C.primary : C.textMuted} />
                  <Text style={[styles.dateModeText, { color: dateMode === 'calendar' ? C.textMain : C.textMuted }]}>{t('mobile.order.date_calendar')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateModeBtn, { borderColor: dateMode === 'manual' ? C.primary : 'transparent', backgroundColor: dateMode === 'manual' ? C.surfaceHover : 'transparent' }]}
                  onPress={() => setDateMode('manual')}
                >
                  <Text style={[styles.dateModeText, { color: dateMode === 'manual' ? C.textMain : C.textMuted }]}>{t('mobile.order.date_manual')}</Text>
                </TouchableOpacity>
              </View>

              {dateMode === 'manual' ? (
                <TextInput
                  style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              ) : (
                <View style={[styles.calendarCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={[styles.calendarNavBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                      onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    >
                      <ChevronLeft size={14} color={C.textMain} />
                    </TouchableOpacity>
                    <Text style={[styles.calendarTitle, { color: C.textMain }]}>{monthLabel}</Text>
                    <TouchableOpacity
                      style={[styles.calendarNavBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                      onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    >
                      <ChevronRight size={14} color={C.textMain} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarWeekdays}>
                    {weekdayLabels.map((label, index) => (
                      <Text key={`${label}-${index}`} style={[styles.calendarWeekday, { color: C.textMuted }]}>{label}</Text>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {calendarDays.map((item) => {
                      const itemValue = formatDateValue(item.value);
                      const selected = itemValue === (parsedDate ? formatDateValue(parsedDate) : date);
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.calendarDay,
                            {
                              borderColor: selected ? C.primary : 'transparent',
                              backgroundColor: selected ? C.surfaceHover : 'transparent',
                              opacity: item.outside ? 0.35 : 1,
                            },
                          ]}
                          onPress={() => {
                            haptic.selection();
                            setDate(itemValue);
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={[styles.calendarDayText, { color: selected ? C.textMain : C.textMuted }]}>{item.value.getDate()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.calendarSelectedText, { color: C.textMuted }]}>{date}</Text>
                </View>
              )}

              {dateMode === 'manual' ? (
                <TouchableOpacity
                  style={[styles.sheetConfirmBtn, { backgroundColor: C.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.sheetConfirmText, { color: C.primaryText }]}>{t('btn.save').toUpperCase()}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ModalSafeAreaView>
        </Modal>
      </SafeAreaView>
      <Toast
        config={{
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
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 16 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject },
  modalViewport: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 455, maxHeight: '92%', minHeight: 420, borderWidth: 1 },
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 14, fontWeight: FontWeight.black, letterSpacing: 1.4 },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingVertical: 20, gap: Spacing.md, paddingBottom: 22 },
  typeToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 2, padding: 3, gap: 3 },
  typeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  typeBtnText: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  goalToggle: { flexDirection: 'row', gap: 3, borderWidth: 1, borderRadius: 2, padding: 3 },
  goalBtn: { flex: 1, borderWidth: 1, borderColor: 'transparent', borderRadius: 2, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  goalBtnText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.45 },
  customPeriodInput: { marginTop: Spacing.sm },
  ticketBlock: { borderWidth: 1, borderRadius: 2, padding: Spacing.base, gap: Spacing.sm },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  ticketConfidence: { fontSize: FontSize.xs, fontWeight: FontWeight.black },
  ticketHint: { fontSize: FontSize.xs, lineHeight: 18 },
  ticketActions: { flexDirection: 'row', gap: Spacing.sm },
  ticketActionBtn: { flex: 1, borderWidth: 1, borderRadius: 2, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ticketActionText: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.3 },
  ticketPreview: { borderWidth: 1, borderRadius: 2, padding: Spacing.sm, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  ticketPreviewImage: { width: 56, height: 56, borderRadius: 2 },
  ticketPreviewCopy: { flex: 1, gap: 2 },
  ticketPreviewTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  ticketPreviewMeta: { fontSize: FontSize.xs, lineHeight: 16 },
  ticketRemaining: { fontSize: 10, fontWeight: FontWeight.bold, marginTop: 2 },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 1 },
  amountRow: { flexDirection: 'row', gap: 0, alignItems: 'stretch', borderWidth: 1, borderRadius: 2, overflow: 'hidden', minHeight: 52 },
  currencyPill: { width: 80, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  currencyPillButton: { paddingVertical: 4 },
  currencyCode: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1 },
  currencySymbol: { fontSize: FontSize.base, fontWeight: FontWeight.black },
  input: { fontSize: FontSize.base, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: 2, borderWidth: 1 },
  amountInput: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.black, textAlign: 'center', borderWidth: 0, borderRadius: 0, paddingVertical: 12 },
  paymentRow: { flexDirection: 'row', gap: Spacing.sm },
  paymentBtn: { flex: 1, borderWidth: 1, borderRadius: 2, minHeight: 44, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  paymentBtnText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  cardDigitsWrap: { borderWidth: 1, borderRadius: 2, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardDigitsMask: { flex: 1 },
  cardDigitsMaskText: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 2.2 },
  cardDigitsInput: { width: 54, fontSize: 16, fontWeight: FontWeight.black, letterSpacing: 2, textAlign: 'right', paddingVertical: 0 },
  selectorBtn: { borderWidth: 1, borderRadius: 2, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  selectorText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  metaSelectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  metaSelectorLabel: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1 },
  metaSelectorValue: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 0.3 },
  periodRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 2 },
  periodBtnText: { fontSize: 10, fontWeight: FontWeight.black },
  dateModeToggle: { flexDirection: 'row', gap: 3, borderWidth: 1, borderRadius: 2, padding: 3 },
  dateModeBtn: { flex: 1, minHeight: 34, borderWidth: 1, borderRadius: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dateModeText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  calendarCard: { borderWidth: 1, borderRadius: 2, padding: 12, gap: 10 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 0.8, textTransform: 'capitalize' },
  calendarWeekdays: { flexDirection: 'row' },
  calendarWeekday: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  calendarDay: { width: '14.2857%', alignItems: 'center', justifyContent: 'center', minHeight: 34, borderWidth: 1, borderRadius: 2 },
  calendarDayText: { fontSize: 12, fontWeight: FontWeight.bold },
  calendarSelectedText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8, textAlign: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  checkboxBox: { width: 16, height: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxTick: { fontSize: 10, fontWeight: FontWeight.black, lineHeight: 12 },
  checkboxLabel: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 0.6, flex: 1 },
  notesInput: { minHeight: 110 },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetViewport: { width: '100%' },
  sheetCard: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  dateSheetCard: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    padding: Spacing.base,
    gap: Spacing.sm,
    maxHeight: '82%',
  },
  sheetHeader: { gap: 4, marginBottom: Spacing.xs },
  sheetTitle: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  sheetSubtitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  sheetOption: {
    borderWidth: 1,
    borderRadius: 2,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionLabel: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  sheetOptionValue: { fontSize: 16, fontWeight: FontWeight.black, marginTop: 2 },
  sheetOptionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionDot: { width: 8, height: 8, borderRadius: 4 },
  sheetConfirmBtn: { borderRadius: 2, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  sheetConfirmText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  footerRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  footerBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 2, paddingVertical: Spacing.md, alignItems: 'center' },
  footerBtnSecondaryText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  footerBtnPrimary: { flex: 1, borderRadius: 2, paddingVertical: Spacing.md, alignItems: 'center' },
  footerBtnPrimaryText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  footerBtnDisabled: { opacity: 0.6 },
});
