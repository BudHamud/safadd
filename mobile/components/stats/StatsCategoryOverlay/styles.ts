import { StyleSheet } from 'react-native';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    letterSpacing: 1.4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
    gap: 8,
    paddingBottom: Spacing.xxxl,
  },
  transactionRow: {
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  transactionCopy: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    letterSpacing: 0.5,
  },
  transactionMeta: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  transactionAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
  },
  emptyState: {
    borderWidth: 1,
    padding: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

