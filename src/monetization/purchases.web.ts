import type { PlanId } from './revenueCatConfig';

export { parsePurchaseError } from './purchaseErrors';
export type { ParsedPurchaseError } from './purchaseErrors';

export function isPurchasesAvailable(): boolean {
  return false;
}

export async function configurePurchases(): Promise<void> {}

export function addCustomerInfoListener(): () => void {
  return () => {};
}

export async function syncPremiumFromRevenueCat(): Promise<boolean> {
  return false;
}

export async function logInRevenueCat(_appUserId: string): Promise<void> {}

export async function linkPurchasesToUser(_appUserId: string): Promise<void> {}

export async function logOutRevenueCat(): Promise<void> {}

export async function getOfferingPrices(): Promise<Partial<Record<PlanId, string>>> {
  return {};
}

export async function purchasePlan(_planId: PlanId): Promise<boolean> {
  throw new Error('In-app purchases are not available on web.');
}

export async function restorePurchases(): Promise<boolean> {
  throw new Error('In-app purchases are not available on web.');
}
