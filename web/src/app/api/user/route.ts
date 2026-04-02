import { NextResponse } from 'next/server';
import { ensureAppUserProfile, requireAuth, signOutAuthenticatedSupabaseUser } from '../../../lib/supabase-server';
import { prisma } from '../../../lib/prisma';
import { enforceSameOrigin, normalizeText } from '../../../lib/security';
import { buildPlanPayload, clampAvailableCurrenciesForPlan, getDeviceAccess, getMaxAvailableCurrencies, normalizeDeviceIds, normalizePlanTier } from '../../../lib/plan';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ARS', 'ILS'] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
    return typeof value === 'string' && SUPPORTED_CURRENCY_SET.has(value);
}

function normalizeAvailableCurrencies(raw: unknown, fallback: SupportedCurrency) {
    if (!Array.isArray(raw)) {
        return [fallback];
    }

    const unique = Array.from(new Set(raw.filter((value): value is SupportedCurrency => isSupportedCurrency(value))));
    return unique.length > 0 ? unique : [fallback];
}

function getRequestDeviceId(req: Request, fallback?: unknown) {
    const headerValue = req.headers.get('x-safadd-device-id');
    const rawValue = typeof headerValue === 'string' && headerValue.trim().length > 0 ? headerValue : fallback;
    const normalized = normalizeText(rawValue, 120, '')
        .replace(/[^a-zA-Z0-9._:-]/g, '')
        .trim();

    return normalized.length > 0 ? normalized : null;
}

async function registerDeviceIfAllowed(authId: string, planTier: string, deviceIds: string[], deviceId: string | null) {
    const normalizedDeviceIds = normalizeDeviceIds(deviceIds);
    const deviceAccess = getDeviceAccess(planTier, normalizedDeviceIds, deviceId);

    if (!deviceAccess.shouldRegister || !deviceId) {
        return {
            deviceIds: normalizedDeviceIds,
            deviceAccess,
        };
    }

    const nextDeviceIds = [...normalizedDeviceIds, deviceId];

    await prisma.user.update({
        where: { authId },
        data: { deviceIds: nextDeviceIds },
    });

    return {
        deviceIds: nextDeviceIds,
        deviceAccess: getDeviceAccess(planTier, nextDeviceIds, deviceId),
    };
}

