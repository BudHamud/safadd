import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatAmount, formatShortDate } from '../../lib/locale';
import { Spacing, FontWeight } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';

type Props = {
  tx: Transaction;
  sym: string;
  onPress: () => void;
};

function formatCategoryLabel(value: string) {
  const normalized = (value || 'OTROS').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function TxCard({ tx, sym, onPress }: Props) {
  const { theme: C } = useTheme();
  const { lang } = useLanguage();
  const isExpense = tx.type === 'expense';
  const icon = tx.icon || '💳';
  const amtColor = isExpense ? C.expenseText : C.incomeText;
  const dateStr = formatShortDate(tx.date, lang);

  const title = tx.desc.toUpperCase();
  const categoryStr = formatCategoryLabel(tx.tag || 'OTROS');

  return (
    <TouchableOpacity style={[styles.card, { borderColor: C.borderDim, backgroundColor: C.surface }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: C.surfaceAlt }]}> 
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.desc, { color: tx.isCancelled ? C.textMuted : C.textMain }, tx.isCancelled && styles.descCancelled]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: C.textMuted }]} numberOfLines={1}>
            {categoryStr} - {dateStr}
          </Text>
          {tx.goalType === 'mensual' ? <Text style={[styles.badge, { color: C.primary, backgroundColor: C.surfaceAlt }]}>{'MENSUAL'}</Text> : null}
          {tx.goalType === 'periodo' ? <Text style={[styles.badge, { color: C.primary, backgroundColor: C.surfaceAlt }]}>{`${tx.periodicity ?? ''}M`}</Text> : null}
          {tx.isCancelled ? <Text style={[styles.badge, { color: C.expenseText, backgroundColor: `${C.accent}22` }]}>{'ANULADO'}</Text> : null}
        </View>
      </View>

      <Text style={[styles.amount, { color: amtColor }, tx.isCancelled && styles.amountCancelled]}>
        {isExpense ? '-' : '+'}{sym}{formatAmount(tx.amount, lang)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  icon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  desc: { fontSize: 13, fontWeight: FontWeight.black, flex: 1, letterSpacing: 0.2 },
  descCancelled: { textDecorationLine: 'line-through' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  metaText: { fontSize: 11, fontWeight: FontWeight.semibold, letterSpacing: 0.3, maxWidth: '85%' },
  badge: { fontSize: 8, fontWeight: FontWeight.black, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2, letterSpacing: 0.3 },
  amount: {
    fontSize: 15,
    fontWeight: FontWeight.black,
    letterSpacing: -0.3,
  },
  amountCancelled: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
