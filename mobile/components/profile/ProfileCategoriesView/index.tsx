import { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useDialog } from '../../../context/DialogContext';
import { supabase } from '../../../lib/supabase';
import { hideCategory, loadCustomCategories, normalizeCategoryTag, saveCustomCategory, unhideCategory } from '../../../lib/category-storage';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { X, Tag } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { styles } from './styles';

type Props = {
  onClose: () => void;
};

export function ProfileCategoriesView({ onClose }: Props) {
  const { webUser, plan } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const { transactions, categories, loading } = useDashboardData(webUser?.id ?? null);
  const [editingCategory, setEditingCategory] = useState<{ oldTag: string; newTag: string; newIcon: string } | null>(null);
  const [newCategory, setNewCategory] = useState<{ name: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [customCategoryCount, setCustomCategoryCount] = useState(0);
  const maxCustomCategories = plan?.entitlements.maxCustomCategories ?? null;
  const hasReachedCustomCategoryLimit = maxCustomCategories !== null && customCategoryCount >= maxCustomCategories;

  useEffect(() => {
    let mounted = true;

    const syncCustomCategoryCount = async () => {
      const items = await loadCustomCategories().catch(() => []);
      if (mounted) {
        setCustomCategoryCount(items.length);
      }
    };

    void syncCustomCategoryCount();

    const sub = DeviceEventEmitter.addListener('tx_saved', () => {
      void syncCustomCategoryCount();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const showCustomCategoryLimitDialog = async () => {
    await dialog.alert(
      t('plan.custom_categories_limit_body', { count: maxCustomCategories ?? 0 }),
      t('plan.custom_categories_limit_title')
    );
  };

  // Cantidad de usos por categoría
  const categoryUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    transactions.forEach(tx => {
      const tag = tx.tag || t('mobile.recent.no_category');
      usage[tag] = (usage[tag] || 0) + 1;
    });
    return usage;
  }, [transactions, t]);

  // Ordenamos por más usadas primero
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (categoryUsage[b.name] || 0) - (categoryUsage[a.name] || 0));
  }, [categories, categoryUsage]);

  const handleSaveNewCategory = async () => {
    if (hasReachedCustomCategoryLimit) {
      await showCustomCategoryLimitDialog();
      return;
    }

    if (!newCategory) return;
    const nextName = newCategory.name.trim().replace(/\s+/g, ' ');

    if (!nextName) {
      Toast.show({ type: 'error', text1: t('profile.category_add_title'), text2: t('profile.category_name_required') });
      return;
    }

    const exists = sortedCategories.some((category) => normalizeCategoryTag(category.name) === normalizeCategoryTag(nextName));
    if (exists) {
      Toast.show({ type: 'error', text1: t('profile.category_add_title'), text2: t('profile.category_exists') });
      return;
    }

    setSaving(true);
    try {
      await saveCustomCategory(nextName, newCategory.icon || '🏷️');
      await unhideCategory(nextName);
      setCustomCategoryCount((current) => current + 1);
      DeviceEventEmitter.emit('tx_saved');
      setNewCategory(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !webUser?.id) return;
    const nextName = editingCategory.newTag.trim().replace(/\s+/g, ' ');
    if (!nextName) {
      Toast.show({ type: 'error', text1: t('btn.edit'), text2: t('profile.category_name_required') });
      return;
    }

    setSaving(true);
    try {
      await saveCustomCategory(nextName, editingCategory.newIcon || '🏷️');
      await unhideCategory(nextName);
      if (normalizeCategoryTag(editingCategory.oldTag) !== normalizeCategoryTag(nextName)) {
        await hideCategory(editingCategory.oldTag);
      }

      const { error } = await supabase
        .from('Transaction')
        .update({ tag: nextName, icon: editingCategory.newIcon || '🏷️' })
        .eq('userId', webUser.id)
        .eq('tag', editingCategory.oldTag);

      if (error) throw error;

      DeviceEventEmitter.emit('tx_saved');
      setEditingCategory(null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.category_save_error') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: string) => {
    const confirmed = await dialog.confirm({
      title: t('btn.delete'),
      message: t('profile.category_delete_confirm', { tag }),
      confirmText: t('btn.delete'),
      type: 'danger',
    });

    if (confirmed) {
      if (!webUser?.id) return;
      setSaving(true);
      try {
        await hideCategory(tag);
        const { error } = await supabase
          .from('Transaction')
          .update({ tag: 'OTROS', icon: '❓' })
          .eq('userId', webUser.id)
          .eq('tag', tag);

        if (error) throw error;
        const storedCustomCategories = await loadCustomCategories();
        setCustomCategoryCount(storedCustomCategories.filter((category) => normalizeCategoryTag(category.name) !== normalizeCategoryTag(tag)).length);
        DeviceEventEmitter.emit('tx_saved');
      } catch (error: any) {
        Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.category_save_error') });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textMain }]}>{t('mobile.profile.categories').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: C.textMuted }]}>
          {t('mobile.profile.categories_description')}
        </Text>
        <Text style={[styles.description, { color: C.textMuted }]}> 
          {maxCustomCategories === null
            ? t('plan.custom_categories_limit_unlimited')
            : t('plan.custom_categories_limit_count', { count: customCategoryCount, max: maxCustomCategories })}
        </Text>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: Spacing.xl }} />
        ) : newCategory ? (
          <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <Text style={[styles.catName, { color: C.textMain }]}>{t('profile.category_add_title')}</Text>
            <TextInput style={[styles.input, { color: C.textMain, borderColor: C.border, backgroundColor: C.surfaceAlt }]} value={newCategory.icon} onChangeText={(value) => setNewCategory({ ...newCategory, icon: value })} maxLength={3} />
            <TextInput style={[styles.input, { color: C.textMain, borderColor: C.border, backgroundColor: C.surfaceAlt }]} value={newCategory.name} onChangeText={(value) => setNewCategory({ ...newCategory, name: value })} placeholder={t('profile.cat_new_name')} placeholderTextColor={C.textMuted} />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: C.border }]} onPress={() => setNewCategory(null)}><Text style={[styles.actionText, { color: C.textMain }]}>{t('btn.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.primary, borderColor: C.primary }]} disabled={saving} onPress={handleSaveNewCategory}><Text style={[styles.actionText, { color: C.primaryText }]}>{t('btn.save')}</Text></TouchableOpacity>
            </View>
          </View>
        ) : editingCategory ? (
          <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
            <Text style={[styles.catName, { color: C.textMain }]}>{t('btn.edit')}</Text>
            <TextInput style={[styles.input, { color: C.textMain, borderColor: C.border, backgroundColor: C.surfaceAlt }]} value={editingCategory.newIcon} onChangeText={(value) => setEditingCategory({ ...editingCategory, newIcon: value })} maxLength={3} />
            <TextInput style={[styles.input, { color: C.textMain, borderColor: C.border, backgroundColor: C.surfaceAlt }]} value={editingCategory.newTag} onChangeText={(value) => setEditingCategory({ ...editingCategory, newTag: value })} placeholder={t('profile.cat_new_name')} placeholderTextColor={C.textMuted} />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: C.border }]} onPress={() => setEditingCategory(null)}><Text style={[styles.actionText, { color: C.textMain }]}>{t('btn.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.primary, borderColor: C.primary }]} disabled={saving} onPress={handleSaveEdit}><Text style={[styles.actionText, { color: C.primaryText }]}>{t('profile.apply_all')}</Text></TouchableOpacity>
            </View>
          </View>
        ) : sortedCategories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Tag size={32} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('mobile.profile.categories_empty')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            <TouchableOpacity style={[styles.catRow, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => hasReachedCustomCategoryLimit ? void showCustomCategoryLimitDialog() : setNewCategory({ name: '', icon: '🏷️' })}>
              <View style={[styles.iconBox, { backgroundColor: `${C.primary}22` }]}>
                <Text style={styles.icon}>+</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.catName, { color: C.textMain }]}>{t('profile.category_add_title')}</Text>
              </View>
            </TouchableOpacity>
            {sortedCategories.map(cat => {
              const uses = categoryUsage[cat.name] || 0;
              return (
                <View key={cat.name} style={[styles.catRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: `${cat.color}22` }]}>
                    <Text style={styles.icon}>{cat.icon || '📌'}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.catName, { color: C.textMain }]}>{cat.name}</Text>
                    <Text style={[styles.catUses, { color: C.textMuted }]}>
                      {uses} {uses === 1 ? t('mobile.profile.transaction_single') : t('mobile.profile.transaction_plural')}
                    </Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <TouchableOpacity style={[styles.miniBtn, { borderColor: C.border }]} onPress={() => setEditingCategory({ oldTag: cat.name, newTag: cat.name, newIcon: cat.icon || '🏷️' })}><Text style={[styles.miniBtnText, { color: C.textMain }]}>{t('btn.edit')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.miniBtn, { borderColor: `${C.accent}55`, backgroundColor: `${C.accent}11` }]} onPress={() => handleDelete(cat.name)}><Text style={[styles.miniBtnText, { color: C.accent }]}>{t('btn.delete')}</Text></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
