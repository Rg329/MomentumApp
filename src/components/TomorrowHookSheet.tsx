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
  peakWindowLabel: string;
  wakeTimeLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function TomorrowHookSheet({
  visible,
  peakWindowLabel,
  wakeTimeLabel,
  onAccept,
  onDecline,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDecline}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Same time tomorrow?</Text>
            <Text style={styles.subtitle}>
              A quick nudge helps you build the habit — not another long setup.
            </Text>

            <View style={styles.peakCard}>
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={Colors.primary} />
              <Text style={styles.peakText}>
                Daily reminder at{' '}
                <Text style={styles.peakAccent}>{wakeTimeLabel}</Text>
                {' '}— your peak window is {peakWindowLabel}.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onAccept} activeOpacity={0.88}>
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryLabel}>Yes, remind me</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skip} onPress={onDecline} activeOpacity={0.8}>
              <Text style={styles.skipLabel}>Not now</Text>
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
  peakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryFixed + '90',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  peakText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  peakAccent: {
    fontFamily: 'Manrope_700Bold',
    color: Colors.primary,
  },
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
