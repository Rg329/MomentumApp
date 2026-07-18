export {
  setupAndroidNotificationChannels,
  setupNotificationCategories,
  requestNotificationPermissions,
  getNotificationPermissionStatus,
  ensureNotificationPermissions,
  scheduleMorningNotification,
  scheduleTaskNotifications,
  scheduleMissedTaskNotifications,
  cancelMissedTaskNotifications,
  notifyScheduleReady,
  handleNotificationResponse,
} from './notificationService';

export {
  processNotificationResponse,
  navigateFromNotificationData,
  handleInitialNotificationDeepLink,
} from './notificationDeepLink';

export { useNotifications } from './useNotifications';

export { NOTIFICATION_TYPES, ANDROID_CHANNELS } from './notificationTypes';

export { NOTIFICATIONS_ENABLED } from './config';

export type { NotificationPermissionStatus } from './notificationService';
