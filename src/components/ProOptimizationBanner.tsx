import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { PREMIUM_COLOR } from '../monetization';
import { useAppStore } from '../store/useAppStore';

export function ProOptimizationBanner() {
  const summary = useAppStore((s) => s.lastProOptimizationSummary);
  const rules = useAppStore((s) => s.lastProOptimizationRules);

  if (!summary) return null;

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="star-four-points" size={16} color={PREMIUM_COLOR} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>Pro behavioral replanning</Text>
        <Text style={styles.sub}>{summary}</Text>
        {rules.length > 1 ? (
          <Text style={styles.extra}>+ {rules.length - 1} more adjustment{rules.length > 2 ? 's' : ''} applied</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: PREMIUM_COLOR + '12',
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR + '28',
    marginBottom: 8,
  },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: PREMIUM_COLOR },
  sub: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 17, color: Colors.onSurfaceVariant },
  extra: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.outline },
});
