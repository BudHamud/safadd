import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type StatsCategoryOverlayProps = {
    selectedCategory: string;
    setSelectedCategory: (cat: string | null) => void;
    filteredTransactions: Transaction[];
    sym: string;
};

const BG = 'var(--bg)';
const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const STATS_BG = 'var(--w-stats-bg, var(--surface))';
const GREEN = 'var(--w-stats-primary, var(--primary))';
const RED = 'var(--w-stats-accent, var(--accent))';

export const StatsCategoryOverlay = ({
    selectedCategory, setSelectedCategory, filteredTransactions, sym
}: StatsCategoryOverlayProps) => {
    const { t } = useLanguage();

    return (
        <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 3000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Sticky header */}
            <div style={{
                position: 'sticky', top: 0, background: BG,
                borderBottom: `1px solid ${BORDER}`,
                padding: `calc(1.25rem + env(safe-area-inset-top, 0px)) 1.5rem 1.25rem 1.5rem`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
            }}>
                <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        {t('stats.cat_breakdown')}
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
                        {selectedCategory}
                    </h2>
                </div>
                <button
                    onClick={() => setSelectedCategory(null)}
                    style={{ background: STATS_BG, border: `1px solid ${BORDER2}`, borderRadius: '0', color: TEXT, padding: '0.6rem 1.1rem', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    {t('btn.back')}
                </button>
            </div>

            {/* Transactions list */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredTransactions.filter(t => t.tag === selectedCategory).map(tx => (
                    <div
                        key={tx.id}
                        style={{ background: STATS_BG, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: TEXT, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{tx.desc}</div>
                            <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, marginTop: '0.2rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tx.date}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: tx.type === 'expense' ? RED : GREEN, flexShrink: 0, letterSpacing: '-0.01em' }}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
                        </div>
                    </div>
                ))}
                {filteredTransactions.filter(t => t.tag === selectedCategory).length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: MUTED, fontSize: '0.82rem', fontWeight: 700 }}>
                        {t('stats.no_txs_period')}
                    </div>
                )}
            </div>
        </div>
    );
};
