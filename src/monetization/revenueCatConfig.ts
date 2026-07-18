/**
 * Locked RevenueCat / store identifiers (Phase 0).
 *
 * These values must match exactly across:
 * - app.json (bundleIdentifier / package)
 * - App Store Connect product IDs
 * - Google Play Console product IDs
 * - RevenueCat dashboard (entitlement, products, offering packages)
 *
 * Do not rename without updating all four places.
 */

import type { PricingPlan } from './types';

/** Must match expo.ios.bundleIdentifier in app.json. */
export const APP_IOS_BUNDLE_ID = 'com.momentumapp.focus' as const;

/** Must match expo.android.package in app.json. */
export const APP_ANDROID_PACKAGE = 'com.momentumapp.focus' as const;

/** RevenueCat entitlement that unlocks premium features. */
export const REVENUECAT_ENTITLEMENT_ID = 'premium' as const;

/** RevenueCat offering identifier (dashboard "default" offering). */
export const REVENUECAT_DEFAULT_OFFERING_ID = 'default' as const;

/** App plan ids — must stay aligned with PRICING in features.ts. */
export type PlanId = PricingPlan['id'];

/**
 * App UI plan id → App Store Connect / Google Play product id.
 * Same ids on both platforms so RevenueCat can map one product per plan.
 */
export const STORE_PRODUCT_IDS: Record<PlanId, string> = {
  monthly:  'com.momentumapp.focus.premium.monthly',
  annual:   'com.momentumapp.focus.premium.annual',
  lifetime: 'com.momentumapp.focus.premium.lifetime',
};

/**
 * App UI plan id → RevenueCat offering package identifier.
 * Create packages named monthly / annual / lifetime in the default offering.
 */
export const REVENUECAT_PACKAGE_IDS: Record<PlanId, string> = {
  monthly:  'monthly',
  annual:   'annual',
  lifetime: 'lifetime',
};

/**
 * App UI plan id → RevenueCat package type (for dashboard setup reference).
 * Lifetime is a one-time (non-subscription) product — use CUSTOM in RevenueCat.
 */
export const REVENUECAT_PACKAGE_TYPES: Record<PlanId, 'MONTHLY' | 'ANNUAL' | 'CUSTOM'> = {
  monthly:  'MONTHLY',
  annual:   'ANNUAL',
  lifetime: 'CUSTOM',
};
