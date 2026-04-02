import { StyleSheet } from 'react-native';
import { Spacing, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  icon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  desc: { fontSize: 13, fontWeight: FontWeight.black, flex: 1, letterSpacing: 0.2 },
  descCancelled: { textDecorationLine: 'line-through' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  metaText: { fontSize: 11, fontWeight: FontWeight.semibold, letterSpacing: 0.3, maxWidth: '85%' },
  badge: { fontSize: 8, fontWeight: FontWeight.black, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2, letterSpacing: 0.3 },
  amount: {
    fontSize: 15,
    fontWeight: FontWeight.black,
    letterSpacing: -0.3,
  },
  amountCancelled: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});

