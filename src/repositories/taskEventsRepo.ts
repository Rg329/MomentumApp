import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { TaskEventRow, TrackTaskEventInput } from '../intelligence/types';

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/**
 * Track a task lifecycle event via Supabase RPC.
 * RPC inserts into task_events and refreshes user_metrics atomically.
 */
export async function trackTaskEvent(input: TrackTaskEventInput) {
  if (!isSupabaseConfigured) return { data: null, error: null };

  const { data, error } = await supabase.rpc('track_task_event', {
    p_task_id: input.taskId,
    p_event_type: input.eventType,
    p_task_title: input.taskTitle ?? null,
    p_duration_minutes: input.durationMinutes ?? null,
    p_metadata: input.metadata ?? {},
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  return { data, error };
}

/** Fetch recent task events for the signed-in user (newest first). */
export async function fetchRecentTaskEvents(limit = 100, daysBack = 30) {
  if (!isSupabaseConfigured) return { data: [] as TaskEventRow[], error: null };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { data: [] as TaskEventRow[], error: null };
  const userId = userData.user.id;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await supabase
    .from('task_events')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(limit);

  return { data: (data ?? []) as TaskEventRow[], error };
}
