import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';
import { SidebarData } from './useMovementsLogic';

const TOKEN = {
    dark: 'var(--surface)',
    border: 'var(--border-dim)',
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    green: 'var(--primary)',
    red: 'var(--accent)',
    surface: 'var(--surface-alt)',
} as const;

// ── Balance summary ──────────────────────────────────────────────────────────

const SidebarBalance = ({ balance, income, expense, sym }: { balance: number; income: number; expense: number; sym: string }) => {
    const { t } = useLanguage();
    return (
        <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase' }}>{t('common.balance')}</div>
                <div style={{ width: '28px', height: '28px', background: TOKEN.surface, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TOKEN.green} strokeWidth="2.5">
                        <rect x="2" y="5" width="20" height="14" /><line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: balance >= 0 ? TOKEN.text : TOKEN.red, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {formatCurrency(balance, sym)}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {[{ label: t('common.income_arrow'), color: TOKEN.green, val: income }, { label: t('common.expense_arrow'), color: TOKEN.red, val: expense }].map(row => (
                    <div key={row.label}>
                        <div style={{ fontSize: '0.55rem', color: row.color, fontWeight: 700 }}>{row.label}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: TOKEN.text }}>{formatCurrency(row.val, sym)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Goal donut ───────────────────────────────────────────────────────────────

const SidebarGoal = ({ goalPct, goalSpent, goalLimit, sym }: { goalPct: number; goalSpent: number; goalLimit: number; sym: string }) => {
    const { t } = useLanguage();
    const RADIUS = 46;
    const circ = 2 * Math.PI * RADIUS;
    const dash = circ - (goalPct / 100) * circ;

    if (goalLimit === 0) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: TOKEN.surface, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t('movements.no_goal')}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontWeight: 600 }}>{t('movements.set_goal')}</div>
            </div>
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '0.25rem 0' }}>
                <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                    <circle cx="60" cy="60" r={RADIUS} stroke="var(--border-dim)" strokeWidth="14" fill="none" />
                    <circle cx="60" cy="60" r={RADIUS} stroke={goalPct >= 100 ? TOKEN.red : TOKEN.green} strokeWidth="14" fill="none"
                        strokeDasharray={circ} strokeDashoffset={dash}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                        transform="rotate(-90 60 60)" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: TOKEN.text }}>{Math.round(goalPct)}%</span>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[{ label: t('common.spent'), val: goalSpent }, { label: t('common.limit'), val: goalLimit }].map(({ label, val }) => (
                    <div key={label} style={label === t('common.limit') ? { textAlign: 'right' } : {}}>
                        <div style={{ fontSize: '0.55rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: TOKEN.text }}>{formatCurrency(val, sym)}</div>
                    </div>
                ))}
            </div>
        </>
    );
};

// ── Fixed vs variable bars ───────────────────────────────────────────────────

const SidebarFixedVar = ({ fixedPct, varPct, fixedAmt, varAmt, sym }: { fixedPct: number; varPct: number; fixedAmt: number; varAmt: number; sym: string }) => {
    const { t } = useLanguage();
    const rows = [
        { label: t('movements.fixed_expenses'), pct: fixedPct, amt: fixedAmt, color: TOKEN.green },
        { label: t('movements.variable_expenses'), pct: varPct, amt: varAmt, color: TOKEN.red },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {rows.map(row => (
                <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: TOKEN.text }}>{row.label}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TOKEN.muted }}>{row.pct}%</span>
                    </div>
                    <div style={{ height: '5px', background: TOKEN.surface, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{formatCurrency(row.amt, sym)}</div>
                </div>
            ))}
        </div>
    );
};

// ── Top categories bar chart ─────────────────────────────────────────────────

const SidebarTopCats = ({ topCats, maxCat, sym }: { topCats: [string, number][]; maxCat: number; sym: string }) => {
    const { t } = useLanguage();
    const BAR_COLORS = [TOKEN.green, TOKEN.red, 'var(--border)'];
    if (topCats.length === 0) return <div style={{ fontSize: '0.7rem', color: TOKEN.muted }}>{t('common.no_data')}</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {topCats.map(([cat, amt], i) => (
                <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TOKEN.text, textTransform: 'capitalize' }}>{cat}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: TOKEN.muted }}>{formatCurrency(amt, sym)}</span>
                    </div>
                    <div style={{ height: '4px', background: TOKEN.surface, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: `${(amt / maxCat) * 100}%`, background: BAR_COLORS[i] ?? BAR_COLORS[2], transition: 'width 0.8s ease' }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Main sidebar panel ───────────────────────────────────────────────────────

type Props = {
    sidebar: SidebarData;
    sym: string;
    fullWidth?: boolean;
};

export const MovementsSidebar = ({ sidebar, sym, fullWidth }: Props) => {
    const { t } = useLanguage();
    return (
        <div style={{ width: fullWidth ? '100%' : '220px', flexShrink: 0 }}>
            <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '10px', padding: '1.1rem' }}>
                {/* Period label */}
                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: TOKEN.green, flexShrink: 0, display: 'inline-block' }} />
                    {sidebar.label}
                </div>

                <SidebarBalance balance={sidebar.balance} income={sidebar.income} expense={sidebar.expense} sym={sym} />

                {/* Middle widget */}
                <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                        {sidebar.isMonth ? t('movements.sidebar_goal') : t('movements.sidebar_fixed_var')}
                    </div>
                    {sidebar.isMonth
                        ? <SidebarGoal goalPct={sidebar.goalPct} goalSpent={sidebar.goalSpent} goalLimit={sidebar.goalLimit} sym={sym} />
                        : <SidebarFixedVar fixedPct={sidebar.fixedPct} varPct={sidebar.varPct} fixedAmt={sidebar.fixedAmt} varAmt={sidebar.varAmt} sym={sym} />
                    }
                </div>

                {/* Top categories */}
                <div>
                    <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.7rem' }}>{t('movements.sidebar_top_cats')}</div>
                    <SidebarTopCats topCats={sidebar.topCats} maxCat={sidebar.maxCat} sym={sym} />
                </div>
            </div>
        </div>
    );
};
