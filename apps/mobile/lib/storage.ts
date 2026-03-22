import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItemWithLegacyKey(key: string, legacyKeys: string[] = []) {
  const currentValue = await AsyncStorage.getItem(key);
  if (currentValue !== null) {
    return currentValue;
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = await AsyncStorage.getItem(legacyKey);
    if (legacyValue === null) {
      continue;
    }

    await AsyncStorage.setItem(key, legacyValue);
    await AsyncStorage.removeItem(legacyKey);
    return legacyValue;
  }

  return null;
}

export async function removeKeys(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length === 0) {
    return;
  }

  await AsyncStorage.multiRemove(uniqueKeys);
}