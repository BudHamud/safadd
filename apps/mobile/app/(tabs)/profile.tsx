import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { ProfileIdentityView } from '../../components/profile/ProfileIdentityView';
import { ProfileGoalView } from '../../components/profile/ProfileGoalView';
import { ProfileThemeView } from '../../components/profile/ProfileThemeView';
import { ProfileNotificationsView } from '../../components/profile/ProfileNotificationsView';
import { ProfileSyncView } from '../../components/profile/ProfileSyncView';
import { ProfileCategoriesView } from '../../components/profile/ProfileCategoriesView';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDisplayGoalAmount } from '../../hooks/useDisplayGoalAmount';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { haptic } from '../../utils/haptics';
import { formatAmount } from '../../lib/locale';
import { getCurrencySymbol } from '../../lib/currency';
import { useDialog } from '../../context/DialogContext';

type Section = 'identity' | 'goal' | 'theme' | 'categories' | 'notifications' | 'sync' | null;

export default function ProfileScreen() {
  const { user, profile, webUser, signOut, currency, availableCurrencies, setCurrency, addCurrency } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme: C } = useTheme();
  const dialog = useDialog();
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { categories, stats } = useDashboardData(webUser?.id ?? null, currency);

  const displayName = (webUser?.username ?? profile?.full_name ?? user?.email ?? t('profile.title')).toUpperCase();
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const sym = getCurrencySymbol(currency);
  const monthlyGoal = profile?.monthly_goal ?? 0;
  const displayMonthlyGoal = useDisplayGoalAmount(monthlyGoal);
  const goalPct = displayMonthlyGoal > 0 ? Math.min(Math.round((stats.totalExpense / displayMonthlyGoal) * 100), 100) : 0;
  const languageLabel = lang === 'es' ? t('profile.language_name_es') : t('profile.language_name_en');

  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  // ── Currency labels from i18n ──────────────────────────────────────────────
  const currencyOptions = useMemo(() => ([
    { value: 'USD' as const, label: t('profile.currency_usd') },
    { value: 'EUR' as const, label: t('profile.currency_eur') },
    { value: 'ARS' as const, label: t('profile.currency_ars') },
    { value: 'ILS' as const, label: t('profile.currency_ils') },
  ]), [t]);

  const currentCurrencyLabel = currencyOptions.find(o => o.value === currency)?.label ?? currency;
  const enabledCurrencyOptions = currencyOptions.filter((option) => availableCurrencies.includes(option.value));
  const availableToAddOptions = currencyOptions.filter((option) => !availableCurrencies.includes(option.value));

  // ── Currency picker ────────────────────────────────────────────────────────
  const openCurrencyPicker = () => {
    haptic.selection();
    setIsCurrencyModalOpen(true);
  };

  const handleCurrencySelect = (nextCurrency: typeof currency) => {
    haptic.selection();
    setIsCurrencyModalOpen(false);
    void setCurrency(nextCurrency);
  };

  const handleAddCurrency = (nextCurrency: typeof currency) => {
    haptic.selection();
    void addCurrency(nextCurrency);
  };

  const handleSignOut = async () => {
    const confirmed = await dialog.confirm({
      title: t('profile.logout'),
      message: t('profile.logout_confirm', { defaultValue: 'Are you sure you want to sign out?' }),
      confirmText: t('profile.logout'),
      type: 'danger',
    });

    if (confirmed) {
      setSigningOut(true);
      await signOut();
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Title ── */}
        <Text style={[s.pageTitle, { color: C.textMain }]}>{t('profile.title').toUpperCase()}</Text>

        {/* ══════════════════════════════════════════════
            IDENTITY CARD
        ══════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { haptic.selection(); setActiveSection('identity'); }}
          activeOpacity={0.8}
        >
          <View style={s.cardLabelRow}>
            <Text style={[s.cardLabel, { color: C.textMuted }]}>{t('profile.card_identity').toUpperCase()}</Text>
            <View style={[s.badge, { borderColor: C.primary, backgroundColor: `${C.primary}22` }]}>
              <Text style={[s.badgeTxt, { color: C.primary }]}>{t('profile.card_identity_badge').toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.identityRow}>
            <View style={[s.avatar, { backgroundColor: C.primary }]}>
              <Text style={[s.avatarTxt, { color: C.primaryText }]}>{initials}</Text>
            </View>
            <Text style={[s.bigName, { color: C.textMain }]} numberOfLines={1}>{displayName}</Text>
          </View>
          <View style={s.devicesRow}>
            <View style={[s.deviceIcon, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
              <Text style={{ fontSize: 10 }}>📱</Text>
            </View>
            <Text style={[s.devicesLabel, { color: C.textMuted }]}>{t('profile.card_manage_devices').toUpperCase()}</Text>
          </View>
        </TouchableOpacity>

        {/* ══════════════════════════════════════════════
            EXPENSE GOAL CARD
        ══════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { haptic.selection(); setActiveSection('goal'); }}
          activeOpacity={0.8}
        >
          <View style={s.cardLabelRow}>
            <Text style={[s.cardLabel, { color: C.textMuted }]}>{t('profile.card_expense_goal').toUpperCase()}</Text>
            <Text style={[s.cardLabel, { color: C.textMuted }]}>{goalPct}{t('profile.goal_consumed').toUpperCase()}</Text>
          </View>
          <Text style={[s.goalAmount, { color: C.textMain }]} numberOfLines={1} adjustsFontSizeToFit>
            {sym}{formatAmount(stats.totalExpense, lang)}
            {'  '}
            <Text style={[s.goalLimit, { color: C.textMuted }]}>
              / {displayMonthlyGoal > 0 ? `${sym}${formatAmount(displayMonthlyGoal, lang)}` : t('mobile.goal.no_limit')}
            </Text>
          </Text>
          <View style={s.daysRow}>
            <Text style={{ fontSize: 11, color: C.textMuted }}>🕐</Text>
            <Text style={[s.devicesLabel, { color: C.textMuted }]}>
              {t('profile.days_left_pre')}{daysLeft} {t('profile.days_left_suf').toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ══════════════════════════════════════════════
            CURRENCY CARD — tap to open picker
        ══════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={openCurrencyPicker}
          activeOpacity={0.8}
        >
          <View style={s.cardLabelRow}>
            <Text style={[s.cardLabel, { color: C.textMuted }]}>{t('profile.card_currency').toUpperCase()}</Text>
            <Text style={{ fontSize: 13, color: C.textMuted }}>🌐</Text>
          </View>
          {/* Current currency — large, updates instantly on change */}
          <Text style={[s.currencyName, { color: C.textMain }]}>{currentCurrencyLabel.toUpperCase()}</Text>
          <Text style={[s.cardLabel, { color: C.textMuted }]}>
            {`${availableCurrencies.length} ${t('profile.currency_available').toUpperCase()}`}
          </Text>
        </TouchableOpacity>

        {/* ══════════════════════════════════════════════
            LANGUAGE CARD
        ══════════════════════════════════════════════ */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardLabelRow}>
            <Text style={[s.cardLabel, { color: C.textMuted }]}>{t('profile.language').toUpperCase()}</Text>
            <Text style={{ fontSize: 13, color: C.textMuted }}>🌐</Text>
          </View>
          {/* Flags — same as web */}
          <View style={s.langRow}>
            <TouchableOpacity
              style={[s.langBtn, { backgroundColor: lang === 'es' ? C.primary : 'transparent' }]}
              onPress={() => { haptic.selection(); void setLang('es'); }}
            >
              <Text style={[s.langBtnTxt, { color: lang === 'es' ? C.primaryText : C.textMuted }]}>
                🇦🇷 ES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.langBtn, { backgroundColor: lang === 'en' ? C.primary : 'transparent' }]}
              onPress={() => { haptic.selection(); void setLang('en'); }}
            >
              <Text style={[s.langBtnTxt, { color: lang === 'en' ? C.primaryText : C.textMuted }]}>
                🇬🇧 EN
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.devicesLabel, { color: C.textMuted }]}>{languageLabel.toUpperCase()}</Text>
        </View>

        {/* ══════════════════════════════════════════════
            ROW ITEMS
        ══════════════════════════════════════════════ */}

        {/* Bank Integration */}
        <RowItem
          iconChar="↺"
          label={t('profile.bank_integration')}
          value={t('profile.bank_unlinked')}
          valueColor={C.expenseText}
          onPress={() => { haptic.selection(); setActiveSection('notifications'); }}
          C={C}
        />

        {/* Categories — emojis reales */}
        <TouchableOpacity
          style={[s.rowItem, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => { haptic.selection(); setActiveSection('categories'); }}
          activeOpacity={0.75}
        >
          <View style={[s.rowIcon, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
            <Text style={{ fontSize: 14, color: C.textMuted }}>⊞</Text>
          </View>
          <View style={s.rowContent}>
            <Text style={[s.rowLabel, { color: C.textMuted }]}>{t('profile.categories_row').toUpperCase()}</Text>
            {categories.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                {categories.slice(0, 4).map((cat, i) => (
                  <Text key={i} style={{ fontSize: 16 }}>{(cat as any).icon || '🏷️'}</Text>
                ))}
                {categories.length > 4 && (
                  <Text style={{ fontSize: 9, fontWeight: FontWeight.black, color: C.textMuted }}>
                    +{categories.length - 4}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[s.rowValue, { color: C.textMain }]}>{t('mobile.profile.categories_empty').toUpperCase()}</Text>
            )}
          </View>
          {/* @ts-ignore */}
          <ChevronRight size={14} color={C.textMuted} />
        </TouchableOpacity>

        {/* Sync */}
        <RowItem
          iconChar="↺"
          label={t('profile.sync_title')}
          value={`✓ ${t('profile.sync_none')}`}
          valueColor={C.primary}
          onPress={() => { haptic.selection(); setActiveSection('sync'); }}
          C={C}
        />

        {/* Theme / Colors */}
        <RowItem
          iconChar="◉"
          label={t('profile.colors_title')}
          value={t('mobile.profile.theme_sub')}
          onPress={() => { haptic.selection(); setActiveSection('theme'); }}
          C={C}
        />

        {/* ══════════════════════════════════════════════
            LOGOUT — sólido verde, igual que web
        ══════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[s.logout, { backgroundColor: C.primary }]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.85}
        >
          {signingOut ? (
            <ActivityIndicator color={C.primaryText} size="small" />
          ) : (
            <>
              <Text style={{ fontSize: 14, color: C.primaryText }}>→</Text>
              <Text style={[s.logoutTxt, { color: C.primaryText }]}>
                {t('profile.logout').toUpperCase()}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.version, { color: C.textMuted }]}>{t('mobile.profile.version')}</Text>
      </ScrollView>

      <Modal
        transparent
        visible={isCurrencyModalOpen}
        animationType="fade"
        onRequestClose={() => setIsCurrencyModalOpen(false)}
      >
        <View style={[s.overlay, { backgroundColor: `${C.bg}CC` }]}> 
          <TouchableOpacity style={s.overlayDismiss} activeOpacity={1} onPress={() => setIsCurrencyModalOpen(false)} />
          <View style={[s.currencyModal, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <View style={s.currencyModalHeader}>
              <Text style={[s.currencyModalTitle, { color: C.textMain }]}>{t('profile.card_currency').toUpperCase()}</Text>
              <Text style={[s.currencyModalSubtitle, { color: C.textMuted }]}>{t('profile.currency_sub').toUpperCase()}</Text>
            </View>
            {enabledCurrencyOptions.map((option) => {
              const selected = option.value === currency;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[s.currencyOption, { borderColor: C.border, backgroundColor: selected ? `${C.primary}18` : C.surfaceAlt }]}
                  onPress={() => handleCurrencySelect(option.value)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={[s.currencyOptionLabel, { color: selected ? C.textMain : C.textMuted }]}>{option.label.toUpperCase()}</Text>
                    <Text style={[s.currencyOptionValue, { color: C.textMain }]}>{getCurrencySymbol(option.value)} {option.value}</Text>
                  </View>
                  <View style={[s.currencyOptionRadio, { borderColor: selected ? C.primary : C.border, backgroundColor: selected ? C.primary : 'transparent' }]}>
                    {selected ? <View style={[s.currencyOptionDot, { backgroundColor: C.primaryText }]} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {availableToAddOptions.length > 0 ? (
              <View style={s.currencyAddBlock}>
                <Text style={[s.currencyAddTitle, { color: C.textMuted }]}>{t('profile.currency_add').toUpperCase()}</Text>
                <View style={s.currencyAddRow}>
                  {availableToAddOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[s.currencyAddBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                      onPress={() => handleAddCurrency(option.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.currencyAddBtnText, { color: C.textMain }]}>{getCurrencySymbol(option.value)} {option.value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <TouchableOpacity
              style={[s.currencyCancel, { borderColor: C.border }]}
              onPress={() => setIsCurrencyModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={[s.currencyCancelText, { color: C.textMain }]}>{t('btn.cancel').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modals ── */}
      <Modal
        visible={
          activeSection === 'identity' ||
          activeSection === 'goal' ||
          activeSection === 'theme' ||
          activeSection === 'categories' ||
          activeSection === 'notifications' ||
          activeSection === 'sync'
        }
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={() => setActiveSection(null)}
      >
        {activeSection === 'identity' ? (
          <ProfileIdentityView onClose={() => setActiveSection(null)} />
        ) : activeSection === 'goal' ? (
          <ProfileGoalView onClose={() => setActiveSection(null)} />
        ) : activeSection === 'theme' ? (
          <ProfileThemeView onClose={() => setActiveSection(null)} />
        ) : activeSection === 'categories' ? (
          <ProfileCategoriesView onClose={() => setActiveSection(null)} />
        ) : activeSection === 'notifications' ? (
          <ProfileNotificationsView onClose={() => setActiveSection(null)} />
        ) : activeSection === 'sync' ? (
          <ProfileSyncView onClose={() => setActiveSection(null)} />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function RowItem({
  iconChar, label, value, valueColor, onPress, C,
}: {
  iconChar: string;
  label: string;
  value: string;
  valueColor?: string;
  onPress: () => void;
  C: typeof import('../../constants/Colors').Dark;
}) {
  return (
    <TouchableOpacity
      style={[s.rowItem, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s.rowIcon, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
        <Text style={{ fontSize: 16, color: C.textMuted }}>{iconChar}</Text>
      </View>
      <View style={s.rowContent}>
        <Text style={[s.rowLabel, { color: C.textMuted }]}>{label.toUpperCase()}</Text>
        <Text style={[s.rowValue, { color: valueColor ?? C.textMain }]} numberOfLines={1}>
          {value.toUpperCase()}
        </Text>
      </View>
      {/* @ts-ignore */}
      <ChevronRight size={14} color={C.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const R = 2;
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.base, gap: Spacing.xs, paddingBottom: Spacing.xxxl },
  pageTitle: {
    fontSize: 28, fontWeight: FontWeight.black, letterSpacing: -0.5, marginBottom: Spacing.xs,
  },
  card: { borderWidth: 1, borderRadius: R, padding: Spacing.md, gap: Spacing.xs },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.8, textTransform: 'uppercase' },
  badge: { borderWidth: 1, borderRadius: R, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1, textTransform: 'uppercase' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 12, fontWeight: FontWeight.black },
  bigName: { fontSize: 22, fontWeight: FontWeight.black, letterSpacing: -0.5, flex: 1 },
  devicesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  deviceIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  devicesLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  goalAmount: { fontSize: 36, fontWeight: FontWeight.black, letterSpacing: -1, marginTop: 2, lineHeight: 40 },
  goalLimit: { fontSize: 14, fontWeight: '700' },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  currencyName: { fontSize: 20, fontWeight: FontWeight.black, letterSpacing: -0.3, marginTop: 2 },
  langRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  langBtn: { flex: 1, borderRadius: R, paddingVertical: 8, alignItems: 'center' },
  langBtnTxt: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 0.3 },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: R, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
  },
  rowIcon: { width: 36, height: 36, borderWidth: 1, borderRadius: R, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  rowValue: { fontSize: 14, fontWeight: FontWeight.black, letterSpacing: 0.2, textTransform: 'uppercase' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  currencyModal: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: R,
    borderTopRightRadius: R,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  currencyModalHeader: { gap: 4, marginBottom: Spacing.xs },
  currencyModalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  currencyModalSubtitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  currencyOption: {
    borderWidth: 1,
    borderRadius: R,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyOptionLabel: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  currencyOptionValue: { fontSize: 16, fontWeight: FontWeight.black, marginTop: 2 },
  currencyOptionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyOptionDot: { width: 8, height: 8, borderRadius: 4 },
  currencyAddBlock: { gap: Spacing.xs, marginTop: Spacing.xs },
  currencyAddTitle: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  currencyAddRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  currencyAddBtn: { borderWidth: 1, borderRadius: R, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  currencyAddBtnText: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  currencyCancel: { marginTop: Spacing.xs, borderWidth: 1, borderRadius: R, padding: Spacing.md, alignItems: 'center' },
  currencyCancelText: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 1.2 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.md, borderRadius: R, marginTop: Spacing.xs,
  },
  logoutTxt: { fontSize: 12, fontWeight: FontWeight.black, letterSpacing: 1.5 },
  version: { fontSize: FontSize.xs, textAlign: 'center', opacity: 0.5 },
});
