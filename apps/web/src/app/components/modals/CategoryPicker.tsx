import React, { useState } from 'react';
import { Category } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

type Props = {
    selectedTag: string;
    availableCategories: Category[];
    onSelect: (tag: string, icon?: string) => void;
};

const KEY_CUSTOM = 'custom';

export const CategoryPicker = ({ selectedTag, availableCategories, onSelect }: Props) => {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const normalize = (value: string) => value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const filtered = availableCategories.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase())
    );

    const selected = selectedTag === KEY_CUSTOM
        ? null
        : availableCategories.find(c => normalize(c.label) === normalize(selectedTag));

    const displayLabel = selectedTag === KEY_CUSTOM
        ? `＋ ${t('order.new_category')}`
        : selected
        ? `${selected.icon} ${selected.label}`
        : t('order.select_placeholder');

    return (
        <div className="order-modal-cat-dropdown">
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="order-modal-cat-trigger order-modal-input"
            >
                <span>
                    {displayLabel}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="order-modal-cat-panel">
                    <input
                        className="order-modal-cat-panel-search"
                        type="text"
                        placeholder={t('movements.search')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                    <div className="order-modal-cat-panel-list">
                        {filtered.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className={`order-modal-cat-option ${selectedTag === c.label ? 'active' : ''}`}
                                onClick={() => { onSelect(c.label, c.icon); setOpen(false); setSearch(''); }}
                            >
                                <span>{c.icon}</span>
                                <span>{c.label}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`order-modal-cat-option order-modal-cat-option--new ${selectedTag === KEY_CUSTOM ? 'active' : ''}`}
                            onClick={() => { onSelect(KEY_CUSTOM); setOpen(false); setSearch(''); }}
                        >
                            <span>＋</span>
                            <span>{t('order.new_category_ellipsis')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
