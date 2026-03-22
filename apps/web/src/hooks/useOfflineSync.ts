"use client";

import { useState, useEffect } from "react";
import { Transaction } from "../types";
import {
    removeCachedTransaction,
    putCachedTransaction,
    addPendingOp,
    getPendingOps,
    removePendingOp,
    getPendingOpsCount,
} from "../lib/db";

type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response>;

export function useOfflineSync(userId: string | null, authenticatedFetch: AuthenticatedFetch) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingOpsCount, setPendingOpsCount] = useState(0);

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    useEffect(() => {
        if (userId) {
            getPendingOpsCount(userId).then(setPendingOpsCount);
        }
    }, [userId]);

    const syncNow = async (): Promise<{ synced: number; failed: number }> => {
        if (!userId) return { synced: 0, failed: 0 };
        const ops = await getPendingOps(userId);
        let synced = 0;
        let failed = 0;
        const idReplacements: Record<string, Transaction> = {};
        const deletedIds: string[] = [];

        for (const op of ops) {
            try {
                if (op.opType === 'create') {
                    const res = await authenticatedFetch('/api/transactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...op.data, userId }),
                    });
                    if (res.ok) {
                        const serverTx: Transaction = await res.json();
                        await removeCachedTransaction(op.data.id);
                        await putCachedTransaction(userId, serverTx);
                        idReplacements[op.data.id] = serverTx;
                        await removePendingOp(op.localId!);
                        synced++;
                    } else { failed++; }
                } else if (op.opType === 'delete') {
                    const res = await authenticatedFetch(`/api/transactions?id=${op.data.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        await removeCachedTransaction(op.data.id);
                        deletedIds.push(op.data.id);
                        await removePendingOp(op.localId!);
                        synced++;
                    } else { failed++; }
                }
            } catch { failed++; }
        }

        const newCount = await getPendingOpsCount(userId);
        setPendingOpsCount(newCount);
        return { synced, failed, idReplacements, deletedIds } as any;
    };

    return { isOnline, pendingOpsCount, setPendingOpsCount, syncNow };
}
