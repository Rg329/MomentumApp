/**
 * Pure personalization engine.
 * Takes raw onboarding strings from the store and returns a fully typed
 * PersonalizationContext.  No React, no side-effects.
 */
import type {
  ProcrastinationType, PeakTime, CoachStyle, UserProfile,
  ScheduleHints, PersonalizationContext,
} from './types';
import {
  GREETINGS, SUBTEXTS, QUOTES, EMPTY_STATES,
  COACHING, SCHEDULE_RATIONALE, BADGE_LABELS, BADGE_COLORS,
} from './content';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toCoachStyle(raw: string | null): CoachStyle | 'default' {
  if (raw === 'supportive' || raw === 'balanced' || raw === 'strict') return raw;
  return 'default';
}
function toProcrastinationType(raw: string | null): ProcrastinationType | 'default' {
  if (
    raw === 'overwhelmed_tasks'  || raw === 'waiting_motivation' ||
    raw === 'dont_know_start'    || raw === 'easily_distracted'  ||
    raw === 'changing_plans'     || raw === 'underestimate_time'
  ) return raw as ProcrastinationType;
  return 'default';
}
function toPeakTime(raw: string | null): PeakTime | null {
  if (raw === 'morning' || raw === 'afternoon' || raw === 'evening') return raw;
  return null;
}
function timeSlot(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

// ─── Schedule hints ────────────────────────────────────────────────────────────
function buildScheduleHints(pt: ProcrastinationType | 'default', peakTime: PeakTime | null): ScheduleHints {
  // Map each procrastination pattern to the scheduling behaviour that counters it.
  const breaksLargeTasks   = pt === 'overwhelmed_tasks' || pt === 'waiting_motivation' || pt === 'underestimate_time';
  const limitsVisibleTasks = pt === 'overwhelmed_tasks' || pt === 'dont_know_start';
  const needsBuffer        = pt === 'underestimate_time';

  return {
    prioritizeEarlyHours:  peakTime === 'morning',
    prioritizeLateHours:   peakTime === 'evening',
    breakLargeTasks:       breaksLargeTasks,
    maxVisibleTasks:       limitsVisibleTasks ? 3 : 8,
    energyPattern:
      peakTime === 'morning' ? 'front-loaded' :
      peakTime === 'evening' ? 'back-loaded'  : 'balanced',
    bufferMultiplier:      needsBuffer ? 1.5 : 1.0,
    chunkThresholdMinutes:
      pt === 'waiting_motivation' ? 30 :
      pt === 'overwhelmed_tasks'  ? 45 :
      pt === 'underestimate_time' ? 60 : 90,
    scheduleRationale:
      pt !== 'default'
        ? SCHEDULE_RATIONALE[pt] ?? SCHEDULE_RATIONALE.default
        : SCHEDULE_RATIONALE.default,
  };
}

// ─── Main engine function ─────────────────────────────────────────────────────
/**
 * Derives a full PersonalizationContext from raw onboarding values.
 * Pass `nowHour` (0-23) so the engine can pick the right time-aware greeting.
 */
export function derivePersonalization(
  rawProcrastinationType: string | null,
  rawPeakTime:            string | null,
  rawCoachStyle:          string | null,
  nowHour:                number = new Date().getHours(),
): PersonalizationContext {
  const coachStyle        = toCoachStyle(rawCoachStyle);
  const procrastinationType = toProcrastinationType(rawProcrastinationType);
  const peakTime          = toPeakTime(rawPeakTime);
  const slot              = timeSlot(nowHour);

  const profile: UserProfile = {
    procrastinationType: procrastinationType !== 'default' ? procrastinationType : null,
    peakTime,
    coachStyle: coachStyle !== 'default' ? coachStyle : null,
  };

  return {
    profile,

    dashboardGreeting:  GREETINGS[coachStyle][slot],
    dashboardSubtext:   SUBTEXTS[coachStyle][procrastinationType],
    motivationalQuotes: QUOTES[coachStyle],
    emptyStateMessage:  EMPTY_STATES[coachStyle],

    coaching:      COACHING[coachStyle],
    scheduleHints: buildScheduleHints(procrastinationType, peakTime),

    tone: {
      style:       coachStyle,
      density:     procrastinationType === 'overwhelmed_tasks' ? 'compact' : 'comfortable',
      summaryTone:
        coachStyle === 'strict'     ? 'analytical'  :
        coachStyle === 'supportive' ? 'celebratory' : 'encouraging',
      badgeLabel:  BADGE_LABELS[coachStyle],
      badgeColor:  BADGE_COLORS[coachStyle],
    },
  };
}
