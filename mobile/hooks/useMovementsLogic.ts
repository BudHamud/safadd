import { useState, useEffect, useCallback } from 'react';
import { Transaction, Category, MovementFilters } from '../types';
import type { SupportedCurrency } from '../context/AuthContext';
import { getTransactionAmount, getCachedExchangeRateSnapshot } from '../lib/currency';
import type { ExchangeRateSnapshot } from '../lib/currency';
import { parseDateValue } from '../lib/locale';
import { useTransactions } from '../context/TransactionsContext';

interface MovementsData {
  transactions: Transaction[];
  filtered: Transaction[];
  categories: Category[];
  filters: MovementFilters;
  setFilters: (f: Partial<MovementFilters>) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<boolean>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
}

const defaultFilters = (): MovementFilters => ({
  scope: 'month',
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  type: 'all',
  tag: null,
  search: '',
});

function applyFilters(txs: Transaction[], f: MovementFilters): Transaction[] {
  return txs.filter(tx => {
    if (tx.isCancelled) return false;
    const d = parseDateValue(tx.date);
    if (f.scope === 'month' && (d.getMonth() !== f.month || d.getFullYear() !== f.year)) return false;
    if (f.scope === 'year' && d.getFullYear() !== f.year) return false;
    if (f.type !== 'all' && tx.type !== f.type) return false;
    if (f.tag && tx.tag !== f.tag) return false;
    if (f.search && !tx.desc.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => parseDateValue(b.date).getTime() - parseDateValue(a.date).getTime());
}

function sortTransactionsByDate(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime());
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

export function useMovementsLogic(webUserId: string | null, currency: SupportedCurrency): MovementsData {
  const {
    transactions,
    categories,
    loading,
    error,
    refetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const [filters, setFiltersState] = useState<MovementFilters>(defaultFilters);
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  useEffect(() => {
    getCachedExchangeRateSnapshot().then(setSnapshot).catch(() => setSnapshot(null));
  }, []);

  const setFilters = useCallback((partial: Partial<MovementFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const filtered = applyFilters(
    transactions.map((tx) => ({ ...tx, amount: getTransactionAmount(tx, currency, snapshot) })),
    filters,
  );

  return {
    transactions, filtered, categories: categories.map((category) => ({ ...category, color: category.color || tagColor(category.name) })),
    filters, setFilters, loading, error, refetch,
    createTransaction, updateTransaction, deleteTransaction,
  };
}
