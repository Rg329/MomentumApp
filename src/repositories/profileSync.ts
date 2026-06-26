import { useAppStore } from '../store/useAppStore';
import { upsertMyProfile } from './profileRepo';

/** Build a Supabase profiles row from the current local app state. */
export function buildProfilePatchFromAppState() {
  const { onboardingData, account, wakeTime, sleepTime } = useAppStore.getState();

  return {
    name: account.name,
    email: account.email,
    procrastination_type: onboardingData.procrastinationType,
    peak_time: onboardingData.peakTime,
    coach_style: onboardingData.coaching,
    wake_time: wakeTime,
    sleep_time: sleepTime,
  };
}

/**
 * Push onboarding + account fields to Supabase when a session exists.
 * Safe to call from auth listeners and post-onboarding screens.
 */
export async function syncOnboardingProfileToSupabase() {
  const patch = buildProfilePatchFromAppState();
  const hasOnboardingData =
    patch.procrastination_type != null ||
    patch.peak_time != null ||
    patch.coach_style != null;

  if (!hasOnboardingData && !patch.name && !patch.email) {
    return { data: null, error: null };
  }

  try {
    return await upsertMyProfile(patch);
  } catch (error) {
    console.warn('[Profile] Could not sync onboarding profile:', error);
    return { data: null, error };
  }
}
