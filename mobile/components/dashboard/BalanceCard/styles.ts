import { StyleSheet } from 'react-native';
import { Spacing, FontWeight } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    padding: Spacing.base,
    borderWidth: 1,
    minHeight: 150,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeight.black,
    letterSpacing: 0.5,
  },
  amountArea: {
    marginTop: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  balanceCurrency: { fontSize: 16, fontWeight: FontWeight.bold, marginTop: 8 },
  balance: { fontSize: 34, fontWeight: FontWeight.black, letterSpacing: -1, lineHeight: 38 },
  trend: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

