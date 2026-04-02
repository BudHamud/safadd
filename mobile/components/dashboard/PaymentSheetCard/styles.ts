import { StyleSheet } from 'react-native';
import { Spacing, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    padding: Spacing.base,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 1 },
  monthBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  monthBadgeText: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  list: {
    gap: Spacing.sm,
  },
  empty: { fontSize: 11, fontWeight: FontWeight.bold },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineCol: {
    width: 12,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: { width: 1, flex: 1, marginTop: 4 },
  rowBody: {
    flex: 1,
    paddingBottom: Spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: { fontSize: 12, fontWeight: FontWeight.black, flex: 1 },
  badgesInline: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  secondaryBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  secondaryBadgeText: { fontSize: 8, fontWeight: FontWeight.black },
  stateBadge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  stateBadgeText: { fontSize: 8, fontWeight: FontWeight.black },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: Spacing.sm,
  },
  meta: { fontSize: 10, fontWeight: FontWeight.medium, flex: 1 },
  amount: {
    fontSize: 12,
    fontWeight: FontWeight.black,
  },
  footerRow: { marginTop: Spacing.sm, paddingTop: Spacing.md, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center' },
  footerButtonFull: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  footerButtonText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.8 },
});
