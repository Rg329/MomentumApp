import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { CircadianRhythmPicker } from './CircadianRhythmPicker';

type Props = {
  visible: boolean;
  wakeTime: number;
  sleepTime: number;
  onWakeTimeChange: (v: number) => void;
  onSleepTimeChange: (v: number) => void;
  onConfirm: () => void;
  onDismiss?: () => void;
};

export function WakeSleepSheet({
  visible,
  wakeTime,
  sleepTime,
  onWakeTimeChange,
  onSleepTimeChange,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.handle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="weather-sunny" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.title}>When are you usually up and done?</Text>
                <Text style={styles.subtitle}>
                  We'll fit your plan inside this window — adjust anytime in Settings.
                </Text>
                <View style={styles.pickerCard}>
                  <CircadianRhythmPicker
                    wakeTime={wakeTime}
                    sleepTime={sleepTime}
                    onWakeTimeChange={onWakeTimeChange}
                    onSleepTimeChange={onSleepTimeChange}
                    showAura={false}
                  />
                </View>
                <TouchableOpacity style={styles.cta} activeOpacity={0.88} onPress={onConfirm}>
                  <Text style={styles.ctaLabel}>Build my plan</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.onPrimary} />
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  keyboard: { width: '100%' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    ...Shadow.card,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 24,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  title: {
    ...Typography.displayLg,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 4,
  },
  pickerCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    marginTop: 4,
  },
  ctaLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onPrimary,
  },
});
