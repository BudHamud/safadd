import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { formatAmount } from '../../lib/locale';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';

type Props = {
  monthlyGoal: number;
  totalExpense: number;
  sym: string;
};

export function GoalCard({ monthlyGoal, totalExpense, sym }: Props) {
  const router = useRouter();
  const { theme: C } = useTheme();
  const { lang, t } = useLanguage();
  const progressPct = monthlyGoal > 0 ? Math.min((totalExpense / monthlyGoal) * 100, 100) : 0;
  const strokeColor = progressPct >= 100 ? C.accent : C.primary;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  if (monthlyGoal === 0) {
    return (
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
        <Text style={[styles.title, { color: C.textMuted }]}>{t('dashboard.expense_goal').toUpperCase()}</Text>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
            <Text style={[styles.emptyIcon, { color: C.textMuted }]}>!</Text>
          </View>
          <Text style={[styles.emptyLabel, { color: C.textMuted }]}>{t('mobile.goal.no_limit')}</Text>
          <Text style={[styles.emptyHint, { color: C.textMuted }]}>{t('mobile.goal.no_limit_hint')}</Text>
          <TouchableOpacity
            style={[styles.configBtn, { borderColor: C.border }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={[styles.configText, { color: C.textMuted }]}>{t('mobile.goal.configure').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <Text style={[styles.title, { color: C.textMuted }]}>{t('dashboard.expense_goal').toUpperCase()}</Text>

      <View style={styles.chartWrap}>
        <Svg width={100} height={100} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r={radius} stroke={C.borderDim} strokeWidth="12" fill="none" />
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin="50, 50"
          />
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={[styles.chartPct, { color: C.textMain }]}>{Math.round(progressPct)}%</Text>
          <Text style={[styles.chartLabel, { color: C.textMuted }]}>{t('common.used').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View>
          <Text style={[styles.statLabel, { color: C.textMuted }]}>{t('common.spent').toUpperCase()}</Text>
          <Text style={[styles.statAmt, { color: C.textMain }]}>{sym}{formatAmount(totalExpense, lang)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.statLabel, { color: C.textMuted }]}>{t('common.limit').toUpperCase()}</Text>
          <Text style={[styles.statAmt, { color: C.textMain }]}>{sym}{formatAmount(monthlyGoal, lang)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    padding: Spacing.base,
    borderWidth: 1,
    minHeight: 150,
  },
  title: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1 },
  emptyState: {
    flex: 1,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 18, fontWeight: FontWeight.black },
  emptyLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  emptyHint: { fontSize: 11, textAlign: 'center' },
  configBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: 'transparent' },
  configText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
    marginVertical: Spacing.sm,
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  chartPct: { fontSize: 18, fontWeight: FontWeight.black },
  chartLabel: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statLabel: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  statAmt: { fontSize: 12, fontWeight: FontWeight.black },
});
