/**
 * Merge cloud + queued local events and derive metrics for coaching / scheduling.
 */
import type {
  TaskEventRow,
  TrackTaskEventInput,
  UserMetrics,
} from './types';
import { EMPTY_USER_METRICS } from './types';

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

export function pendingEventToRow(input: TrackTaskEventInput, index: number): TaskEventRow {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  return {
    id: `pending-${index}-${input.taskId}`,
    user_id: 'local',
    task_id: input.taskId,
    event_type: input.eventType,
    task_title: input.taskTitle ?? null,
    duration_minutes: input.durationMinutes ?? null,
    metadata: input.metadata ?? {},
    occurred_at: occurredAt,
    created_at: occurredAt,
  };
}

/** Merge server events with queued local events, newest first per task for history. */
export function mergeEventSources(
  cloudEvents: TaskEventRow[],
  pendingEvents: TrackTaskEventInput[],
): TaskEventRow[] {
  const pendingRows = pendingEvents.map(pendingEventToRow);
  const byKey = new Map<string, TaskEventRow>();

  for (const event of [...cloudEvents, ...pendingRows]) {
    const key = `${event.task_id}:${event.event_type}:${event.occurred_at}`;
    byKey.set(key, event);
  }

  return [...byKey.values()].sort(
    (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at),
  );
}

/** Client-side metrics rollup when cloud metrics are empty or stale. */
export function computeMetricsFromEvents(events: TaskEventRow[]): UserMetrics {
  if (!events.length) return { ...EMPTY_USER_METRICS };

  const counts = {
    task_created: 0,
    task_started: 0,
    task_completed: 0,
    task_skipped: 0,
    task_rescheduled: 0,
  };

  const completionDays = new Set<string>();

  for (const e of events) {
    if (e.event_type in counts) {
      counts[e.event_type as keyof typeof counts] += 1;
    }
    if (e.event_type === 'task_completed') {
      completionDays.add(isoDate(e.occurred_at));
    }
  }

  const denom = counts.task_completed + counts.task_skipped;
  const completionRate = denom > 0 ? counts.task_completed / denom : 0;

  const sortedDays = [...completionDays].sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of sortedDays) {
    if (!prev) {
      run = 1;
    } else {
      const prevDate = new Date(prev + 'T12:00:00');
      const curDate = new Date(day + 'T12:00:00');
      const diff = (curDate.getTime() - prevDate.getTime()) / 86_400_000;
      run = diff === 1 ? run + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, run);
    prev = day;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (sortedDays.length) {
    const last = sortedDays[sortedDays.length - 1];
    const lastDate = new Date(last + 'T12:00:00');
    const todayDate = new Date(today + 'T12:00:00');
    const gap = (todayDate.getTime() - lastDate.getTime()) / 86_400_000;
    if (gap === 0 || gap === 1) {
      currentStreak = run;
    }
  }

  return {
    tasksCreated: counts.task_created,
    tasksStarted: counts.task_started,
    tasksCompleted: counts.task_completed,
    tasksSkipped: counts.task_skipped,
    tasksRescheduled: counts.task_rescheduled,
    completionRate,
    currentStreak,
    bestStreak,
    lastActiveDate: sortedDays[sortedDays.length - 1] ?? null,
    updatedAt: new Date().toISOString(),
  };
}
