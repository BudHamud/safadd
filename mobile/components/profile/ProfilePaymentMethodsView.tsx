import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { X, CreditCard } from 'lucide-react-native';

type Props = {
  onClose: () => void;
};

export function ProfilePaymentMethodsView({ onClose }: Props) {
  const { webUser } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  // Reuse dashboard data to extract unique payment methods
  const { transactions, loading } = useDashboardData(webUser?.id ?? null);

  const usageStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    transactions.forEach(tx => {
      // Only track expense payment methods generally, or all
      const method = tx.paymentMethod || t('common.cash');
      if (!stats[method]) stats[method] = { count: 0, total: 0 };
      stats[method].count++;
      if (tx.type === 'expense') stats[method].total += tx.amount;
    });
    return stats;
  }, [transactions, t]);

  const sortedMethods = useMemo(() => {
    return Object.entries(usageStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [usageStats]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textMain }]}>{t('mobile.profile.payment_methods').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: C.textMuted }]}>
          {t('mobile.profile.payment_methods_description')}
        </Text>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: Spacing.xl }} />
        ) : sortedMethods.length === 0 ? (
          <View style={styles.emptyBox}>
            <CreditCard size={32} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('mobile.profile.payment_methods_empty')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedMethods.map(pm => (
              <View key={pm.name} style={[styles.row, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.iconBox, { backgroundColor: `${C.primary}22` }]}>
                  <CreditCard size={20} color={C.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: C.textMain }]}>{pm.name}</Text>
                  <Text style={[styles.uses, { color: C.textMuted }]}>
                    {t('mobile.profile.payment_methods_usage', { count: pm.count, suffix: pm.count === 1 ? t('mobile.profile.time_single') : t('mobile.profile.time_plural') })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, paddingBottom: 60 },
  description: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.lg },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.card, borderWidth: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  uses: { fontSize: FontSize.xs, marginTop: 2 },
});
