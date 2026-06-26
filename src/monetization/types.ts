// ─── Plans ─────────────────────────────────────────────────────────────────────
export type Plan = 'free' | 'premium';

// ─── Feature registry keys ─────────────────────────────────────────────────────
export type FeatureId =
  | 'basic_coaching'           // free: behavioral coach (limited surfaces)
  | 'schedule_regeneration'    // free: 3/day   premium: unlimited
  | 'advanced_optimization'    // premium only
  | 'adaptive_coaching'        // premium only — full behavioral intelligence coach
  | 'deep_insights'            // premium only
  | 'weekly_reflections'       // premium only
  | 'unlimited_rescheduling'   // premium only
  | 'advanced_analytics';      // premium only

// ─── A single feature definition ──────────────────────────────────────────────
export interface FeatureDef {
  id:           FeatureId;
  name:         string;
  description:  string;
  /** Short reason shown in the UpgradePrompt */
  promptHook:   string;
  plan:         Plan;
  /** For free features: how many uses are allowed per day (undefined = unlimited) */
  dailyLimit?:  number;
  icon:         string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
export interface PricingPlan {
  id:       'monthly' | 'annual' | 'lifetime';
  label:    string;
  price:    string;
  period:   string;
  badge?:   string;
  savings?: string;
}
