import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '../types';

const CACHE_PREFIX = 'safadd_transactions_cache';

function getCacheKey(userId: string) {
  return `${CACHE_PREFIX}:${userId}`;
}

export async function loadTransactionCache(userId: string): Promise<Transaction[] | null> {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transaction[]) : null;
  } catch {
    return null;
  }
}

export async function saveTransactionCache(userId: string, transactions: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(getCacheKey(userId), JSON.stringify(transactions));
}

export async function clearTransactionCache(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getCacheKey(userId));
}