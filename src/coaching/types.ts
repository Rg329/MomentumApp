import type { AICoachingContext } from '../intelligence/types';
import type { Task } from '../store/useAppStore';
import type { FeatureId } from '../monetization/types';

/** Surfaces where behavioral coaching is rendered. */
export type CoachingSurface =
  | 'daily_summary'
  | 'focus_start'
  | 'focus_midway'
  | 'focus_complete'
  | 'schedule_banner'
  | 'deep_analysis'
  | 'weekly_report'
  | 'pattern_analysis'
  | 'productivity_trends';

export type CoachStyle = 'supportive' | 'balanced' | 'strict';

/** Structured coaching response — always observation → pattern → action. */
export type CoachingMessage = {
  observation: string;
  pattern: string;
  action: string;
  /** Combined single-block text for compact surfaces. */
  summary: string;
  dataSource: 'behavioral' | 'profile_tasks';
  generatedAt: string;
};

export type CoachingContext = AICoachingContext & {
  localTasks: Task[];
  scheduleBlockCount: number;
  hasBehavioralData: boolean;
  isSignedIn: boolean;
  pendingEventCount: number;
  localCompletedCount: number;
  localSkippedCount: number;
};

export type CoachingOptions = {
  currentTaskTitle?: string;
  durationMinutes?: number;
  progressPct?: number;
};

export type DailyAnalytics = {
  momentumScore: number;
  scoreDelta: number | null;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksRescheduled: number;
  completionRatePct: number;
  currentStreak: number;
  bestStreak: number;
  timeDistribution: Array<{ label: string; value: string; pct: number; color: string }>;
};

export type WeeklyCoachingReport = {
  weekLabel: string;
  observation: string;
  pattern: string;
  action: string;
  weekCompletionPct: number;
  strongestDay: string | null;
  totalCompleted: number;
};
