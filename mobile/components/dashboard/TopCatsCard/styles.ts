import { StyleSheet } from 'react-native';
import { Spacing, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
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

