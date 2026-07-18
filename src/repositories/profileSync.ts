import { useAppStore } from '../store/useAppStore';
import { upsertMyProfile, fetchMyProfile } from './profileRepo';

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

/**
 * Pull cloud profile into local store (fills gaps — does not wipe local tasks/schedule).
 */
export async function hydrateProfileFromSupabase() {
  try {
    const { data: row, error } = await fetchMyProfile();
    if (error || !row) return { data: null, error };

    const state = useAppStore.getState();

    if (row.name || row.email) {
      state.setAccount({
        name: row.name ?? state.account.name,
        email: row.email ?? state.account.email,
      });
    }

    const onboardingPatch: Record<string, string | null> = {};
    if (!state.onboardingData.procrastinationType && row.procrastination_type) {
      onboardingPatch.procrastinationType = row.procrastination_type;
    }
    if (!state.onboardingData.peakTime && row.peak_time) {
      onboardingPatch.peakTime = row.peak_time;
    }
    if (!state.onboardingData.coaching && row.coach_style) {
      onboardingPatch.coaching = row.coach_style;
    }
    if (Object.keys(onboardingPatch).length > 0) {
      state.setOnboardingData(onboardingPatch);
    }

    if (row.wake_time != null && !state.hasConfirmedDayWindow) {
      state.setWakeTime(row.wake_time);
    }
    if (row.sleep_time != null && !state.hasConfirmedDayWindow) {
      state.setSleepTime(row.sleep_time);
    }

    return { data: row, error: null };
  } catch (error) {
    console.warn('[Profile] Could not hydrate profile:', error);
    return { data: null, error };
  }
}
