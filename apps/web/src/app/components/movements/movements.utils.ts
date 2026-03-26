import { Transaction } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];



// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Converts an Excel serial number (days since 1900-01-01) to a JS Date. */
const excelSerialToDate = (serial: number): Date => {
    // Excel epoch: January 1, 1900 (with leap-year bug: serial 60 = Feb 29, 1900, which didn't exist)
    const epoch = new Date(1899, 11, 30); // Dec 30, 1899
    epoch.setDate(epoch.getDate() + serial);
    return epoch;
};

export const parseDate = (raw: string | number | Date | unknown): Date => {
    if (!raw && raw !== 0) return new Date(0);

    // Handle JS Date objects (cellDates:true or raw:true with Date cells)
    if (raw instanceof Date) return isNaN(raw.getTime()) ? new Date(0) : raw;

    // Handle Excel serial numbers (raw:true returns numeric dates)
    if (typeof raw === 'number') {
        if (raw > 0 && raw < 2958466) return excelSerialToDate(raw); // valid Excel date range
        return new Date(0);
    }

    const s = String(raw);
    if (!s.trim()) return new Date(0);
    const cleaned = s.toLowerCase().trim();
    if (cleaned === 'hoy') return new Date();
    if (cleaned === 'ayer') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    }

    // Try parsing slash or dash formats
    if (s.includes('/') || (s.includes('-') && s.length <= 10)) {
        const parts = s.split(/[/-]/).map(Number);
        // Detect YYYY/MM/DD or YYYY-MM-DD (first segment > 31 → must be a year)
        if (parts[0] > 31) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day);
        }
        // DD/MM/YYYY or DD/MM/YY
        const [day, month, year] = parts;
        const safeYear = year < 100 ? 2000 + year : (year || new Date().getFullYear());
        return new Date(safeYear, month - 1, day);
    }

    const dt = new Date(s);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
};

export const formatDate = (raw: string): string => {
    const d = parseDate(raw);
    if (d.getTime() === 0) return raw;
    return [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear(),
    ].join('/');
};

// ─── Icon lookup ──────────────────────────────────────────────────────────────

export const getTxIcon = (tx: Transaction): string => {
    // If user set an emoji, use it.
    if (tx.icon && tx.icon.length < 5) return tx.icon;
    // Otherwise, basic fallback.
    return '💳';
};

// ─── Export ───────────────────────────────────────────────────────────────────

const sanitize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const buildExportFilename = (
    search: string,
    showFilters: boolean,
    filterMonth: number | 'all',
    filterYear: number | 'all',
): string => {
    const searchPart = search.trim() ? sanitize(search.trim()) : '';
    const monthPart = showFilters && filterMonth !== 'all' ? sanitize(MONTHS[filterMonth as number]) : '';
    const yearPart = showFilters && filterYear !== 'all' ? String(filterYear) : '';
    const periodPart = [monthPart, yearPart].filter(Boolean).join('_');
    const parts = [searchPart, periodPart].filter(Boolean);
    return parts.length > 0 ? `${parts.join('_')}.xlsx` : 'historial_movimientos.xlsx';
};

const downloadBuffer = (buffer: Uint8Array<ArrayBuffer>, filename: string) => {
    const blob = new Blob([buffer.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
};

const toUint8Array = (value: ArrayBufferLike | Uint8Array<ArrayBufferLike>) => {
    if (value instanceof Uint8Array && value.buffer instanceof ArrayBuffer) {
        return value as Uint8Array<ArrayBuffer>;
    }

    const source = value instanceof Uint8Array ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value);
    const arrayBuffer = new ArrayBuffer(source.byteLength);
    const copy = new Uint8Array(arrayBuffer);
    copy.set(source);
    return copy;
};

export const exportToExcel = async (rows: Transaction[], filename: string, sym: string) => {
    void sym;
    const data = rows.map(t => ({
        Fecha: formatDate(t.date),
        Categoria: t.tag,
        Monto: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
        Descripcion: t.desc,
        Detalles: t.details ?? '',
    }));
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Movimientos');

    worksheet.columns = [
        { header: 'Fecha', key: 'Fecha', width: 14 },
        { header: 'Categoria', key: 'Categoria', width: 24 },
        { header: 'Monto', key: 'Monto', width: 14 },
        { header: 'Descripcion', key: 'Descripcion', width: 28 },
        { header: 'Detalles', key: 'Detalles', width: 42 },
    ];

    for (const row of data) {
        worksheet.addRow(row);
    }

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBuffer(toUint8Array(buffer), filename);
};

const parseCsvLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    cells.push(current);
    return cells;
};

