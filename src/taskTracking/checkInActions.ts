import { useAppStore } from '../store/useAppStore';
import { trackTaskCompleted, trackTaskSkipped } from '../intelligence/eventTracker';
import type { TaskEventMetadata } from '../intelligence/types';
import { NOTIFICATIONS_ENABLED } from '../notifications/config';
import { trackFunnelEvent } from '../analytics/funnelTracker';

type TrackSource = NonNullable<TaskEventMetadata['source']>;

async function cancelMissedForTask(taskId: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  const { cancelMissedTaskNotifications } = await import('../notifications/notificationService');
  await cancelMissedTaskNotifications([taskId]).catch(() => {});
}

/** Mark a scheduled block done and log behavioral event. */
export function completeTaskWithTracking(
  taskId: string,
  taskTitle: string,
  durationMinutes?: number,
  source: TrackSource = 'check_in',
) {
  const store = useAppStore.getState();
  store.markTaskComplete(taskId);
  trackTaskCompleted(taskId, taskTitle, durationMinutes, source);
  trackFunnelEvent('task_completed', { taskId, source });
  void cancelMissedForTask(taskId);
}

/** Mark a scheduled block skipped with reason and log behavioral event. */
export function skipTaskWithTracking(
  taskId: string,
  taskTitle: string,
  skipReason: string,
  source: TrackSource = 'check_in',
) {
  const store = useAppStore.getState();
  store.markTaskSkipped(taskId);
  trackTaskSkipped(taskId, taskTitle, skipReason, source);
  trackFunnelEvent('task_skipped', { taskId, skipReason, source });
  void cancelMissedForTask(taskId);
}
