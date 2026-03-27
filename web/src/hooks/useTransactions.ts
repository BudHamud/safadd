"use client";

import { useState, useMemo, useCallback } from "react";
import React from "react";
import { Transaction, Category } from "../types";
import { normalizeTag } from "@safed/shared/category";
import {
    cacheTransactions,
    getCachedTransactions,
    putCachedTransaction,
    removeCachedTransaction,
    addPendingOp,
    getPendingOpsCount,
    removePendingCreateForTempId,
} from "../lib/db";

type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response>;

export function useTransactions(
    userId: string | null,
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR',
    travelModeStart: string | null,
    authenticatedFetch: AuthenticatedFetch,
    setPendingOpsCount: (count: number) => void,
    catSignal: number,
) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addModalInitialData, setAddModalInitialData] = useState<Partial<Transaction> | null>(null);

    const loadUserTransactions = useCallback(async (uid: string, token?: string | null) => {
        setIsLoadingTransactions(true);
        try {
            const res = await authenticatedFetch('/api/transactions', {}, token);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
                cacheTransactions(uid, data).catch(() => { });
            } else {
                const cached = await getCachedTransactions(uid);
                if (cached.length > 0) setTransactions(cached);
            }
        } catch {
            console.warn('[Offline] Cargando transacciones desde caché local');
            const cached = await getCachedTransactions(uid);
            if (cached.length > 0) setTransactions(cached);
        } finally {
            setIsLoadingTransactions(false);
        }
    }, [authenticatedFetch]);

    const saveTransaction = async (newTx: Transaction) => {
        if (!userId) return;

        if (!navigator.onLine) {
            const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const localTx: Transaction = { ...newTx, id: tempId };
            await putCachedTransaction(userId, localTx);
            await addPendingOp({ opType: 'create', data: localTx, userId, timestamp: Date.now() });
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => [localTx, ...prev]);
            setIsAddModalOpen(false);
            return;
        }

        try {
            const res = await authenticatedFetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTx, userId }),
            });
            if (res.ok) {
                const savedTx = await res.json();
                if (savedTx) {
                    await putCachedTransaction(userId, savedTx);
                    setTransactions(prev => [savedTx, ...prev.filter(Boolean)]);
                }
                setIsAddModalOpen(false);
            }
        } catch (e) { console.error("No se pudo guardar", e); }
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (!userId) return;

        if (txId.startsWith('offline_')) {
            await removeCachedTransaction(txId);
            await removePendingCreateForTempId(txId);
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => prev.filter(t => t.id !== txId));
            return;
        }

        if (!navigator.onLine) {
            await removeCachedTransaction(txId);
            await addPendingOp({ opType: 'delete', data: { id: txId }, userId, timestamp: Date.now() });
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => prev.filter(t => t.id !== txId));
            return;
        }

        try {
            const res = await authenticatedFetch(`/api/transactions?id=${txId}`, { method: 'DELETE' });
            if (res.ok) {
                await removeCachedTransaction(txId);
                setTransactions(prev => prev.filter(t => t.id !== txId));
            }
        } catch (e) { console.error("No se pudo borrar", e); }
    };

    const updateTransaction = async (updatedTx: Transaction) => {
        if (!userId) return;

        await putCachedTransaction(userId, updatedTx);
        setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
        setSelectedTransaction(prev => prev?.id === updatedTx.id ? updatedTx : prev);
    };

    const updateTransactionsCategory = async (oldTag: string, nextTag: string, nextIcon: string) => {
        if (!userId) return;

        const normalizedOldTag = normalizeTag(oldTag);
        let nextTransactions: Transaction[] = [];

        setTransactions(prev => {
            nextTransactions = prev.map(tx =>
                normalizeTag(tx.tag) === normalizedOldTag
                    ? { ...tx, tag: nextTag, icon: nextIcon }
                    : tx
            );
            return nextTransactions;
        });

        setSelectedTransaction(prev =>
            prev && normalizeTag(prev.tag) === normalizedOldTag
                ? { ...prev, tag: nextTag, icon: nextIcon }
                : prev
        );

        await cacheTransactions(userId, nextTransactions);
    };

    const allCategories = useMemo(() => {
        const catMap = new Map<string, Category>();
        const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        transactions.forEach(tx => {
            if (!tx) return;
            if (tx.tag) {
                const label = tx.tag.trim();
                const up = normalize(label);
                if (!catMap.has(up)) {
                    catMap.set(up, {
                        id: `tx-cat-${up.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        label,
                        icon: tx.icon || '📦',
                    });
                }
            }
        });

        if (typeof window !== 'undefined') {
            try {
                const custom = JSON.parse(localStorage.getItem('financeCustomCategories') || '[]');
                custom.forEach((c: any) => {
                    if (c && c.label) {
                        const label = c.label.trim();
                        const up = normalize(label);
                        catMap.set(up, { ...c, label });
                    }
                });
            } catch { }
        }

        return Array.from(catMap.values())
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactions, catSignal]);

    let mappedTransactions = transactions.filter(Boolean).map(t => {
        let val = t.amount;
        if (globalCurrency === 'USD' && t.amountUSD != null) val = t.amountUSD;
        if (globalCurrency === 'ARS' && t.amountARS != null) val = t.amountARS;
        if (globalCurrency === 'EUR' && t.amountEUR != null) val = t.amountEUR;
        if (globalCurrency === 'ILS' && t.amountILS != null) val = t.amountILS;
        return { ...t, amount: val };
    });

    if (travelModeStart) {
        mappedTransactions = mappedTransactions.filter(t => {
            if (t.date === 'Hoy' || t.date === 'Ayer') return true;
            const txDate = t.date.replace(/\//g, '-');
            return txDate >= travelModeStart;
        });
    }

    const totalIncome = mappedTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = mappedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    return {
        transactions, setTransactions, selectedTransaction, setSelectedTransaction,
        isLoadingTransactions,
        isAddModalOpen, setIsAddModalOpen,
        addModalInitialData, setAddModalInitialData,
        loadUserTransactions, saveTransaction, handleDeleteTransaction,
        updateTransaction,
        updateTransactionsCategory,
        allCategories, mappedTransactions, totalIncome, totalExpense, currentBalance,
    };
}
