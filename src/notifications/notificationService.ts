import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ScheduleBlock } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';

// How the app handles notifications when it's in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {}

const COMPLETE_ACTION_ID = 'MARK_COMPLETE';
const TASK_CATEGORY_ID   = 'TASK_REMINDER';

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY_ID, [
    {
      identifier: COMPLETE_ACTION_ID,
      buttonTitle: '✓ Mark Complete',
      options: {
        isDestructive:            false,
        isAuthenticationRequired: false,
      },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Schedule (or reschedule) the daily morning notification at the user's wake time. */
export async function scheduleMorningNotification(wakeTimeMinutes: number) {
  // Cancel any previously scheduled morning notification
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === 'morning')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const hour   = Math.floor(wakeTimeMinutes / 60) % 24;
  const minute = wakeTimeMinutes % 60;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning ⚡',
      body:  "Your schedule is ready. Let's build momentum today.",
      data:  { type: 'morning' },
      sound: true,
    },
    trigger: {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Schedule a 10-min-before reminder for each task block in today's schedule. */
export async function scheduleTaskNotifications(
  blocks: ScheduleBlock[],
  scheduleDate: string,
) {
  // Cancel all existing task reminders
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === 'task_reminder')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  // Only schedule for today — no point scheduling for a past date
  const today = new Date().toISOString().split('T')[0];
  if (scheduleDate !== today) return;

  const taskBlocks = blocks.filter(
    (b) => b.type !== 'break' && b.type !== 'insight',
  );

  for (const block of taskBlocks) {
    const [h, m]        = block.time.split(':').map(Number);
    const blockMinutes  = h * 60 + m;
    const notifMinutes  = blockMinutes - 10;
    if (notifMinutes < 0) continue;

    const triggerDate = new Date();
    triggerDate.setHours(
      Math.floor(notifMinutes / 60),
      notifMinutes % 60,
      0,
      0,
    );

    // Skip if the time has already passed today
    if (triggerDate <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title:              'Starting in 10 min',
        body:               block.title,
        data:               { type: 'task_reminder', taskId: block.id, taskTitle: block.title },
        categoryIdentifier: TASK_CATEGORY_ID,
        sound:              true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

/** Call this from the notification response listener to handle "Mark Complete" taps. */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data;

  if (actionIdentifier === COMPLETE_ACTION_ID && data?.taskId) {
    useAppStore.getState().markTaskComplete(String(data.taskId));
  }
}
