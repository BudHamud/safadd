/**
 * db.ts — IndexedDB wrapper para soporte offline en gastos-app.
 * Almacena transacciones en caché y una cola de operaciones pendientes.
 */

import { Transaction } from '../types';

const DB_NAME = 'gastosapp_v1';
const DB_VERSION = 1;

export type PendingOp = {
    localId?: number;
    opType: 'create' | 'delete';
    data: any; // Transaction para 'create', { id: string } para 'delete'
    userId: string;
    timestamp: number;
};

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('transactions')) {
                const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
                txStore.createIndex('userId', 'userId', { unique: false });
            }
            if (!db.objectStoreNames.contains('pending_ops')) {
                const opsStore = db.createObjectStore('pending_ops', { keyPath: 'localId', autoIncrement: true });
                opsStore.createIndex('userId', 'userId', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Reemplaza toda la caché de transacciones de un usuario */
export async function cacheTransactions(userId: string, transactions: Transaction[]): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        const index = store.index('userId');

        // Obtener IDs existentes de este usuario para borrarlos
        const existingKeys: IDBValidKey[] = await new Promise((res, rej) => {
            const req = index.getAllKeys(IDBKeyRange.only(userId));
            req.onsuccess = () => res(req.result as IDBValidKey[]);
            req.onerror = () => rej(req.error);
        });
        for (const key of existingKeys) store.delete(key);

        // Insertar el nuevo conjunto
        for (const t of transactions) store.put({ ...t, userId });

        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] cacheTransactions:', e);
    }
}

/** Devuelve las transacciones en caché del usuario */
export async function getCachedTransactions(userId: string): Promise<Transaction[]> {
    if (typeof indexedDB === 'undefined') return [];
    try {
        const db = await openDB();
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('userId');
        return await new Promise<Transaction[]>((res, rej) => {
            const req = index.getAll(IDBKeyRange.only(userId));
            req.onsuccess = () => { db.close(); res(req.result as Transaction[]); };
            req.onerror = () => rej(req.error);
        });
    } catch (e) {
        console.warn('[DB] getCachedTransactions:', e);
        return [];
    }
}

/** Agrega o actualiza una transacción en la caché */
export async function putCachedTransaction(userId: string, t: Transaction): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('transactions', 'readwrite');
        tx.objectStore('transactions').put({ ...t, userId });
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] putCachedTransaction:', e);
    }
}

/** Elimina una transacción de la caché por ID */
export async function removeCachedTransaction(id: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('transactions', 'readwrite');
        tx.objectStore('transactions').delete(id);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] removeCachedTransaction:', e);
    }
}

/** Agrega una operación a la cola de pendientes */
export async function addPendingOp(op: Omit<PendingOp, 'localId'>): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('pending_ops', 'readwrite');
        tx.objectStore('pending_ops').add(op);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] addPendingOp:', e);
    }
}

/** Devuelve todas las operaciones pendientes de un usuario */
export async function getPendingOps(userId: string): Promise<PendingOp[]> {
    if (typeof indexedDB === 'undefined') return [];
    try {
        const db = await openDB();
        const tx = db.transaction('pending_ops', 'readonly');
        const index = tx.objectStore('pending_ops').index('userId');
        return await new Promise<PendingOp[]>((res, rej) => {
            const req = index.getAll(IDBKeyRange.only(userId));
            req.onsuccess = () => { db.close(); res(req.result as PendingOp[]); };
            req.onerror = () => rej(req.error);
        });
    } catch (e) {
        console.warn('[DB] getPendingOps:', e);
        return [];
    }
}

/** Elimina una operación pendiente por su localId */
export async function removePendingOp(localId: number): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('pending_ops', 'readwrite');
        tx.objectStore('pending_ops').delete(localId);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] removePendingOp:', e);
    }
}

/** Elimina todos los pending_ops de un create con un tempId específico */
export async function removePendingCreateForTempId(tempId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const db = await openDB();
        const tx = db.transaction('pending_ops', 'readwrite');
        const store = tx.objectStore('pending_ops');
        const allOps: PendingOp[] = await new Promise((res, rej) => {
            const req = store.getAll();
            req.onsuccess = () => res(req.result as PendingOp[]);
            req.onerror = () => rej(req.error);
        });
        for (const op of allOps) {
            if (op.opType === 'create' && op.data?.id === tempId) {
                store.delete(op.localId!);
            }
        }
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn('[DB] removePendingCreateForTempId:', e);
    }
}

/** Devuelve la cantidad de operaciones pendientes de un usuario */
export async function getPendingOpsCount(userId: string): Promise<number> {
    const ops = await getPendingOps(userId);
    return ops.length;
}
