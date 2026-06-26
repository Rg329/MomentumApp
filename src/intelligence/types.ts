/**
 * Behavioral Intelligence — shared types for events, metrics, insights, and AI context.
 */

// ─── Task events ─────────────────────────────────────────────────────────────

export const TASK_EVENT_TYPES = [
  'task_created',
  'task_started',
  'task_completed',
  'task_skipped',
  'task_rescheduled',
] as const;

export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

export type TaskEventMetadata = {
  source?: 'brain_dump' | 'schedule' | 'focus_mode' | 'manual';
  previous_time?: string;
  new_time?: string;
  skip_reason?: string;
  [key: string]: unknown;
};

export type TaskEventRow = {
  id: string;
  user_id: string;
  task_id: string;
  event_type: TaskEventType;
  task_title: string | null;
  duration_minutes: number | null;
  metadata: TaskEventMetadata;
  occurred_at: string;
  created_at: string;
};

export type TrackTaskEventInput = {
  taskId: string;
  eventType: TaskEventType;
  taskTitle?: string | null;
  durationMinutes?: number | null;
  metadata?: TaskEventMetadata;
  occurredAt?: string;
};

// ─── User metrics ────────────────────────────────────────────────────────────

export type UserMetricsRow = {
  user_id: string;
  tasks_created: number;
  tasks_started: number;
  tasks_completed: number;
  tasks_skipped: number;
  tasks_rescheduled: number;
  completion_rate: number;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  updated_at: string;
};

export type UserMetrics = {
  tasksCreated: number;
  tasksStarted: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksRescheduled: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  updatedAt: string | null;
};

export const EMPTY_USER_METRICS: UserMetrics = {
  tasksCreated: 0,
  tasksStarted: 0,
  tasksCompleted: 0,
  tasksSkipped: 0,
  tasksRescheduled: 0,
  completionRate: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  updatedAt: null,
};

// ─── Insights ────────────────────────────────────────────────────────────────

export type CompletionTrendPoint = {
  date: string;
  completed: number;
  skipped: number;
  started: number;
  completionRate: number;
};

export type ProcrastinationPattern = {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
};

export type UserInsights = {
  bestFocusPeriod: string;
  completionTrends: CompletionTrendPoint[];
  procrastinationPatterns: ProcrastinationPattern[];
  generatedAt: string;
};

export type UserInsightsRow = {
  user_id: string;
  best_focus_period: string | null;
  completion_trends: CompletionTrendPoint[];
  procrastination_patterns: ProcrastinationPattern[];
  generated_at: string;
  updated_at: string;
};

// ─── AI coaching context ─────────────────────────────────────────────────────

export type OnboardingProfileSnapshot = {
  procrastinationType: string | null;
  peakTime: string | null;
  coachStyle: string | null;
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  name: string | null;
  email: string | null;
};

export type RecentTaskHistoryItem = {
  taskId: string;
  title: string | null;
  lastEventType: TaskEventType;
  lastOccurredAt: string;
  durationMinutes: number | null;
};

export type AICoachingContext = {
  generatedAt: string;
  onboardingProfile: OnboardingProfileSnapshot;
  behaviorProfile: import('../personalization/behaviorProfile').BehaviorProfile;
  metrics: UserMetrics;
  insights: UserInsights;
  recentTaskHistory: RecentTaskHistoryItem[];
  coachingDirectives: string[];
};
