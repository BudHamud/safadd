import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { C } from '../../../constants/Colors';

export const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { color: C.textMain, fontSize: FontSize.md, fontWeight: FontWeight.black },
  noneOption: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: C.borderDim,
  },
  noneText: { color: C.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  listContent: { padding: Spacing.base, gap: Spacing.sm },
  pmItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderRadius: Radius.block,
    padding: Spacing.md, borderWidth: 2, borderColor: 'transparent',
    marginBottom: Spacing.sm,
  },
  pmIcon: {
    width: 44, height: 44, borderRadius: Radius.block,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  pmInfo: { flex: 1 },
  pmName: { color: C.textMain, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  pmSub: { color: C.textMuted, fontSize: FontSize.xs, fontFamily: 'monospace' },
  checkDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: C.textMuted, textAlign: 'center', padding: Spacing.xl, fontSize: FontSize.sm },
});

