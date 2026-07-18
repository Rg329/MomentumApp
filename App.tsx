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
import { runPostSignInSync } from './src/auth/onSignInSync';
import { useAppStore } from './src/store/useAppStore';
import { NOTIFICATIONS_ENABLED } from './src/notifications/config';
import {
  configurePurchases,
  syncPremiumFromRevenueCat,
  addCustomerInfoListener,
  logInRevenueCat,
  logOutRevenueCat,
  linkPurchasesToUser,
} from './src/monetization/purchases';

SplashScreenExpo.preventAutoHideAsync();

function AppInner() {
  if (!NOTIFICATIONS_ENABLED) return null;

  const { NotificationBootstrap } = require('./src/notifications/NotificationBootstrap') as typeof import('./src/notifications/NotificationBootstrap');
  return <NotificationBootstrap />;
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
    let removeListener: (() => void) | undefined;

    const initPurchases = async () => {
      try {
        await configurePurchases();
        removeListener = addCustomerInfoListener();
        await syncPremiumFromRevenueCat();

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user.id) {
          await linkPurchasesToUser(session.user.id);
        }
      } catch (e) {
        console.warn('[Purchases] Could not initialize RevenueCat:', e);
      }
    };

    initPurchases();

    return () => {
      removeListener?.();
    };
  }, []);

  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        try {
          await logOutRevenueCat();
        } catch (e) {
          console.warn('[Purchases] Could not log out RevenueCat user:', e);
        }
        return;
      }

      if (!session) return;

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        runPostSignInSync().catch((e) => {
          console.warn('[Auth] Post sign-in sync failed:', e);
        });
        try {
          await logInRevenueCat(session.user.id);
        } catch (e) {
          console.warn('[Purchases] Could not link RevenueCat user:', e);
        }
      }
    });

    return () => authSub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const run = () => {
      useAppStore.getState().clearStaleSchedule();
    };
    useAppStore.persist.onFinishHydration(run);
    if (useAppStore.persist.hasHydrated()) run();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const navigationProps = NOTIFICATIONS_ENABLED
    ? (() => {
        const { navigationRef } = require('./src/navigation/navigationRef') as typeof import('./src/navigation/navigationRef');
        const { handleInitialNotificationDeepLink } = require('./src/notifications/notificationDeepLink') as typeof import('./src/notifications/notificationDeepLink');
        return {
          ref: navigationRef,
          onReady: () => {
            handleInitialNotificationDeepLink().catch(() => {});
          },
        };
      })()
    : {};

  return (
    <SafeAreaProvider>
      <NavigationContainer {...navigationProps}>
        <StatusBar style="dark" />
        <AppInner />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
