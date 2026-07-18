import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { navigationRef } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { handleNotificationResponse } from './notificationService';
import { NOTIFICATION_TYPES } from './notificationTypes';

type NotificationData = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Navigate to the screen implied by notification payload data. */
export function navigateFromNotificationData(data: NotificationData | undefined): void {
  if (!data?.type || !navigationRef.isReady()) return;

  const type = String(data.type);

  if (type === NOTIFICATION_TYPES.MORNING || type === NOTIFICATION_TYPES.SCHEDULE_READY) {
    navigationRef.navigate('MainTabs', { screen: 'Schedule' });
    return;
  }

  if (type === NOTIFICATION_TYPES.TASK_REMINDER || type === NOTIFICATION_TYPES.MISSED_TASK) {
    const taskId = asString(data.taskId);
    const taskTitle = asString(data.taskTitle) ?? 'Task';
    const taskDesc = asString(data.taskDesc);
    const scheduledTime = asString(data.scheduledTime);
    const durationMinutes = asNumber(data.durationMinutes);

    const params: RootStackParamList['FocusMode'] = {
      taskId,
      taskTitle,
      taskDesc,
      scheduledTime,
      durationMinutes,
    };

    navigationRef.navigate('FocusMode', params);
  }
}

/** Handle action buttons (e.g. Mark Complete) and default notification taps. */
export function processNotificationResponse(response: NotificationResponse): void {
  handleNotificationResponse(response);

  const isDefaultTap =
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
  if (isDefaultTap) {
    navigateFromNotificationData(response.notification.request.content.data);
  }
}

/** Open the target screen if the app was launched from a notification. */
export async function handleInitialNotificationDeepLink(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    processNotificationResponse(response);
  }
}
