import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useLanguage } from '../../../context/LanguageContext';

type AdminDebugReport = {
    id: string;
    description: string;
    device_info: string | null;
    app_version: string | null;
    platform: string | null;
    images_count: number | null;
    created_at: string;
    reporterName: string | null;
};

export const ProfileAdminDebugView = () => {
    const { authenticatedFetch } = useAppContext();
    const { t } = useLanguage();
    const [reports, setReports] = useState<AdminDebugReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await authenticatedFetch('/api/debug-reports?scope=admin&limit=50');
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : t('profile.admin_reports_load_error'));
                return;
            }

            setReports(Array.isArray(data?.reports) ? data.reports : []);
        } catch (fetchError) {
            console.error(fetchError);
            setError(t('profile.admin_reports_load_error'));
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, t]);

    useEffect(() => {
        void loadReports();
    }, [loadReports]);

    return (
        <div>
            <div className="profile-subview-label">{t('profile.admin_reports_title')}</div>

            <div className="profile-admin-toolbar">
                <p className="profile-admin-copy">{t('profile.admin_reports_desc')}</p>
                <button className="profile-sync-btn" onClick={() => void loadReports()} disabled={loading}>
                    {loading ? t('profile.sync_syncing') : t('profile.admin_reports_refresh')}
                </button>
            </div>

            {error && (
                <div className="profile-sync-result">
                    <span style={{ color: 'var(--accent)' }}>✕ {error}</span>
                </div>
            )}

            {!loading && reports.length === 0 && !error && (
                <div className="profile-sync-card">
                    <p className="profile-admin-empty">{t('profile.admin_reports_empty')}</p>
                </div>
            )}

            <div className="profile-admin-list">
                {reports.map((report) => (
                    <article key={report.id} className="profile-admin-report">
                        <div className="profile-admin-report-head">
                            <div>
                                <div className="profile-admin-report-user">
                                    {report.reporterName || t('profile.admin_reports_unknown_user')}
                                </div>
                                <div className="profile-admin-report-meta">
                                    {new Date(report.created_at).toLocaleString()}
                                </div>
                            </div>
                            <div className="profile-admin-report-badge">
                                {report.images_count ?? 0} {t('profile.admin_reports_images')}
                            </div>
                        </div>

                        <p className="profile-admin-report-desc">{report.description}</p>

                        <div className="profile-admin-report-grid">
                            <div>
                                <span className="profile-admin-report-label">{t('profile.admin_reports_platform')}</span>
                                <span className="profile-admin-report-value">{report.platform || '-'}</span>
                            </div>
                            <div>
                                <span className="profile-admin-report-label">{t('profile.admin_reports_version')}</span>
                                <span className="profile-admin-report-value">{report.app_version || '-'}</span>
                            </div>
                            <div className="profile-admin-report-grid-full">
                                <span className="profile-admin-report-label">{t('profile.admin_reports_device')}</span>
                                <span className="profile-admin-report-value">{report.device_info || '-'}</span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
};