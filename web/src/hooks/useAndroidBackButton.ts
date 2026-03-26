import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Handles the Android hardware back button in a Capacitor WebView.
 *
 * Behaviour:
 * - If the WebView has history to go back to → goes back (same as browser back)
 * - If we're at the root of the app (/app) and can't go back → minimizes the app
 *   instead of closing it (better UX than a hard exit)
 */
export function useAndroidBackButton() {
    const router = useRouter();

    useEffect(() => {
        // Only run in a Capacitor native context
        if (typeof window === 'undefined') return;
        if (!(window as any).Capacitor?.isNativePlatform?.()) return;

        let listenerHandle: { remove: () => void } | null = null;

        const setup = async () => {
            try {
                const { App } = await import('@capacitor/app');

                listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
                    if (canGoBack) {
                        // Let the WebView navigate back naturally
                        window.history.back();
                    } else {
                        // At the root — minimize (don't force-close)
                        App.minimizeApp();
                    }
                });
            } catch (e) {
                // Not in a Capacitor env — ignore silently
                console.debug('[BackButton] Not in Capacitor or @capacitor/app not available', e);
            }
        };

        setup();

        return () => {
            listenerHandle?.remove();
        };
    }, []);
}
