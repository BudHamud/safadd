import { useState, useRef } from 'react';
import { Transaction } from '../../../types';
import { getCurrencySymbol } from '@safed/shared/currency';
import {
    MONTHS, parseDate,
    buildExportFilename, exportToExcel,
    ColumnMapping, parseExcelRowMapped,
    MonthBlock, buildImportReview, ImportedRow, readWorkbookRows,
} from './movements.utils';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { useAppContext } from '../../../context/AppContext';

// ─── Import draft ─────────────────────────────────────────────────────────────

export interface ImportDraft {
    headers: string[];
    sheets: { rows: Record<string, unknown>[] }[];
    fallbackYear: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
    showFilters: boolean;
    search: string;
    filterMonth: number | 'all';
    filterYear: number | 'all';
    filterCategory: string;
    filterType: 'all' | 'expense' | 'income';
    currentPage: number;
}

export interface SidebarData {
    label: string;
    isMonth: boolean;
    income: number;
    expense: number;
    balance: number;
    fixedPct: number;
    varPct: number;
    fixedAmt: number;
    varAmt: number;
    goalPct: number;
    goalSpent: number;
    goalLimit: number;
    topCats: [string, number][];
    maxCat: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IS_RECURRING = (t: Transaction) =>
    t.goalType === 'mensual' || t.goalType === 'periodo';

const sumBy = (txs: Transaction[], type: 'income' | 'expense') =>
    txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

const getSidebarLabel = (
    showFilters: boolean,
    filterMonth: number | 'all',
    filterYear: number | 'all',
    lang: 'es' | 'en',
    historicalLabel: string,
): string => {
    if (!showFilters) return historicalLabel;
    if (filterMonth !== 'all' && filterYear !== 'all') {
        const monthLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', { month: 'short' })
            .format(new Date(Number(filterYear), filterMonth as number, 1))
            .replace('.', '');
        return `${monthLabel.toUpperCase()} ${filterYear}`;
    }
    if (filterYear !== 'all') return String(filterYear);
    return historicalLabel;
};

const isSameMonth = (date: Date, targetMonth: number, targetYear: number) => (
    date.getMonth() === targetMonth && date.getFullYear() === targetYear
);

const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const RESERVED_SPREADSHEET_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const sanitizeSpreadsheetHeader = (value: unknown, index: number) => {
    const normalized = String(value ?? '').trim().slice(0, 80) || `column_${index + 1}`;
    return RESERVED_SPREADSHEET_KEYS.has(normalized) ? `column_${index + 1}` : normalized;
};

const rowsToSafeObjects = (rows: unknown[][], headerRowIndex: number) => {
    const headerRow = Array.isArray(rows[headerRowIndex]) ? rows[headerRowIndex] : [];
    const headers = headerRow.map((cell, index) => sanitizeSpreadsheetHeader(cell, index));
    const objectRows: Record<string, unknown>[] = [];

    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
        const row = rows[index];
        if (!Array.isArray(row)) continue;

        const mappedRow = Object.create(null) as Record<string, unknown>;
        let hasValue = false;

        for (let cellIndex = 0; cellIndex < headers.length; cellIndex += 1) {
            const header = headers[cellIndex];
            const cellValue = row[cellIndex] ?? '';
            mappedRow[header] = cellValue;
            hasValue ||= String(cellValue).trim().length > 0;
        }

        if (hasValue) {
            objectRows.push(mappedRow);
        }
    }

