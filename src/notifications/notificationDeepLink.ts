import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { navigationRef } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { handleNotificationResponse } from './notificationService';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { trackFunnelEvent } from '../analytics/funnelTracker';

type NotificationData = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function taskCheckInParams(data: NotificationData): RootStackParamList['TaskCheckIn'] | null {
  const taskId = asString(data.taskId);
  const taskTitle = asString(data.taskTitle);
  if (!taskId || !taskTitle) return null;

  return {
    taskId,
    taskTitle,
    taskDesc: asString(data.taskDesc),
    scheduledTime: asString(data.scheduledTime),
    durationMinutes: asNumber(data.durationMinutes),
  };
}

/** Navigate to the screen implied by notification payload data. */
export function navigateFromNotificationData(
  data: NotificationData | undefined,
  options?: { autoShowSkip?: boolean },
): void {
  if (!data?.type || !navigationRef.isReady()) return;

  const type = String(data.type);

  if (type === NOTIFICATION_TYPES.MORNING || type === NOTIFICATION_TYPES.SCHEDULE_READY) {
    navigationRef.navigate('MainTabs', { screen: 'Schedule' });
    return;
  }

  if (type === NOTIFICATION_TYPES.TASK_REMINDER || type === NOTIFICATION_TYPES.MISSED_TASK) {
    const params = taskCheckInParams(data);
    if (!params) return;
    navigationRef.navigate('TaskCheckIn', {
      ...params,
      autoShowSkip: options?.autoShowSkip ?? type === NOTIFICATION_TYPES.MISSED_TASK,
    });
  }
}

/** Handle action buttons (e.g. Mark Complete) and default notification taps. */
export function processNotificationResponse(response: NotificationResponse): void {
  const data = response.notification.request.content.data;
  const handled = handleNotificationResponse(response);

  if (handled) return;

  const isDefaultTap =
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
  const isSkipAction =
    response.actionIdentifier === 'SKIP_CHECKIN';

  if (isDefaultTap || isSkipAction) {
    trackFunnelEvent('notification_opened', {
      type: data?.type,
      taskId: data?.taskId,
      action: isSkipAction ? 'skip' : 'open',
    });
    navigateFromNotificationData(data, { autoShowSkip: isSkipAction });
  }
}

/** Open the target screen if the app was launched from a notification. */
export async function handleInitialNotificationDeepLink(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    processNotificationResponse(response);
  }
}
