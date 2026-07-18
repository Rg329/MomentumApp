import { syncOnboardingProfileToSupabase, hydrateProfileFromSupabase } from '../repositories/profileSync';
import { flushPendingEvents } from '../intelligence/localEventQueue';
import { fetchRecentTaskEvents } from '../repositories/taskEventsRepo';
import { refreshUserMetrics } from '../repositories/userMetricsRepo';
import { refreshUserInsights } from '../repositories/insightsRepo';
import { generateBehaviorProfile } from '../personalization/behaviorProfile';
import { useAppStore } from '../store/useAppStore';

/**
 * Run after a successful Supabase sign-in:
 * hydrate profile → push local changes → flush queued events → refresh metrics/insights.
 */
export async function runPostSignInSync(): Promise<void> {
  await hydrateProfileFromSupabase();
  await syncOnboardingProfileToSupabase();

  const { synced, failed } = await flushPendingEvents();
  if (synced > 0 || failed === 0) {
    await refreshUserMetrics().catch(() => {});
  }

  const { onboardingData, wakeTime, sleepTime } = useAppStore.getState();
  const behavior = generateBehaviorProfile({
    procrastinationType: onboardingData.procrastinationType,
    peakTime: onboardingData.peakTime,
    wakeTimeMinutes: wakeTime,
    sleepTimeMinutes: sleepTime,
    coachStyle: onboardingData.coaching,
  });

  const { data: events } = await fetchRecentTaskEvents(200, 30);
  if (events.length > 0) {
    await refreshUserInsights(events, behavior).catch(() => {});
  }

  if (synced > 0) {
    console.info(`[Auth] Synced ${synced} queued behavioral event(s) after sign-in.`);
  }
  if (failed > 0) {
    console.warn(`[Auth] ${failed} queued event(s) could not sync — will retry next sign-in.`);
  }
}
