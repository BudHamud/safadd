import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Pencil, Trash2 } from 'lucide-react-native';
import { Transaction } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAmount, formatLongDate } from '../../../lib/locale';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { useDialog } from '../../../context/DialogContext';
import { haptic } from '../../../utils/haptics';
import { detailStyles, styles } from './styles';

type Props = {
  tx: Transaction;
  sym: string;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
};

function tagColor(tag: string): string {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) hash = tag.charCodeAt(index) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

function DetailRow({ label, value, valueColor, borderColor, labelColor, textColor }: { label: string; value: string; valueColor?: string; borderColor: string; labelColor: string; textColor: string }) {
  return (
    <View style={[detailStyles.row, { borderBottomColor: borderColor }]}> 
      <Text style={[detailStyles.label, { color: labelColor }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: valueColor ?? textColor }]}>{value}</Text>
    </View>
  );
}

export function TransactionDetailsView({ tx, sym, onClose, onEdit, onDelete }: Props) {
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();
  const dialog = useDialog();
  const detailsTitle = lang === 'en' ? 'ORDER DETAILS' : 'DETALLE DEL MOVIMIENTO';
  const budgetLabel = lang === 'en' ? 'Budget' : 'Presupuesto';
  const cardDigitsLabel = lang === 'en' ? 'Card digits' : 'Tarjeta';
  const isExpense = tx.type === 'expense';
  const amountColor = isExpense ? C.expenseText : C.incomeText;
  const icon = tx.icon || '💳';
  const categoryColor = tagColor(tx.tag || '');
  const hasPeriodic = Boolean(tx.periodicity && tx.periodicity > 0);
  const paymentMethodLabel = tx.paymentMethod === 'billete'
    ? t('common.cash')
    : tx.paymentMethod === 'tarjeta'
      ? t('details.card')
      : tx.paymentMethod ?? '';

  const handleDelete = async () => {
    haptic.warning();
    const confirmed = await dialog.confirm({
      title: t('details.delete_transaction'),
      message: t('details.delete_order_warning'),
      confirmText: t('btn.delete'),
      type: 'danger',
    });

    if (confirmed) {
      haptic.error();
      void onDelete(tx.id);
    }
  };

  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={[styles.wrapper, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.surface }]}> 
          <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
            <X size={18} color={C.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.textMain }]}>{detailsTitle}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} onPress={() => onEdit(tx)}>
              <Pencil size={16} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: `${C.accent}11`, borderColor: `${C.accent}55` }]} onPress={handleDelete}>
              <Trash2 size={16} color={C.expenseText} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: `${categoryColor}22`, borderColor: `${categoryColor}55` }]}> 
              <Text style={styles.heroIconText}>{icon}</Text>
            </View>
            <Text style={[styles.amount, { color: amountColor }, tx.isCancelled && styles.amountCancelled]}>
              {isExpense ? '-' : '+'}{sym}{formatAmount(tx.amount, lang)}
            </Text>
            <Text style={[styles.description, { color: tx.isCancelled ? C.textMuted : C.textMain }, tx.isCancelled && styles.descCancelled]}>{tx.desc}</Text>

            <View style={styles.badgesRow}>
              <Text style={[styles.badge, { color: amountColor, borderColor: `${amountColor}66`, backgroundColor: `${amountColor}11` }]}>
                {isExpense ? `↓ ${t('type.expense').toUpperCase()}` : `↑ ${t('type.income').toUpperCase()}`}
              </Text>
              <Text style={[styles.badge, tx.isCancelled ? { color: C.expenseText, borderColor: `${C.accent}66`, backgroundColor: `${C.accent}11` } : { color: C.primary, borderColor: `${C.primary}66`, backgroundColor: `${C.primary}11` }]}>
                {tx.isCancelled ? t('mobile.details.cancelled').toUpperCase() : t('mobile.details.active').toUpperCase()}
              </Text>
              {tx.goalType === 'mensual' || tx.goalType === 'periodo' ? (
                <Text style={[styles.badge, { color: C.textMuted, borderColor: C.border, backgroundColor: C.surfaceAlt }]}>
                  {tx.goalType === 'mensual' ? t('order.goal_monthly').toUpperCase() : `${t('order.goal_period').toUpperCase()}${tx.periodicity ? ` · ${tx.periodicity}M` : ''}`}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.detailsCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <DetailRow label={t('details.record_type')} value={isExpense ? `↓ ${t('type.expense')}` : `↑ ${t('type.income')}`} valueColor={amountColor} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            <DetailRow label={t('mobile.details.status')} value={tx.isCancelled ? t('mobile.details.cancelled') : t('mobile.details.active')} valueColor={tx.isCancelled ? C.expenseText : C.textMain} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            <DetailRow label={t('field.date')} value={formatLongDate(tx.date, lang)} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            <DetailRow label={t('field.category')} value={`${tx.icon || '❓'} ${tx.tag || t('cat.otro').toUpperCase()}`} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            {tx.paymentMethod ? <DetailRow label={t('field.payment_method')} value={paymentMethodLabel} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} /> : null}
            {tx.cardDigits ? <DetailRow label={cardDigitsLabel} value={`•••• ${tx.cardDigits}`} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} /> : null}
            <DetailRow label={t('field.amount')} value={`${sym}${formatAmount(tx.amount, lang)}`} valueColor={amountColor} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            <DetailRow label={budgetLabel} value={tx.excludeFromBudget ? t('order.exclude_from_goal') : t('common.active')} valueColor={tx.excludeFromBudget ? C.expenseText : C.textMain} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            {hasPeriodic ? (
              <DetailRow label={t('details.frequency_months')} value={t('mobile.order.periodicity_value', { count: tx.periodicity ?? 0 })} borderColor={C.borderDim} labelColor={C.textMuted} textColor={C.textMain} />
            ) : null}
            {tx.details ? (
              <View style={[detailStyles.notesWrap, { borderBottomColor: C.borderDim }]}> 
                <Text style={[detailStyles.label, { color: C.textMuted }]}>{t('field.notes')}</Text>
                <Text style={[detailStyles.notesText, { color: C.textMain }]}>{tx.details}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.footerBtnSecondary, { borderColor: C.border, backgroundColor: C.surface }]} onPress={() => onEdit(tx)}>
              <Text style={[styles.footerBtnSecondaryText, { color: C.textMain }]}>{t('btn.edit').toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtnDanger, { borderColor: C.accent, backgroundColor: `${C.accent}11` }]} onPress={handleDelete}>
              <Text style={[styles.footerBtnDangerText, { color: C.expenseText }]}>{t('btn.delete').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
