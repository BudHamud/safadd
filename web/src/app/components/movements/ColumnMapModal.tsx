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
    { key: 'detailsCol', labelKey: 'field.notes' },
    { key: 'categoryCol', labelKey: 'field.category' },
    { key: 'paymentCol', labelKey: 'movements.import_payment_column' },
    { key: 'recurrenceCol', labelKey: 'movements.import_recurrence_column' },
    { key: 'periodicityCol', labelKey: 'movements.import_periodicity_column' },
];

const autoDetect = (headers: string[], candidates: string[]): string => {
    const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return headers.find(h => candidates.some(c => norm(h) === c || norm(h).startsWith(c))) ?? '';
};

type Props = {
    headers: string[];
    cards: string[];
    onConfirm: (m: ColumnMapping) => void;
    onCancel: () => void;
    importProgress: { done: number; total: number } | null;
};

export const ColumnMapModal = ({ headers, cards, onConfirm, onCancel, importProgress }: Props) => {
    const { t } = useLanguage();
    const buildDefault = (): ColumnMapping => ({
        amountMode: 'single',
        dateCol: autoDetect(headers, ['date', 'fecha', 'dia']),
        descCol: autoDetect(headers, ['transaction', 'transactio', 'description', 'descripcion', 'concepto', 'titulo', 'desc']),
        amountCol: autoDetect(headers.filter(header => !/^(debit|debito|cargo|egreso|gasto)/i.test(header.trim())), ['amount', 'monto', 'importe', 'valor']),
        debitCol: autoDetect(headers, ['debit', 'debito', 'egreso', 'cargo']),
        creditCol: autoDetect(headers, ['credit', 'credito', 'ingreso']),
        detailsCol: autoDetect(headers, ['details', 'detalle', 'detalles', 'additional']),
        categoryCol: autoDetect(headers, ['category', 'categoria', 'tag']),
        paymentCol: autoDetect(headers, ['forma de pago', 'payment method', 'payment', 'pago', 'tarjeta', 'card']),
        recurrenceCol: autoDetect(headers, ['tipo de gasto', 'recurrence', 'recurrencia', 'recurrente']),
        periodicityCol: autoDetect(headers, ['frecuencia', 'periodicity', 'periodicidad']),
        forceCardDigits: '',
    });

    const [mapping, setMapping] = useState<ColumnMapping>(buildDefault);
    const set = (key: keyof ColumnMapping) => (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMapping(prev => ({ ...prev, [key]: e.target.value }));

    const canConfirm = !!mapping.dateCol
        && (mapping.amountMode === 'single' ? !!mapping.amountCol : (!!mapping.debitCol || !!mapping.creditCol))
        && (!mapping.forceCardDigits || /^\d{4}$/.test(mapping.forceCardDigits));
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

                <div style={{ marginBottom: '1.1rem', padding: '0.8rem 0.85rem', background: 'var(--surface-alt)', borderRadius: '8px', border: `1px solid ${TOKEN.green}66` }}>
                    <label htmlFor="import-card-digits" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: TOKEN.text, marginBottom: '0.3rem' }}>{t('movements.import_assign_card')}</label>
                    <div style={{ fontSize: '0.58rem', color: TOKEN.muted, marginBottom: '0.55rem' }}>{t('movements.import_assign_card_help')}</div>
                    <input
                        id="import-card-digits"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        list="import-card-options"
                        maxLength={4}
                        placeholder={t('movements.import_card_digits_placeholder')}
                        value={mapping.forceCardDigits}
                        onChange={e => setMapping(prev => ({ ...prev, forceCardDigits: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', fontSize: '0.8rem' }}
                    />
                    <datalist id="import-card-options">
                        {cards.map(digits => <option key={digits} value={digits}>{t('movements.import_card')} •••• {digits}</option>)}
                    </datalist>
                    {mapping.forceCardDigits.length > 0 && mapping.forceCardDigits.length < 4 && (
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: TOKEN.red, marginTop: '0.35rem' }}>{t('movements.import_card_digits_error')}</div>
                    )}
                </div>

                {/* Field mappings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TOKEN.text }}>{t('movements.import_amount_mode')}</span>
                        <select value={mapping.amountMode} onChange={e => setMapping(prev => ({ ...prev, amountMode: e.target.value as ColumnMapping['amountMode'] }))} style={{ ...selectStyle, width: '100%' }}>
                            <option value="single">{t('movements.import_single_amount_mode')}</option>
                            <option value="separate">{t('movements.import_separate_amount_mode')}</option>
                        </select>
                    </div>
                    {(mapping.amountMode === 'single'
                        ? [{ key: 'amountCol' as const, labelKey: 'movements.import_amount_column', required: true }, ...MAPPING_FIELDS]
                        : [{ key: 'debitCol' as const, labelKey: 'movements.import_debit_column' }, { key: 'creditCol' as const, labelKey: 'movements.import_credit_column' }, ...MAPPING_FIELDS]
                    ).map(({ key, labelKey, required }) => (
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

                {mapping.amountMode === 'single' && (
                    <div style={{ fontSize: '0.58rem', color: TOKEN.muted, marginTop: '-0.8rem', marginBottom: '0.8rem' }}>{t('movements.import_signed_amount_help')}</div>
                )}

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
