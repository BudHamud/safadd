import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';
import { useRouter } from 'next/navigation';

type Props = {
    monthlyGoal: number;
    totalExpenseForGoal: number;
    progressPct: number;
    sym: string;
};

export const GoalCard = ({ monthlyGoal, totalExpenseForGoal, progressPct, sym }: Props) => {
    const { t } = useLanguage();
    const router = useRouter();
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPct / 100) * circumference;

    const cardStyle: React.CSSProperties = {
        background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
        borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column',
    };

    if (monthlyGoal === 0) {
        return (
            <div style={cardStyle}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    {t('dashboard.expense_goal')}
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-alt)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t('dashboard.no_limit')}</div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 600 }}>{t('dashboard.set_goal_hint')}</div>
                    </div>
                    <button
                        onClick={() => router.push('/app/profile')}
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 800, padding: '0.45rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                    >
                        {t('dashboard.configure_limit')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={cardStyle}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                {t('dashboard.expense_goal')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative', margin: '0.25rem 0' }}>
                <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
                    <circle cx="50" cy="50" r={radius} stroke="var(--border-dim)" strokeWidth="12" fill="none" />
                    <circle
                        cx="50" cy="50" r={radius}
                        stroke={progressPct >= 100 ? 'var(--accent)' : 'var(--primary)'}
                        strokeWidth="12" fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                    />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>{Math.round(progressPct)}%</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('common.used')}</span>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{t('common.spent')}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(totalExpenseForGoal, sym)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{t('common.limit')}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(monthlyGoal, sym)}</div>
                </div>
            </div>
        </div>
    );
};
