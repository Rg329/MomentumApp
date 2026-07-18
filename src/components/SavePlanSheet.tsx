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
  onContinue: () => void;
  onSkip: () => void;
};

export function SavePlanSheet({ visible, onContinue, onSkip }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onSkip}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Save today&apos;s plan so you don&apos;t lose it</Text>
            <Text style={styles.subtitle}>
              Your tasks, schedule, and streak stay on this device until you back them up.
            </Text>

            <View style={styles.points}>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                <Text style={styles.pointText}>Pick up where you left off on any device</Text>
              </View>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                <Text style={styles.pointText}>One-time email code — no password</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.88}>
              <MaterialCommunityIcons name="email-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryLabel}>Continue with email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.8}>
              <Text style={styles.skipLabel}>Skip for now</Text>
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
  points: { gap: 8, marginTop: 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
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
