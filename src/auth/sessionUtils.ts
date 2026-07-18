import { supabase, isSupabaseConfigured } from '../supabase/client';

/** True when Supabase has an active authenticated session. */
export async function isSupabaseSignedIn(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

export async function getSignedInUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
