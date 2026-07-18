import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ScheduleBlock } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { ANDROID_CHANNELS, NOTIFICATION_TYPES } from './notificationTypes';
import { NOTIFICATIONS_ENABLED } from './config';

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
const TASK_CATEGORY_ID   = 'TASK_REMINDER';
const MISSED_GRACE_MINUTES = 15;

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
      buttonTitle: '✓ Mark Complete',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
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

export async function scheduleMorningNotification(wakeTimeMinutes: number) {
  await cancelScheduledByType(NOTIFICATION_TYPES.MORNING);

  const hour   = Math.floor(wakeTimeMinutes / 60) % 24;
  const minute = wakeTimeMinutes % 60;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning ⚡',
      body: "Your schedule is ready. Let's build momentum today.",
      data: { type: NOTIFICATION_TYPES.MORNING },
      sound: true,
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
) {
  await cancelScheduledByType(NOTIFICATION_TYPES.TASK_REMINDER);

  if (scheduleDate !== todayIsoDate()) return;

  for (const block of blocks.filter(isTaskBlock)) {
    const [h, m]       = block.time.split(':').map(Number);
    const notifMinutes = h * 60 + m - 10;
    if (notifMinutes < 0) continue;

    const triggerDate = new Date();
    triggerDate.setHours(Math.floor(notifMinutes / 60), notifMinutes % 60, 0, 0);
    if (triggerDate <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Starting in 10 min',
        body: block.title,
        data: taskPayload(block, NOTIFICATION_TYPES.TASK_REMINDER),
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
}

/** Remind the user when a scheduled block started but was not marked complete. */
export async function scheduleMissedTaskNotifications(
  blocks: ScheduleBlock[],
  scheduleDate: string,
  completedTaskIds: string[] = [],
) {
  await cancelScheduledByType(NOTIFICATION_TYPES.MISSED_TASK);

  if (scheduleDate !== todayIsoDate()) return;

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
        categoryIdentifier: TASK_CATEGORY_ID,
        sound: true,
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

/** Immediate notification after schedule generation completes. */
export async function notifyScheduleReady(blockCount: number) {
  if (!NOTIFICATIONS_ENABLED) return;

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
      sound: true,
      ...androidChannelId(ANDROID_CHANNELS.SCHEDULE),
    },
    trigger: null,
  });
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data;

  if (actionIdentifier === COMPLETE_ACTION_ID && data?.taskId) {
    const taskId = String(data.taskId);
    useAppStore.getState().markTaskComplete(taskId);
    cancelMissedTaskNotifications([taskId]).catch(() => {});
  }
}
