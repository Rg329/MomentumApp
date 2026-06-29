import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  FlatList,
  ScrollView,
  Easing,
  Dimensions,
  Keyboard,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { WelcomeCard } from '../components/WelcomeCard';
import { useAppStore, Task } from '../store/useAppStore';
import { usePersonalization } from '../personalization';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import { PremiumBadge } from '../components/PremiumBadge';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { DurationScrollPicker } from '../components/DurationScrollPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'BrainDump'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width, height } = Dimensions.get('window');

const DURATION_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hr',   minutes: 60 },
  { label: '2 hr',   minutes: 120 },
];

const PRESET_MINUTES = new Set(DURATION_PRESETS.map((p) => p.minutes));
const MIN_TASK_DURATION = 5;
const MAX_TASK_DURATION = 480;

function clampTaskDuration(minutes: number) {
  return Math.min(MAX_TASK_DURATION, Math.max(MIN_TASK_DURATION, minutes));
}

function isPresetDuration(minutes: number) {
  return PRESET_MINUTES.has(minutes);
}

function formatDuration(minutes: number) {
  return {
    hrs: Math.floor(minutes / 60).toString().padStart(2, '0'),
    min: (minutes % 60).toString().padStart(2, '0'),
  };
}

function durationLabel(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ─── Soft floating blob ───────────────────────────────────────────────────────
function SoftBlob({ x, y, size, color, dur, delay }: {
  x: number; y: number; size: number; color: string; dur: number; delay: number;
}) {
  const fy = useRef(new Animated.Value(0)).current;
  const fx = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = (a: Animated.Value, to: number, d: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: to,  duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true, delay }),
        Animated.timing(a, { toValue: 0,   duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    loop(fy, -20, dur);
    loop(fx, 12, dur * 1.4);
    loop(sc, 1.15, dur * 0.8);
  }, []);

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ translateY: fy }, { translateX: fx }, { scale: sc }],
    }} />
  );
}

// ─── Pulsing ring icon ────────────────────────────────────────────────────────
function PulseIcon({ icon }: { icon: IconName }) {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (a: Animated.Value, del: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(del),
        Animated.timing(a, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])).start();
    pulse(r1, 0);
    pulse(r2, 1000);
  }, []);

  const ring = (a: Animated.Value) => ({
    position: 'absolute' as const,
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5, borderColor: Colors.primary,
    opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.2, 0] }),
    transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  });

  return (
    <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={ring(r1)} />
      <Animated.View style={ring(r2)} />
      <View style={styles.pulseIconInner}>
        <MaterialCommunityIcons name={icon} size={28} color={Colors.primary} />
      </View>
    </View>
  );
}

// ─── Animated chip (bounces on press) ────────────────────────────────────────
function AnimatedChip({
  label, selected, onPress, icon,
}: {
  label: string; selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, {
    toValue: 0.88, useNativeDriver: true, tension: 500, friction: 8,
  }).start();
  const pressOut = () => Animated.spring(scale, {
    toValue: 1, useNativeDriver: true, tension: 300, friction: 7,
  }).start();

  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[styles.chip, selected && styles.chipSelected, { transform: [{ scale }] }]}>
        {icon && (
          <MaterialCommunityIcons name={icon} size={13} color={selected ? Colors.onPrimary : Colors.onSurfaceVariant} />
        )}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Animated primary button ──────────────────────────────────────────────────
