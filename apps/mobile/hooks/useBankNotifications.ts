import { useEffect, useCallback, useState } from 'react';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { AppState, Platform } from 'react-native';

const notificationListenerModule = RNAndroidNotificationListener;
const isNotificationListenerAvailable =
    Platform.OS === 'android' &&
    notificationListenerModule != null &&
    typeof notificationListenerModule.getPermissionStatus === 'function' &&
    typeof notificationListenerModule.requestPermission === 'function';

// ── Types ──────────────────────────────────────────────────────
export interface PendingBankTransaction {
    id: string;
    bankId: string;
    bankName: string;
    merchant: string;
    amount: number;
    currency: string;
    type: 'income' | 'expense';
    tag: string;
    rawText: string;
    transaction: any;
}

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

export function useBankNotifications({
    enabled,
    userId,
    accessToken,
    autoAdd = false,
    apiBase = 'https://zafe.vercel.app',
    onAutoSaved,
}: {
    enabled: boolean;
    userId: string;
    accessToken?: string | null;
    autoAdd?: boolean;
    apiBase?: string;
    onAutoSaved?: (tx: any) => void;
}) {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [pending, setPending] = useState<PendingBankTransaction[]>([]);
    const [processing, setProcessing] = useState(false);

    const buildHeaders = useCallback((headers?: Record<string, string>) => {
        const nextHeaders: Record<string, string> = { ...(headers ?? {}) };
        if (accessToken) nextHeaders.Authorization = `Bearer ${accessToken}`;
        return nextHeaders;
    }, [accessToken]);

    const checkPermission = async () => {
        if (!isNotificationListenerAvailable) {
            setPermissionGranted(false);
            return false;
        }

        const status = await notificationListenerModule.getPermissionStatus();
        setPermissionGranted(status !== 'denied');
        return status !== 'denied';
    };

    const requestPermission = useCallback(async () => {
        if (!isNotificationListenerAvailable) {
            console.warn('[BankNotif] notification listener native module unavailable');
            setPermissionGranted(false);
            return false;
        }

        try {
            notificationListenerModule.requestPermission();
            return await checkPermission();
        } catch (e) {
            console.error('[BankNotif] permission error', e);
            setPermissionGranted(false);
            return false;
        }
    }, []);

    const fetchPending = useCallback(async () => {
        if (!userId || !accessToken) return;
        try {
            const res = await fetch(`${apiBase}/api/parse-notification`, {
                headers: buildHeaders(),
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const unique: PendingBankTransaction[] = [];
                // mapping logic from Next.js app...
                setPending(data.map((item: any) => ({
                    id: item.id,
                    bankId: item.bankName,
                    bankName: PACKAGE_NAMES[item.bankName] || item.bankName,
                    merchant: item.merchant,
                    amount: item.amount,
                    currency: item.currency,
                    type: item.type,
                    tag: item.tag,
                    rawText: item.rawText,
                    transaction: item.transaction,
                })));
            }
        } catch (e) {
            console.error('[BankNotif] fetchPending error', e);
        }
    }, [userId, accessToken, apiBase, buildHeaders]);

    const processNotification = useCallback(async (packageName: string, title: string, text: string) => {
        if (!PACKAGE_NAMES[packageName]) return;
        if (!userId || !accessToken) return;

        setProcessing(true);
        try {
            const res = await fetch(`${apiBase}/api/parse-notification`, {
                method: 'POST',
                headers: buildHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ packageName, title, body: text }),
            });

            const data = await res.json();
            if (data.error || !data.parsed) return;

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

            setPending(prev => {
                if (prev.some(p => p.id === pendingTx.id)) return prev;
                return [pendingTx, ...prev];
            });
        } catch (e) {
            console.error('[BankNotif] processNotification error', e);
        } finally {
            setProcessing(false);
        }
    }, [userId, accessToken, autoAdd, apiBase, onAutoSaved, buildHeaders]);

    const dismissPending = useCallback(async (pendingId: string) => {
        try {
            await fetch(`${apiBase}/api/parse-notification?id=${pendingId}`, { method: 'DELETE', headers: buildHeaders() });
            setPending(prev => prev.filter(p => p.id !== pendingId));
        } catch (e) {}
    }, [apiBase, buildHeaders]);

    useEffect(() => {
        checkPermission();
        fetchPending();
        
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                checkPermission();
                fetchPending();
            }
        });
        return () => {
            subscription.remove();
        };
    }, []);

    return {
        isSupported: isNotificationListenerAvailable,
        permissionGranted,
        pending,
        processing,
        requestPermission,
        dismissPending,
        processNotification,
    };
}
