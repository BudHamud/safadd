"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Transaction, Category } from "../types";
import { WidgetColors } from "../lib/colorSystem";
import { useAuthSession } from "../hooks/useAuthSession";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useColorSystem } from "../hooks/useColorSystem";
import { useTransactions } from "../hooks/useTransactions";

type GlobalContextType = {
    isClient: boolean;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    userRole: string | null;
    accessToken: string | null;
    userGoal: number;
    theme: string;
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR';
    transactions: Transaction[];
    mappedTransactions: Transaction[];
    selectedTransaction: Transaction | null;
    travelModeStart: string | null;
    allCategories: Category[];
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
    savingsTarget: number;
    isLoadingTransactions: boolean;

    // Offline
    isOnline: boolean;
    pendingOpsCount: number;
    syncNow: () => Promise<{ synced: number; failed: number }>;

    // Colores
    customColors: Record<string, string>;
    setCustomColor: (variable: string, color: string) => void;
    resetCustomColors: () => void;
    isColorMode: boolean;
    setIsColorMode: (v: boolean) => void;
    activeColorZone: string | null;
    setActiveColorZone: (zone: string | null) => void;
    widgetColors: WidgetColors;
    setWidgetColor: (zone: string, variable: string, color: string) => void;
    resetWidgetColors: (zone?: string) => void;
    applyColorPreset: (presetId: string) => void;

    setTheme: (t: string) => void;
    toggleTheme: () => void;
    handleLogin: (uid: string, un: string, token?: string, refreshToken?: string) => void;
    handleLogout: () => void;
    handleCurrencyChange: (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => void;
    toggleTravelMode: () => Promise<void>;
    saveTransaction: (tx: Transaction) => Promise<void>;
    updateTransaction: (tx: Transaction) => Promise<void>;
    updateTransactionsCategory: (oldTag: string, nextTag: string, nextIcon: string) => Promise<void>;
    handleDeleteTransaction: (id: string) => Promise<void>;
    setSelectedTransaction: (tx: Transaction | null) => void;
    loadUserData: (uid: string) => void;
    loadUserTransactions: (uid: string) => void;
    authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response>;
    setCatSignal: React.Dispatch<React.SetStateAction<number>>;

    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    addModalInitialData: Partial<Transaction> | null;
    setAddModalInitialData: (data: Partial<Transaction> | null) => void;
};

const AppContext = createContext<GlobalContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState("dark");
    const [globalCurrency, setGlobalCurrency] = useState<'ILS' | 'USD' | 'ARS' | 'EUR'>('ILS');
    const [travelModeStart, setTravelModeStart] = useState<string | null>(null);
    const [catSignal, setCatSignal] = useState(0);
    const savingsTarget = 200;
    const colorSystem = useColorSystem(theme, setTheme);

    const auth = useAuthSession();

    const offline = useOfflineSync(auth.userId, auth.authenticatedFetch);

    const txs = useTransactions(
        auth.userId,
        globalCurrency,
        travelModeStart,
        auth.authenticatedFetch,
        offline.setPendingOpsCount,
        catSignal,
    );

    useEffect(() => {
        if (!auth.userId) return;
        txs.loadUserTransactions(auth.userId, auth.accessToken);
        // Intentionally keyed to auth state only to avoid refetch loops caused by callback identity churn.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.accessToken, auth.userId]);

    // Llamar loadUserData en auth (incluye carga de transacciones + datos de usuario)
    const loadUserData = (uid: string, token?: string | null) => {
        auth.loadUserData(uid, token);
        txs.loadUserTransactions(uid, token ?? auth.accessToken);
    };

    // Initialize theme, currency and travel mode from localStorage
    useEffect(() => {
        const storedTheme = localStorage.getItem("app-theme") || "dark";
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);

        const storedCurrency = localStorage.getItem("app-currency") as 'ILS' | 'USD' | 'ARS' | 'EUR';
        if (storedCurrency) setGlobalCurrency(storedCurrency);

        localStorage.removeItem('financeTravelModeStart');
        setTravelModeStart(null);
        document.documentElement.removeAttribute('data-travel');
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem("app-theme", nextTheme);
    };

    const handleCurrencyChange = (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => {
        setGlobalCurrency(curr);
        localStorage.setItem("app-currency", curr);
    };

    const toggleTravelMode = async () => {
        localStorage.removeItem('financeTravelModeStart');
        setTravelModeStart(null);
        document.documentElement.removeAttribute('data-travel');
    };

    // Wrap syncNow to also update transactions in state after sync
    const syncNow = async (): Promise<{ synced: number; failed: number }> => {
        const result = await offline.syncNow() as any;
        if (result.idReplacements || result.deletedIds) {
            txs.setTransactions(prev => {
                let r = prev.map((t: Transaction) => result.idReplacements?.[t.id] ?? t);
                r = r.filter((t: Transaction) => !result.deletedIds?.includes(t.id));
                return r;
            });
        }
        return { synced: result.synced, failed: result.failed };
    };

    const handleLogin = (uid: string, un: string, token?: string, refreshToken?: string) => {
        auth.handleLogin(uid, un, token, refreshToken);
        loadUserData(uid, token);
    };

    return (
        <AppContext.Provider value={{
            isClient: auth.isClient,
            userId: auth.userId,
            userName: auth.userName,
            userEmail: auth.userEmail,
            userRole: auth.userRole,
            accessToken: auth.accessToken,
            userGoal: auth.userGoal,
            theme, setTheme, globalCurrency,
            transactions: txs.transactions,
            mappedTransactions: txs.mappedTransactions,
            selectedTransaction: txs.selectedTransaction,
            travelModeStart,
            allCategories: txs.allCategories,
            totalIncome: txs.totalIncome,
            totalExpense: txs.totalExpense,
            currentBalance: txs.currentBalance,
            savingsTarget,
            isLoadingTransactions: txs.isLoadingTransactions,
            isOnline: offline.isOnline,
            pendingOpsCount: offline.pendingOpsCount,
            syncNow,
            ...colorSystem,
            toggleTheme,
            handleLogin,
            handleLogout: auth.handleLogout,
            handleCurrencyChange,
            toggleTravelMode,
            saveTransaction: txs.saveTransaction,
            updateTransaction: txs.updateTransaction,
            updateTransactionsCategory: txs.updateTransactionsCategory,
            handleDeleteTransaction: txs.handleDeleteTransaction,
            setSelectedTransaction: txs.setSelectedTransaction,
            loadUserData,
            loadUserTransactions: txs.loadUserTransactions,
            authenticatedFetch: auth.authenticatedFetch,
            setCatSignal,
            isAddModalOpen: txs.isAddModalOpen,
            setIsAddModalOpen: txs.setIsAddModalOpen,
            addModalInitialData: txs.addModalInitialData,
            setAddModalInitialData: txs.setAddModalInitialData,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};
