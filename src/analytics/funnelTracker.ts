/**
 * Local accountability funnel — notify → open → complete/skip.
 * Stored in AsyncStorage for debugging; extensible to Supabase analytics later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'momentum-funnel-events';
const MAX_EVENTS = 300;

export type FunnelEventName =
  | 'notification_opened'
  | 'notification_action_complete'
  | 'notification_action_snooze'
  | 'notification_action_skip'
  | 'check_in_viewed'
  | 'task_completed'
  | 'task_skipped'
  | 'end_of_day_review_opened'
  | 'end_of_day_review_dismissed'
  | 'end_of_day_review_insights';

export type FunnelEvent = {
  name: FunnelEventName;
  at: string;
  metadata?: Record<string, unknown>;
};

async function readEvents(): Promise<FunnelEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FunnelEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEvents(events: FunnelEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}

/** Fire-and-forget funnel event — never blocks UI. */
export function trackFunnelEvent(
  name: FunnelEventName,
  metadata?: Record<string, unknown>,
): void {
  void (async () => {
    const events = await readEvents();
    events.push({ name, at: new Date().toISOString(), metadata });
    await writeEvents(events);
  })().catch(() => {});
}

export async function getRecentFunnelEvents(limit = 50): Promise<FunnelEvent[]> {
  const events = await readEvents();
  return events.slice(-limit);
}

/** Quick funnel counts for the last N days (local debug / settings). */
export async function getFunnelSummary(days = 7): Promise<Record<FunnelEventName, number>> {
  const cutoff = Date.now() - days * 86_400_000;
  const events = await readEvents();
  const summary = {} as Record<FunnelEventName, number>;

  for (const e of events) {
    if (Date.parse(e.at) < cutoff) continue;
    summary[e.name] = (summary[e.name] ?? 0) + 1;
  }

  return summary;
}
