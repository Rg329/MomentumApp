// ─── Core profile enums ────────────────────────────────────────────────────────
// Values match the option keys in src/data/mockData.ts exactly.

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
  /** Primary variable: the specific pattern that causes this user to procrastinate. */
  procrastinationType: ProcrastinationType | null;
  peakTime:            PeakTime            | null;
  coachStyle:          CoachStyle          | null;
}

// ─── Schedule intelligence ─────────────────────────────────────────────────────
/** Hints consumed by the (future) AI scheduling engine. */
export interface ScheduleHints {
  /** Place cognitively demanding tasks early in the day. */
  prioritizeEarlyHours: boolean;
  /** Place cognitively demanding tasks late in the day. */
  prioritizeLateHours: boolean;
  /** Break tasks longer than chunkThresholdMinutes into smaller blocks. */
  breakLargeTasks: boolean;
  /** Maximum tasks shown at once (overwhelm management). */
  maxVisibleTasks: number;
  /** Preferred energy curve for the day. */
  energyPattern: 'front-loaded' | 'balanced' | 'back-loaded';
  /** Multiply all buffer times by this factor (low-energy users get 1.5×). */
  bufferMultiplier: number;
  /** Tasks longer than this (minutes) get chunked when breakLargeTasks is true. */
  chunkThresholdMinutes: number;
  /** Human-readable rationale shown on the schedule screen. */
  scheduleRationale: string;
}

// ─── Coaching copy ─────────────────────────────────────────────────────────────
/** In-context coaching messages surfaced throughout the app. */
export interface CoachingMessages {
  addFirstTask:        string;
  capacityRealistic:   string;
  capacityOverloaded:  string;
  focusStart:          string;
  focusMidway:         string;
  focusComplete:       string;
  dailySummary:        string;
}

// ─── Full personalization context ──────────────────────────────────────────────
/** Everything a screen needs to render personalized content. */
export interface PersonalizationContext {
  profile: UserProfile;

  // Dashboard / BrainDump
  dashboardGreeting:  string;
  dashboardSubtext:   string;
  motivationalQuotes: string[];
  emptyStateMessage:  string;

  // Per-context coaching
  coaching: CoachingMessages;

  // Schedule intelligence (for AI engine)
  scheduleHints: ScheduleHints;

  // UI metadata
  tone: {
    style:        CoachStyle | 'default';
    density:      'comfortable' | 'compact';
    summaryTone:  'celebratory' | 'analytical' | 'encouraging';
    badgeLabel:   string;
    badgeColor:   string;
  };
}
