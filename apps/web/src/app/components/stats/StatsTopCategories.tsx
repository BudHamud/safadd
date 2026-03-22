import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type StatsTopCategoriesProps = {
    selectedMonth: string;
    monthNames: string[];
    sortedCategories: [string, number][];
    totalExpense: number;
    transactions: Transaction[];
    setSelectedCategory: (cat: string) => void;
    sym: string;
    prevYearCatTotals: Record<string, number>;
    prevYear: string;
};

const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const SURF2 = 'var(--surface-alt)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const STATS_BG = 'var(--w-stats-bg, var(--surface))';
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

export const StatsTopCategories = ({
    selectedMonth, monthNames, sortedCategories, totalExpense, transactions, setSelectedCategory, sym, prevYearCatTotals, prevYear
}: StatsTopCategoriesProps) => {
    const { t } = useLanguage();

    return (
        <>
            <div style={{ ...sectionLabel, marginBottom: '0.7rem' }}>
                {t('stats.top_cats')} {selectedMonth !== 'ALL' && `(${monthNames[parseInt(selectedMonth) -  1]})`}
            </div>
            {sortedCategories.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: MUTED, fontWeight: 700, fontSize: '0.82rem', background: STATS_BG, border: `1px solid ${BORDER}`, borderRadius: '0' }}>
                    {t('stats.no_expenses')}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sortedCategories.map(([cat, amount], idx) => {
                        const txForCat = transactions.find(t => t.tag === cat);
                        const catIcon = txForCat?.icon && txForCat.icon.length < 5 ? txForCat.icon : '💳';
                        const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0.0';
                        const isTop = idx === 0;

                        return (
                            <div
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    background: STATS_BG,
                                    border: `1px solid ${isTop ? BORDER2 : BORDER}`,
                                    borderRadius: '0',
                                    padding: '0.9rem 1.1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                    transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER2}
                                onMouseLeave={e => e.currentTarget.style.borderColor = isTop ? BORDER2 : BORDER}
                            >
                                {/* Vivid bottom progress bar */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pct}%`, background: GREEN, opacity: idx === 0 ? 1 : idx === 1 ? 0.6 : 0.4, zIndex: 2, transition: 'width 0.8s ease' }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', zIndex: 1 }}>
                                    {/* Icon box */}
                                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: SURF2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        {catIcon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT }}>
                                            {cat}
                                        </div>
                                        <div style={{ fontSize: '0.58rem', color: MUTED, fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {pct}% {t('stats.pct_total')}
                                            {/* Trend indicator vs prev year (only in annual view) */}
                                            {selectedMonth === 'ALL' && (() => {
                                                const prev = prevYearCatTotals[cat] || 0;
                                                if (prev === 0) return null;
                                                const diff = ((amount - prev) / prev) * 100;
                                                const isUp = diff > 0;
                                                return (
                                                    <span style={{ color: isUp ? 'var(--accent)' : 'var(--primary)', fontWeight: 900, fontSize: '0.52rem' }}>
                                                        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}% vs {prevYear}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontWeight: 900, fontSize: '1rem', color: TEXT, zIndex: 1, letterSpacing: '-0.01em', flexShrink: 0 }}>
                                    {formatCurrency(amount, sym)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};
