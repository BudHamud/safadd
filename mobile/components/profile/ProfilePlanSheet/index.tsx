import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { s } from './styles';

type Props = {
  isPro: boolean;
  yearlyPrice: string;
  lifetimePrice: string;
  offeringsLoading: boolean;
  restoreLoading: boolean;
  checkoutLoadingVariant: 'yearly' | 'lifetime' | null;
  onCheckout: (variant: 'yearly' | 'lifetime') => void;
  onRestore: () => void;
};

export function ProfilePlanSheet({
  isPro,
  yearlyPrice,
  lifetimePrice,
  offeringsLoading,
  restoreLoading,
  checkoutLoadingVariant,
  onCheckout,
  onRestore,
}: Props) {
  const { t } = useLanguage();
  const { theme: C } = useTheme();
  const isBusy = offeringsLoading || restoreLoading || checkoutLoadingVariant !== null;

  const compareRows: { feature: string; free: string; pro: string }[] = [
    { feature: t('plan.compare_secondary_currencies'), free: t('plan.compare_currencies_free'), pro: t('plan.compare_currencies_pro') },
    { feature: t('plan.compare_custom_categories'),   free: t('plan.compare_categories_free'), pro: t('plan.compare_categories_pro') },
    { feature: t('plan.compare_analytics'),           free: '✕',                               pro: '✓' },
    { feature: t('plan.compare_imports'),             free: t('plan.compare_rows_free'),        pro: t('plan.compare_rows_pro') },
    { feature: t('plan.compare_support'),             free: t('plan.compare_support_free'),     pro: t('plan.compare_support_pro') },
    { feature: t('plan.compare_annual_cost'),         free: t('plan.compare_cost_free'),        pro: t('plan.compare_cost_pro_yearly') },
  ];

  return (
    <View style={s.stack}>
      {/* Status chip */}
      <View style={[s.statusRow, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={s.statusLeft}>
          <CheckCircle2 size={15} color={C.primary} />
          <Text style={[s.statusText, { color: C.textMain }]}>
            {t('plan.card_title')}: {(isPro ? t('plan.pro_badge') : t('plan.free_badge')).toUpperCase()}
          </Text>
        </View>
        <Text style={[s.statusTier, { color: C.textMuted }]}>
          {(isPro ? t('plan.manage_plan_action') : t('plan.free_badge')).toUpperCase()}
        </Text>
      </View>

      {/* Hero */}
      <View style={s.heroBlock}>
        <Text style={[s.heroTitle, { color: C.textMain }]}>
          {isPro ? t('plan.pro_name') : t('plan.upgrade_action')}
        </Text>
        <Text style={[s.heroSubtitle, { color: C.textMuted }]}>
          {t('plan.compare_subtitle')}
        </Text>
      </View>

      {/* Comparison table */}
      <View style={[s.table, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={s.row}>
          <Text style={[s.headerFeature, { color: C.primary }]}>
            {t('plan.compare_title').toUpperCase()}
          </Text>
          <Text style={[s.headerCol, { color: C.textMuted }]}>
            {t('plan.free_badge').toUpperCase()}
          </Text>
          <Text style={[s.headerCol, { color: C.primary }]}>
            {t('plan.pro_badge').toUpperCase()}
          </Text>
        </View>
        <View style={[s.divider, { backgroundColor: C.border }]} />
        {compareRows.map((item, i) => (
          <View key={item.feature}>
            <View style={s.row}>
              <Text style={[s.cellFeature, { color: C.textMuted }]}>{item.feature}</Text>
              <Text style={[s.cell, { color: C.textMuted }]}>{item.free}</Text>
              <Text style={[s.cell, { color: C.primary }]}>{item.pro}</Text>
            </View>
            {i < compareRows.length - 1 && (
              <View style={[s.divider, { backgroundColor: `${C.border}80` }]} />
            )}
          </View>
        ))}
      </View>

      {/* Offer cards */}
      {!isPro && (
        <View style={s.offerGrid}>
          {/* Yearly */}
          <View style={[s.offerCard, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
            <View style={s.offerTop}>
              <View style={s.offerTitles}>
                <Text style={[s.offerName, { color: C.textMain }]}>{t('plan.offer_yearly_name')}</Text>
                <Text style={[s.offerCaption, { color: C.textMuted }]}>{t('plan.offer_yearly_caption')}</Text>
              </View>
              <View style={s.offerPrice}>
                <Text style={[s.offerAmount, { color: C.textMain }]}>{yearlyPrice}</Text>
                <Text style={[s.offerPeriod, { color: C.textMuted }]}>{t('plan.offer_yearly_period')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.offerBtn, { backgroundColor: C.primary }, isBusy && s.offerBtnDisabled]}
              onPress={() => onCheckout('yearly')}
              disabled={isBusy}
            >
              <Text style={[s.offerBtnText, { color: C.primaryText }]}>
                {(checkoutLoadingVariant === 'yearly' || offeringsLoading ? t('auth.processing') : t('plan.buy_yearly')).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lifetime */}
          <View style={[s.offerCard, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
            <View style={s.offerTop}>
              <View style={s.offerTitles}>
                <Text style={[s.offerName, { color: C.textMain }]}>{t('plan.offer_lifetime_name')}</Text>
                <Text style={[s.offerCaption, { color: C.textMuted }]}>{t('plan.offer_lifetime_caption')}</Text>
              </View>
              <View style={s.offerPrice}>
                <Text style={[s.offerAmount, { color: C.textMain }]}>{lifetimePrice}</Text>
                <Text style={[s.offerPeriod, { color: C.textMuted }]}>{t('plan.offer_lifetime_period')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.offerBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, isBusy && s.offerBtnDisabled]}
              onPress={() => onCheckout('lifetime')}
              disabled={isBusy}
            >
              <Text style={[s.offerBtnText, { color: C.textMain }]}>
                {(checkoutLoadingVariant === 'lifetime' || offeringsLoading ? t('auth.processing') : t('plan.buy_lifetime')).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.restoreBtn, { borderColor: C.border, backgroundColor: C.surface }, isBusy && s.offerBtnDisabled]}
            onPress={onRestore}
            disabled={isBusy}
          >
            <Text style={[s.restoreBtnText, { color: C.textMain }]}>
              {(restoreLoading ? t('auth.processing') : t('plan.restore_action')).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[s.legal, { color: C.textMuted }]}>{t('plan.checkout_legal')}</Text>
    </View>
  );
}
