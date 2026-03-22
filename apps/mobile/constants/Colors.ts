/**
 * Colors — safed-mobile
 * Extracted from gastos-app web color presets.
 */

export type ColorScheme = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  iconBg: string;
  border: string;
  borderDim: string;
  primary: string;
  primaryShadow: string;
  primaryText: string;
  accent: string;
  accentShadow: string;
  accentText: string;
  textMain: string;
  textMuted: string;
  textInverse: string;
  brandPillBg: string;
  brandPillText: string;
  income: string;
  expense: string;
  incomeText: string;
  expenseText: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  emoji: string;
  isDark: boolean;
  colors: ColorScheme;
};

export const Dark: ColorScheme = {
  // Backgrounds
  bg: '#0d0f0d',
  surface: '#141714',
  surfaceAlt: '#1a1a1a',
  surfaceHover: '#1e211e',
  iconBg: '#222222',

  // Borders
  border: '#2b2e2b',
  borderDim: '#1c1e1c',

  // Primary (green)
  primary: '#5d7253',
  primaryShadow: '#000000',
  primaryText: '#0d0d0d',

  // Accent (red/negative)
  accent: '#8e4a39',
  accentShadow: '#000000',
  accentText: '#e0e0ce',

  // Text
  textMain: '#e0e0ce',
  textMuted: '#8c8c80',
  textInverse: '#0d0d0d',

  // Brand
  brandPillBg: '#5d7253',
  brandPillText: '#0d0d0d',

  // Semantic shortcuts
  income: '#5d7253',
  expense: '#8e4a39',
  incomeText: '#a3e6b0',
  expenseText: '#f0a090',
};

export const Light: ColorScheme = {
  // Backgrounds
  bg: '#f8f6f0',
  surface: '#ffffff',
  surfaceAlt: '#e9e5db',
  surfaceHover: '#f1efeb',
  iconBg: '#eeeeee',

  // Borders
  border: '#111411',
  borderDim: '#d3d1cb',

  // Primary
  primary: '#cce9cc',
  primaryShadow: '#111411',
  primaryText: '#111411',

  // Accent
  accent: '#ffc4ba',
  accentShadow: '#111411',
  accentText: '#111411',

  // Text
  textMain: '#111411',
  textMuted: '#595c58',
  textInverse: '#f8f6f0',

  // Brand
  brandPillBg: '#111411',
  brandPillText: '#cce9cc',

  // Semantic
  income: '#34a853',
  expense: '#c0392b',
  incomeText: '#34a853',
  expenseText: '#c0392b',
};

export const Ocean: ColorScheme = {
  bg: '#020617',
  surface: '#0d1829',
  surfaceAlt: '#111e30',
  surfaceHover: '#172540',
  iconBg: '#172540',
  border: '#1a3048',
  borderDim: '#0a1424',
  primary: '#06b6d4',
  primaryShadow: '#02131a',
  primaryText: '#020d18',
  accent: '#ff4d8d',
  accentShadow: '#2d0014',
  accentText: '#fff0f6',
  textMain: '#cde4ff',
  textMuted: '#486b8a',
  textInverse: '#020617',
  brandPillBg: '#06b6d4',
  brandPillText: '#020d18',
  income: '#06b6d4',
  expense: '#ff4d8d',
  incomeText: '#67e8f9',
  expenseText: '#ff8fb7',
};

export const Forest: ColorScheme = {
  bg: '#0a0f08',
  surface: '#111a0e',
  surfaceAlt: '#172113',
  surfaceHover: '#1d2918',
  iconBg: '#1d2918',
  border: '#1e3018',
  borderDim: '#121e0e',
  primary: '#4ade80',
  primaryShadow: '#0b130c',
  primaryText: '#0a1a0a',
  accent: '#fb923c',
  accentShadow: '#1a0800',
  accentText: '#1a0800',
  textMain: '#d1fae5',
  textMuted: '#6b7e60',
  textInverse: '#0a0f08',
  brandPillBg: '#4ade80',
  brandPillText: '#0a1a0a',
  income: '#4ade80',
  expense: '#fb923c',
  incomeText: '#86efac',
  expenseText: '#fdba74',
};

