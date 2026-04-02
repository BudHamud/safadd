import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAmount } from '../../../lib/locale';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

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