export const parseCsvText = (content: string) => {
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized
        .split('\n')
        .filter(line => line.length > 0)
        .map(parseCsvLine);
};

export const readWorkbookRows = async (file: File) => {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.csv')) {
        const text = await file.text();
        return [{ name: 'CSV', rows: parseCsvText(text) as unknown[][] }];
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    return workbook.worksheets.map(worksheet => {
        const rows = worksheet.getSheetValues()
            .slice(1)
            .map((row): unknown[] => {
                if (!Array.isArray(row)) return [];
                return row.slice(1).map(cell => {
                    if (cell && typeof cell === 'object' && 'text' in cell) {
                        return String((cell as { text?: unknown }).text ?? '');
                    }

                    if (cell && typeof cell === 'object' && 'result' in cell) {
                        return (cell as { result?: unknown }).result ?? '';
                    }

                    return cell ?? '';
                });
            });

        return { name: worksheet.name, rows };
    });
};

// ─── Import (column-mapping types) ───────────────────────────────────────────

export interface ColumnMapping {
    dateCol: string;
    descCol: string;
    debitCol: string;
    creditCol: string;
    detailsCol: string;
    categoryCol: string;
}

// ─── Import (amount parser) ─────────────────────────────────────────────────

/**
 * Robustly parses a numeric string that may use comma as thousands separator
 * (e.g. "1,234.56" → 1234.56) OR comma as decimal separator ("1.234,56" → 1234.56).
 */
