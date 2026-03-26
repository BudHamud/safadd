import React from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';
import { useRouter } from 'next/navigation';

const categoryIconMap: Record<string, string> = {
    alquiler: '🏠', viajes: '✈️', comida: '🍔', suscripcion: '🎵',
    internet: '📡', seguro: '🛡️', impuestos: '🏛️', transporte: '🚌',
    entretenimiento: '🎬', salud: '💊', educacion: '📚', default: '💳',
};
const getIcon = (tag: string) => categoryIconMap[tag?.toLowerCase()] || categoryIconMap.default;

type Props = {
    recentTx: Transaction[];
    sym: string;
    onTransactionClick: (tx: Transaction) => void;
};

export const RecentActivityCard = ({ recentTx, sym, onTransactionClick }: Props) => {
    const { t } = useLanguage();
    const router = useRouter();

    return (
        <div style={{
            background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
            borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }} />
                    {t('dashboard.activity')}
                </div>
                <div
                    onClick={() => router.push('/app/movements')}
                    style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                    {t('common.see_all')}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                {recentTx.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.no_recent')}</div>
                )}
                {recentTx.map(tx => (
                    <div
                        key={tx.id}
                        onClick={() => onTransactionClick(tx)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', cursor: 'pointer', background: 'var(--surface-alt)', transition: 'background 0.15s' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                {tx.icon && tx.icon.length < 5 ? tx.icon : getIcon(tx.tag)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {tx.desc}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
                                    {tx.tag} • {tx.date}
                                </div>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900, flexShrink: 0, marginLeft: '0.5rem', color: tx.type === 'expense' ? 'var(--accent)' : 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
