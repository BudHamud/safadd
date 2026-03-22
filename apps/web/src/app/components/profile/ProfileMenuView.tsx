import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

type CurrencyOption = {
    value: 'ILS' | 'USD' | 'ARS' | 'EUR';
    label: string;
};

type ProfileMenuViewProps = {
    initials: string;
    name: string;
    goalPct: number;
    currentMonthExpense: number;
    monthlyGoal: number;
    sym: string;
    daysLeft: number;
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR';
    currencyOptions: readonly CurrencyOption[];
    lang: 'es' | 'en';
    bankSyncEnabled: boolean;
    uniqueCategories: Array<{ tag: string; icon: string; count: number }>;
    isOnline: boolean;
    pendingOpsCount: number;
    customColors: Record<string, string>;
    onOpenIdentity: () => void;
    onOpenGoal: () => void;
    onCurrencyChange: (currency: 'ILS' | 'USD' | 'ARS' | 'EUR') => void;
    onLanguageChange: (lang: 'es' | 'en') => void;
    onOpenNotifications: () => void;
    onOpenCategories: () => void;
    onOpenSync: () => void;
    onOpenColors: () => void;
    onLogout: () => void;
};

export const ProfileMenuView = ({
    initials,
    name,
    goalPct,
    currentMonthExpense,
    monthlyGoal,
    sym,
    daysLeft,
    globalCurrency,
    currencyOptions,
    lang,
    bankSyncEnabled,
    uniqueCategories,
    isOnline,
    pendingOpsCount,
    customColors,
    onOpenIdentity,
    onOpenGoal,
    onCurrencyChange,
    onLanguageChange,
    onOpenNotifications,
    onOpenCategories,
    onOpenSync,
    onOpenColors,
    onLogout,
}: ProfileMenuViewProps) => {
    const { t } = useLanguage();

    return (
        <>
            <div className="profile-grid">
                <div className="profile-card profile-card--identity" onClick={onOpenIdentity} style={{ cursor: 'pointer' }}>
                    <div className="profile-card-label">
                        <span>{t('profile.card_identity')}</span>
                        <span className="profile-card-label-badge">{t('profile.card_identity_badge')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                        <div className="profile-avatar-row" style={{ width: '32px', height: '32px' }}>
                            <div className="profile-avatar-initials" style={{ width: '100%', height: '100%', fontSize: '0.7rem' }}>{initials}</div>
                        </div>
                        <div className="profile-name-display" style={{ fontSize: '1.2rem', margin: 0 }}>{name}</div>
                    </div>
                    <div className="profile-devices-row" style={{ marginTop: '0.4rem' }}>
                        <div className="profile-device-dot active" style={{ width: '22px', height: '22px' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" />
                            </svg>
                        </div>
                        <span className="profile-devices-label">{t('profile.card_manage_devices')}</span>
                    </div>
                </div>

                <div className="profile-card profile-card--goal" onClick={onOpenGoal} style={{ cursor: 'pointer' }}>
                    <div className="profile-card-label">
                        <span>{t('profile.card_expense_goal')}</span>
                        <span className="profile-goal-consumed">{goalPct}{t('profile.goal_consumed')}</span>
                    </div>
                    <div className="profile-goal-amount">
                        {formatCurrency(currentMonthExpense, sym)}
                        <span className="profile-goal-limit">/ {formatCurrency(monthlyGoal, sym)}</span>
                    </div>
                    <div className="profile-goal-days">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {t('profile.days_left_pre')} {daysLeft} {t('profile.days_left_suf')}
                    </div>
                </div>

                <div className="profile-card">
                    <div className="profile-card-label">{t('profile.card_currency')}</div>
                    <svg className="profile-card-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    <select
                        className="profile-currency-select"
                        value={globalCurrency}
                        onChange={e => onCurrencyChange(e.target.value as 'ILS' | 'USD' | 'ARS' | 'EUR')}
                    >
                        {currencyOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <span className="profile-card-sub">{t('profile.currency_sub')}</span>
                </div>

                <div className="profile-card">
                    <div className="profile-card-label">{t('profile.language')}</div>
                    <svg className="profile-card-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', paddingBottom: '14px' }}>
                        <button
                            onClick={() => onLanguageChange('es')}
                            style={{
                                flex: 1, padding: '0.4rem',
                                borderRadius: '8px', border: 'none',
                                fontWeight: 900, fontSize: '0.72rem',
                                cursor: 'pointer',
                                background: lang === 'es' ? 'var(--primary)' : 'var(--surface-alt)',
                                color: lang === 'es' ? 'var(--primary-text)' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                            }}
                        >🇦🇷 ES</button>
                        <div style={{ flex: 1 }}>
                            <button
                                onClick={() => onLanguageChange('en')}
                                style={{
                                    width: '100%', padding: '0.4rem',
                                    borderRadius: '8px', border: 'none',
                                    fontWeight: 900, fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    background: lang === 'en' ? 'var(--primary)' : 'var(--surface-alt)',
                                    color: lang === 'en' ? 'var(--primary-text)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }}
                            >🇬🇧 EN</button>
                        </div>
                    </div>
                    <span className="profile-card-sub">{lang === 'es' ? t('profile.language_name_es') : t('profile.language_name_en')}</span>
                </div>
            </div>

            <div className="profile-row-item" onClick={onOpenNotifications}>
                <div className="profile-row-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.6" />
                    </svg>
                </div>
                <div className="profile-row-content">
                    <div className="profile-row-sublabel">{t('profile.bank_integration')}</div>
                    <div className="profile-row-value">{bankSyncEnabled ? t('profile.bank_linked') : t('profile.bank_unlinked')}</div>
                </div>
                <div className="profile-row-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </div>
            </div>

            <div className="profile-row-item" onClick={onOpenCategories}>
                <div className="profile-row-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                </div>
                <div className="profile-row-content">
                    <div className="profile-row-sublabel">{t('profile.categories_row')}</div>
                    <div className="profile-row-cat-icons">
                        {uniqueCategories.slice(0, 4).map(c => (
                            <span className="profile-row-cat-icon" key={c.tag}>{c.icon || '🏷️'}</span>
                        ))}
                        {uniqueCategories.length > 4 && (
                            <span className="profile-row-cat-more">+{uniqueCategories.length - 4}</span>
                        )}
                    </div>
                </div>
                <div className="profile-row-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </div>
            </div>

            <div className="profile-row-item" onClick={onOpenSync}>
                <div className="profile-row-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                </div>
                <div className="profile-row-content">
                    <div className="profile-row-sublabel">{t('profile.sync_title')}</div>
                    <div className="profile-row-value" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                        {isOnline
                            ? (pendingOpsCount > 0
                                ? <span style={{ color: 'var(--accent)' }}>⚠ {pendingOpsCount} {t('profile.sync_pending')}</span>
                                : <span style={{ color: 'var(--primary)' }}>✓ {t('profile.sync_none')}</span>)
                            : <span style={{ color: 'var(--accent)' }}>✕ {t('profile.sync_status_offline')}</span>
                        }
                    </div>
                </div>
                <div className="profile-row-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </div>
            </div>

            <div className="profile-row-item" onClick={onOpenColors}>
                <div className="profile-row-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                </div>
                <div className="profile-row-content">
                    <div className="profile-row-sublabel">{t('profile.colors_title')}</div>
                    <div className="profile-row-value" style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                        {['--primary', '--accent', '--bg', '--surface'].map(v => (
                            <span key={v} style={{
                                width: '14px', height: '14px', borderRadius: '3px',
                                background: customColors[v] || `var(${v})`,
                                border: '1px solid var(--border)'
                            }} />
                        ))}
                        {Object.keys(customColors).length > 0 &&
                            <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 800 }}>{t('profile.appearance_badge_custom')}</span>
                        }
                    </div>
                </div>
                <div className="profile-row-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </div>
            </div>

            <button className="profile-logout" onClick={onLogout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t('profile.logout')}
            </button>
        </>
    );
};