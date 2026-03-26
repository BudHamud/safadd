import React, { useState } from 'react';
import { ColumnMapping } from './movements.utils';
import { useLanguage } from '../../../context/LanguageContext';

const TOKEN = {
    dark: 'var(--surface)',
    border: 'var(--border-dim)',
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    green: 'var(--primary)',
    red: 'var(--accent)',
    surface: 'var(--surface-alt)',
} as const;

const selectStyle: React.CSSProperties = {
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '6px',
    color: TOKEN.text, fontSize: '0.7rem', fontWeight: 700,
    padding: '0.4rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
};

const iconBtnStyle = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
    border: `1px solid ${active ? TOKEN.green : 'var(--border)'}`,
    background: active ? TOKEN.green : 'var(--surface-alt)',
    color: active ? 'var(--primary-text)' : TOKEN.muted,
    letterSpacing: '0.04em', transition: 'all 0.15s',
});

const MAPPING_FIELDS: { key: keyof ColumnMapping; labelKey: string; required?: boolean }[] = [
    { key: 'dateCol', labelKey: 'field.date', required: true },
    { key: 'descCol', labelKey: 'field.description' },
    { key: 'debitCol', labelKey: 'movements.import_debit_column' },
    { key: 'creditCol', labelKey: 'movements.import_credit_column' },
    { key: 'detailsCol', labelKey: 'field.notes' },
    { key: 'categoryCol', labelKey: 'field.category' },
];

const autoDetect = (headers: string[], candidates: string[]): string => {
    const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return headers.find(h => candidates.some(c => norm(h) === c || norm(h).startsWith(c))) ?? '';
};

type Props = {
    headers: string[];
    onConfirm: (m: ColumnMapping) => void;
    onCancel: () => void;
    importProgress: { done: number; total: number } | null;
};

export const ColumnMapModal = ({ headers, onConfirm, onCancel, importProgress }: Props) => {
    const { t } = useLanguage();
    const buildDefault = (): ColumnMapping => ({
        dateCol: autoDetect(headers, ['date', 'fecha', 'dia']),
        descCol: autoDetect(headers, ['transaction', 'transactio', 'description', 'descripcion', 'concepto', 'titulo', 'desc']),
        debitCol: autoDetect(headers, ['debit', 'egreso', 'monto', 'amount']),
        creditCol: autoDetect(headers, ['credit', 'ingreso']),
        detailsCol: autoDetect(headers, ['details', 'detalle', 'detalles', 'additional']),
        categoryCol: autoDetect(headers, ['category', 'categoria', 'tag']),
    });

    const [mapping, setMapping] = useState<ColumnMapping>(buildDefault);
    const set = (key: keyof ColumnMapping) => (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMapping(prev => ({ ...prev, [key]: e.target.value }));

    const canConfirm = !!mapping.dateCol && (!!mapping.debitCol || !!mapping.creditCol);
    const isImporting = importProgress !== null;
    const progressPct = isImporting ? Math.round((importProgress!.done / importProgress!.total) * 100) : 0;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t('movements.import_excel')}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: TOKEN.text }}>{t('movements.import_configure_columns')}</div>
                    <div style={{ fontSize: '0.68rem', color: TOKEN.muted, marginTop: '0.25rem' }}>{t('movements.import_configure_columns_help')}</div>
                </div>

                {/* Column chips */}
                <div style={{ marginBottom: '1.1rem', padding: '0.7rem 0.85rem', background: TOKEN.surface, borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: TOKEN.muted, textTransform: 'uppercase', marginBottom: '0.45rem' }}>{t('movements.import_detected_columns')}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {headers.map(h => (
                            <span key={h} style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.text, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.18rem 0.45rem' }}>{h}</span>
                        ))}
                    </div>
                </div>

                {/* Field mappings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    {MAPPING_FIELDS.map(({ key, labelKey, required }) => (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: required ? TOKEN.text : TOKEN.muted }}>
                                {t(labelKey as any)}{required && <span style={{ color: TOKEN.red }}> *</span>}
                            </span>
                            <select value={mapping[key]} onChange={set(key)} style={{ ...selectStyle, width: '100%' }}>
                                <option value="">{t('movements.import_do_not_use')}</option>
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                {!canConfirm && (
                    <div style={{ fontSize: '0.65rem', color: TOKEN.red, marginBottom: '0.85rem', fontWeight: 700 }}>
                        {t('movements.import_select_date_and_amount')}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexDirection: 'column' }}>
                    {isImporting && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <span style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.green }}>{t('movements.import_in_progress')}</span>
                                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: TOKEN.text }}>{t('movements.import_progress_rows', { done: importProgress!.done, total: importProgress!.total, percent: progressPct })}</span>
                            </div>
                            <div style={{ height: '5px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '3px', background: TOKEN.green, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button onClick={onCancel} disabled={isImporting} style={{ ...iconBtnStyle(), opacity: isImporting ? 0.4 : 1, cursor: isImporting ? 'default' : 'pointer' }}>{t('btn.cancel')}</button>
                        <button
                            onClick={() => canConfirm && !isImporting && onConfirm(mapping)}
                            style={{ ...iconBtnStyle(), background: canConfirm && !isImporting ? TOKEN.green : 'var(--border)', color: canConfirm && !isImporting ? 'var(--primary-text)' : TOKEN.muted, border: `1px solid ${canConfirm && !isImporting ? TOKEN.green : 'var(--border)'}`, opacity: canConfirm && !isImporting ? 1 : 0.5, cursor: canConfirm && !isImporting ? 'pointer' : 'default' }}
                        >
                            {isImporting ? `${t('movements.import_in_progress')} ${progressPct}%` : t('movements.import_confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
