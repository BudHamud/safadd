import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { BalanceCard } from '../../components/dashboard/BalanceCard';
import { RecentActivityCard } from '../../components/dashboard/RecentActivityCard';
import { TopCatsCard } from '../../components/dashboard/TopCatsCard';
import { GoalCard } from '../../components/dashboard/GoalCard';
import { PaymentSheetCard, FixedItem } from '../../components/dashboard/PaymentSheetCard';
import { TransactionEditView } from '../../components/movements/TransactionEditView';
import { TransactionDetailsView } from '../../components/movements/TransactionDetailsView';
import { Transaction } from '../../types';
import { formatMonthLabel, parseDateValue } from '../../lib/locale';
import { Spacing, FontSize } from '../../constants/theme';
import { getCurrencySymbol } from '../../lib/currency';

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme: C } = useTheme();
  const { webUser, profile, currency } = useAuth();
  const { lang } = useLanguage();
  const { transactions, stats, recentTxs, loading, error, refetch, categories, createTransaction, updateTransaction, deleteTransaction } = useDashboardData(webUser?.id ?? null, currency);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [initialData, setInitialData] = useState<Partial<Transaction> | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const sym = getCurrencySymbol(currency);
  const monthlyGoal = useDisplayGoalAmount(profile?.monthly_goal ?? 0);
  const isCompact = width < 640;
  const isTablet = width >= 640;

  const dashboardDate = new Date();
  const currentMonth = dashboardDate.getMonth();
  const currentYear = dashboardDate.getFullYear();
  const currentMonthName = formatMonthLabel(dashboardDate, lang, { month: 'long' });
  const pageTitle = lang === 'en' ? 'DASHBOARD' : 'DASHBOARD';
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevExpense = transactions
    .filter(t => {
      const d = parseDateValue(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense' && !t.isCancelled && !t.excludeFromBudget;
    })
    .reduce((s, t) => s + t.amount, 0);
  const spendingChangePct = prevExpense > 0
    ? ((stats.totalExpense - prevExpense) / prevExpense) * 100
    : 0;
  const progressPct = monthlyGoal > 0
    ? Math.min((stats.totalExpense / monthlyGoal) * 100, 100)
    : 0;

  const fixedTxsData = useMemo<FixedItem[]>(() => {
    const monthlyMasterMap = new Map<string, FixedItem>();

    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      if ((tx.goalType !== 'mensual' && tx.goalType !== 'periodo') || tx.isCancelled) return;

      const cleanDesc = tx.desc.trim().toLowerCase();
      const key = `${cleanDesc}-${(tx.tag || '').trim().toLowerCase()}`;
      const txDate = parseDateValue(tx.date);

      let isDueThisMonth = false;
      if (tx.goalType === 'mensual') {
        isDueThisMonth = true;
      } else if (tx.goalType === 'periodo' && tx.periodicity) {
        const monthsDiff = (currentYear * 12 + currentMonth) - (txDate.getFullYear() * 12 + txDate.getMonth());
        if (monthsDiff >= 0 && monthsDiff % tx.periodicity === 0) {
          isDueThisMonth = true;
        }
      }

      if (!isDueThisMonth) return;

      const isPaidThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      const existing = monthlyMasterMap.get(key);
      const nextItem: FixedItem = {
        latest: tx,
        isPaid: (existing?.isPaid || isPaidThisMonth) ?? false,
        day: txDate.getDate(),
        label: tx.desc.trim(),
      };

      if (!existing || parseDateValue(existing.latest.date) < txDate) {
        monthlyMasterMap.set(key, nextItem);
      } else if (isPaidThisMonth) {
        existing.isPaid = true;
      }
    });

    return Array.from(monthlyMasterMap.values()).sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return a.day - b.day;
    });
  }, [currentMonth, currentYear, transactions]);

  const handleOpenMovement = (tx: Transaction) => {
    setSelectedTx(tx);
  };

  const handleOpenRecurringDraft = (seed?: Partial<Transaction>) => {
    setSelectedTx(null);
    setEditTarget(null);
    setInitialData(seed ?? { goalType: 'mensual', type: 'expense' });
    setShowEditModal(true);
  };

  const handlePaymentSheetPress = (item: FixedItem) => {
    if (item.isPaid) {
      setSelectedTx(item.latest);
      return;
    }

    handleOpenRecurringDraft({
      desc: item.latest.desc,
      amount: item.latest.amount,
      tag: item.latest.tag,
      icon: item.latest.icon,
      type: 'expense',
      goalType: item.latest.goalType,
      periodicity: item.latest.periodicity,
      excludeFromBudget: item.latest.excludeFromBudget,
      paymentMethod: item.latest.paymentMethod,
      cardDigits: item.latest.cardDigits,
      details: item.latest.details,
    });
  };

  const handleSave = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const success = editTarget
      ? await updateTransaction(editTarget.id, txData)
      : await createTransaction(txData);

    if (success) {
      setShowEditModal(false);
      setEditTarget(null);
      setInitialData(null);
    }

    return success;
  };

  const handleDelete = async (id: string) => {
    const success = await deleteTransaction(id);
    if (success) {
      setSelectedTx(null);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
      >
        <View style={styles.pageIntro}>
          <Text style={[styles.pageTitle, { color: C.textMain }]}>{pageTitle}</Text>
          <Text style={[styles.pageDate, { color: C.textMuted }]}>{currentMonthName.toUpperCase()} {currentYear}</Text>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: C.expenseText }]}>{error}</Text>
        ) : null}

        <View style={[styles.topGrid, isTablet && styles.topGridTablet]}>
          <View style={[styles.cardSlot, isTablet && styles.cardSlotThird]}>
            <BalanceCard
              totalIncome={stats.totalIncome}
              totalExpense={stats.totalExpense}
              balance={stats.balance}
              spendingChangePct={spendingChangePct}
              progressPct={progressPct}
              sym={sym}
              hideAmounts={hideAmounts}
              onToggleHide={() => setHideAmounts(v => !v)}
            />
          </View>

          <View style={[styles.cardSlot, isTablet && styles.cardSlotThird]}>
            <GoalCard
              monthlyGoal={monthlyGoal}
              totalExpense={stats.totalExpense}
              sym={sym}
            />
          </View>

          <View style={[styles.cardSlot, isTablet && styles.cardSlotThird]}>
            <TopCatsCard topStats={stats.byCategory.slice(0, 3)} />
          </View>
        </View>

        <View style={[styles.bottomGrid, isTablet && styles.bottomGridTablet]}>
          <View style={[styles.cardSlot, isTablet && styles.cardSlotHalf]}>
            <RecentActivityCard
              recentTxs={recentTxs}
              sym={sym}
              onPress={handleOpenMovement}
              onSeeAll={() => router.push('/(tabs)/movements')}
            />
          </View>

          <View style={[styles.cardSlot, isTablet && styles.cardSlotHalf]}>
            <PaymentSheetCard
              fixedTxsData={fixedTxsData}
              currentMonthName={currentMonthName}
              sym={sym}
              onItemPress={handlePaymentSheetPress}
              onAddRecurring={() => handleOpenRecurringDraft()}
            />
          </View>
        </View>
      </ScrollView>

      {selectedTx ? (
        <TransactionDetailsView
          tx={selectedTx}
          sym={sym}
          onClose={() => setSelectedTx(null)}
          onEdit={(tx) => {
            setSelectedTx(null);
            setInitialData(null);
            setEditTarget(tx);
            setShowEditModal(true);
          }}
          onDelete={handleDelete}
        />
      ) : null}

      {showEditModal ? (
        <TransactionEditView
          tx={editTarget}
          initialData={initialData}
          categories={categories}
          userId={webUser?.id ?? ''}
          onSave={handleSave}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
            setInitialData(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  pageIntro: { gap: 4 },
  pageTitle: { fontSize: FontSize.xl, fontWeight: '900', letterSpacing: -0.5 },
  pageDate: { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.6 },
  topGrid: {
    gap: Spacing.md,
  },
  topGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  bottomGrid: {
    gap: Spacing.md,
  },
  bottomGridTablet: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  cardSlot: {
    width: '100%',
  },
  cardSlotThird: {
    width: '31.5%',
  },
  cardSlotHalf: {
    width: '48.5%',
  },
  errorText: { fontSize: FontSize.sm },
});
