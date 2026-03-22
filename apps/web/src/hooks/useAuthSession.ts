"use client";

import { useState, useEffect, useRef } from "react";

export type AuthSession = {
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    userGoal: number;
    accessToken: string | null;
    isClient: boolean;
    handleLogin: (uid: string, un: string, token?: string, refreshToken?: string) => void;
    handleLogout: () => void;
    loadUserData: (uid: string, token?: string | null) => void;
    authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response>;
    setUserGoal: React.Dispatch<React.SetStateAction<number>>;
    setUserEmail: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAuthSession(
    loadUserDataCallback?: (uid: string, token?: string | null) => void
): AuthSession {
    const [isClient, setIsClient] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userGoal, setUserGoal] = useState<number>(0);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const refreshRequestRef = useRef<Promise<string | null> | null>(null);

    const getStoredAccessToken = () => {
        if (typeof window === 'undefined') return accessToken;
        return localStorage.getItem("financeAccessToken") || accessToken;
    };

    const getStoredRefreshToken = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem("financeRefreshToken");
    };

    const persistSessionTokens = (nextAccessToken: string | null, nextRefreshToken?: string | null) => {
        setAccessToken(nextAccessToken);
        if (typeof window === 'undefined') return;
        if (nextAccessToken) localStorage.setItem("financeAccessToken", nextAccessToken);
        else localStorage.removeItem("financeAccessToken");
        if (nextRefreshToken !== undefined) {
            if (nextRefreshToken) localStorage.setItem("financeRefreshToken", nextRefreshToken);
            else localStorage.removeItem("financeRefreshToken");
        }
    };

    const clearPersistedSession = () => {
        setUserId(null);
        setUserName(null);
        setUserEmail(null);
        setAccessToken(null);
        setUserGoal(0);
        localStorage.removeItem("financeUserId");
        localStorage.removeItem("financeUserName");
        localStorage.removeItem("financeUserEmail");
        localStorage.removeItem("financeAccessToken");
        localStorage.removeItem("financeRefreshToken");
        localStorage.removeItem("monthlyGoal");
    };

    const getTokenExpiryTime = (token: string) => {
        try {
            const payload = token.split('.')[1];
            if (!payload) return null;
            const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = JSON.parse(window.atob(normalized));
            return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
        } catch { return null; }
    };

    const refreshAccessToken = async (): Promise<string | null> => {
        if (refreshRequestRef.current) return refreshRequestRef.current;
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) return null;
        refreshRequestRef.current = (async () => {
            try {
                const res = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });
                if (!res.ok) { clearPersistedSession(); return null; }
                const data = await res.json();
                if (!data?.access_token) { clearPersistedSession(); return null; }
                persistSessionTokens(data.access_token, data.refresh_token ?? refreshToken);
                return data.access_token as string;
            } catch (error) {
                console.error('No se pudo refrescar la sesión', error);
                return null;
            } finally {
                refreshRequestRef.current = null;
            }
        })();
        return refreshRequestRef.current;
    };

    const authenticatedFetch = async (
        input: RequestInfo | URL,
        init: RequestInit = {},
        preferredToken?: string | null,
    ) => {
        const buildHeaders = (token?: string | null) => {
            const headers = new Headers(init.headers ?? {});
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        };
        const firstToken = preferredToken ?? getStoredAccessToken();
        let response = await fetch(input, { ...init, headers: buildHeaders(firstToken) });
        if (response.status !== 401) return response;
        const nextToken = await refreshAccessToken();
        if (!nextToken) { clearPersistedSession(); return response; }
        response = await fetch(input, { ...init, headers: buildHeaders(nextToken) });
        if (response.status === 401) clearPersistedSession();
        return response;
    };

    const loadUserData = async (uid: string, token?: string | null) => {
        loadUserDataCallback?.(uid, token);
        try {
            const res = await authenticatedFetch('/api/user', {}, token);
            if (res.ok) {
                const data = await res.json();
                const nextGoal = Number(data.monthlyGoal ?? 0);
                const safeGoal = Number.isFinite(nextGoal) ? nextGoal : 0;
                setUserGoal(safeGoal);
                setUserEmail(typeof data.email === 'string' ? data.email : null);
                localStorage.setItem('monthlyGoal', String(safeGoal));
                if (typeof data.email === 'string') localStorage.setItem('financeUserEmail', data.email);
                else localStorage.removeItem('financeUserEmail');
            }
        } catch (e) { console.error(e); }
    };

    const handleLogin = (uid: string, un: string, token?: string, refreshToken?: string) => {
        setUserId(uid);
        setUserName(un);
        setUserEmail(null);
        persistSessionTokens(token ?? null, refreshToken ?? null);
        localStorage.setItem("financeUserId", uid);
        localStorage.setItem("financeUserName", un);
    };

    const handleLogout = () => { clearPersistedSession(); };

    // Bootstrap session on mount
    useEffect(() => {
        setIsClient(true);
        const bootstrapSession = async () => {
            const storedUserId = localStorage.getItem("financeUserId");
            const storedUserName = localStorage.getItem("financeUserName");
            const storedUserEmail = localStorage.getItem("financeUserEmail");
            const storedToken = localStorage.getItem("financeAccessToken");
            const storedRefreshToken = localStorage.getItem("financeRefreshToken");

            if (storedUserId && storedUserName && (storedToken || storedRefreshToken)) {
                setUserId(storedUserId);
                setUserName(storedUserName);
                setUserEmail(storedUserEmail || null);
                const tokenExpiresAt = storedToken ? getTokenExpiryTime(storedToken) : null;
                const shouldRefreshToken = !storedToken || !tokenExpiresAt || tokenExpiresAt - Date.now() < 60_000;
                let sessionToken = storedToken;
                if (shouldRefreshToken && storedRefreshToken) {
                    sessionToken = await refreshAccessToken();
                } else if (storedToken) {
                    setAccessToken(storedToken);
                }
                if (sessionToken) {
                    loadUserData(storedUserId, sessionToken);
                } else {
                    clearPersistedSession();
                }
            } else if (storedUserId || storedUserName || storedToken || storedRefreshToken) {
                clearPersistedSession();
            }
        };
        void bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-refresh token before expiry
    useEffect(() => {
        if (!userId) return;
        const token = getStoredAccessToken();
        if (!token) return;
        const expiresAt = getTokenExpiryTime(token);
        if (!expiresAt) return;
        const timeoutMs = Math.max(expiresAt - Date.now() - 60_000, 30_000);
        const timer = window.setTimeout(() => { void refreshAccessToken(); }, timeoutMs);
        return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, accessToken]);

    return {
        isClient, userId, userName, userEmail, userGoal, accessToken,
        handleLogin, handleLogout, loadUserData, authenticatedFetch,
        setUserGoal, setUserEmail,
    };
}
