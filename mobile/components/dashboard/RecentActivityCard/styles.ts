import { StyleSheet } from 'react-native';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';

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
    marginBottom: Spacing.sm,
  },
  headerTag: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6, gap: 7 },
  titleAccent: { width: 3, height: 16 },
  title: { fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 1.1 },
  seeAll: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.6 },
  empty: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, paddingVertical: Spacing.md },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  iconText: { fontSize: 16 },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txDesc: { fontSize: 12, fontWeight: FontWeight.black, textTransform: 'uppercase', letterSpacing: 0.35 },
  txMeta: { fontSize: 10, fontWeight: FontWeight.medium, marginTop: 3 },
  txRight: {
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: FontWeight.black,
    letterSpacing: -0.2,
  },
});

