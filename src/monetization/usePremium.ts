import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FEATURES, FREE_GENERATION_LIMIT } from './features';
import type { FeatureId } from './types';

/** Returns `true` if today's date string matches stored date */
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().split('T')[0];
}

export interface PremiumHook {
  isPremium:            boolean;
  /** Can the user use this feature right now? */
  canUse:               (id: FeatureId) => boolean;
  /** Remaining free uses for a rate-limited feature (-1 = unlimited) */
  remaining:            (id: FeatureId) => number;
  /** Friendly count label for the generate button */
  generationsLabel:     string;
  /** Has the daily free generation limit been reached? */
  generationsExhausted: boolean;
}

export function usePremium(): PremiumHook {
  const { isPremium, dailyGenerations, lastGenerationDate } = useAppStore();

  return useMemo<PremiumHook>(() => {
    const todayGenerations = isToday(lastGenerationDate) ? dailyGenerations : 0;
    const generationsLeft  = Math.max(0, FREE_GENERATION_LIMIT - todayGenerations);
    const exhausted        = !isPremium && generationsLeft === 0;

    const canUse = (id: FeatureId): boolean => {
      const feat = FEATURES[id];
      if (isPremium)         return true;
      if (feat.plan === 'premium') return false;
      if (feat.dailyLimit !== undefined) return generationsLeft > 0;
      return true;
    };

    const remaining = (id: FeatureId): number => {
      if (isPremium) return -1; // unlimited
      const feat = FEATURES[id];
      if (feat.dailyLimit !== undefined) return generationsLeft;
      return -1;
    };

    // If premium (including trial), unlock quietly: no "Unlimited" badge.
    const generationsLabel = isPremium
      ? ''
      : generationsLeft === FREE_GENERATION_LIMIT
        ? ''
        : generationsLeft > 0
          ? `${generationsLeft} left today`
          : 'Limit reached';

    return { isPremium, canUse, remaining, generationsLabel, generationsExhausted: exhausted };
  }, [isPremium, dailyGenerations, lastGenerationDate]);
}
