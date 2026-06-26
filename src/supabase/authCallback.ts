import { makeRedirectUri } from 'expo-auth-session';
import { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { normalizeSupabaseKey } from './config';

const supabaseAnonKey = normalizeSupabaseKey(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

/** Deep link Supabase redirects to after the user taps the email sign-in link. */
export function getAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: 'momentumapp',
    path: 'auth/callback',
  });
}

function parseParams(url: string): URLSearchParams {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  return new URLSearchParams(hash || query);
}

function extractQueryParam(url: string, key: string): string | null {
  try {
    const normalized = url.trim();
    const query = normalized.includes('?') ? normalized.split('?')[1]?.split('#')[0] ?? '' : '';
    return new URLSearchParams(query).get(key);
  } catch {
    return null;
  }
}

function decodeRepeated(value: string): string {
  let current = value.trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

/** Pull real Supabase / wrapped Gmail / Google redirect URLs out of pasted text. */
export function extractAuthUrls(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const found = new Set<string>();

  const add = (raw: string) => {
    const cleaned = decodeRepeated(raw.replace(/[)\]}>"']+$/g, '').trim());
    if (cleaned) found.add(cleaned);
  };

  add(trimmed);

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const wrapper = new URL(trimmed);
      for (const key of ['q', 'url', 'u']) {
        const nested = wrapper.searchParams.get(key);
        if (nested) add(nested);
      }
    } catch {
      // ignore malformed wrapper URLs
    }
  }

  const supabaseMatches = trimmed.match(
    /https?:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1\/verify[^\s"'<>]*/gi,
  );
  supabaseMatches?.forEach(add);

  const confirmMatches = trimmed.match(
    /https?:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1\/[^\s"'<>]*/gi,
  );
  confirmMatches?.forEach(add);

  return [...found];
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'text/html,application/json' };
  if (supabaseAnonKey) {
    headers.apikey = supabaseAnonKey;
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
  }
  return headers;
}

function resolveRedirectUrl(baseUrl: string, location: string): string {
  try {
    return new URL(location, baseUrl).toString();
  } catch {
    return location;
  }
}

/** Mimic tapping the email link: call Supabase verify and read tokens from the redirect. */
async function verifyByFollowingLink(verifyUrl: string): Promise<Session | null> {
  let currentUrl = verifyUrl;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: authHeaders(),
      redirect: 'manual',
    });

    const location = response.headers.get('Location') ?? response.headers.get('location');
    if (location) {
      const nextUrl = resolveRedirectUrl(currentUrl, location);
      const session = await createSessionFromUrl(nextUrl);
      if (session) return session;
      currentUrl = nextUrl;
      continue;
    }

    if (response.status >= 200 && response.status < 300) {
      const body = await response.text();
      const sessionFromBody = await createSessionFromUrl(body);
      if (sessionFromBody) return sessionFromBody;
    }

    break;
  }

  return null;
}

/** Exchange tokens or PKCE code from a magic-link redirect into a Supabase session. */
export async function createSessionFromUrl(url: string) {
  const params = parseParams(url);
  const authError = params.get('error_description') ?? params.get('error');
  if (authError) throw new Error(decodeRepeated(authError));

  const code = params.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  }

  return null;
}

async function verifyOtpAttempts(
  email: string,
  token?: string | null,
  tokenHash?: string | null,
  preferredType?: string | null,
): Promise<Session | null> {
  const types = preferredType
    ? [preferredType, 'email', 'magiclink', 'signup']
    : ['email', 'magiclink', 'signup'];
  const uniqueTypes = [...new Set(types)];

  let lastError: string | null = null;

  if (tokenHash) {
    for (const type of uniqueTypes) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'magiclink' | 'signup',
      });
      if (!error && data.session) return data.session;
      if (error?.message) lastError = error.message;
    }
  }

  if (token) {
    for (const type of uniqueTypes) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as 'email' | 'magiclink' | 'signup',
      });
      if (!error && data.session) return data.session;
      if (error?.message) lastError = error.message;

      if (token.length > 20) {
        const { data: hashData, error: hashError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'email' | 'magiclink' | 'signup',
        });
        if (!hashError && hashData.session) return hashData.session;
        if (hashError?.message) lastError = hashError.message;
      }
    }
  }

  if (lastError) throw new Error(lastError);
  return null;
}

/**
 * Complete sign-in from a pasted email link (works in Expo Go when the browser
 * cannot open exp:// redirect URLs).
 */
export async function completeMagicLinkSignIn(pastedUrl: string, email: string) {
  const trimmed = pastedUrl.trim();
  if (!trimmed) throw new Error('Paste the sign-in link from your email.');

  const normalizedEmail = email.trim().toLowerCase();
  const otpOnly = trimmed.replace(/\s/g, '');
  if (/^\d{6,8}$/.test(otpOnly)) {
    const session = await verifyOtpAttempts(normalizedEmail, otpOnly, null, 'email');
    if (session) return session;
  }

  const urls = extractAuthUrls(trimmed);
  if (!urls.length) {
    throw new Error(
      'That does not look like a sign-in link. Long-press Sign in in Gmail → Copy link, then paste the full https://...supabase.co/... URL.',
    );
  }

  let lastError: string | null = null;

  for (const url of urls) {
    try {
      const sessionFromCallback = await createSessionFromUrl(url);
      if (sessionFromCallback) return sessionFromCallback;

      if (url.includes('supabase.co/auth/')) {
        const sessionFromFetch = await verifyByFollowingLink(url);
        if (sessionFromFetch) return sessionFromFetch;
      }

      const preferredType = extractQueryParam(url, 'type');
      const tokenHash = extractQueryParam(url, 'token_hash');
      const token = extractQueryParam(url, 'token');

      const session = await verifyOtpAttempts(
        normalizedEmail,
        token,
        tokenHash,
        preferredType,
      );
      if (session) return session;
    } catch (e: unknown) {
      lastError =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Could not verify that link.';
    }
  }

  if (lastError?.toLowerCase().includes('expired') || lastError?.toLowerCase().includes('invalid')) {
    throw new Error(`${lastError} Tap Resend link and paste the new email link without opening it first.`);
  }

  throw new Error(
    lastError ??
      'Could not use that link. Long-press Sign in → Copy link (not Copy text). If you already tapped the link in Chrome, tap Resend link and use a fresh email.',
  );
}
