import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { useAppStore } from '../store/useAppStore';
import { logOutRevenueCat } from '../monetization/purchases';

export async function deleteAccountAndLocalData(): Promise<{ error: string | null }> {
  if (isSupabaseConfigured) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        return { error: error.message ?? 'Could not delete your cloud account.' };
      }
      await supabase.auth.signOut();
    }
  }

  try {
    await logOutRevenueCat();
  } catch {
    // Non-fatal if RevenueCat is not configured.
  }

  useAppStore.getState().resetStore();
  await AsyncStorage.clear();

  return { error: null };
}

/** Navigate to Splash after a successful account deletion. */
export function navigationResetAfterDeletion(
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void,
): void {
  dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Splash' }],
    }),
  );
}
