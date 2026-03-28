import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { useLanguage } from '../../context/LanguageContext';
import { formatAmount, formatMonthLabel, parseDateValue } from '../../lib/locale';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { StatsCategoryOverlay } from '@/components/stats/StatsCategoryOverlay';
import { haptic } from '../../utils/haptics';
import { getCurrencySymbol } from '../../lib/currency';
import { ModalSafeAreaView } from '../../components/layout/ModalSafeAreaView';

function buildFillWidthStyle(value: number) {
  const boundedValue = Math.max(0, Math.min(value, 100));
  return boundedValue >= 100 ? { left: 0, right: 0 } : { width: `${boundedValue}%` as const };
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = tag.charCodeAt(index) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

export default function StatsScreen() {
  const { theme: C } = useTheme();
  const { webUser, profile, currency } = useAuth();
  const { lang, t } = useLanguage();
  const { transactions, loading, refetch } = useDashboardData(webUser?.id ?? null, currency);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCat, setSelectedCat] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const sym = getCurrencySymbol(currency);
  const monthlyGoal = useDisplayGoalAmount(profile?.monthly_goal ?? 0);

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, index) => formatMonthLabel(new Date(2024, index, 1), lang).toUpperCase()),
    [lang]
  );

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(
        transactions
          .map((tx) => parseDateValue(tx.date))
          .filter((date) => !Number.isNaN(date.getTime()))
          .map((date) => date.getFullYear().toString())
      )
    ).sort((a, b) => Number(b) - Number(a));

    return years.length ? years : [currentYear.toString()];
  }, [currentYear, transactions]);

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0];

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        if (tx.isCancelled) return false;
        const date = parseDateValue(tx.date);
        if (Number.isNaN(date.getTime())) return false;
        if (date.getFullYear().toString() !== activeYear) return false;
        if (selectedMonth !== 'ALL' && String(date.getMonth() + 1).padStart(2, '0') !== selectedMonth) return false;
        return true;
      }),
    [activeYear, selectedMonth, transactions]
  );

  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = filteredTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const balance = totalIncome - totalExpense;
  const expenseForGoal = filteredTransactions
    .filter((tx) => tx.type === 'expense' && !tx.excludeFromBudget)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const goalProgress = monthlyGoal > 0 ? Math.min((expenseForGoal / monthlyGoal) * 100, 100) : 0;

  const categoryStats = useMemo(() => {
    const totals: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const tagName = tx.tag || 'OTROS';
        if (!totals[tagName]) {
          totals[tagName] = {
            name: tagName,
            icon: tx.icon || '💳',
            color: tagColor(tagName),
            total: 0,
          };
        }
        totals[tagName].total += tx.amount;
      });

    return Object.entries(totals)
      .sort(([, left], [, right]) => right.total - left.total)
      .slice(0, 8);
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const monthTotals = new Array(12).fill(0);
    transactions.forEach((tx) => {
      if (tx.type === 'income' || tx.excludeFromBudget || tx.isCancelled) return;
      const date = parseDateValue(tx.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear().toString() !== activeYear) return;
      monthTotals[date.getMonth()] += tx.amount;
    });
    return monthTotals;
  }, [activeYear, transactions]);

  const maxTrend = Math.max(...trendData, monthlyGoal, 1);
  const avgSpend = useMemo(() => {
    const nonZeroMonths = trendData.filter((value) => value > 0);
    if (!nonZeroMonths.length) return 0;
    return nonZeroMonths.reduce((sum, value) => sum + value, 0) / nonZeroMonths.length;
  }, [trendData]);

  const prevYear = (Number(activeYear) - 1).toString();
  const prevYearCategoryTotals = useMemo(
    () =>
      transactions
        .filter((tx) => {
          const date = parseDateValue(tx.date);
          return (
            !tx.isCancelled &&
            tx.type === 'expense' &&
            !Number.isNaN(date.getTime()) &&
            date.getFullYear().toString() === prevYear
          );
        })
        .reduce((acc, tx) => {
          const key = tx.tag || 'OTROS';
          acc[key] = (acc[key] || 0) + tx.amount;
          return acc;
        }, {} as Record<string, number>),
    [prevYear, transactions]
  );

  const reportLabel = selectedMonth === 'ALL' ? t('stats.annual_report') : t('stats.monthly_report');
  const periodLabel =
    selectedMonth === 'ALL'
      ? `${t('stats.all_year').toUpperCase()} · ${activeYear}`
      : `${monthNames[Number(selectedMonth) - 1]} ${activeYear}`;

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.textMain }]}>{t('stats.stats').toUpperCase()}</Text>

          <TouchableOpacity
            style={[styles.periodTrigger, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
            onPress={() => {
              haptic.selection();
              setShowPeriodModal(true);
            }}
          >
            <Text style={[styles.periodTriggerText, { color: C.textMain }]}>{periodLabel}</Text>
            <ChevronDown size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{reportLabel.toUpperCase()}</Text>

        {loading && filteredTransactions.length === 0 ? (
          <ActivityIndicator color={C.primary} style={styles.loading} />
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.balanceBlock}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{t('stats.liquidity').toUpperCase()}</Text>
                <View style={styles.balanceRow}>
                  <Text style={[styles.balanceCurrency, { color: C.textMuted }]}>{sym}</Text>
                  <Text style={[styles.balanceAmt, { color: balance >= 0 ? C.textMain : C.expenseText }]}>
                    {formatAmount(balance, lang)}
                  </Text>
                </View>
              </View>

              <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />

              <View style={styles.summaryPair}>
                <View style={styles.metricBlock}>
                  <View style={styles.metricLabelRow}>
                    <View style={[styles.metricDot, { backgroundColor: C.primary }]} />
                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{t('stats.income').toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.summaryAmt, { color: C.primary }]}>+{sym}{formatAmount(totalIncome, lang)}</Text>
                </View>

                <View style={styles.metricBlock}>
                  <View style={styles.metricLabelRow}>
                    <View style={[styles.metricDot, { backgroundColor: C.expenseText }]} />
                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{t('stats.expenses_label').toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.summaryAmt, { color: C.expenseText }]}>-{sym}{formatAmount(totalExpense, lang)}</Text>
                </View>
              </View>

              {selectedMonth !== 'ALL' && monthlyGoal > 0 ? (
                <View style={[styles.goalSection, { borderTopColor: C.border }]}>
                  <View style={styles.goalHeader}>
                    <Text style={[styles.goalLabel, { color: C.textMuted }]}>{t('stats.goal_consumption').toUpperCase()}</Text>
                    <Text style={[styles.goalLabel, { color: goalProgress >= 100 ? C.expenseText : C.textMain }]}>
                      {goalProgress.toFixed(0)}% · {sym}{formatAmount(monthlyGoal, lang)}
                    </Text>
                  </View>
                  <View style={[styles.goalTrack, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}>
                    <View
                      style={[
                        styles.goalFill,
                        buildFillWidthStyle(goalProgress),
                        { backgroundColor: goalProgress >= 100 ? C.expenseText : C.primary },
                      ]}
                    />
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{`${t('stats.spending_trend')} (${activeYear})`.toUpperCase()}</Text>

            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: C.textMuted }]}>{t('stats.spending_trend').toUpperCase()}</Text>
                <Text style={[styles.cardHint, { color: C.textMuted }]}>{`${t('stats.avg').toUpperCase()} ${sym}${formatAmount(avgSpend, lang)}`}</Text>
              </View>

              <View style={styles.trendArea}>
                {avgSpend > 0 ? (
                  <View style={[styles.avgLine, { bottom: 24 + (avgSpend / maxTrend) * 150, borderTopColor: C.border }]}> 
                    <Text style={[styles.avgLabel, { color: C.textMuted, backgroundColor: C.surface }]}>
                      {`${t('stats.avg')} ${sym}${formatAmount(avgSpend, lang)}`}
                    </Text>
                  </View>
                ) : null}

                {monthlyGoal > 0 ? (
                  <View style={[styles.limitLine, { bottom: 24 + (monthlyGoal / maxTrend) * 150, borderTopColor: C.expenseText }]}>
                    <Text style={[styles.limitLabel, { color: C.expenseText, backgroundColor: C.surface }]}>
                      {`${t('stats.limit_label')} ${sym}${formatAmount(monthlyGoal, lang)}`}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.barsArea}>
                  {trendData.map((value, index) => {
                    const monthValue = String(index + 1).padStart(2, '0');
                    const active = selectedMonth === monthValue;
                    const overGoal = monthlyGoal > 0 && value > monthlyGoal;
                    const barColor = active ? C.textMain : overGoal ? C.expenseText : C.primary;
                    const valueLabel = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : formatAmount(value, lang);

                    return (
                      <TouchableOpacity
                        key={monthValue}
                        activeOpacity={0.85}
                        onPress={() => {
                          haptic.selection();
                          setSelectedMonth(active ? 'ALL' : monthValue);
                        }}
                        style={styles.barGroup}
                      >
                        <Text
                          style={[styles.barValue, { color: active ? C.textMain : C.textMuted }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
                        >
                          {value > 0 ? valueLabel : ''}
                        </Text>
                        <View
                          style={[
                            styles.barTrack,
                            {
                              backgroundColor: C.surfaceAlt,
                              borderColor: active ? C.surfaceHover : C.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max((value / maxTrend) * 100, value > 0 ? 3 : 0)}%` as const,
                                backgroundColor: barColor,
                                opacity: active ? 1 : 0.82,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[styles.barLabel, { color: active ? C.textMain : C.textMuted }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
                        >
                          {monthNames[index]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: C.textMuted }]}> 
              {`${t('stats.top_cats')}${selectedMonth !== 'ALL' ? ` (${monthNames[Number(selectedMonth) - 1]})` : ''}`.toUpperCase()}
            </Text>

            {categoryStats.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('stats.no_expenses')}</Text>
              </View>
            ) : (
              <View style={styles.categoriesList}>
                {categoryStats.map(([key, category], index) => {
                  const pct = totalExpense > 0 ? (category.total / totalExpense) * 100 : 0;
                  const prevTotal = prevYearCategoryTotals[category.name] || 0;
                  const yearDiff = prevTotal > 0 ? ((category.total - prevTotal) / prevTotal) * 100 : null;

                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.82}
                      onPress={() => {
                        haptic.selection();
                        setSelectedCat({ name: category.name, icon: category.icon, color: category.color });
                      }}
                      style={[
                        styles.categoryRow,
                        {
                          backgroundColor: C.surface,
                          borderColor: index === 0 ? C.surfaceHover : C.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryProgress,
                          buildFillWidthStyle(pct),
                          { backgroundColor: C.primary, opacity: index === 0 ? 1 : index === 1 ? 0.6 : 0.4 },
                        ]}
                      />

                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryIconBox, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                          <Text style={styles.categoryIcon}>{category.icon}</Text>
                        </View>

                        <View style={styles.categoryInfo}>
                          <Text style={[styles.categoryName, { color: C.textMain }]} numberOfLines={1}>
                            {category.name}
                          </Text>
                          <View style={styles.categoryMetaRow}>
                            <Text style={[styles.categoryMeta, { color: C.textMuted }]}>{`${pct.toFixed(1)}% ${t('stats.pct_total')}`.toUpperCase()}</Text>
                            {selectedMonth === 'ALL' && yearDiff !== null ? (
                              <Text style={[styles.categoryTrend, { color: yearDiff > 0 ? C.expenseText : C.primary }]}>
                                {`${yearDiff > 0 ? '↑' : '↓'} ${Math.abs(yearDiff).toFixed(0)}% vs ${prevYear}`}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.categoryAmount, { color: C.textMain }]}>{sym}{formatAmount(category.total, lang)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showPeriodModal} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowPeriodModal(false)}>
        <View style={styles.periodModalOverlay}>
          <TouchableOpacity style={styles.periodModalBackdrop} activeOpacity={1} onPress={() => setShowPeriodModal(false)} />
          <ModalSafeAreaView style={styles.periodModalViewport}>
            <View style={[styles.periodModalCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <Text style={[styles.periodModalTitle, { color: C.textMain }]}>{t('stats.stats').toUpperCase()}</Text>

              <View style={styles.periodSection}>
                <Text style={[styles.periodSectionLabel, { color: C.textMuted }]}>{t('movements.all_years').toUpperCase()}</Text>
                <View style={styles.periodYearGrid}>
                  {availableYears.map((year) => {
                    const active = activeYear === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.periodYearBtn,
                          { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.surfaceHover : C.surfaceAlt },
                        ]}
                        onPress={() => {
                          haptic.selection();
                          setSelectedYear(year);
                          }}
                      >
                        <Text style={[styles.periodYearText, { color: active ? C.textMain : C.textMuted }]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.periodSection}>
                <Text style={[styles.periodSectionLabel, { color: C.textMuted }]}>{t('movements.all_months').toUpperCase()}</Text>
                <View style={styles.periodMonthGrid}>
                  <TouchableOpacity
                    style={[
                      styles.periodMonthBtn,
                      {
                        borderColor: selectedMonth === 'ALL' ? C.primary : C.border,
                        backgroundColor: selectedMonth === 'ALL' ? C.surfaceHover : C.surfaceAlt,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setSelectedMonth('ALL');
                      setShowPeriodModal(false);
                    }}
                  >
                    <Text style={[styles.periodMonthText, { color: selectedMonth === 'ALL' ? C.textMain : C.textMuted }]}>
                      {t('stats.all_year').toUpperCase()}
                    </Text>
                  </TouchableOpacity>

                  {monthNames.map((label, index) => {
                    const value = String(index + 1).padStart(2, '0');
                    const active = selectedMonth === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.periodMonthBtn,
                          { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.surfaceHover : C.surfaceAlt },
                        ]}
                        onPress={() => {
                          haptic.selection();
                          setSelectedMonth(value);
                          setShowPeriodModal(false);
                        }}
                      >
                        <Text style={[styles.periodMonthText, { color: active ? C.textMain : C.textMuted }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.periodDoneBtn, { backgroundColor: C.primary }]}
                onPress={() => setShowPeriodModal(false)}
              >
                <Text style={[styles.periodDoneText, { color: C.primaryText }]}>{t('btn.close').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </ModalSafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={!!selectedCat}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCat(null)}
      >
        {selectedCat ? (
          <StatsCategoryOverlay
            categoryName={selectedCat.name}
            categoryIcon={selectedCat.icon}
            categoryColor={selectedCat.color}
            transactions={filteredTransactions}
            sym={sym}
            onClose={() => setSelectedCat(null)}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    letterSpacing: -0.5,
  },
  periodTrigger: {
    minWidth: 164,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  periodTriggerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 0.8,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1.4,
  },
  loading: {
    marginTop: Spacing.xxl,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  balanceBlock: {
    minWidth: 160,
    flexGrow: 1,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  balanceCurrency: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  balanceAmt: {
    fontSize: 34,
    fontWeight: FontWeight.black,
    letterSpacing: -1,
    lineHeight: 36,
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  summaryPair: {
    flexDirection: 'row',
    gap: Spacing.xl,
    flexWrap: 'wrap',
    flexGrow: 1,
  },
  metricBlock: {
    flex: 1,
    minWidth: 110,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
  },
  summaryAmt: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.black,
  },
  goalSection: {
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
  },
  goalTrack: {
    position: 'relative',
    height: 6,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: Spacing.base,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1.2,
  },
  cardHint: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  trendArea: {
    minHeight: 208,
    position: 'relative',
  },
  avgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 2,
  },
  avgLabel: {
    position: 'absolute',
    right: 0,
    top: -14,
    fontSize: 9,
    fontWeight: FontWeight.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    letterSpacing: 0.5,
  },
  limitLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 3,
  },
  limitLabel: {
    position: 'absolute',
    left: 0,
    top: -14,
    fontSize: 9,
    fontWeight: FontWeight.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    letterSpacing: 0.5,
  },
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 184,
    paddingTop: 18,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barValue: {
    minHeight: 14,
    fontSize: 8,
    fontWeight: FontWeight.black,
  },
  barTrack: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
  },
  barLabel: {
    fontSize: 9,
    fontWeight: FontWeight.black,
    letterSpacing: 0,
  },
  emptyCard: {
    borderWidth: 1,
    padding: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  categoriesList: {
    gap: 8,
  },
  categoryRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryProgress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    letterSpacing: 0.6,
  },
  categoryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categoryMeta: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  categoryTrend: {
    fontSize: 9,
    fontWeight: FontWeight.black,
    letterSpacing: 0.4,
  },
  categoryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.black,
  },
  periodModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  periodModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  periodModalViewport: {
    width: '100%',
  },
  periodModalCard: {
    borderTopWidth: 1,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  periodModalTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
  },
  periodSection: {
    gap: 8,
  },
  periodSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
  },
  periodYearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodYearBtn: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodYearText: {
    fontSize: 11,
    fontWeight: FontWeight.black,
  },
  periodMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodMonthBtn: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodMonthText: {
    fontSize: 10,
    fontWeight: FontWeight.black,
    letterSpacing: 0.4,
  },
  periodDoneBtn: {
    borderRadius: 2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  periodDoneText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    letterSpacing: 0.8,
  },
});
