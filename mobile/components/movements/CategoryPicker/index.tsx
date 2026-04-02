import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Category, TransactionType } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { Spacing, FontSize, FontWeight } from '../../../constants/theme';
import { styles } from './styles';

const EMOJI_PRESETS = ['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶', '📚', '🎮'];

type Props = {
  categories: Category[];
  selectedTag: string | null;
  type: TransactionType;
  onSelect: (name: string | null, icon?: string) => void;
  onClose: () => void;
};

export function CategoryPicker({ categories, selectedTag, type, onSelect, onClose }: Props) {
  const { t } = useLanguage();
  const { theme: C } = useTheme();
  const [search, setSearch] = useState('');
  const [newEmoji, setNewEmoji] = useState('💳');
  const [customEmoji, setCustomEmoji] = useState('');
  void type;

  const filtered = useMemo(
    () => categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );
  const normalizedSearch = search.trim().replace(/\s+/g, ' ');
  const selectedEmoji = customEmoji.trim() || newEmoji;

  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={[styles.wrapper, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.surface }]}> 
          <Text style={[styles.title, { color: C.textMain }]}>{t('field.category').toUpperCase()}</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border, backgroundColor: C.surfaceAlt }]}>
            <X size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('mobile.category.search_placeholder')}
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
          />
        </View>

        {normalizedSearch.length > 0 && filtered.length === 0 ? (
          <View style={styles.createWrap}>
            <Text style={[styles.emojiTitle, { color: C.textMuted }]}>{t('order.category_icon').toUpperCase()}</Text>
            <TextInput
              style={[styles.customEmojiInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textMain }]}
              value={customEmoji}
              onChangeText={setCustomEmoji}
              placeholder={t('order.category_icon')}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={8}
            />
            <View style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((emoji) => {
                const selected = emoji === newEmoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiBtn, { borderColor: selected ? C.primary : C.border, backgroundColor: selected ? C.surfaceAlt : C.surface }]}
                    onPress={() => setNewEmoji(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.createOption, { backgroundColor: C.primary, borderColor: C.border }]}
              onPress={() => onSelect(normalizedSearch, selectedEmoji)}
            >
              <Text style={[styles.createText, { color: C.primaryText }]}>{selectedEmoji} {t('mobile.category.create')} {normalizedSearch}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.noneOption, { borderBottomColor: C.borderDim }]} onPress={() => onSelect(null)}>
          <Text style={[styles.noneText, { color: C.textMuted }]}>{t('mobile.category.none')}</Text>
        </TouchableOpacity>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          numColumns={3}
          columnWrapperStyle={styles.grid}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = item.name === selectedTag;
            const activeBorder = isSelected ? item.color : C.border;
            const activeBackground = isSelected ? `${item.color}22` : C.surface;
            const activeText = isSelected ? item.color : C.textMain;

            return (
              <TouchableOpacity
                style={[styles.catItem, { borderColor: activeBorder, backgroundColor: activeBackground }]}
                onPress={() => onSelect(item.name, item.icon)}
              >
                <Text style={styles.catIcon}>{item.icon}</Text>
                <Text style={[styles.catName, { color: activeText }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textMuted }]}>{t('mobile.category.empty')}</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
