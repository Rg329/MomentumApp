/**
 * Behavioral Intelligence API — client-side Supabase layer.
 *
 * | Method                    | Purpose                                      |
 * |---------------------------|----------------------------------------------|
 * | trackTaskCreated          | Log task_created                             |
 * | trackTaskStarted          | Log task_started                             |
 * | trackTaskCompleted        | Log task_completed                           |
 * | trackTaskSkipped          | Log task_skipped                             |
 * | trackTaskRescheduled      | Log task_rescheduled                         |
 * | fetchMetrics              | Read user_metrics                            |
 * | refreshMetrics            | Recompute metrics from event log             |
 * | fetchRecentEvents         | Read task_events                             |
 * | buildAIContext            | Full payload for AI coaching requests        |
 */
export type {
  TaskEventType,
  TaskEventRow,
  TrackTaskEventInput,
  UserMetrics,
  UserInsights,
  CompletionTrendPoint,
  ProcrastinationPattern,
  AICoachingContext,
  OnboardingProfileSnapshot,
  RecentTaskHistoryItem,
} from './types';

export { TASK_EVENT_TYPES, EMPTY_USER_METRICS } from './types';
export { generateInsights } from './insightsEngine';
export { buildAICoachingContext } from './aiContextBuilder';
export {
  trackTaskCreated,
  trackTaskStarted,
  trackTaskCompleted,
  trackTaskSkipped,
  trackTaskRescheduled,
} from './eventTracker';

import { buildAICoachingContext } from './aiContextBuilder';
import { fetchRecentTaskEvents, trackTaskEvent } from '../repositories/taskEventsRepo';
import { fetchUserMetrics, refreshUserMetrics } from '../repositories/userMetricsRepo';
import { fetchCachedUserInsights, refreshUserInsights } from '../repositories/insightsRepo';
import { generateBehaviorProfile } from '../personalization/behaviorProfile';
import { useAppStore } from '../store/useAppStore';
import {
  trackTaskCreated,
  trackTaskStarted,
  trackTaskCompleted,
  trackTaskSkipped,
  trackTaskRescheduled,
} from './eventTracker';

async function refreshInsightsFromStore() {
  const { onboardingData, wakeTime, sleepTime } = useAppStore.getState();
  const behavior = generateBehaviorProfile({
    procrastinationType: onboardingData.procrastinationType,
    peakTime: onboardingData.peakTime,
    wakeTimeMinutes: wakeTime,
    sleepTimeMinutes: sleepTime,
    coachStyle: onboardingData.coaching,
  });
  const { data: events } = await fetchRecentTaskEvents(200, 30);
  return refreshUserInsights(events, behavior);
}

export const IntelligenceAPI = {
  trackTaskEvent,
  trackTaskCreated,
  trackTaskStarted,
  trackTaskCompleted,
  trackTaskSkipped,
  trackTaskRescheduled,
  fetchMetrics: fetchUserMetrics,
  refreshMetrics: refreshUserMetrics,
  fetchRecentEvents: fetchRecentTaskEvents,
  fetchCachedInsights: fetchCachedUserInsights,
  refreshInsights: refreshInsightsFromStore,
  buildAIContext: buildAICoachingContext,
};
