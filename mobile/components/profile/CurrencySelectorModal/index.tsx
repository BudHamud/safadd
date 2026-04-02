import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Search } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import type { SupportedCurrency } from '../../../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '@safed/shared/currency';
import { getCurrencySymbol } from '../../../lib/currency';
import type { UserPlan } from '../../../types';
import { createStyles } from './styles';

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

type Props = {
  visible: boolean;
  onClose: () => void;
  currency: SupportedCurrency;
  availableCurrencies: SupportedCurrency[];
  setCurrency: (c: SupportedCurrency) => Promise<void>;
  removeCurrency: (c: SupportedCurrency) => Promise<void>;
  plan: UserPlan | null;
};

export function CurrencySelectorModal({
  visible,
  onClose,
  currency,
  availableCurrencies,
  setCurrency,
  removeCurrency,
  plan,
}: Props) {
  const { theme: C } = useTheme();
  const { t, lang } = useLanguage();
  const dialog = useDialog();
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);
  const s = useMemo(() => createStyles(C), [C]);

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

  const sorted = useMemo(() => {
    if (query.trim()) return filtered;
    const activeSet = new Set(availableCurrencies);
    const active = filtered.filter((r) => activeSet.has(r.code));
    const rest = filtered.filter((r) => !activeSet.has(r.code));
    return [...active, ...rest];
  }, [filtered, availableCurrencies, query]);

  const handlePress = useCallback(
    async (code: SupportedCurrency) => {
      try {
        if (code !== currency) {
          await setCurrency(code);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('plan_limit_secondary_currencies')) {
          const limit = plan?.entitlements.maxSecondaryCurrencies ?? 2;
          await dialog.alert(
            t('plan.currency_limit_body', { count: limit }),
            t('plan.currency_limit_title'),
          );
          return;
        }

        await dialog.alert(t('profile.goal_save_error'), t('details.save_error'));
      }
    },
    [currency, dialog, plan?.entitlements.maxSecondaryCurrencies, setCurrency, t],
  );

  const handleLongPress = useCallback(
    async (code: SupportedCurrency) => {
      const isActive = availableCurrencies.includes(code);
      const isPrimary = code === currency;
      if (isActive && !isPrimary) {
        try {
          await removeCurrency(code);
        } catch {
          await dialog.alert(t('profile.goal_save_error'), t('details.save_error'));
        }
      }
    },
    [availableCurrencies, currency, dialog, removeCurrency, t],
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
            <X size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
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
              <X size={14} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={s.hint}>{t('profile.currency_hint').toUpperCase()}</Text>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<Text style={s.emptyText}>{t('profile.currency_not_found')}</Text>}
          initialNumToRender={30}
          maxToRenderPerBatch={40}
          windowSize={10}
        />
      </SafeAreaView>
    </Modal>
  );
}
