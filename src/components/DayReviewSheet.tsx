import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

type Props = {
  visible: boolean;
  completedCount: number;
  skippedCount: number;
  totalBlocks: number;
  onReviewInsights: () => void;
  onDismiss: () => void;
};

export function DayReviewSheet({
  visible,
  completedCount,
  skippedCount,
  totalBlocks,
  onReviewInsights,
  onDismiss,
}: Props) {
  const pending = Math.max(0, totalBlocks - completedCount - skippedCount);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>How did today go?</Text>
            <Text style={styles.subtitle}>
              A quick look at what you actually did — not what you planned.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                <Text style={styles.statVal}>{completedCount}</Text>
                <Text style={styles.statLbl}>Done</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={Colors.outline} />
                <Text style={styles.statVal}>{skippedCount}</Text>
                <Text style={styles.statLbl}>Skipped</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.secondary} />
                <Text style={styles.statVal}>{pending}</Text>
                <Text style={styles.statLbl}>Open</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onReviewInsights} activeOpacity={0.88}>
              <MaterialCommunityIcons name="chart-areaspline" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryLabel}>Review my day</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skip} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.skipLabel}>Not tonight</Text>
            </TouchableOpacity>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.gutter,
  },
  center: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...Typography.displayLg,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    lineHeight: 21,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '25',
  },
  statVal: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: Colors.onSurface },
  statLbl: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.onSurfaceVariant },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onPrimary,
  },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.outline,
    textDecorationLine: 'underline',
  },
});
