import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type EditingCategory = { oldTag: string; newTag: string; newIcon: string };
type NewCategory = { name: string; icon: string };

type ProfileCategoriesViewProps = {
    uniqueCategories: Array<{ tag: string; icon: string; count: number }>;
    editingCategory: EditingCategory | null;
    newCategory: NewCategory | null;
    setEditingCategory: React.Dispatch<React.SetStateAction<EditingCategory | null>>;
    setNewCategory: React.Dispatch<React.SetStateAction<NewCategory | null>>;
    onDeleteCategory: (tag: string) => void;
    onSaveCategoryEdit: () => void;
    onSaveNewCategory: () => void;
};

export const ProfileCategoriesView = ({
    uniqueCategories,
    editingCategory,
    newCategory,
    setEditingCategory,
    setNewCategory,
    onDeleteCategory,
    onSaveCategoryEdit,
    onSaveNewCategory,
}: ProfileCategoriesViewProps) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="profile-categories-header">
                <div className="profile-subview-label" style={{ marginBottom: 0 }}>{t('profile.categories_title')}</div>
            </div>

            {!editingCategory && !newCategory ? (
                <div className="profile-cat-list">
                    <button className="profile-cat-add-row" onClick={() => setNewCategory({ name: '', icon: '🏷️' })}>
                        <div className="profile-cat-add-main">
                            <div className="profile-cat-icon-box profile-cat-add-icon">+</div>
                            <div>
                                <div className="profile-cat-name">{t('profile.category_add_title')}</div>
                            </div>
                        </div>
                        <div className="profile-cat-add-cta">+</div>
                    </button>
                    {uniqueCategories.map(cat => (
                        <div key={cat.tag} className="profile-cat-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="profile-cat-icon-box">{cat.icon || '🏷️'}</div>
                                <div>
                                    <div className="profile-cat-name">{cat.tag}</div>
                                    <div className="profile-cat-count">{cat.count} {t('profile.cat_tx_count')}</div>
                                </div>
                            </div>
                            <div className="profile-cat-actions">
                                <button
                                    className="profile-cat-btn-edit"
                                    onClick={() => setEditingCategory({ oldTag: cat.tag, newTag: cat.tag, newIcon: cat.icon || '🏷️' })}
                                >
                                    {t('btn.edit')}
                                </button>
                                <button className="profile-cat-btn-del" onClick={() => onDeleteCategory(cat.tag)}>✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : newCategory ? (
                <div className="profile-cat-edit-form">
                    <div className="profile-cat-form-title">{t('profile.category_add_title')}</div>
                    <div>
                        <span className="profile-edit-field-label">{t('profile.cat_new_emoji')}</span>
                        <input
                            className="profile-edit-emoji-input"
                            value={newCategory.icon}
                            onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                            maxLength={3}
                        />
                    </div>
                    <div>
                        <span className="profile-edit-field-label">{t('profile.cat_new_name')}</span>
                        <input
                            className="profile-edit-text-input"
                            value={newCategory.name}
                            onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                        />
                    </div>
                    <div className="profile-edit-actions">
                        <button className="profile-edit-cancel" onClick={() => setNewCategory(null)}>{t('btn.cancel')}</button>
                        <button className="profile-edit-save" onClick={onSaveNewCategory}>{t('btn.save')}</button>
                    </div>
                </div>
            ) : (
                <div className="profile-cat-edit-form">
                    <div className="profile-cat-form-title">{t('btn.edit')}</div>
                    <div>
                        <span className="profile-edit-field-label">{t('profile.cat_new_emoji')}</span>
                        <input
                            className="profile-edit-emoji-input"
                            value={editingCategory.newIcon}
                            onChange={e => setEditingCategory({ ...editingCategory, newIcon: e.target.value })}
                            maxLength={3}
                        />
                    </div>
                    <div>
                        <span className="profile-edit-field-label">{t('profile.cat_new_name')}</span>
                        <input
                            className="profile-edit-text-input"
                            value={editingCategory.newTag}
                            onChange={e => setEditingCategory({ ...editingCategory, newTag: e.target.value })}
                        />
                    </div>
                    <div className="profile-edit-actions">
                        <button className="profile-edit-cancel" onClick={() => setEditingCategory(null)}>{t('btn.cancel')}</button>
                        <button className="profile-edit-save" onClick={onSaveCategoryEdit}>{t('profile.apply_all')}</button>
                    </div>
                </div>
            )}
        </div>
    );
};