/**
 * useBankNotifications.ts
 *
 * Capacitor hook that:
 * 1. Requests Notification Listener permission on Android
 * 2. Listens for incoming bank push notifications
 * 3. Sends them to /api/parse-notification for regex parsing
 * 4. Returns pending transactions for user confirmation
 *
 * Requires: @capacitor-community/notification-listener
 * Install:  npm install @capacitor-community/notification-listener
 *           npx cap sync android
 */

import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// ── Types ──────────────────────────────────────────────────────
export interface PendingBankTransaction {
    id: string;                  // random ID for UI key
    bankId: string;
    bankName: string;
    merchant: string;
    amount: number;
    currency: string;
    type: 'income' | 'expense';
    tag: string;
    rawText: string;
    transaction: any;            // ready-to-save transaction object
}

interface NotificationListenerPlugin {
    requestPermission(): Promise<void>;
    isListening(): Promise<{ value: boolean }>;
    startListening(options: { packagesWhitelist: string[]; cacheNotifications?: boolean }): Promise<void>;
    addListener(
        event: 'notificationReceivedEvent',
        handler: (data: any) => void
    ): Promise<{ remove: () => void }>;
    restoreCachedNotifications(): Promise<void>;
}

// Dynamically load the plugin only when running on a real device
function getPlugin(): NotificationListenerPlugin | null {
    if (!Capacitor.isNativePlatform()) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsListener } = require('@posx/capacitor-notifications-listener');
        return NotificationsListener as NotificationListenerPlugin;
    } catch {
        console.warn('[BankNotif] @posx/capacitor-notifications-listener not installed');
        return null;
    }
}

// ── Package → display name map ────────────────────────────────
const PACKAGE_NAMES: Record<string, string> = {
    'com.leumi.leumiwallet': 'Max', 'com.max.mobile': 'Max',
    'com.ideomobile.hapoalim': 'Bank Hapoalim', 'com.bankhapoalim.mobile': 'Bank Hapoalim',
    'com.ideomobile.leumi': 'Bank Leumi', 'il.co.yahav.gmach': 'Bank Leumi', 'com.leumidigital.android': 'Bank Leumi',
    'com.discountbank.mobile': 'Discount Bank', 'com.ideomobile.discount': 'Discount Bank',
    'com.cal.calapp': 'CAL', 'com.isracard.android': 'Isracard',
    'com.onezero.android': 'One Zero',
    'com.mercadopago.wallet.android': 'Mercado Pago',
    'com.mercadopago.android.mp': 'Mercado Pago',
    'com.mercadopago.wallet': 'Mercado Pago',
    'com.mercadopago.android': 'Mercado Pago',
    'ar.uala': 'Ualá',
    'com.brubank': 'Brubank',
    'com.brubank.mobile': 'Brubank',
    'ar.com.brubank.wallet': 'Brubank',
    'com.naranjax.android': 'Naranja X',
    'com.paypal.android.p2pmobile': 'PayPal',
    'com.transferwise.android': 'Wise',
    'com.revolut.revolut': 'Revolut',
    'com.google.android.apps.walletnfcrel': 'Google Wallet',
    'com.google.android.gms': 'Google Pay',
    'com.google.android.apps.wallet': 'Google Pay',
};

