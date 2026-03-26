import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction } from "../../../types";
import { getCurrencySymbol } from '@safed/shared/currency';
import { useSubViewHistory } from '../../../hooks/useSubViewHistory';
import { useLanguage } from '../../../context/LanguageContext';
import { parseDate } from '../movements/movements.utils';

import { StatsResumenCard } from './StatsResumenCard';
import { StatsSpendingTrend } from './StatsSpendingTrend';
import { StatsTopCategories } from './StatsTopCategories';
import { StatsCategoryOverlay } from './StatsCategoryOverlay';

type StatsTabProps = {
    transactions: Transaction[];
    globalCurrency: string;
    monthlyGoal: number;
};

// ── Design tokens ──────────────────────────────────────────
const SURFACE = 'var(--surface)';
const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const GREEN = 'var(--w-stats-primary, var(--primary))';

const sectionLabel: React.CSSProperties = {
    fontSize: '0.58rem',
    fontWeight: 800,
    color: MUTED,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
};

export const StatsTab = ({ transactions, globalCurrency, monthlyGoal }: StatsTabProps) => {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const sym = getCurrencySymbol(globalCurrency);
    const currentYear = new Date().getFullYear().toString();
    const { t } = useLanguage();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Android back button: drill-down → stats list
    useSubViewHistory(
        selectedCategory !== null,
        useCallback(() => setSelectedCategory(null), [])
    );

    const getYearMonth = (dateStr: string) => {
        const parsed = parseDate(dateStr);
        if (parsed.getTime() === 0) return { year: '', month: '' };
        return {
            year: parsed.getFullYear().toString(),
            month: String(parsed.getMonth() + 1).padStart(2, '0')
        };
    };

    const availableYears = Array.from(new Set(transactions.map(t => getYearMonth(t.date).year).filter(y => y.length === 4))).sort().reverse();
    if (availableYears.length === 0) availableYears.push(currentYear);
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) setSelectedYear(availableYears[0]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const { year, month } = getYearMonth(t.date);
            if (year !== selectedYear) return false;
            if (selectedMonth !== 'ALL' && month !== selectedMonth) return false;
            return true;
        });
    }, [transactions, selectedYear, selectedMonth]);

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    const expensesForGoal = filteredTransactions.filter(t => t.type === 'expense' && !t.excludeFromBudget);
    const totalExpenseForGoal = expensesForGoal.reduce((acc, t) => acc + t.amount, 0);
    const progress = Math.min((totalExpenseForGoal / monthlyGoal) * 100, 100);

    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals = expenses.reduce((acc, t) => {
        acc[t.tag] = (acc[t.tag] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
    const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

    const trendData = useMemo(() => {
        const monthTotals = new Array(12).fill(0);
        transactions.forEach(t => {
            if (t.type === 'income' || t.excludeFromBudget) return;
            const { year, month } = getYearMonth(t.date);
            if (year === selectedYear && month.length === 2) {
                const mIdx = parseInt(month, 10) - 1;
                if (mIdx >= 0 && mIdx < 12) monthTotals[mIdx] += t.amount;
            }
        });
        return monthTotals;
    }, [transactions, selectedYear]);

    const maxTrend = Math.max(...trendData, monthlyGoal, 1);
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    const nonZeroMonths = trendData.filter(v => v > 0);
    const avgSpend = nonZeroMonths.length > 0 ? nonZeroMonths.reduce((a, b) => a + b, 0) / nonZeroMonths.length : 0;

    const prevYear = (parseInt(selectedYear) - 1).toString();
    const prevYearCatTotals = useMemo(() => {
        return transactions
            .filter(t => { const { year } = getYearMonth(t.date); return year === prevYear && t.type === 'expense'; })
            .reduce((acc, t) => { acc[t.tag] = (acc[t.tag] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    }, [transactions, prevYear]);

    return (
        <div data-color-zone="stats" style={{ paddingBottom: '3rem', position: 'relative', color: TEXT }}>
            {/* ── TOP BAR ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
                    {t('stats.stats')}
                </h1>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* Month selector */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            style={{ appearance: 'none' as any, background: SURFACE, color: TEXT, border: `1px solid ${BORDER2}`, borderRadius: '4px', padding: '0.45rem 1.75rem 0.45rem 0.8rem', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <option value="ALL">{t('stats.all_year')}</option>
                            {monthNames.map((m, i) => (
                                <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
                            ))}
                        </select>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5" style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    {/* Year pill */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            style={{ appearance: 'none' as any, background: GREEN, color: 'var(--primary-text)', border: 'none', borderRadius: '4px', padding: '0.45rem 1.5rem 0.45rem 0.85rem', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.06em', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" strokeWidth="2.5" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    {/* Bell (Hidden on mobile) */}
                    {!isMobile && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            <div style={sectionLabel}>
                {selectedMonth === 'ALL' ? t('stats.annual_report') : t('stats.monthly_report')}
            </div>

            <StatsResumenCard
                currentBalance={currentBalance}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                monthlyGoal={monthlyGoal}
                progress={progress}
                selectedMonth={selectedMonth}
                sym={sym}
            />

            <StatsSpendingTrend
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                trendData={trendData}
                maxTrend={maxTrend}
                avgSpend={avgSpend}
                monthlyGoal={monthlyGoal}
                sym={sym}
                monthNames={monthNames}
            />

            <StatsTopCategories
                selectedMonth={selectedMonth}
                monthNames={monthNames}
                sortedCategories={sortedCategories}
                totalExpense={totalExpense}
                transactions={transactions}
                setSelectedCategory={setSelectedCategory}
                sym={sym}
                prevYearCatTotals={prevYearCatTotals}
                prevYear={prevYear}
            />

            {selectedCategory && (
                <StatsCategoryOverlay
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    filteredTransactions={filteredTransactions}
                    sym={sym}
                />
            )}
        </div>
    );
};
