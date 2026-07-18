import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAppStore } from '../store/useAppStore';
import {
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PACKAGE_IDS,
  type PlanId,
} from './revenueCatConfig';

export { parsePurchaseError } from './purchaseErrors';
export type { ParsedPurchaseError } from './purchaseErrors';

let configured = false;

function iosApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
}

function androidApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
}

function apiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') return iosApiKey();
  if (Platform.OS === 'android') return androidApiKey();
  return undefined;
}

function applyCustomerInfo(info: CustomerInfo): void {
  const entitlement = info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  const isPremium = entitlement !== undefined;
  const isTrialActive =
    isPremium &&
    (entitlement.periodType === 'TRIAL' || entitlement.periodType === 'INTRO');
  const trialEndsAt = isTrialActive ? entitlement.expirationDate : null;

  useAppStore.getState().syncPremiumFromRevenueCat(isPremium, isTrialActive, trialEndsAt);
}

export function isPurchasesAvailable(): boolean {
  return Boolean(apiKeyForPlatform());
}

export async function configurePurchases(): Promise<void> {
  const apiKey = apiKeyForPlatform();
  if (!apiKey || configured) return;

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

  Purchases.configure({ apiKey });
  configured = true;

  const info = await Purchases.getCustomerInfo();
  applyCustomerInfo(info);
}

/** Link RevenueCat to the signed-in Supabase user (call after auth is ready). */
export async function linkPurchasesToUser(appUserId: string): Promise<void> {
  if (!configured || !appUserId) return;
  const { customerInfo } = await Purchases.logIn(appUserId);
  applyCustomerInfo(customerInfo);
}

export function addCustomerInfoListener(): () => void {
  const listener = (info: CustomerInfo) => {
    applyCustomerInfo(info);
  };
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function syncPremiumFromRevenueCat(): Promise<boolean> {
  if (!configured) return useAppStore.getState().isPremium;
  const info = await Purchases.getCustomerInfo();
  applyCustomerInfo(info);
  return useAppStore.getState().isPremium;
}

export async function logInRevenueCat(appUserId: string): Promise<void> {
  await linkPurchasesToUser(appUserId);
}

export async function logOutRevenueCat(): Promise<void> {
  if (!configured) return;
  const info = await Purchases.logOut();
  applyCustomerInfo(info);
}

function findPackage(
  offerings: PurchasesOfferings,
  planId: PlanId,
): PurchasesPackage | undefined {
  const offering = offerings.current;
  if (!offering) return undefined;

  const packageId = REVENUECAT_PACKAGE_IDS[planId];
  const byId = offering.availablePackages.find((pkg) => pkg.identifier === packageId);
  if (byId) return byId;

  if (planId === 'monthly') return offering.monthly ?? undefined;
  if (planId === 'annual') return offering.annual ?? undefined;
  if (planId === 'lifetime') return offering.lifetime ?? undefined;
  return undefined;
}

export async function getOfferingPrices(): Promise<Partial<Record<PlanId, string>>> {
  if (!configured) return {};
  try {
    const offerings = await Purchases.getOfferings();
    const prices: Partial<Record<PlanId, string>> = {};
    (Object.keys(REVENUECAT_PACKAGE_IDS) as PlanId[]).forEach((planId) => {
      const pkg = findPackage(offerings, planId);
      if (pkg?.product?.priceString) {
        prices[planId] = pkg.product.priceString;
      }
    });
    return prices;
  } catch {
    return {};
  }
}

export async function purchasePlan(planId: PlanId): Promise<boolean> {
  if (!configured) {
    throw new Error(
      'Subscriptions require a development build with RevenueCat configured. Add your API keys to .env and rebuild.',
    );
  }

  const offerings = await Purchases.getOfferings();
  const pkg = findPackage(offerings, planId);
  if (!pkg) {
    throw new Error(
      'This plan is not available yet. Confirm your RevenueCat default offering includes monthly and annual packages.',
    );
  }

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  applyCustomerInfo(customerInfo);
  return useAppStore.getState().isPremium;
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) {
    throw new Error(
      'Restore requires a development build with RevenueCat configured. Add your API keys to .env and rebuild.',
    );
  }

  const info = await Purchases.restorePurchases();
  applyCustomerInfo(info);
  return useAppStore.getState().isPremium;
}
