export type PlanTier = 'free' | 'pro';

export type PlanEntitlements = {
    advancedAnalytics: boolean;
    categoryGoals: boolean;
    customCategories: boolean;
    maxCustomCategories: number | null;
    dataExport: boolean;
    importRowsPerDay: number;
    maxDevices: number | null;
    maxSecondaryCurrencies: number | null;
    prioritySupport: boolean;
    travelMode: 'none';
};

export const FREE_PLAN_SECONDARY_CURRENCIES_LIMIT = 2;
export const FREE_PLAN_DEVICE_LIMIT = null;
export const FREE_PLAN_CUSTOM_CATEGORIES_LIMIT = 10;
export const FREE_PLAN_IMPORT_ROWS_PER_DAY = 50;
export const PRO_PLAN_IMPORT_ROWS_PER_DAY = 500;

export function normalizePlanTier(value: unknown): PlanTier {
    return typeof value === 'string' && value.toLowerCase() === 'pro' ? 'pro' : 'free';
}

export function getPlanEntitlements(planTier: unknown): PlanEntitlements {
    const tier = normalizePlanTier(planTier);

    if (tier === 'pro') {
        return {
            advancedAnalytics: true,
            categoryGoals: true,
            customCategories: true,
            maxCustomCategories: null,
            dataExport: true,
            importRowsPerDay: PRO_PLAN_IMPORT_ROWS_PER_DAY,
            maxDevices: null,
            maxSecondaryCurrencies: null,
            prioritySupport: true,
            travelMode: 'none',
        };
    }

    return {
        advancedAnalytics: false,
        categoryGoals: false,
        customCategories: true,
        maxCustomCategories: FREE_PLAN_CUSTOM_CATEGORIES_LIMIT,
        dataExport: false,
        importRowsPerDay: FREE_PLAN_IMPORT_ROWS_PER_DAY,
        maxDevices: FREE_PLAN_DEVICE_LIMIT,
        maxSecondaryCurrencies: FREE_PLAN_SECONDARY_CURRENCIES_LIMIT,
        prioritySupport: true,
        travelMode: 'none',
    };
}

export function normalizeDeviceIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)));
}

export function getMaxAvailableCurrencies(planTier: unknown) {
    const entitlements = getPlanEntitlements(planTier);
    return entitlements.maxSecondaryCurrencies === null ? null : entitlements.maxSecondaryCurrencies + 1;
}

export function clampAvailableCurrenciesForPlan(availableCurrencies: string[], primaryCurrency: string, planTier: unknown) {
    const deduped = Array.from(new Set([primaryCurrency, ...availableCurrencies.filter((currency) => currency !== primaryCurrency)]));
    const maxAvailableCurrencies = getMaxAvailableCurrencies(planTier);

    if (maxAvailableCurrencies === null || deduped.length <= maxAvailableCurrencies) {
        return deduped;
    }

    return deduped.slice(0, maxAvailableCurrencies);
}

export function getDeviceAccess(planTier: unknown, deviceIds: string[], deviceId: string | null) {
    const entitlements = getPlanEntitlements(planTier);
    const normalizedDeviceIds = normalizeDeviceIds(deviceIds);
    const alreadyRegistered = !!deviceId && normalizedDeviceIds.includes(deviceId);
    const maxDevices = entitlements.maxDevices;
    const hasCapacity = maxDevices === null || normalizedDeviceIds.length < maxDevices;
    const currentDeviceAllowed = !deviceId || alreadyRegistered || hasCapacity;

    return {
        alreadyRegistered,
        currentDeviceAllowed,
        deviceLimitReached: !!deviceId && !alreadyRegistered && !hasCapacity,
        maxDevices,
        shouldRegister: !!deviceId && !alreadyRegistered && hasCapacity,
    };
}

export function buildPlanPayload(planTier: unknown, deviceIds: string[], deviceId: string | null) {
    const tier = normalizePlanTier(planTier);
    const entitlements = getPlanEntitlements(tier);
    const normalizedDeviceIds = normalizeDeviceIds(deviceIds);
    const deviceAccess = getDeviceAccess(tier, normalizedDeviceIds, deviceId);

    return {
        tier,
        entitlements,
        sync: {
            currentDeviceAllowed: deviceAccess.currentDeviceAllowed,
            currentDeviceId: deviceId,
            deviceLimitReached: deviceAccess.deviceLimitReached,
            maxDevices: deviceAccess.maxDevices,
            registeredDevices: normalizedDeviceIds.length,
        },
    };
}