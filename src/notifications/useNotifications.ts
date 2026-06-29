import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import {
  requestNotificationPermissions,
  setupNotificationCategories,
  scheduleMorningNotification,
  scheduleTaskNotifications,
  handleNotificationResponse,
} from './notificationService';


/**
 * Mount this hook once in App.tsx.
 * It requests permissions, sets up categories, schedules the morning notification,
 * reschedules task notifications whenever the schedule changes, and listens for
 * "Mark Complete" taps from the notification tray.
 */
export function useNotifications() {
  const wakeTime      = useAppStore((s) => s.wakeTime);
  const scheduleBlocks = useAppStore((s) => s.scheduleBlocks);
  const scheduleDate   = useAppStore((s) => s.scheduleDate);
  const permissionAsked = useRef(false);

  // Request permissions + set up action categories once on mount
  useEffect(() => {
    if (permissionAsked.current) return;
    permissionAsked.current = true;

    (async () => {
      try {
        const granted = await requestNotificationPermissions();
        if (!granted) return;
        await setupNotificationCategories();
        await scheduleMorningNotification(wakeTime);
      } catch {}
    })();
  }, []);

  // Reschedule morning notification if wake time changes
  useEffect(() => {
    scheduleMorningNotification(wakeTime).catch(() => {});
  }, [wakeTime]);

  // Reschedule task notifications whenever the schedule is regenerated
  useEffect(() => {
    if (scheduleBlocks.length > 0 && scheduleDate) {
      scheduleTaskNotifications(scheduleBlocks, scheduleDate).catch(() => {});
    }
  }, [scheduleBlocks, scheduleDate]);

  // Listen for notification interactions (e.g. "Mark Complete" button tap)
  useEffect(() => {
    try {
      const sub = Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );
      return () => sub.remove();
    } catch {
      return undefined;
    }
  }, []);
}