function AnimatedPrimaryButton({ label, onPress, disabled }: {
  label: string; onPress: () => void; disabled?: boolean;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }),
      Animated.timing(opacity, { toValue: 0.88, useNativeDriver: true, duration: 60 }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale,   { toValue: 1.025, useNativeDriver: true, tension: 400, friction: 6 }),
        Animated.spring(scale,   { toValue: 1,     useNativeDriver: true, tension: 300, friction: 8 }),
      ]),
      Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 120 }),
    ]).start();
  };

  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} disabled={disabled} activeOpacity={1}>
      <Animated.View style={[
        styles.primaryBtn,
        disabled && styles.primaryBtnDisabled,
        { transform: [{ scale }], opacity },
      ]}>
        <Text style={styles.primaryBtnLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Add Task Modal (full-screen sheet — keyboard-safe) ───────────────────────
function AddTaskModal({ visible, onClose, onAdd, editTaskId, initialText, initialDuration }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (text: string, durationMinutes: number) => void;
  editTaskId?: string | null;
  initialText?: string;
  initialDuration?: number;
}) {
  const insets = useSafeAreaInsets();
  const defaultDuration = useAppStore((s) => s.preferences.defaultFocusDurationMinutes);
  const [taskName, setTaskName] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [customMode, setCustomMode] = useState(false);
  const wasVisibleRef = useRef(false);

  const canSubmit = taskName.trim().length > 0;

  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!justOpened) return;

    const duration = initialDuration ?? defaultDuration;
    if (editTaskId != null && initialText != null) {
      setTaskName(initialText);
      setSelectedDuration(clampTaskDuration(duration));
      setCustomMode(!isPresetDuration(duration));
    } else {
      setTaskName('');
      setSelectedDuration(defaultDuration);
      setCustomMode(false);
    }
  }, [visible, editTaskId, initialText, initialDuration, defaultDuration]);

  const submit = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    onAdd(taskName.trim(), clampTaskDuration(selectedDuration));
    onClose();
  };

  const selectPreset = (minutes: number) => {
    Keyboard.dismiss();
    setCustomMode(false);
    setSelectedDuration(minutes);
  };

  const selectCustom = () => {
    Keyboard.dismiss();
    setCustomMode(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <KeyboardAvoidingView
          style={styles.modalKav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.inlineHandle} />

            <View style={styles.inlineHeader}>
              <View style={styles.inlineHeaderLeft}>
                <View style={styles.inlineIconWrap}>
                  <MaterialCommunityIcons
                    name={editTaskId ? 'pencil-outline' : 'plus'}
                    size={16}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inlineTitle}>{editTaskId ? 'Edit task' : 'New task'}</Text>
                  <Text style={styles.inlineSubtitle}>Name it, pick a duration, then add</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.inlineCloseBtn}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialCommunityIcons name="close" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.inlineInputCard}>
              <MaterialCommunityIcons name="format-list-checks" size={18} color={Colors.primary} />
              <TextInput
                style={styles.inlineInput}
                placeholder="What do you want to accomplish?"
                placeholderTextColor={Colors.outline + '90'}
                value={taskName}
                onChangeText={setTaskName}
                returnKeyType="done"
                onSubmitEditing={submit}
                blurOnSubmit={false}
                autoCorrect={false}
                autoFocus
                cursorColor={Colors.primary}
                selectionColor={Colors.primaryFixed}
              />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBodyContent}
            >
              <View style={styles.inlineDurationSection}>
                <View style={styles.inlineDurationHeader}>
                  <Text style={styles.inlineDurationLabel}>Duration</Text>
                  <View style={styles.inlineDurationBadge}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.primary} />
                    <Text style={styles.inlineDurationBadgeText}>{durationLabel(selectedDuration)}</Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.inlineChipRow}
                >
                  {DURATION_PRESETS.map((p) => {
                    const active = !customMode && selectedDuration === p.minutes;
                    return (
                      <TouchableOpacity
                        key={p.minutes}
                        style={[styles.inlineChip, active && styles.inlineChipSelected]}
                        onPress={() => selectPreset(p.minutes)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.inlineChipText, active && styles.inlineChipTextSelected]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.inlineChip, customMode && styles.inlineChipSelected]}
                    onPress={selectCustom}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="tune-variant"
                      size={13}
                      color={customMode ? Colors.onPrimary : Colors.onSurfaceVariant}
                    />
                    <Text style={[styles.inlineChipText, customMode && styles.inlineChipTextSelected]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {customMode && (
                  <View style={styles.customBlock}>
                    <DurationScrollPicker
                      value={selectedDuration}
                      onChange={setSelectedDuration}
                      minMinutes={MIN_TASK_DURATION}
                      maxMinutes={MAX_TASK_DURATION}
                      onInteract={() => Keyboard.dismiss()}
                    />
                    <Text style={styles.customHint}>Scroll to set any duration from 5 min to 8 hr</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.inlineConfirmBtn, !canSubmit && styles.inlineConfirmBtnDisabled]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.88}
            >
              <Text style={styles.inlineConfirmLabel}>
                {editTaskId ? 'Save changes' : 'Add task'}
              </Text>
              <View style={styles.inlineConfirmIcon}>
                <MaterialCommunityIcons name="arrow-up" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Today's Capacity card ────────────────────────────────────────────────────
function CapacityCard({ plannedMins, availableMins }: { plannedMins: number; availableMins: number }) {
  const isOverloaded = plannedMins > availableMins;
  const diff = Math.abs(plannedMins - availableMins);
  const fillPct = Math.min(1, plannedMins / Math.max(availableMins, 1));
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(barAnim, { toValue: fillPct, useNativeDriver: false, tension: 60, friction: 12 }).start();
  }, [fillPct]);

  const barColor = isOverloaded ? '#ef4444' : Colors.primary;

  return (
    <View style={styles.capacityCard}>
      {/* Header row */}
      <View style={styles.capacityHeader}>
        <View style={styles.capacityBadge}>
          <MaterialCommunityIcons name="lightning-bolt" size={11} color={Colors.primary} />
          <Text style={styles.capacityBadgeText}>Today's Capacity</Text>
        </View>
        <View style={[styles.statusBadge, isOverloaded && styles.statusBadgeRed]}>
          <MaterialCommunityIcons
            name={isOverloaded ? 'alert-circle-outline' : 'check-circle-outline'}
            size={11}
            color={isOverloaded ? '#ef4444' : '#16a34a'}
          />
          <Text style={[styles.statusText, isOverloaded && styles.statusTextRed]}>
            {isOverloaded ? `Overloaded by ${durationLabel(diff)}` : 'Realistic ✓'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.capacityBarTrack}>
        <Animated.View style={[
          styles.capacityBarFill,
          { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: barColor },
        ]} />
      </View>

      {/* Stats row */}
      <View style={styles.capacityStats}>
        <View style={styles.capacityStat}>
          <Text style={styles.capacityStatLabel}>Available Time</Text>
          <Text style={styles.capacityStatValue}>{durationLabel(availableMins)}</Text>
        </View>
        <View style={styles.capacityDivider} />
        <View style={styles.capacityStat}>
          <Text style={styles.capacityStatLabel}>Planned Work</Text>
          <Text style={[styles.capacityStatValue, isOverloaded && { color: '#ef4444' }]}>
            {durationLabel(plannedMins)}
          </Text>
        </View>
        {isOverloaded && (
          <>
            <View style={styles.capacityDivider} />
            <View style={styles.capacityStat}>
              <Text style={styles.capacityStatLabel}>Over by</Text>
              <Text style={[styles.capacityStatValue, { color: '#ef4444' }]}>{durationLabel(diff)}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Today's Plan preview card ────────────────────────────────────────────────

function PlanPreviewCard({ tasks, plannedMins, onPress }: {
  tasks: Task[]; plannedMins: number; onPress: () => void;
}) {
  const preview = tasks.slice(0, 3);
  const remaining = tasks.length - preview.length;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  return (
    <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <Animated.View style={[styles.previewCard, { transform: [{ scale }] }]}>
      <View style={styles.previewHeader}>
        <View style={styles.capacityBadge}>
          <MaterialCommunityIcons name="calendar-text" size={11} color={Colors.primary} />
          <Text style={styles.capacityBadgeText}>Today's Plan</Text>
        </View>
        <Text style={styles.previewHint}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {durationLabel(plannedMins)}</Text>
      </View>

      <View style={styles.previewItems}>
        {preview.map((task, i) => (
          <View key={task.id} style={styles.previewItem}>
            <View style={styles.previewItemDot} />
            <Text style={styles.previewItemText} numberOfLines={1}>{task.text}</Text>
            <Text style={styles.previewItemDuration}>{durationLabel(task.durationMinutes)}</Text>
          </View>
        ))}
        {remaining > 0 && (
          <Text style={styles.previewMore}>+{remaining} more</Text>
        )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
function TaskRow({ task, index, onRemove, onLongPress }: {
  task: Task; index: number; onRemove: () => void; onLongPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, delay: index * 55, tension: 75, friction: 11 }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.taskRow,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
    ]}>
      <TouchableOpacity
        style={styles.taskRowPressable}
        onLongPress={onLongPress}
        delayLongPress={400}
        activeOpacity={0.85}
      >
        <View style={styles.taskIndexBadge}>
          <Text style={styles.taskIndexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.taskText}>{task.text}</Text>
          <View style={styles.taskDurationPill}>
            <MaterialCommunityIcons name="timer-outline" size={11} color={Colors.primary} />
            <Text style={styles.taskDurationText}>{durationLabel(task.durationMinutes)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <MaterialCommunityIcons name="close" size={15} color={Colors.outline + 'aa'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Streak Bar ───────────────────────────────────────────────────────────────
function StreakBar({ navigation }: { navigation: Props['navigation'] }) {
  const currentStreak = useAppStore((s) => s.currentStreak);
  const longestStreak = useAppStore((s) => s.longestStreak);
  const isPremium     = useAppStore((s) => s.isPremium);
  const scale         = useRef(new Animated.Value(0.92)).current;
  const opacity       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 10, delay: 300 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true, delay: 300 }),
    ]).start();
  }, []);

  const handlePress = () => {
    if (!isPremium) navigation.navigate('Premium');
  };

  return (
    <Animated.View style={[styles.streakBar, { opacity, transform: [{ scale }] }]}>
      {/* Inner shine strip */}
      <View style={styles.streakShine} pointerEvents="none" />

      {/* Current streak — always visible */}
      <View style={styles.streakItem}>
        <View style={styles.streakFireRow}>
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.streakFireEmoji}>🔥</Text>
        </View>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>

      <View style={styles.streakDivider} />

      {/* Best streak — locked for free */}
      <TouchableOpacity style={styles.streakItem} onPress={handlePress} activeOpacity={isPremium ? 1 : 0.75}>
        {isPremium ? (
          <>
            <Text style={styles.streakNumber}>{longestStreak}</Text>
            <Text style={styles.streakLabel}>Best Streak</Text>
          </>
        ) : (
          <>
            <View style={styles.streakLockedRow}>
              <Text style={styles.streakLockedNumber}>––</Text>
            </View>
            <View style={styles.streakLockedLabel}>
              <MaterialCommunityIcons name="lock-outline" size={9} color={Colors.primary} />
              <Text style={[styles.streakLabel, { color: Colors.primary }]}>Best Streak</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.streakDivider} />

      {/* Momentum score — locked for free */}
      <TouchableOpacity style={styles.streakItem} onPress={handlePress} activeOpacity={isPremium ? 1 : 0.75}>
        {isPremium ? (
          <>
            <Text style={styles.streakNumber}>{Math.min(99, currentStreak * 7)}</Text>
            <Text style={styles.streakLabel}>Momentum</Text>
          </>
        ) : (
          <>
            <View style={styles.streakLockedRow}>
              <Text style={styles.streakLockedNumber}>––</Text>
            </View>
            <View style={styles.streakLockedLabel}>
              <MaterialCommunityIcons name="lock-outline" size={9} color={Colors.primary} />
              <Text style={[styles.streakLabel, { color: Colors.primary }]}>Momentum</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function BrainDumpScreen({ navigation }: Props) {
  const { tasks, addTask, updateTask, removeTask, wakeTime, sleepTime, hasSeenWelcomeCard, dismissWelcomeCard, incrementGeneration } = useAppStore();
  const procrastinationType = useAppStore((s) => s.onboardingData.procrastinationType);

  const SUGGESTIONS_BY_TYPE: Record<string, string[]> = {
    overwhelmed_tasks:  ['Reply to 3 emails', 'Write one paragraph', '10-min tidy up', 'Check one item off', 'Review your notes'],
    waiting_motivation: ['Set a 10-min timer and start', 'Write the first sentence', 'Open the file', 'Do the easiest part first', 'Commit to 5 minutes'],
    dont_know_start:    ['Write down step 1', 'Find one resource', 'Sketch an outline', 'Define done in one sentence', 'Ask one clarifying question'],
    easily_distracted:  ['25-min Pomodoro block', 'Phone in another room', 'Single-tab browser session', 'Headphones on, notifications off', 'One task until timer ends'],
    changing_plans:     ['Lock in 3 tasks for today', 'No rescheduling before noon', 'Finish one before adding another', 'Write a 2-line plan', 'Pick one anchor task'],
    underestimate_time: ['Buffer this task by 50%', 'Set a hard stop time', 'Break into 3 steps', 'Track time on one task', 'Stop at the timer — not when done'],
  };

  const SUGGESTIONS = SUGGESTIONS_BY_TYPE[procrastinationType ?? '']
    ?? ['Deep work block', 'Admin tasks', 'Planning session', 'Email catch-up', 'Review & reflect'];

  const pm = usePremium();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const p           = usePersonalization();
  const insets      = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const buttonScale  = useRef(new Animated.Value(1)).current;
  const addBtnScale  = useRef(new Animated.Value(1)).current;
  const heroFade     = useRef(new Animated.Value(0)).current;
  const heroSlide    = useRef(new Animated.Value(20)).current;

  const hasTasks      = tasks.length > 0;
  // Personalized greeting + quote
  const greeting      = p.dashboardGreeting;
  const subtext       = p.dashboardSubtext;
  const motivation    = p.motivationalQuotes[new Date().getDay() % p.motivationalQuotes.length];
  const plannedMins   = tasks.reduce((acc, t) => acc + t.durationMinutes, 0);
  // Awake window minus 2h overhead (meals, commute, personal)
  const awakeMins     = Math.max(0, sleepTime - wakeTime);
  const availableMins = Math.max(0, awakeMins - 120);

  const suggestionsToShow = SUGGESTIONS
    .filter((s) => !tasks.find((t) => t.text.toLowerCase() === s.toLowerCase()))
    .slice(0, 3);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : undefined;

  const closeModal = () => {
    Keyboard.dismiss();
    setShowModal(false);
    setEditingTaskId(null);
  };

  const openNewTaskModal = () => {
    Keyboard.dismiss();
    setEditingTaskId(null);
    setShowModal(true);
  };

  const handleModalConfirm = (text: string, durationMinutes: number) => {
    if (editingTaskId) {
      updateTask(editingTaskId, text, durationMinutes);
    } else {
      addTask(text, durationMinutes);
    }
  };

  const handleGenerate = () => {
    if (!hasTasks) return;
    if (pm.generationsExhausted) {
      setShowUpgradePrompt(true);
      return;
    }
    setLoading(true);
    incrementGeneration();
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start(() => setTimeout(() => { setLoading(false); navigation.navigate('Constraints'); }, 700));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      {/* Animated background blobs */}
      <SoftBlob x={-80}         y={60}            size={300} color="rgba(0,88,190,0.07)"    dur={4500} delay={0}   />
      <SoftBlob x={width - 120} y={180}            size={220} color="rgba(0,88,190,0.055)"   dur={5200} delay={500} />
      <SoftBlob x={width/2-90}  y={height * 0.38} size={180} color="rgba(100,160,255,0.06)" dur={3900} delay={900} />
      <SoftBlob x={20}          y={height * 0.62} size={140} color="rgba(0,88,190,0.045)"   dur={4800} delay={300} />

      <View style={{ flex: 1 }}>

        {/* ── Hero Header ── */}
        <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          {/* Ambient glow behind hero */}
          <View style={styles.heroGlow} pointerEvents="none" />

          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.greetingChip}>
                <MaterialCommunityIcons name="weather-sunny" size={12} color={Colors.primary} />
                <Text style={styles.greetingText}>{greeting}</Text>
              </View>
              <Text style={styles.heroTitle}>
                What's on your{'\n'}<Text style={styles.heroTitleAccent}>mind today?</Text>
              </Text>
            </View>
            {p.profile.coachStyle && (
              <View style={[styles.coachBadge, { backgroundColor: p.tone.badgeColor + '18', borderColor: p.tone.badgeColor + '35' }]}>
                <View style={[styles.coachBadgeDot, { backgroundColor: p.tone.badgeColor }]} />
                <Text style={[styles.coachBadgeLabel, { color: p.tone.badgeColor }]}>{p.tone.badgeLabel}</Text>
              </View>
            )}
          </View>

          {/* Subtle motivational line */}
          <View style={styles.motivationRow}>
            <View style={styles.motivationAccent} />
            <Text style={styles.motivationText} numberOfLines={1}>{motivation}</Text>
          </View>
        </Animated.View>

        {/* ── Streak bar ── */}
        <StreakBar navigation={navigation} />

        {/* ── Task list / Empty state ── */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[styles.listContent, !hasTasks && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          ListHeaderComponent={
            !hasSeenWelcomeCard ? (
              <WelcomeCard
                coachStyle={p.profile.coachStyle}
                onDismiss={dismissWelcomeCard}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <PulseIcon icon="playlist-edit" />
              <View style={{ alignItems: 'center', gap: 6 }}>
                {p.emptyStateMessage.split('\n').map((line, i) => (
                  <Text key={i} style={i === 0 ? styles.emptyTitle : styles.emptyTitleAccent}>
                    {line}
                  </Text>
                ))}
                <Text style={styles.emptySubtitle}>
                  {p.coaching.addFirstTask}
                </Text>
              </View>
              <View style={styles.suggestions}>
                {suggestionsToShow.map((s) => (
                  <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => addTask(s, 30)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="plus" size={13} color={Colors.primary} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            hasTasks ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                <CapacityCard plannedMins={plannedMins} availableMins={availableMins} />
                <PlanPreviewCard tasks={tasks} plannedMins={plannedMins} onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' })} />
              </View>
            ) : null
          }
          renderItem={({ item, index }: { item: Task; index: number }) => (
            <TaskRow
              task={item}
              index={index}
              onRemove={() => removeTask(item.id)}
              onLongPress={() => {
                const task = tasks.find((t) => t.id === item.id);
                if (!task) return;
                Keyboard.dismiss();
                setEditingTaskId(task.id);
                setShowModal(true);
              }}
            />
          )}
        />

        <AddTaskModal
          visible={showModal}
          onClose={closeModal}
          onAdd={handleModalConfirm}
          editTaskId={editingTaskId}
          initialText={editingTask?.text}
          initialDuration={editingTask?.durationMinutes}
        />

        {!showModal && <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Add Task button */}
          <Animated.View style={{ transform: [{ scale: addBtnScale }] }}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={openNewTaskModal}
              activeOpacity={1}
              onPressIn={() => Animated.spring(addBtnScale, { toValue: 0.92, useNativeDriver: true, tension: 400, friction: 8 }).start()}
              onPressOut={() => Animated.sequence([
                Animated.spring(addBtnScale, { toValue: 1.04, useNativeDriver: true, tension: 400, friction: 6 }),
                Animated.spring(addBtnScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
              ]).start()}
            >
              <View style={styles.addBtnIcon}>
                <MaterialCommunityIcons name="plus" size={15} color={Colors.onPrimary} />
              </View>
              <Text style={styles.addBtnLabel}>Add Task</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Generate button */}
          <Animated.View style={[{ flex: 1 }, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={[styles.generateBtn, !hasTasks && styles.generateBtnDisabled, pm.generationsExhausted && styles.generateBtnGated]}
              onPress={handleGenerate}
              disabled={!hasTasks || loading}
              activeOpacity={1}
              onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start()}
              onPressOut={() => Animated.sequence([
                Animated.spring(buttonScale, { toValue: 1.02, useNativeDriver: true, tension: 400, friction: 6 }),
                Animated.spring(buttonScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
              ]).start()}
            >
              {loading ? (
                <MaterialCommunityIcons name="loading" size={18} color={Colors.onPrimary} />
              ) : pm.generationsExhausted ? (
                <>
                  <MaterialCommunityIcons name="lock-outline" size={15} color="#fff" />
                  <Text style={styles.generateBtnLabel}>Go Pro to Regenerate</Text>
                </>
              ) : (
                <>
                  <Text style={styles.generateBtnLabel} numberOfLines={1}>
                    {hasTasks ? `Generate  (${tasks.length})` : 'Generate My Day'}
                  </Text>
                  {hasTasks && (
                    <MaterialCommunityIcons name="arrow-right" size={17} color={Colors.onPrimary} />
                  )}
                  {pm.generationsLabel ? (
                    <View style={styles.genCountBubble}>
                      <Text style={styles.genCountText}>{pm.generationsLabel}</Text>
                    </View>
                  ) : null}
                </>
              )}
              <View style={styles.ctaShine} pointerEvents="none" />
            </TouchableOpacity>
          </Animated.View>
        </View>}
      </View>

      <UpgradePrompt
        visible={showUpgradePrompt}
        featureId="schedule_regeneration"
        onDismiss={() => setShowUpgradePrompt(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Streak bar
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.gutter,
    marginBottom: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
    paddingVertical: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  streakShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: Colors.primary + '20',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  streakFireRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  streakFireEmoji: {
    fontSize: 14,
    lineHeight: 28,
  },
  streakNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    color: Colors.primary,
    lineHeight: 28,
    letterSpacing: -1,
  },
  streakLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  streakDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: Colors.outlineVariant + '60',
  },
  streakLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakLockedNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    color: Colors.outlineVariant,
    lineHeight: 28,
    letterSpacing: -1,
  },
  streakLockedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // Hero
  hero: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  heroGlow: {
    position: 'absolute',
    top: -40, left: -60,
    width: 280, height: 180,
    borderRadius: 140,
    backgroundColor: Colors.primary + '0a',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  greetingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed + '90',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 6,
  },
  greetingText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  coachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
    marginTop: 2,
  },
  coachBadgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  coachBadgeLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, letterSpacing: 0.3 },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    color: Colors.onSurface,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: Colors.primary,
  },
  motivationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  motivationAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 0.4,
  },
  motivationText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    opacity: 0.85,
  },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.gutter, paddingTop: 2, paddingBottom: 8 },
  listContentEmpty: { flexGrow: 1 },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 18,
  },
  pulseIconInner: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: 'Manrope_700Bold', color: Colors.onSurface, fontSize: 16, textAlign: 'center' },
  emptyTitleAccent: { fontFamily: 'Manrope_700Bold', color: Colors.primary, fontSize: 15, textAlign: 'center', marginTop: -2 },
  emptySubtitle: { fontFamily: 'Manrope_400Regular', color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 270, lineHeight: 22, fontSize: 13, marginTop: 4 },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: Colors.primaryFixed + '70',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '22',
  },
  suggestionText: { ...Typography.labelSm, color: Colors.primary, fontSize: 13 },
  footerSuggestions: { marginTop: 8, gap: 6 },
  footerSuggestionsLabel: { ...Typography.labelSm, color: Colors.outline, textTransform: 'uppercase', letterSpacing: 1.2 },

  // Task row
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.outlineVariant + '30',
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    overflow: 'hidden',
  },
  taskRowPressable: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  taskIndexBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '18',
  },
  taskIndexText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 12, color: Colors.primary },
  taskText: { fontFamily: 'Manrope_600SemiBold', color: Colors.onSurface, fontSize: 14, lineHeight: 20 },
  taskDurationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary + '15',
  },
  taskDurationText: { fontFamily: 'Manrope_600SemiBold', color: Colors.primary, fontSize: 11 },

  // Summary
  summaryRow: { paddingHorizontal: Spacing.gutter, paddingBottom: 6 },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
  },
  summaryText: { ...Typography.labelSm, color: Colors.primary, fontSize: 12 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.gutter,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant + '30',
    backgroundColor: 'rgba(250,248,255,0.97)',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 15,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1.5, borderColor: Colors.primary + '35',
  },
  addBtnIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnLabel: { fontFamily: 'Manrope_600SemiBold', color: Colors.primary, fontSize: 13 },
  generateBtn: {
    flex: 1, backgroundColor: Colors.primary,
    paddingVertical: 15, borderRadius: Radius.xl,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    overflow: 'hidden',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 7,
  },
  generateBtnDisabled: { opacity: 0.35 },
  generateBtnGated: { backgroundColor: PREMIUM_COLOR },
  generateBtnLabel: { ...Typography.headlineSm, color: Colors.onPrimary, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  genCountBubble: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 50, paddingHorizontal: 7, paddingVertical: 2 },
  genCountText:   { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: '#fff', letterSpacing: 0.3 },
  ctaShine: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 80,
    backgroundColor: 'rgba(255,255,255,0.07)', transform: [{ skewX: '-20deg' }],
  },

  // Add task modal
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalKav: {
    width: '100%',
    maxHeight: height * 0.92,
  },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.gutter,
    paddingTop: 8,
    gap: 12,
    ...Shadow.card,
  },
  modalBodyScroll: {
    maxHeight: height * 0.38,
  },
  modalBodyContent: {
    paddingBottom: 4,
  },

  // Inline add task panel (legacy name kept for shared child styles)
  inlinePanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.outlineVariant + '40',
    paddingHorizontal: Spacing.gutter,
    paddingTop: 8,
    gap: 10,
    maxHeight: height * 0.72,
    ...Shadow.card,
  },
  inlineHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant + 'aa',
    alignSelf: 'center',
    marginBottom: 2,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  inlineIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryFixed + '90',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.onSurface, letterSpacing: -0.2 },
  inlineSubtitle: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  inlineCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '18',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  inlineInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: Colors.onSurface,
    paddingVertical: 12,
    minHeight: 44,
  },
  inlineDurationSection: { gap: 10 },
  inlineDurationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineDurationLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  inlineDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryFixed + '80',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  inlineDurationBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.primary },
  inlineChipRow: { gap: 8, paddingRight: 4 },
  inlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '70',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  inlineChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  inlineChipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant },
  inlineChipTextSelected: { color: Colors.onPrimary },
  inlineConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.xl,
    marginTop: 2,
    ...Shadow.button,
  },
  inlineConfirmBtnDisabled: { opacity: 0.38 },
  inlineConfirmLabel: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onPrimary },
  inlineConfirmIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal sheet (kept for legacy reference)
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: height * 0.88,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: Spacing.gutter,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1, shadowRadius: 28, elevation: 16,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant + 'aa', alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sheetBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle: { fontFamily: 'Manrope_700Bold', fontSize: 19, color: Colors.onSurface, letterSpacing: -0.4 },
  sheetSubtitle: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', opacity: 0.8, marginTop: 2 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabelText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.2 },
  nameInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 15,
    fontFamily: 'Manrope_500Medium', color: Colors.onSurface, fontSize: 16,
    borderWidth: 1.5, borderColor: Colors.outlineVariant + '50',
  },
  // Clock with animated glow background
  clockWrap: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 2, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.primary + '10',
  },
  clockDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, paddingVertical: 4 },
  clockNumber: { fontFamily: 'Manrope_800ExtraBold', fontSize: 68, lineHeight: 72, color: Colors.onSurface, letterSpacing: -3 },
  clockColon: { fontFamily: 'Manrope_700Bold', fontSize: 48, color: Colors.onSurface, marginBottom: 10, opacity: 0.2, letterSpacing: -2 },
  clockUnitLabel: { fontFamily: 'Manrope_500Medium', fontSize: 10, color: Colors.outline, letterSpacing: 2.5, textTransform: 'uppercase' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  // AnimatedChip styles
  chip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.outlineVariant + '55',
    backgroundColor: Colors.surfaceContainerLow,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  chipSelected: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  chipText: { fontFamily: 'Manrope_500Medium', color: Colors.onSurface, fontSize: 13 },
  chipTextSelected: { color: Colors.onPrimary, fontFamily: 'Manrope_700Bold' },
  // Premium custom inputs
  customBlock: { gap: 6 },
  customHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Info card
  infoCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.primaryFixed + '55',
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: Colors.primary + '12',
  },
  infoIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  infoText: { flex: 1, fontFamily: 'Manrope_400Regular', color: Colors.onSurface, fontSize: 13, lineHeight: 21 },
  // Kept for compat
  aiCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.primaryFixed + '55',
    borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.primary + '12',
  },
  aiIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  aiText: { flex: 1, fontFamily: 'Manrope_400Regular', color: Colors.onSurface, fontSize: 13, lineHeight: 21 },
  // AnimatedPrimaryButton styles
  primaryBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17,
    borderRadius: Radius.xl, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 7,
  },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnLabel: { fontFamily: 'Manrope_700Bold', color: Colors.onPrimary, fontSize: 16, letterSpacing: 0.2 },
  cancelTouchable: { alignItems: 'center', paddingVertical: 12 },
  cancelLabel: { fontFamily: 'Manrope_500Medium', color: Colors.onSurfaceVariant, fontSize: 14 },

  // ── Capacity card ──
  capacityCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 16,
    borderWidth: 1, borderColor: Colors.outlineVariant + '28',
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  capacityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryFixed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  capacityBadgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: Colors.primary, letterSpacing: 0.5 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  statusBadgeRed: { backgroundColor: '#fee2e2' },
  statusText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: '#16a34a' },
  statusTextRed: { color: '#ef4444' },
  capacityBarTrack: { height: 6, backgroundColor: Colors.surfaceVariant, borderRadius: 3, overflow: 'hidden' },
  capacityBarFill: { height: '100%', borderRadius: 3 },
  capacityStats: { flexDirection: 'row', alignItems: 'center' },
  capacityStat: { flex: 1, alignItems: 'center', gap: 3 },
  capacityStatLabel: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  capacityStatValue: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  capacityDivider: { width: 1, height: 32, backgroundColor: Colors.outlineVariant + '40' },

  // ── Plan preview card ──
  previewCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.xl, padding: 16,
    borderWidth: 1, borderColor: Colors.primary + '18',
    gap: 12,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewHint: { fontFamily: 'Manrope_500Medium', fontSize: 12, color: Colors.primary, opacity: 0.7 },
  previewItems: { gap: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewItemDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primary, opacity: 0.5,
  },
  previewItemText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  previewItemDuration: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },
  previewMore: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline, marginLeft: 14 },
});
