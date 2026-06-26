import type {
  CompletionTrendPoint,
  ProcrastinationPattern,
  TaskEventRow,
  UserInsights,
  UserInsightsRow,
} from '../intelligence/types';
import type { BehaviorProfile } from '../personalization/behaviorProfile';
import { generateInsights } from '../intelligence/insightsEngine';
import { supabase, isSupabaseConfigured } from '../supabase/client';

function mapInsightsRow(row: UserInsightsRow | null): UserInsights | null {
  if (!row) return null;
  return {
    bestFocusPeriod: row.best_focus_period ?? 'Unknown',
    completionTrends: row.completion_trends ?? [],
    procrastinationPatterns: row.procrastination_patterns ?? [],
    generatedAt: row.generated_at,
  };
}

/** Compute insights from events + behavior profile, cache to user_insights. */
export async function refreshUserInsights(
  events: TaskEventRow[],
  behaviorProfile: BehaviorProfile,
): Promise<{ data: UserInsights; error: unknown }> {
  const insights = generateInsights(events, behaviorProfile);

  if (!isSupabaseConfigured) return { data: insights, error: null };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { data: insights, error: new Error('Not authenticated') };

  const payload = {
    user_id: userId,
    best_focus_period: insights.bestFocusPeriod,
    completion_trends: insights.completionTrends,
    procrastination_patterns: insights.procrastinationPatterns,
    generated_at: insights.generatedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_insights').upsert(payload, { onConflict: 'user_id' });
  return { data: insights, error };
}

/** Read cached insights; returns null if never generated. */
export async function fetchCachedUserInsights(): Promise<{ data: UserInsights | null; error: unknown }> {
  if (!isSupabaseConfigured) return { data: null, error: null };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('user_insights')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: mapInsightsRow(data as UserInsightsRow | null), error };
}

export type { CompletionTrendPoint, ProcrastinationPattern };
