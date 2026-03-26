"use client";
import React, { useState, useEffect, useCallback } from 'react';
import './ColorCustomizerOverlay.css';
import { useAppContext } from '../../../context/AppContext';
import { useLanguage, TranslationKey } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { COLOR_PRESETS, WIDGET_ZONES } from '../../../lib/colorSystem';

const PRESET_NAME_KEYS: Record<string, TranslationKey> = {
    'organic-dark': 'profile.appearance_preset_organic_dark',
    'organic-light': 'profile.appearance_preset_organic_light',
    ocean: 'profile.appearance_preset_ocean',
    forest: 'profile.appearance_preset_forest',
    ember: 'profile.appearance_preset_ember',
    arctic: 'profile.appearance_preset_arctic',
    purple: 'profile.appearance_preset_purple',
    mono: 'profile.appearance_preset_mono',
};

const ZONE_NAME_KEYS: Record<string, TranslationKey> = {
    sidebar: 'profile.appearance_zone_sidebar',
    dashboard: 'profile.appearance_zone_dashboard',
    'tx-rows': 'profile.appearance_zone_tx_rows',
    modal: 'profile.appearance_zone_modal',
    stats: 'profile.appearance_zone_stats',
};

const ZONE_DESC_KEYS: Record<string, TranslationKey> = {
    sidebar: 'profile.appearance_zone_sidebar_desc',
    dashboard: 'profile.appearance_zone_dashboard_desc',
    'tx-rows': 'profile.appearance_zone_tx_rows_desc',
    modal: 'profile.appearance_zone_modal_desc',
    stats: 'profile.appearance_zone_stats_desc',
};

const VARIABLE_LABEL_KEYS: Record<string, TranslationKey> = {
    '--w-sidebar-bg': 'profile.appearance_var_bg',
    '--w-sidebar-text': 'profile.appearance_var_sidebar_text',
    '--w-sidebar-active': 'profile.appearance_var_active_item',
    '--w-sidebar-border': 'profile.appearance_var_border',
    '--w-card-bg': 'profile.appearance_var_card_bg',
    '--w-card-border': 'profile.appearance_var_card_border',
    '--w-income-color': 'profile.appearance_var_income_color',
    '--w-expense-color': 'profile.appearance_var_expense_color',
    '--w-tx-row-bg': 'profile.appearance_var_row_bg',
    '--w-tx-row-border': 'profile.appearance_var_row_border',
    '--w-tx-icon-bg': 'profile.appearance_var_icon_bg',
    '--w-tx-income': 'profile.appearance_var_income',
    '--w-tx-expense': 'profile.appearance_var_expense',
    '--w-modal-bg': 'profile.appearance_var_bg',
    '--w-modal-border': 'profile.appearance_var_border',
    '--w-stats-bg': 'profile.appearance_var_bg',
    '--w-stats-primary': 'profile.appearance_var_primary_color',
    '--w-stats-accent': 'profile.appearance_var_accent_color',
};

const getTranslatedValue = (
    map: Record<string, TranslationKey>,
    id: string,
    fallback: string,
    t: (key: TranslationKey) => string
) => {
    const translationKey = map[id];
    return translationKey ? t(translationKey) : fallback;
};

