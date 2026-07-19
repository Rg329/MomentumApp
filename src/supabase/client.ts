import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseKey, normalizeSupabaseUrl } from './config';

const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeSupabaseKey(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart Expo.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://invalid.supabase.co',
  supabaseAnonKey ?? 'invalid-key',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  },
);
