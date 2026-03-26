import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Transaction } from '../../types';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { X } from 'lucide-react-native';
import { formatAmount, formatShortDate } from '../../lib/locale';

type Props = {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  transactions: Transaction[];
  sym: string;
  onClose: () => void;
};

export function StatsCategoryOverlay({ categoryName, categoryIcon, categoryColor, transactions, sym, onClose }: Props) {
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();

  const filteredTxs = transactions.filter((tx) => tx.tag === categoryName || (!tx.tag && categoryName === 'OTROS'));
  const totalCat = filteredTxs.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}> 
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: C.textMuted }]}>{t('stats.cat_breakdown').toUpperCase()}</Text>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <Text style={styles.icon}>{categoryIcon}</Text>
            </View>
            <View style={styles.titleCopy}>
              <Text style={[styles.title, { color: C.textMain }]}>{categoryName.toUpperCase()}</Text>
              <Text style={[styles.subtitle, { color: C.expenseText }]}>
                {sym}{formatAmount(totalCat, lang)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <X size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTxs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const amountColor = item.type === 'expense' ? C.expenseText : C.primary;
          const prefix = item.type === 'expense' ? '-' : '+';

          return (
            <View style={[styles.transactionRow, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <View style={styles.transactionCopy}>
                <Text style={[styles.transactionTitle, { color: C.textMain }]} numberOfLines={1}>
                  {item.desc.toUpperCase()}
                </Text>
                <Text style={[styles.transactionMeta, { color: C.textMuted }]}>{formatShortDate(item.date, lang).toUpperCase()}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: amountColor }]}>
                {prefix}{sym}{formatAmount(item.amount, lang)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: C.border, backgroundColor: C.surface }]}> 
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('stats.no_txs_period')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1.4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
    gap: 8,
    paddingBottom: Spacing.xxxl,
  },
  transactionRow: {
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  transactionCopy: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    letterSpacing: 0.5,
  },
  transactionMeta: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  transactionAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
  },
  emptyState: {
    borderWidth: 1,
    padding: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
