import React, { useState } from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { MonthBlock, ImportedRow, formatDate } from './movements.utils';
import { useLanguage } from '../../../context/LanguageContext';

const TOKEN = {
    dark: 'var(--surface)',
    border: 'var(--border-dim)',
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    green: 'var(--primary)',
    red: 'var(--accent)',
} as const;

const iconBtnStyle = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
    border: `1px solid ${active ? TOKEN.green : 'var(--border)'}`,
    background: active ? TOKEN.green : 'var(--surface-alt)',
    color: active ? 'var(--primary-text)' : TOKEN.muted,
    letterSpacing: '0.04em', transition: 'all 0.15s',
});

type Props = {
    blocks: MonthBlock[];
    sym: string;
    onConfirm: (rows: ImportedRow[]) => void;
    onCancel: () => void;
    importProgress: { done: number; total: number } | null;
};

export const ImportReviewModal = ({ blocks, sym, onConfirm, onCancel, importProgress }: Props) => {
    const { t } = useLanguage();
    const [selected, setSelected] = useState<Map<string, Set<number>>>(() => {
        const m = new Map<string, Set<number>>();
        blocks.forEach(b => m.set(b.monthKey, new Set(b.excelRows.map((_, i) => i))));
        return m;
    });
    const [activeMonth, setActiveMonth] = useState(blocks[0]?.monthKey ?? '');

    const isImporting = importProgress !== null;
    const progressPct = isImporting ? Math.round((importProgress!.done / importProgress!.total) * 100) : 0;

    const toggleRow = (monthKey: string, idx: number) => {
        setSelected(prev => {
            const next = new Map(prev);
            const s = new Set(next.get(monthKey) ?? []);
            s.has(idx) ? s.delete(idx) : s.add(idx);
            next.set(monthKey, s);
            return next;
        });
    };

    const toggleMonth = (monthKey: string, excelCount: number, forceVal?: boolean) => {
        setSelected(prev => {
            const next = new Map(prev);
            const cur = next.get(monthKey) ?? new Set<number>();
            const allSelected = cur.size === excelCount;
            const target = forceVal !== undefined ? forceVal : !allSelected;
            next.set(monthKey, target ? new Set(Array.from({ length: excelCount }, (_, i) => i)) : new Set());
            return next;
        });
    };

    const selectAll = (val: boolean) => blocks.forEach(b => toggleMonth(b.monthKey, b.excelRows.length, val));

    const totalSelected = blocks.reduce((s, b) => s + (selected.get(b.monthKey)?.size ?? 0), 0);
    const totalRows = blocks.reduce((s, b) => s + b.excelRows.length, 0);

    const handleConfirm = () => {
        const rows: ImportedRow[] = [];
        for (const b of blocks) {
            const s = selected.get(b.monthKey) ?? new Set();
            b.excelRows.forEach((r, i) => { if (s.has(i)) rows.push(r); });
        }
        onConfirm(rows);
    };

    const activeBlock = blocks.find(b => b.monthKey === activeMonth);

    const renderDiffBadge = (excelExp: number, existExp: number) => {
        const diff = excelExp - existExp;
        const color = Math.abs(diff) < 0.01 ? TOKEN.muted : diff > 0 ? TOKEN.red : TOKEN.green;
        const label = Math.abs(diff) < 0.01 ? t('movements.import_equal') : diff > 0 ? `+${formatCurrency(diff, sym)}` : formatCurrency(diff, sym);
        return <span style={{ fontSize: '0.55rem', fontWeight: 800, color, background: `${color}22`, padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{label}</span>;
    };

    const renderMonthStatusBadge = (b: MonthBlock) => {
        if (b.existingTxs.length === 0) return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: TOKEN.green, background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{t('movements.import_new')}</span>;
        const diff = Math.abs(b.excelExpense - b.existingExpense);
        if (diff < 0.01) return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: TOKEN.muted, background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{t('movements.import_covered')}</span>;
        return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--accent)', background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{t('movements.import_difference')}</span>;
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '14px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.1rem 1.4rem', borderBottom: `1px solid ${TOKEN.border}`, flexShrink: 0 }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('movements.import_review_step')}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: TOKEN.text }}>{t('movements.import_review_title')}</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => selectAll(true)} disabled={isImporting} style={{ ...iconBtnStyle(), fontSize: '0.6rem' }}>✓ {t('movements.import_select_all')}</button>
                            <button onClick={() => selectAll(false)} disabled={isImporting} style={{ ...iconBtnStyle(), fontSize: '0.6rem' }}>✗ {t('movements.import_select_none')}</button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: TOKEN.muted, marginTop: '0.2rem' }}>
                        {t('movements.import_months_detected', { count: blocks.length, unit: blocks.length === 1 ? t('movements.import_month_unit_one') : t('movements.import_month_unit_other'), selected: totalSelected, total: totalRows })}
                    </div>
                </div>

                {/* Body: two-panel layout */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: month list */}
                    <div style={{ width: '210px', flexShrink: 0, borderRight: `1px solid ${TOKEN.border}`, overflowY: 'auto', padding: '0.6rem 0' }}>
                        {blocks.map(b => {
                            const sel = selected.get(b.monthKey) ?? new Set();
                            const allSel = sel.size === b.excelRows.length;
                            const someSel = sel.size > 0 && !allSel;
                            const isActive = b.monthKey === activeMonth;
                            return (
                                <div
                                    key={b.monthKey}
                                    onClick={() => setActiveMonth(b.monthKey)}
                                    style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', background: isActive ? 'var(--surface-alt)' : 'transparent', borderLeft: `3px solid ${isActive ? TOKEN.green : 'transparent'}`, transition: 'all 0.1s' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                                        <input
                                            type="checkbox" checked={allSel}
                                            ref={el => { if (el) el.indeterminate = someSel; }}
                                            onChange={e => { e.stopPropagation(); toggleMonth(b.monthKey, b.excelRows.length); }}
                                            disabled={isImporting} style={{ accentColor: TOKEN.green, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isActive ? TOKEN.green : TOKEN.text }}>{b.label}</span>
                                        {renderMonthStatusBadge(b)}
                                    </div>
                                    <div style={{ fontSize: '0.58rem', color: TOKEN.muted, paddingLeft: '1.3rem' }}>
                                        XLS: <span style={{ color: TOKEN.red }}>↓{formatCurrency(b.excelExpense, sym)}</span>
                                        {b.existingTxs.length > 0 && <span> · App: <span style={{ color: TOKEN.muted }}>↓{formatCurrency(b.existingExpense, sym)}</span></span>}
                                    </div>
                                    <div style={{ fontSize: '0.55rem', color: TOKEN.muted, paddingLeft: '1.3rem', marginTop: '0.1rem' }}>
                                        {t('movements.import_selected_short', { selected: sel.size, total: b.excelRows.length })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: detail of active month */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeBlock && (
                            <>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            {t('movements.import_excel_rows', { count: activeBlock.excelRows.length })}
                                        </div>
                                        {renderDiffBadge(activeBlock.excelExpense, activeBlock.existingExpense)}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {activeBlock.excelRows.map((row, i) => {
                                            const isSel = (selected.get(activeBlock.monthKey) ?? new Set()).has(i);
                                            return (
                                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '6px', background: isSel ? 'var(--surface-alt)' : 'var(--surface)', border: `1px solid ${isSel ? 'var(--border)' : 'var(--border-dim)'}`, cursor: isImporting ? 'default' : 'pointer', transition: 'all 0.1s' }}>
                                                    <input type="checkbox" checked={isSel} onChange={() => !isImporting && toggleRow(activeBlock.monthKey, i)} style={{ accentColor: TOKEN.green, flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.6rem', color: TOKEN.muted, flexShrink: 0, minWidth: '54px' }}>{row.date}</span>
                                                    <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, color: TOKEN.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.desc || t('movements.import_empty_desc')}</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, flexShrink: 0, color: row.type === 'expense' ? TOKEN.red : TOKEN.green }}>
                                                        {row.type === 'expense' ? '-' : '+'}{formatCurrency(row.amount, sym)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Existing txs (reference) */}
                                {activeBlock.existingTxs.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            {t('movements.import_existing_reference', { count: activeBlock.existingTxs.length })}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            {activeBlock.existingTxs.slice(0, 20).map((tx: Transaction) => (
                                                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border-dim)', opacity: 0.7 }}>
                                                    <span style={{ fontSize: '0.6rem', color: TOKEN.muted, flexShrink: 0, minWidth: '54px' }}>{formatDate(tx.date)}</span>
                                                    <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, color: TOKEN.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</span>
                                                    <span style={{ fontSize: '0.65rem', color: TOKEN.muted, flexShrink: 0 }}>{tx.tag}</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? `${TOKEN.red}aa` : `${TOKEN.green}aa` }}>
                                                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
                                                    </span>
                                                </div>
                                            ))}
                                            {activeBlock.existingTxs.length > 20 && (
                                                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, padding: '0.3rem 0.65rem' }}>
                                                    {t('movements.import_more_count', { count: activeBlock.existingTxs.length - 20 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.4rem', borderTop: `1px solid ${TOKEN.border}`, flexShrink: 0 }}>
                    {isImporting && (
                        <div style={{ marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.green }}>{t('movements.import_in_progress')}</span>
                                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: TOKEN.text }}>{t('movements.import_progress_rows', { done: importProgress!.done, total: importProgress!.total, percent: progressPct })}</span>
                            </div>
                            <div style={{ height: '5px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '3px', background: TOKEN.green, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: TOKEN.muted, fontWeight: 700 }}>
                            {t('movements.import_rows_to_import', { count: totalSelected, suffix: totalSelected !== 1 ? 's' : '' })}
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={onCancel} disabled={isImporting} style={{ ...iconBtnStyle(), opacity: isImporting ? 0.4 : 1 }}>{t('btn.cancel')}</button>
                            <button
                                onClick={handleConfirm} disabled={isImporting || totalSelected === 0}
                                style={{ ...iconBtnStyle(), background: totalSelected > 0 && !isImporting ? TOKEN.green : 'var(--border)', color: totalSelected > 0 && !isImporting ? 'var(--primary-text)' : TOKEN.muted, border: `1px solid ${totalSelected > 0 && !isImporting ? TOKEN.green : 'var(--border)'}`, opacity: totalSelected > 0 && !isImporting ? 1 : 0.5, cursor: totalSelected > 0 && !isImporting ? 'pointer' : 'default' }}
                            >
                                {isImporting ? `${t('movements.import_in_progress')} ${progressPct}%` : t('movements.import_rows_button', { count: totalSelected })}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
