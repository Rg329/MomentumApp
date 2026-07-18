import { useNotifications } from './useNotifications';

/** Mount in App.tsx only when NOTIFICATIONS_ENABLED is true. */
export function NotificationBootstrap() {
  useNotifications();
  return null;
}
