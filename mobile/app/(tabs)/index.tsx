import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { PendingBankTransaction, useBankNotifications } from '../../hooks/useBankNotifications';
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
  const { webUser, profile, currency, session } = useAuth();
  const { lang, t } = useLanguage();
  const { transactions, stats, recentTxs, loading, error, refetch, categories, createTransaction, updateTransaction, deleteTransaction } = useDashboardData(webUser?.id ?? null, currency);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [initialData, setInitialData] = useState<Partial<Transaction> | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { pending, permissionGranted, dismissPending } = useBankNotifications({
    enabled: true,
    userId: webUser?.id ? String(webUser.id) : '',
    accessToken: session?.access_token ?? null,
  });

  const sym = getCurrencySymbol(currency);
  const monthlyGoal = useDisplayGoalAmount(profile?.monthly_goal ?? 0);
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

  const handleOpenPendingNotification = (pendingItem: PendingBankTransaction) => {
    const seed = pendingItem.transaction && typeof pendingItem.transaction === 'object'
      ? pendingItem.transaction as Partial<Transaction>
      : null;

    setShowNotificationsModal(false);
    setSelectedTx(null);
    setEditTarget(null);
    setInitialData({
      type: seed?.type ?? pendingItem.type,
      amount: seed?.amount ?? pendingItem.amount,
      desc: seed?.desc ?? pendingItem.merchant,
      details: seed?.details ?? pendingItem.rawText,
      date: seed?.date ?? new Date().toISOString().split('T')[0],
      tag: seed?.tag ?? undefined,
      icon: seed?.icon ?? '🏦',
      paymentMethod: seed?.paymentMethod ?? null,
      cardDigits: seed?.cardDigits ?? null,
      goalType: seed?.goalType ?? 'unico',
      excludeFromBudget: seed?.excludeFromBudget ?? false,
      periodicity: seed?.periodicity ?? null,
    });
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
          <View style={styles.pageIntroHeader}>
            <View style={styles.pageIntroCopy}>
              <Text style={[styles.pageTitle, { color: C.textMain }]}>{pageTitle}</Text>
              <Text style={[styles.pageDate, { color: C.textMuted }]}>{currentMonthName.toUpperCase()} {currentYear}</Text>
            </View>
            <TouchableOpacity
              style={[styles.notificationBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowNotificationsModal(true)}
              activeOpacity={0.8}
            >
              <Bell size={17} color={permissionGranted ? C.textMain : C.textMuted} />
              {pending.length > 0 ? (
                <View style={[styles.notificationBadge, { backgroundColor: C.primary }]}> 
                  <Text style={[styles.notificationBadgeText, { color: C.primaryText }]}>{pending.length > 9 ? '9+' : pending.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
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

      <Modal
        visible={showNotificationsModal}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <SafeAreaView style={[styles.notificationsView, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
          <View style={[styles.notificationsHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}> 
            <View style={styles.notificationsHeaderCopy}>
              <Text style={[styles.notificationsTitle, { color: C.textMain }]}>{t('bank.panel_title').toUpperCase()}</Text>
              <Text style={[styles.notificationsSubtitle, { color: C.textMuted }]}>{t('bank.panel_subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)} style={styles.notificationsCloseBtn}>
              <X size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.notificationsContent}>
            {pending.length === 0 ? (
              <View style={[styles.notificationEmptyCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
                <Text style={[styles.notificationEmptyTitle, { color: C.textMain }]}>{t('bank.empty_title')}</Text>
                <Text style={[styles.notificationEmptyText, { color: C.textMuted }]}>{t('bank.empty_desc')}</Text>
              </View>
            ) : (
              pending.map((item) => (
                <View key={item.id} style={[styles.notificationCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
                  <View style={styles.notificationCardTop}>
                    <View style={styles.notificationCardCopy}>
                      <Text style={[styles.notificationMerchant, { color: C.textMain }]} numberOfLines={1}>{item.merchant}</Text>
                      <Text style={[styles.notificationMeta, { color: C.textMuted }]}>{item.bankName}</Text>
                    </View>
                    <Text style={[styles.notificationAmount, { color: item.type === 'income' ? C.primary : C.expenseText }]}>
                      {item.type === 'income' ? '+' : '-'}{item.currency} {item.amount.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <Text style={[styles.notificationRawText, { color: C.textMuted }]} numberOfLines={2}>{item.rawText}</Text>

                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      style={[styles.notificationActionSecondary, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                      onPress={() => void dismissPending(item.id)}
                    >
                      <Text style={[styles.notificationActionSecondaryText, { color: C.textMain }]}>{t('btn.ignore').toUpperCase()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.notificationActionPrimary, { backgroundColor: item.type === 'income' ? C.primary : C.accent }]}
                      onPress={() => handleOpenPendingNotification(item)}
                    >
                      <Text style={[styles.notificationActionPrimaryText, { color: item.type === 'income' ? C.primaryText : C.accentText }]}>
                        {item.type === 'income' ? t('btn.record_income').toUpperCase() : t('btn.record_expense').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  pageIntroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pageIntroCopy: { flex: 1, gap: 4 },
  pageTitle: { fontSize: FontSize.xl, fontWeight: '900', letterSpacing: -0.5 },
  pageDate: { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.6 },
  notificationBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  notificationsView: {
    flex: 1,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  notificationsHeaderCopy: {
    flex: 1,
    gap: 4,
    paddingRight: Spacing.base,
  },
  notificationsTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notificationsSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  notificationsCloseBtn: {
    padding: Spacing.xs,
  },
  notificationsContent: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  notificationEmptyCard: {
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notificationEmptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  notificationEmptyText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  notificationCard: {
    borderWidth: 1,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  notificationCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  notificationCardCopy: {
    flex: 1,
    gap: 4,
  },
  notificationMerchant: {
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  notificationMeta: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  notificationAmount: {
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  notificationRawText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  notificationActionSecondary: {
    flex: 1,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationActionSecondaryText: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  notificationActionPrimary: {
    flex: 1.4,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  notificationActionPrimaryText: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
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
