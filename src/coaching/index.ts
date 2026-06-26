export type {
  CoachingSurface,
  CoachingMessage,
  CoachingContext,
  CoachingOptions,
  DailyAnalytics,
  WeeklyCoachingReport,
} from './types';

export { buildCoachingContext } from './contextBuilder';
export { generateCoachingMessage, generateFocusCoachingLine } from './engine';
export { computeDailyAnalytics, buildWeeklyReport } from './analytics';
export { useBehavioralCoach } from './useBehavioralCoach';
export type { BehavioralCoachState } from './useBehavioralCoach';
