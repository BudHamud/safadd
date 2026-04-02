import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadCustomCategories, loadHiddenCategories, mergeCategories } from '../lib/category-storage';
import { loadTransactionCache, saveTransactionCache } from '../lib/transaction-cache';
import {
  applyQueueToTransactions,
  dequeue,
  enqueue,
  getQueue,
  getSyncMode,
  isTempTransactionId,
  recordSyncHistory,
} from '../lib/offlineQueue';
import { buildStoredAmounts, getCachedExchangeRateSnapshot, getTransactionAmount } from '../lib/currency';
import type { ExchangeRateSnapshot } from '../lib/currency';
import type { SupportedCurrency } from './AuthContext';
import { useAuth } from './AuthContext';
import { parseDateValue } from '../lib/locale';
import type { Category, CategoryStat, MonthStats, Transaction } from '../types';

type TransactionsContextValue = {
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
  syncPendingTransactions: () => Promise<{ synced: number; failed: number; lastError?: string | null }>;
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

function hasStoredAmounts(tx: Partial<Transaction>) {
  return tx.amountUSD != null || tx.amountARS != null || tx.amountILS != null || tx.amountEUR != null;
}

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Sync failed';
}

function generateUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

async function resolveActiveSupabaseSession(preferredSession: Session | null) {
  const { data: { session: storedSession } } = await supabase.auth.getSession();
  const baseSession = preferredSession ?? storedSession ?? null;

  if (baseSession?.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: baseSession.refresh_token });
    if (!error && data.session?.access_token) {
      return data.session;
    }
  }

  if (baseSession?.access_token) {
    return baseSession;
  }

  const { data: { session: latestSession } } = await supabase.auth.getSession();
  return latestSession ?? null;
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

function makeCategory(tag: string, icon: string): Category {
  return { name: tag, icon, color: tagColor(tag) };
}

function buildStats(txs: Transaction[], currency: SupportedCurrency, snapshot: ExchangeRateSnapshot | null): MonthStats {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const monthTxs = txs.filter((tx) => {
    const date = parseDateValue(tx.date);
    return date.getMonth() === curMonth && date.getFullYear() === curYear && !tx.isCancelled && !tx.excludeFromBudget;
  });

  const totalIncome = monthTxs
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + getTransactionAmount(tx, currency, snapshot), 0);
  const totalExpense = monthTxs
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + getTransactionAmount(tx, currency, snapshot), 0);

  const catTotals: Record<string, { total: number; count: number; icon: string }> = {};
  monthTxs.filter((tx) => tx.type === 'expense').forEach((tx) => {
    const key = tx.tag || 'OTROS';
    if (!catTotals[key]) catTotals[key] = { total: 0, count: 0, icon: tx.icon || '❓' };
    catTotals[key].total += getTransactionAmount(tx, currency, snapshot);
    catTotals[key].count += 1;
  });

  const byCategory: CategoryStat[] = Object.entries(catTotals)
    .map(([tag, { total, count, icon }]) => ({
      category: makeCategory(tag, icon),
      total,
      count,
      percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total);

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byCategory };
}

