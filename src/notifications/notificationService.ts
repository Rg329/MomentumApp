import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ScheduleBlock } from '../types/schedule';
import type { NotificationStyle } from '../store/useAppStore';
import { completeTaskWithTracking } from '../taskTracking/checkInActions';
import { ANDROID_CHANNELS, NOTIFICATION_TYPES } from './notificationTypes';
import { NOTIFICATIONS_ENABLED } from './config';
import { getNotificationPolicy } from '../analytics/notificationPolicy';
import { trackFunnelEvent } from '../analytics/funnelTracker';

if (NOTIFICATIONS_ENABLED) {
  try {
    Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  } catch {}
}

const COMPLETE_ACTION_ID = 'MARK_COMPLETE';
const SNOOZE_ACTION_ID   = 'SNOOZE_15M';
const SKIP_CHECKIN_ACTION_ID = 'SKIP_CHECKIN';
const TASK_CATEGORY_ID   = 'TASK_REMINDER';
const MISSED_GRACE_MINUTES = 15;
const SNOOZE_MINUTES = 15;

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

function isTaskBlock(block: ScheduleBlock): boolean {
  return block.type !== 'break' && block.type !== 'insight';
}

function parseDurationMinutes(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function taskPayload(block: ScheduleBlock, type: string) {
  return {
    type,
    taskId: block.id,
    taskTitle: block.title,
    taskDesc: block.description,
    scheduledTime: block.time,
    durationMinutes: parseDurationMinutes(block.duration),
  };
}

function androidChannelId(channel: string) {
  return Platform.OS === 'android' ? { channelId: channel } : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function cancelScheduledByType(type: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === type)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.DAILY, {
    name: 'Daily Reminders',
    description: 'Morning reminders to start your day',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7c3aed',
  });

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.TASKS, {
    name: 'Task Reminders',
    description: 'Upcoming task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200],
    lightColor: '#7c3aed',
  });

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.MISSED, {
    name: 'Missed Tasks',
    description: 'Alerts when a scheduled task was not started',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 400],
    lightColor: '#ef4444',
  });

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.SCHEDULE, {
    name: 'Schedule Ready',
    description: 'When your AI schedule is ready',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 150],
    lightColor: '#7c3aed',
  });
}

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY_ID, [
    {
      identifier: COMPLETE_ACTION_ID,
      buttonTitle: '✓ Mark done',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: SNOOZE_ACTION_ID,
      buttonTitle: 'Snooze 15m',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: SKIP_CHECKIN_ACTION_ID,
      buttonTitle: "Couldn't do it",
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
        opensAppToForeground: true,
      },
    },
  ]);
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'denied';

  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied' && canAskAgain === false) return 'denied';
  if (status === 'denied') return 'undetermined';
  return 'undetermined';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
    android: {},
  });
  return status === 'granted';
}

