import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBg: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circlePicker: {
    position: 'absolute',
    width: '66%',
    height: '66%',
    borderRadius: 999,
    alignItems: 'center',
  },
  numberPicker: {
    width: 3,
    height: '16%',
    marginTop: '5%',
    borderRadius: 2,
  },
  copy: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtitle: {
    maxWidth: 260,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
