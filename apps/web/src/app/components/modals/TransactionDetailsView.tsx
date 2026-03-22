import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { formatDate } from '../movements/movements.utils';
import { useLanguage } from '../../../context/LanguageContext';

type TransactionDetailsViewProps = {
    transaction: Transaction;
    sym: string;
    onEdit: () => void;
    onDeleteRequest: () => void;
};

const SURFACE = 'var(--surface)';
const SURFACE2 = 'var(--surface-alt)';
const BORDER = 'var(--border)';
const BORDER2 = 'var(--surface-hover)';
const TEXT = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const GREEN = 'var(--primary)';
const RED = 'var(--accent)';

const fieldLbl: React.CSSProperties = {
    display: 'block',
    fontSize: '0.55rem',
    fontWeight: 800,
    color: MUTED,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: '0.35rem',
};

export const TransactionDetailsView = ({ transaction, sym, onEdit, onDeleteRequest }: TransactionDetailsViewProps) => {
    const { t } = useLanguage();

    const isExpense = transaction.type === 'expense';
    const amountColor = isExpense ? RED : GREEN;

    return (
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: `1px solid ${BORDER2}`, borderRadius: '14px', width: '100%', boxShadow: '0 40px 90px rgba(0,0,0,0.6)', maxHeight: '92vh', overflowY: 'auto', maxWidth: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1.25rem 1.4rem 1rem', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: SURFACE2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', flexShrink: 0 }}>
                    {transaction.icon && transaction.icon.length < 5 ? transaction.icon : '💳'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {transaction.desc}
                    </div>
                    <div style={{ fontSize: '0.57rem', color: MUTED, fontWeight: 700, marginTop: '0.18rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {t('details.verified_transaction')}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: '20px', padding: '0.22rem 0.6rem', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {transaction.tag}
                    </span>
                    {transaction.goalType && (
                        <span style={{ background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '0.18rem 0.5rem', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {transaction.goalType === 'meta' ? t('details.goal_badge') : transaction.goalType === 'periodo' ? t('details.period_badge') : t('details.monthly_badge')}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem 0 0.5rem' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        {t('details.total_amount')}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: amountColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {isExpense ? '−' : '+'}{formatCurrency(transaction.amount, sym)}
                    </div>
                </div>

                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                    <span style={fieldLbl}>{t('details.operation_date')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT, letterSpacing: '0.02em' }}>
                            {formatDate(transaction.date)}
                        </span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                </div>

                {transaction.paymentMethod && (
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                        <span style={fieldLbl}>{t('field.payment_method')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                {transaction.paymentMethod === 'tarjeta' ? `💳 ${t('details.card')}` : `💵 ${t('details.cash')}`}
                                {transaction.paymentMethod === 'tarjeta' && transaction.cardDigits && (
                                    <span style={{ marginLeft: '0.5rem', color: MUTED, fontSize: '0.85rem', letterSpacing: '0.1em' }}>•••• •••• •••• {transaction.cardDigits}</span>
                                )}
                            </span>
                        </div>
                    </div>
                )}

                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '0.8rem 1rem' }}>
                    <span style={fieldLbl}>{t('field.description')}</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: transaction.details ? TEXT : MUTED, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {transaction.details || t('details.no_description')}
                    </p>
                </div>

                <div style={{ padding: '0 0.5rem', marginTop: '-0.2rem' }}>
                    <div style={{ fontSize: '0.52rem', color: MUTED, opacity: 0.5, fontWeight: 700, letterSpacing: '0.05em' }}>
                        ID REF: {transaction.id}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button
                        onClick={onEdit}
                        style={{ width: '100%', background: GREEN, border: 'none', borderRadius: '9px', color: 'var(--primary-text)', padding: '0.85rem', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t('details.edit_record')}
                    </button>
                    <button
                        onClick={onDeleteRequest}
                        style={{ width: '100%', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: '9px', color: MUTED, padding: '0.85rem', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'color 0.15s, border-color 0.15s' }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                        {t('btn.delete')}
                    </button>
                </div>
            </div>
        </div>
    );
};
