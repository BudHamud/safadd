/**
 * offlineQueue — local transaction queue for offline-first support.
 *
 * Transactions are serialised to AsyncStorage under QUEUE_KEY.
 * The sync mode (auto | manual) is stored separately under SYNC_MODE_KEY.
 *
 * auto  — default; transactions are saved to the server immediately.
 *         If both network paths fail the entry is added to the queue
 *         and retried automatically on the next successful connection.
 * manual — transactions are ONLY saved locally and queued. The user
 *          must explicitly tap "Sync now" to upload them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '../types';

const QUEUE_KEY = 'safadd_offline_queue';
const SYNC_MODE_KEY = 'safadd_sync_mode';
const HISTORY_KEY = 'safadd_offline_history';

export type SyncMode = 'auto' | 'manual';

export type QueueEntryType = 'create' | 'update' | 'delete';

export interface QueueEntry {
  /** Unique entry ID (not the transaction ID). */
  id: string;
  type: QueueEntryType;
  /** For 'create': the transaction payload (without a real DB id). */
  payload?: Omit<Transaction, 'id' | 'createdAt'>;
  /** For 'update': partial fields to apply. */
  patchPayload?: Partial<Transaction>;
  /** For 'delete': the real or temp transaction ID to remove. */
  txId?: string;
  /** Optimistic/local ID assigned when the entry was created. Used to replace temp IDs after sync. */
  tempId?: string;
  timestamp: number;
}

export type OfflineHistoryEntryType = QueueEntryType | 'sync';

export interface OfflineHistoryEntry {
  id: string;
  type: OfflineHistoryEntryType;
  timestamp: number;
  txId?: string;
  tempId?: string;
  desc?: string;
  amount?: number | null;
  synced?: number;
  failed?: number;
}

function getCreateKey(entry: QueueEntry) {
  return entry.tempId ?? entry.id;
}

function isTempTransactionId(id: string) {
  return id.startsWith('temp-');
}

function mergeCreatePayload(
  payload: Omit<Transaction, 'id' | 'createdAt'>,
  patch: Partial<Transaction>,
): Omit<Transaction, 'id' | 'createdAt'> {
  return { ...payload, ...patch };
}

export function normalizeQueue(entries: QueueEntry[]): QueueEntry[] {
  const next: QueueEntry[] = [];

  for (const entry of entries) {
    if (entry.type === 'create' && entry.payload) {
      const key = getCreateKey(entry);
      const filtered = next.filter((candidate) => !(candidate.type === 'create' && getCreateKey(candidate) === key));
      next.length = 0;
      next.push(...filtered, { ...entry, tempId: key });
      continue;
    }

    if (entry.type === 'update' && entry.txId && entry.patchPayload) {
      const key = entry.txId;
      const createIndex = next.findIndex((candidate) => candidate.type === 'create' && getCreateKey(candidate) === key);
      if (createIndex >= 0) {
        const createEntry = next[createIndex];
        next[createIndex] = {
          ...createEntry,
          payload: mergeCreatePayload(createEntry.payload!, entry.patchPayload),
          timestamp: entry.timestamp,
        };
        continue;
      }

      const deleteExists = next.some((candidate) => candidate.type === 'delete' && candidate.txId === key);
      if (deleteExists) {
        continue;
      }

      const updateIndex = next.findIndex((candidate) => candidate.type === 'update' && candidate.txId === key);
      if (updateIndex >= 0) {
        const updateEntry = next[updateIndex];
        next[updateIndex] = {
          ...updateEntry,
          patchPayload: { ...updateEntry.patchPayload, ...entry.patchPayload },
          timestamp: entry.timestamp,
        };
        continue;
      }

      next.push(entry);
      continue;
    }

    if (entry.type === 'delete' && entry.txId) {
      const key = entry.txId;
      const createIndex = next.findIndex((candidate) => candidate.type === 'create' && getCreateKey(candidate) === key);
      if (createIndex >= 0) {
        const filtered = next.filter((candidate, index) => {
          if (index === createIndex) return false;
          return !(candidate.type === 'update' && candidate.txId === key);
        });
        next.length = 0;
        next.push(...filtered);
        continue;
      }

      const filtered = next.filter((candidate) => {
        if (candidate.type === 'update' && candidate.txId === key) return false;
        if (candidate.type === 'delete' && candidate.txId === key) return false;
        return true;
      });
      next.length = 0;
      next.push(...filtered, entry);
    }
  }

  return next;
}

async function getHistory(): Promise<OfflineHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineHistoryEntry[];
  } catch {
    return [];
  }
}

async function saveHistory(entries: OfflineHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 100)));
}

async function appendHistory(entry: OfflineHistoryEntry): Promise<void> {
  const history = await getHistory();
  await saveHistory([entry, ...history]);
}

// ── Queue helpers ──────────────────────────────────────────────────────────────

export async function getQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueEntry[];
    const normalized = normalizeQueue(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await saveQueue(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

async function saveQueue(entries: QueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

export async function enqueue(entry: Omit<QueueEntry, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getQueue();
  const newEntry: QueueEntry = {
    ...entry,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  await saveQueue(normalizeQueue([...queue, newEntry]));
  await appendHistory({
    id: `h-${newEntry.id}`,
    type: newEntry.type,
    timestamp: newEntry.timestamp,
    txId: newEntry.txId,
    tempId: newEntry.tempId,
    desc: newEntry.payload?.desc ?? newEntry.patchPayload?.desc,
    amount: newEntry.payload?.amount ?? newEntry.patchPayload?.amount ?? null,
  });
}

export async function dequeue(entryId: string): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter((e) => e.id !== entryId));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function getOfflineHistory(): Promise<OfflineHistoryEntry[]> {
  return getHistory();
}

export async function recordSyncHistory(result: { synced: number; failed: number }): Promise<void> {
  await appendHistory({
    id: `h-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'sync',
    timestamp: Date.now(),
    synced: result.synced,
    failed: result.failed,
  });
}

export function applyQueueToTransactions(transactions: Transaction[], queue: QueueEntry[]): Transaction[] {
  const next = [...transactions];
  const normalizedQueue = normalizeQueue(queue);

  for (const entry of normalizedQueue) {
    if (entry.type === 'create' && entry.payload) {
      const pendingTx: Transaction = {
        ...(entry.payload as Omit<Transaction, 'id' | 'createdAt'>),
        id: entry.tempId ?? entry.id,
        createdAt: new Date(entry.timestamp).toISOString(),
      };
      const index = next.findIndex((item) => item.id === pendingTx.id);
      if (index >= 0) {
        next[index] = pendingTx;
      } else {
        next.push(pendingTx);
      }
      continue;
    }

    if (entry.type === 'update' && entry.txId && entry.patchPayload) {
      const index = next.findIndex((item) => item.id === entry.txId);
      if (index >= 0) {
        next[index] = { ...next[index], ...entry.patchPayload };
      }
      continue;
    }

    if (entry.type === 'delete' && entry.txId) {
      const index = next.findIndex((item) => item.id === entry.txId);
      if (index >= 0) {
        next.splice(index, 1);
      }
    }
  }

  return next;
}

// ── Sync mode ─────────────────────────────────────────────────────────────────

export async function getSyncMode(): Promise<SyncMode> {
  try {
    const value = await AsyncStorage.getItem(SYNC_MODE_KEY);
    return value === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

export async function setSyncMode(mode: SyncMode): Promise<void> {
  await AsyncStorage.setItem(SYNC_MODE_KEY, mode);
}

export { isTempTransactionId };
