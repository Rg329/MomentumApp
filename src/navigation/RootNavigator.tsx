import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { BrainDumpScreen } from '../screens/BrainDumpScreen';
import { ConstraintsScreen } from '../screens/ConstraintsScreen';
import { AIAnalysisScreen } from '../screens/AIAnalysisScreen';
import { OverloadAlertScreen } from '../screens/OverloadAlertScreen';
import { FocusModeScreen } from '../screens/FocusModeScreen';
import { TaskCheckInScreen } from '../screens/TaskCheckInScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { CredentialsScreen } from '../screens/CredentialsScreen';
import { ProOfferScreen } from '../screens/ProOfferScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { TabNavigator } from './TabNavigator';

export type RootStackParamList = {
  Splash:       undefined;
  Onboarding:   undefined;
  Auth:         { fromSavePrompt?: boolean; fromCheckIn?: boolean; fromInsights?: boolean } | undefined;
  Credentials:  undefined;
  ProOffer:     { fromOnboarding?: boolean } | undefined;
  BrainDump:    undefined;
  Constraints:  undefined;
  AIAnalysis:   undefined;
  OverloadAlert: {
    droppedTasks: Array<{ title: string; durationMinutes: number }>;
    scheduledCount: number;
  };
  FocusMode:    { taskId?: string; taskTitle?: string; taskDesc?: string; durationMinutes?: number; scheduledTime?: string } | undefined;
  TaskCheckIn:  {
    taskId: string;
    taskTitle: string;
    taskDesc?: string;
    durationMinutes?: number;
    scheduledTime?: string;
    autoShowSkip?: boolean;
  };
  Premium:      undefined;
  MainTabs:     { screen?: 'Focus' | 'Schedule' | 'Insights' | 'Settings' } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: '#faf8ff' },
      }}
    >
      <Stack.Screen name="Splash"        component={SplashScreen} />
      <Stack.Screen name="Onboarding"    component={OnboardingScreen} />
      <Stack.Screen name="Auth"          component={AuthScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Credentials"   component={CredentialsScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="ProOffer"      component={ProOfferScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="BrainDump"     component={BrainDumpScreen} />
      <Stack.Screen name="Constraints"   component={ConstraintsScreen} />
      <Stack.Screen name="AIAnalysis"    component={AIAnalysisScreen} />
      <Stack.Screen name="OverloadAlert" component={OverloadAlertScreen} />
      <Stack.Screen name="FocusMode"     component={FocusModeScreen} />
      <Stack.Screen name="TaskCheckIn"   component={TaskCheckInScreen} />
      <Stack.Screen name="Premium"       component={PremiumScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MainTabs"      component={TabNavigator} />
    </Stack.Navigator>
  );
}
