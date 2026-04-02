import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';

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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.card, borderWidth: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  uses: { fontSize: FontSize.xs, marginTop: 2 },
});