export const Ember: ColorScheme = {
  bg: '#0f0805',
  surface: '#1c1008',
  surfaceAlt: '#231410',
  surfaceHover: '#2a1a14',
  iconBg: '#2a1a14',
  border: '#2e1a10',
  borderDim: '#1e1008',
  primary: '#f97316',
  primaryShadow: '#0f0500',
  primaryText: '#0f0500',
  accent: '#ef4444',
  accentShadow: '#200606',
  accentText: '#ffffff',
  textMain: '#fde8cc',
  textMuted: '#8c6450',
  textInverse: '#0f0805',
  brandPillBg: '#f97316',
  brandPillText: '#0f0500',
  income: '#f97316',
  expense: '#ef4444',
  incomeText: '#fdba74',
  expenseText: '#fca5a5',
};

export const Arctic: ColorScheme = {
  bg: '#f0f4f8',
  surface: '#ffffff',
  surfaceAlt: '#e2e8f0',
  surfaceHover: '#f1f5f9',
  iconBg: '#e2e8f0',
  border: '#cbd5e1',
  borderDim: '#e2e8f0',
  primary: '#3b82f6',
  primaryShadow: '#1d4ed8',
  primaryText: '#ffffff',
  accent: '#ef4444',
  accentShadow: '#991b1b',
  accentText: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  textInverse: '#f0f4f8',
  brandPillBg: '#3b82f6',
  brandPillText: '#ffffff',
  income: '#3b82f6',
  expense: '#ef4444',
  incomeText: '#2563eb',
  expenseText: '#dc2626',
};

export const Purple: ColorScheme = {
  bg: '#0d0b14',
  surface: '#16122a',
  surfaceAlt: '#1a1530',
  surfaceHover: '#201a3a',
  iconBg: '#201a3a',
  border: '#2d2460',
  borderDim: '#1e1840',
  primary: '#a855f7',
  primaryShadow: '#4c1d95',
  primaryText: '#ffffff',
  accent: '#f43f5e',
  accentShadow: '#881337',
  accentText: '#ffffff',
  textMain: '#e2d9f0',
  textMuted: '#7c6fa0',
  textInverse: '#0d0b14',
  brandPillBg: '#a855f7',
  brandPillText: '#ffffff',
  income: '#a855f7',
  expense: '#f43f5e',
  incomeText: '#c084fc',
  expenseText: '#fb7185',
};

export const Mono: ColorScheme = {
  bg: '#000000',
  surface: '#111111',
  surfaceAlt: '#1a1a1a',
  surfaceHover: '#222222',
  iconBg: '#222222',
  border: '#333333',
  borderDim: '#222222',
  primary: '#e0e0e0',
  primaryShadow: '#666666',
  primaryText: '#000000',
  accent: '#888888',
  accentShadow: '#444444',
  accentText: '#ffffff',
  textMain: '#ffffff',
  textMuted: '#666666',
  textInverse: '#000000',
  brandPillBg: '#e0e0e0',
  brandPillText: '#000000',
  income: '#e0e0e0',
  expense: '#888888',
  incomeText: '#f5f5f5',
  expenseText: '#b3b3b3',
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'organic-dark', name: 'Dark', emoji: '🌑', isDark: true, colors: Dark },
  { id: 'organic-light', name: 'Light', emoji: '☀️', isDark: false, colors: Light },
  { id: 'ocean', name: 'Oceano', emoji: '🌊', isDark: true, colors: Ocean },
  { id: 'forest', name: 'Bosque', emoji: '🌿', isDark: true, colors: Forest },
  { id: 'ember', name: 'Brasa', emoji: '🔥', isDark: true, colors: Ember },
  { id: 'arctic', name: 'Artico', emoji: '❄️', isDark: false, colors: Arctic },
  { id: 'purple', name: 'Morado', emoji: '🔮', isDark: true, colors: Purple },
  { id: 'mono', name: 'Mono', emoji: '◼️', isDark: true, colors: Mono },
];

export const DEFAULT_THEME_PRESET_ID = 'organic-dark';

export function getThemePreset(presetId: string) {
  return THEME_PRESETS.find((preset) => preset.id === presetId) ?? THEME_PRESETS[0];
}

// Default theme used throughout the app (dark)
export const C = Dark;
