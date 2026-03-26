import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type StatsResumenCardProps = {
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
    monthlyGoal: number;
    progress: number;
    selectedMonth: string;
    sym: string;
};

const BORDER = 'var(--border)';
const SURF2 = 'var(--surface-alt)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const STATS_BG = 'var(--w-stats-bg, var(--surface))';
const GREEN = 'var(--w-stats-primary, var(--primary))';
const RED = 'var(--w-stats-accent, var(--accent))';

export const StatsResumenCard = ({
    currentBalance, totalIncome, totalExpense, monthlyGoal, progress, selectedMonth, sym
}: StatsResumenCardProps) => {
    const { t } = useLanguage();

    return (
        <div style={{ background: STATS_BG, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '1.4rem 1.5rem', marginBottom: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Balance */}
            <div style={{ flex: '1 1 180px' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    {t('stats.liquidity')}
                </div>
                <div style={{ fontSize: '2.6rem', fontWeight: 900, color: currentBalance >= 0 ? TEXT : RED, lineHeight: 1, letterSpacing: '-0.03em', display: 'flex', alignItems: 'flex-start', gap: '0.15rem' }}>
                    <span style={{ fontSize: '1.1rem', color: MUTED, marginTop: '0.35rem' }}>{sym}</span>
                    {(Math.floor((Math.abs(currentBalance) + 0.00000001) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', background: BORDER, alignSelf: 'stretch', flexShrink: 0 }} />

            {/* Income + Expense */}
            <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN, flexShrink: 0, display: 'inline-block' }} />
                        {t('stats.income')}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: GREEN, letterSpacing: '-0.01em' }}>
                        +{formatCurrency(totalIncome, sym)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />
                        {t('stats.expenses_label')}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: RED, letterSpacing: '-0.01em' }}>
                        -{formatCurrency(totalExpense, sym)}
                    </div>
                </div>
            </div>

            {/* Progress bar (only in month view) */}
            {selectedMonth !== 'ALL' && monthlyGoal > 0 && (
                <div style={{ width: '100%', borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.57rem', fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        <span>{t('stats.goal_consumption')}</span>
                        <span style={{ color: progress >= 100 ? RED : TEXT }}>{progress.toFixed(0)}% · {formatCurrency(monthlyGoal, sym)}</span>
                    </div>
                    <div style={{ height: '6px', background: SURF2, borderRadius: '0', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? RED : GREEN, borderRadius: '0', transition: 'width 0.8s ease' }} />
                    </div>
                </div>
            )}
        </div>
    );
};
