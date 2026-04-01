import { Platform } from 'react-native';
import { apiFetch } from '../lib/api';

/**
 * Optionally registers for Expo push notifications and saves the token to
 * the backend. Completely non-blocking and non-crashing — if expo-notifications
 * is not linked (Expo Go, simulator, etc.) the function silently returns.
 */
export async function registerPushToken(accessToken: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    // Lazy require so a missing native module never crashes the app at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData?.data;
    if (!pushToken) return;

    await apiFetch('/api/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pushToken }),
    }, { access_token: accessToken });
  } catch {
    // Non-critical — never crash the app because of push registration
  }
}
