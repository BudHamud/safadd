import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { getRevenueCatPackages, hasRevenueCatProAccess, isRevenueCatReady, purchaseRevenueCatPackage, restoreRevenueCatPurchases, type RevenueCatPackages, type RevenueCatVariant } from '../lib/revenueCat';
import { getRequestErrorMessage } from '../lib/requestErrors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDialog } from '../context/DialogContext';
import { haptic } from '../utils/haptics';
import Toast from 'react-native-toast-message';

export type IdentitySheet = 'plan' | 'name' | 'email' | 'password' | 'delete' | null;

export function useProfileIdentity() {
  const { session, user, webUser, planTier, refreshProfile, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const dialog = useDialog();
  const isPro = planTier === 'pro';

  const [username, setUsername] = useState(webUser?.username || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<IdentitySheet>(null);
  const [planPackages, setPlanPackages] = useState<RevenueCatPackages>({ yearly: null, lifetime: null });
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [checkoutLoadingVariant, setCheckoutLoadingVariant] = useState<RevenueCatVariant | null>(null);

  useEffect(() => {
    setUsername(webUser?.username || '');
  }, [webUser?.username]);

  const loadPlanPackages = useCallback(async () => {
    if (!user?.id || !isRevenueCatReady()) {
      setPlanPackages({ yearly: null, lifetime: null });
      return { yearly: null, lifetime: null };
    }

    setOfferingsLoading(true);
    try {
      const nextPackages = await getRevenueCatPackages(user.id);
      setPlanPackages(nextPackages);
      return nextPackages;
    } catch (error) {
      console.warn('[ProfileIdentity] RevenueCat offerings load failed:', error);
      setPlanPackages({ yearly: null, lifetime: null });
      return { yearly: null, lifetime: null };
    } finally {
      setOfferingsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeSheet !== 'plan' || isPro) {
      return;
    }

    void loadPlanPackages();
  }, [activeSheet, isPro, loadPlanPackages]);

  const handlePlanAction = async () => {
    if (isPro) {
      await dialog.alert(t('plan.pro_active_body'), t('plan.pro_active_title'));
      return;
    }
    setActiveSheet('plan');
  };

  const handleCheckout = async (variant: RevenueCatVariant) => {
    if (!user?.id || !isRevenueCatReady()) {
      await dialog.alert(t('plan.checkout_missing_body'), t('plan.checkout_missing_title'));
      return;
    }

    let selectedPackage = planPackages[variant];
    if (!selectedPackage) {
      const freshPackages = await loadPlanPackages();
      selectedPackage = freshPackages[variant];
    }

    if (!selectedPackage) {
      await dialog.alert(t('plan.checkout_missing_body'), t('plan.checkout_missing_title'));
      return;
    }

    const confirmed = await dialog.confirm({
      title: variant === 'yearly' ? t('plan.offer_yearly_name') : t('plan.offer_lifetime_name'),
      message: selectedPackage.product.priceString || (variant === 'yearly' ? t('plan.offer_yearly_price') : t('plan.offer_lifetime_price')),
      confirmText: t('plan.checkout_confirm_action'),
      cancelText: t('btn.cancel'),
      type: 'confirm',
    });

    if (!confirmed) {
      return;
    }

    setCheckoutLoadingVariant(variant);
    try {
      const { customerInfo } = await purchaseRevenueCatPackage(selectedPackage);
      await refreshProfile();
      setActiveSheet(null);
      haptic.success();
      Toast.show({
        type: 'success',
        text1: t('plan.pro_active_title'),
        text2: hasRevenueCatProAccess(customerInfo) ? t('plan.purchase_success_body') : t('plan.purchase_pending_body'),
      });
    } catch (error: any) {
      if (error?.userCancelled) {
        return;
      }

      haptic.error();
      Toast.show({
        type: 'error',
        text1: t('details.save_error'),
        text2: error?.message || t('plan.purchase_error_body'),
      });
    } finally {
      setCheckoutLoadingVariant(null);
    }
  };

  const handleRestorePurchases = async () => {
    if (!user?.id || !isRevenueCatReady()) {
      await dialog.alert(t('plan.checkout_missing_body'), t('plan.checkout_missing_title'));
      return;
    }

    setRestoreLoading(true);
    try {
      const customerInfo = await restoreRevenueCatPurchases();
      await refreshProfile();

      if (hasRevenueCatProAccess(customerInfo)) {
        haptic.success();
        await dialog.alert(t('plan.restore_success_body'), t('plan.restore_success_title'));
        setActiveSheet(null);
        return;
      }

      await dialog.alert(t('plan.restore_empty_body'), t('plan.restore_empty_title'));
    } catch (error: any) {
      haptic.error();
      Toast.show({
        type: 'error',
        text1: t('details.save_error'),
        text2: error?.message || t('plan.purchase_error_body'),
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!webUser?.id) return;
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('profile.username_label'), text2: t('mobile.profile.username_required_desc') });
      return;
    }

    if (normalizedUsername === (webUser.username || '').trim()) {
      setActiveSheet(null);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('User')
        .update({ username: normalizedUsername })
        .eq('id', webUser.id);

      if (error) throw error;

      await refreshProfile();
      haptic.success();
      Toast.show({ type: 'success', text1: t('mobile.profile.profile_saved_title'), text2: t('mobile.profile.profile_saved_desc') });
      setActiveSheet(null);
    } catch (e: any) {
      haptic.error();
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: e.message || t('mobile.profile.profile_save_error_desc') });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      Toast.show({ type: 'error', text1: t('profile.email_section_title'), text2: t('profile.email_required') });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Toast.show({ type: 'error', text1: t('profile.email_section_title'), text2: t('profile.email_invalid') });
      return;
    }

    setEmailLoading(true);
    try {
      const response = await apiFetch('/api/auth/email/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: normalizedEmail }),
      }, session);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('profile.email_change_error'));
      }

      setNewEmail('');
      setActiveSheet(null);
      Toast.show({ type: 'success', text1: t('profile.email_section_title'), text2: t('profile.email_change_success') });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: getRequestErrorMessage(error, t('profile.email_change_error'), lang) });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_fields_required') });
      return;
    }

    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_min_length') });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.password_section_title'), text2: t('profile.password_mismatch') });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await apiFetch('/api/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      }, session);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const msg = payload.error === 'invalid_current_password'
          ? t('profile.password_current_invalid')
          : (payload.error || t('profile.password_change_error'));
        throw new Error(msg);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSheet(null);
      Toast.show({ type: 'success', text1: t('profile.password_section_title'), text2: t('profile.password_change_success') });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: getRequestErrorMessage(error, t('profile.password_change_error'), lang) });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if ((confirmDeleteEmail.trim().toLowerCase() || '') !== (user?.email?.trim().toLowerCase() || '')) {
      Toast.show({ type: 'error', text1: t('profile.delete_account_title'), text2: t('profile.sensitive_email_mismatch') });
      return;
    }

    const confirmed = await dialog.confirm({
      title: t('profile.delete_account_title'),
      message: t('profile.delete_account_confirm'),
      confirmText: t('profile.delete_account_action'),
      type: 'danger',
    });

    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      const response = await apiFetch('/api/user', { method: 'DELETE' }, session);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('profile.delete_account_error'));
      }

      Toast.show({ type: 'success', text1: t('profile.delete_account_title'), text2: t('profile.delete_account_success') });
      await signOut();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: getRequestErrorMessage(error, t('profile.delete_account_error'), lang) });
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    // auth
    user,
    webUser,
    isPro,
    // form state
    username, setUsername,
    newEmail, setNewEmail,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    confirmDeleteEmail, setConfirmDeleteEmail,
    // loading
    loading,
    emailLoading,
    passwordLoading,
    deleteLoading,
    offeringsLoading,
    restoreLoading,
    checkoutLoadingVariant,
    planPackages,
    // sheet nav
    activeSheet,
    setActiveSheet,
    // handlers
    handlePlanAction,
    handleCheckout,
    handleRestorePurchases,
    handleSaveName,
    handleChangeEmail,
    handleChangePassword,
    handleDeleteAccount,
  };
}
