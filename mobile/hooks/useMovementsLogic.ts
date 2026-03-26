import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabase';
import { loadCustomCategories, loadHiddenCategories, mergeCategories } from '../lib/category-storage';
import { Transaction, Category, MovementFilters } from '../types';
import type { SupportedCurrency } from '../context/AuthContext';
import { buildStoredAmounts, getTransactionAmount, getCachedExchangeRateSnapshot } from '../lib/currency';
import type { ExchangeRateSnapshot } from '../lib/currency';
import { parseDateValue } from '../lib/locale';
import { getQueue, enqueue, getSyncMode, applyQueueToTransactions, isTempTransactionId } from '../lib/offlineQueue';
import { useAuth } from '../context/AuthContext';

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

function hasStoredAmounts(tx: Partial<Transaction>) {
  return tx.amountUSD != null || tx.amountARS != null || tx.amountILS != null || tx.amountEUR != null;
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
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MovementFilters>(defaultFilters);
  const [tick, setTick] = useState(0);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  useEffect(() => {
    getCachedExchangeRateSnapshot().then(setSnapshot).catch(() => setSnapshot(null));
  }, []);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const setFilters = useCallback((partial: Partial<MovementFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

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
        const [txResult, queue] = await Promise.all([
          supabase
            .from('Transaction')
            .select('*')
            .eq('userId', webUserId)
            .order('date', { ascending: false })
            .limit(2000),
          getQueue(),
        ]);

        const { data, error: txError } = txResult;

        if (txError) throw txError;
        setTransactions(sortTransactionsByDate(applyQueueToTransactions((data ?? []) as Transaction[], queue)));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [webUserId, tick]);

  // Derive categories from unique tags
  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const tx of transactions) {
    if (tx.tag && !seen.has(tx.tag)) {
      seen.add(tx.tag);
      categories.push({ name: tx.tag, icon: tx.icon || '❓', color: tagColor(tx.tag) });
    }
  }

  const mergedCategories = mergeCategories(categories, customCategories, hiddenCategories);

  const createTransactionFallback = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const payload = hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) };
    const { data, error: insertError } = await supabase.from('Transaction').insert(payload).select().single();
    if (insertError) throw insertError;
    return data as Transaction;
  }, [currency, session]);

  const updateTransactionFallback = useCallback(async (id: string, tx: Partial<Transaction>) => {
    const payload = tx.amount != null
      ? (hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) })
      : tx;
    const { data, error: updateError } = await supabase.from('Transaction').update(payload).eq('id', id).select().single();
    if (updateError) throw updateError;
    return data as Transaction;
  }, [currency, session]);

  const deleteTransactionFallback = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('Transaction').delete().eq('id', id);
    if (deleteError) throw deleteError;
  }, []);

  const createTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const payload = hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) };
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticTx: Transaction = {
      ...(payload as Omit<Transaction, 'id' | 'createdAt'>),
      id: optimisticId,
      createdAt: new Date().toISOString(),
    };

    setTransactions((current) => sortTransactionsByDate([optimisticTx, ...current.filter((item) => item.id !== optimisticId)]));

    const syncMode = await getSyncMode();
    if (syncMode === 'manual') {
      await enqueue({ type: 'create', payload, tempId: optimisticId });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }

    try {
      const savedTx = await createTransactionFallback(payload);
      setTransactions((current) => sortTransactionsByDate(current.map((item) => item.id === optimisticId ? savedTx : item)));
      return true;
    } catch {
      await enqueue({ type: 'create', payload, tempId: optimisticId });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [createTransactionFallback, currency, session]);

  const updateTransaction = useCallback(async (id: string, tx: Partial<Transaction>) => {
    const payload = tx.amount != null
      ? (hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) })
      : tx;
    let previousTx: Transaction | undefined;

    setTransactions((current) => current.map((item) => {
      if (item.id !== id) return item;
      previousTx = item;
      return { ...item, ...payload };
    }));

    if (!previousTx) return false;

    const syncMode = await getSyncMode();

    if (syncMode === 'manual' || isTempTransactionId(id)) {
      await enqueue({ type: 'update', txId: id, patchPayload: payload });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }

    try {
      const savedTx = await updateTransactionFallback(id, payload);
      setTransactions((current) => current.map((item) => item.id === id ? savedTx : item));
      return true;
    } catch {
      await enqueue({ type: 'update', txId: id, patchPayload: payload });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [currency, session, updateTransactionFallback]);

  const deleteTransaction = useCallback(async (id: string) => {
    let removedTx: Transaction | undefined;

    setTransactions((current) => {
      removedTx = current.find((item) => item.id === id);
      return current.filter((item) => item.id !== id);
    });

    if (!removedTx) return false;

    const syncMode = await getSyncMode();

    if (syncMode === 'manual' || isTempTransactionId(id)) {
      await enqueue({ type: 'delete', txId: id });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }

    try {
      await deleteTransactionFallback(id);
      return true;
    } catch {
      await enqueue({ type: 'delete', txId: id });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [deleteTransactionFallback, session]);

  const filtered = applyFilters(
    transactions.map((tx) => ({ ...tx, amount: getTransactionAmount(tx, currency, snapshot) })),
    filters,
  );

  return {
    transactions, filtered, categories: mergedCategories,
    filters, setFilters, loading, error, refetch,
    createTransaction, updateTransaction, deleteTransaction,
  };
}
