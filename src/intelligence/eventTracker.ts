/**
 * Client-side event tracking facade.
 * Fire-and-forget — never blocks UI; logs warnings on failure.
 * Unsigned users: events queue locally and sync on sign-in.
 */
import type { Task } from '../store/useAppStore';
import { trackTaskEvent as repoTrackTaskEvent } from '../repositories/taskEventsRepo';
import { fetchRecentTaskEvents } from '../repositories/taskEventsRepo';
import { refreshUserInsights } from '../repositories/insightsRepo';
import { generateBehaviorProfile } from '../personalization/behaviorProfile';
import { useAppStore } from '../store/useAppStore';
import type { TaskEventMetadata } from './types';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { enqueuePendingEvent } from './localEventQueue';

async function refreshInsightsIfNeeded(
  eventType: Parameters<typeof repoTrackTaskEvent>[0]['eventType'],
) {
  if (eventType !== 'task_completed' && eventType !== 'task_skipped') return;

  const { onboardingData, wakeTime, sleepTime } = useAppStore.getState();
  const behavior = generateBehaviorProfile({
    procrastinationType: onboardingData.procrastinationType,
    peakTime: onboardingData.peakTime,
    wakeTimeMinutes: wakeTime,
    sleepTimeMinutes: sleepTime,
    coachStyle: onboardingData.coaching,
  });
  const { data: events } = await fetchRecentTaskEvents(200, 30);
  await refreshUserInsights(events, behavior);
}

async function emit(
  taskId: string,
  eventType: Parameters<typeof repoTrackTaskEvent>[0]['eventType'],
  taskTitle?: string | null,
  durationMinutes?: number | null,
  metadata?: TaskEventMetadata,
) {
  const payload = {
    taskId,
    eventType,
    taskTitle,
    durationMinutes,
    metadata,
    occurredAt: new Date().toISOString(),
  };

  try {
    const signedIn = await isSupabaseSignedIn();
    if (!signedIn) {
      await enqueuePendingEvent(payload);
      return;
    }

    const { error } = await repoTrackTaskEvent(payload);
    if (error) {
      console.warn(`[Intelligence] RPC failed for ${eventType}, queueing locally:`, error.message);
      await enqueuePendingEvent(payload);
      return;
    }

    await refreshInsightsIfNeeded(eventType);
  } catch (error) {
    console.warn(`[Intelligence] Failed to track ${eventType}:`, error);
    try {
      await enqueuePendingEvent(payload);
    } catch {
      // ignore secondary failure
    }
  }
}

export function trackTaskCreated(task: Task, source: TaskEventMetadata['source'] = 'brain_dump') {
  return emit(task.id, 'task_created', task.text, task.durationMinutes, { source });
}

export function trackTaskStarted(
  taskId: string,
  taskTitle: string,
  durationMinutes?: number,
  source: TaskEventMetadata['source'] = 'focus_mode',
) {
  return emit(taskId, 'task_started', taskTitle, durationMinutes ?? null, { source });
}

export function trackTaskCompleted(
  taskId: string,
  taskTitle: string,
  durationMinutes?: number,
  source: TaskEventMetadata['source'] = 'focus_mode',
) {
  return emit(taskId, 'task_completed', taskTitle, durationMinutes ?? null, { source });
}

export function trackTaskSkipped(
  taskId: string,
  taskTitle: string,
  skipReason?: string,
  source: TaskEventMetadata['source'] = 'schedule',
) {
  return emit(taskId, 'task_skipped', taskTitle, null, { source, skip_reason: skipReason });
}

export function trackTaskRescheduled(
  taskId: string,
  taskTitle: string,
  previousTime: string,
  newTime: string,
  source: TaskEventMetadata['source'] = 'schedule',
) {
  return emit(taskId, 'task_rescheduled', taskTitle, null, {
    source,
    previous_time: previousTime,
    new_time: newTime,
  });
}
