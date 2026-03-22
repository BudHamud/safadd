import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type PasswordForm = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

type ProfileIdentityViewProps = {
    initials: string;
    name: string;
    hideIdentityEmailAndPassword: boolean;
    hiddenCurrentEmailLabel: string;
    newEmail: string;
    setNewEmail: React.Dispatch<React.SetStateAction<string>>;
    isChangingEmail: boolean;
    onChangeEmail: () => void;
    passwordForm: PasswordForm;
    setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
    isChangingPassword: boolean;
    onChangePassword: () => void;
    isDeletingAccount: boolean;
    onDeleteAccount: () => void;
};

export const ProfileIdentityView = ({
    initials,
    name,
    hideIdentityEmailAndPassword,
    hiddenCurrentEmailLabel,
    newEmail,
    setNewEmail,
    isChangingEmail,
    onChangeEmail,
    passwordForm,
    setPasswordForm,
    isChangingPassword,
    onChangePassword,
    isDeletingAccount,
    onDeleteAccount,
}: ProfileIdentityViewProps) => {
    const { t } = useLanguage();

    return (
        <div className="profile-identity-subview">
            <div className="profile-subview-label">{t('profile.user_profile')}</div>

            <div className="profile-identity-edit-section">
                <div className="profile-avatar-large">{initials}</div>
                <button
                    className="profile-photo-btn"
                    disabled
                    title={t('profile.soon')}
                    style={{ opacity: 0.35, cursor: 'not-allowed' }}
                >
                    {t('profile.change_photo')}
                </button>

                <div className="profile-form-group">
                    <label>{t('profile.username_label')}</label>
                    <div className="profile-text-input-shell">
                        <div className="profile-text-display">{name}</div>
                        <span className="profile-text-input-icon" aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="11" width="14" height="10" rx="2" />
                                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                            </svg>
                        </span>
                    </div>
                </div>

                {!hideIdentityEmailAndPassword && (
                    <>
                        <div className="profile-password-card">
                            <div className="profile-password-title">{t('profile.email_section_title')}</div>
                            <p className="profile-password-desc">{t('profile.email_section_desc')}</p>

                            <div className="profile-email-fields">
                                <div className="profile-form-group">
                                    <label>{t('profile.email_current')}</label>
                                    <div className="profile-text-input-shell">
                                        <div className="profile-text-display profile-email-display">{hiddenCurrentEmailLabel}</div>
                                    </div>
                                </div>

                                <div className="profile-form-group">
                                    <label>{t('profile.email_new')}</label>
                                    <input
                                        type="email"
                                        className="profile-password-input"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="profile-password-actions">
                                <button
                                    className="profile-password-btn profile-password-btn-secondary"
                                    type="button"
                                    onClick={() => setNewEmail('')}
                                    disabled={isChangingEmail}
                                >
                                    {t('btn.cancel')}
                                </button>
                                <button
                                    className="profile-password-btn profile-password-btn-primary"
                                    type="button"
                                    onClick={onChangeEmail}
                                    disabled={isChangingEmail}
                                >
                                    {isChangingEmail ? t('profile.email_change_loading') : t('profile.email_change_action')}
                                </button>
                            </div>
                        </div>

                        <div className="profile-password-card">
                            <div className="profile-password-title">{t('profile.password_section_title')}</div>
                            <p className="profile-password-desc">{t('profile.password_section_desc')}</p>

                            <div className="profile-password-fields">
                                <div className="profile-form-group">
                                    <label>{t('profile.password_current')}</label>
                                    <input
                                        type="password"
                                        className="profile-password-input"
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                        autoComplete="current-password"
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>{t('profile.password_new')}</label>
                                    <input
                                        type="password"
                                        className="profile-password-input"
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        autoComplete="new-password"
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>{t('profile.password_confirm')}</label>
                                    <input
                                        type="password"
                                        className="profile-password-input"
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="profile-password-actions">
                                <button
                                    className="profile-password-btn profile-password-btn-secondary"
                                    type="button"
                                    onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                                    disabled={isChangingPassword}
                                >
                                    {t('btn.cancel')}
                                </button>
                                <button
                                    className="profile-password-btn profile-password-btn-primary"
                                    type="button"
                                    onClick={onChangePassword}
                                    disabled={isChangingPassword}
                                >
                                    {isChangingPassword ? t('profile.password_change_loading') : t('profile.password_change_action')}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div className="profile-identity-action-grid">
                    <div className="profile-identity-travel-card">
                        <div className="profile-identity-travel-top">
                            <div>
                                <div className="profile-identity-travel-label">{t('profile.travel_mode')}</div>
                                <div className="profile-identity-travel-status">
                                    {t('travel.disabled')}
                                </div>
                            </div>
                            <button
                                className="profile-toggle profile-identity-travel-toggle profile-toggle--off"
                                onClick={undefined}
                                disabled
                                style={{ opacity: 0.45, cursor: 'not-allowed' }}
                            >
                                <span className="profile-toggle-thumb" />
                            </button>
                        </div>
                        <p className="profile-identity-travel-desc">{t('profile.travel_mode_disabled_desc')}</p>
                        <p className="profile-identity-travel-help">{t('profile.travel_mode_disabled_help')}</p>
                    </div>

                    <div className="profile-identity-danger-card">
                        <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {t('profile.delete_account_title')}
                        </div>
                        <p style={{ fontSize: '0.7rem', lineHeight: 1.6, color: 'var(--text-muted)', margin: '0.55rem 0 0.85rem' }}>
                            {t('profile.delete_account_desc')}
                        </p>
                        <button
                            onClick={onDeleteAccount}
                            disabled={isDeletingAccount}
                            style={{ width: '100%', border: '1px solid var(--accent)', background: isDeletingAccount ? 'var(--surface-alt)' : 'transparent', color: 'var(--accent)', borderRadius: '2px', padding: '0.7rem 0.85rem', cursor: isDeletingAccount ? 'default' : 'pointer', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit', opacity: isDeletingAccount ? 0.65 : 1 }}
                        >
                            {isDeletingAccount ? t('profile.delete_account_loading') : t('profile.delete_account_action')}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                <div className="profile-subview-label profile-subview-header">
                    {t('profile.social_links')}
                    <span className="profile-soon-badge">{t('profile.soon')}</span>
                </div>
                <div className="profile-social-list" style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                    <div className="profile-social-item">
                        <div className="profile-social-info">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4c2.21 0 4-1.79 4-4s-1.79-4-4-4zm4.83 2c-.17-.67-.5-1.28-.96-1.77L15 9.06c.31.33.53.74.64 1.18h1.19zM8.17 14c.17.67.5 1.28.96 1.77L10 14.94c-.31-.33-.53-.74-.64-1.18H8.17z" />
                            </svg>
                            <span>{t('profile.google_account')}</span>
                        </div>
                        <button className="profile-social-btn active" disabled>{t('profile.unlink')}</button>
                    </div>
                    <div className="profile-social-item">
                        <div className="profile-social-info">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                            </svg>
                            <span>{t('profile.github_repository')}</span>
                        </div>
                        <button className="profile-social-btn" disabled>{t('profile.link')}</button>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                <div className="profile-subview-label profile-subview-header">
                    {t('profile.linked_devices')}
                    <span className="profile-soon-badge">{t('profile.soon')}</span>
                </div>
                <div className="profile-device-list" style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                    <div className="profile-device-item">
                        <div className="profile-device-icon-wrap">📱</div>
                        <div className="profile-device-details">
                            <div className="profile-device-name">{t('profile.device_current_example')}</div>
                            <div className="profile-device-meta">{t('profile.device_current_meta')}</div>
                        </div>
                        <div className="profile-device-status">{t('profile.device_online')}</div>
                    </div>
                    <div className="profile-device-item">
                        <div className="profile-device-icon-wrap">💻</div>
                        <div className="profile-device-details">
                            <div className="profile-device-name">{t('profile.device_secondary_example')}</div>
                            <div className="profile-device-meta">{t('profile.device_secondary_meta')}</div>
                        </div>
                        <button className="profile-device-logout" disabled>{t('profile.close_session')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};