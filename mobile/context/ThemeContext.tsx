import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemWithLegacyKey, removeKeys } from '../lib/storage';
import {
  ColorScheme,
  DEFAULT_THEME_PRESET_ID,
  Dark,
  Light,
  THEME_PRESETS,
  getThemePreset,
} from '../constants/Colors';

const STORAGE_KEY = 'safadd_custom_colors';
const LEGACY_STORAGE_KEY = 'safed_custom_colors';
const DARK_MODE_KEY = 'safadd_dark_mode';
const LEGACY_DARK_MODE_KEY = 'safed_dark_mode';
const PRESET_KEY = 'safadd_theme_preset';
const LEGACY_PRESET_KEY = 'safed_theme_preset';
const ACCENT_KEY = 'safadd_accent_color';
const LEGACY_ACCENT_KEY = 'safed_accent_color';

function isValidStoredColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const color = value.trim();
  if (!color) return false;
  if (THEME_PRESETS.some((preset) => preset.id === color)) return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
    || /^(rgb|hsl)a?\(/i.test(color);
}

function sanitizeCustomColors(input: unknown): CustomColors {
  if (!input || typeof input !== 'object') return {};
  const next: CustomColors = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isValidStoredColor(value)) {
      next[key as keyof ColorScheme] = value;
    }
  }

  return next;
}

type CustomColors = Partial<ColorScheme>;

type ThemeContextType = {
  theme: ColorScheme;
  isDark: boolean;
  activePresetId: string;
  customColors: CustomColors;
  setCustomColor: (key: keyof ColorScheme, value: string) => Promise<void>;
  clearCustomColor: (key: keyof ColorScheme) => Promise<void>;
  resetCustomColors: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  // Legacy compat
  setPrimaryColor: (color: string) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: Dark,
  isDark: true,
  activePresetId: DEFAULT_THEME_PRESET_ID,
  customColors: {},
  setCustomColor: async () => {},
  clearCustomColor: async () => {},
  resetCustomColors: async () => {},
  toggleDarkMode: async () => {},
  applyPreset: async () => {},
  setPrimaryColor: async () => {},
});

function applyCustomColors(base: ColorScheme, custom: CustomColors): ColorScheme {
  return { ...base, ...custom };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [activePresetId, setActivePresetId] = useState(DEFAULT_THEME_PRESET_ID);
  const [customColors, setCustomColors] = useState<CustomColors>({});

  const presetTheme = getThemePreset(activePresetId);
  const fallbackTheme = isDark ? Dark : Light;
  const baseTheme = presetTheme?.colors ?? fallbackTheme;

  // Merged theme = base + overrides
  const theme = applyCustomColors(baseTheme, customColors);

  // Load persisted preferences
  useEffect(() => {
    const load = async () => {
      try {
        const [savedColors, savedDarkMode, savedAccent, savedPreset] = await Promise.all([
          getItemWithLegacyKey(STORAGE_KEY, [LEGACY_STORAGE_KEY]),
          getItemWithLegacyKey(DARK_MODE_KEY, [LEGACY_DARK_MODE_KEY]),
          getItemWithLegacyKey(ACCENT_KEY, [LEGACY_ACCENT_KEY]),
          getItemWithLegacyKey(PRESET_KEY, [LEGACY_PRESET_KEY]),
        ]);

        const preset = savedPreset ? getThemePreset(savedPreset) : getThemePreset(DEFAULT_THEME_PRESET_ID);
        const darkMode = savedDarkMode !== null ? savedDarkMode === 'true' : preset.isDark;
        setIsDark(darkMode);
        setActivePresetId(preset.id);

        if (savedColors) {
          const parsed = sanitizeCustomColors(JSON.parse(savedColors));
          setCustomColors(parsed);
          if (Object.keys(parsed).length === 0) {
            await removeKeys([STORAGE_KEY, LEGACY_STORAGE_KEY]);
          }
        } else if (isValidStoredColor(savedAccent)) {
          const migrated: CustomColors = { primary: savedAccent };
          setCustomColors(migrated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else if (savedAccent) {
          await removeKeys([ACCENT_KEY, LEGACY_ACCENT_KEY]);
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const setCustomColor = useCallback(async (key: keyof ColorScheme, value: string) => {
    setCustomColors((prev) => {
      const next = { ...prev, [key]: value };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCustomColor = useCallback(async (key: keyof ColorScheme) => {
    setCustomColors((prev) => {
      const next = { ...prev };
      delete next[key];

      if (Object.keys(next).length === 0) {
        void removeKeys([STORAGE_KEY, LEGACY_STORAGE_KEY, ACCENT_KEY, LEGACY_ACCENT_KEY]);
      } else {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const resetCustomColors = useCallback(async () => {
    setCustomColors({});
    await removeKeys([STORAGE_KEY, LEGACY_STORAGE_KEY, ACCENT_KEY, LEGACY_ACCENT_KEY]);
  }, []);

  const applyPreset = useCallback(async (presetId: string) => {
    const preset = getThemePreset(presetId);
    setActivePresetId(preset.id);
    setIsDark(preset.isDark);
    setCustomColors({});
    await AsyncStorage.setItem(PRESET_KEY, preset.id);
    await AsyncStorage.setItem(DARK_MODE_KEY, String(preset.isDark));
    await removeKeys([STORAGE_KEY, LEGACY_STORAGE_KEY, ACCENT_KEY, LEGACY_ACCENT_KEY]);
  }, []);

  const toggleDarkMode = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    const fallbackPreset = next ? 'organic-dark' : 'organic-light';
    setActivePresetId(fallbackPreset);
    setCustomColors({});
    await AsyncStorage.setItem(DARK_MODE_KEY, String(next));
    await AsyncStorage.setItem(PRESET_KEY, fallbackPreset);
    await removeKeys([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  }, [isDark]);

  // Legacy compat: setPrimaryColor
  const setPrimaryColor = useCallback(async (color: string) => {
    await setCustomColor('primary', color);
    await AsyncStorage.setItem(ACCENT_KEY, color);
  }, [setCustomColor]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, activePresetId, customColors, setCustomColor, clearCustomColor, resetCustomColors, toggleDarkMode, applyPreset, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
