import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './ProfileTab.css';
import { Transaction, Category } from "../../../types";
import { formatCurrency } from '../../../lib/utils';
import { getCurrencySymbol } from '@safed/shared/currency';
import { useLanguage } from '../../../context/LanguageContext';
import { useAppContext } from '../../../context/AppContext';
import { TranslationKey } from '../../../context/LanguageContext';
import { BankSyncExplainer } from '../bank';
import { PrivacyPolicyModal } from '../legal';
import { useSubViewHistory } from '../../../hooks/useSubViewHistory';
import { useDialog } from '../../../context/DialogContext';
import { parseDate } from '../movements/movements.utils';
import { ProfileMenuView } from './ProfileMenuView';
import { ProfileCategoriesView } from './ProfileCategoriesView';
import { ProfileIdentityView } from './ProfileIdentityView';
import { ProfileGoalView } from './ProfileGoalView';
import { ProfileNotificationsView } from './ProfileNotificationsView';
import { ProfileSyncView } from './ProfileSyncView';
import { ProfileAdminDebugView } from './ProfileAdminDebugView';

type ProfileTabProps = {
    userName: string;
    userEmail: string | null;
    theme: string;
    toggleTheme: () => void;
    onLogout: () => void;
    transactions: Transaction[];
    userId: string;
    monthlyGoal: number;
    onUpdate: () => void;
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR';
    onCurrencyChange: (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => void;
    availableCategories: Category[];
    onCategoryChangeInfo: () => void;
};

export const ProfileTab = ({
    userName, userEmail, theme, toggleTheme, onLogout, transactions, userId,
    monthlyGoal, onUpdate, globalCurrency, onCurrencyChange,
    availableCategories, onCategoryChangeInfo
}: ProfileTabProps) => {
    const { lang, setLang, t } = useLanguage();
    const dialog = useDialog();
    const appContext = useAppContext();
    const { authenticatedFetch, updateTransactionsCategory } = appContext;
    const currencyOptions = [
        { value: 'ILS', label: t('profile.currency_ils') },
        { value: 'USD', label: t('profile.currency_usd') },
        { value: 'EUR', label: t('profile.currency_eur') },
        { value: 'ARS', label: t('profile.currency_ars') },
    ] as const;

    const [viewMode, setViewMode] = useState<'menu' | 'categories' | 'notifications' | 'goal' | 'identity' | 'sync' | 'colors' | 'adminReports'>('menu');
    const [isExplainerOpen, setIsExplainerOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ oldTag: string; newTag: string; newIcon: string } | null>(null);
    const [newCategory, setNewCategory] = useState<{ name: string; icon: string } | null>(null);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [currentEmail, setCurrentEmail] = useState(userEmail ?? '');
    const [newEmail, setNewEmail] = useState('');
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Sync
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

    // Colores — lista de variables personalizables
    const COLOR_VARS: { variable: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
        { variable: '--primary', labelKey: 'profile.color_primary', descKey: 'profile.color_primary_desc' },
        { variable: '--accent', labelKey: 'profile.color_accent', descKey: 'profile.color_accent_desc' },
        { variable: '--bg', labelKey: 'profile.color_bg', descKey: 'profile.color_bg_desc' },
        { variable: '--surface', labelKey: 'profile.color_surface', descKey: 'profile.color_surface_desc' },
        { variable: '--surface-alt', labelKey: 'profile.color_surface_alt', descKey: 'profile.color_surface_alt_desc' },
        { variable: '--text-main', labelKey: 'profile.color_text', descKey: 'profile.color_text_desc' },
        { variable: '--text-muted', labelKey: 'profile.color_text_muted', descKey: 'profile.color_text_muted_desc' },
        { variable: '--border', labelKey: 'profile.color_border', descKey: 'profile.color_border_desc' },
    ];

    // Leer colores actuales del DOM (puede ser CSS var o inline override)
    const getCurrentColor = (variable: string): string => {
        if (appContext.customColors[variable]) return appContext.customColors[variable];
        if (typeof window !== 'undefined') {
            return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#888888';
        }
        return '#888888';
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        const result = await appContext.syncNow();
        setIsSyncing(false);
        setSyncResult(result);
    };

    // Android back button: sub-view → profile menu
    useSubViewHistory(
        viewMode !== 'menu',
        useCallback(() => {
            setViewMode('menu');
            setEditingCategory(null);
        }, [])
    );
    // ──────────────────────────────────────────────────────────────────────
    const [newGoal, setNewGoal] = useState(monthlyGoal.toString());
    const [bankSyncEnabled, setBankSyncEnabled] = useState<boolean>(() =>
        typeof window !== 'undefined' && localStorage.getItem('bankSyncEnabled') === 'true'
    );
    const [autoAddEnabled, setAutoAddEnabled] = useState<boolean>(() =>
        typeof window !== 'undefined' && localStorage.getItem('bankAutoAddEnabled') === 'true'
    );

    useEffect(() => {
        setNewGoal(monthlyGoal.toString());
    }, [monthlyGoal]);

    useEffect(() => {
        setCurrentEmail(userEmail ?? '');
    }, [userEmail]);

    const toggleBankSync = (val: boolean) => {
        if (val) {
            setIsExplainerOpen(true);
        } else {
            setBankSyncEnabled(false);
            (window as any).__setBankSync?.(false);
        }
    };

    const confirmBankSyncAction = () => {
        setBankSyncEnabled(true);
        (window as any).__setBankSync?.(true);
        setIsExplainerOpen(false);
    };
    const toggleAutoAdd = (val: boolean) => {
        if (val) {
            void dialog.confirm({ message: t('profile.auto_add_confirm') }).then((confirmed) => {
                if (!confirmed) return;
                localStorage.setItem('bankAutoAddConsentAt', new Date().toISOString());
                setAutoAddEnabled(val);
                (window as any).__setBankAutoAdd?.(val);
            });
            return;
        }
        setAutoAddEnabled(val);
        (window as any).__setBankAutoAdd?.(val);
    };

    const sym = getCurrencySymbol(globalCurrency);

    // ── Derived data ──────────────────────────────────────────
    const uniqueCategories = useMemo(() => {
        const catMap: Record<string, { tag: string; icon: string; count: number }> = {};
        availableCategories.forEach(c => {
            catMap[c.label] = { tag: c.label, icon: c.icon, count: 0 };
        });
        transactions.forEach(tx => {
            if (!catMap[tx.tag]) catMap[tx.tag] = { tag: tx.tag, icon: tx.icon, count: 0 };
            if (tx.icon && tx.icon.length < 5) catMap[tx.tag].icon = tx.icon;
            catMap[tx.tag].count += 1;
        });
        return Object.values(catMap).sort((a, b) => b.count - a.count);
    }, [transactions, availableCategories]);

    // Spending stats for goal card
    const currentDate = new Date();
    const curMonth = currentDate.getMonth();
    const curYear = currentDate.getFullYear();

    const currentMonthExpense = transactions
        .filter(t => {
            const parsed = parseDate(t.date);
            if (parsed.getTime() === 0) return false;

            return parsed.getMonth() === curMonth
                && parsed.getFullYear() === curYear
                && t.type === 'expense'
                && !t.excludeFromBudget;
        })
        .reduce((acc, t) => acc + t.amount, 0);
    const goalPct = monthlyGoal > 0 ? Math.min(Math.round((currentMonthExpense / monthlyGoal) * 100), 100) : 0;
    const daysLeft = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate();

    const name = userName;
    const normalizedUserName = userName.trim().toLowerCase();
    const normalizedUserEmail = (userEmail || '').trim().toLowerCase();
    const hideIdentityEmailAndPassword = normalizedUserName === 'tester' || normalizedUserEmail === 'tester@safed.com';
    const hiddenCurrentEmailLabel = currentEmail ? t('profile.email_hidden_security') : t('profile.email_not_available');
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const requestSensitiveEmailConfirmation = async (messageKey: TranslationKey) => {
        if (!currentEmail) {
            await dialog.alert(t('profile.sensitive_email_missing'));
            return false;
        }

        const typedEmail = await dialog.prompt({
            title: t('profile.sensitive_email_prompt_title'),
            message: t(messageKey),
            inputLabel: t('profile.sensitive_email_prompt_label'),
            inputPlaceholder: t('profile.sensitive_email_prompt_placeholder'),
            confirmLabel: t('btn.confirm'),
            cancelLabel: t('btn.cancel'),
            tone: 'danger',
        });

        if (typedEmail === null) return false;

        if (typedEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()) {
            await dialog.alert(t('profile.sensitive_email_mismatch'));
            return false;
        }

        return true;
    };

    // ── Actions ───────────────────────────────────────────────
    const saveCategoryEdit = async () => {
        if (!editingCategory) return;
        const oldTagNFD = editingCategory.oldTag.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let customStr = localStorage.getItem('financeCustomCategories');
        let customCats = customStr ? JSON.parse(customStr) : [];
        customCats = customCats.filter((c: any) => c.label.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== oldTagNFD);
        customCats.push({ id: editingCategory.newTag.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: editingCategory.newTag.trim(), icon: editingCategory.newIcon });
        localStorage.setItem('financeCustomCategories', JSON.stringify(customCats));
        let hiddenStr = localStorage.getItem('financeHiddenCategories');
        let hiddenCats = hiddenStr ? JSON.parse(hiddenStr) : [];
        if (!hiddenCats.includes(editingCategory.oldTag)) {
            hiddenCats.push(editingCategory.oldTag);
            localStorage.setItem('financeHiddenCategories', JSON.stringify(hiddenCats));
        }
        try {
            const res = await authenticatedFetch('/api/categories', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldTag: editingCategory.oldTag, newTag: editingCategory.newTag, newIcon: editingCategory.newIcon })
            });
            if (res.ok) {
                await updateTransactionsCategory(editingCategory.oldTag, editingCategory.newTag.trim(), editingCategory.newIcon);
                onCategoryChangeInfo();
                setEditingCategory(null);
            }
            else await dialog.alert(t('profile.category_save_error'));
        } catch (e) { console.error(e); }
    };

    const deleteCategory = async (tag: string) => {
        if (!await dialog.confirm({ message: t('profile.category_delete_confirm', { tag }), tone: 'danger' })) return;
        const previousCustomCategories = localStorage.getItem('financeCustomCategories');
        const previousHiddenCategories = localStorage.getItem('financeHiddenCategories');
        const tagNFD = tag.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let customStr = localStorage.getItem('financeCustomCategories');
        if (customStr) {
            let customCats = JSON.parse(customStr);
            customCats = customCats.filter((c: any) => c.label.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== tagNFD);
            localStorage.setItem('financeCustomCategories', JSON.stringify(customCats));
        }
        let hiddenStr = localStorage.getItem('financeHiddenCategories');
        let hiddenCats = hiddenStr ? JSON.parse(hiddenStr) : [];
        if (!hiddenCats.includes(tag)) {
            hiddenCats.push(tag);
            localStorage.setItem('financeHiddenCategories', JSON.stringify(hiddenCats));
        }

        await updateTransactionsCategory(tag, 'OTROS', '❓');
        onCategoryChangeInfo();
        if (editingCategory?.oldTag === tag) setEditingCategory(null);

        try {
            const res = await authenticatedFetch(`/api/categories?oldTag=${encodeURIComponent(tag)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                if (previousCustomCategories === null) localStorage.removeItem('financeCustomCategories');
                else localStorage.setItem('financeCustomCategories', previousCustomCategories);

                if (previousHiddenCategories === null) localStorage.removeItem('financeHiddenCategories');
                else localStorage.setItem('financeHiddenCategories', previousHiddenCategories);

                if (userId) appContext.loadUserTransactions(userId);
                onCategoryChangeInfo();
                await dialog.alert(t('profile.category_save_error'));
            }
        } catch (e) {
            console.error(e);

            if (previousCustomCategories === null) localStorage.removeItem('financeCustomCategories');
            else localStorage.setItem('financeCustomCategories', previousCustomCategories);

            if (previousHiddenCategories === null) localStorage.removeItem('financeHiddenCategories');
            else localStorage.setItem('financeHiddenCategories', previousHiddenCategories);

            if (userId) appContext.loadUserTransactions(userId);
            onCategoryChangeInfo();
            await dialog.alert(t('profile.category_save_error'));
        }
    };

    const saveGoal = async () => {
        try {
            const res = await authenticatedFetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ monthlyGoal: parseFloat(newGoal) })
            });
            if (res.ok) { onUpdate(); setViewMode('menu'); }
            else await dialog.alert(t('profile.goal_save_error'));
        } catch (e) { console.error(e); }
    };

    const handleChangePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            await dialog.alert(t('profile.password_fields_required'));
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            await dialog.alert(t('profile.password_min_length'));
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            await dialog.alert(t('profile.password_mismatch'));
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await authenticatedFetch('/api/auth/password/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                await dialog.alert(
                    data.error === 'invalid_current_password'
                        ? t('profile.password_current_invalid')
                        : t('profile.password_change_error')
                );
                return;
            }

            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            await dialog.alert(t('profile.password_change_success'));
        } catch (e) {
            console.error(e);
            await dialog.alert(t('profile.password_change_error'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleChangeEmail = async () => {
        const normalizedEmail = newEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            await dialog.alert(t('profile.email_required'));
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            await dialog.alert(t('profile.email_invalid'));
            return;
        }

        if (currentEmail && currentEmail.toLowerCase() === normalizedEmail) {
            await dialog.alert(t('profile.email_same'));
            return;
        }

        setIsChangingEmail(true);
        try {
            const res = await authenticatedFetch('/api/auth/email/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newEmail: normalizedEmail })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                await dialog.alert(
                    data.error === 'same_email'
                        ? t('profile.email_same')
                        : data.error === 'invalid_email'
                            ? t('profile.email_invalid')
                            : t('profile.email_change_error')
                );
                return;
            }

            setCurrentEmail(data.email ?? normalizedEmail);
            setNewEmail('');
            onUpdate();
            await dialog.alert(t('profile.email_change_success'));
        } catch (error) {
            console.error(error);
            await dialog.alert(t('profile.email_change_error'));
        } finally {
            setIsChangingEmail(false);
        }
    };

    const handleDeleteAccount = async () => {
        const emailConfirmed = await requestSensitiveEmailConfirmation('profile.delete_account_email_confirm');
        if (!emailConfirmed) return;

        setIsDeletingAccount(true);
        try {
            const res = await authenticatedFetch('/api/user', {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                await dialog.alert(data.error || t('profile.delete_account_error'));
                return;
            }

            await dialog.alert(t('profile.delete_account_success'));
            onLogout();
        } catch (e) {
            console.error(e);
            await dialog.alert(t('profile.delete_account_error'));
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const saveNewCategory = async () => {
        if (!newCategory) return;

        const nextName = newCategory.name.trim();
        const nextIcon = newCategory.icon.trim() || '🏷️';

        if (!nextName) {
            await dialog.alert(t('profile.category_name_required'));
            return;
        }

        const normalize = (value: string) => value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedName = normalize(nextName);
        const alreadyExists = availableCategories.some(category => normalize(category.label) === normalizedName);

        if (alreadyExists) {
            await dialog.alert(t('profile.category_exists'));
            return;
        }

        const existingStr = localStorage.getItem('financeCustomCategories');
        const existing: Category[] = existingStr ? JSON.parse(existingStr) : [];
        existing.push({
            id: nextName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            label: nextName,
            icon: nextIcon,
        });
        localStorage.setItem('financeCustomCategories', JSON.stringify(existing));

        const hiddenStr = localStorage.getItem('financeHiddenCategories');
        const hiddenCats: string[] = hiddenStr ? JSON.parse(hiddenStr) : [];
        const filteredHidden = hiddenCats.filter(tag => normalize(tag) !== normalizedName);
        localStorage.setItem('financeHiddenCategories', JSON.stringify(filteredHidden));

        onCategoryChangeInfo();
        setNewCategory(null);
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="profile-root">
            <BankSyncExplainer
                isOpen={isExplainerOpen}
                onClose={() => setIsExplainerOpen(false)}
                onConfirm={confirmBankSyncAction}
            />
            <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

            {/* Top bar */}
            <div className="profile-topbar">
                <h1 className="profile-title">{t('profile.title')}</h1>
                {viewMode !== 'menu' && (
                    <button className="profile-back-btn" onClick={() => setViewMode('menu')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        {t('btn.back')}
                    </button>
                )}
            </div>

            {/* ── MENU VIEW ── */}
            {viewMode === 'menu' && (
                <>
                    <ProfileMenuView
                        initials={initials}
                        name={name}
                        goalPct={goalPct}
                        currentMonthExpense={currentMonthExpense}
                        monthlyGoal={monthlyGoal}
                        sym={sym}
                        daysLeft={daysLeft}
                        globalCurrency={globalCurrency}
                        currencyOptions={currencyOptions}
                        lang={lang}
                        bankSyncEnabled={bankSyncEnabled}
                        uniqueCategories={uniqueCategories}
                        isOnline={appContext.isOnline}
                        pendingOpsCount={appContext.pendingOpsCount}
                        customColors={appContext.customColors}
                        showAdminReports={appContext.userRole === 'admin'}
                        onOpenIdentity={() => setViewMode('identity')}
                        onOpenGoal={() => setViewMode('goal')}
                        onCurrencyChange={onCurrencyChange}
                        onLanguageChange={setLang}
                        onOpenNotifications={() => setViewMode('notifications')}
                        onOpenCategories={() => setViewMode('categories')}
                        onOpenSync={() => {
                            setViewMode('sync');
                            setSyncResult(null);
                        }}
                        onOpenAdminReports={() => setViewMode('adminReports')}
                        onOpenColors={() => appContext.setIsColorMode(true)}
                        onLogout={onLogout}
                    />
                </>
            )}

            {/* ── CATEGORIES VIEW ── */}
            {viewMode === 'categories' && (
                <ProfileCategoriesView
                    uniqueCategories={uniqueCategories}
                    editingCategory={editingCategory}
                    newCategory={newCategory}
                    setEditingCategory={setEditingCategory}
                    setNewCategory={setNewCategory}
                    onDeleteCategory={deleteCategory}
                    onSaveCategoryEdit={saveCategoryEdit}
                    onSaveNewCategory={saveNewCategory}
                />
            )}

            {/* ── NOTIFICATIONS VIEW ── */}
            {viewMode === 'notifications' && (
                <ProfileNotificationsView
                    bankSyncEnabled={bankSyncEnabled}
                    autoAddEnabled={autoAddEnabled}
                    onOpenPrivacy={() => setIsPrivacyOpen(true)}
                    onToggleBankSync={() => toggleBankSync(!bankSyncEnabled)}
                    onToggleAutoAdd={() => {
                        if (bankSyncEnabled) toggleAutoAdd(!autoAddEnabled);
                    }}
                />
            )}

            {/* ── IDENTITY VIEW ── */}
            {viewMode === 'identity' && (
                <ProfileIdentityView
                    initials={initials}
                    name={name}
                    userRole={appContext.userRole}
                    hideIdentityEmailAndPassword={hideIdentityEmailAndPassword}
                    hiddenCurrentEmailLabel={hiddenCurrentEmailLabel}
                    newEmail={newEmail}
                    setNewEmail={setNewEmail}
                    isChangingEmail={isChangingEmail}
                    onChangeEmail={handleChangeEmail}
                    passwordForm={passwordForm}
                    setPasswordForm={setPasswordForm}
                    isChangingPassword={isChangingPassword}
                    onChangePassword={handleChangePassword}
                    isDeletingAccount={isDeletingAccount}
                    onDeleteAccount={handleDeleteAccount}
                />
            )}
            {/* ── GOAL VIEW ── */}
            {viewMode === 'goal' && (
                <ProfileGoalView
                    sym={sym}
                    newGoal={newGoal}
                    setNewGoal={setNewGoal}
                    onCancel={() => setViewMode('menu')}
                    onSave={saveGoal}
                />
            )}

            {/* ── SYNC VIEW ── */}
            {viewMode === 'sync' && (
                <ProfileSyncView
                    isOnline={appContext.isOnline}
                    pendingOpsCount={appContext.pendingOpsCount}
                    syncResult={syncResult}
                    isSyncing={isSyncing}
                    onSync={handleSync}
                />
            )}

            {viewMode === 'adminReports' && appContext.userRole === 'admin' && (
                <ProfileAdminDebugView />
            )}

            {/* ── COLORS VIEW ── */}
            {viewMode === 'colors' && (
                <div>
                    <div className="profile-subview-label">{t('profile.colors_subview_title')}</div>

                    <div className="profile-color-list">
                        {COLOR_VARS.map(({ variable, labelKey, descKey }) => (
                            <div key={variable} className="profile-color-row">
                                <div className="profile-color-info">
                                    <div className="profile-color-name">{t(labelKey)}</div>
                                    <div className="profile-color-desc">{t(descKey)}</div>
                                    <div className="profile-color-var">{variable}</div>
                                </div>
                                <div className="profile-color-picker-wrap">
                                    <span
                                        className="profile-color-preview"
                                        style={{ background: getCurrentColor(variable) }}
                                    />
                                    <input
                                        type="color"
                                        className="profile-color-input"
                                        value={appContext.customColors[variable] || '#000000'}
                                        onChange={e => appContext.setCustomColor(variable, e.target.value)}
                                        title={`${t('profile.appearance_change_color')}: ${t(labelKey)}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {Object.keys(appContext.customColors).length > 0 && (
                        <button
                            className="profile-colors-reset-btn"
                            onClick={async () => {
                                if (await dialog.confirm({ message: t('profile.colors_reset_confirm') })) {
                                    appContext.resetCustomColors();
                                }
                            }}
                        >
                            ↺ {t('profile.colors_reset')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
