import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type StatsSpendingTrendProps = {
    selectedYear: string;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    trendData: number[];
    maxTrend: number;
    avgSpend: number;
    monthlyGoal: number;
    sym: string;
    monthNames: string[];
};

const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const SURF2 = 'var(--surface-alt)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const MUTED2 = 'var(--border-dim)';
const STATS_BG = 'var(--w-stats-bg, var(--surface))';
const GREEN = 'var(--w-stats-primary, var(--primary))';
const RED = 'var(--w-stats-accent, var(--accent))';

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

export const StatsSpendingTrend = ({
    selectedYear, selectedMonth, setSelectedMonth, trendData, maxTrend, avgSpend, monthlyGoal, sym, monthNames
}: StatsSpendingTrendProps) => {
    const { t } = useLanguage();
    const BAR_AREA_H = 160;

    return (
        <>
            <div style={{ ...sectionLabel, marginBottom: '0.7rem' }}>
                <span style={{ width: '7px', height: '7px', background: GREEN, borderRadius: '1px', display: 'inline-block', flexShrink: 0 }} />
                {t('stats.spending_trend')} ({selectedYear})
            </div>
            <div style={{ background: STATS_BG, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '1.25rem 1.25rem 1rem', marginBottom: '1.75rem', overflowX: 'auto' }}>
                <div style={{ minWidth: '480px', position: 'relative' }}>
                    {/* Average line */}
                    {avgSpend > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: `calc(1.5rem + ${(avgSpend / maxTrend) * BAR_AREA_H}px)`,
                            left: 0, right: 0,
                            borderTop: `1px dashed rgba(224,221,212,0.25)`,
                            zIndex: 9, pointerEvents: 'none',
                        }}>
                            <span style={{
                                position: 'absolute', right: '0', top: '-14px',
                                fontSize: '0.48rem', fontWeight: 800, color: 'rgba(224,221,212,0.45)',
                                background: STATS_BG, padding: '2px 5px', borderRadius: '4px',
                                letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>
                                {t('stats.avg')} {formatCurrency(avgSpend, sym)}
                            </span>
                        </div>
                    )}

                    {/* Goal line */}
                    {monthlyGoal > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: `calc(1.5rem + ${(monthlyGoal / maxTrend) * BAR_AREA_H}px)`,
                            left: 0, right: 0,
                            borderTop: `1px dashed ${RED}`,
                            zIndex: 10, pointerEvents: 'none',
                        }}>
                            <span style={{
                                position: 'absolute', left: '0', top: '-14px',
                                fontSize: '0.5rem', fontWeight: 900, color: RED,
                                background: STATS_BG, padding: '2px 6px', borderRadius: '4px',
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                                {t('stats.limit_label')} {formatCurrency(monthlyGoal, sym)}
                            </span>
                        </div>
                    )}

                    {/* Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: `${BAR_AREA_H + 24}px`, paddingBottom: '1.5rem', justifyContent: 'space-between' }}>
                        {trendData.map((val, i) => {
                            const heightPx = (val / maxTrend) * BAR_AREA_H;
                            const isSelected = selectedMonth === (i + 1).toString().padStart(2, '0');
                            const isOverGoal = monthlyGoal > 0 && val > monthlyGoal;
                            const barColor = isSelected ? TEXT : isOverGoal ? RED : GREEN;

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedMonth((i + 1).toString().padStart(2, '0'))}
                                    title={`${sym}${val.toFixed(0)}`}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer', height: '100%', justifyContent: 'flex-end' }}
                                >
                                    <div style={{ fontSize: '0.42rem', fontWeight: 800, color: isSelected ? TEXT : MUTED2, marginBottom: '3px', textAlign: 'center', lineHeight: 1.2 }}>
                                        {val > 0 ? (val > 999 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)) : ''}
                                    </div>
                                    <div style={{ width: '100%', height: `${BAR_AREA_H}px`, background: SURF2, borderRadius: '0', position: 'relative', overflow: 'hidden', border: isSelected ? `1px solid ${BORDER2}` : `1px solid ${BORDER}` }}>
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            height: `${heightPx}px`,
                                            background: barColor,
                                            opacity: isSelected ? 1 : 0.8,
                                            borderRadius: '0',
                                            transition: 'height 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        }}>
                                            {isOverGoal && (
                                                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.06) 4px, rgba(255,255,255,0.06) 8px)' }} />
                                            )}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.52rem', fontWeight: 800, color: isSelected ? TEXT : MUTED, marginTop: '0.35rem', letterSpacing: '0.06em' }}>
                                        {monthNames[i]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};
