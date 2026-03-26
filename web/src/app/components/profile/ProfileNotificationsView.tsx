import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type ProfileNotificationsViewProps = {
    bankSyncEnabled: boolean;
    autoAddEnabled: boolean;
    onOpenPrivacy: () => void;
    onToggleBankSync: () => void;
    onToggleAutoAdd: () => void;
};

export const ProfileNotificationsView = ({
    bankSyncEnabled,
    autoAddEnabled,
    onOpenPrivacy,
    onToggleBankSync,
    onToggleAutoAdd,
}: ProfileNotificationsViewProps) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="profile-subview-label">{t('profile.autosync_title')}</div>

            <div className="profile-notif-card">
                <p className="profile-notif-desc">
                    {t('profile.notif_disclosure')}
                </p>
                <button
                    type="button"
                    className="profile-notif-link"
                    onClick={onOpenPrivacy}
                    style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                >
                    {t('profile.notif_privacy_link')}
                </button>
                <div className="profile-notif-toggle-row">
                    <span className="profile-notif-toggle-label">{t('profile.notif_banks')}</span>
                    <button
                        className={`profile-toggle ${bankSyncEnabled ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                        onClick={onToggleBankSync}
                    >
                        <span className="profile-toggle-thumb" />
                    </button>
                </div>
                <div className="profile-notif-toggle-row" style={{ opacity: bankSyncEnabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                    <div>
                        <span className="profile-notif-toggle-label">{t('profile.notif_auto_save')}</span>
                        <div className="profile-notif-toggle-help">{t('profile.notif_auto_save_help')}</div>
                    </div>
                    <button
                        className={`profile-toggle ${autoAddEnabled ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                        onClick={onToggleAutoAdd}
                        disabled={!bankSyncEnabled}
                    >
                        <span className="profile-toggle-thumb" />
                    </button>
                </div>
            </div>

            <div className="profile-notif-beta">{t('profile.notif_beta')}</div>
        </div>
    );
};