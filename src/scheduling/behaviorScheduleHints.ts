/**
 * Adjust schedule hints from observed behavioral signals (Phase D).
 */
import type { ScheduleHints } from '../personalization/types';
import type { CoachingContext } from '../coaching/types';
import { primarySignal } from '../coaching/signals';

export type BehaviorScheduleAdjustment = {
  hints: ScheduleHints;
  primarySignal: string;
  appliedRules: string[];
  rationale: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Layer behavioral adjustments on top of onboarding-derived schedule hints.
 */
export function applyBehaviorToScheduleHints(
  base: ScheduleHints,
  ctx: CoachingContext,
): BehaviorScheduleAdjustment {
  const hints: ScheduleHints = { ...base };
  const appliedRules: string[] = [];
  const signal = primarySignal(ctx);

  switch (signal) {
    case 'evening_slip':
      hints.prioritizeEarlyHours = true;
      hints.prioritizeLateHours = false;
      hints.energyPattern = 'front-loaded';
      hints.peakFocusEndMinutes = clamp(
        hints.peakFocusStartMinutes + 240,
        hints.peakFocusStartMinutes + 60,
        hints.peakFocusEndMinutes,
      );
      appliedRules.push('Deep work moved earlier — your evenings tend to slip.');
      break;

    case 'long_block_stall':
      hints.breakLargeTasks = true;
      hints.chunkThresholdMinutes = clamp(hints.chunkThresholdMinutes, 15, 45);
      hints.bufferMultiplier = Math.max(hints.bufferMultiplier, 1.25);
      appliedRules.push('Long tasks split smaller — hour-plus blocks stall for you.');
      break;

    case 'plan_instability':
      hints.maxVisibleTasks = clamp(hints.maxVisibleTasks, 2, 4);
      hints.energyPattern = 'front-loaded';
      appliedRules.push('Leaner plan — fewer tasks means less reshuffling.');
      break;

    case 'high_skip_rate':
    case 'failure_avoidance':
      hints.breakLargeTasks = true;
      hints.chunkThresholdMinutes = clamp(hints.chunkThresholdMinutes, 15, 30);
      hints.maxVisibleTasks = clamp(hints.maxVisibleTasks, 2, 3);
      hints.bufferMultiplier = Math.max(hints.bufferMultiplier, 1.15);
      appliedRules.push('Smaller blocks and shorter list — finish rate over ambition.');
      break;

    case 'morning_edge':
      hints.prioritizeEarlyHours = true;
      hints.prioritizeLateHours = false;
      hints.energyPattern = 'front-loaded';
      appliedRules.push('Morning-heavy plan — that is when you finish most.');
      break;

    case 'start_delay':
      hints.bufferMultiplier = Math.max(hints.bufferMultiplier, 1.2);
      hints.chunkThresholdMinutes = clamp(hints.chunkThresholdMinutes, 15, 45);
      appliedRules.push('Extra buffer added — you often delay starting after planning.');
      break;

    case 'low_follow_through':
      hints.maxVisibleTasks = clamp(hints.maxVisibleTasks, 2, 4);
      hints.breakLargeTasks = true;
      appliedRules.push('Capped task count — follow-through beats a long list.');
      break;

    default:
      break;
  }

  const rationale = appliedRules.length
    ? `${base.scheduleRationale} ${appliedRules[0]}`
    : base.scheduleRationale;

  hints.scheduleRationale = rationale;

  return {
    hints,
    primarySignal: signal,
    appliedRules,
    rationale,
  };
}
