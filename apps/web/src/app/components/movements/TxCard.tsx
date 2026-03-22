import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { getTxIcon, formatDate } from './movements.utils';
import { useLanguage } from '../../../context/LanguageContext';

const TOKEN = {
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    green: 'var(--primary)',
    red: 'var(--accent)',
} as const;

const TxBadge = ({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) => (
    <span style={{ fontSize: '0.5rem', background: bg, color, padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800 }}>
        {children}
    </span>
);

type TxCardProps = {
    tx: Transaction;
    sym: string;
    onClick: () => void;
};

export const TxCard = ({ tx, sym, onClick }: TxCardProps) => {
    const { t } = useLanguage();

    return (
        <div
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', cursor: 'pointer', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-dim)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--surface) 70%, #fff 30%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
        >
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--w-tx-icon-bg, var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                {getTxIcon(tx)}
            </div>

            <div style={{ flex: 1, minWidth: 0, margin: '0 0.85rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: TOKEN.text, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.desc}
                </div>
                <div style={{ fontSize: '0.62rem', color: TOKEN.muted, fontWeight: 600, marginTop: '0.15rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {tx.tag} • {formatDate(tx.date)}
                    {tx.goalType === 'mensual' && <TxBadge color={TOKEN.green} bg="var(--surface-alt)">{t('movements.badge_monthly')}</TxBadge>}
                    {tx.goalType === 'periodo' && <TxBadge color={TOKEN.green} bg="var(--surface-alt)">{t('movements.badge_recurring_n', { count: tx.periodicity ?? '' } as any)}</TxBadge>}
                    {tx.isCancelled && <TxBadge color={TOKEN.red} bg={`${TOKEN.red}22`}>{t('movements.badge_cancelled')}</TxBadge>}
                </div>
            </div>

            <div style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? TOKEN.red : TOKEN.green, fontFamily: 'var(--font-display)' }}>
                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
            </div>
        </div>
    );
};
