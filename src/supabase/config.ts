/** Normalize Supabase project URL from dashboard (no /rest/v1 suffix). */
export function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  if (!url) return undefined;

  // Common copy-paste mistake from the REST docs / Table Editor.
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    console.warn(
      `[Supabase] EXPO_PUBLIC_SUPABASE_URL looks invalid: "${url}". ` +
        'Use the Project URL from Supabase → Project Settings → API (e.g. https://xxxx.supabase.co).',
    );
  }

  return url;
}

export function normalizeSupabaseKey(raw?: string): string | undefined {
  const key = raw?.trim();
  return key || undefined;
}

export function formatSupabaseAuthError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Could not reach Supabase.';

  const lower = message.toLowerCase();
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests')
  ) {
    return (
      'Too many sign-in emails were sent. Wait about an hour, then try again — or tap Skip for now to continue without signing in. ' +
      'During development, avoid tapping Resend code repeatedly.'
    );
  }

  if (
    lower.includes('pkce') ||
    lower.includes('code verifier')
  ) {
    return (
      'Open the sign-in link so it launches Expo Go on this phone — not Chrome or Safari. ' +
      'Then tap Resend link and try again with a fresh email.'
    );
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('network error') ||
    lower.includes('enotfound')
  ) {
    return (
      'Could not reach Supabase. Check your internet connection, then verify ' +
      'EXPO_PUBLIC_SUPABASE_URL in .env matches Project Settings → API → Project URL ' +
      '(https://your-project.supabase.co, no /rest/v1/). Restart Expo after changing .env.'
    );
  }

  return message;
}
