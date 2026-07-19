import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { useAppStore } from '../store/useAppStore';

export function DemoTasksBanner() {
  const demoTasks = useAppStore((s) => s.tasks.filter((t) => t.isDemo));
  const totalMinutes = demoTasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="flask-outline" size={16} color="#b45309" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>Sample plan (demo)</Text>
        <Text style={styles.sub}>
          {demoTasks.length} sample tasks (~{totalMinutes} min). Scroll the schedule and explore — we will check in after about a minute.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#b4530910',
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#b4530928',
    marginBottom: 8,
  },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#92400e' },
  sub: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 17, color: Colors.onSurfaceVariant },
});
