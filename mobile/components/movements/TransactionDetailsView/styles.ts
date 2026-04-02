import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';

export const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.base,
  },
  notesWrap: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs,
  },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  value: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'right', flexShrink: 1 },
  notesText: { fontSize: FontSize.sm, lineHeight: 20 },
});

export const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 1 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.block,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.large,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroIconText: { fontSize: 36 },
  amount: { fontSize: FontSize.xxxl, fontWeight: FontWeight.black, letterSpacing: -1 },
  amountCancelled: { textDecorationLine: 'line-through', opacity: 0.5 },
  description: { fontSize: FontSize.base, textAlign: 'center' },
  descCancelled: { textDecorationLine: 'line-through' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  badge: { fontSize: 9, fontWeight: FontWeight.black, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1 },
  detailsCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
  },
  footerActions: { flexDirection: 'row', gap: Spacing.sm },
  footerBtnSecondary: { flex: 1, borderWidth: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  footerBtnSecondaryText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  footerBtnDanger: { flex: 1, borderWidth: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  footerBtnDangerText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
});

