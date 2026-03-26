import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, ScrollView, Modal,
  LayoutAnimation, Platform, UIManager
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, SlidersHorizontal, Search, X, ArrowUpDown, Crown } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMovementsLogic } from '../../hooks/useMovementsLogic';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { TxCard } from '../../components/movements/TxCard';
import { TransactionEditView } from '../../components/movements/TransactionEditView';
import { TransactionDetailsView } from '../../components/movements/TransactionDetailsView';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { Transaction } from '../../types';
import { formatAmount, formatMonthLabel, parseDateValue } from '../../lib/locale';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { haptic } from '../../utils/haptics';
import { getCurrencySymbol } from '../../lib/currency';
import { ModalSafeAreaView } from '../../components/layout/ModalSafeAreaView';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(global as { nativeFabricUIManager?: unknown }).nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MovementsScreen() {
  const { webUser, currency, profile } = useAuth();
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();
  const dialog = useDialog();
  const sym = getCurrencySymbol(currency);
  const monthFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', { month: 'short' });

  const {
    transactions, filtered, categories,
    filters, setFilters,
    loading, refetch,
    createTransaction, updateTransaction, deleteTransaction,
  } = useMovementsLogic(webUser?.id ?? null, currency);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const monthlyGoal = useDisplayGoalAmount(profile?.monthly_goal ?? 0);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;
  const expenseGoalPct = monthlyGoal > 0 ? Math.min((totalExpense / monthlyGoal) * 100, 100) : 0;
  const monthBadge = `${monthFormatter.format(new Date(filters.year, filters.month, 1)).replace('.', '').toUpperCase()} ${filters.year}`;
  const periodLabel = filters.scope === 'historical'
    ? t('movements.historical').toUpperCase()
    : filters.scope === 'year'
      ? String(filters.year)
      : monthBadge;
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map((tx) => parseDateValue(tx.date).getFullYear()).filter((year) => !Number.isNaN(year))));
    years.push(new Date().getFullYear());
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [transactions]);
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({ index, label: formatMonthLabel(new Date(filters.year, index, 1), lang).toUpperCase() })),
    [filters.year, lang]
  );
  const formatCategoryLabel = (value: string) => {
    const normalized = value.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };
  const topCategories = useMemo(() => {
    const totals = filtered
      .filter((tx) => tx.type === 'expense')
      .reduce<Record<string, number>>((acc, tx) => {
        const key = tx.tag || t('cat.otro').toUpperCase();
        acc[key] = (acc[key] || 0) + tx.amount;
        return acc;
      }, {});

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filtered, t]);
  const topCategoryMax = topCategories[0]?.[1] ?? 0;
  const role = webUser?.role?.toLowerCase() ?? '';
  const canUseExcelImport = role === 'admin' || role === 'premium';

  const handlePremiumImportExport = async () => {
    if (!canUseExcelImport) {
      await dialog.alert(
        lang === 'es'
          ? 'La importacion de Excel esta disponible solo para usuarios premium o administradores.'
          : 'Excel import is available only for premium users or administrators.',
        `${t('landing.card_label')} · ${t('movements.import_excel')}`
      );
      return;
    }

    await dialog.alert(
      lang === 'es'
        ? 'La importacion de Excel para mobile todavia no esta habilitada, pero el acceso ya quedo restringido a premium y admin.'
        : 'Mobile Excel import is not enabled yet, but access is now restricted to premium and admin users.',
      `${t('landing.card_label')} · ${t('movements.import_excel')}`
    );
  };

  const handleEditTx = (tx: Transaction) => {
    setSelectedTx(null);
    setEditTarget(tx);
    setShowEditModal(true);
  };

  const handleSave = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      return updateTransaction(editTarget.id, txData);
    }
    if (!webUser) return false;
    return createTransaction({ ...txData, userId: webUser.id });
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setSelectedTx(null);
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: C.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: C.textMain }]}>{t('movements.title').toUpperCase()}</Text>
          <Text style={[styles.headerMeta, { color: C.primary }]}>{periodLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          {canUseExcelImport ? (
            <TouchableOpacity
              style={[styles.premiumBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => void handlePremiumImportExport()}
              activeOpacity={0.85}
              accessibilityLabel={`${t('movements.import_excel')} ${t('landing.card_label')}`}
            >
              <Crown size={16} color={C.primary} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }, showFilters && { backgroundColor: C.primary, borderColor: C.primary }]}
            onPress={() => {
              haptic.selection();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowFilters(v => !v);
            }}
          >
            <SlidersHorizontal size={16} color={showFilters ? C.primaryText : C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar — match web's 8px radius, 1px border */}
      <View style={[styles.searchWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={{ paddingLeft: Spacing.sm }}>
          <Search size={15} color={C.textMuted} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: C.textMain }]}
          placeholder={t('movements.search')}
          placeholderTextColor={C.textMuted}
          value={filters.search}
          onChangeText={s => setFilters({ search: s })}
        />
        {filters.search ? (
          <TouchableOpacity onPress={() => setFilters({ search: '' })} style={styles.clearBtn}>
            <X size={14} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.periodTrigger, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
        onPress={() => {
          haptic.selection();
          setShowPeriodModal(true);
        }}
        activeOpacity={0.85}
      >
        <Text style={[styles.periodTriggerText, { color: C.textMain }]}>{periodLabel}</Text>
        <ChevronDown size={16} color={C.primary} />
      </TouchableOpacity>

      {/* Filters panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Type filter */}
          <Text style={[styles.filterTitle, { color: C.textMuted }]}>{t('movements.filter_type').toUpperCase()}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(['all', 'expense', 'income'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface }, filters.type === type && { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => { haptic.selection(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilters({ type }); }}
              >
                <Text style={[styles.chipText, { color: filters.type === type ? C.primaryText : C.textMain }]}> 
                  {type === 'all' ? t('movements.all').toUpperCase() : type === 'expense' ? `↓ ${t('movements.expenses').toUpperCase()}` : `↑ ${t('movements.income').toUpperCase()}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category filter */}
          <Text style={[styles.filterTitle, { color: C.textMuted }]}>{t('movements.filter_category').toUpperCase()}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface }, !filters.tag && { backgroundColor: C.primary, borderColor: C.primary }]}
              onPress={() => { haptic.selection(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilters({ tag: null }); }}
            >
              <Text style={[styles.chipText, { color: !filters.tag ? C.primaryText : C.textMain }]}>{t('movements.all').toUpperCase()}</Text>
            </TouchableOpacity>
            
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface }, filters.tag === cat.name && { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => { haptic.selection(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilters({ tag: cat.name }); }}
              >
                <Text style={[styles.chipText, { color: filters.tag === cat.name ? C.primaryText : C.textMain }]}> 
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* List — insights panel and summary appear as footer (matches web sidebar-below-list on mobile) */}
      {loading && filtered.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TxCard
              tx={item}
              sym={sym}
              onPress={() => setSelectedTx(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>{filters.scope === 'month' ? t('movements.empty_month') : t('common.no_data')}</Text>
              {canUseExcelImport ? (
                <TouchableOpacity style={[styles.emptyBtn, { borderColor: C.primary }]} onPress={() => void handlePremiumImportExport()}>
                  <Crown size={14} color={C.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerPanel}>
              {/* Insights sidebar panel — matches web MovementsSidebar in fullWidth mobile mode */}
              <View style={[styles.insightsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.insightsHeader, { borderBottomColor: C.borderDim }]}>
                  <View style={styles.insightsPeriodRow}>
                    <View style={[styles.insightsDot, { backgroundColor: C.primary }]} />
                    <Text style={[styles.insightsLabel, { color: C.primary }]}>{periodLabel}</Text>
                  </View>
                  <Text style={[styles.insightsTitle, { color: C.textMain }]}>{periodLabel}</Text>
                </View>

                {/* Balance summary — large balance + sub-row, matches web sidebar */}
                <View style={[styles.balanceBlock, { borderBottomColor: C.borderDim }]}>
                  <Text style={[styles.balanceBig, { color: totalBalance >= 0 ? C.textMain : C.expenseText }]}>
                    {totalBalance >= 0 ? '' : '-'}{sym}{formatAmount(Math.abs(totalBalance), lang)}
                  </Text>
                  <View style={styles.balanceSubRow}>
                    <View style={styles.balanceSubItem}>
                      <Text style={[styles.balanceSubLabel, { color: C.incomeText }]}>{t('common.income_arrow').toUpperCase()}</Text>
                      <Text style={[styles.balanceSubValue, { color: C.textMain }]}>+{sym}{formatAmount(totalIncome, lang)}</Text>
                    </View>
                    <View style={[styles.balanceSubDivider, { backgroundColor: C.borderDim }]} />
                    <View style={styles.balanceSubItem}>
                      <Text style={[styles.balanceSubLabel, { color: C.expenseText }]}>{t('common.expense_arrow').toUpperCase()}</Text>
                      <Text style={[styles.balanceSubValue, { color: C.textMain }]}>-{sym}{formatAmount(totalExpense, lang)}</Text>
                    </View>
                  </View>
                </View>

                {/* Goal donut — matches web SVG donut (RADIUS=46, 110px, strokeWidth=14) */}
                {filters.scope === 'month' && monthlyGoal > 0 ? (() => {
                  const RADIUS = 46;
                  const CX = 60;
                  const CY = 60;
                  const circumference = 2 * Math.PI * RADIUS;
                  const fillColor = expenseGoalPct >= 100 ? C.expenseText : C.primary;
                  const strokeDashoffset = circumference * (1 - expenseGoalPct / 100);
                  return (
                    <View style={[styles.goalPanel, { borderTopColor: C.borderDim }]}>
                      <View style={styles.goalDonutRow}>
                        <Svg width={110} height={110} viewBox="0 0 120 120">
                          <Circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke={C.borderDim} strokeWidth={14} />
                          <Circle
                            cx={CX} cy={CY} r={RADIUS} fill="none"
                            stroke={fillColor} strokeWidth={14}
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${CX} ${CY})`}
                          />
                        </Svg>
                        <View style={styles.goalDonutMeta}>
                          <Text style={[styles.goalTitle, { color: C.textMain }]}>{t('movements.sidebar_goal').toUpperCase()}</Text>
                          <Text style={[styles.goalPct, { color: fillColor }]}>{Math.round(expenseGoalPct)}%</Text>
                          <Text style={[styles.goalMeta, { color: C.textMuted }]}>{sym}{formatAmount(totalExpense, lang)}</Text>
                          <Text style={[styles.goalMetaLimit, { color: C.textMuted }]}>{t('common.limit')}: {sym}{formatAmount(monthlyGoal, lang)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })() : null}

                {/* Top categories */}
                <View style={styles.topCatsPanel}>
                  {topCategories.length === 0 ? (
                    <Text style={[styles.noCats, { color: C.textMuted }]}>{t('common.no_data')}</Text>
                  ) : topCategories.map(([name, value]) => (
                    <View key={name} style={[styles.catRow, { backgroundColor: C.surfaceAlt, borderColor: C.borderDim }]}>
                      <View style={styles.catCopy}>
                        <View style={styles.catCopyMain}>
                          <Text style={[styles.catIndex, { color: C.primary }]}>{String(topCategories.findIndex(([entry]) => entry === name) + 1).padStart(2, '0')}</Text>
                          <Text style={[styles.catName, { color: C.textMain }]} numberOfLines={1}>{formatCategoryLabel(name)}</Text>
                        </View>
                        <Text style={[styles.catAmount, { color: C.textMuted }]}>{sym}{formatAmount(value, lang)}</Text>
                      </View>
                      <View style={[styles.catBarTrack, { backgroundColor: C.borderDim }]}>
                        <View style={[styles.catBarFill, { backgroundColor: C.primary, width: `${topCategoryMax > 0 ? (value / topCategoryMax) * 100 : 0}%` as `${number}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          }
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailsView
          tx={selectedTx}
          sym={sym}
          onClose={() => setSelectedTx(null)}
          onEdit={handleEditTx}
          onDelete={handleDelete}
        />
      )}

      {/* Transaction Edit/Create Modal */}
      {showEditModal && (
        <TransactionEditView
          tx={editTarget}
          categories={categories}
          userId={webUser?.id ?? ''}
          onSave={handleSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <Modal visible={showPeriodModal} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowPeriodModal(false)}>
        <View style={styles.periodModalOverlay}>
          <TouchableOpacity style={styles.periodModalBackdrop} activeOpacity={1} onPress={() => setShowPeriodModal(false)} />
          <ModalSafeAreaView style={styles.periodModalViewport}>
            <View style={[styles.periodModalCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <Text style={[styles.periodModalTitle, { color: C.textMain }]}>{t('movements.title').toUpperCase()}</Text>

              <View style={styles.periodScopeRow}>
                {([
                  { value: 'month', label: t('stats.monthly_report') },
                  { value: 'year', label: t('stats.annual_report') },
                  { value: 'historical', label: t('movements.historical') },
                ] as const).map((option) => {
                  const active = filters.scope === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.periodScopeBtn, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.surfaceAlt }]}
                      onPress={() => setFilters({ scope: option.value })}
                    >
                      <Text style={[styles.periodScopeText, { color: active ? C.primaryText : C.textMain }]}>{option.label.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filters.scope !== 'historical' ? (
              <View style={styles.periodSection}>
                <Text style={[styles.periodSectionLabel, { color: C.textMuted }]}>{t('movements.all_years').toUpperCase()}</Text>
                <View style={styles.periodYearGrid}>
                  {availableYears.map((year) => {
                    const active = filters.year === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.periodYearBtn, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.surfaceHover : C.surfaceAlt }]}
                        onPress={() => setFilters({ year })}
                      >
                        <Text style={[styles.periodYearText, { color: active ? C.textMain : C.textMuted }]}>{String(year)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              ) : null}

              {filters.scope === 'month' ? (
                <View style={styles.periodSection}>
                  <Text style={[styles.periodSectionLabel, { color: C.textMuted }]}>{t('movements.all_months').toUpperCase()}</Text>
                  <View style={styles.periodMonthGrid}>
                    {monthOptions.map((option) => {
                      const active = filters.month === option.index;
                      return (
                        <TouchableOpacity
                          key={option.index}
                          style={[styles.periodMonthBtn, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.surfaceHover : C.surfaceAlt }]}
                          onPress={() => {
                            setFilters({ month: option.index });
                            setShowPeriodModal(false);
                          }}
                        >
                          <Text style={[styles.periodMonthText, { color: active ? C.textMain : C.textMuted }]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <TouchableOpacity style={[styles.periodDoneBtn, { backgroundColor: C.primary }]} onPress={() => setShowPeriodModal(false)}>
                <Text style={[styles.periodDoneText, { color: C.primaryText }]}>{t('btn.close').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </ModalSafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  headerCopy: { gap: 2 },
  headerMeta: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.black, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 2 },
  premiumBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 2,
  },
  // Search bar matches web: 2px radius, 1px border, with magnifying icon
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 2, borderWidth: 1,
    marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1, fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  clearBtn: { padding: Spacing.sm },
  periodTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderWidth: 1, borderRadius: 2, paddingHorizontal: Spacing.sm, paddingVertical: 10,
  },
  periodTriggerText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  filtersPanel: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  footerPanel: { paddingHorizontal: 0, paddingBottom: Spacing.xxxl },
  insightsCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  insightsHeader: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 2,
  },
  insightsLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 1 },
  insightsPeriodRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightsDot: { width: 5, height: 5, borderRadius: 3 },
  insightsTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  // Balance block — large balance + sub-row (matches web sidebar)
  balanceBlock: { gap: 6, paddingBottom: 10, borderBottomWidth: 1 },
  balanceBig: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  balanceSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balanceSubItem: { flex: 1, gap: 2 },
  balanceSubLabel: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  balanceSubValue: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  balanceSubDivider: { width: 1, height: 24 },
  // Goal donut panel
  goalPanel: { borderTopWidth: 1, paddingTop: 10 },
  goalDonutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalDonutMeta: { flex: 1, gap: 4 },
  goalTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  goalPct: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  goalMeta: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  goalMetaLimit: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  // Top categories
  topCatsPanel: { gap: 8 },
  noCats: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  catRow: { gap: 6, borderWidth: 1, borderRadius: 2, padding: Spacing.sm },
  catCopy: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  catCopyMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  catIndex: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  catName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  catAmount: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  catBarTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 2 },
  filterTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.base,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: 2,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  emptyBtn: { borderWidth: 1, borderRadius: 2, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  emptyBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  periodModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  periodModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  periodModalViewport: { width: '100%' },
  periodModalCard: { borderTopWidth: 1, padding: Spacing.base, gap: Spacing.md },
  periodModalTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 1 },
  periodScopeRow: { flexDirection: 'row', gap: 8 },
  periodScopeBtn: { flex: 1, borderWidth: 1, borderRadius: 2, paddingVertical: 10, alignItems: 'center' },
  periodScopeText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  periodSection: { gap: 8 },
  periodSectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 1 },
  periodYearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodYearBtn: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8 },
  periodYearText: { fontSize: 11, fontWeight: FontWeight.black },
  periodMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodMonthBtn: { width: '31%', borderWidth: 1, borderRadius: 2, paddingVertical: 8, alignItems: 'center' },
  periodMonthText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  periodDoneBtn: { borderRadius: 2, paddingVertical: 12, alignItems: 'center' },
  periodDoneText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
});
