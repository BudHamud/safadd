import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadCustomCategories, loadHiddenCategories, mergeCategories } from '../lib/category-storage';
import { Transaction, Category, MonthStats, CategoryStat } from '../types';
import type { SupportedCurrency } from '../context/AuthContext';
import { buildStoredAmounts, getTransactionAmount, getCachedExchangeRateSnapshot } from '../lib/currency';
import type { ExchangeRateSnapshot } from '../lib/currency';
import { parseDateValue } from '../lib/locale';
import {
  getQueue,
  enqueue,
  dequeue,
  getSyncMode,
  applyQueueToTransactions,
  isTempTransactionId,
  recordSyncHistory,
} from '../lib/offlineQueue';

import { useAuth } from '../context/AuthContext';

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
  syncPendingTransactions: () => Promise<{ synced: number; failed: number; lastError?: string | null }>;
}

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

function buildStats(txs: Transaction[], currency: SupportedCurrency, snapshot: ExchangeRateSnapshot | null): MonthStats {
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const monthTxs = txs.filter(t => {
    const d = parseDateValue(t.date);
    return d.getMonth() === curMonth && d.getFullYear() === curYear && !t.isCancelled && !t.excludeFromBudget;
  });

  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + getTransactionAmount(t, currency, snapshot), 0);
  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + getTransactionAmount(t, currency, snapshot), 0);

  const catTotals: Record<string, { total: number; count: number; icon: string }> = {};
  monthTxs.filter(t => t.type === 'expense').forEach(t => {
    const key = t.tag || 'OTROS';
    if (!catTotals[key]) catTotals[key] = { total: 0, count: 0, icon: t.icon || '❓' };
    catTotals[key].total += getTransactionAmount(t, currency, snapshot);
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

function sortTransactionsByDate(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime());
}

export function useDashboardData(webUserId: string | null, currency: SupportedCurrency = 'ARS'): DashboardData {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  // Load cached snapshot for extended currency conversions (non-stored columns)
  useEffect(() => {
    getCachedExchangeRateSnapshot().then(setSnapshot).catch(() => setSnapshot(null));
  }, []);

  const refetch = useCallback(() => setTick(t => t + 1), []);

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

    // Manual mode — skip network, queue immediately for later sync
    if (syncMode === 'manual') {
      await enqueue({ type: 'create', payload, tempId: optimisticId });
      DeviceEventEmitter.emit('tx_saved');
      return true;
    }

    // Auto mode — save directly to Supabase; on failure, queue and keep visible.
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
            : webUserId
              ? { ...entry.payload, userId: webUserId }
              : entry.payload;

          if (!payloadWithUser.userId) {
            throw new Error('Missing local user mapping for offline transaction');
          }

          const p = hasStoredAmounts(payloadWithUser)
            ? payloadWithUser
            : { ...payloadWithUser, ...(await buildStoredAmounts(payloadWithUser.amount, currency, activeSession)) };

          const insertPayload = { id: generateUuid(), ...p };
          const { data, error: insertError } = await supabase.from('Transaction').insert(insertPayload).select().single();
          if (insertError) throw insertError;
          const savedTx = data as Transaction;

          // Replace temp ID in UI with the real saved transaction
          if (savedTx && entry.tempId) {
            setTransactions((current) =>
              sortTransactionsByDate(current.map((item) => item.id === entry.tempId ? savedTx! : item))
            );
          }
        } else if (entry.type === 'update' && entry.txId && entry.patchPayload) {
          if (isTempTransactionId(entry.txId)) {
            await dequeue(entry.id);
            synced++;
            continue;
          }

          const p = entry.patchPayload.amount != null
            ? (hasStoredAmounts(entry.patchPayload) ? entry.patchPayload : { ...entry.patchPayload, ...(await buildStoredAmounts(entry.patchPayload.amount, currency, activeSession)) })
            : entry.patchPayload;
          const { error: updateError } = await supabase.from('Transaction').update(p).eq('id', entry.txId);
          if (updateError) throw updateError;
        } else if (entry.type === 'delete' && entry.txId) {
          if (isTempTransactionId(entry.txId)) {
            await dequeue(entry.id);
            synced++;
            continue;
          }

          const { error: deleteError } = await supabase.from('Transaction').delete().eq('id', entry.txId);
          if (deleteError) throw deleteError;
        } else {
          await dequeue(entry.id);
          synced++;
          continue;
        }

        await dequeue(entry.id);
        synced++;
      } catch (syncError) {
        failed++;
        if (!lastError) {
          lastError = getSyncErrorMessage(syncError);
        }
      }
    }

    if (synced > 0 || failed > 0) {
      await recordSyncHistory({ synced, failed });
    }

    if (synced > 0) {
      setTick((t) => t + 1);
      DeviceEventEmitter.emit('tx_saved');
    } else if (failed > 0) {
      DeviceEventEmitter.emit('tx_saved');
    }
    return { synced, failed, lastError };
  }, [currency, session, webUserId]);

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
  }, [deleteTransactionFallback]);

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
            .limit(10000),
          getQueue(),
        ]);

        const { data, error: txError } = txResult;

        if (txError) throw txError;
        setTransactions(sortTransactionsByDate(applyQueueToTransactions((data ?? []) as Transaction[], queue)));
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
  const mappedTransactions = transactions.map((tx) => ({ ...tx, amount: getTransactionAmount(tx, currency, snapshot) }));
  const stats = buildStats(transactions, currency, snapshot);
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
    syncPendingTransactions,
  };
}