const parseAmount = (raw: string): number => {
    if (!raw || !raw.trim()) return 0;
    const s = raw.trim();
    // Detect format: does a comma appear before a dot? → comma=thousands, dot=decimal
    const hasComaThenDot = /,\d+\./.test(s);   // "1,234.56"
    const hasDotThenComa = /\.\d+,/.test(s);   // "1.234,56" (European)
    let cleaned = s;
    if (hasComaThenDot || (!hasDotThenComa && s.includes(',') && s.includes('.'))) {
        // Comma is thousands separator → remove all commas
        cleaned = s.replace(/,/g, '');
    } else if (hasDotThenComa) {
        // Dot is thousands separator, comma is decimal → remove dots, replace comma with dot
        cleaned = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
        // Only a comma, no dot → treat as decimal separator (e.g. "1234,56")
        cleaned = s.replace(',', '.');
    }
    // Strip any remaining non-numeric chars except dot and sign
    cleaned = cleaned.replace(/[^0-9.\-+]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
};

// ─── Import (legacy auto-detect) ─────────────────────────────────────────────

/** Resolves an Excel column by trying multiple possible header names. */
const pickField = (row: Record<string, unknown>, candidates: string[]): string => {
    const keys = Object.keys(row);
    const normalize = (s: string) =>
        s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const key = keys.find(k => {
        const cleaned = normalize(k);
        return candidates.includes(cleaned) || candidates.some(c => cleaned.startsWith(c));
    });
    return key ? String(row[key]) : '';
};

export interface ImportedRow {
    desc: string; amount: number; tag: string;
    type: 'income' | 'expense'; date: string; details: string;
}

export const parseExcelRow = (row: Record<string, unknown>, fallbackYear: string, lastDate: string): { row: ImportedRow | null; resolvedDate: string } => {
    // Attempt to pick specific columns based on the user's mapping
    const rawDate = pickField(row, ['date', 'fecha', 'dia']);
    const rawTransaction = pickField(row, ['transaction', 'transactio', 'titulo', 'concepto', 'desc', 'descripcion']);
    const rawDetails = pickField(row, ['details', 'detalle', 'detalles']);
    const rawReference = pickField(row, ['reference', 'referenc', 'referencia']);
    const rawDebit = pickField(row, ['debit', 'egreso', 'monto', 'amount', 'valor', 'precio']);
    const rawCredit = pickField(row, ['credit', 'ingreso']);

    // Ignore Balance in NIS, Value date, To, Additional details

    let date = rawDate.trim();
    if (date.match(/^\d{1,2}[/\-]\d{1,2}$/)) date = `${date}/${fallbackYear}`;
    const resolvedDate = date || lastDate;

    // Evaluate Credit / Debit
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (rawCredit) {
        const parsed = parseAmount(rawCredit);
        if (parsed !== 0) { amount = parsed; type = 'income'; }
    }

    if (amount === 0 && rawDebit) {
        const parsed = parseAmount(rawDebit);
        if (parsed !== 0) { amount = parsed; type = 'expense'; }
    }

    amount = Math.abs(amount);

    // Evaluate Reference -> Tag / Details
    let tag = 'custom';
    let details = rawDetails;

    if (rawReference) {
        const refClean = rawReference.trim();
        // Check if exactly 4 digits
        if (/^\d{4}$/.test(refClean)) {
            tag = 'tarjetas';
        } else {
            // Append to details
            details = details ? `${details} - Ref: ${refClean}` : `Ref: ${refClean}`;
        }
    }

    // Guard: skip empty rows where we don't even have amount or transaction Title
    if (amount === 0 && !rawTransaction) return { row: null, resolvedDate };

    return {
        row: {
            desc: rawTransaction || 'Importado',
            amount,
            tag: tag || 'custom', // fallback jic
            type,
            date: resolvedDate,
            details: details || '',
        },
        resolvedDate,
    };
};

// ─── Import (user-defined column mapping) ────────────────────────────────────

export const parseExcelRowMapped = (
    row: Record<string, unknown>,
    mapping: ColumnMapping,
    fallbackYear: string,
    lastDate: string,
): { row: ImportedRow | null; resolvedDate: string } => {
    const get = (col: string) => (col ? String(row[col] ?? '').trim() : '');

    // For the date column, pass the raw value (may be a number serial or Date) to parseDate
    const rawDateVal = mapping.dateCol ? (row[mapping.dateCol] ?? '') : '';
    const parsedDateObj = parseDate(rawDateVal);
    let date = parsedDateObj.getTime() === 0
        ? get(mapping.dateCol)   // fallback: use string as-is if parseDate failed
        : [
            String(parsedDateObj.getDate()).padStart(2, '0'),
            String(parsedDateObj.getMonth() + 1).padStart(2, '0'),
            parsedDateObj.getFullYear(),
        ].join('/');
    if (date.match(/^\d{1,2}[/\-]\d{1,2}$/)) date = `${date}/${fallbackYear}`;
    const resolvedDate = date || lastDate;

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    const rawCredit = get(mapping.creditCol);
    if (rawCredit) {
        const parsed = parseAmount(rawCredit);
        if (parsed !== 0) { amount = parsed; type = 'income'; }
    }

    if (amount === 0) {
        const rawDebit = get(mapping.debitCol);
        if (rawDebit) {
            const parsed = parseAmount(rawDebit);
            if (parsed !== 0) { amount = parsed; type = 'expense'; }
        }
    }

    amount = Math.abs(amount);

    const desc = get(mapping.descCol);
    const details = get(mapping.detailsCol);
    const tag = get(mapping.categoryCol) || 'custom';

    if (amount === 0 && !desc) return { row: null, resolvedDate };

    return {
        row: { desc: desc || 'Importado', amount, tag, type, date: resolvedDate, details },
        resolvedDate,
    };
};

// ─── Import Review (month-block reconciliation) ───────────────────────────────

/** Returns a sortable month key like "2024-10" from any supported date value. */
export const getMonthKey = (raw: string | number | Date | unknown): string => {
    const d = parseDate(raw);
    if (d.getTime() === 0) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export interface MonthBlock {
    monthKey: string;
    label: string;
    excelRows: ImportedRow[];
    existingTxs: Transaction[];
    excelIncome: number;
    excelExpense: number;
    existingIncome: number;
    existingExpense: number;
}

/**
 * Groups parsed Excel rows by calendar month and cross-references against
 * the existing transactions already stored in the app.
 */
export const buildImportReview = (
    parsedRows: ImportedRow[],
    existingTxs: Transaction[],
): MonthBlock[] => {
    const excelByMonth = new Map<string, ImportedRow[]>();
    for (const row of parsedRows) {
        const key = getMonthKey(row.date);
        if (!excelByMonth.has(key)) excelByMonth.set(key, []);
        excelByMonth.get(key)!.push(row);
    }

    const existingByMonth = new Map<string, Transaction[]>();
    for (const tx of existingTxs) {
        const key = getMonthKey(tx.date);
        if (!existingByMonth.has(key)) existingByMonth.set(key, []);
        existingByMonth.get(key)!.push(tx);
    }

    const blocks: MonthBlock[] = [];
    for (const [monthKey, excelRows] of excelByMonth) {
        if (monthKey === 'unknown') continue;
        const existing = existingByMonth.get(monthKey) ?? [];
        const [year, month] = monthKey.split('-').map(Number);

        blocks.push({
            monthKey,
            label: `${MONTHS[month - 1]} ${year}`,
            excelRows,
            existingTxs: existing,
            excelIncome: excelRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
            excelExpense: excelRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
            existingIncome: existing.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            existingExpense: existing.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
    }

    return blocks.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};
