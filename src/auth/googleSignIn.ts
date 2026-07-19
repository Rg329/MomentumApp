import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { createSessionFromUrl, getAuthRedirectUrl } from '../supabase/authCallback';

WebBrowser.maybeCompleteAuthSession();

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelledError';
  }
}

/**
 * Opens Google OAuth via Supabase and returns a session when the user completes sign-in.
 * Requires Google provider enabled in Supabase + redirect URL allow-list (see getAuthRedirectUrl()).
 */
export async function signInWithGoogle(): Promise<Session> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo.',
    );
  }

  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new Error('Could not start Google sign-in. Check that Google is enabled in Supabase Auth.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new GoogleSignInCancelledError();
  }

  if (result.type !== 'success') {
    throw new Error('Google sign-in did not complete. Please try again.');
  }

  const session = await createSessionFromUrl(result.url);
  if (!session) {
    throw new Error('Google sign-in did not return a session. Add this redirect URL in Supabase → Auth → URL Configuration.');
  }

  return session;
}
