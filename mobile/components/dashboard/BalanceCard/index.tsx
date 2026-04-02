import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAmount } from '../../../lib/locale';
import { Spacing, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

type Props = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  spendingChangePct: number;
  progressPct: number;
  sym: string;
  hideAmounts?: boolean;
  onToggleHide?: () => void;
};

function fmt(n: number, hide: boolean, lang: 'es' | 'en') {
  if (hide) return '••••';
  return formatAmount(n, lang);
}

export function BalanceCard({ totalIncome, totalExpense, balance, spendingChangePct, progressPct, sym, hideAmounts = false, onToggleHide }: Props) {
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();
  const isNeg = balance < 0;
  const isLow = !isNeg && totalIncome > 0 && (balance / totalIncome) < 0.1;
  const isSolid = !isNeg && !isLow && totalIncome > 0 && (balance / totalIncome) > 0.4;
  const badgeBg = isNeg ? C.accent : isLow ? '#78350f' : C.primary;
  const badgeFg = isNeg ? C.accentText : isLow ? '#fbbf24' : C.primaryText;
  const badgeLabel = isNeg ? t('mobile.balance.risk') : isLow ? t('mobile.balance.tight') : isSolid ? t('mobile.balance.solid') : t('mobile.balance.stable');
  const trendColor = spendingChangePct > 0 ? C.expenseText : C.primary;
  const trendIcon = spendingChangePct > 0 ? '↗' : '↘';
  const waveColor = progressPct > 80 ? C.accent : C.primary;
  const waveOpacity = 0.08 + (progressPct / 200);
  const waveHeight = 30 + (progressPct * 0.4);

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <View style={styles.header}>
        <Text style={[styles.cardLabel, { color: C.textMuted }]}>{t('stats.liquidity').toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}> 
          <Text style={[styles.badgeText, { color: badgeFg }]}>{badgeLabel}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onToggleHide} activeOpacity={0.8} style={styles.amountArea}>
        <View style={styles.balanceRow}>
        <Text style={[styles.balanceCurrency, { color: C.textMuted }]}>{sym}</Text>
        <Text style={[styles.balance, { color: isNeg ? C.accent : C.textMain }]}>{fmt(balance, hideAmounts, lang)}</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.trend, { color: trendColor }]}>
        {trendIcon} {Math.abs(spendingChangePct).toFixed(1)}% {spendingChangePct > 0 ? t('mobile.balance.more_spending') : t('mobile.balance.less_spending')}
      </Text>

      <View style={[styles.waveWrap, { opacity: waveOpacity }]} pointerEvents="none">
        <Svg width="100%" height={waveHeight} viewBox="0 0 100 20" preserveAspectRatio="none">
          <Path d="M0,20 L0,12 Q25,20 50,10 T100,4 L100,20 Z" fill={waveColor} />
        </Svg>
      </View>
    </View>
  );
}
