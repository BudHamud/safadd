import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';

export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: {
    padding: Spacing.base,
    gap: Spacing.lg,
  },
  description: {
    fontSize: FontSize.sm, lineHeight: 20,
    padding: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  input: {
    fontSize: FontSize.base,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  amountInput: {
    fontSize: FontSize.xl, fontWeight: FontWeight.black, textAlign: 'center',
  },
  saveBtn: {
    borderRadius: Radius.block,
    paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.black, letterSpacing: 1 },
});

