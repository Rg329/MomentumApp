import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { usePersonalization } from '../personalization';
import { trackTaskCompleted, trackTaskStarted } from '../intelligence/eventTracker';
import { buildCoachingContext, generateFocusCoachingLine } from '../coaching';
import { usePremium } from '../monetization';
import { useAppStore } from '../store/useAppStore';
import { CoachingStyleSheet } from '../components/CoachingStyleSheet';
import { SavePlanSheet } from '../components/SavePlanSheet';
import { TomorrowHookSheet } from '../components/TomorrowHookSheet';
import { formatPeakWindowLabel } from '../onboarding/tomorrowHookUtils';
import { minutesToDisplayTime } from '../utils/formatTime';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import {
  ensureNotificationPermissionsIfEnabled,
  scheduleTomorrowReminderIfEnabled,
} from '../notifications/safeEntry';

type Props = NativeStackScreenProps<RootStackParamList, 'FocusMode'>;

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function formatMinutesDisplay(total: number): string {
  return formatDisplayTime(minutesToTimeStr(total));
}

function parseTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return minutesToTimeStr(h * 60 + m);
}

const RESCHEDULE_MIN = 360;   // 6:00 AM
const RESCHEDULE_MAX = 1380;  // 11:00 PM
const RESCHEDULE_STEP = 15;

