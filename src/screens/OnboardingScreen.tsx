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
import { ONBOARDING_OPTIONS } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { CircadianRhythmPicker } from '../components/CircadianRhythmPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_MAP: Record<string, IconName> = {
  // procrastination type icons
  layers_clear:          'layers-remove',
  timer_sand:            'timer-sand',
  compass_off:           'help-circle-outline',
  notifications_paused:  'bell-off',
  calendar_refresh:      'calendar-sync-outline',
  clock_alert:           'clock-alert-outline',
  // peak time icons
  wb_sunny:              'weather-sunny',
  light_mode:            'white-balance-sunny',
  bedtime:               'weather-night',
  // coaching style icons
  favorite:              'heart',
  balance:               'scale-balance',
  gavel:                 'gavel',
};

const STEPS = ['procrastinationType', 'peakTime', 'circadianRhythm', 'coaching'] as const;
const STEP_TITLES = [
  'What usually makes\nyou procrastinate?',
  'When are you\nnaturally most focused?',
  'What is your\ncircadian rhythm?',
  'How should Momentum\ncoach you?',
];
const STEP_SUBTITLES = [
  "We'll rebuild your schedule around your specific procrastination pattern.",
  "We'll protect your peak hours for your most important tasks.",
  'Set your wake and sleep window so Momentum can architect your day.',
  'How should Momentum communicate with you?',
];

export function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | null>>({
    procrastinationType: null, peakTime: null, coaching: null,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const didNavigatePost = useRef(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.9)).current;

  const { setHasOnboarded, setOnboardingData, wakeTime, sleepTime, setWakeTime, setSleepTime } = useAppStore();

  const currentKey = STEPS[step];
  const isCircadianStep = currentKey === 'circadianRhythm';
  const currentOptions =
    currentKey === 'procrastinationType'
      ? ONBOARDING_OPTIONS.procrastinationTypes
      : currentKey === 'peakTime'
      ? ONBOARDING_OPTIONS.peakTime
      : currentKey === 'coaching'
      ? ONBOARDING_OPTIONS.coaching
      : [];

  const canProceed = isCircadianStep ? true : selections[currentKey] !== null;

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
      // Persist onboarding answers locally first (offline-safe)
      setOnboardingData({
        procrastinationType: selections.procrastinationType,
        peakTime: selections.peakTime,
        coaching: selections.coaching,
      });
      setHasOnboarded(true);
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  };

  useEffect(() => {
    if (!showSuccess) return;
    if (didNavigatePost.current) return;
    didNavigatePost.current = true;
    const t = setTimeout(() => navigation.replace('ProOffer', { fromOnboarding: true }), 900);
    return () => clearTimeout(t);
  }, [navigation, showSuccess]);

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>Momentum</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>
        </View>
      </View>

      {/* Step Content */}
      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.question}>{STEP_TITLES[step]}</Text>
          <Text style={styles.subtitle}>{STEP_SUBTITLES[step]}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={isCircadianStep ? styles.circadianContent : styles.optionsGrid}
        >
          {isCircadianStep ? (
            <View style={styles.circadianCard}>
              <CircadianRhythmPicker
                wakeTime={wakeTime}
                sleepTime={sleepTime}
                onWakeTimeChange={setWakeTime}
                onSleepTimeChange={setSleepTime}
              />
            </View>
          ) : (
            currentOptions.map((opt) => {
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
                  {'desc' in opt ? (
                    <Text style={styles.optionDesc}>{(opt as { desc: string }).desc}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {/* Footer navigation */}
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
            {step === STEPS.length - 1 ? 'Finish ✓' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            { opacity: successOpacity },
          ]}
        >
          <View style={styles.successBlob1} />
          <View style={styles.successBlob2} />
          <Animated.View style={[styles.successContent, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
            </View>
            <Text style={styles.successTitle}>Ready to beat procrastination.</Text>
            <Text style={styles.successSubtitle}>
              Your anti-procrastination profile is set. Momentum will coach you based on what holds you back and when you focus best.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => navigation.replace('ProOffer', { fromOnboarding: true })}
              activeOpacity={0.88}
            >
              <View style={styles.successBtnShine} />
              <Text style={styles.successBtnLabel}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant + '25',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
  },
  logoText: {
    ...Typography.headlineSm,
    color: Colors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: 90,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepCount: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
  },
  titleBlock: {
    marginBottom: Spacing.md,
  },
  question: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
  },
  optionsGrid: {
    gap: 12,
    paddingBottom: 20,
  },
  circadianContent: {
    paddingBottom: 20,
  },
  circadianCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.outlineVariant + '25',
    ...Shadow.card,
  },
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
  optionIconWrapSelected: {
    backgroundColor: Colors.primaryFixed,
  },
  optionLabel: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  backBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backLabel: {
    ...Typography.labelSm,
    color: Colors.secondary,
    fontSize: 14,
  },
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
  nextBtnDisabled: {
    opacity: 0.45,
  },
  nextLabel: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontSize: 14,
  },
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
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.primary + '0f',
  },
  successBlob2: {
    position: 'absolute',
    bottom: 40,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryFixed + '35',
  },
  successContent: {
    width: '100%',
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '18',
  },
  successIconText: {
    fontSize: 36,
    color: Colors.primary,
  },
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
    position: 'absolute',
    top: -14,
    left: 22,
    width: 110,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '20deg' }],
  },
  successBtnLabel: {
    ...Typography.headlineSm,
    color: Colors.onPrimary,
    fontFamily: 'Manrope_700Bold',
  },
});
