import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Expo Go has no RevenueCat native module — use the web stub so the app still loads. */
const usePurchasesStub =
  Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const impl = require(usePurchasesStub ? './purchases.web' : './purchases.native') as typeof import('./purchases.native');

export { parsePurchaseError } from './purchaseErrors';
export type { ParsedPurchaseError } from './purchaseErrors';

export const isPurchasesAvailable = impl.isPurchasesAvailable;
export const configurePurchases = impl.configurePurchases;
export const linkPurchasesToUser = impl.linkPurchasesToUser;
export const addCustomerInfoListener = impl.addCustomerInfoListener;
export const syncPremiumFromRevenueCat = impl.syncPremiumFromRevenueCat;
export const logInRevenueCat = impl.logInRevenueCat;
export const logOutRevenueCat = impl.logOutRevenueCat;
export const getOfferingPrices = impl.getOfferingPrices;
export const purchasePlan = impl.purchasePlan;
export const restorePurchases = impl.restorePurchases;