/** Request permission only when not already granted. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED) return false;
  const status = await getNotificationPermissionStatus();
  if (status === 'granted') return true;
  return requestNotificationPermissions();
}

export async function scheduleMorningNotification(
  wakeTimeMinutes: number,
  enabled = true,
  style: NotificationStyle = 'standard',
) {
  await cancelScheduledByType(NOTIFICATION_TYPES.MORNING);
  if (!enabled) return;

  const policy = getNotificationPolicy(style);
  if (!policy.morningReminderEnabled) return;

  const hour   = Math.floor(wakeTimeMinutes / 60) % 24;
  const minute = wakeTimeMinutes % 60;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning ⚡',
      body: "Your schedule is ready. Let's build momentum today.",
      data: { type: NOTIFICATION_TYPES.MORNING },
      sound: policy.sound,
      ...androidChannelId(ANDROID_CHANNELS.DAILY),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNELS.DAILY,
    },
  });
}

export async function scheduleTaskNotifications(
  blocks: ScheduleBlock[],
  scheduleDate: string,
  style: NotificationStyle = 'standard',
) {
  await cancelScheduledByType(NOTIFICATION_TYPES.TASK_REMINDER);

  if (scheduleDate !== todayIsoDate()) return;

  const policy = getNotificationPolicy(style);
  if (policy.taskLeadMinutes < 0) return;

  for (const block of blocks.filter(isTaskBlock)) {
    const [h, m]       = block.time.split(':').map(Number);
    const blockMinutes = h * 60 + m;
    const notifMinutes = blockMinutes - policy.taskLeadMinutes;
    if (notifMinutes < 0) continue;

    const triggerDate = new Date();
    triggerDate.setHours(Math.floor(notifMinutes / 60), notifMinutes % 60, 0, 0);
    if (triggerDate <= new Date()) continue;

    const title =
      policy.taskLeadMinutes === 0
        ? 'Time to start'
        : policy.taskLeadMinutes <= 5
          ? 'Starting soon'
          : 'Starting in 10 min';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: block.title,
        data: taskPayload(block, NOTIFICATION_TYPES.TASK_REMINDER),
        categoryIdentifier: policy.categoriesEnabled ? TASK_CATEGORY_ID : undefined,
        sound: policy.sound,
        ...androidChannelId(ANDROID_CHANNELS.TASKS),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ANDROID_CHANNELS.TASKS,
      },
    });
  }
}

/** Remind the user when a scheduled block started but was not marked complete. */
export async function scheduleMissedTaskNotifications(
  blocks: ScheduleBlock[],
  scheduleDate: string,
  completedTaskIds: string[] = [],
  style: NotificationStyle = 'standard',
) {
  await cancelScheduledByType(NOTIFICATION_TYPES.MISSED_TASK);

  if (scheduleDate !== todayIsoDate()) return;

  const policy = getNotificationPolicy(style);
  if (!policy.missedEnabled) return;

  const completed = new Set(completedTaskIds);

  for (const block of blocks.filter(isTaskBlock)) {
    if (completed.has(block.id)) continue;

    const [h, m]         = block.time.split(':').map(Number);
    const missedMinutes  = h * 60 + m + MISSED_GRACE_MINUTES;

    const triggerDate = new Date();
    triggerDate.setHours(
      Math.floor(missedMinutes / 60),
      missedMinutes % 60,
      0,
      0,
    );
    if (triggerDate <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Missed task',
        body: `You planned "${block.title}" — tap to jump back in.`,
        data: taskPayload(block, NOTIFICATION_TYPES.MISSED_TASK),
        categoryIdentifier: policy.categoriesEnabled ? TASK_CATEGORY_ID : undefined,
        sound: policy.sound,
        ...androidChannelId(ANDROID_CHANNELS.MISSED),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ANDROID_CHANNELS.MISSED,
      },
    });
  }
}

export async function cancelMissedTaskNotifications(taskIds: string[]) {
  if (taskIds.length === 0) return;

  const ids = new Set(taskIds);
  const all = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    all
      .filter(
        (n) =>
          n.content.data?.type === NOTIFICATION_TYPES.MISSED_TASK &&
          ids.has(String(n.content.data?.taskId)),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function scheduleSnoozeReminder(
  data: Record<string, unknown>,
  delayMinutes = SNOOZE_MINUTES,
) {
  if (!NOTIFICATIONS_ENABLED) return;

  const triggerDate = new Date(Date.now() + delayMinutes * 60 * 1000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminder',
      body: asString(data.taskTitle) ? String(data.taskTitle) : 'Time for your next block',
      data: { ...data, type: NOTIFICATION_TYPES.TASK_REMINDER },
      categoryIdentifier: TASK_CATEGORY_ID,
      sound: true,
      ...androidChannelId(ANDROID_CHANNELS.TASKS),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: ANDROID_CHANNELS.TASKS,
    },
  });
}

/** Immediate notification after schedule generation completes. */
export async function notifyScheduleReady(
  blockCount: number,
  style: NotificationStyle = 'standard',
) {
  if (!NOTIFICATIONS_ENABLED) return;

  const policy = getNotificationPolicy(style);
  if (!policy.scheduleReadyEnabled) return;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your schedule is ready ✨',
      body:
        blockCount > 0
          ? `${blockCount} blocks planned for today. Tap to review.`
          : 'Tap to review your plan for today.',
      data: { type: NOTIFICATION_TYPES.SCHEDULE_READY },
      sound: policy.sound,
      ...androidChannelId(ANDROID_CHANNELS.SCHEDULE),
    },
    trigger: null,
  });
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): boolean {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data;

  if (actionIdentifier === COMPLETE_ACTION_ID && data?.taskId) {
    const taskId = String(data.taskId);
    const taskTitle = asString(data.taskTitle) ?? 'Task';
    const durationMinutes =
      typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined;

    trackFunnelEvent('notification_action_complete', { taskId, source: data.type });
    completeTaskWithTracking(taskId, taskTitle, durationMinutes, 'check_in');
    cancelMissedTaskNotifications([taskId]).catch(() => {});
    return true;
  }

  if (actionIdentifier === SNOOZE_ACTION_ID && data?.taskId) {
    trackFunnelEvent('notification_action_snooze', { taskId: data.taskId, source: data.type });
    scheduleSnoozeReminder(data as Record<string, unknown>).catch(() => {});
    return true;
  }

  if (actionIdentifier === SKIP_CHECKIN_ACTION_ID) {
    trackFunnelEvent('notification_action_skip', { taskId: data?.taskId, source: data?.type });
    return false;
  }

  return false;
}
