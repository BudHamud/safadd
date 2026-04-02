import { StyleSheet } from 'react-native';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
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

