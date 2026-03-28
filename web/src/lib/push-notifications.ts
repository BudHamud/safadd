import { prisma } from './prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoPushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
};

/**
 * Sends a push notification to all admin users that have a registered push token.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function notifyAdmins(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin', pushToken: { not: null } },
      select: { pushToken: true },
    });

    const tokens = admins.map((a) => a.pushToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    const message: ExpoPushMessage = {
      to: tokens,
      title,
      body,
      sound: 'default',
      ...(data ? { data } : {}),
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[PUSH] Expo push API error:', res.status, text);
    }
  } catch (err) {
    console.error('[PUSH] notifyAdmins failed:', err);
  }
}