function sortTransactionsByDate(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime());
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { session, webUser, currency, loading: authLoading } = useAuth();
  const [baseTransactions, setBaseTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const userId = webUser?.id ?? null;
  const baseTransactionsRef = useRef<Transaction[]>([]);

  useEffect(() => {
    baseTransactionsRef.current = baseTransactions;
  }, [baseTransactions]);

  const loadCategoryState = useCallback(async () => {
    const [storedCustom, storedHidden] = await Promise.all([loadCustomCategories(), loadHiddenCategories()]);
    setCustomCategories(storedCustom);
    setHiddenCategories(storedHidden);
  }, []);

  const rebuildVisibleTransactions = useCallback(async (nextBase: Transaction[]) => {
    const queue = await getQueue();
    setTransactions(sortTransactionsByDate(applyQueueToTransactions(nextBase, queue)));
  }, []);

  const fetchTransactions = useCallback(async (options?: { useCache?: boolean; silent?: boolean }) => {
    if (!userId) {
      if (authLoading) {
        return;
      }

      setBaseTransactions([]);
      setTransactions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const useCache = options?.useCache ?? true;
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    let cachedBase: Transaction[] | null = null;

    if (useCache) {
      cachedBase = await loadTransactionCache(userId);
      if (cachedBase) {
        setBaseTransactions(cachedBase);
        await rebuildVisibleTransactions(cachedBase);
        if (!silent) {
          setLoading(false);
        }
      }
    }

    try {
      const { data, error: txError } = await supabase
        .from('Transaction')
        .select('*')
        .eq('userId', userId)
        .order('date', { ascending: false })
        .limit(10000);

      if (txError) throw txError;
      const serverTransactions = sortTransactionsByDate((data ?? []) as Transaction[]);
      setBaseTransactions(serverTransactions);
      await saveTransactionCache(userId, serverTransactions);
      await rebuildVisibleTransactions(serverTransactions);
    } catch (fetchError: any) {
      if (!cachedBase) {
        setError(fetchError?.message ?? 'Error cargando transacciones');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [authLoading, rebuildVisibleTransactions, userId]);

  useEffect(() => {
    getCachedExchangeRateSnapshot().then(setSnapshot).catch(() => setSnapshot(null));
  }, []);

  useEffect(() => {
    void loadCategoryState();
  }, [loadCategoryState]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchTransactions({ useCache: true });
  }, [authLoading, fetchTransactions, tick]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tx_saved', () => {
      void loadCategoryState();
      void fetchTransactions({ useCache: false, silent: true });
    });
    return () => sub.remove();
  }, [fetchTransactions, loadCategoryState]);

  const refetch = useCallback(() => setTick((current) => current + 1), []);

  const createTransactionFallback = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const payload = hasStoredAmounts(tx) ? tx : { ...tx, ...(await buildStoredAmounts(tx.amount, currency, session)) };
    const insertPayload = { id: generateUuid(), ...payload };
    const { data, error: insertError } = await supabase.from('Transaction').insert(insertPayload).select().single();
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
      const nextBase = sortTransactionsByDate([savedTx, ...baseTransactionsRef.current.filter((item) => item.id !== savedTx.id)]);
      setBaseTransactions(nextBase);
      setTransactions((current) => sortTransactionsByDate(current.map((item) => item.id === optimisticId ? savedTx : item)));
      if (userId) {
        await saveTransactionCache(userId, nextBase);
      }
      return true;
    } catch {
      await enqueue({ type: 'create', payload, tempId: optimisticId });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [createTransactionFallback, currency, session, userId]);

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
      const nextBase = baseTransactionsRef.current.map((item) => item.id === id ? savedTx : item);
      setBaseTransactions(nextBase);
      setTransactions((current) => current.map((item) => item.id === id ? savedTx : item));
      if (userId) {
        await saveTransactionCache(userId, nextBase);
      }
      return true;
    } catch {
      await enqueue({ type: 'update', txId: id, patchPayload: payload });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [currency, session, updateTransactionFallback, userId]);

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
      const nextBase = baseTransactionsRef.current.filter((item) => item.id !== id);
      setBaseTransactions(nextBase);
      if (userId) {
        await saveTransactionCache(userId, nextBase);
      }
      return true;
    } catch {
      await enqueue({ type: 'delete', txId: id });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }
  }, [deleteTransactionFallback, userId]);

  const syncPendingTransactions = useCallback(async (): Promise<{ synced: number; failed: number; lastError?: string | null }> => {
    const queue = await getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, lastError: null };
    }

    const activeSession = await resolveActiveSupabaseSession(session);
    if (!activeSession?.access_token) {
      const lastError = 'Your session expired. Sign in again before syncing pending changes.';
      await recordSyncHistory({ synced: 0, failed: queue.length });
      DeviceEventEmitter.emit('tx_saved');
      return { synced: 0, failed: queue.length, lastError };
    }

    let synced = 0;
    let failed = 0;
    let lastError: string | null = null;

    for (const entry of queue) {
      try {
        if (entry.type === 'create' && entry.payload) {
          const payloadWithUser = entry.payload.userId
            ? entry.payload
            : userId
              ? { ...entry.payload, userId }
              : entry.payload;

          if (!payloadWithUser.userId) {
            throw new Error('Missing local user mapping for offline transaction');
          }

          const payload = hasStoredAmounts(payloadWithUser)
            ? payloadWithUser
            : { ...payloadWithUser, ...(await buildStoredAmounts(payloadWithUser.amount, currency, activeSession)) };
          const insertPayload = { id: generateUuid(), ...payload };
          const { error: insertError } = await supabase.from('Transaction').insert(insertPayload);
          if (insertError) throw insertError;
        } else if (entry.type === 'update' && entry.txId && entry.patchPayload) {
          if (isTempTransactionId(entry.txId)) {
            await dequeue(entry.id);
            synced += 1;
            continue;
          }

          const payload = entry.patchPayload.amount != null
            ? (hasStoredAmounts(entry.patchPayload)
              ? entry.patchPayload
              : { ...entry.patchPayload, ...(await buildStoredAmounts(entry.patchPayload.amount, currency, activeSession)) })
            : entry.patchPayload;
          const { error: updateError } = await supabase.from('Transaction').update(payload).eq('id', entry.txId);
          if (updateError) throw updateError;
        } else if (entry.type === 'delete' && entry.txId) {
          if (isTempTransactionId(entry.txId)) {
            await dequeue(entry.id);
            synced += 1;
            continue;
          }

          const { error: deleteError } = await supabase.from('Transaction').delete().eq('id', entry.txId);
          if (deleteError) throw deleteError;
        } else {
          await dequeue(entry.id);
          synced += 1;
          continue;
        }

        await dequeue(entry.id);
        synced += 1;
      } catch (syncError) {
        failed += 1;
        if (!lastError) {
          lastError = getSyncErrorMessage(syncError);
        }
      }
    }

    if (synced > 0 || failed > 0) {
      await recordSyncHistory({ synced, failed });
    }

    await fetchTransactions({ useCache: false, silent: true });
    DeviceEventEmitter.emit('tx_saved');
    return { synced, failed, lastError };
  }, [currency, fetchTransactions, session, userId]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const derived: Category[] = [];
    for (const tx of transactions) {
      if (tx.tag && !seen.has(tx.tag)) {
        seen.add(tx.tag);
        derived.push(makeCategory(tx.tag, tx.icon));
      }
    }
    return mergeCategories(derived, customCategories, hiddenCategories);
  }, [customCategories, hiddenCategories, transactions]);

  const mappedTransactions = useMemo(
    () => transactions.map((tx) => ({ ...tx, amount: getTransactionAmount(tx, currency, snapshot) })),
    [currency, snapshot, transactions],
  );
  const stats = useMemo(() => buildStats(transactions, currency, snapshot), [currency, snapshot, transactions]);
  const recentTxs = useMemo(
    () => [...mappedTransactions]
      .sort((left, right) => parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime())
      .slice(0, 7),
    [mappedTransactions],
  );

  const value = useMemo<TransactionsContextValue>(() => ({
    transactions: mappedTransactions,
    categories,
    stats,
    recentTxs,
    loading,
    error,
    refetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    syncPendingTransactions,
  }), [
    mappedTransactions,
    categories,
    stats,
    recentTxs,
    loading,
    error,
    refetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    syncPendingTransactions,
  ]);

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error('useTransactions must be used inside TransactionsProvider');
  return context;
}