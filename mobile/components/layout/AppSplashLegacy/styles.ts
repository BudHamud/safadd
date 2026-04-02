import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
