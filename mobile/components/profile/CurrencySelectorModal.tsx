import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Search } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SupportedCurrency } from '../../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '@safed/shared/currency';
import { getCurrencySymbol } from '../../lib/currency';
import { FontSize, FontWeight, Spacing } from '../../constants/theme';

// ── Intl helpers ──────────────────────────────────────────────────────────────

function getCurrencyName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

type CurrencyRow = { code: SupportedCurrency; symbol: string; name: string };

function buildRows(locale: string): CurrencyRow[] {
  return (SUPPORTED_CURRENCIES as SupportedCurrency[]).map((code) => ({
    code,
    symbol: getCurrencySymbol(code),
    name: getCurrencyName(code, locale),
  }));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  currency: SupportedCurrency;
  availableCurrencies: SupportedCurrency[];
  setCurrency: (c: SupportedCurrency) => Promise<void>;
  addCurrency: (c: SupportedCurrency) => Promise<void>;
  removeCurrency: (c: SupportedCurrency) => Promise<void>;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CurrencySelectorModal({
  visible,
  onClose,
  currency,
  availableCurrencies,
  setCurrency,
  removeCurrency,
}: Props) {
  const { theme: C } = useTheme();
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  // Build styles first so they are available to renderItem
  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: C.bg },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.base,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          gap: Spacing.sm,
        },
        title: {
          flex: 1,
          fontSize: FontSize.xs,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
          color: C.textMuted,
        },
        closeBtn: { padding: Spacing.xs },
        searchRow: {
          flexDirection: 'row',
          alignItems: 'center',
          margin: Spacing.base,
          marginBottom: Spacing.sm,
          paddingHorizontal: Spacing.md,
          backgroundColor: C.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: C.border,
          gap: Spacing.sm,
        },
        searchInput: {
          flex: 1,
          paddingVertical: Spacing.md,
          fontSize: FontSize.base,
          color: C.textMain,
        },
        hint: {
          paddingHorizontal: Spacing.base,
          paddingBottom: Spacing.sm,
          fontSize: FontSize.xs,
          color: C.textMuted,
          letterSpacing: 0.5,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.base,
          paddingVertical: Spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: C.border,
          gap: Spacing.sm,
        },
        rowActive: { backgroundColor: `${C.primary}14` },
        rowSymbol: { width: 36, alignItems: 'center' },
        symbolText: {
          fontSize: FontSize.base,
          fontWeight: FontWeight.semibold,
          color: C.textMuted,
        },
        rowBody: { flex: 1 },
        codeText: {
          fontSize: FontSize.sm,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        },
        nameText: { fontSize: FontSize.xs, marginTop: 1, color: C.textMuted },
        rowEnd: { width: 24, alignItems: 'center' },
        primaryBadge: {
          width: 18,
          height: 18,
          borderRadius: 9,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: C.primary,
        },
        activeDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: C.primary,
        },
        emptyText: {
          textAlign: 'center',
          marginTop: Spacing.xxxl,
          color: C.textMuted,
          fontSize: FontSize.sm,
        },
      }),
    [C],
  );

  const allRows = useMemo(() => buildRows(lang ?? 'en'), [lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.symbol.toLowerCase().includes(q),
    );
  }, [allRows, query]);

  // Active currencies pinned at the top when not searching
  const sorted = useMemo(() => {
    if (query.trim()) return filtered;
    const activeSet = new Set(availableCurrencies);
    const active = filtered.filter((r) => activeSet.has(r.code));
    const rest = filtered.filter((r) => !activeSet.has(r.code));
    return [...active, ...rest];
  }, [filtered, availableCurrencies, query]);

  const handlePress = useCallback(
    async (code: SupportedCurrency) => {
      if (code !== currency) {
        await setCurrency(code);
      }
    },
    [currency, setCurrency],
  );

  const handleLongPress = useCallback(
    async (code: SupportedCurrency) => {
      const isActive = availableCurrencies.includes(code);
      const isPrimary = code === currency;
      if (isActive && !isPrimary) {
        await removeCurrency(code);
      }
    },
    [availableCurrencies, currency, removeCurrency],
  );

  const renderItem = useCallback(
    ({ item }: { item: CurrencyRow }) => {
      const isActive = availableCurrencies.includes(item.code);
      const isPrimary = item.code === currency;

      return (
        <TouchableOpacity
          style={[s.row, isPrimary && s.rowActive]}
          onPress={() => void handlePress(item.code)}
          onLongPress={() => void handleLongPress(item.code)}
          activeOpacity={0.75}
        >
          <View style={s.rowSymbol}>
            <Text style={s.symbolText}>{item.symbol}</Text>
          </View>
          <View style={s.rowBody}>
            <Text style={[s.codeText, { color: isPrimary ? C.primary : C.textMain }]}>
              {item.code}
            </Text>
            <Text style={s.nameText} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={s.rowEnd}>
            {isPrimary ? (
              <View style={s.primaryBadge}>
                {/* @ts-ignore */}
                <Check size={10} color={C.primaryText} strokeWidth={3} />
              </View>
            ) : isActive ? (
              <View style={s.activeDot} />
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [s, C, availableCurrencies, currency, handlePress, handleLongPress],
  );

  const keyExtractor = useCallback((item: CurrencyRow) => item.code, []);

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setTimeout(() => searchRef.current?.focus(), 200)}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>{t('profile.card_currency').toUpperCase()}</Text>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* @ts-ignore */}
            <X size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          {/* @ts-ignore */}
          <Search size={16} color={C.textMuted} />
          <TextInput
            ref={searchRef}
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('profile.currency_search_placeholder')}
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
            autoCapitalize="characters"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {/* @ts-ignore */}
              <X size={14} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={s.hint}>{t('profile.currency_hint').toUpperCase()}</Text>

        <FlatList
          data={sorted}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text style={s.emptyText}>{t('profile.currency_not_found')}</Text>
          }
          initialNumToRender={30}
          maxToRenderPerBatch={40}
          windowSize={10}
        />
      </SafeAreaView>
    </Modal>
  );
}
