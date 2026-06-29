import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import * as SplashScreenExpo from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/theme';
import { createSessionFromUrl } from './src/supabase/authCallback';
import { supabase } from './src/supabase/client';
import { syncOnboardingProfileToSupabase } from './src/repositories/profileSync';
import { useAppStore } from './src/store/useAppStore';
// import { useNotifications } from './src/notifications/useNotifications'; // requires dev build

SplashScreenExpo.preventAutoHideAsync();

function AppInner() {
  // useNotifications(); // requires dev build — re-enable when building with EAS
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url.includes('auth/callback')) return;
      createSessionFromUrl(url).catch((e) => {
        console.warn('[Auth] Could not complete magic link sign-in:', e);
      });
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        syncOnboardingProfileToSupabase();
      }
    });

    return () => authSub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    useAppStore.persist.onFinishHydration(() => {
      useAppStore.getState().expireTrialIfNeeded();
    });
    if (useAppStore.persist.hasHydrated()) {
      useAppStore.getState().expireTrialIfNeeded();
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppInner />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
