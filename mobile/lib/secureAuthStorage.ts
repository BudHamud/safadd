import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'safadd.auth',
};

async function getSecureValue(key: string) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }

  try {
    const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (value != null) {
      return value;
    }

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue != null) {
      await SecureStore.setItemAsync(key, legacyValue, SECURE_STORE_OPTIONS);
      await AsyncStorage.removeItem(key);
    }

    return legacyValue;
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function setSecureValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    await AsyncStorage.removeItem(key);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function removeSecureValue(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }

  await Promise.allSettled([
    SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
    AsyncStorage.removeItem(key),
  ]);
}

export const secureAuthStorage = {
  getItem: getSecureValue,
  setItem: setSecureValue,
  removeItem: removeSecureValue,
};