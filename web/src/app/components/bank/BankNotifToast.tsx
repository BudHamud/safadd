import React, { useState } from 'react';
import { PendingBankTransaction } from '../../../hooks/useBankNotifications';
import { useLanguage } from '../../../context/LanguageContext';

interface BankNotifToastProps {
    pending: PendingBankTransaction[];
    onConfirm: (item: PendingBankTransaction) => void;   // now passes full item
    onDismiss: (id: string) => void;
    globalCurrency: string;
    // Panel mode
    panelOpen: boolean;
    onClosePanel: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    ILS: '₪', USD: '$', ARS: '$', EUR: '€', GBP: '£'
};

const TAG_ICONS: Record<string, string> = {
    alimentacion: '🛒', transporte: '🚌', salud: '🏥',
    entretenimiento: '🎬', viajes: '✈️', suscripcion: '📱',
    servicios: '⚡', educacion: '📚', ropa: '👕',
    hogar: '🏠', tecnologia: '💻', otro: '💳',
};

// ── Single notification card ─────────────────────────────────────
const NotifCard = ({
    item,
    onConfirm,
    onDismiss,
    compact = false,
}: {
    item: PendingBankTransaction;
    onConfirm: () => void;
    onDismiss: () => void;
    compact?: boolean;
}) => {
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();
    const sym = CURRENCY_SYMBOLS[item.currency] ?? item.currency;
    const icon = TAG_ICONS[item.tag] ?? '💳';
    const isExpense = item.type === 'expense';

    const handleConfirm = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'var(--surface)',
            border: `1.5px solid ${isExpense ? 'var(--accent)' : 'var(--primary)'}`,
            borderRadius: '14px',
            padding: compact ? '0.8rem 1rem' : '1rem 1.1rem',
            boxShadow: compact ? 'none' : '0 8px 40px rgba(0,0,0,0.55)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.55rem' }}>
                <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'var(--surface-alt)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.6rem', fontWeight: 900,
                        color: 'var(--text-muted)', letterSpacing: '0.07em',
                        textTransform: 'uppercase'
                    }}>
                        🏦 {item.bankName} · {t('bank.detected')}
                    </div>
                    <div style={{
                        fontSize: '0.9rem', fontWeight: 800,
                        color: 'var(--text-main)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {item.merchant}
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    style={{
                        background: 'none', border: 'none',
                        color: 'var(--text-muted)', fontSize: '1rem',
                        cursor: 'pointer', padding: '0.2rem', flexShrink: 0,
                    }}
                >✕</button>
            </div>

            {/* Amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.7rem' }}>
                <span style={{
                    fontSize: compact ? '1.5rem' : '1.8rem', fontWeight: 900,
                    color: isExpense ? 'var(--accent)' : 'var(--primary)',
                    letterSpacing: '-0.03em',
                }}>
                    {isExpense ? '-' : '+'}{sym}{item.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {item.currency}
                </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={onDismiss}
                    style={{
                        flex: 1, padding: '0.55rem',
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px', color: 'var(--text-muted)',
                        fontSize: '0.68rem', fontWeight: 800,
                        cursor: 'pointer', textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    {t('btn.ignore')}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                        flex: 2, padding: '0.55rem',
                        background: loading
                            ? 'var(--surface-alt)'
                            : isExpense ? 'var(--accent)' : 'var(--primary)',
                        border: 'none', borderRadius: '8px',
                        color: loading
                            ? 'var(--text-muted)'
                            : isExpense ? 'var(--accent-text)' : 'var(--primary-text)',
                        fontSize: '0.68rem', fontWeight: 900,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.4rem',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? (
                        <>
                            <span style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                border: '2px solid var(--text-muted)',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.6s linear infinite',
                                display: 'inline-block',
                            }} />
                            Abriendo...
                        </>
                    ) : (
                        isExpense ? t('btn.record_expense') : t('btn.record_income')
                    )}
                </button>
            </div>
        </div>
    );
};

// ── Main export: Toast + Panel ───────────────────────────────────
export const BankNotifToast = ({ pending, onConfirm, onDismiss, panelOpen, onClosePanel }: BankNotifToastProps) => {
    const { t } = useLanguage();
    return (
        <>
            {/* Toast flotante desactivado — usar la campanita del header */}

            {/* ── Notifications Panel (slide in from right) ── */}
            {panelOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={onClosePanel}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 10000,
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                    {/* Panel */}
                    <div style={{
                        position: 'fixed', top: 0, right: 0,
                        width: 'min(100vw, 380px)', height: '100vh',
                        background: 'var(--surface)',
                        borderLeft: '1.5px solid var(--border)',
                        zIndex: 10001,
                        display: 'flex', flexDirection: 'column',
                        animation: 'slideInRight 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                        {/* Panel header */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            padding: '1.2rem 1.2rem 1rem',
                            borderBottom: '1px solid var(--border)',
                            gap: '0.8rem',
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '0.6rem', fontWeight: 900,
                                    color: 'var(--text-muted)', letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                }}>
                                    {t('bank.panel_subtitle')}
                                </div>
                                <div style={{
                                    fontSize: '1.1rem', fontWeight: 900,
                                    color: 'var(--text-main)',
                                }}>
                                    🏦 {t('bank.panel_title')}
                                </div>
                            </div>
                            {pending.length > 0 && (
                                <span style={{
                                    background: 'var(--accent)', color: 'var(--accent-text)',
                                    borderRadius: '20px', padding: '0.15rem 0.6rem',
                                    fontSize: '0.7rem', fontWeight: 900,
                                }}>
                                    {pending.length}
                                </span>
                            )}
                            <button
                                onClick={onClosePanel}
                                style={{
                                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-muted)', fontSize: '1rem',
                                    cursor: 'pointer',
                                }}
                            >✕</button>
                        </div>

                        {/* Panel body */}
                        <div style={{
                            flex: 1, overflowY: 'auto',
                            padding: '1rem',
                            display: 'flex', flexDirection: 'column', gap: '0.8rem',
                        }}>
                            {pending.length === 0 ? (
                                <div style={{
                                    flex: 1, display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '0.8rem', color: 'var(--text-muted)',
                                    paddingTop: '3rem',
                                }}>
                                    <span style={{ fontSize: '3rem' }}>🔔</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>
                                        {t('bank.empty_title')}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', textAlign: 'center', maxWidth: '240px', lineHeight: 1.5 }}>
                                        {t('bank.empty_desc')}
                                    </div>
                                </div>
                            ) : (
                                pending.map(item => (
                                    <NotifCard
                                        key={item.id}
                                        item={item}
                                        onConfirm={() => onConfirm(item)}
                                        onDismiss={() => onDismiss(item.id)}
                                        compact
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideUpToast {
                    from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.96); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};
