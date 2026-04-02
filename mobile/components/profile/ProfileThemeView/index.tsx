import { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, RotateCcw, X } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';
import { THEME_PRESETS, type ColorScheme } from '../../../constants/Colors';
import { ModalSafeAreaView } from '../../layout/ModalSafeAreaView';
import { sty } from './styles';

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
