import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type FixedItem = {
    latest: Transaction;
    isPaid: boolean;
    day: number;
    label: string;
};

type Props = {
    fixedTxsData: FixedItem[];
    curMonthName: string;
    sym: string;
    globalCurrency: string;
    onTransactionClick: (tx: Transaction) => void;
    setIsAddModalOpen?: (open: boolean) => void;
    setAddModalInitialData?: (data: Partial<Transaction> | null) => void;
};

export const PaymentSheetCard = ({
    fixedTxsData, curMonthName, sym, globalCurrency,
    onTransactionClick, setIsAddModalOpen, setAddModalInitialData,
}: Props) => {
    const { t } = useLanguage();

    const getTxAmountForCurrency = (tx: Transaction) => {
        if (globalCurrency === 'USD') return tx.amountUSD ?? tx.amount;
        if (globalCurrency === 'ARS') return tx.amountARS ?? tx.amount;
        if (globalCurrency === 'EUR') return tx.amountEUR ?? tx.amount;
        return tx.amountILS ?? tx.amount;
    };

    const getRecurringLabel = (periodicity?: number) => {
        if (!periodicity) return '';
        if (periodicity === 12) return t('dashboard.annual');
        if (periodicity === 6) return t('dashboard.biannual');
        return `${t('dashboard.every_n_months')} ${periodicity}M`;
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
        borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column',
        position: 'relative', paddingBottom: '3.5rem',
    };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {t('dashboard.payment_sheet')}
                </div>
                <span style={{ background: 'var(--surface-alt)', color: 'var(--primary)', border: '1px solid var(--border)', fontSize: '0.55rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.05em' }}>
                    {curMonthName?.toUpperCase()}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                {fixedTxsData.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.no_fixed')}</div>
                )}
                {fixedTxsData.map((item, i) => {
                    const { latest: tx, isPaid, day, label } = item;
                    return (
                        <div
                            key={tx.id}
                            style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.85rem', cursor: 'pointer', opacity: isPaid ? 0.7 : 1 }}
                            onClick={() => {
                                if (isPaid) {
                                    onTransactionClick(tx);
                                } else if (setIsAddModalOpen && setAddModalInitialData) {
                                    setAddModalInitialData({
                                        desc: tx.desc, amount: getTxAmountForCurrency(tx),
                                        tag: tx.tag, icon: tx.icon, type: 'expense',
                                        goalType: tx.goalType as any, periodicity: tx.periodicity,
                                        excludeFromBudget: tx.excludeFromBudget,
                                    });
                                    setIsAddModalOpen(true);
                                }
                            }}
                        >
                            {/* Dot + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: isPaid ? 'var(--primary)' : 'var(--accent)', border: isPaid ? 'none' : '2px solid var(--accent)' }} />
                                {i < fixedTxsData.length - 1 && (
                                    <div style={{ width: '1px', flex: 1, background: 'var(--border-dim)', marginTop: '4px' }} />
                                )}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isPaid ? 'var(--text-muted)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {label}
                                    </div>
                                    {tx.goalType === 'periodo' && (
                                        <span style={{ fontSize: '0.45rem', background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>
                                            {getRecurringLabel(tx.periodicity)}
                                        </span>
                                    )}
                                    {isPaid ? (
                                        <span style={{ fontSize: '0.45rem', background: 'var(--primary)', color: 'var(--primary-text)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 900 }}>{t('dashboard.paid')}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.45rem', background: 'var(--surface-alt)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>{t('dashboard.pending')}</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {t('dashboard.reference_day')} {day} • {tx.tag}
                                </div>
                            </div>
                            {/* Amount */}
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: isPaid ? 'var(--primary)' : 'var(--accent)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
                                {formatCurrency(getTxAmountForCurrency(tx), sym)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: '0 0 10px 10px' }}>
                <button
                    onClick={() => {
                        if (setIsAddModalOpen && setAddModalInitialData) {
                            setAddModalInitialData({ goalType: 'mensual' });
                            setIsAddModalOpen(true);
                        }
                    }}
                    style={{ flex: 1, padding: '0.75rem 1rem', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.05em' }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    {t('dashboard.add_recurring')}
                </button>
            </div>
        </div>
    );
};
