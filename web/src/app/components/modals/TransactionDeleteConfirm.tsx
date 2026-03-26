import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type TransactionDeleteConfirmProps = {
    onConfirm: () => void;
    onCancel: () => void;
};

const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const RED = 'var(--accent)';

export const TransactionDeleteConfirm = ({ onConfirm, onCancel }: TransactionDeleteConfirmProps) => {
    const { t } = useLanguage();

    return (
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: `1px solid ${BORDER2}`, borderRadius: '14px', width: '100%', boxShadow: '0 40px 90px rgba(0,0,0,0.6)', maxHeight: '92vh', overflowY: 'auto', maxWidth: '340px', padding: '2.25rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${RED}22`, border: `1px solid ${RED}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
                {t('details.delete_order_title')}
            </h2>
            <p style={{ fontSize: '0.82rem', color: MUTED, marginBottom: '1.75rem', lineHeight: 1.5, fontWeight: 500 }}>
                {t('details.delete_order_warning')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <button onClick={onConfirm} style={{ width: '100%', background: RED, border: 'none', borderRadius: '8px', color: 'var(--accent-text)', padding: '0.8rem', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                    {t('btn.delete')}
                </button>
                <button onClick={onCancel} style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: '8px', color: MUTED, padding: '0.8rem', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                    {t('btn.cancel')}
                </button>
            </div>
        </div>
    );
};
