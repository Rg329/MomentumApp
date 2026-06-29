import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrainDumpScreen } from '../screens/BrainDumpScreen';
import { DailyScheduleScreen } from '../screens/DailyScheduleScreen';
import { DailySummaryScreen } from '../screens/DailySummaryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors, Typography, Spacing } from '../theme';

const Tab = createBottomTabNavigator();

type TabKey = 'Focus' | 'Schedule' | 'Insights' | 'Settings';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: TabKey; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'Focus',    label: 'Focus',    icon: 'timer-outline',         iconActive: 'timer' },
  { name: 'Schedule', label: 'Schedule', icon: 'calendar-text-outline', iconActive: 'calendar-text' },
  { name: 'Insights', label: 'Insights', icon: 'chart-areaspline',      iconActive: 'chart-areaspline' },
  { name: 'Settings', label: 'Settings', icon: 'cog-outline',           iconActive: 'cog' },
];

function CustomTabBar({ state, navigation, style }: any) {
  const insets = useSafeAreaInsets();

  if ((style as { display?: string } | undefined)?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }, style]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = TABS.find((t) => t.name === route.name);

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIndicator, isFocused && styles.tabIndicatorActive]} />
            <MaterialCommunityIcons
              name={isFocused ? (tab?.iconActive ?? 'circle') : (tab?.icon ?? 'circle-outline')}
              size={22}
              color={isFocused ? Colors.primary : Colors.outline}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab?.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Focus"    component={BrainDumpScreen as any} />
      <Tab.Screen name="Schedule" component={DailyScheduleScreen} />
      <Tab.Screen name="Insights" component={DailySummaryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250,248,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant + '25',
    paddingTop: 10,
    paddingHorizontal: Spacing.gutter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  tabIndicatorActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    ...Typography.labelXs,
    color: Colors.secondary,
    textTransform: 'uppercase',
    fontSize: 9,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
});
