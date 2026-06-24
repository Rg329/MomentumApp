import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { derivePersonalization } from './engine';
import type { PersonalizationContext } from './types';

/**
 * Reads the persisted onboarding data from Zustand and returns a fully
 * derived PersonalizationContext.  Re-computes only when profile changes.
 */
export function usePersonalization(): PersonalizationContext {
  const { onboardingData } = useAppStore();

  return useMemo(
    () =>
      derivePersonalization(
        onboardingData.procrastinationType,
        onboardingData.peakTime,
        onboardingData.coaching,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onboardingData.procrastinationType, onboardingData.peakTime, onboardingData.coaching],
  );
}
