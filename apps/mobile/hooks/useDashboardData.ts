import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabase';
import { loadCustomCategories, loadHiddenCategories, mergeCategories } from '../lib/category-storage';
import { Transaction, Category, MonthStats, CategoryStat } from '../types';
import type { SupportedCurrency } from '../context/AuthContext';
import { buildStoredAmounts, getTransactionAmount } from '../lib/currency';
import { parseDateValue } from '../lib/locale';

import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface DashboardData {
  transactions: Transaction[];
  categories: Category[];
  stats: MonthStats;
  recentTxs: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<boolean>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
}

function hasStoredAmounts(tx: Partial<Transaction>) {
  return tx.amountUSD != null || tx.amountARS != null || tx.amountILS != null || tx.amountEUR != null;
}

const now = new Date();

// Build a Category from a tag + icon string
function makeCategory(tag: string, icon: string): Category {
  return { name: tag, icon, color: tagColor(tag) };
}

function tagColor(tag: string): string {
  // Deterministic color from tag string
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

function buildStats(txs: Transaction[], currency: SupportedCurrency): MonthStats {
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const monthTxs = txs.filter(t => {
    const d = parseDateValue(t.date);
    return d.getMonth() === curMonth && d.getFullYear() === curYear && !t.isCancelled && !t.excludeFromBudget;
  });

  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + getTransactionAmount(t, currency), 0);
  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + getTransactionAmount(t, currency), 0);

  const catTotals: Record<string, { total: number; count: number; icon: string }> = {};
  monthTxs.filter(t => t.type === 'expense').forEach(t => {
    const key = t.tag || 'OTROS';
    if (!catTotals[key]) catTotals[key] = { total: 0, count: 0, icon: t.icon || '❓' };
    catTotals[key].total += getTransactionAmount(t, currency);
    catTotals[key].count++;
  });

  const byCategory: CategoryStat[] = Object.entries(catTotals)
    .map(([tag, { total, count, icon }]) => ({
      category: makeCategory(tag, icon),
      total,
      count,
      percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byCategory };
}

export function useDashboardData(webUserId: string | null, currency: SupportedCurrency = 'ARS'): DashboardData {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const createTransactionFallback = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const payload = hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) };
    const { error: insertError } = await supabase.from('Transaction').insert(payload);
    if (insertError) throw insertError;
  }, [currency, session]);

  const updateTransactionFallback = useCallback(async (id: string, tx: Partial<Transaction>) => {
    const payload = tx.amount != null
      ? (hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) })
      : tx;
    const { error: updateError } = await supabase.from('Transaction').update(payload).eq('id', id);
    if (updateError) throw updateError;
  }, [currency, session]);

  const deleteTransactionFallback = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('Transaction').delete().eq('id', id);
    if (deleteError) throw deleteError;
  }, []);

  const createTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const payload = hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) };
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, session);
      if (!res.ok) {
        await createTransactionFallback(tx);
      }
      refetch();
      return true;
    } catch {
      try {
        await createTransactionFallback(tx);
        refetch();
        return true;
      } catch {
        return false;
      }
    }
  }, [createTransactionFallback, currency, refetch, session]);

  const updateTransaction = useCallback(async (id: string, tx: Partial<Transaction>) => {
    try {
      const payload = tx.amount != null
        ? (hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) })
        : tx;
      const res = await apiFetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      }, session);
      if (!res.ok) {
        await updateTransactionFallback(id, tx);
      }
      refetch();
      return true;
    } catch {
      try {
        await updateTransactionFallback(id, tx);
        refetch();
        return true;
      } catch {
        return false;
      }
    }
  }, [currency, refetch, session, updateTransactionFallback]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      }, session);
      if (!res.ok) {
        await deleteTransactionFallback(id);
      }
      refetch();
      return true;
    } catch {
      try {
        await deleteTransactionFallback(id);
        refetch();
        return true;
      } catch {
        return false;
      }
    }
  }, [deleteTransactionFallback, refetch, session]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tx_saved', refetch);
    return () => sub.remove();
  }, [refetch]);

  useEffect(() => {
    const loadCategoryState = async () => {
      const [storedCustom, storedHidden] = await Promise.all([loadCustomCategories(), loadHiddenCategories()]);
      setCustomCategories(storedCustom);
      setHiddenCategories(storedHidden);
    };

    void loadCategoryState();
    const sub = DeviceEventEmitter.addListener('tx_saved', loadCategoryState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!webUserId) return;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const { data, error: txError } = await supabase
          .from('Transaction')
          .select('*')
          .eq('userId', webUserId)
          .order('date', { ascending: false })
          .limit(10000);

        if (txError) throw txError;
        setTransactions((data ?? []) as Transaction[]);
      } catch (e: any) {
        setError(e.message ?? 'Error cargando transacciones');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [webUserId, tick]);

  // Derive unique categories from tags
  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const tx of transactions) {
    if (tx.tag && !seen.has(tx.tag)) {
      seen.add(tx.tag);
      categories.push(makeCategory(tx.tag, tx.icon));
    }
  }

  const mergedCategories = mergeCategories(categories, customCategories, hiddenCategories);
  const mappedTransactions = transactions.map((tx) => ({ ...tx, amount: getTransactionAmount(tx, currency) }));
  const stats = buildStats(transactions, currency);
  const recentTxs = [...mappedTransactions]
    .sort((a, b) => parseDateValue(b.date).getTime() - parseDateValue(a.date).getTime())
    .slice(0, 7);

  return {
    transactions: mappedTransactions,
    categories: mergedCategories,
    stats,
    recentTxs,
    loading,
    error,
    refetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
