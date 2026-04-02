import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Transaction } from '../../../types';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';
import { X } from 'lucide-react-native';
import { formatAmount, formatShortDate } from '../../../lib/locale';
import { styles } from './styles';

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
