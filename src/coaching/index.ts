export type {
  CoachingSurface,
  CoachingMessage,
  CoachingContext,
  CoachingOptions,
  DailyAnalytics,
  WeeklyCoachingReport,
} from './types';

export { buildCoachingContext } from './contextBuilder';
export { applyBehaviorToScheduleHints } from '../scheduling/behaviorScheduleHints';
export type { BehaviorScheduleAdjustment } from '../scheduling/behaviorScheduleHints';
export { primarySignal, rankBehavioralSignals, hasEnoughBehavioralData } from './signals';
export { generateCoachingMessage, generateFocusCoachingLine } from './engine';
export { computeDailyAnalytics, buildWeeklyReport } from './analytics';
export { useBehavioralCoach } from './useBehavioralCoach';
export type { BehavioralCoachState } from './useBehavioralCoach';
