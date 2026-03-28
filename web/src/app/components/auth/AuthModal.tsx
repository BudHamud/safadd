import React, { useState } from 'react';
import './AuthModal.css';
import { Logo } from '../layout';
import { useLanguage, type TranslationKey } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';

type AuthErrorCode =
    | 'missing_credentials'
    | 'missing_email'
    | 'user_exists'
    | 'create_auth_error'
    | 'create_profile_error'
    | 'invalid_credentials'
    | 'invalid_action'
    | 'server_error';

type AuthErrorResponse = {
    error?: string;
    errorCode?: AuthErrorCode;
    errorDetail?: string;
};

type AuthModalProps = {
    onLogin: (userId: string, username: string, token?: string, refreshToken?: string) => void;
};

export const AuthModal = ({ onLogin }: AuthModalProps) => {
    const { t } = useLanguage();
    const dialog = useDialog();
    const [isRegister, setIsRegister] = useState(false);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', wantsGoal: false, monthlyGoal: '' });
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const getAuthErrorMessage = (error: AuthErrorResponse) => {
        switch (error.errorCode) {
            case 'missing_credentials':
                return t('auth.missing_credentials');
            case 'missing_email':
                return t('auth.missing_email');
            case 'user_exists':
                return t('auth.user_exists');
            case 'create_auth_error':
                return error.errorDetail ? `${t('auth.create_auth_error')}\n${error.errorDetail}` : t('auth.create_auth_error');
            case 'create_profile_error':
                return error.errorDetail ? `${t('auth.create_profile_error')}\n${error.errorDetail}` : t('auth.create_profile_error');
            case 'invalid_credentials':
                return t('auth.invalid_credentials');
            case 'invalid_action':
                return t('auth.invalid_action');
            case 'server_error':
                return error.errorDetail ? `${t('auth.server_error')}\n${error.errorDetail}` : t('auth.server_error');
            default:
                return error.error || t('auth.error');
        }
    };

    const submitAuth = async (payload: typeof formData, action: 'login' | 'register') => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, action })
            });
            const data = await res.json();
            if (!res.ok) {
                await dialog.alert(getAuthErrorMessage(data));
                return;
            }
            onLogin(data.id, data.username, data.access_token, data.refresh_token);
        } catch (e) {
            console.error(e);
            await dialog.alert(t('auth.server_connection_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoverySubmit = async () => {
        if (!recoveryEmail.trim()) {
            await dialog.alert(t('auth.recovery_email_required' as TranslationKey));
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recoveryEmail.trim() })
            });

            if (!res.ok) {
                await dialog.alert(t('auth.recovery_error' as TranslationKey));
                return;
            }

            await dialog.alert(t('auth.recovery_sent' as TranslationKey));
            setIsRecoveryMode(false);
            setRecoveryEmail('');
        } catch (error) {
            console.error(error);
            await dialog.alert(t('auth.server_connection_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRecoveryMode) {
            await handleRecoverySubmit();
            return;
        }

        if (!formData.username || !formData.password || (isRegister && !formData.email)) {
            await dialog.alert(t('auth.complete_fields'));
            return;
        }

        await submitAuth(formData, isRegister ? 'register' : 'login');
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">
                <div className="auth-logo-bar">
                    <Logo size={24} loading={isLoading} />
                    <span className="auth-logo-name">Safed</span>
                </div>

                <form className="auth-body" onSubmit={handleSubmit}>
                    <h2 className="auth-title">
                        {isRecoveryMode ? t('auth.recovery_title' as TranslationKey) : isRegister ? t('auth.create') : t('auth.secure_access')}
                    </h2>

                    {isRecoveryMode && (
                        <p className="auth-recovery-copy">{t('auth.recovery_desc' as TranslationKey)}</p>
                    )}

                    {!isRecoveryMode && (
                        <div className="auth-toggle">
                            <button
                                type="button"
                                className={`auth-toggle-opt ${!isRegister ? 'active' : ''}`}
                                onClick={() => { setIsRegister(false); setIsRecoveryMode(false); }}
                            >
                                {t('auth.login_tab')}
                            </button>
                            <button
                                type="button"
                                className={`auth-toggle-opt ${isRegister ? 'active' : ''}`}
                                onClick={() => { setIsRegister(true); setIsRecoveryMode(false); }}
                            >
                                {t('auth.register_tab')}
                            </button>
                        </div>
                    )}

                    {isRecoveryMode ? (
                        <div className="auth-field">
                            <span className="auth-label">{t('auth.email_label')}</span>
                            <div className="auth-input-wrap">
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder={t('auth.recovery_email_placeholder' as TranslationKey)}
                                    value={recoveryEmail}
                                    onChange={e => setRecoveryEmail(e.target.value)}
                                    autoFocus
                                    autoComplete="email"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="auth-field">
                                <span className="auth-label">{t('auth.user_id_alias')}</span>
                                <div className="auth-input-wrap">
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder={t('auth.username_placeholder')}
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        autoFocus
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {isRegister && (
                                <>
                                    <div className="auth-field">
                                        <span className="auth-label">{t('auth.email_label')}</span>
                                        <div className="auth-input-wrap">
                                            <input
                                                type="email"
                                                className="auth-input"
                                                placeholder={t('auth.email_placeholder')}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                autoComplete="email"
                                            />
                                        </div>
                                    </div>

                                    <div className="auth-field">
                                        <div className="auth-field-header">
                                            <span className="auth-label">{t('auth.goal_question')}</span>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.55rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.wantsGoal}
                                                onChange={e => setFormData({ ...formData, wantsGoal: e.target.checked, monthlyGoal: e.target.checked ? formData.monthlyGoal : '' })}
                                                style={{ accentColor: 'var(--primary)' }}
                                            />
                                            {t('auth.goal_toggle')}
                                        </label>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: formData.wantsGoal ? '0.6rem' : 0 }}>
                                            {t('auth.goal_help')}
                                        </div>
                                        {formData.wantsGoal && (
                                            <div className="auth-input-wrap">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="auth-input"
                                                    placeholder={t('auth.goal_placeholder')}
                                                    value={formData.monthlyGoal}
                                                    onChange={e => setFormData({ ...formData, monthlyGoal: e.target.value })}
                                                    inputMode="decimal"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="auth-field">
                                <div className="auth-field-header">
                                    <span className="auth-label">{t('auth.password_label')}</span>
                                    {!isRegister && (
                                        <button
                                            type="button"
                                            className="auth-forgot"
                                            onClick={() => {
                                                setIsRecoveryMode(true);
                                                setRecoveryEmail(formData.email);
                                            }}
                                        >
                                            {t('auth.forgot_password')}
                                        </button>
                                    )}
                                </div>
                                <div className="auth-input-wrap">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="auth-input auth-input--password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                                    />
                                    <button
                                        type="button"
                                        className="auth-eye-btn"
                                        onClick={() => setShowPassword(v => !v)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="auth-actions">
                        <button type="submit" className="auth-submit" disabled={isLoading}>
                            {isLoading ? t('auth.processing') : isRecoveryMode ? t('auth.recovery_send' as TranslationKey) : isRegister ? t('auth.register_action') : t('auth.authenticate_action')}
                        </button>
                        {isRecoveryMode ? (
                            <button type="button" className="auth-submit auth-submit-secondary" disabled={isLoading} onClick={() => setIsRecoveryMode(false)}>
                                {t('auth.recovery_back' as TranslationKey)}
                            </button>
                        ) : null}
                    </div>
                </form>

                <div className="auth-footer">
                    <span className="auth-footer-version">© Safed v1.1.1</span>
                    <div className="auth-footer-icons">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
