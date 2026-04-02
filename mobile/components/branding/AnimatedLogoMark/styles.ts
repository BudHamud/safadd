import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
  logoShell: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  circleBg: {
    width: '82%',
    height: '82%',
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
    width: '32%',
    height: '32%',
    borderRadius: 999,
    marginTop: '-15%',
  },
});
