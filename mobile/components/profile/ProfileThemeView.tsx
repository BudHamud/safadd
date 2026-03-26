import { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, RotateCcw, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { Spacing, FontSize, FontWeight } from '../../constants/theme';
import { THEME_PRESETS, type ColorScheme } from '../../constants/Colors';
import { ModalSafeAreaView } from '../layout/ModalSafeAreaView';

type ColorToken = {
  key: keyof ColorScheme;
  labelKey: string;
  descKey: string;
};

const COLOR_TOKENS: ColorToken[] = [
  { key: 'primary', labelKey: 'profile.color_primary', descKey: 'profile.color_primary_desc' },
  { key: 'accent', labelKey: 'profile.color_accent', descKey: 'profile.color_accent_desc' },
  { key: 'bg', labelKey: 'profile.color_bg', descKey: 'profile.color_bg_desc' },
  { key: 'surface', labelKey: 'profile.color_surface', descKey: 'profile.color_surface_desc' },
  { key: 'surfaceAlt', labelKey: 'profile.color_surface_alt', descKey: 'profile.color_surface_alt_desc' },
  { key: 'textMain', labelKey: 'profile.color_text', descKey: 'profile.color_text_desc' },
  { key: 'textMuted', labelKey: 'profile.color_text_muted', descKey: 'profile.color_text_muted_desc' },
  { key: 'border', labelKey: 'profile.color_border', descKey: 'profile.color_border_desc' },
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

const HEX_SWATCHES = [
  '#5d7253', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#ef4444', '#f59e0b', '#06b6d4', '#e0e0ce',
  '#ffffff', '#000000', '#1a1a1a', '#141714', '#8c8c80',
];

type Props = { onClose: () => void };

export function ProfileThemeView({ onClose }: Props) {
  const {
    theme: C,
    customColors,
    setCustomColor,
    clearCustomColor,
    resetCustomColors,
    activePresetId,
    applyPreset,
  } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const [selectedTokenKey, setSelectedTokenKey] = useState<keyof ColorScheme | null>(null);

  const hasCustomColors = Object.keys(customColors).length > 0;
  const selectedToken = useMemo(
    () => COLOR_TOKENS.find((token) => token.key === selectedTokenKey) ?? null,
    [selectedTokenKey],
  );
  const selectedTokenColor = selectedToken ? String(C[selectedToken.key]) : '';
  const selectedTokenIsCustom = selectedToken ? !!customColors[selectedToken.key] : false;

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: t('profile.colors_reset'),
      message: t('profile.colors_reset_confirm'),
      type: 'danger',
    });

    if (confirmed) {
      resetCustomColors();
    }
  };

  const pickColor = (key: keyof ColorScheme) => {
    setSelectedTokenKey(key);
  };

  const handleSelectSwatch = async (hex: string) => {
    if (!selectedToken) return;
    await setCustomColor(selectedToken.key, hex);
    setSelectedTokenKey(null);
  };

  const handleResetToken = async () => {
    if (!selectedToken) return;
    await clearCustomColor(selectedToken.key);
    setSelectedTokenKey(null);
  };

  return (
    <SafeAreaView style={[sty.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
      <View style={[sty.header, { borderBottomColor: C.border, backgroundColor: C.surface }]}> 
        <Text style={[sty.title, { color: C.textMain }]}>{t('profile.colors_subview_title').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={sty.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={sty.content}>
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
                {
                  backgroundColor: preset.colors.surface,
                  borderColor: preset.id === activePresetId ? preset.colors.primary : preset.colors.border,
                },
              ]}
              onPress={() => void applyPreset(preset.id)}
              activeOpacity={0.75}
            >
              <View style={[sty.presetPreview, { backgroundColor: preset.colors.bg, borderColor: preset.colors.primary }]}>
                <View style={sty.presetPreviewTopRow}>
                  <View style={[sty.presetPreviewDot, { backgroundColor: preset.colors.primary }]} />
                  <View style={[sty.presetPreviewDot, { backgroundColor: preset.colors.accent }]} />
                </View>
                <View style={[sty.presetPreviewLine, { backgroundColor: preset.colors.textMain, opacity: 0.5 }]} />
                <View style={[sty.presetPreviewLineShort, { backgroundColor: preset.colors.textMain, opacity: 0.3 }]} />
              </View>
              <Text style={[sty.presetName, { color: preset.colors.textMain }]} numberOfLines={1}>
                {t((PRESET_LABELS[preset.id] ?? PRESET_LABELS['organic-dark']) as never)}
              </Text>
              {preset.id === activePresetId ? (
                <View style={[sty.presetCheck, { backgroundColor: preset.colors.primary }]}>
                  <Check size={12} color={preset.colors.primaryText} />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

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
                <View style={sty.previewCategoryCopy}>
                  <Text style={[sty.previewCategoryName, { color: C.textMain }]}>FOOD</Text>
                  <Text style={[sty.previewCategoryMeta, { color: C.textMuted }]}>12 transactions</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[sty.previewRowItem, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <View style={[sty.previewRowIcon, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} />
            <View style={sty.previewRowCopy}>
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
          {COLOR_TOKENS.map((token, index) => {
            const currentColor = String(C[token.key]);
            const isCustom = !!customColors[token.key];
            const isLast = index === COLOR_TOKENS.length - 1;

            return (
              <TouchableOpacity
                key={token.key}
                style={[sty.colorRow, { borderBottomColor: C.border }, isLast && sty.colorRowLast]}
                onPress={() => void pickColor(token.key)}
                activeOpacity={0.75}
              >
                <View style={sty.colorInfo}>
                  <View style={sty.colorLabelRow}>
                    <Text style={[sty.colorName, { color: C.textMain }]}>{t(token.labelKey as never)}</Text>
                    {isCustom ? (
                      <Text style={[sty.customBadge, { color: C.primary, borderColor: C.primary }]}>
                        {t('profile.appearance_badge_custom')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[sty.colorDesc, { color: C.textMuted }]}>{t(token.descKey as never)}</Text>
                  <Text style={[sty.colorHex, { color: C.textMuted }]}>{currentColor}</Text>
                </View>
                <TouchableOpacity
                  style={[sty.colorSwatch, { backgroundColor: currentColor, borderColor: C.border }]}
                  onPress={() => void pickColor(token.key)}
                  activeOpacity={0.8}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {hasCustomColors ? (
          <TouchableOpacity style={[sty.resetBtn, { borderColor: C.accent }]} onPress={() => void handleReset()} activeOpacity={0.8}>
            <Text style={[sty.resetTxt, { color: C.accent }]}>↺ {t('profile.colors_reset').toUpperCase()}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal
        transparent
        visible={!!selectedToken}
        statusBarTranslucent
        navigationBarTranslucent
        animationType="fade"
        onRequestClose={() => setSelectedTokenKey(null)}
      >
        <ModalSafeAreaView style={[sty.modalOverlay, { backgroundColor: `${C.bg}CC` }]}> 
          <TouchableOpacity style={sty.modalBackdrop} activeOpacity={1} onPress={() => setSelectedTokenKey(null)} />
          <View style={[sty.modalCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={sty.modalHeader}>
              <View style={sty.modalCopy}>
                <Text style={[sty.modalTitle, { color: C.textMain }]}>
                  {selectedToken ? t(selectedToken.labelKey as never).toUpperCase() : ''}
                </Text>
                <Text style={[sty.modalDescription, { color: C.textMuted }]}>
                  {selectedToken ? t(selectedToken.descKey as never) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTokenKey(null)} style={sty.closeBtn}>
                <X size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[sty.modalPreview, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={[sty.modalPreviewSwatch, { backgroundColor: selectedTokenColor || C.surface, borderColor: C.border }]} />
              <View style={sty.modalPreviewCopy}>
                <Text style={[sty.modalPreviewLabel, { color: C.textMuted }]}>{t('profile.appearance_change_color').toUpperCase()}</Text>
                <Text style={[sty.modalPreviewValue, { color: C.textMain }]}>{selectedTokenColor}</Text>
              </View>
            </View>

            <View style={sty.modalSwatchGrid}>
              {HEX_SWATCHES.map((hex) => {
                const isActive = selectedToken
                  ? customColors[selectedToken.key] === hex || (!customColors[selectedToken.key] && C[selectedToken.key] === hex)
                  : false;

                return (
                  <TouchableOpacity
                    key={`modal-${hex}`}
                    style={[
                      sty.modalSwatch,
                      { backgroundColor: hex, borderColor: isActive ? C.textMain : C.border },
                      isActive && sty.modalSwatchActive,
                    ]}
                    onPress={() => void handleSelectSwatch(hex)}
                    activeOpacity={0.85}
                  >
                    {isActive ? <Check size={12} color={hex.toLowerCase() === '#ffffff' ? '#111411' : '#ffffff'} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={sty.modalActions}>
              <TouchableOpacity
                style={[sty.modalActionBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}
                onPress={() => setSelectedTokenKey(null)}
                activeOpacity={0.8}
              >
                <Text style={[sty.modalActionText, { color: C.textMain }]}>{t('btn.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
              {selectedTokenIsCustom ? (
                <TouchableOpacity
                  style={[sty.modalActionBtn, { borderColor: C.accent, backgroundColor: `${C.accent}12` }]}
                  onPress={() => void handleResetToken()}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={14} color={C.accent} />
                  <Text style={[sty.modalActionText, { color: C.accent }]}>{t('profile.colors_reset').toUpperCase()}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ModalSafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const R = 2;

const sty = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  sectionLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 2, textTransform: 'uppercase' },
  hint: { fontSize: FontSize.xs, lineHeight: 18, marginTop: -Spacing.xs },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetBtn: {
    width: '31%',
    borderWidth: 1,
    borderRadius: R,
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: 'relative',
  },
  presetPreview: {
    borderWidth: 2,
    borderRadius: R,
    padding: 6,
    minHeight: 34,
    justifyContent: 'center',
    gap: 3,
  },
  presetPreviewTopRow: { flexDirection: 'row', gap: 3, marginBottom: 1 },
  presetPreviewDot: { width: 10, height: 10, borderRadius: 2 },
  presetPreviewLine: { width: '100%', height: 2, borderRadius: 1 },
  presetPreviewLineShort: { width: '60%', height: 2, borderRadius: 1 },
  presetName: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  presetCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  previewCategoryCopy: { flex: 1 },
  previewCategoryName: { fontSize: 12, fontWeight: FontWeight.black },
  previewCategoryMeta: { fontSize: 9, marginTop: 2 },
  previewRowItem: { borderWidth: 1, borderRadius: R, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  previewRowIcon: { width: 28, height: 28, borderWidth: 1, borderRadius: R },
  previewRowCopy: { flex: 1 },
  previewRowValue: { fontSize: 12, fontWeight: FontWeight.black, marginTop: 2 },
  previewSwatchSet: { flexDirection: 'row', gap: 4 },
  previewTinySwatch: { width: 14, height: 14, borderWidth: 1, borderRadius: R },
  colorList: { borderWidth: 1, borderRadius: R, overflow: 'hidden' },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  colorRowLast: { borderBottomWidth: 0 },
  colorInfo: { flex: 1 },
  colorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorName: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  customBadge: {
    fontSize: 7,
    fontWeight: FontWeight.black,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderRadius: R,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  colorDesc: { fontSize: FontSize.xs, marginTop: 2 },
  colorHex: { fontSize: 9, marginTop: 2, letterSpacing: 0.5, fontWeight: '700' },
  colorSwatch: { width: 36, height: 36, borderRadius: R, borderWidth: 1, flexShrink: 0 },
  resetBtn: { borderWidth: 1, borderRadius: R, padding: Spacing.md, alignItems: 'center' },
  resetTxt: { fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 1 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: R,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  modalCopy: { flex: 1, gap: 4 },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  modalDescription: { fontSize: FontSize.sm, lineHeight: 18 },
  modalPreview: {
    borderWidth: 1,
    borderRadius: R,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalPreviewSwatch: { width: 42, height: 42, borderRadius: R, borderWidth: 1 },
  modalPreviewCopy: { flex: 1, gap: 2 },
  modalPreviewLabel: { fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1.1 },
  modalPreviewValue: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  modalSwatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSwatchActive: { transform: [{ scale: 1.08 }], borderWidth: 2.5 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  modalActionBtn: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: R,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
  },
  modalActionText: { fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 0.5 },
});
