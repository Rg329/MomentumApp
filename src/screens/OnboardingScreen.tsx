import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { ONBOARDING_OPTIONS } from '../data/onboardingOptions';
import { useAppStore } from '../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_MAP: Record<string, IconName> = {
  layers_clear:          'layers-remove',
  timer_sand:            'timer-sand',
  compass_off:           'help-circle-outline',
  notifications_paused:  'bell-off',
  calendar_refresh:      'calendar-sync-outline',
  clock_alert:           'clock-alert-outline',
  wb_sunny:              'weather-sunny',
  light_mode:            'white-balance-sunny',
  bedtime:               'weather-night',
};

const STEPS = ['procrastinationType', 'peakTime'] as const;
const STEP_TITLES = [
  "What's stopping you\ntoday?",
  'When do you focus\nbest?',
];
const STEP_SUBTITLES = [
  "We'll shape your plan around what actually holds you back.",
  "We'll protect these hours for your hardest work.",
];

export function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | null>>({
    procrastinationType: null,
    peakTime: null,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const didNavigatePost = useRef(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.9)).current;

  const { setHasOnboarded, setOnboardingData } = useAppStore();

  const currentKey = STEPS[step];
  const currentOptions =
    currentKey === 'procrastinationType'
      ? ONBOARDING_OPTIONS.procrastinationTypes
      : ONBOARDING_OPTIONS.peakTime;

  const canProceed = selections[currentKey] !== null;

  const finishOnboarding = () => {
    setOnboardingData({
      procrastinationType: selections.procrastinationType,
      peakTime: selections.peakTime,
    });
    setHasOnboarded(true);
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const goToPlan = () => {
    navigation.replace('MainTabs', { screen: 'Focus' });
  };

  useEffect(() => {
    if (!showSuccess) return;
    if (didNavigatePost.current) return;
    didNavigatePost.current = true;
    const t = setTimeout(goToPlan, 900);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const animateToStep = (dir: 'forward' | 'back') => {
    const toValue = dir === 'forward' ? -40 : 40;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      animateToStep('forward');
      setTimeout(() => setStep((s) => s + 1), 100);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      animateToStep('back');
      setTimeout(() => setStep((s) => s - 1), 100);
    }
  };

  const handleSelect = (key: string) => {
    setSelections((s) => ({ ...s, [currentKey]: key }));
  };

  const progressValue = (step + 1) / STEPS.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.logoText}>Momentum</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>{step + 1}/{STEPS.length}</Text>
        </View>
      </View>

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.question}>{STEP_TITLES[step]}</Text>
          <Text style={styles.subtitle}>{STEP_SUBTITLES[step]}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsGrid}>
          {currentOptions.map((opt) => {
            const isSelected = selections[currentKey] === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.8}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              >
                <View style={[styles.optionIconWrap, isSelected && styles.optionIconWrapSelected]}>
                  <MaterialCommunityIcons
                    name={ICON_MAP[(opt as { icon: string }).icon] ?? 'circle-outline'}
                    size={20}
                    color={isSelected ? Colors.primary : Colors.outline}
                  />
                </View>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, step === 0 && { opacity: 0 }]}
          disabled={step === 0}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.88}
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
        >
          <Text style={styles.nextLabel}>
            {step === STEPS.length - 1 ? 'Build my plan →' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <View style={styles.successBlob1} />
          <View style={styles.successBlob2} />
          <Animated.View style={[styles.successContent, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
            </View>
            <Text style={styles.successTitle}>Got it.</Text>
            <Text style={styles.successSubtitle}>
              Let's turn what's on your mind into a plan for the next few hours.
            </Text>
            <TouchableOpacity style={styles.successBtn} onPress={goToPlan} activeOpacity={0.88}>
              <View style={styles.successBtnShine} />
              <Text style={styles.successBtnLabel}>Add my tasks</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant + '25',
  },
  logoText: { ...Typography.headlineSm, color: Colors.primary, fontFamily: 'Manrope_700Bold' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    width: 72,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  stepCount: { ...Typography.labelSm, color: Colors.secondary },
  content: { flex: 1, paddingHorizontal: Spacing.gutter, paddingTop: Spacing.md },
  titleBlock: { marginBottom: Spacing.md },
  question: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: { ...Typography.bodyLg, color: Colors.onSurfaceVariant },
  optionsGrid: { gap: 12, paddingBottom: 20 },
  optionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.card,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
    transform: [{ translateY: -2 }],
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionIconWrapSelected: { backgroundColor: Colors.primaryFixed },
  optionLabel: { ...Typography.headlineSm, color: Colors.onSurface },
  optionLabelSelected: { color: Colors.primary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  backBtn: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  backLabel: { ...Typography.labelSm, color: Colors.secondary, fontSize: 14 },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  nextBtnDisabled: { opacity: 0.45 },
  nextLabel: { ...Typography.labelSm, color: Colors.onPrimary, fontSize: 14 },
  successOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: Spacing.gutter,
  },
  successBlob1: {
    position: 'absolute', top: -80, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary + '0f',
  },
  successBlob2: {
    position: 'absolute', bottom: 40, left: -110,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primaryFixed + '35',
  },
  successContent: { width: '100%', alignItems: 'center' },
  successIconWrap: { marginBottom: Spacing.lg },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '18',
  },
  successIconText: { fontSize: 36, color: Colors.primary },
  successTitle: {
    ...Typography.displayLg,
    fontSize: 32,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
    lineHeight: 24,
  },
  successBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: Radius.xl,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  successBtnShine: {
    position: 'absolute', top: -14, left: 22,
    width: 110, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '20deg' }],
  },
  successBtnLabel: { ...Typography.headlineSm, color: Colors.onPrimary, fontFamily: 'Manrope_700Bold' },
});
