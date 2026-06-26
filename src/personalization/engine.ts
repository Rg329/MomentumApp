/**
 * Pure personalization engine.
 * Takes raw onboarding values from the store and returns a fully typed
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
import { generateBehaviorProfile } from './behaviorProfile';
import type { BehaviorProfile } from './behaviorProfile';

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

function buildScheduleHints(
  pt: ProcrastinationType | 'default',
  behavior: BehaviorProfile,
): ScheduleHints {
  const breaksLargeTasks   = pt === 'overwhelmed_tasks' || pt === 'waiting_motivation' || pt === 'underestimate_time';
  const limitsVisibleTasks = pt === 'overwhelmed_tasks' || pt === 'dont_know_start';
  const needsBuffer        = pt === 'underestimate_time';

  return {
    prioritizeEarlyHours:  behavior.energyArc === 'front-loaded',
    prioritizeLateHours:   behavior.energyArc === 'back-loaded',
    breakLargeTasks:       breaksLargeTasks,
    maxVisibleTasks:       limitsVisibleTasks ? 3 : 8,
    energyPattern:         behavior.energyArc,
    bufferMultiplier:      needsBuffer ? 1.5 : 1.0,
    chunkThresholdMinutes:
      pt === 'waiting_motivation' ? 30 :
      pt === 'overwhelmed_tasks'  ? 45 :
      pt === 'underestimate_time' ? 60 : 90,
    scheduleRationale:
      pt !== 'default'
        ? `${SCHEDULE_RATIONALE[pt] ?? SCHEDULE_RATIONALE.default} ${behavior.schedulingPriority}`
        : behavior.schedulingPriority,
    wakeTimeMinutes: behavior.wakeTimeMinutes,
    sleepTimeMinutes: behavior.sleepTimeMinutes,
    productiveMinutesAvailable: behavior.productiveMinutesAvailable,
    peakFocusStartMinutes: behavior.peakFocusStartMinutes,
    peakFocusEndMinutes: behavior.peakFocusEndMinutes,
  };
}

/**
 * Derives a full PersonalizationContext from raw onboarding values.
 */
export function derivePersonalization(
  rawProcrastinationType: string | null,
  rawPeakTime:            string | null,
  rawCoachStyle:          string | null,
  wakeTimeMinutes:        number,
  sleepTimeMinutes:       number,
  nowHour:                number = new Date().getHours(),
): PersonalizationContext {
  const coachStyle          = toCoachStyle(rawCoachStyle);
  const procrastinationType = toProcrastinationType(rawProcrastinationType);
  const peakTime            = toPeakTime(rawPeakTime);
  const slot                = timeSlot(nowHour);

  const behaviorProfile = generateBehaviorProfile({
    procrastinationType: rawProcrastinationType,
    peakTime: rawPeakTime,
    wakeTimeMinutes,
    sleepTimeMinutes,
    coachStyle: rawCoachStyle,
  });

  const profile: UserProfile = {
    procrastinationType: procrastinationType !== 'default' ? procrastinationType : null,
    peakTime,
    coachStyle: coachStyle !== 'default' ? coachStyle : null,
    wakeTimeMinutes,
    sleepTimeMinutes,
  };

  return {
    profile,
    behaviorProfile,

    dashboardGreeting:  GREETINGS[coachStyle][slot],
    dashboardSubtext:   SUBTEXTS[coachStyle][procrastinationType],
    motivationalQuotes: QUOTES[coachStyle],
    emptyStateMessage:  EMPTY_STATES[coachStyle],

    coaching:      COACHING[coachStyle],
    scheduleHints: buildScheduleHints(procrastinationType, behaviorProfile),

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
