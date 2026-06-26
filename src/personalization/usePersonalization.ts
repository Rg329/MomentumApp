import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { derivePersonalization } from './engine';
import type { PersonalizationContext } from './types';

/**
 * Reads persisted onboarding data from Zustand and returns a fully
 * derived PersonalizationContext including behavior profile.
 */
export function usePersonalization(): PersonalizationContext {
  const { onboardingData, wakeTime, sleepTime } = useAppStore();

  return useMemo(
    () =>
      derivePersonalization(
        onboardingData.procrastinationType,
        onboardingData.peakTime,
        onboardingData.coaching,
        wakeTime,
        sleepTime,
      ),
    [
      onboardingData.procrastinationType,
      onboardingData.peakTime,
      onboardingData.coaching,
      wakeTime,
      sleepTime,
    ],
  );
}
