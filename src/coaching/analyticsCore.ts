import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { CoachingContext } from './types';
import type { DailyAnalytics } from './types';

function computeMomentumScore(ctx: CoachingContext): number {
  const { metrics, isSignedIn, localCompletedCount, localSkippedCount, pendingEventCount } = ctx;

  if (!isSignedIn) {
    const activity = localCompletedCount + localSkippedCount + pendingEventCount;
    if (activity === 0 && ctx.localTasks.length === 0) return 0;
    const localRate = localCompletedCount + localSkippedCount > 0
      ? localCompletedCount / (localCompletedCount + localSkippedCount)
      : 0.5;
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(25 + localRate * 35 + Math.min(localCompletedCount, 5) * 6 + Math.min(pendingEventCount, 5) * 2),
      ),
    );
  }

  const rateScore = metrics.completionRate * 55;
  const streakScore = Math.min(metrics.currentStreak, 14) * 2.5;
  const volumeScore = Math.min(metrics.tasksCompleted, 25) * 1.2;
  const reschedulePenalty = Math.min(metrics.tasksRescheduled * 1.5, 12);

  let score = rateScore + streakScore + volumeScore - reschedulePenalty;

  if (!ctx.hasBehavioralData && ctx.localTasks.length > 0) {
    score = 35 + Math.min(ctx.localTasks.length, 5) * 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreDelta(ctx: CoachingContext): number | null {
  const trends = ctx.insights.completionTrends;
  if (trends.length < 2) return null;

  const yesterday = trends[trends.length - 2];
  const today = trends[trends.length - 1];
  const denomY = yesterday.completed + yesterday.skipped;
  const denomT = today.completed + today.skipped;
  if (denomY === 0 || denomT === 0) return null;

  const delta = Math.round((today.completionRate - yesterday.completionRate) * 100);
  return delta === 0 ? null : delta;
}

export function computeDailyAnalytics(ctx: CoachingContext): DailyAnalytics {
  const score = computeMomentumScore(ctx);
  const delta = scoreDelta(ctx);
  const { metrics, isSignedIn, localCompletedCount, localSkippedCount } = ctx;

  const tasksCompleted = isSignedIn ? metrics.tasksCompleted : localCompletedCount;
  const tasksSkipped = isSignedIn ? metrics.tasksSkipped : localSkippedCount;
  const tasksRescheduled = metrics.tasksRescheduled;
  const completionRatePct = isSignedIn
    ? Math.round(metrics.completionRate * 100)
    : (localCompletedCount + localSkippedCount > 0
      ? Math.round((localCompletedCount / (localCompletedCount + localSkippedCount)) * 100)
      : 0);

  const deepWorkMins = ctx.localTasks.reduce((s, t) => s + t.durationMinutes, 0);
  const breakMins = Math.max(0, ctx.scheduleBlockCount - ctx.localTasks.length) * 15;
  const total = deepWorkMins + breakMins || 1;
  const localStreak = useAppStore.getState().currentStreak;

  return {
    momentumScore: score,
    scoreDelta: delta,
    tasksCompleted,
    tasksSkipped,
    tasksRescheduled,
    completionRatePct,
    currentStreak: isSignedIn ? metrics.currentStreak : localStreak,
    bestStreak: isSignedIn ? metrics.bestStreak : useAppStore.getState().longestStreak,
    timeDistribution: [
      {
        label: 'Deep Work',
        value: deepWorkMins >= 60 ? `${(deepWorkMins / 60).toFixed(1)}h` : `${deepWorkMins}m`,
        pct: Math.min(100, Math.round((deepWorkMins / total) * 100)),
        color: Colors.primary,
      },
      {
        label: 'Breaks',
        value: breakMins >= 60 ? `${(breakMins / 60).toFixed(1)}h` : `${breakMins}m`,
        pct: Math.min(100, Math.round((breakMins / total) * 100)),
        color: Colors.secondaryFixedDim,
      },
      {
        label: 'Scheduled Blocks',
        value: String(ctx.scheduleBlockCount),
        pct: Math.min(100, Math.round((ctx.scheduleBlockCount / Math.max(ctx.scheduleBlockCount, 8)) * 100)),
        color: Colors.secondary,
      },
    ],
  };
}
