import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermissions,
  setupNotificationCategories,
  setupAndroidNotificationChannels,
  scheduleMorningNotification,
  scheduleTaskNotifications,
  scheduleMissedTaskNotifications,
  cancelMissedTaskNotifications,
} from './notificationService';
import {
  processNotificationResponse,
} from './notificationDeepLink';
import { NOTIFICATIONS_ENABLED } from './config';

/**
 * Mount once in App.tsx.
 * Requests permissions after onboarding, sets up channels/categories,
 * schedules reminders, and handles notification taps (deep links).
 */
export function useNotifications() {
  const hasOnboarded     = useAppStore((s) => s.hasOnboarded);
  const wakeTime         = useAppStore((s) => s.wakeTime);
  const scheduleBlocks   = useAppStore((s) => s.scheduleBlocks);
  const scheduleDate     = useAppStore((s) => s.scheduleDate);
  const completedTaskIds = useAppStore((s) => s.completedTaskIds);
  const permissionAsked  = useRef(false);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || Platform.OS === 'web' || !hasOnboarded || permissionAsked.current) return;
    permissionAsked.current = true;

    (async () => {
      try {
        await setupAndroidNotificationChannels();
        const granted = await requestNotificationPermissions();
        if (!granted) return;
        await setupNotificationCategories();
        await scheduleMorningNotification(wakeTime);
      } catch {}
    })();
  }, [hasOnboarded, wakeTime]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || !hasOnboarded) return;
    scheduleMorningNotification(wakeTime).catch(() => {});
  }, [hasOnboarded, wakeTime]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || !hasOnboarded || scheduleBlocks.length === 0 || !scheduleDate) return;

    scheduleTaskNotifications(scheduleBlocks, scheduleDate).catch(() => {});
    scheduleMissedTaskNotifications(
      scheduleBlocks,
      scheduleDate,
      completedTaskIds,
    ).catch(() => {});
  }, [hasOnboarded, scheduleBlocks, scheduleDate, completedTaskIds]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || completedTaskIds.length === 0) return;
    cancelMissedTaskNotifications(completedTaskIds).catch(() => {});
  }, [completedTaskIds]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || Platform.OS === 'web') return;

    try {
      const sub = Notifications.addNotificationResponseReceivedListener(
        processNotificationResponse,
      );
      return () => sub.remove();
    } catch {
      return undefined;
    }
  }, []);
}