export const ColorCustomizerOverlay = () => {
    const ctx = useAppContext();
    const { t } = useLanguage();
    const dialog = useDialog();
    const {
        isColorMode, setIsColorMode,
        activeColorZone, setActiveColorZone,
        widgetColors, setWidgetColor, resetWidgetColors,
        applyColorPreset,
        customColors,
    } = ctx;

    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<'presets' | 'widgets'>('presets');
    const [expandedZone, setExpandedZone] = useState<string | null>(null);

    // ── Detect active zone from DOM clicks ──────────────────────────────────
    useEffect(() => {
        if (!isColorMode) return;
        const handleClick = (e: MouseEvent) => {
            const zoneEl = (e.target as Element).closest('[data-color-zone]');
            const zone = zoneEl?.getAttribute('data-color-zone') ?? null;
            if (zone) {
                setActiveColorZone(zone);
                setExpandedZone(zone);
                setActiveTab('widgets');
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isColorMode, setActiveColorZone]);

    // ── Sync zone-active CSS class on DOM elements ──────────────────────────
    useEffect(() => {
        // Remove from all zones first
        document.querySelectorAll('[data-color-zone].zone-active').forEach(el => {
            el.classList.remove('zone-active');
        });
        // Apply to active zone
        if (activeColorZone) {
            const el = document.querySelector(`[data-color-zone="${activeColorZone}"]`);
            el?.classList.add('zone-active');
        }
    }, [activeColorZone]);

    // ── Add/remove color-mode class on app-wrapper ───────────────────────────
    useEffect(() => {
        const wrapper = document.querySelector('.app-wrapper');
        if (!wrapper) return;
        if (isColorMode) wrapper.classList.add('app-color-mode');
        else wrapper.classList.remove('app-color-mode');
        return () => wrapper.classList.remove('app-color-mode');
    }, [isColorMode]);

    const handleClose = useCallback(() => {
        setIsColorMode(false);
        setActiveColorZone(null);
        setExpandedZone(null);
    }, [setIsColorMode, setActiveColorZone]);

    // ── Get current computed value of a CSS var (widget override → computed) ─
    const resolveColor = (zone: string, variable: string, defaultColor: string): string => {
        if (widgetColors[zone]?.[variable]) return widgetColors[zone][variable];
        if (typeof window !== 'undefined') {
            const val = getComputedStyle(document.documentElement)
                .getPropertyValue(variable)
                .trim();
            if (val) return val;
        }
        return defaultColor;
    };

    // ── Determine active preset ──────────────────────────────────────────────
    const activePresetId = typeof window !== 'undefined'
        ? localStorage.getItem('financeActivePreset') ?? 'organic-dark'
        : 'organic-dark';
    const selectedZone = WIDGET_ZONES.find(zone => zone.id === activeColorZone);

    if (!isColorMode) return null;

    return (
        <div className={`color-overlay ${isMinimized ? 'color-overlay--minimized' : ''}`}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="color-overlay__header">
                <div className="color-overlay__title">
                    <span className="color-overlay__title-icon">🎨</span>
                    <span>{t('profile.appearance_title')}</span>
                </div>
                <div className="color-overlay__actions">
                    <button
                        className="color-overlay__icon-btn"
                        onClick={() => setIsMinimized(v => !v)}
                        title={isMinimized ? t('profile.appearance_expand') : t('profile.appearance_minimize')}
                    >
                        {isMinimized ? '▲' : '▼'}
                    </button>
                    <button
                        className="color-overlay__icon-btn color-overlay__icon-btn--close"
                        onClick={handleClose}
                        title={t('profile.appearance_close_editor')}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="color-overlay__body">
                    {/* ── Tabs ─────────────────────────────────────────── */}
                    <div className="color-overlay__tabs">
                        <button
                            className={`color-overlay__tab ${activeTab === 'presets' ? 'color-overlay__tab--active' : ''}`}
                            onClick={() => setActiveTab('presets')}
                        >
                            {t('profile.appearance_tab_presets')}
                        </button>
                        <button
                            className={`color-overlay__tab ${activeTab === 'widgets' ? 'color-overlay__tab--active' : ''}`}
                            onClick={() => setActiveTab('widgets')}
                        >
                            {t('profile.appearance_tab_widgets')}
                        </button>
                    </div>

                    {/* ── PRESETS TAB ──────────────────────────────────── */}
                    {activeTab === 'presets' && (
                        <div className="color-overlay__content">
                            <p className="color-overlay__hint">
                                {t('profile.appearance_presets_hint')}
                            </p>
                            <div className="color-presets-grid">
                                {COLOR_PRESETS.map(preset => {
                                    const isActive = activePresetId === preset.id;
                                    const presetName = getTranslatedValue(PRESET_NAME_KEYS, preset.id, preset.name, t);
                                    const bg = preset.colors['--bg'] || '#111';
                                    const primary = preset.colors['--primary'] || '#888';
                                    const accent = preset.colors['--accent'] || '#555';
                                    const textMain = preset.colors['--text-main'] || '#eee';
                                    return (
                                        <button
                                            key={preset.id}
                                            className={`color-preset-tile ${isActive ? 'color-preset-tile--active' : ''}`}
                                            onClick={() => applyColorPreset(preset.id)}
                                            title={presetName}
                                            style={{ '--preset-bg': bg } as React.CSSProperties}
                                        >
                                            <div
                                                className="color-preset-swatch"
                                                style={{ background: bg, border: `2px solid ${primary}` }}
                                            >
                                                <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: primary, display: 'block' }} />
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: accent, display: 'block' }} />
                                                </div>
                                                <div style={{ width: '100%', height: '2px', background: textMain, opacity: 0.5, borderRadius: '1px' }} />
                                                <div style={{ width: '60%', height: '2px', background: textMain, opacity: 0.3, borderRadius: '1px', marginTop: '2px' }} />
                                            </div>
                                            <span className="color-preset-name">{presetName}</span>
                                            {isActive && <span className="color-preset-check">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── WIDGETS TAB ──────────────────────────────────── */}
                    {activeTab === 'widgets' && (
                        <div className="color-overlay__content">
                            {activeColorZone ? (
                                <p className="color-overlay__hint color-overlay__hint--zone">
                                    🎯 {t('profile.appearance_selected_zone')}: <strong>{selectedZone ? getTranslatedValue(ZONE_NAME_KEYS, selectedZone.id, selectedZone.name, t) : activeColorZone}</strong>
                                </p>
                            ) : (
                                <p className="color-overlay__hint">
                                    {t('profile.appearance_widgets_hint')}
                                </p>
                            )}

                            {WIDGET_ZONES.map(zone => {
                                const isExpanded = expandedZone === zone.id;
                                const isSelected = activeColorZone === zone.id;
                                const hasOverrides = Object.keys(widgetColors[zone.id] ?? {}).length > 0;
                                const zoneName = getTranslatedValue(ZONE_NAME_KEYS, zone.id, zone.name, t);
                                const zoneDesc = getTranslatedValue(ZONE_DESC_KEYS, zone.id, zone.desc, t);
                                return (
                                    <div
                                        key={zone.id}
                                        className={`color-zone ${isSelected ? 'color-zone--selected' : ''}`}
                                    >
                                        <div
                                            className="color-zone__header"
                                            onClick={() => {
                                                setExpandedZone(isExpanded ? null : zone.id);
                                                setActiveColorZone(zone.id);
                                            }}
                                        >
                                            <div className="color-zone__title-row">
                                                <span className="color-zone__icon">{zone.icon}</span>
                                                <div>
                                                    <div className="color-zone__name">{zoneName}</div>
                                                    <div className="color-zone__desc">{zoneDesc}</div>
                                                </div>
                                            </div>
                                            <div className="color-zone__meta">
                                                {hasOverrides && (
                                                    <span className="color-zone__badge">{t('profile.appearance_badge_custom')}</span>
                                                )}
                                                <span className="color-zone__chevron">{isExpanded ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="color-zone__vars">
                                                {zone.vars.map(({ variable, label, defaultColor }) => {
                                                    const translatedLabel = getTranslatedValue(VARIABLE_LABEL_KEYS, variable, label, t);
                                                    const currentValue = resolveColor(zone.id, variable, defaultColor);
                                                    return (
                                                        <div key={variable} className="color-var-row">
                                                            <div className="color-var-info">
                                                                <span className="color-var-label">{translatedLabel}</span>
                                                                <span className="color-var-name">{variable}</span>
                                                            </div>
                                                            <div className="color-var-picker-wrap">
                                                                <span
                                                                    className="color-var-preview"
                                                                    style={{ background: currentValue }}
                                                                />
                                                                <input
                                                                    type="color"
                                                                    className="color-var-input"
                                                                    value={widgetColors[zone.id]?.[variable] || (currentValue.startsWith('#') ? currentValue : '#000000')}
                                                                    onChange={e =>
                                                                        setWidgetColor(zone.id, variable, e.target.value)
                                                                    }
                                                                    title={t('profile.appearance_change_color')}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {hasOverrides && (
                                                    <button
                                                        className="color-zone__reset-btn"
                                                        onClick={() => resetWidgetColors(zone.id)}
                                                    >
                                                        ↺ {t('profile.appearance_reset_zone')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {Object.values(widgetColors).some(v => Object.keys(v).length > 0) && (
                                <button
                                    className="color-overlay__reset-all"
                                    onClick={async () => {
                                        if (await dialog.confirm({ message: t('profile.appearance_confirm_reset_all_zones') })) {
                                            resetWidgetColors();
                                        }
                                    }}
                                >
                                    ↺ {t('profile.appearance_reset_all_zones')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
