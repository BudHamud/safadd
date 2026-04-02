import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAmount, formatShortDate } from '../../../lib/locale';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

type Props = {
  recentTxs: Transaction[];
  sym: string;
  onPress: (tx: Transaction) => void;
  onSeeAll?: () => void;
};

function fmt(n: number, sym: string, lang: 'es' | 'en') {
  return `${sym}${formatAmount(n, lang)}`;
}

function TxRow({ tx, sym, onPress, lang, fallbackCategory }: { tx: Transaction; sym: string; onPress: () => void; lang: 'es' | 'en'; fallbackCategory: string }) {
  const { theme: C } = useTheme();
  const isExpense = tx.type === 'expense';
  const icon = tx.icon || '💳';
  const amtColor = isExpense ? C.accent : C.primary;
  const meta = `${tx.tag || fallbackCategory} · ${formatShortDate(tx.date, lang)}`;

  return (
    <TouchableOpacity style={[styles.txRow, { backgroundColor: C.surfaceAlt, borderColor: C.borderDim }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: `${C.border}22`, borderColor: C.borderDim }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: C.textMain }]} numberOfLines={1}>{tx.desc}</Text>
        <Text style={[styles.txMeta, { color: C.textMuted }]} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: amtColor }]}>
          {isExpense ? '-' : '+'}{fmt(tx.amount, sym, lang)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function RecentActivityCard({ recentTxs, sym, onPress, onSeeAll }: Props) {
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <View style={styles.header}>
        <View style={[styles.headerTag, { backgroundColor: C.bg, borderColor: C.borderDim }]}> 
          <View style={[styles.titleAccent, { backgroundColor: C.primary }]} />
          <Text style={[styles.title, { color: C.textMain }]}>{t('dashboard.activity').toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll} disabled={!onSeeAll}>
          <Text style={[styles.seeAll, { color: C.primary }]}>{t('common.see_all')}</Text>
        </TouchableOpacity>
      </View>

      {recentTxs.length === 0 ? (
        <Text style={[styles.empty, { color: C.textMuted }]}>{t('dashboard.no_recent')}</Text>
      ) : (
        recentTxs.map(tx => (
          <TxRow key={tx.id} tx={tx} sym={sym} onPress={() => onPress(tx)} lang={lang} fallbackCategory={t('mobile.recent.no_category')} />
        ))
      )}
    </View>
  );
}
