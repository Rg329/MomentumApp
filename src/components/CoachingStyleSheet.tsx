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
import { ONBOARDING_OPTIONS } from '../data/onboardingOptions';
import { Colors, Typography, Spacing, Radius } from '../theme';

const SAMPLE_LINES: Record<string, string> = {
  supportive: '"You\'re doing wonderfully — one block at a time."',
  balanced:   '"Let\'s build a productive day — start with what matters most."',
  strict:     '"Your focus window is open. No excuses — begin now."',
};

type Props = {
  visible: boolean;
  onSelect: (key: string) => void;
  onSkip: () => void;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_MAP: Record<string, IconName> = {
  favorite: 'heart',
  balance: 'scale-balance',
  gavel: 'gavel',
};

export function CoachingStyleSheet({ visible, onSelect, onSkip }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onSkip}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="message-text-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>How should Momentum talk to you?</Text>
            <Text style={styles.subtitle}>Pick the voice that actually motivates you.</Text>

            <View style={styles.options}>
              {ONBOARDING_OPTIONS.coaching.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.option}
                  activeOpacity={0.85}
                  onPress={() => onSelect(opt.key)}
                >
                  <View style={styles.optionHeader}>
                    <MaterialCommunityIcons
                      name={ICON_MAP[opt.icon] ?? 'circle-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </View>
                  <Text style={styles.sampleLine}>{SAMPLE_LINES[opt.key] ?? opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.8}>
              <Text style={styles.skipLabel}>Skip — keep balanced tone</Text>
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
    marginBottom: 4,
  },
  options: { gap: 10 },
  option: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '35',
    gap: 6,
  },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  sampleLine: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.outline,
    textDecorationLine: 'underline',
  },
});
