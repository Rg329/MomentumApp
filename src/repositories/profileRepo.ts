import { supabase, isSupabaseConfigured } from '../supabase/client';

export type ProfileUpsert = {
  name?: string | null;
  email?: string | null;
  procrastination_type?: string | null;
  peak_time?: string | null;
  coach_style?: string | null;
  wake_time?: number | null;
  sleep_time?: number | null;
};

export async function upsertMyProfile(patch: ProfileUpsert) {
  if (!isSupabaseConfigured) return { data: null, error: null };

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Not authenticated');

  const payload = {
    id: user.id,
    email: patch.email ?? user.email ?? null,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  return supabase.from('profiles').upsert(payload, { onConflict: 'id' });
}

export type ProfileRow = ProfileUpsert & { id: string };

export async function fetchMyProfile() {
  if (!isSupabaseConfigured) return { data: null as ProfileRow | null, error: null };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error('Not authenticated') };

  return supabase
    .from('profiles')
    .select('id, name, email, procrastination_type, peak_time, coach_style, wake_time, sleep_time')
    .eq('id', auth.user.id)
    .maybeSingle();
}
