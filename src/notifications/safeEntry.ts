import { NOTIFICATIONS_ENABLED } from './config';
import { useAppStore } from '../store/useAppStore';

/** Safe entry point — does not load expo-notifications unless enabled. */
export function notifyScheduleReadyIfEnabled(blockCount: number): void {
  if (!NOTIFICATIONS_ENABLED) return;
  const style = useAppStore.getState().preferences.notificationStyle;
  void import('./notificationService').then(({ notifyScheduleReady }) =>
    notifyScheduleReady(blockCount, style).catch(() => {}),
  );
}

export async function ensureNotificationPermissionsIfEnabled(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED) return false;
  const { ensureNotificationPermissions } = await import('./notificationService');
  return ensureNotificationPermissions();
}

/** Schedule a daily morning reminder at wake time (Phase 6 / Phase E tomorrow hook). */
export async function scheduleTomorrowReminderIfEnabled(wakeTimeMinutes: number): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  const { tomorrowReminderEnabled, preferences } = useAppStore.getState();
  if (!tomorrowReminderEnabled) return;

  const granted = await ensureNotificationPermissionsIfEnabled();
  if (!granted) return;

  const { scheduleMorningNotification } = await import('./notificationService');
  await scheduleMorningNotification(wakeTimeMinutes, true, preferences.notificationStyle);
}
