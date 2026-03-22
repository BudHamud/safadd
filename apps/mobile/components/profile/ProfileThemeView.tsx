import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { X } from 'lucide-react-native';
import { THEME_PRESETS, type ColorScheme } from '../../constants/Colors';

// ── Tokens editables — equivalente a COLOR_VARS de la web ─────────────────
type ColorToken = {
  key: keyof ColorScheme;
  labelKey: string;
  descKey: string;
};

const COLOR_TOKENS: ColorToken[] = [
  { key: 'primary',    labelKey: 'profile.color_primary',      descKey: 'profile.color_primary_desc' },
  { key: 'accent',     labelKey: 'profile.color_accent',       descKey: 'profile.color_accent_desc' },
  { key: 'bg',         labelKey: 'profile.color_bg',           descKey: 'profile.color_bg_desc' },
  { key: 'surface',    labelKey: 'profile.color_surface',      descKey: 'profile.color_surface_desc' },
  { key: 'surfaceAlt', labelKey: 'profile.color_surface_alt',  descKey: 'profile.color_surface_alt_desc' },
  { key: 'textMain',   labelKey: 'profile.color_text',         descKey: 'profile.color_text_desc' },
  { key: 'textMuted',  labelKey: 'profile.color_text_muted',   descKey: 'profile.color_text_muted_desc' },
  { key: 'border',     labelKey: 'profile.color_border',       descKey: 'profile.color_border_desc' },
];

const PRESET_LABELS: Record<string, string> = {
  'organic-dark': 'profile.appearance_preset_organic_dark',
  'organic-light': 'profile.appearance_preset_organic_light',
  ocean: 'profile.appearance_preset_ocean',
  forest: 'profile.appearance_preset_forest',
  ember: 'profile.appearance_preset_ember',
  arctic: 'profile.appearance_preset_arctic',
  purple: 'profile.appearance_preset_purple',
  mono: 'profile.appearance_preset_mono',
};

// ── Hex color presets for quick picking ────────────────────────────────────
const HEX_SWATCHES = [
  '#5d7253', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#ef4444', '#f59e0b', '#06b6d4', '#e0e0ce',
  '#ffffff', '#000000', '#1a1a1a', '#141714', '#8c8c80',
];

type Props = { onClose: () => void };