// ── Hook ──────────────────────────────────────────────────────
export function useBankNotifications({
    enabled,
    userId,
    authenticatedFetch,
    autoAdd = false,
    apiBase = '',
    onAutoSaved,
}: {
    enabled: boolean;
    userId: string;
    authenticatedFetch?: (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response>;
    autoAdd?: boolean;
    apiBase?: string;
    onAutoSaved?: (tx: any) => void;
}) {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [pending, setPending] = useState<PendingBankTransaction[]>([]);
    const [processing, setProcessing] = useState(false);
    const request = authenticatedFetch ?? fetch;

    // ── Fetch existing pending from DB ─────────────────────────
    const fetchPending = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await request(`${apiBase}/api/parse-notification`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const mapped: PendingBankTransaction[] = data.map((item: any) => ({
                    id: item.id,
                    bankId: item.bankName,
                    bankName: PACKAGE_NAMES[Object.keys(PACKAGE_NAMES).find(pkg => PACKAGE_NAMES[pkg] === item.bankName) || ''] || item.bankName,
                    merchant: item.merchant,
                    amount: item.amount,
                    currency: item.currency,
                    type: item.type,
                    tag: item.tag,
                    rawText: item.rawText,
                    transaction: item.transaction,
                }));

                // Deduplicate: keep only the first (newest, DB returns desc) per rawText
                const seen = new Set<string>();
                const unique: PendingBankTransaction[] = [];
                const toDelete: string[] = [];
                for (const item of mapped) {
                    if (seen.has(item.rawText)) {
                        toDelete.push(item.id); // older duplicate → delete from DB
                    } else {
                        seen.add(item.rawText);
                        unique.push(item);
                    }
                }
                // Fire-and-forget cleanup of old duplicates
                toDelete.forEach(id =>
                    request(`${apiBase}/api/parse-notification?id=${id}`, { method: 'DELETE' }).catch(() => { })
                );

                setPending(unique);
            }
        } catch (e) {
            console.error('[BankNotif] fetchPending error', e);
        }
    }, [userId, apiBase, request]);

    // ── Request permission ─────────────────────────────────────
    const requestPermission = useCallback(async () => {
        const plugin = getPlugin();
        if (!plugin) {
            setPermissionGranted(false);
            return false;
        }
        try {
            await plugin.requestPermission();
            const { value } = await plugin.isListening();
            setPermissionGranted(value);
            return value;
        } catch (e) {
            console.error('[BankNotif] permission error', e);
            setPermissionGranted(false);
            return false;
        }
    }, []);

    // ── Process a single notification ──────────────────────────
    const processNotification = useCallback(async (packageName: string, title: string, text: string) => {
        if (!PACKAGE_NAMES[packageName]) return;  // not a banking app
        if (!userId) return;

        setProcessing(true);
        try {
            const res = await request(`${apiBase}/api/parse-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageName, title, body: text }),
            });

            const data = await res.json();

            if (data.error || !data.parsed) return;  // not parseable, skip

            const pendingTx: PendingBankTransaction = {
                id: data.id || `${Date.now()}`,
                bankId: data.parsed.bankId,
                bankName: PACKAGE_NAMES[packageName] ?? packageName,
                merchant: data.parsed.merchant,
                amount: data.parsed.amount,
                currency: data.parsed.currency,
                type: data.parsed.type,
                tag: data.parsed.tag,
                rawText: data.parsed.rawText,
                transaction: data.transaction,
            };

            if (autoAdd) {
                // Auto-save without asking
                await saveTransaction(pendingTx.transaction, apiBase, request);
                // Also delete from pending table
                if (data.id) await request(`${apiBase}/api/parse-notification?id=${data.id}`, { method: 'DELETE' });
                onAutoSaved?.(pendingTx.transaction);
            } else {
                // Queue for user confirmation — skip if already in list (same id or same rawText)
                setPending(prev => {
                    const isDuplicate = prev.some(
                        p => p.id === pendingTx.id || p.rawText === pendingTx.rawText
                    );
                    if (isDuplicate) return prev;
                    return [pendingTx, ...prev];
                });
            }
        } catch (e) {
            console.error('[BankNotif] processNotification error', e);
        } finally {
            setProcessing(false);
        }
    }, [userId, autoAdd, apiBase, onAutoSaved, request]);

    // ── Confirm a pending transaction ──────────────────────────
    const confirmPending = useCallback(async (pendingId: string) => {
        const item = pending.find(p => p.id === pendingId);
        if (!item) return;

        try {
            await saveTransaction(item.transaction, apiBase, request);
            // Delete from DB
            await request(`${apiBase}/api/parse-notification?id=${pendingId}`, { method: 'DELETE' });
            setPending(prev => prev.filter(p => p.id !== pendingId));
        } catch (e) {
            console.error('[BankNotif] confirm error', e);
        }
    }, [pending, apiBase, request]);

    // ── Dismiss a pending transaction ──────────────────────────
    const dismissPending = useCallback(async (pendingId: string) => {
        try {
            await request(`${apiBase}/api/parse-notification?id=${pendingId}`, { method: 'DELETE' });
            setPending(prev => prev.filter(p => p.id !== pendingId));
        } catch (e) {
            console.error('[BankNotif] dismiss error', e);
        }
    }, [apiBase, request]);

    // ── Attach listener when enabled ───────────────────────────
    useEffect(() => {
        if (!enabled) return;

        // Fetch existing on start
        fetchPending();

        if (!Capacitor.isNativePlatform()) return;
        const plugin = getPlugin();
        if (!plugin) return;

        let removeNotifListener: (() => void) | null = null;
        let removeAppStateListener: (() => void) | null = null;

        const whitelist = Object.keys(PACKAGE_NAMES);

        // ── Starts (or restarts) the native listening service ──
        const startService = async () => {
            try {
                await plugin.startListening({ packagesWhitelist: whitelist, cacheNotifications: true });
                console.warn('[BankNotif] Servicio de escucha activo.');
            } catch (e) {
                console.error('[BankNotif] Error al iniciar escucha:', e);
            }
        };

        const setup = async () => {
            console.warn('[BankNotif] Iniciando setup del plugin...');
            const { value } = await plugin.isListening();
            console.warn('[BankNotif] ¿Permiso otorgado?', value);
            setPermissionGranted(value);

            await startService();

            // Restaurar notificaciones en caché (las que llegaron con la app cerrada)
            try {
                await plugin.restoreCachedNotifications();
                console.warn('[BankNotif] Caché de notificaciones restaurada.');
            } catch (e) {
                console.error('[BankNotif] Error al restaurar notificaciones en caché:', e);
            }

            let lastText = '';
            let lastTime = 0;

            const handle = await plugin.addListener('notificationReceivedEvent', (notif: any) => {
                const pkg = notif.package || notif.packageName || (notif.data && notif.data.package);
                const title = notif.title || notif.apptitle || (notif.data && notif.data.title);
                const text = notif.text || notif.body || (notif.data && notif.data.text);
                const now = Date.now();

                // Evitar duplicados por rebote del sistema
                if (text === lastText && now - lastTime < 2000) return;
                lastText = text;
                lastTime = now;

                if (pkg && PACKAGE_NAMES[pkg]) {
                    console.warn('[BankNotif] ¡EVENTO DETECTADO!', PACKAGE_NAMES[pkg]);
                    processNotification(pkg, title || '', text || '');
                }
            });

            removeNotifListener = () => handle?.remove();

            // ── Auto-reconectar cuando la app vuelve al foreground ──
            // Android (especialmente Xiaomi/HyperOS) puede matar el servicio
            // cuando la app está en background. Esto lo reinicia automáticamente.
            const appStateHandle = await App.addListener('appStateChange', async ({ isActive }) => {
                if (!isActive) return;
                console.warn('[BankNotif] App regresó al foreground — reconectando servicio...');
                await startService();
                // Re-fetch por si llegaron notificaciones que quedaron en la DB
                fetchPending();
            });

            removeAppStateListener = () => appStateHandle?.remove();
            console.warn('[BankNotif] Sistema activo (con auto-reconexión).');
        };

        setup();

        return () => {
            removeNotifListener?.();
            removeAppStateListener?.();
        };
    }, [enabled, processNotification, fetchPending]);

    return {
        permissionGranted,
        pending,
        processing,
        requestPermission,
        confirmPending,
        dismissPending,
        processNotification,
    };
}

// ── Helper ─────────────────────────────────────────────────────
async function saveTransaction(
    transaction: any,
    apiBase: string,
    authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit, preferredToken?: string | null) => Promise<Response> | Promise<Response>,
) {
    try {
        await authenticatedFetch(`${apiBase}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
    } catch (e) {
        console.error('[BankNotif] saveTransaction error', e);
    }
}
