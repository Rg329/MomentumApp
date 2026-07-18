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
  pendingEventCount?: number;
  title?: string;
  subtitle?: string;
  onContinue: () => void;
  onSkip: () => void;
};

export function SignInPromptSheet({
  visible,
  pendingEventCount = 0,
  title = 'Sign in to save your progress',
  subtitle,
  onContinue,
  onSkip,
}: Props) {
  const defaultSubtitle =
    pendingEventCount > 0
      ? `${pendingEventCount} action${pendingEventCount !== 1 ? 's' : ''} waiting to sync — sign in so your coach can learn from real behavior.`
      : 'Your tasks, check-ins, and coaching insights sync to your account — one-time email code, no password.';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onSkip}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="account-lock-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>

            {pendingEventCount > 0 && (
              <View style={styles.pendingBadge}>
                <MaterialCommunityIcons name="cloud-sync-outline" size={16} color={Colors.primary} />
                <Text style={styles.pendingText}>
                  {pendingEventCount} unsynced update{pendingEventCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.88}>
              <MaterialCommunityIcons name="email-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryLabel}>Continue with email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.8}>
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed + '90',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  pendingText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