export function ProfileThemeView({ onClose }: Props) {
  const { theme: C, customColors, setCustomColor, resetCustomColors, toggleDarkMode, isDark, activePresetId, applyPreset } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();

  const hasCustomColors = Object.keys(customColors).length > 0;

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: t('profile.colors_reset'),
      message: t('profile.colors_reset_confirm'),
      type: 'danger',
    });

    if (confirmed) resetCustomColors();
  };

  const pickColor = async (key: keyof ColorScheme, currentColor: string) => {
    // Cannot easily replicate 15 swatches inside our simple Dialog logic natively,
    // so we'll leave it as setting random preset or fallback to picking standard.
    // For now we will keep the Alert for the Hex Picker as it's an edge case 
    // where Alert has 15 options. Wait, Alert on Android only supports 3 buttons.
    // That means the previous code was buggy on Android anyways.
    // I will replace it with a quick dialog for now to avoid the error.
    await dialog.alert(`Color picking is simplified in Mobile. Token: ${key}. Select from bottom swatches instead.`, 'Notice');
  };

  return (
    <View style={[sty.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[sty.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[sty.title, { color: C.textMain }]}>{t('profile.colors_subview_title').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={sty.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={sty.content}>

        {/* ── Presets section ── */}
        <Text style={[sty.sectionLabel, { color: C.textMuted }]}>
          {t('profile.appearance_tab_presets').toUpperCase()}
        </Text>
        <Text style={[sty.hint, { color: C.textMuted }]}>{t('profile.appearance_presets_hint')}</Text>

        <View style={sty.presetsGrid}>
          {THEME_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                sty.presetBtn,
                { backgroundColor: preset.colors.surface, borderColor: preset.id === activePresetId ? preset.colors.primary : preset.colors.border },
              ]}
              onPress={() => void applyPreset(preset.id)}
              activeOpacity={0.75}
            >
              {/* Mini preview swatch row */}
              <View style={sty.presetSwatches}>
                {[preset.colors.primary, preset.colors.accent, preset.colors.bg].map((c, i) => (
                  <View key={i} style={[sty.presetSwatch, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={[sty.presetEmoji, { color: preset.colors.textMain }]}>{preset.emoji}</Text>
              <Text style={[sty.presetName, { color: preset.colors.textMain }]} numberOfLines={1}>
                {t((PRESET_LABELS[preset.id] ?? PRESET_LABELS['organic-dark']) as any)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dark / Light toggle ── */}
        <TouchableOpacity
          style={[sty.modeToggle, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => void toggleDarkMode()}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[sty.modeLabel, { color: C.textMain }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text style={[sty.modeDesc, { color: C.textMuted }]}>
              {isDark ? t('profile.appearance_preset_organic_dark') : t('profile.appearance_preset_organic_light')}
            </Text>
          </View>
          <View style={[sty.toggleTrack, { backgroundColor: isDark ? C.primary : C.surfaceAlt }]}>
            <View style={[sty.toggleThumb, { marginLeft: isDark ? 'auto' : undefined }]} />
          </View>
        </TouchableOpacity>

        {/* ── Individual color tokens ── */}
        <Text style={[sty.sectionLabel, { color: C.textMuted }]}>
          {t('profile.appearance_tab_widgets').toUpperCase()}
        </Text>
        <Text style={[sty.hint, { color: C.textMuted }]}>{t('profile.appearance_widgets_hint')}</Text>

        <View style={[sty.previewBoard, { backgroundColor: C.bg, borderColor: C.border }]}> 
          <View style={[sty.previewCardLarge, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <View style={sty.previewHeader}>
              <Text style={[sty.previewOverline, { color: C.textMuted }]}>BALANCE CARD</Text>
              <View style={[sty.previewBadge, { backgroundColor: `${C.primary}1F`, borderColor: C.primary }]}>
                <Text style={[sty.previewBadgeText, { color: C.primary }]}>LIVE</Text>
              </View>
            </View>
            <Text style={[sty.previewBalance, { color: C.textMain }]}>₪ 124,000</Text>
            <View style={sty.previewMetrics}>
              <View style={[sty.previewMetric, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
                <Text style={[sty.previewMetricLabel, { color: C.textMuted }]}>INCOME</Text>
                <Text style={[sty.previewMetricValue, { color: C.primary }]}>+ 210,000</Text>
              </View>
              <View style={[sty.previewMetric, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}> 
                <Text style={[sty.previewMetricLabel, { color: C.textMuted }]}>EXPENSE</Text>
                <Text style={[sty.previewMetricValue, { color: C.accent }]}>- 86,000</Text>
              </View>
            </View>
          </View>

          <View style={sty.previewGrid}>
            <View style={[sty.previewCardSmall, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <Text style={[sty.previewOverline, { color: C.textMuted }]}>GOAL</Text>
              <Text style={[sty.previewSmallValue, { color: C.textMain }]}>67%</Text>
              <View style={[sty.previewTrack, { backgroundColor: C.surfaceAlt }]}> 
                <View style={[sty.previewFill, { backgroundColor: C.primary, width: '67%' }]} />
              </View>
            </View>
            <View style={[sty.previewCardSmall, { backgroundColor: C.surface, borderColor: C.border }]}> 
              <Text style={[sty.previewOverline, { color: C.textMuted }]}>CATEGORY</Text>
              <View style={sty.previewCategoryRow}>
                <View style={[sty.previewCategoryIcon, { backgroundColor: `${C.primary}20`, borderColor: C.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[sty.previewCategoryName, { color: C.textMain }]}>FOOD</Text>
                  <Text style={[sty.previewCategoryMeta, { color: C.textMuted }]}>12 transactions</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[sty.previewRowItem, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <View style={[sty.previewRowIcon, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[sty.previewOverline, { color: C.textMuted }]}>PROFILE ROW</Text>
              <Text style={[sty.previewRowValue, { color: C.textMain }]}>CUSTOM COLORS ENABLED</Text>
            </View>
            <View style={sty.previewSwatchSet}>
              {[C.primary, C.accent, C.bg, C.surface].map((color) => (
                <View key={color} style={[sty.previewTinySwatch, { backgroundColor: color, borderColor: C.border }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={[sty.colorList, { borderColor: C.border }]}>
          {COLOR_TOKENS.map((token, idx) => {
            const currentColor = C[token.key] as string;
            const isCustom = !!customColors[token.key];
            const isLast = idx === COLOR_TOKENS.length - 1;

            return (
              <TouchableOpacity
                key={token.key}
                style={[
                  sty.colorRow,
                  { borderBottomColor: C.border },
                  isLast && sty.colorRowLast,
                ]}
                onPress={() => pickColor(token.key, currentColor)}
                activeOpacity={0.75}
              >
                <View style={sty.colorInfo}>
                  <View style={sty.colorLabelRow}>
                    <Text style={[sty.colorName, { color: C.textMain }]}>{t(token.labelKey as any)}</Text>
                    {isCustom && (
                      <Text style={[sty.customBadge, { color: C.primary, borderColor: C.primary }]}>
                        {t('profile.appearance_badge_custom')}
                      </Text>
                    )}
                  </View>
                  <Text style={[sty.colorDesc, { color: C.textMuted }]}>{t(token.descKey as any)}</Text>
                  <Text style={[sty.colorHex, { color: C.textMuted }]}>{currentColor}</Text>
                </View>
                {/* Swatch */}
                <TouchableOpacity
                  style={[sty.colorSwatch, { backgroundColor: currentColor, borderColor: C.border }]}
                  onPress={() => pickColor(token.key, currentColor)}
                  activeOpacity={0.8}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Quick swatches for each token ── */}
        <View style={[sty.swatchPicker, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[sty.hint, { color: C.textMuted }]}>{t('profile.appearance_change_color').toUpperCase()}</Text>
          <Text style={[sty.colorDesc, { color: C.textMuted }]}>
            {t('profile.appearance_widgets_hint')}
          </Text>
          {COLOR_TOKENS.map((token) => (
            <View key={token.key} style={sty.swatchTokenRow}>
              <Text style={[sty.swatchLabel, { color: C.textMuted }]} numberOfLines={1}>
                {t(token.labelKey as any)}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sty.swatchRow}>
                {HEX_SWATCHES.map((hex) => (
                  <TouchableOpacity
                    key={hex}
                    style={[
                      sty.swatchDot,
                      { backgroundColor: hex, borderColor: C.border },
                      (customColors[token.key] === hex || (!customColors[token.key] && C[token.key] === hex)) && sty.swatchDotActive,
                    ]}
                    onPress={() => void setCustomColor(token.key, hex)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* ── Reset button ── */}
        {hasCustomColors && (
          <TouchableOpacity
            style={[sty.resetBtn, { borderColor: C.accent }]}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <Text style={[sty.resetTxt, { color: C.accent }]}>
              ↺ {t('profile.colors_reset').toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const R = 2;
const sty = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },

  sectionLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 2, textTransform: 'uppercase' },
  hint: { fontSize: FontSize.xs, lineHeight: 18, marginTop: -Spacing.xs },

  // Presets
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetBtn: {
    width: '31%', borderWidth: 1, borderRadius: R,
    padding: Spacing.sm, gap: Spacing.xs,
  },
  presetSwatches: { flexDirection: 'row', gap: 4 },
  presetSwatch: { width: 14, height: 14, borderRadius: 7 },
  presetEmoji: { fontSize: 16 },
  presetName: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },

  // Dark/light toggle
  modeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: R, padding: Spacing.md,
  },
  modeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  modeDesc: { fontSize: FontSize.xs, marginTop: 2 },
  toggleTrack: {
    width: 40, height: 22, borderRadius: 11,
    padding: 3, flexDirection: 'row',
  },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },

  // Color list
  previewBoard: { borderWidth: 1, borderRadius: R, padding: Spacing.md, gap: Spacing.sm },
  previewCardLarge: { borderWidth: 1, borderRadius: R, padding: Spacing.md, gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewOverline: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.4 },
  previewBadge: { borderWidth: 1, borderRadius: R, paddingHorizontal: 5, paddingVertical: 2 },
  previewBadgeText: { fontSize: 7, fontWeight: FontWeight.black, letterSpacing: 0.8 },
  previewBalance: { fontSize: 24, fontWeight: FontWeight.black, letterSpacing: -0.8 },
  previewMetrics: { flexDirection: 'row', gap: Spacing.xs },
  previewMetric: { flex: 1, borderWidth: 1, borderRadius: R, padding: Spacing.sm, gap: 4 },
  previewMetricLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1 },
  previewMetricValue: { fontSize: 12, fontWeight: FontWeight.black },
  previewGrid: { flexDirection: 'row', gap: Spacing.xs },
  previewCardSmall: { flex: 1, borderWidth: 1, borderRadius: R, padding: Spacing.md, gap: Spacing.xs },
  previewSmallValue: { fontSize: 20, fontWeight: FontWeight.black, letterSpacing: -0.6 },
  previewTrack: { height: 8, borderRadius: R, overflow: 'hidden' },
  previewFill: { height: '100%', borderRadius: R },
  previewCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  previewCategoryIcon: { width: 22, height: 22, borderWidth: 1, borderRadius: R },
  previewCategoryName: { fontSize: 12, fontWeight: FontWeight.black },
  previewCategoryMeta: { fontSize: 9, marginTop: 2 },
  previewRowItem: { borderWidth: 1, borderRadius: R, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  previewRowIcon: { width: 28, height: 28, borderWidth: 1, borderRadius: R },
  previewRowValue: { fontSize: 12, fontWeight: FontWeight.black, marginTop: 2 },
  previewSwatchSet: { flexDirection: 'row', gap: 4 },
  previewTinySwatch: { width: 14, height: 14, borderWidth: 1, borderRadius: R },
  colorList: { borderWidth: 1, borderRadius: R, overflow: 'hidden' },
  colorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1,
  },
  colorRowLast: { borderBottomWidth: 0 },
  colorInfo: { flex: 1 },
  colorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorName: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  customBadge: {
    fontSize: 7, fontWeight: FontWeight.black, letterSpacing: 0.8,
    borderWidth: 1, borderRadius: R, paddingHorizontal: 4, paddingVertical: 1,
  },
  colorDesc: { fontSize: FontSize.xs, marginTop: 2 },
  colorHex: { fontSize: 9, marginTop: 2, letterSpacing: 0.5, fontWeight: '700' },
  colorSwatch: { width: 36, height: 36, borderRadius: R, borderWidth: 1, flexShrink: 0 },

  // Swatch picker
  swatchPicker: { borderWidth: 1, borderRadius: R, padding: Spacing.md, gap: Spacing.sm },
  swatchTokenRow: { gap: 4 },
  swatchLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.2, textTransform: 'uppercase' },
  swatchRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  swatchDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  swatchDotActive: { borderWidth: 2.5, transform: [{ scale: 1.2 }] },

  // Reset
  resetBtn: { borderWidth: 1, borderRadius: R, padding: Spacing.md, alignItems: 'center' },
  resetTxt: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 1 },
});
