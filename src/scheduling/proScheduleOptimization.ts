/**
 * Pro-only schedule enhancements — behavioral replanning free users do not receive.
 */
import type { ScheduleHints } from '../personalization/types';
import type { CoachingContext } from '../coaching/types';
import type { BehaviorScheduleAdjustment } from './behaviorScheduleHints';

export type ProScheduleOptimizationResult = {
  hints: ScheduleHints;
  summary: string | null;
  rules: string[];
};

export function applyProScheduleEnhancements(
  base: ScheduleHints,
  behavior: BehaviorScheduleAdjustment | null,
  ctx: CoachingContext | null,
  procrastinationType: string | null,
): ProScheduleOptimizationResult {
  const hints: ScheduleHints = { ...base };
  const rules: string[] = behavior?.appliedRules ? [...behavior.appliedRules] : [];

  hints.maxVisibleTasks = Math.max(hints.maxVisibleTasks, 5);

  if (procrastinationType === 'underestimate_time') {
    hints.bufferMultiplier = Math.max(hints.bufferMultiplier, 1.35);
    if (!rules.some((r) => r.includes('buffer'))) {
      rules.push('Extra time buffers — your profile tends to underestimate duration.');
    }
  }

  if (procrastinationType === 'easily_distracted') {
    hints.chunkThresholdMinutes = Math.min(hints.chunkThresholdMinutes, 35);
    if (!rules.some((r) => r.includes('split') || r.includes('block'))) {
      rules.push('Shorter focus blocks with breaks — built for distraction-prone days.');
    }
  }

  if (ctx?.insights?.bestFocusPeriod) {
    rules.push(`Peak work aligned to when you actually finish tasks: ${ctx.insights.bestFocusPeriod}.`);
  }

  if (ctx?.metrics && ctx.metrics.tasksSkipped > ctx.metrics.tasksCompleted && ctx.metrics.tasksSkipped >= 2) {
    hints.breakLargeTasks = true;
    hints.chunkThresholdMinutes = Math.min(hints.chunkThresholdMinutes, 30);
    if (!rules.some((r) => r.includes('Smaller') || r.includes('finish rate'))) {
      rules.push('Plan trimmed for follow-through — you skip less when blocks are smaller.');
    }
  }

  const headline = rules[0] ?? 'Smarter task order, fuller day, and peak-focus placement.';
  hints.scheduleRationale = `${base.scheduleRationale} Pro optimization: ${headline}`;

  return {
    hints,
    summary: rules.length ? `Pro adapted this plan: ${rules[0]}` : 'Pro optimization applied to your schedule.',
    rules,
  };
}
