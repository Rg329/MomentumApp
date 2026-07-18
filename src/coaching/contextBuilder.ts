/**
 * Assembles coaching context from Supabase behavioral data + local app state.
 */
import { buildAICoachingContext } from '../intelligence/aiContextBuilder';
import { useAppStore } from '../store/useAppStore';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { getPendingEventCount } from '../intelligence/localEventQueue';
import type { CoachingContext } from './types';

export async function buildCoachingContext(): Promise<CoachingContext> {
  const base = await buildAICoachingContext();
  const { tasks, scheduleBlocks, completedTaskIds, skippedTaskIds } = useAppStore.getState();
  const [signedIn, pendingEventCount] = await Promise.all([
    isSupabaseSignedIn(),
    getPendingEventCount(),
  ]);

  const localCompletedCount = completedTaskIds.length;
  const localSkippedCount = skippedTaskIds.length;

  const hasBehavioralData =
    signedIn && (
      base.metrics.tasksCompleted > 0
      || base.metrics.tasksStarted > 0
      || base.metrics.tasksSkipped > 0
      || base.metrics.tasksRescheduled > 0
      || base.recentTaskHistory.length > 0
    )
    || localCompletedCount > 0
    || localSkippedCount > 0
    || pendingEventCount > 0;

  return {
    ...base,
    localTasks: tasks,
    scheduleBlockCount: scheduleBlocks.length,
    hasBehavioralData,
    isSignedIn: signedIn,
    pendingEventCount,
    localCompletedCount,
    localSkippedCount,
  };
}