function buildUserResponse(profile: {
    id: string;
    username: string;
    role: string;
    planTier: string;
    monthlyGoal: number;
    currency: string;
    goalCurrency: string;
    availableCurrencies: string[];
    deviceIds: string[];
}, email: string | null, deviceId: string | null) {
    const normalizedPlanTier = normalizePlanTier(profile.planTier);
    const normalizedDeviceIds = normalizeDeviceIds(profile.deviceIds);

    return {
        ...profile,
        planTier: normalizedPlanTier,
        deviceIds: normalizedDeviceIds,
        email,
        plan: buildPlanPayload(normalizedPlanTier, normalizedDeviceIds, deviceId),
    };
}

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        await ensureAppUserProfile(user);

        const profile = await prisma.user.findUnique({
            where: { authId: user.id },
            select: {
                id: true,
                username: true,
                role: true,
                planTier: true,
                monthlyGoal: true,
                currency: true,
                goalCurrency: true,
                availableCurrencies: true,
                deviceIds: true,
            },
        });
        if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

        const deviceId = getRequestDeviceId(req);
        const registration = await registerDeviceIfAllowed(user.id, profile.planTier, profile.deviceIds, deviceId);

        return NextResponse.json(buildUserResponse({
            ...profile,
            deviceIds: registration.deviceIds,
        }, user.email ?? null, deviceId));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const { monthlyGoal, currency, goalCurrency, availableCurrencies, deviceId: requestDeviceId } = await req.json();
        const currentProfile = await prisma.user.findUnique({
            where: { authId: user.id },
            select: {
                id: true,
                username: true,
                role: true,
                planTier: true,
                monthlyGoal: true,
                currency: true,
                goalCurrency: true,
                availableCurrencies: true,
                deviceIds: true,
            },
        });

        if (!currentProfile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const parsedGoal = monthlyGoal === undefined ? currentProfile.monthlyGoal : Number(monthlyGoal);

        if (!Number.isFinite(parsedGoal) || parsedGoal < 0 || parsedGoal > 1_000_000_000) {
            return NextResponse.json({ error: 'Meta mensual inválida' }, { status: 400 });
        }

        const currentCurrency = isSupportedCurrency(currentProfile.currency) ? currentProfile.currency : 'USD';
        const nextCurrency = isSupportedCurrency(currency) ? currency : currentCurrency;
        const normalizedPlanTier = normalizePlanTier(currentProfile.planTier);
        const currentAvailableCurrencies = normalizeAvailableCurrencies(currentProfile.availableCurrencies, nextCurrency);
        const rawAvailableCurrencies = availableCurrencies === undefined
            ? currentAvailableCurrencies
            : normalizeAvailableCurrencies(availableCurrencies, nextCurrency);
        const nextAvailableCurrencies = clampAvailableCurrenciesForPlan(rawAvailableCurrencies, nextCurrency, normalizedPlanTier);

        const maxAvailableCurrencies = getMaxAvailableCurrencies(normalizedPlanTier);
        if (maxAvailableCurrencies !== null && rawAvailableCurrencies.length > maxAvailableCurrencies) {
            return NextResponse.json({
                errorCode: 'plan_limit_secondary_currencies',
                limit: Math.max(maxAvailableCurrencies - 1, 0),
            }, { status: 403 });
        }

        const nextGoalCurrency = isSupportedCurrency(goalCurrency) && nextAvailableCurrencies.includes(goalCurrency)
            ? goalCurrency
            : (isSupportedCurrency(currentProfile.goalCurrency) && nextAvailableCurrencies.includes(currentProfile.goalCurrency)
                ? currentProfile.goalCurrency
                : nextCurrency);

        const deviceId = getRequestDeviceId(req, requestDeviceId);
        const deviceAccess = getDeviceAccess(normalizedPlanTier, currentProfile.deviceIds, deviceId);
        if (deviceAccess.deviceLimitReached) {
            return NextResponse.json({
                errorCode: 'device_limit_reached',
                limit: deviceAccess.maxDevices,
            }, { status: 403 });
        }

        const nextDeviceIds = deviceAccess.shouldRegister && deviceId
            ? [...normalizeDeviceIds(currentProfile.deviceIds), deviceId]
            : normalizeDeviceIds(currentProfile.deviceIds);

        const updated = await prisma.user.update({
            where: { authId: user.id },
            data: {
                monthlyGoal: parsedGoal,
                currency: nextCurrency,
                goalCurrency: nextGoalCurrency,
                availableCurrencies: nextAvailableCurrencies,
                deviceIds: nextDeviceIds,
            },
            select: {
                id: true,
                username: true,
                role: true,
                planTier: true,
                monthlyGoal: true,
                currency: true,
                goalCurrency: true,
                availableCurrencies: true,
                deviceIds: true,
            },
        });
        return NextResponse.json(buildUserResponse(updated, user.email ?? null, deviceId));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const { user, accessToken, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const profile = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { id: true, authId: true },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.transaction.deleteMany({ where: { userId: profile.id } }),
            prisma.importUsage.deleteMany({ where: { userId: profile.id } }),
            prisma.scanUsage.deleteMany({ where: { userId: profile.id } }),
            prisma.pendingNotification.deleteMany({ where: { userId: profile.id } }),
            prisma.user.delete({ where: { id: profile.id } }),
        ]);

        if (accessToken) {
            await signOutAuthenticatedSupabaseUser(accessToken);
        }

        return NextResponse.json({ success: true, authDeleted: false });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
