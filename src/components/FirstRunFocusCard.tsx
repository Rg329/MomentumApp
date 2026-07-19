import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../theme';
import type { StarterTask } from '../onboarding/starterTasks';
import { starterTasksTotalMinutes } from '../onboarding/starterTasks';

type Props = {
  sampleTasks: StarterTask[];
  onTrySample: () => void;
  onAddOwn: () => void;
};

export function FirstRunFocusCard({ sampleTasks, onTrySample, onAddOwn }: Props) {
  const totalMinutes = starterTasksTotalMinutes(sampleTasks);
  const hoursLabel =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 ? `${totalMinutes % 60}m` : ''}`.trim()
      : `${totalMinutes}m`;

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <MaterialCommunityIcons name="compass-outline" size={14} color={Colors.primary} />
        <Text style={styles.badgeText}>Welcome to Momentum</Text>
      </View>

      <Text style={styles.title}>How do you want to start?</Text>
      <Text style={styles.subtitle}>
        Try a fuller sample day ({sampleTasks.length} tasks, ~{hoursLabel}) to see how Momentum builds a real schedule — or add your own tasks.
      </Text>

      <View style={styles.sampleBox}>
        <View style={styles.sampleHeader}>
          <MaterialCommunityIcons name="flask-outline" size={14} color="#b45309" />
          <Text style={styles.sampleLabel}>Sample tasks (demo only)</Text>
        </View>
        {sampleTasks.map((task) => (
          <View key={task.text} style={styles.sampleRow}>
            <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={13} color={Colors.outline} />
            <Text style={styles.sampleText}>{task.text}</Text>
            <Text style={styles.sampleMins}>{task.durationMinutes}m</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onTrySample} activeOpacity={0.88}>
        <MaterialCommunityIcons name="play-circle-outline" size={18} color={Colors.onPrimary} />
        <Text style={styles.primaryLabel}>Try sample plan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onAddOwn} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus-circle-outline" size={17} color={Colors.primary} />
        <Text style={styles.secondaryLabel}>Add my own tasks</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '35',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 0.4 },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 20, color: Colors.onSurface, letterSpacing: -0.4 },
  subtitle: { fontFamily: 'Manrope_500Medium', fontSize: 13.5, lineHeight: 20, color: Colors.onSurfaceVariant },
  sampleBox: {
    backgroundColor: '#b453090a',
    borderRadius: Radius.lg,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#b4530922',
  },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sampleLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#b45309', letterSpacing: 0.3 },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sampleText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  sampleMins: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.outline },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  primaryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  secondaryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.primary },
});
