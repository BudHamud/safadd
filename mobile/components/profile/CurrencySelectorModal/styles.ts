import { StyleSheet } from 'react-native';
import type { ColorScheme } from '../../../constants/Colors';
import { FontSize, FontWeight, Spacing } from '../../../constants/theme';

export function createStyles(C: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      letterSpacing: 1,
      color: C.textMuted,
    },
    closeBtn: { padding: Spacing.xs },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: Spacing.base,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: C.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      fontSize: FontSize.base,
      color: C.textMain,
    },
    hint: {
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.sm,
      fontSize: FontSize.xs,
      color: C.textMuted,
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
      gap: Spacing.sm,
    },
    rowActive: { backgroundColor: `${C.primary}14` },
    rowSymbol: { width: 36, alignItems: 'center' },
    symbolText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: C.textMuted,
    },
    rowBody: { flex: 1 },
    codeText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      letterSpacing: 0.5,
    },
    nameText: { fontSize: FontSize.xs, marginTop: 1, color: C.textMuted },
    rowEnd: { width: 24, alignItems: 'center' },
    primaryBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: C.primary,
    },
    activeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: C.primary,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: Spacing.xxxl,
      color: C.textMuted,
      fontSize: FontSize.sm,
    },
  });
}
