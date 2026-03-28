import { useTransactions } from '../context/TransactionsContext';
import { Transaction, Category, MonthStats } from '../types';
import type { SupportedCurrency } from '../context/AuthContext';

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

export function useDashboardData(webUserId: string | null, currency: SupportedCurrency = 'ARS'): DashboardData {
  const data = useTransactions();

  return {
    transactions: data.transactions,
    categories: data.categories,
    stats: data.stats,
    recentTxs: data.recentTxs,
    loading: data.loading,
    error: data.error,
    refetch: data.refetch,
    createTransaction: data.createTransaction,
    updateTransaction: data.updateTransaction,
    deleteTransaction: data.deleteTransaction,
    syncPendingTransactions: data.syncPendingTransactions,
  };
}
