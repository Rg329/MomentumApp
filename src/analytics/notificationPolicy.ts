import type { NotificationStyle } from '../store/useAppStore';

export type NotificationPolicy = {
  taskLeadMinutes: number;
  missedEnabled: boolean;
  scheduleReadyEnabled: boolean;
  sound: boolean;
  categoriesEnabled: boolean;
  morningReminderEnabled: boolean;
};

export function getNotificationPolicy(style: NotificationStyle): NotificationPolicy {
  switch (style) {
    case 'gentle':
      return {
        taskLeadMinutes: 5,
        missedEnabled: true,
        scheduleReadyEnabled: true,
        sound: false,
        categoriesEnabled: true,
        morningReminderEnabled: true,
      };
    case 'minimal':
      return {
        taskLeadMinutes: 0,
        missedEnabled: false,
        scheduleReadyEnabled: false,
        sound: false,
        categoriesEnabled: false,
        morningReminderEnabled: true,
      };
    default:
      return {
        taskLeadMinutes: 10,
        missedEnabled: true,
        scheduleReadyEnabled: true,
        sound: true,
        categoriesEnabled: true,
        morningReminderEnabled: true,
      };
  }
}
