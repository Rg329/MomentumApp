import { supabase, isSupabaseConfigured } from '../supabase/client';
import type { UserMetrics, UserMetricsRow } from '../intelligence/types';
import { EMPTY_USER_METRICS } from '../intelligence/types';

function mapMetricsRow(row: UserMetricsRow | null): UserMetrics {
  if (!row) return { ...EMPTY_USER_METRICS };

  return {
    tasksCreated: row.tasks_created,
    tasksStarted: row.tasks_started,
    tasksCompleted: row.tasks_completed,
    tasksSkipped: row.tasks_skipped,
    tasksRescheduled: row.tasks_rescheduled,
    completionRate: Number(row.completion_rate),
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastActiveDate: row.last_active_date,
    updatedAt: row.updated_at,
  };
}

/** Fetch aggregated metrics for the signed-in user. */
export async function fetchUserMetrics(): Promise<{ data: UserMetrics; error: unknown }> {
  if (!isSupabaseConfigured) return { data: { ...EMPTY_USER_METRICS }, error: null };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { data: { ...EMPTY_USER_METRICS }, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('user_metrics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: mapMetricsRow(data as UserMetricsRow | null), error };
}

/** Force server-side metrics refresh from the event log. */
export async function refreshUserMetrics() {
  if (!isSupabaseConfigured) return { data: { ...EMPTY_USER_METRICS }, error: null };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { data: { ...EMPTY_USER_METRICS }, error: new Error('Not authenticated') };

  const { data, error } = await supabase.rpc('refresh_user_metrics', {
    p_user_id: userId,
  });

  return { data: mapMetricsRow(data as UserMetricsRow | null), error };
}
