import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type SyncResult = { synced: number; failed: number } | null;

type ProfileSyncViewProps = {
    isOnline: boolean;
    pendingOpsCount: number;
    syncResult: SyncResult;
    isSyncing: boolean;
    onSync: () => void;
};

export const ProfileSyncView = ({
    isOnline,
    pendingOpsCount,
    syncResult,
    isSyncing,
    onSync,
}: ProfileSyncViewProps) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="profile-subview-label">{t('profile.sync_subview_title')}</div>

            <div className="profile-sync-status-row">
                <div className={`profile-sync-dot ${isOnline ? 'profile-sync-dot--on' : 'profile-sync-dot--off'}`} />
                <span className="profile-sync-status-label">
                    {isOnline ? t('profile.sync_status_online') : t('profile.sync_status_offline')}
                </span>
            </div>

            <div className="profile-sync-card">
                <div className="profile-sync-count">
                    <span className="profile-sync-count-num" style={{ color: pendingOpsCount > 0 ? 'var(--accent)' : 'var(--primary)' }}>
                        {pendingOpsCount}
                    </span>
                    <span className="profile-sync-count-label">{t('profile.sync_pending')}</span>
                </div>
                {pendingOpsCount === 0 && (
                    <p className="profile-sync-all-ok">✓ {t('profile.sync_none')}</p>
                )}
            </div>

            {syncResult && (
                <div className="profile-sync-result">
                    <span style={{ color: 'var(--primary)' }}>✓ {syncResult.synced} {t('profile.sync_result_ok')}</span>
                    {syncResult.failed > 0 && (
                        <span style={{ color: 'var(--accent)' }}> · ✕ {syncResult.failed} {t('profile.sync_result_fail')}</span>
                    )}
                </div>
            )}

            <button
                className="profile-sync-btn"
                onClick={onSync}
                disabled={isSyncing || !isOnline || pendingOpsCount === 0}
            >
                {isSyncing ? (
                    <><span className="profile-sync-spinner" /> {t('profile.sync_syncing')}</>
                ) : (
                    <>{t('profile.sync_btn')}</>
                )}
            </button>

            {!isOnline && (
                <p className="profile-sync-offline-note">⚠ {t('profile.sync_offline_warn')}</p>
            )}
        </div>
    );
};