import type { CoachingContext } from './types';
import { MIN_COMPLETED_FOR_COACHING } from './humanCopy';

/** Enough real usage to personalize — not onboarding answers. */
export function hasEnoughBehavioralData(ctx: CoachingContext): boolean {
  return (
    ctx.metrics.tasksCompleted >= 1
    || (ctx.metrics.tasksCompleted >= 1 && ctx.metrics.tasksStarted >= 2)
    || ctx.metrics.tasksSkipped >= 2
    || ctx.metrics.tasksRescheduled >= 3
  );
}

export type BehavioralSignalId =
  | 'high_skip_rate'
  | 'plan_instability'
  | 'start_delay'
  | 'low_follow_through'
  | 'failure_avoidance'
  | 'healthy_rhythm'
  | 'evening_slip'
  | 'long_block_stall'
  | 'morning_edge';

export type RankedSignal = {
  id: BehavioralSignalId;
  priority: number;
};

export function beforeNoonShare(ctx: CoachingContext): number | null {
  const completions = ctx.recentTaskHistory.filter((t) => t.lastEventType === 'task_completed');
  if (completions.length < 2) return null;
  const beforeNoon = completions.filter((t) => new Date(t.lastOccurredAt).getHours() < 12).length;
  return beforeNoon / completions.length;
}

function eveningSlipDetected(ctx: CoachingContext): boolean {
  const risky = ctx.recentTaskHistory.filter(
    (t) => t.lastEventType === 'task_skipped' || t.lastEventType === 'task_rescheduled',
  );
  if (risky.length < 2) return false;
  const evening = risky.filter((t) => new Date(t.lastOccurredAt).getHours() >= 17).length;
  return evening / risky.length >= 0.5;
}

function longBlockStallDetected(ctx: CoachingContext): boolean {
  const longTasks = ctx.localTasks.filter((t) => t.durationMinutes >= 60);
  if (!longTasks.length) return false;
  return longTasks.some((task) => {
    const h = ctx.recentTaskHistory.find((r) => r.taskId === task.id || r.title === task.text);
    return h && (h.lastEventType === 'task_skipped' || h.lastEventType === 'task_rescheduled');
  });
}

/** Rank observed signals — onboarding is never a signal source. */
export function rankBehavioralSignals(ctx: CoachingContext): RankedSignal[] {
  const { metrics, insights } = ctx;
  const ranked: RankedSignal[] = [];

  for (const p of insights.procrastinationPatterns) {
    if (p.id === 'healthy_rhythm') continue;
    const severityBoost = p.severity === 'high' ? 30 : p.severity === 'medium' ? 20 : 10;
    ranked.push({ id: p.id as BehavioralSignalId, priority: severityBoost });
  }

  if (eveningSlipDetected(ctx)) {
    ranked.push({ id: 'evening_slip', priority: 25 });
  }

  if (longBlockStallDetected(ctx)) {
    ranked.push({ id: 'long_block_stall', priority: 22 });
  }

  const noonShare = beforeNoonShare(ctx);
  if (noonShare != null && noonShare >= 0.6) {
    ranked.push({ id: 'morning_edge', priority: 18 });
  }

  if (metrics.tasksRescheduled >= 3) {
    const existing = ranked.find((r) => r.id === 'plan_instability');
    if (existing) existing.priority += 5;
    else ranked.push({ id: 'plan_instability', priority: 24 });
  }

  if (!ranked.length) {
    ranked.push({ id: 'healthy_rhythm', priority: 1 });
  }

  return ranked.sort((a, b) => b.priority - a.priority);
}

export function primarySignal(ctx: CoachingContext): BehavioralSignalId {
  return rankBehavioralSignals(ctx)[0]?.id ?? 'healthy_rhythm';
}

export function secondarySignal(ctx: CoachingContext): BehavioralSignalId {
  const ranked = rankBehavioralSignals(ctx);
  return ranked[1]?.id ?? ranked[0]?.id ?? 'healthy_rhythm';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function todayActivity(ctx: CoachingContext) {
  return ctx.insights.completionTrends.find((p) => p.date === todayIso());
}

export function weekTotals(ctx: CoachingContext) {
  const week = ctx.insights.completionTrends;
  const completed = week.reduce((s, d) => s + d.completed, 0);
  const skipped = week.reduce((s, d) => s + d.skipped, 0);
  return { completed, skipped, denom: completed + skipped };
}

export function strongestWeekday(ctx: CoachingContext): { day: string; count: number } | null {
  const best = [...ctx.insights.completionTrends]
    .filter((d) => d.completed > 0)
    .sort((a, b) => b.completed - a.completed)[0];
  if (!best) return null;
  return {
    day: new Date(best.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }),
    count: best.completed,
  };
}

export function weakestWeekday(ctx: CoachingContext) {
  const weak = [...ctx.insights.completionTrends]
    .filter((d) => d.completed + d.skipped > 0)
    .sort((a, b) => a.completionRate - b.completionRate)[0];
  if (!weak) return null;
  return {
    day: new Date(weak.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }),
    rate: Math.round(weak.completionRate * 100),
  };
}

export function hardestTaskTitle(ctx: CoachingContext): string | null {
  if (!ctx.localTasks.length) return null;
  return [...ctx.localTasks].sort((a, b) => b.durationMinutes - a.durationMinutes)[0]?.text ?? null;
}
