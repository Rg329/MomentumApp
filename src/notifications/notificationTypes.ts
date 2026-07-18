/** Notification payload `data.type` values — used for scheduling and deep links. */
export const NOTIFICATION_TYPES = {
  MORNING:        'morning',
  TASK_REMINDER:  'task_reminder',
  MISSED_TASK:    'missed_task',
  SCHEDULE_READY: 'schedule_ready',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const ANDROID_CHANNELS = {
  DAILY:    'daily-reminders',
  TASKS:    'task-reminders',
  MISSED:   'missed-tasks',
  SCHEDULE: 'schedule-ready',
} as const;
