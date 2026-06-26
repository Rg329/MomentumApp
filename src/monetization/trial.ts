/** Trial slice used for premium resolution (matches useAppStore.trial). */
export type TrialSlice = {
  isTrialActive: boolean;
  startedAt: string | null;
  endsAt: string | null;
};

/** True when a trial end timestamp is in the past. */
export function isTrialExpired(endsAt: string | null, now = Date.now()): boolean {
  if (!endsAt) return false;
  return Date.parse(endsAt) <= now;
}

/**
 * Whether the user currently has premium access.
 * - Paid: isPremium with no active trial flag
 * - Trial: isPremium while trial.isTrialActive and endsAt is still in the future
 */
export function hasEffectivePremium(
  isPremium: boolean,
  trial: TrialSlice,
  now = Date.now(),
): boolean {
  if (!isPremium) return false;
  if (!trial.isTrialActive) return true;
  if (!trial.endsAt) return false;
  return !isTrialExpired(trial.endsAt, now);
}

/** Whole days left on an active trial (0 on last day / after expiry). */
export function trialDaysRemaining(endsAt: string | null, now = Date.now()): number {
  if (!endsAt) return 0;
  const ms = Date.parse(endsAt) - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
