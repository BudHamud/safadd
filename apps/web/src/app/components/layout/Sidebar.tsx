import React from 'react';
import { IconShapes } from './Icons';
import { useLanguage } from '../../../context/LanguageContext';
import { Logo } from './Logo';

type AppTab = 'dashboard' | 'movements' | 'stats' | 'profile';

type SidebarProps = {
    theme: string;
    toggleTheme: () => void;
    activeTab: AppTab;
    userName: string;
    onLogout: () => void;
    onAddClick: () => void;
    travelModeStart: string;
    toggleTravelMode: () => Promise<void>;
    pendingCount?: number;
    onBellClick?: () => void;
    onNavigate: (tab: AppTab) => void;
};

export const Sidebar = ({
    activeTab, onAddClick, pendingCount = 0, onBellClick, onNavigate,
}: SidebarProps) => {
    const { t } = useLanguage();

    return (
        <aside className="sidebar" data-color-zone="sidebar">
            <div className="brand">
                <Logo size={28} />
                <span className="brand-name">Safed</span>
            </div>

            <nav className="nav-menu">
                <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                >
                    <IconShapes type="dashboard" />
                    <span>{t('nav.dashboard')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('movements')}
                    className={`nav-item ${activeTab === 'movements' ? 'active' : ''}`}
                    aria-current={activeTab === 'movements' ? 'page' : undefined}
                >
                    <IconShapes type="card" />
                    <span>{t('nav.movements')}</span>
                </button>

                <button className="app-add-btn" onClick={onAddClick}>
                    <div className="add-btn-icon">
                        <IconShapes type="plus" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('stats')}
                    className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
                    aria-current={activeTab === 'stats' ? 'page' : undefined}
                >
                    <IconShapes type="chart" />
                    <span>{t('nav.stats')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('profile')}
                    className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                    aria-current={activeTab === 'profile' ? 'page' : undefined}
                >
                    <IconShapes type="user" />
                    <span>{t('nav.profile')}</span>
                </button>
            </nav>

            {/* Footer: solo campana de notificaciones */}
            <div className="sidebar-footer desktop-only">
                <button
                    className="sidebar-util-btn"
                    onClick={onBellClick}
                    title={t('sidebar.bank_notifications_title')}
                >
                    <IconShapes type="bell" />
                    {pendingCount > 0 && (
                        <span className="notif-badge">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
};
