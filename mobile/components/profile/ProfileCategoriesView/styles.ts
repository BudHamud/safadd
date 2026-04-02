import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';

const R = 2;
export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, paddingBottom: 60 },
  description: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.lg },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm },
  list: { gap: Spacing.sm },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: R, borderWidth: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: R,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  catName: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  catUses: { fontSize: FontSize.xs, marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: Spacing.xs },
  miniBtn: { borderWidth: 1, borderRadius: R, paddingHorizontal: 10, paddingVertical: 6 },
  miniBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  formCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: R, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: Radius.block, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: R },
  actionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

