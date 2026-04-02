import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAmount } from '../../../lib/locale';
import { Spacing, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

export type FixedItem = {
  latest: Transaction;
  isPaid: boolean;
  day: number;
  label: string;
};

type Props = {
  fixedTxsData: FixedItem[];
  currentMonthName: string;
  sym: string;
  onItemPress?: (item: FixedItem) => void;
  onAddRecurring?: () => void;
};

function recurringLabel(periodicity?: number | null) {
  if (!periodicity) return '';
  if (periodicity === 12) return '12M';
  if (periodicity === 6) return '6M';
  return `${periodicity}M`;
}

export function PaymentSheetCard({ fixedTxsData, currentMonthName, sym, onItemPress, onAddRecurring }: Props) {
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.textMain }]}>{t('dashboard.payment_sheet').toUpperCase()}</Text>
        <View style={[styles.monthBadge, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
          <Text style={[styles.monthBadgeText, { color: C.primary }]}>{currentMonthName.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {fixedTxsData.length === 0 ? (
          <Text style={[styles.empty, { color: C.textMuted }]}>{t('mobile.payments.empty')}</Text>
        ) : fixedTxsData.map((item, index) => {
          const tx = item.latest;
          const isLast = index === fixedTxsData.length - 1;
          const amountColor = item.isPaid ? C.primary : C.expenseText;

          return (
            <TouchableOpacity
              key={tx.id}
              activeOpacity={0.8}
              style={styles.row}
              onPress={() => onItemPress?.(item)}
            >
              <View style={styles.timelineCol}>
                <View style={[styles.dot, item.isPaid ? { backgroundColor: C.primary } : { backgroundColor: C.surface, borderWidth: 2, borderColor: C.expenseText }]} />
                {!isLast ? <View style={[styles.line, { backgroundColor: C.borderDim }]} /> : null}
              </View>

              <View style={styles.rowBody}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.label, { color: item.isPaid ? C.textMuted : C.textMain }]} numberOfLines={1}>{item.label}</Text>
                  <View style={styles.badgesInline}>
                    {tx.goalType === 'periodo' && tx.periodicity ? (
                      <View style={[styles.secondaryBadge, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
                        <Text style={[styles.secondaryBadgeText, { color: C.textMuted }]}>{recurringLabel(tx.periodicity)}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.stateBadge, item.isPaid ? { backgroundColor: C.primary } : { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.expenseText }]}>
                      <Text style={[styles.stateBadgeText, { color: item.isPaid ? C.primaryText : C.expenseText }]}>
                        {item.isPaid ? t('mobile.payments.paid').toUpperCase() : t('mobile.payments.pending').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: C.textMuted }]}>{t('mobile.payments.day', { day: item.day })} • {tx.tag}</Text>
                  <Text style={[styles.amount, { color: amountColor }]}>{sym}{formatAmount(tx.amount, lang)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.footerRow, { borderTopColor: C.borderDim }]}>
        <TouchableOpacity style={styles.footerButtonFull} onPress={onAddRecurring}>
          <Text style={[styles.footerButtonText, { color: C.primary }]}>{t('dashboard.add_recurring').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
