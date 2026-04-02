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
  content: { padding: Spacing.base, gap: Spacing.md },
  description: {
    fontSize: FontSize.xs, lineHeight: 18,
    padding: Spacing.sm,
    borderRadius: Radius.block, borderWidth: 1,
  },
  card: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.card, borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  cardDesc: { fontSize: FontSize.xs, marginBottom: Spacing.sm, lineHeight: 18 },
  btn: {
    paddingVertical: Spacing.sm, borderRadius: Radius.block,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  betaText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
});

