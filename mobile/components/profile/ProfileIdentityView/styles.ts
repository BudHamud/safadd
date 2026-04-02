import { StyleSheet } from 'react-native';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';

export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title:    { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content:  { padding: Spacing.base, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
  card:     { gap: Spacing.sm, borderRadius: Radius.block, borderWidth: 1, padding: Spacing.md },
  dangerCard: { borderWidth: 1 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  currentPlanRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.block,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  currentPlanText: { flex: 1, gap: 2 },
  currentPlanName: { fontSize: FontSize.base, fontWeight: FontWeight.black, letterSpacing: 0.2 },
  currentPlanMeta: { fontSize: FontSize.xs, lineHeight: 18 },
  planBtn: {
    borderRadius: Radius.block, borderWidth: 1,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  planBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  optionStack: { gap: Spacing.sm },
  optionRow: {
    borderWidth: 1, borderRadius: Radius.block,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: Spacing.md,
  },
  optionTitle:  { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  optionAction: { fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 0.8, textAlign: 'right' },
  helper:   { fontSize: FontSize.xs, marginTop: 4 },
  field:    { gap: Spacing.xs },
  label:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  input: {
    fontSize: FontSize.base,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  inputDisabled: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.block, borderWidth: 1,
  },
  inputTextDisabled: { fontSize: FontSize.base },
  btn:       { borderRadius: Radius.block, borderWidth: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  btnText:   { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  btnDisabled: { opacity: 0.6 },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderRadius: Radius.block, borderWidth: 1,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  modalScroll:   { flex: 1 },
  modalContent:  { padding: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },
});

