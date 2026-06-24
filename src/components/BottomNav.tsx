import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

type TabKey = 'focus' | 'schedule' | 'insights' | 'settings';

interface BottomNavProps {
  active: TabKey;
  onPress: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'insights', label: 'Insights' },
  { key: 'settings', label: 'Settings' },
];

export function BottomNav({ active, onPress }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onPress(tab.key)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={[styles.indicator, isActive && styles.indicatorActive]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250,248,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant + '25',
    paddingBottom: 28,
    paddingTop: 10,
    paddingHorizontal: Spacing.gutter,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  indicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.secondary,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  labelActive: {
    color: Colors.primary,
  },
});
