import type { BehaviorProfile } from './behaviorProfile';

// ─── Core profile enums ────────────────────────────────────────────────────────
// Values match the option keys in src/data/onboardingOptions.ts exactly.

/** Primary personalization variable — the user's specific procrastination pattern. */
export type ProcrastinationType =
  | 'overwhelmed_tasks'
  | 'waiting_motivation'
  | 'dont_know_start'
  | 'easily_distracted'
  | 'changing_plans'
  | 'underestimate_time';

/** @deprecated Use ProcrastinationType. Kept for internal engine compatibility. */
export type Blocker = ProcrastinationType;

export type PeakTime = 'morning' | 'afternoon' | 'evening';

export type CoachStyle = 'supportive' | 'balanced' | 'strict';

/** Canonical user profile derived from onboarding selections. */
export interface UserProfile {
  procrastinationType: ProcrastinationType | null;
  peakTime:            PeakTime            | null;
  coachStyle:          CoachStyle          | null;
  wakeTimeMinutes:     number;
  sleepTimeMinutes:    number;
}

// ─── Schedule intelligence ─────────────────────────────────────────────────────
/** Hints consumed by the (future) AI scheduling engine. */
export interface ScheduleHints {
  prioritizeEarlyHours: boolean;
  prioritizeLateHours: boolean;
  breakLargeTasks: boolean;
  maxVisibleTasks: number;
  energyPattern: 'front-loaded' | 'balanced' | 'back-loaded';
  bufferMultiplier: number;
  chunkThresholdMinutes: number;
  scheduleRationale: string;
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  productiveMinutesAvailable: number;
  peakFocusStartMinutes: number;
  peakFocusEndMinutes: number;
}

// ─── Coaching copy ─────────────────────────────────────────────────────────────
export interface CoachingMessages {
  addFirstTask:        string;
  capacityRealistic:   string;
  capacityOverloaded:  string;
  focusStart:          string;
  focusMidway:         string;
  focusComplete:       string;
  dailySummary:        string;
}

// Re-exported from behaviorProfile.ts for convenience.
export type { BehaviorProfile, BehaviorProfileInput } from './behaviorProfile';

// ─── Full personalization context ──────────────────────────────────────────────
export interface PersonalizationContext {
  profile: UserProfile;
  behaviorProfile: BehaviorProfile;

  dashboardGreeting:  string;
  dashboardSubtext:   string;
  motivationalQuotes: string[];
  emptyStateMessage:  string;

  coaching: CoachingMessages;
  scheduleHints: ScheduleHints;

  tone: {
    style:        CoachStyle | 'default';
    density:      'comfortable' | 'compact';
    summaryTone:  'celebratory' | 'analytical' | 'encouraging';
    badgeLabel:   string;
    badgeColor:   string;
  };
}
