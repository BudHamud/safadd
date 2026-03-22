import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDialog } from '../../context/DialogContext';
import { supabase } from '../../lib/supabase';
import { hideCategory, normalizeCategoryTag, saveCustomCategory, unhideCategory } from '../../lib/category-storage';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { X, Tag } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

type Props = {
  onClose: () => void;
};

export function ProfileCategoriesView({ onClose }: Props) {
  const { webUser } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const { transactions, categories, loading } = useDashboardData(webUser?.id ?? null);
  const [editingCategory, setEditingCategory] = useState<{ oldTag: string; newTag: string; newIcon: string } | null>(null);
  const [newCategory, setNewCategory] = useState<{ name: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!newCategory) return;
    const nextName = newCategory.name.trim().toUpperCase();

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
      DeviceEventEmitter.emit('tx_saved');
      setNewCategory(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !webUser?.id) return;
    const nextName = editingCategory.newTag.trim().toUpperCase();
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
        DeviceEventEmitter.emit('tx_saved');
      } catch (error: any) {
        Toast.show({ type: 'error', text1: t('details.save_error'), text2: error?.message || t('profile.category_save_error') });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
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
            <TouchableOpacity style={[styles.catRow, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => setNewCategory({ name: '', icon: '🏷️' })}>
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
    </View>
  );
}

const R = 2;
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  closeBtn: { padding: Spacing.xs },
  content: { padding: Spacing.base, paddingBottom: 60 },
  description: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.lg },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm },
  list: { gap: Spacing.sm },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: R, borderWidth: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: R,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  catName: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  catUses: { fontSize: FontSize.xs, marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: Spacing.xs },
  miniBtn: { borderWidth: 1, borderRadius: R, paddingHorizontal: 10, paddingVertical: 6 },
  miniBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  formCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: R, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: Radius.block, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: R },
  actionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
