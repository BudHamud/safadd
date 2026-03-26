import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CategoryStat } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Spacing, FontWeight } from '../../constants/theme';

type Props = {
  topStats: CategoryStat[];
};

export function TopCatsCard({ topStats }: Props) {
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const palette = [C.primary, C.accent, C.textMain];
  const total = topStats.reduce((s, c) => s + c.total, 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const topSegments = topStats.slice(0, 3).map((stat, index, all) => {
    const pct = total > 0 ? (stat.total / total) * 100 : 0;
    const dasharray = `${(pct / 100) * circumference} ${circumference}`;
    const previousAmount = all.slice(0, index).reduce((sum, item) => sum + item.total, 0);
    const dashoffset = -((total > 0 ? previousAmount / total : 0) * circumference);
    return {
      name: stat.category.name,
      pct,
      dasharray,
      dashoffset,
    };
  });

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: C.textMuted }]}>{t('dashboard.top_expenses').toUpperCase()}</Text>
        <Text style={[styles.countHint, { color: C.textMuted }]}>{topSegments.length > 0 ? `${topSegments.length}` : '0'}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.chartBox}>
          <Svg width={85} height={85} viewBox="0 0 100 100" style={styles.chartSvg}>
            <Circle cx="50" cy="50" r={radius} stroke={C.borderDim} strokeWidth="20" fill="none" />
            {topSegments.length === 0 ? (
              <Circle cx="50" cy="50" r={radius} stroke={C.surfaceHover} strokeWidth="20" fill="none" />
            ) : topSegments.map((segment, index) => (
              <Circle
                key={segment.name}
                cx="50"
                cy="50"
                r={radius}
                stroke={palette[index % palette.length]}
                strokeWidth="20"
                fill="none"
                strokeDasharray={segment.dasharray}
                strokeDashoffset={segment.dashoffset}
              />
            ))}
          </Svg>
          <View style={[styles.chartCenter, { backgroundColor: C.surfaceAlt, borderColor: C.borderDim }]}> 
            <Text style={[styles.chartCenterValue, { color: C.textMain }]}>{topSegments.length > 0 ? `${Math.round(topSegments[0]?.pct ?? 0)}%` : '0%'}</Text>
          </View>
        </View>

        <View style={styles.legendCol}>
          {topSegments.length > 0 ? topSegments.map((segment, index) => (
            <View key={segment.name} style={[styles.legendRow, { backgroundColor: C.surfaceAlt, borderColor: C.borderDim }]}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: palette[index % palette.length] }]} />
                <Text style={[styles.catName, { color: C.textMain }]}>{segment.name}</Text>
              </View>
              <Text style={[styles.catPct, { color: C.textMuted }]}>{Math.round(segment.pct)}%</Text>
            </View>
          )) : (
            <Text style={[styles.empty, { color: C.textMuted }]}>{t('common.no_data')}</Text>
          )}
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
    minHeight: 140,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1 },
  countHint: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  chartBox: {
    width: 85,
    height: 85,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chartSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  chartCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterValue: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: -0.2 },
  legendCol: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: { fontSize: 11, fontWeight: FontWeight.bold },
  catName: { fontSize: 11, fontWeight: FontWeight.bold, textTransform: 'capitalize', flex: 1 },
  catPct: { fontSize: 11, fontWeight: FontWeight.black },
});
