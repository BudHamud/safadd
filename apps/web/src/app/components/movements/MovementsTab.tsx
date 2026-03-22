import React from 'react';
import { Transaction } from '../../../types';
import { getCurrencySymbol } from '@safed/shared/currency';
import { MONTHS, MonthBlock, ImportedRow } from './movements.utils';
import { useMovementsLogic } from './useMovementsLogic';
import { useLanguage } from '../../../context/LanguageContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { TxCard } from './TxCard';
import { MovementsSidebar } from './MovementsSidebar';
import { ColumnMapModal } from './ColumnMapModal';
import { ImportReviewModal } from './ImportReviewModal';

// ─── Props ────────────────────────────────────────────────────────────────────

type MovementsTabProps = {
    transactions: Transaction[];
    onTransactionClick: (tx: Transaction) => void;
    userId: string | null;
    onTransactionsUpdated: () => void;
    globalCurrency: string;
    monthlyGoal: number;
    availableCategories: any[];
};

// ─── Design tokens ────────────────────────────────────────────────────────────

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

const selectStyle: React.CSSProperties = {
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '6px',
    color: TOKEN.text, fontSize: '0.7rem', fontWeight: 700,
    padding: '0.4rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
};

// ─── Main component ───────────────────────────────────────────────────────────

export const MovementsTab = ({
    transactions, onTransactionClick, userId, onTransactionsUpdated,
    globalCurrency, monthlyGoal, availableCategories,
}: MovementsTabProps) => {
    const { t } = useLanguage();
    const isMobile = useIsMobile(768);
    const sym = getCurrencySymbol(globalCurrency);
    const monthOptions = Array.from({ length: 12 }, (_, index) => {
        const label = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(2026, index, 1));
        return label.charAt(0).toUpperCase() + label.slice(1);
    });

    const {
        filters, patch, setPage,
        allCategories, years, filteredTxs, paginated, totalPages,
        fileInputRef, sidebar,
        handleExport, handleImport, handleDeleteAll,
        importDraft, setImportDraft, handleConfirmMapping,
        importReview, setImportReview,
        handleConfirmReview, importProgress,
    } = useMovementsLogic(transactions, userId, globalCurrency, monthlyGoal, onTransactionsUpdated);

    const { search, filterMonth, filterYear, filterType, showFilters, filterCategory, currentPage } = filters;
    const typeLabels: Record<'all' | 'expense' | 'income', string> = {
        all: t('movements.filter_all'),
        expense: `↓ ${t('movements.expenses')}`,
        income: `↑ ${t('movements.income')}`,
    };

    const paginationBar = totalPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', borderTop: '1px solid var(--border-dim)' }}>
            <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...iconBtnStyle(), opacity: currentPage === 1 ? 0.4 : 1 }}>
                {t('movements.prev_page')}
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: TOKEN.muted }}>{currentPage} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...iconBtnStyle(), opacity: currentPage === totalPages ? 0.4 : 1 }}>
                {t('movements.next_page')}
            </button>
        </div>
    ) : null;

    // ─── Transactions list ─────────────────────────────────────────────────────

    const txList = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {paginated.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: TOKEN.muted, fontWeight: 700, fontSize: '0.85rem', background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '10px' }}>
                    {t('movements.no_results')}
                </div>
            )}
            {paginated.map((tx: Transaction) => (
                <TxCard key={tx.id} tx={tx} sym={sym} onClick={() => onTransactionClick(tx)} />
            ))}
            {paginationBar}
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div data-color-zone="tx-rows" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: TOKEN.text, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
                    {t('movements.title')}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button onClick={() => patch({ showFilters: !showFilters })} style={iconBtnStyle(showFilters)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {!isMobile && (showFilters ? t('movements.hide_filters') : t('movements.show_filters'))}
                    </button>

                    <button onClick={handleExport} style={iconBtnStyle()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {!isMobile && t('movements.export')}
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} style={{ ...iconBtnStyle(), background: 'var(--surface-alt)', border: `1px solid ${TOKEN.green}`, color: TOKEN.green }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {!isMobile && t('movements.import_excel')}
                    </button>

                    <button onClick={handleDeleteAll} style={{ ...iconBtnStyle(), background: 'var(--surface-alt)', border: `1px solid ${TOKEN.red}`, color: TOKEN.red }} title={t('movements.delete_all_title')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        {!isMobile && t('movements.delete_all')}
                    </button>

                    <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleImport} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '8px', padding: '0.6rem 1rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TOKEN.muted} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            placeholder={t('movements.search')}
                            value={search}
                            onChange={e => patch({ search: e.target.value })}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: TOKEN.text, fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                        />
                        {search && <button onClick={() => patch({ search: '' })} style={{ background: 'none', color: TOKEN.muted, cursor: 'pointer', fontSize: '1rem', padding: 0, fontFamily: 'inherit' }}>✕</button>}
                    </div>

                    {showFilters && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                            <select value={filterMonth} onChange={e => patch({ filterMonth: e.target.value === 'all' ? 'all' : Number(e.target.value) })} style={selectStyle}>
                                <option value="all">{t('movements.all_months')}</option>
                                {monthOptions.map((month, index) => <option key={month} value={index}>{month}</option>)}
                            </select>

                            <select value={filterYear} onChange={e => patch({ filterYear: e.target.value === 'all' ? 'all' : Number(e.target.value) })} style={selectStyle}>
                                <option value="all">{t('movements.all_years')}</option>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>

                            <select value={filterCategory} onChange={e => patch({ filterCategory: e.target.value })} style={selectStyle}>
                                <option value="all">{t('movements.all_categories')}</option>
                                {allCategories.map(category => <option key={category} value={category}>{category}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                                {(['all', 'expense', 'income'] as const).map(value => (
                                    <button key={value} onClick={() => patch({ filterType: value })} style={{ ...iconBtnStyle(filterType === value), padding: '0.4rem 0.65rem' }}>
                                        {typeLabels[value]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!showFilters && (
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {t('dashboard.recent')}
                        </div>
                    )}

                    {txList}
                </div>

                {!isMobile && <MovementsSidebar sidebar={sidebar} sym={sym} />}
            </div>

            {isMobile && <MovementsSidebar sidebar={sidebar} sym={sym} fullWidth />}

            {/* Column mapping modal — step 1 */}
            {importDraft && (
                <ColumnMapModal
                    headers={importDraft.headers}
                    onConfirm={handleConfirmMapping}
                    onCancel={() => setImportDraft(null)}
                    importProgress={null}
                />
            )}

            {/* Import review modal — step 2 */}
            {importReview && (
                <ImportReviewModal
                    blocks={importReview}
                    sym={sym}
                    onConfirm={handleConfirmReview}
                    onCancel={() => !importProgress && setImportReview(null)}
                    importProgress={importProgress}
                />
            )}
        </div>
    );
};
