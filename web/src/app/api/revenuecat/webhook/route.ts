import { NextResponse } from 'next/server';
import { type PlanTier } from '../../../../lib/plan';
import { prisma } from '../../../../lib/prisma';
import { normalizeText } from '../../../../lib/security';

type RevenueCatEvent = {
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  aliases?: unknown;
  entitlement_ids?: unknown;
  expiration_at_ms?: unknown;
  product_id?: unknown;
  transferred_from?: unknown;
  type?: unknown;
};

type RevenueCatPayload = {
  event?: RevenueCatEvent | null;
};

const revenueCatWebhookAuth = (process.env.REVENUECAT_WEBHOOK_AUTH || '').trim();
const proEntitlementId = (
  process.env.REVENUECAT_PRO_ENTITLEMENT
  || process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT
  || ''
).trim();
const yearlyProductId = (
  process.env.REVENUECAT_PRO_YEARLY_PRODUCT
  || process.env.EXPO_PUBLIC_PRO_YEARLY_URL
  || ''
).trim();
const lifetimeProductId = (
  process.env.REVENUECAT_PRO_LIFETIME_PRODUCT
  || process.env.EXPO_PUBLIC_PRO_LIFETIME_URL
  || ''
).trim();

function normalizeString(value: unknown, maxLength = 160) {
  return normalizeText(value, maxLength, '');
}

function normalizeStringArray(value: unknown, maxLength = 160) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value
    .map((item) => normalizeString(item, maxLength))
    .filter((item) => item.length > 0)));
}

function getAuthorized(req: Request) {
  if (!revenueCatWebhookAuth) {
    return false;
  }

  const authorization = (req.headers.get('authorization') || '').trim();
  return authorization === revenueCatWebhookAuth || authorization === `Bearer ${revenueCatWebhookAuth}`;
}

function unwrapEvent(payload: RevenueCatPayload | RevenueCatEvent | null | undefined) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('event' in payload && payload.event && typeof payload.event === 'object') {
    return payload.event;
  }

  return payload as RevenueCatEvent;
}

function isProPurchaseEvent(event: RevenueCatEvent) {
  const entitlementIds = normalizeStringArray(event.entitlement_ids);
  const productId = normalizeString(event.product_id);

  if (proEntitlementId) {
    return entitlementIds.includes(proEntitlementId);
  }

  if (yearlyProductId || lifetimeProductId) {
    return productId === yearlyProductId || productId === lifetimeProductId;
  }

  return entitlementIds.length > 0;
}

function resolvePlanTier(event: RevenueCatEvent): PlanTier | null {
  if (!isProPurchaseEvent(event)) {
    return null;
  }

  const eventType = normalizeString(event.type, 80).toUpperCase();
  const expirationAtMs = typeof event.expiration_at_ms === 'number'
    ? event.expiration_at_ms
    : Number(event.expiration_at_ms);

  if (eventType === 'EXPIRATION' || eventType === 'REFUND' || eventType === 'REVOKE') {
    return 'free';
  }

  if (Number.isFinite(expirationAtMs) && expirationAtMs > 0 && expirationAtMs <= Date.now()) {
    return 'free';
  }

  return 'pro';
}

function getTargetAuthIds(event: RevenueCatEvent) {
  const authIds = new Set<string>();

  const primaryAppUserId = normalizeString(event.app_user_id);
  if (primaryAppUserId) {
    authIds.add(primaryAppUserId);
  }

  const originalAppUserId = normalizeString(event.original_app_user_id);
  if (originalAppUserId) {
    authIds.add(originalAppUserId);
  }

  for (const alias of normalizeStringArray(event.aliases)) {
    authIds.add(alias);
  }

  return Array.from(authIds);
}

async function updateUsersPlanTier(authIds: string[], planTier: PlanTier) {
  if (authIds.length === 0) {
    return 0;
  }

  const result = await prisma.user.updateMany({
    where: {
      authId: {
        in: authIds,
      },
    },
    data: {
      planTier,
    },
  });

  return result.count;
}

export async function POST(req: Request) {
  if (!revenueCatWebhookAuth) {
    return NextResponse.json({ error: 'revenuecat_webhook_not_configured' }, { status: 503 });
  }

  if (!getAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json().catch(() => null);
    const event = unwrapEvent(payload);

    if (!event) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const nextPlanTier = resolvePlanTier(event);
    if (!nextPlanTier) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'event_not_mapped_to_pro_plan' });
    }

    const targetAuthIds = getTargetAuthIds(event);
    const updatedUsers = await updateUsersPlanTier(targetAuthIds, nextPlanTier);

    const transferredFromIds = normalizeStringArray(event.transferred_from);
    const downgradedUsers = transferredFromIds.length > 0
      ? await updateUsersPlanTier(transferredFromIds, 'free')
      : 0;

    return NextResponse.json({
      ok: true,
      updatedUsers,
      downgradedUsers,
      planTier: nextPlanTier,
    });
  } catch (error) {
    console.error('[RevenueCat webhook] failed to process event', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}