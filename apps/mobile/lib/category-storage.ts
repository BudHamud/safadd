import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category } from '../types';
import { normalizeTag, tagColor } from '@safed/shared/category';

// Re-export pure utilities so existing importers keep working without changes.
export { normalizeTag, tagColor };
export { mergeCategories, normalizeTag as normalizeCategoryTag } from '@safed/shared/category';

const CUSTOM_CATEGORIES_KEY = 'financeCustomCategories';
const HIDDEN_CATEGORIES_KEY = 'financeHiddenCategories';

type StoredCategory = {
  id?: string;
  label?: string;
  name?: string;
  icon?: string;
};

export async function loadCustomCategories(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredCategory[];
    return parsed
      .map((item) => {
        const name = (item.label ?? item.name ?? '').trim();
        if (!name) return null;
        return {
          name,
          icon: item.icon?.trim() || '🏷️',
          color: tagColor(name),
        };
      })
      .filter(Boolean) as Category[];
  } catch {
    return [];
  }
}

export async function loadHiddenCategories(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(HIDDEN_CATEGORIES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.map((value) => normalizeTag(value));
  } catch {
    return [];
  }
}

export async function saveCustomCategory(name: string, icon: string) {
  const existing = await loadCustomCategories();
  const normalized = normalizeTag(name);
  const filtered = existing.filter((category) => normalizeTag(category.name) !== normalized);
  const next = [...filtered, { name: name.trim(), icon: icon.trim() || '🏷️', color: tagColor(name.trim()) }];

  await AsyncStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(next.map((item) => ({ id: item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: item.name, icon: item.icon }))),
  );
}

export async function hideCategory(tag: string) {
  const hidden = await loadHiddenCategories();
  const normalized = normalizeTag(tag);
  const next = hidden.includes(normalized) ? hidden : [...hidden, normalized];
  await AsyncStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(next));
}

export async function unhideCategory(tag: string) {
  const hidden = await loadHiddenCategories();
  const normalized = normalizeTag(tag);
  const next = hidden.filter((value) => value !== normalized);
  await AsyncStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(next));
}
