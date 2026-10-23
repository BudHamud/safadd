import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  LOG_LEVEL,
  PACKAGE_TYPE,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

export type RevenueCatVariant = 'yearly' | 'lifetime';

export type RevenueCatPackages = Record<RevenueCatVariant, PurchasesPackage | null>;

const yearlyIdentifier = (process.env.EXPO_PUBLIC_PRO_YEARLY_URL || '').trim();
const lifetimeIdentifier = (process.env.EXPO_PUBLIC_PRO_LIFETIME_URL || '').trim();
const proEntitlementIdentifier = (process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT || '').trim();
const revenueCatApiKey = (
  Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    default: '',
  }) || ''
).trim();

let configuredAppUserId: string | null = null;

function isNativePurchasePlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getVariantIdentifier(variant: RevenueCatVariant) {
  return variant === 'yearly' ? yearlyIdentifier : lifetimeIdentifier;
}

function getOfferingsInPriorityOrder(offerings: PurchasesOfferings) {
  const currentOfferingId = offerings.current?.identifier;
  const otherOfferings = Object.values(offerings.all).filter((offering) => offering.identifier !== currentOfferingId);

  return offerings.current ? [offerings.current, ...otherOfferings] : otherOfferings;
}

function getFallbackPackage(offering: PurchasesOffering, variant: RevenueCatVariant) {
  if (variant === 'yearly') {
    return offering.annual ?? offering.availablePackages.find((pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  }

  return offering.lifetime ?? offering.availablePackages.find((pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME) ?? null;
}

function findPackageInOfferings(offerings: PurchasesOfferings, variant: RevenueCatVariant) {
  const configuredIdentifier = getVariantIdentifier(variant);
  const prioritizedOfferings = getOfferingsInPriorityOrder(offerings);

  if (configuredIdentifier) {
    for (const offering of prioritizedOfferings) {
      const matchingPackage = offering.availablePackages.find(
        (pkg) => pkg.identifier === configuredIdentifier || pkg.product.identifier === configuredIdentifier,
      );

      if (matchingPackage) {
        return matchingPackage;
      }
    }
  }

  for (const offering of prioritizedOfferings) {
    const fallbackPackage = getFallbackPackage(offering, variant);
    if (fallbackPackage) {
      return fallbackPackage;
    }
  }

  return null;
}

export function isRevenueCatReady() {
  return isNativePurchasePlatform() && revenueCatApiKey.length > 0;
}

export async function ensureRevenueCatConfigured(appUserId?: string) {
  if (!isRevenueCatReady()) {
    return false;
  }

  const isConfigured = await Purchases.isConfigured();
  if (!isConfigured) {
    Purchases.configure({ apiKey: revenueCatApiKey, appUserID: appUserId || undefined });

    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => undefined);
    }

    configuredAppUserId = appUserId ?? null;
  }

  return true;
}

export async function syncRevenueCatUser(appUserId: string) {
  const isReady = await ensureRevenueCatConfigured(appUserId);
  if (!isReady) {
    return false;
  }

  if (configuredAppUserId === appUserId) {
    return true;
  }

  await Purchases.logIn(appUserId);
  configuredAppUserId = appUserId;
  return true;
}

export async function resetRevenueCatUser() {
  if (!isRevenueCatReady()) {
    configuredAppUserId = null;
    return false;
  }

  const isConfigured = await Purchases.isConfigured();
  if (!isConfigured) {
    configuredAppUserId = null;
    return false;
  }

  await Purchases.logOut();
  configuredAppUserId = null;
  return true;
}

export async function getRevenueCatPackages(appUserId?: string): Promise<RevenueCatPackages> {
  const isReady = appUserId
    ? await syncRevenueCatUser(appUserId)
    : await ensureRevenueCatConfigured();

  if (!isReady) {
    return { yearly: null, lifetime: null };
  }

  const offerings = await Purchases.getOfferings();

  return {
    yearly: findPackageInOfferings(offerings, 'yearly'),
    lifetime: findPackageInOfferings(offerings, 'lifetime'),
  };
}

export async function purchaseRevenueCatPackage(aPackage: PurchasesPackage) {
  return Purchases.purchasePackage(aPackage);
}

export async function restoreRevenueCatPurchases() {
  return Purchases.restorePurchases();
}

export function hasRevenueCatProAccess(customerInfo: CustomerInfo) {
  if (proEntitlementIdentifier) {
    return Boolean(customerInfo.entitlements.active[proEntitlementIdentifier]?.isActive);
  }

  return Object.keys(customerInfo.entitlements.active).length > 0;
}

export function addRevenueCatCustomerInfoListener(listener: CustomerInfoUpdateListener) {
  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}