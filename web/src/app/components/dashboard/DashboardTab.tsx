import React, { useEffect, useState } from 'react';
import { Transaction } from "../../../types";
import { getCurrencySymbol } from '@safed/shared/currency';
import { useLanguage } from '../../../context/LanguageContext';
import { parseDate } from '../movements/movements.utils';
import { BalanceCard } from './BalanceCard';
import { GoalCard } from './GoalCard';
import { TopCatsCard } from './TopCatsCard';
import { RecentActivityCard } from './RecentActivityCard';
import { PaymentSheetCard } from './PaymentSheetCard';

type DashboardTabProps = {
    transactions: Transaction[];
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
    monthlyGoal: number;
    savingsTarget: number;
    onTransactionClick: (tx: Transaction) => void;
    globalCurrency: string;
    isTravelMode?: boolean;
    toggleTravelMode?: () => Promise<void>;
    onAddClick?: () => void;
    allTransactions?: Transaction[];
    setIsAddModalOpen?: (open: boolean) => void;
    setAddModalInitialData?: (data: Partial<Transaction> | null) => void;
};

function useWindowWidth() {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return width;
}

export const DashboardTab = ({
    transactions, totalIncome, totalExpense, currentBalance,
    monthlyGoal, savingsTarget, onTransactionClick, globalCurrency,
    isTravelMode, toggleTravelMode, onAddClick, allTransactions,
    setIsAddModalOpen, setAddModalInitialData,
}: DashboardTabProps) => {
    const windowWidth = useWindowWidth();
    const { t, lang } = useLanguage();

    const isMobile = windowWidth < 640;
    const isTablet = windowWidth < 960;
    const sym = getCurrencySymbol(globalCurrency);

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const curMonthName = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', { month: 'long' }).format(now);

    // Current month stats
    const currentMonthTxs = transactions.filter(t => {
        const d = parseDate(t.date);
        return d.getMonth() === curMonth && d.getFullYear() === curYear || t.date === 'Hoy' || t.date === 'Ayer';
    });
    const monthIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expensesForGoal = currentMonthTxs.filter(t => t.type === 'expense' && !t.excludeFromBudget);
    const totalExpenseForGoal = expensesForGoal.reduce((acc, curr) => acc + curr.amount, 0);
    const progressPct = monthlyGoal > 0 ? Math.min((totalExpenseForGoal / monthlyGoal) * 100, 100) : 0;

    // Spending change vs last month
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    const prevMonthSpending = transactions
        .filter(t => { const d = parseDate(t.date); return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense' && !t.excludeFromBudget; })
        .reduce((acc, t) => acc + t.amount, 0);
    const spendingChangePct = prevMonthSpending > 0 ? ((totalExpenseForGoal - prevMonthSpending) / prevMonthSpending) * 100 : 0;

    // Top categories donut
    const catTotals = expensesForGoal.reduce((acc, tx) => { acc[tx.tag] = (acc[tx.tag] || 0) + tx.amount; return acc; }, {} as Record<string, number>);
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topSum = topCats.reduce((acc, c) => acc + c[1], 0);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const topCatSegments = topCats.map((cat, index) => {
        const pct = topSum > 0 ? (cat[1] / topSum) * 100 : 0;
        const segmentDasharray = `${(pct / 100) * circumference} ${circumference}`;
        const previousAmount = topCats.slice(0, index).reduce((acc, [, amount]) => acc + amount, 0);
        const segmentDashoffset = -((topSum > 0 ? previousAmount / topSum : 0) * circumference);
        return { tag: cat[0], pct, segmentDasharray, segmentDashoffset, amount: cat[1] };
    });

    // Payment checklist
    const sourceForFixed = allTransactions || transactions;
    const monthlyMasterMap = new Map<string, { latest: Transaction; isPaid: boolean; day: number; label: string }>();
    sourceForFixed.forEach(t => {
        if (t.type !== 'expense') return;
        if ((t.goalType !== 'mensual' && t.goalType !== 'periodo') || t.isCancelled) return;
        const cleanDesc = t.desc.trim().toLowerCase();
        const key = `${cleanDesc}-${t.tag.trim().toLowerCase()}`;
        const txDate = parseDate(t.date);
        let isDueThisMonth = false;
        if (t.goalType === 'mensual') { isDueThisMonth = true; }
        else if (t.goalType === 'periodo' && t.periodicity) {
            const monthsDiff = (curYear * 12 + curMonth) - (txDate.getFullYear() * 12 + txDate.getMonth());
            if (monthsDiff >= 0 && monthsDiff % t.periodicity === 0) isDueThisMonth = true;
        }
        if (!isDueThisMonth) return;
        const isPaidThisMonth = (txDate.getMonth() === curMonth && txDate.getFullYear() === curYear) || t.date === 'Hoy';
        const existing = monthlyMasterMap.get(key);
        if (!existing || parseDate(existing.latest.date) < txDate) {
            monthlyMasterMap.set(key, { latest: t, isPaid: (existing?.isPaid || isPaidThisMonth), day: txDate.getDate(), label: t.desc.trim() });
        } else if (isPaidThisMonth) { existing.isPaid = true; }
    });
    const fixedTxsData = Array.from(monthlyMasterMap.values()).sort((a, b) => {
        if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
        return a.day - b.day;
    });

    return (
        <div data-color-zone="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: isMobile ? '0' : '1rem' }}>
            {/* Top row: 3 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
                <BalanceCard
                    currentBalance={currentBalance} monthIncome={monthIncome}
                    totalExpenseForGoal={totalExpenseForGoal} progressPct={progressPct}
                    spendingChangePct={spendingChangePct} sym={sym} isTravelMode={isTravelMode}
                />
                <GoalCard monthlyGoal={monthlyGoal} totalExpenseForGoal={totalExpenseForGoal} progressPct={progressPct} sym={sym} />
                {!isMobile && (
                    <TopCatsCard topCatSegments={topCatSegments} radius={radius} circumference={circumference} />
                )}
            </div>

            {/* Bottom row: activity + payment sheet */}
            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <RecentActivityCard recentTx={transactions.slice(0, 7)} sym={sym} onTransactionClick={onTransactionClick} />
                <PaymentSheetCard
                    fixedTxsData={fixedTxsData} curMonthName={curMonthName} sym={sym}
                    globalCurrency={globalCurrency} onTransactionClick={onTransactionClick}
                    setIsAddModalOpen={setIsAddModalOpen} setAddModalInitialData={setAddModalInitialData}
                />
            </div>
        </div>
    );
};
