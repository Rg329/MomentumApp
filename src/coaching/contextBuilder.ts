/**
 * Assembles coaching context from Supabase behavioral data + local app state.
 */
import { buildAICoachingContext } from '../intelligence/aiContextBuilder';
import { useAppStore } from '../store/useAppStore';
import type { CoachingContext } from './types';

export async function buildCoachingContext(): Promise<CoachingContext> {
  const base = await buildAICoachingContext();
  const { tasks, scheduleBlocks } = useAppStore.getState();

  const hasBehavioralData =
    base.metrics.tasksCompleted > 0
    || base.metrics.tasksStarted > 0
    || base.metrics.tasksSkipped > 0
    || base.metrics.tasksRescheduled > 0
    || base.recentTaskHistory.length > 0;

  return {
    ...base,
    localTasks: tasks,
    scheduleBlockCount: scheduleBlocks.length,
    hasBehavioralData,
  };
}
