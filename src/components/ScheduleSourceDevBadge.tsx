import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { buildAndSaveUserSchedule } from '../scheduling/scheduleService';
import { isSupabaseConfigured } from '../supabase/client';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { Colors } from '../theme';

const DETAIL_LABELS: Record<string, string> = {
  supabase_not_configured: 'Supabase env vars missing in this build',
  not_signed_in: 'Not signed in — edge function requires auth',
  edge_function_failed: 'Edge function failed or returned no blocks',
};

function formatDetail(detail: string | null): string {
  if (!detail) return 'No extra detail recorded.';
  return DETAIL_LABELS[detail] ?? detail;
}

export function ScheduleSourceDevBadge() {
  if (!__DEV__) return null;

  const source = useAppStore((s) => s.lastScheduleSource);
  const sourceDetail = useAppStore((s) => s.lastScheduleSourceDetail);
  const blockCount = useAppStore((s) => s.scheduleBlocks.length);
  const [testing, setTesting] = useState(false);

  if (blockCount === 0 && !source) return null;

  const isClaude = source === 'claude';
  const label = source === 'claude' ? 'Claude' : source === 'local' ? 'Local' : 'Unknown';
  const accent = isClaude ? '#1a7f4b' : source === 'local' ? '#b45309' : Colors.outline;

  const showDetails = async () => {
    const signedIn = await isSupabaseSignedIn();
    const message = [
      `Last generation: ${label}`,
      `Detail: ${formatDetail(sourceDetail)}`,
      `Blocks: ${blockCount}`,
      `Supabase configured: ${isSupabaseConfigured ? 'yes' : 'no'}`,
      `Signed in now: ${signedIn ? 'yes' : 'no'}`,
      '',
      'Claude = Haiku via Supabase edge function (billable).',
      'Local = on-device algorithm (free).',
    ].join('\n');

    Alert.alert('Schedule source (dev)', message, [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Re-test generate',
        onPress: () => {
          setTesting(true);
          buildAndSaveUserSchedule()
            .then((result) => {
              Alert.alert(
                'Generate finished',
                `${result.source === 'claude' ? 'Claude' : 'Local'} — ${result.blocks.length} block(s)\n${formatDetail(result.sourceDetail ?? null)}`,
              );
            })
            .catch((e) => {
              Alert.alert('Generate failed', String(e));
            })
            .finally(() => setTesting(false));
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.badge, { borderColor: accent + '55', backgroundColor: accent + '14' }]}
      onPress={showDetails}
      activeOpacity={0.75}
      disabled={testing}
    >
      {testing ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <MaterialCommunityIcons
          name={isClaude ? 'robot-outline' : 'calculator-variant-outline'}
          size={13}
          color={accent}
        />
      )}
      <Text style={[styles.label, { color: accent }]}>{label} schedule</Text>
      <MaterialCommunityIcons name="information-outline" size={12} color={accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
});