    return { headers, objectRows };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMovementsLogic = (
    transactions: Transaction[],
    userId: string | null,
    globalCurrency: string,
    monthlyGoal: number,
    onTransactionsUpdated: () => void,
) => {
    const { lang, t } = useLanguage();
    const dialog = useDialog();
    const { userEmail, authenticatedFetch } = useAppContext();
    const now = new Date();
    const sym = getCurrencySymbol(globalCurrency);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
    const [importReview, setImportReview] = useState<MonthBlock[] | null>(null);
    const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

    const ITEMS_PER_PAGE = 10;

    // ── Filter state ──────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<FilterState>({
        showFilters: false,
        search: '',
        filterMonth: now.getMonth(),
        filterYear: now.getFullYear(),
        filterCategory: 'all',
        filterType: 'all',
        currentPage: 1,
    });

    const patch = (partial: Partial<Omit<FilterState, 'currentPage'>>) =>
        setFilters(prev => ({ ...prev, ...partial, currentPage: 1 }));

    const setPage = (page: number) =>
        setFilters(prev => ({ ...prev, currentPage: page }));

    // ── Derived: available options ────────────────────────────────────────────
    const allCategories = Array.from(new Set(transactions.map(t => t.tag))).sort();

    const years = Array.from(new Set(
        transactions.map(t => parseDate(t.date).getFullYear()).filter(y => y > 2000)
    )).sort((a, b) => b - a);
    if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

    // ── Derived: filtered list ────────────────────────────────────────────────
    const { showFilters, search, filterMonth, filterYear, filterCategory, filterType, currentPage } = filters;

    const filteredTxs = transactions
        .filter(t => {
            const d = parseDate(t.date);
            if (showFilters && filterMonth !== 'all' && d.getMonth() !== filterMonth) return false;
            if (showFilters && filterYear !== 'all' && d.getFullYear() !== filterYear) return false;
            if (filterCategory !== 'all' && t.tag !== filterCategory) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            if (search && !t.desc.toLowerCase().includes(search.toLowerCase())
                && !t.tag.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    const paginated = filteredTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredTxs.length / ITEMS_PER_PAGE);

    // ── Derived: sidebar ──────────────────────────────────────────────────────
    // Always mirrors what's visible in the list (search + all filters included).
    const usingDefaultMonthSidebar = !showFilters && !search.trim();
    const currentMonthTxs = transactions
        .filter(t => isSameMonth(parseDate(t.date), now.getMonth(), now.getFullYear()))
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    const sidebarTxs = usingDefaultMonthSidebar ? currentMonthTxs : filteredTxs;
    const sidebarLabel = search.trim()
        ? `"${search.trim()}"`
        : usingDefaultMonthSidebar
            ? new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', { month: 'short', year: 'numeric' })
                .format(new Date(now.getFullYear(), now.getMonth(), 1))
                .replace('.', '')
                .toUpperCase()
            : getSidebarLabel(showFilters, filterMonth, filterYear, lang, t('movements.historical'));
    const sidebarIsMonth = usingDefaultMonthSidebar || (filterYear !== 'all' && filterMonth !== 'all');

    const sidebarIncome = sumBy(sidebarTxs, 'income');
    const sidebarExpense = sumBy(sidebarTxs, 'expense');

    const fixedAmt = sidebarTxs.filter(t => t.type === 'expense' && IS_RECURRING(t)).reduce((s, t) => s + t.amount, 0);
    const varAmt = sidebarTxs.filter(t => t.type === 'expense' && !IS_RECURRING(t)).reduce((s, t) => s + t.amount, 0);
    const totalExp = fixedAmt + varAmt || 1;

    const goalSpent = sidebarTxs.filter(t => t.type === 'expense' && !t.excludeFromBudget).reduce((s, t) => s + t.amount, 0);
    const goalPct = sidebarIsMonth && monthlyGoal > 0 ? Math.min((goalSpent / monthlyGoal) * 100, 100) : 0;

    const catTotals = sidebarTxs
        .filter(t => t.type === 'expense')
        .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.tag]: (acc[t.tag] ?? 0) + t.amount }), {});
    const topCats = Object.entries(catTotals).sort(([, a], [, b]) => b - a).slice(0, 5);

    const sidebar: SidebarData = {
        label: sidebarLabel,
        isMonth: sidebarIsMonth,
        income: sidebarIncome,
        expense: sidebarExpense,
        balance: sidebarIncome - sidebarExpense,
        fixedPct: Math.round((fixedAmt / totalExp) * 100),
        varPct: 100 - Math.round((fixedAmt / totalExp) * 100),
        fixedAmt,
        varAmt,
        goalPct,
        goalSpent,
        goalLimit: monthlyGoal,
        topCats,
        maxCat: topCats[0]?.[1] ?? 1,
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleExport = async () => {
        const filename = buildExportFilename(search, showFilters, filterMonth, filterYear);
        try {
            await exportToExcel(filteredTxs, filename, sym);
        } catch (error) {
            console.error('Error exporting Excel', error);
            await dialog.alert(t('movements.import_generic_error'));
        }
    };

    // Step 1: read file → detect headers → open mapping modal
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        const lowerName = file.name.toLowerCase();
        const isAllowedExtension = lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv');
        if (!isAllowedExtension || file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
            void dialog.alert(t('movements.import_read_error'));
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const fallbackYear = file.name.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
        void (async () => {
            try {
                const workbookSheets = await readWorkbookRows(file);
                const sheets: { rows: Record<string, unknown>[] }[] = [];
                let detectedHeaders: string[] = [];

                for (const sheet of workbookSheets) {
                    const rawRows = sheet.rows;
                    if (rawRows.length === 0) continue;

                    // Find header row: first row that has ≥2 non-empty cells that look like labels
                    let headerRowIndex = 0;
                    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                        const row = rawRows[i];
                        if (!Array.isArray(row)) continue;
                        const cells = row.map(c => String(c || '').trim()).filter(Boolean);
                        // At least 2 cells AND none look like a pure number or a date value
                        const labelLike = cells.filter(c => isNaN(Number(c)) && !c.match(/^\d{1,2}[/\-]\d{1,2}/));
                        if (labelLike.length >= 2) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    const { headers, objectRows } = rowsToSafeObjects(rawRows, headerRowIndex);

                    if (objectRows.length > 0 && detectedHeaders.length === 0) {
                        detectedHeaders = headers;
                    }
                    sheets.push({ rows: objectRows });
                }

                if (detectedHeaders.length === 0) {
                    void dialog.alert(t('movements.import_detect_columns_error'));
                    return;
                }

                setImportDraft({ headers: detectedHeaders, sheets, fallbackYear });
            } catch (err) {
                console.error('Error reading Excel', err);
                void dialog.alert(t('movements.import_read_error'));
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        })();
    };

    // Step 2a: user confirmed column mapping → parse rows and show review
    const handleConfirmMapping = (mapping: ColumnMapping) => {
        if (!importDraft) return;

        const parsedRows: ImportedRow[] = [];
        let lastDate = new Date().toISOString().split('T')[0];

        for (const { rows } of importDraft.sheets) {
            for (const raw of rows) {
                const keyCols = [mapping.dateCol, mapping.debitCol, mapping.creditCol].filter(Boolean);
                if (keyCols.length > 0 && keyCols.every(k => !String(raw[k] ?? '').trim())) continue;

                const { row, resolvedDate } = parseExcelRowMapped(raw, mapping, importDraft.fallbackYear, lastDate);
                lastDate = resolvedDate;
                if (!row) continue;
                parsedRows.push(row);
            }
        }

        if (parsedRows.length === 0) {
            void dialog.alert(t('movements.import_no_valid_rows'));
            return;
        }

        const blocks = buildImportReview(parsedRows, transactions);
        setImportDraft(null);
        setImportReview(blocks);
    };

    // Step 2b: user reviewed and confirmed selected rows → batch POST
    const CHUNK_SIZE = 500;
    const handleConfirmReview = async (selectedRows: ImportedRow[]) => {
        if (!userId) return;
        try {
            if (selectedRows.length === 0) {
                setImportReview(null);
                return;
            }

            const batch = selectedRows.map(row => ({ ...row, icon: '💳', userId }));
            const totalChunks = Math.ceil(batch.length / CHUNK_SIZE);
            setImportProgress({ done: 0, total: batch.length });

            for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
                const chunk = batch.slice(i, i + CHUNK_SIZE);
                const res = await authenticatedFetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chunk),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(
                        err?.errorDetail
                            ? `${err?.error ?? 'error'}: ${err.errorDetail}`
                            : err?.error ?? `Error HTTP ${res.status} en chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${totalChunks}`
                    );
                }
                setImportProgress({ done: Math.min(i + CHUNK_SIZE, batch.length), total: batch.length });
            }

            setImportProgress(null);
            setImportReview(null);
            onTransactionsUpdated();
        } catch (err) {
            console.error('Error importing Excel', err);
            setImportProgress(null);
            await dialog.alert(err instanceof Error ? err.message : t('movements.import_generic_error'));
        }
    };

    const handleDeleteAll = async () => {
        if (!userId) return;

        if (!userEmail) {
            await dialog.alert(t('movements.sensitive_email_missing'));
            return;
        }

        const typedEmail = await dialog.prompt({
            title: t('movements.delete_all_title'),
            message: t('movements.delete_all_email_confirm'),
            inputLabel: t('movements.sensitive_email_prompt_label'),
            inputPlaceholder: t('movements.sensitive_email_prompt_placeholder'),
            confirmLabel: t('btn.confirm'),
            cancelLabel: t('btn.cancel'),
            tone: 'danger',
        });

        if (typedEmail === null) return;

        if (typedEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
            await dialog.alert(t('movements.sensitive_email_mismatch'));
            return;
        }

        try {
            const res = await authenticatedFetch(`/api/transactions?userId=${userId}&id=all`, { method: 'DELETE' });
            if (res.ok) {
                onTransactionsUpdated();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (err) {
            console.error('Error al borrar todo', err);
            await dialog.alert(t('movements.delete_all_error'));
        }
    };

    return {
        // State via patch
        filters, patch, setPage,
        // Computed
        allCategories, years, filteredTxs, paginated, totalPages,
        sym, fileInputRef, sidebar,
        // Actions
        handleExport, handleImport, handleDeleteAll,
        // Import modal
        importDraft, setImportDraft, handleConfirmMapping,
        importReview, setImportReview,
        handleConfirmReview, importProgress,
    };
};
