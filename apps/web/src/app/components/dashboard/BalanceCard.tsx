import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type Props = {
    currentBalance: number;
    monthIncome: number;
    totalExpenseForGoal: number;
    progressPct: number;
    spendingChangePct: number;
    sym: string;
    isTravelMode?: boolean;
};

export const BalanceCard = ({
    currentBalance, monthIncome, totalExpenseForGoal, progressPct, spendingChangePct, sym, isTravelMode,
}: Props) => {
    const { t } = useLanguage();

    const isNeg = currentBalance < 0;
    const isLow = !isNeg && monthIncome > 0 && (currentBalance / monthIncome) < 0.1;
    const isSolid = !isNeg && !isLow && monthIncome > 0 && (currentBalance / monthIncome) > 0.4;
    const badgeBg = isNeg ? 'var(--accent)' : isLow ? '#78350f' : 'var(--primary)';
    const badgeFg = isNeg ? 'var(--accent-text)' : isLow ? '#fbbf24' : 'var(--primary-text)';
    const badgeLabel = isNeg
        ? t('dashboard.status_red')
        : isLow ? t('dashboard.status_tight')
        : isSolid ? t('dashboard.status_solid')
        : t('dashboard.status_stable');

    return (
        <div style={{
            background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
            borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden', minHeight: '140px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {isTravelMode ? t('dashboard.travel_budget') : t('dashboard.liquidity')}
                </span>
                <span style={{ background: badgeBg, color: badgeFg, fontSize: '0.55rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.05em' }}>
                    {badgeLabel}
                </span>
            </div>

            <div style={{ marginTop: '0.95rem' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {formatCurrency(currentBalance, sym)}
                </div>

                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: spendingChangePct > 0 ? 'var(--accent)' : 'var(--primary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {spendingChangePct > 0 ? '↗' : '↘'} {Math.abs(spendingChangePct).toFixed(1)}%{' '}
                    {spendingChangePct > 0 ? t('dashboard.spending_more') : t('dashboard.spending_less')}
                </div>
            </div>

            {/* Dynamic wave */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.08 + (progressPct / 200), transition: 'all 1s ease-in-out' }}>
                <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: '100%', height: `${30 + (progressPct * 0.4)}px`, display: 'block', transition: 'height 1s ease-in-out' }}>
                    <path d="M0,20 L0,12 Q25,20 50,10 T100,4 L100,20 Z" fill={progressPct > 80 ? 'var(--accent)' : 'var(--primary)'} />
                </svg>
            </div>
        </div>
    );
};
