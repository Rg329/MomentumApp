import { NOTIFICATIONS_ENABLED } from './config';

/** Safe entry point — does not load expo-notifications unless enabled. */
export function notifyScheduleReadyIfEnabled(blockCount: number): void {
  if (!NOTIFICATIONS_ENABLED) return;
  void import('./notificationService').then(({ notifyScheduleReady }) =>
    notifyScheduleReady(blockCount).catch(() => {}),
  );
}

export async function ensureNotificationPermissionsIfEnabled(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED) return false;
  const { ensureNotificationPermissions } = await import('./notificationService');
  return ensureNotificationPermissions();
}