export function FocusModeScreen({ navigation, route }: Props) {
  const defaultFocus = useAppStore((s) => s.preferences.defaultFocusDurationMinutes);
  const {
    taskId,
    taskTitle = 'Focus Session',
    taskDesc = 'Stay in the zone. Deep work block for maximum concentration.',
    durationMinutes = defaultFocus,
    scheduledTime,
  } = route.params ?? {};

  const {
    rescheduleScheduleBlock,
    hasChosenCoachingStyle,
    hasSeenSavePrompt,
    hasSeenTomorrowHook,
    onboardingData,
    account,
    wakeTime,
    chooseCoachingStyle,
    skipCoachingStylePicker,
    dismissSavePrompt,
    acceptTomorrowReminder,
    declineTomorrowReminder,
    markTaskComplete,
    recordDayComplete,
  } = useAppStore();

  const p     = usePersonalization();
  const pm    = usePremium();
  const TOTAL = durationMinutes * 60;

  const focusTaskId = taskId ?? null;
  const isFreeSession = !taskId;

  const [timeLeft, setTimeLeft] = useState(TOTAL);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isPausedRef    = useRef(false);
  const isCompletedRef = useRef(false);
  const sessionEndTimeRef  = useRef<number | null>(null);
  const pausedAtRef        = useRef<number | null>(null);
  const pausedTimeLeftRef  = useRef<number>(TOTAL);
  const [showCoachingSheet, setShowCoachingSheet] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showTomorrowSheet, setShowTomorrowSheet] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(
    scheduledTime ? timeStrToMinutes(scheduledTime) : 540,
  );
  const [customTimeInput, setCustomTimeInput] = useState(
    scheduledTime ?? '09:00',
  );

  useEffect(() => {
    if (!showReschedule) return;
    const base = scheduledTime ? timeStrToMinutes(scheduledTime) : 540;
    setCustomMinutes(base);
    setCustomTimeInput(scheduledTime ?? minutesToTimeStr(base));
  }, [showReschedule, scheduledTime]);

  const customTimeValue = minutesToTimeStr(
    Math.min(Math.max(customMinutes, RESCHEDULE_MIN), RESCHEDULE_MAX),
  );

  const rescheduleOptions = useMemo(() => {
    const base = scheduledTime ? timeStrToMinutes(scheduledTime) : timeStrToMinutes('09:00');
    const offsets = [30, 60, 90, 120, 180, 240];
    const options = offsets.map((offset) => {
      const value = minutesToTimeStr(base + offset);
      return { label: formatDisplayTime(value), value };
    });
    if (scheduledTime) {
      return [{ label: `Keep at ${formatDisplayTime(scheduledTime)}`, value: scheduledTime }, ...options];
    }
    return options;
  }, [scheduledTime]);

  const handlePickReschedule = (newTime: string) => {
    if (taskId && scheduledTime && newTime !== scheduledTime) {
      rescheduleScheduleBlock(taskId, newTime);
    } else if (taskId && !scheduledTime && newTime) {
      rescheduleScheduleBlock(taskId, newTime);
    }
    setShowReschedule(false);
    navigation.goBack();
  };

  const handleConfirmCustomTime = () => {
    const parsed = parseTimeInput(customTimeInput);
    const newTime = parsed ?? customTimeValue;
    handlePickReschedule(newTime);
  };

  const handleSliderChange = (value: number) => {
    const snapped = Math.round(value / RESCHEDULE_STEP) * RESCHEDULE_STEP;
    setCustomMinutes(snapped);
    setCustomTimeInput(minutesToTimeStr(snapped));
  };

  const handleTimeInputChange = (text: string) => {
    setCustomTimeInput(text);
    const parsed = parseTimeInput(text);
    if (parsed) {
      const mins = timeStrToMinutes(parsed);
      if (mins >= RESCHEDULE_MIN && mins <= RESCHEDULE_MAX) {
        setCustomMinutes(mins);
      }
    }
  };

  // Behavioral coaching — updates at midway and completion
  const progressPct = Math.round((1 - timeLeft / TOTAL) * 100);
  const fallbackMsg = isCompleted
    ? p.coaching.focusComplete
    : progressPct >= 50
    ? p.coaching.focusMidway
    : p.coaching.focusStart;
  const [coachMsg, setCoachMsg] = useState(fallbackMsg);

  useEffect(() => {
    const surface = isCompleted
      ? 'focus_complete'
      : progressPct >= 50
      ? 'focus_midway'
      : 'focus_start';

    if (surface === lastCoachSurface.current) return;
    lastCoachSurface.current = surface;

    let cancelled = false;
    buildCoachingContext()
      .then((ctx) => {
        if (cancelled) return;
        setCoachMsg(
          generateFocusCoachingLine(
            surface,
            ctx,
            { currentTaskTitle: taskTitle, durationMinutes, progressPct: progressPct / 100 },
            pm.isPremium,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setCoachMsg(fallbackMsg);
      });

    return () => { cancelled = true; };
  }, [isCompleted, progressPct, taskTitle, durationMinutes, pm.isPremium]);

  const auraAnim     = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(1)).current;
  const trackedStart = useRef(false);
  const trackedComplete = useRef(false);
  const lastCoachSurface = useRef<string>('');

  useEffect(() => {
    if (trackedStart.current) return;
    trackedStart.current = true;
    if (focusTaskId) {
      trackTaskStarted(focusTaskId, taskTitle, durationMinutes);
    }
  }, [durationMinutes, focusTaskId, taskTitle]);

  useEffect(() => {
    if (!isCompleted || trackedComplete.current) return;
    trackedComplete.current = true;
    if (focusTaskId) {
      trackTaskCompleted(focusTaskId, taskTitle, durationMinutes);
    }
  }, [durationMinutes, focusTaskId, isCompleted, taskTitle]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(auraAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    sessionEndTimeRef.current = Date.now() + TOTAL * 1000;
  }, []);

  useEffect(() => {
    if (isPaused || isCompleted) return;
    const interval = setInterval(() => {
      if (sessionEndTimeRef.current === null) return;
      const remaining = Math.max(
        0,
        Math.round((sessionEndTimeRef.current - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsCompleted(true);
        isCompletedRef.current = true;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted]);

  useEffect(() => {
    if (isPaused) {
      pausedAtRef.current = Date.now();
      pausedTimeLeftRef.current = timeLeft;
    } else if (pausedAtRef.current !== null) {
      sessionEndTimeRef.current = Date.now() + pausedTimeLeftRef.current * 1000;
      pausedAtRef.current = null;
    }
  }, [isPaused]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (
        state === 'active' &&
        !isPausedRef.current &&
        !isCompletedRef.current &&
        sessionEndTimeRef.current !== null
      ) {
        const remaining = Math.max(
          0,
          Math.round((sessionEndTimeRef.current - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsCompleted(true);
          isCompletedRef.current = true;
        }
      }
    });
    return () => sub.remove();
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const progress = 1 - timeLeft / TOTAL;

  const auraOpacity = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const auraScale   = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const peakWindowLabel = formatPeakWindowLabel(
    p.scheduleHints.peakFocusStartMinutes,
    p.scheduleHints.peakFocusEndMinutes,
  );
  const wakeTimeLabel = minutesToDisplayTime(wakeTime);

  const continueAfterWin = () => {
    setTimeout(() => {
      navigation.goBack();
    }, 800);
  };

  const maybeShowTomorrowHook = () => {
    if (!focusTaskId || hasSeenTomorrowHook) {
      continueAfterWin();
      return;
    }
    setShowTomorrowSheet(true);
  };

  const handleTomorrowAccept = async () => {
    setShowTomorrowSheet(false);
    const granted = await ensureNotificationPermissionsIfEnabled();
    if (granted) {
      acceptTomorrowReminder();
      await scheduleTomorrowReminderIfEnabled(wakeTime);
    } else {
      declineTomorrowReminder();
    }
    continueAfterWin();
  };

  const handleTomorrowDecline = () => {
    declineTomorrowReminder();
    setShowTomorrowSheet(false);
    continueAfterWin();
  };

  const maybeShowSavePrompt = async () => {
    if (!focusTaskId || hasSeenSavePrompt) {
      maybeShowTomorrowHook();
      return;
    }

    const signedIn = await isSupabaseSignedIn();
    if (signedIn) {
      dismissSavePrompt();
      maybeShowTomorrowHook();
      return;
    }

    setShowSaveSheet(true);
  };

  const finishSession = () => {
    if (focusTaskId) {
      markTaskComplete(focusTaskId);
      recordDayComplete();
    }
    if (!hasChosenCoachingStyle && !onboardingData.coaching) {
      setShowCoachingSheet(true);
      return;
    }
    maybeShowSavePrompt();
  };

  const handleComplete = () => {
    Animated.sequence([
      Animated.timing(completeScale, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.spring(completeScale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      setIsCompleted(true);
      isCompletedRef.current = true;
      finishSession();
    });
  };

  const handleCoachingSelect = (key: string) => {
    chooseCoachingStyle(key);
    setShowCoachingSheet(false);
    maybeShowSavePrompt();
  };

  const handleCoachingSkip = () => {
    skipCoachingStylePicker();
    setShowCoachingSheet(false);
    maybeShowSavePrompt();
  };

  const handleSaveContinue = () => {
    dismissSavePrompt();
    setShowSaveSheet(false);
    navigation.navigate('Auth', { fromSavePrompt: true });
  };

  const handleSaveSkip = () => {
    dismissSavePrompt();
    setShowSaveSheet(false);
    maybeShowTomorrowHook();
  };

  const SPRINTS = 4;
  const currentSprint = Math.floor(progress * SPRINTS);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar />

      <Animated.View
        style={[styles.aura, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Task context */}
        <View style={styles.contextHeader}>
          <Text style={styles.sprintLabel}>Current Sprint</Text>
          <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
          {/* Personalized coaching message — updates at midway */}
          <Text style={styles.taskDesc} numberOfLines={3}>{coachMsg}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerWrap}>
          <Animated.View style={[styles.timerGlow, { opacity: auraOpacity }]} />
          <Text style={styles.timer}>{timerStr}</Text>
          <Text style={styles.timerSub}>REMAINING</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => setIsPaused((p) => {
              isPausedRef.current = !p;
              return !p;
            })}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.pauseLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <Animated.View style={[{ flex: 1.5 }, { transform: [{ scale: completeScale }] }]}>
            <TouchableOpacity
              style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
              onPress={handleComplete}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={Colors.onPrimary}
              />
              <Text style={styles.completeLabel}>
                {isCompleted ? 'Done!' : 'Complete Task'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Reschedule */}
        <TouchableOpacity
          style={styles.rescheduleBtn}
          onPress={() => setShowReschedule(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="calendar-refresh" size={14} color={Colors.primary} />
          <Text style={styles.rescheduleLabel}>Reschedule</Text>
        </TouchableOpacity>

        {/* Sprint progress */}
        <View style={styles.sprintDots}>
          {Array.from({ length: SPRINTS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.sprintDot,
                i < currentSprint && styles.sprintDotDone,
                i === currentSprint && styles.sprintDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <Modal
        visible={showReschedule}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReschedule(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowReschedule(false)} />
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="calendar-refresh" size={20} color={Colors.primary} />
              <Text style={styles.modalTitle}>Reschedule task</Text>
            </View>
            <Text style={styles.modalSub}>
              {scheduledTime
                ? `Currently at ${formatDisplayTime(scheduledTime)}. Choose any time below.`
                : 'Choose any time for this task.'}
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.customTimeCard}>
                <Text style={styles.customTimeLabel}>Your time</Text>
                <Text style={styles.customTimeDisplay}>{formatMinutesDisplay(customMinutes)}</Text>

                <Slider
                  style={styles.customSlider}
                  minimumValue={RESCHEDULE_MIN}
                  maximumValue={RESCHEDULE_MAX}
                  step={RESCHEDULE_STEP}
                  value={customMinutes}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.primaryFixed}
                  thumbTintColor={Colors.primary}
                />
                <View style={styles.sliderRange}>
                  <Text style={styles.sliderRangeLabel}>6:00 AM</Text>
                  <Text style={styles.sliderRangeLabel}>11:00 PM</Text>
                </View>

                <Text style={styles.inputLabel}>Or type a time (24h)</Text>
                <TextInput
                  value={customTimeInput}
                  onChangeText={handleTimeInputChange}
                  placeholder="09:30"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numbers-and-punctuation"
                  style={styles.timeInput}
                  maxLength={5}
                />

                <TouchableOpacity
                  style={styles.confirmCustomBtn}
                  onPress={handleConfirmCustomTime}
                  activeOpacity={0.88}
                >
                  <Text style={styles.confirmCustomLabel}>
                    Confirm {formatMinutesDisplay(customMinutes)}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.quickLabel}>Quick options</Text>
              {rescheduleOptions.map((opt) => {
                const isCurrent = opt.value === scheduledTime;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalOption, isCurrent && styles.modalOptionCurrent]}
                    onPress={() => handlePickReschedule(opt.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalOptionLabel, isCurrent && styles.modalOptionLabelCurrent]}>
                      {opt.label}
                    </Text>
                    {isCurrent ? (
                      <Text style={styles.modalOptionHint}>Current</Text>
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.outline} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowReschedule(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <CoachingStyleSheet
        visible={showCoachingSheet}
        onSelect={handleCoachingSelect}
        onSkip={handleCoachingSkip}
      />

      <SavePlanSheet
        visible={showSaveSheet}
        onContinue={handleSaveContinue}
        onSkip={handleSaveSkip}
      />

      <TomorrowHookSheet
        visible={showTomorrowSheet}
        peakWindowLabel={peakWindowLabel}
        wakeTimeLabel={wakeTimeLabel}
        onAccept={handleTomorrowAccept}
        onDecline={handleTomorrowDecline}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  aura: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0,88,190,0.06)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 80,
    gap: 28,
  },
  contextHeader: { alignItems: 'center', gap: 8 },
  sprintLabel: {
    ...Typography.labelSm,
    color: Colors.primary + '99',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  taskTitle: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 34,
  },
  taskDesc: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },
  timerWrap: { alignItems: 'center', position: 'relative' },
  timerGlow: {
    position: 'absolute',
    top: -20,
    width: 260,
    height: 130,
    borderRadius: 100,
    backgroundColor: Colors.primary + '10',
  },
  timer: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 88,
    lineHeight: 96,
    color: Colors.primary,
    letterSpacing: -3,
    textShadowColor: Colors.primary + '22',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  timerSub: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant + '66',
    letterSpacing: 3,
    marginTop: -8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 380,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pauseLabel: { ...Typography.labelSm, color: Colors.primary, fontSize: 14 },
  completeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  completeBtnDone: { backgroundColor: Colors.secondary },
  completeLabel: { ...Typography.labelSm, color: Colors.onPrimary, fontSize: 14 },
  rescheduleBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFixed + '80',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  rescheduleLabel: { ...Typography.labelSm, color: Colors.primary, fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    maxHeight: 420,
  },
  customTimeCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    gap: 8,
  },
  customTimeLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  customTimeDisplay: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: Colors.primary,
    textAlign: 'center',
    marginVertical: 4,
  },
  customSlider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  sliderRangeLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: Colors.outline,
  },
  inputLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
  },
  timeInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  confirmCustomBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmCustomLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onPrimary,
  },
  quickLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.gutter,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '70%',
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontFamily: 'Manrope_700Bold',
  },
  modalSub: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
  },
  modalOptionCurrent: {
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primaryFixed + '60',
  },
  modalOptionLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
  },
  modalOptionLabelCurrent: {
    color: Colors.primary,
  },
  modalOptionHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  modalCancelLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.outline,
  },
  sprintDots: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 28,
  },
  sprintDot: {
    height: 4,
    width: 60,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  sprintDotDone:   { backgroundColor: Colors.primary },
  sprintDotActive: { backgroundColor: Colors.primary, opacity: 0.55 },
});
