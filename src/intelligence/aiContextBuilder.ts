/**
 * Assembles the full payload for every AI coaching / scheduling request.
 */
import { useAppStore } from '../store/useAppStore';
import { generateBehaviorProfile } from '../personalization/behaviorProfile';
import { fetchRecentTaskEvents } from '../repositories/taskEventsRepo';
import { fetchUserMetrics } from '../repositories/userMetricsRepo';
import { fetchCachedUserInsights, refreshUserInsights } from '../repositories/insightsRepo';
import { generateInsights } from './insightsEngine';
import type {
  AICoachingContext,
  OnboardingProfileSnapshot,
  RecentTaskHistoryItem,
  TaskEventRow,
  UserInsights,
} from './types';
import { EMPTY_USER_METRICS } from './types';

function buildOnboardingSnapshot(): OnboardingProfileSnapshot {
  const { onboardingData, account, wakeTime, sleepTime } = useAppStore.getState();
  return {
    procrastinationType: onboardingData.procrastinationType,
    peakTime: onboardingData.peakTime,
    coachStyle: onboardingData.coaching,
    wakeTimeMinutes: wakeTime,
    sleepTimeMinutes: sleepTime,
    name: account.name,
    email: account.email,
  };
}

function buildRecentTaskHistory(events: TaskEventRow[]): RecentTaskHistoryItem[] {
  const latest = new Map<string, RecentTaskHistoryItem>();

  for (const e of events) {
    if (latest.has(e.task_id)) continue;
    latest.set(e.task_id, {
      taskId: e.task_id,
      title: e.task_title,
      lastEventType: e.event_type,
      lastOccurredAt: e.occurred_at,
      durationMinutes: e.duration_minutes,
    });
  }

  return [...latest.values()].slice(0, 20);
}

function buildCoachingDirectives(
  onboarding: OnboardingProfileSnapshot,
  insights: UserInsights,
): string[] {
  const directives: string[] = [];

  if (onboarding.coachStyle === 'strict') {
    directives.push('Use firm accountability language; call out avoidance directly.');
  } else if (onboarding.coachStyle === 'supportive') {
    directives.push('Lead with encouragement; celebrate small wins before pushing harder.');
  } else {
    directives.push('Balance empathy with practical next steps.');
  }

  if (onboarding.procrastinationType === 'overwhelmed_tasks') {
    directives.push('Limit visible tasks to 3; break work into smaller blocks.');
  }
  if (onboarding.procrastinationType === 'dont_know_start') {
    directives.push('Always suggest a concrete first action for ambiguous tasks.');
  }
  if (onboarding.procrastinationType === 'easily_distracted') {
    directives.push('Protect peak focus windows; minimize context switching.');
  }

  if (insights.bestFocusPeriod && insights.bestFocusPeriod !== 'Unknown') {
    directives.push(`Best focus period signal: ${insights.bestFocusPeriod}.`);
  }

  for (const pattern of insights.procrastinationPatterns.filter((p) => p.severity !== 'low').slice(0, 2)) {
    directives.push(`Counter pattern "${pattern.label}": ${pattern.description}`);
  }

  return directives;
}

/**
 * Build the complete AI coaching context from local profile + Supabase behavioral data.
 * Falls back to locally computed insights when cloud cache is empty.
 */
export async function buildAICoachingContext(): Promise<AICoachingContext> {
  const onboarding = buildOnboardingSnapshot();
  const behaviorProfile = generateBehaviorProfile({
    procrastinationType: onboarding.procrastinationType,
    peakTime: onboarding.peakTime,
    wakeTimeMinutes: onboarding.wakeTimeMinutes,
    sleepTimeMinutes: onboarding.sleepTimeMinutes,
    coachStyle: onboarding.coachStyle,
  });

  const { data: events } = await fetchRecentTaskEvents(200, 30);
  const { data: metrics } = await fetchUserMetrics();

  let insights: UserInsights;
  const { data: cached } = await fetchCachedUserInsights();

  if (cached && events.length === 0) {
    insights = cached;
  } else if (events.length > 0) {
    const { data: refreshed } = await refreshUserInsights(events, behaviorProfile);
    insights = refreshed;
  } else if (cached) {
    insights = cached;
  } else {
    insights = generateInsights(events, behaviorProfile);
  }

  return {
    generatedAt: new Date().toISOString(),
    onboardingProfile: onboarding,
    behaviorProfile,
    metrics: metrics ?? { ...EMPTY_USER_METRICS },
    insights,
    recentTaskHistory: buildRecentTaskHistory(events),
    coachingDirectives: buildCoachingDirectives(onboarding, insights),
  };
}
