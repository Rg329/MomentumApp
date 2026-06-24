import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  FlatList,
  Modal,
  ScrollView,
  Easing,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { TopBar } from '../components/TopBar';
import { WelcomeCard } from '../components/WelcomeCard';
import { useAppStore, Task } from '../store/useAppStore';
import { usePersonalization } from '../personalization';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import { PremiumBadge } from '../components/PremiumBadge';
import { UpgradePrompt } from '../components/UpgradePrompt';

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

const SUGGESTIONS = ['Physics revision', 'Gym', 'Read 30 pages', 'Team meeting', 'Music practice'];

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

// ─── Add Task Modal ───────────────────────────────────────────────────────────
function AddTaskModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (text: string, durationMinutes: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [taskName, setTaskName]         = useState('');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isCustom, setIsCustom]         = useState(false);
  const [customHrs, setCustomHrs]       = useState('0');
  const [customMin, setCustomMin]       = useState('30');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [hrsActive, setHrsActive]       = useState(false);
  const [minActive, setMinActive]       = useState(false);

  const slideAnim    = useRef(new Animated.Value(700)).current;
  const sec1Anim     = useRef(new Animated.Value(0)).current;   // header
  const sec2Anim     = useRef(new Animated.Value(0)).current;   // task name
  const sec3Anim     = useRef(new Animated.Value(0)).current;   // duration
  const sec4Anim     = useRef(new Animated.Value(0)).current;   // info card
  const customAnim   = useRef(new Animated.Value(0)).current;   // custom inputs
  const clockGlow    = useRef(new Animated.Value(0)).current;

  // Stagger sections in
  const runEntrance = () => {
    [sec1Anim, sec2Anim, sec3Anim, sec4Anim].forEach((a) => a.setValue(0));
    Animated.stagger(80, [
      Animated.spring(sec1Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.spring(sec2Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.spring(sec3Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.spring(sec4Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();
    // Clock glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(clockGlow, { toValue: 1, duration: 2200, useNativeDriver: false }),
      Animated.timing(clockGlow, { toValue: 0, duration: 2200, useNativeDriver: false }),
    ])).start();
  };

  useEffect(() => {
    if (visible) {
      setTaskName(''); setSelectedDuration(30); setIsCustom(false);
      setCustomHrs('0'); setCustomMin('30');
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 13 }).start(() => runEntrance());
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, { toValue: 700, duration: 240, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(customAnim, {
      toValue: isCustom ? 1 : 0,
      useNativeDriver: true, tension: 100, friction: 12,
    }).start();
  }, [isCustom]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide  = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleRequestClose = () => {
    if (keyboardOpen) Keyboard.dismiss(); else onClose();
  };

  const effectiveMinutes = isCustom
    ? Math.max(5, (parseInt(customHrs, 10) || 0) * 60 + (parseInt(customMin, 10) || 0))
    : selectedDuration;
  const { hrs, min } = formatDuration(effectiveMinutes);

  const sectionStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  const clockBg = clockGlow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,88,190,0.04)', 'rgba(0,88,190,0.09)'] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={handleRequestClose} />

        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }] }]}>
        {/* ── Drag handle ── */}
        <View style={styles.sheetHandle} />

        {/* ── Header ── */}
        <Animated.View style={[styles.sheetHeader, sectionStyle(sec1Anim)]}>
          <TouchableOpacity onPress={onClose} style={styles.sheetBack} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={19} color={Colors.onSurface} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.sheetTitle}>Add Task</Text>
            <Text style={styles.sheetSubtitle}>Add something you want to accomplish today</Text>
          </View>
          <View style={{ width: 36 }} />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            gap: 20,
            paddingTop: 4,
            // Keep bottom actions visible when keyboard is open
            paddingBottom: keyboardOpen ? 140 : 4,
          }}
        >
          {/* ── Task Name ── */}
          <Animated.View style={[{ gap: 8 }, sectionStyle(sec2Anim)]}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons name="format-list-bulleted" size={13} color={Colors.primary} />
              <Text style={styles.fieldLabelText}>Task Name</Text>
            </View>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Physics Revision"
              placeholderTextColor={Colors.outline + '55'}
              value={taskName}
              onChangeText={setTaskName}
              autoFocus
              returnKeyType="next"
            />
          </Animated.View>

          {/* ── Duration ── */}
          <Animated.View style={[{ gap: 12 }, sectionStyle(sec3Anim)]}>
            <View style={styles.fieldLabel}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.primary} />
              <Text style={styles.fieldLabelText}>How long will this take?</Text>
            </View>

            {/* Clock display with breathing glow */}
            <Animated.View style={[styles.clockWrap, { backgroundColor: clockBg }]}>
              <View style={{ alignItems: 'center', gap: 3 }}>
                <Text style={styles.clockNumber}>{hrs}</Text>
                <Text style={styles.clockUnitLabel}>HRS</Text>
              </View>
              <Text style={styles.clockColon}>:</Text>
              <View style={{ alignItems: 'center', gap: 3 }}>
                <Text style={[styles.clockNumber, { color: Colors.primary }]}>{min}</Text>
                <Text style={styles.clockUnitLabel}>MIN</Text>
              </View>
            </Animated.View>

            {/* Preset chips */}
            <View style={styles.presetGrid}>
              {DURATION_PRESETS.map((p) => (
                <AnimatedChip
                  key={p.minutes}
                  label={p.label}
                  selected={!isCustom && selectedDuration === p.minutes}
                  onPress={() => { setSelectedDuration(p.minutes); setIsCustom(false); Keyboard.dismiss(); }}
                />
              ))}
              <AnimatedChip
                label="Custom"
                selected={isCustom}
                icon="pencil-outline"
                onPress={() => setIsCustom(true)}
              />
            </View>

            {/* Custom inputs — animated in/out */}
            {isCustom ? (
            <Animated.View style={{
              opacity: customAnim,
              transform: [{ scale: customAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
            }}>
              <View style={styles.customRow}>
                {/* HRS box */}
                <View style={styles.customUnit}>
                  <TextInput
                    style={[styles.customBox, hrsActive && styles.customBoxActive]}
                    value={customHrs}
                    onChangeText={(v) => setCustomHrs(v.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    onFocus={() => setHrsActive(true)}
                    onBlur={()  => setHrsActive(false)}
                    textAlign="center"
                  />
                  <View style={[styles.customBoxCursor, hrsActive && styles.customBoxCursorActive]} />
                  <Text style={styles.customBoxLabel}>Hours</Text>
                </View>

                <Text style={styles.customSeparator}>:</Text>

                {/* MIN box */}
                <View style={styles.customUnit}>
                  <TextInput
                    style={[styles.customBox, minActive && styles.customBoxActive]}
                    value={customMin}
                    onChangeText={(v) => setCustomMin(v.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    onFocus={() => setMinActive(true)}
                    onBlur={()  => setMinActive(false)}
                    textAlign="center"
                  />
                  <View style={[styles.customBoxCursor, minActive && styles.customBoxCursorActive]} />
                  <Text style={styles.customBoxLabel}>Minutes</Text>
                </View>
              </View>
            </Animated.View>
            ) : null}
          </Animated.View>

          {/* ── Info card ── */}
          <Animated.View style={[styles.infoCard, sectionStyle(sec4Anim)]}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="calendar-check-outline" size={17} color={Colors.primary} />
            </View>
            <Text style={styles.infoText}>
              This task will be scheduled automatically into your most productive hours.
            </Text>
          </Animated.View>
        </ScrollView>

        {/* ── Buttons ── */}
        <View style={{ gap: 6, marginTop: 14 }}>
          <AnimatedPrimaryButton
            label="Add Task"
            onPress={() => {
              if (taskName.trim()) {
                Keyboard.dismiss();
                onAdd(taskName.trim(), effectiveMinutes);
                onClose();
              }
            }}
            disabled={!taskName.trim()}
          />
          <TouchableOpacity onPress={onClose} style={styles.cancelTouchable} activeOpacity={0.6}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
// ── Animated SVG ring for completion percentage ───────────────────────────────

const RING_SIZE   = 80;
const RING_STROKE = 6;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC   = 2 * Math.PI * RING_R;

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

function CompletionRing({ pct }: { pct: number }) {
  const [display, setDisplay]   = useState(0);
  const dashAnim                = useRef(new Animated.Value(RING_CIRC)).current; // starts "empty"
  const glowAnim                = useRef(new Animated.Value(0)).current;
  const arcColor = pct >= 80 ? Colors.primary : pct >= 50 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    // Count-up display number
    let cur = 0;
    const step = Math.max(1, Math.ceil(pct / 30));
    const timer = setInterval(() => {
      cur = Math.min(cur + step, pct);
      setDisplay(cur);
      if (cur >= pct) clearInterval(timer);
    }, 33);

    // Animate stroke-dashoffset: RING_CIRC (empty) → RING_CIRC * (1 - pct/100)
    const target = RING_CIRC * (1 - pct / 100);
    Animated.timing(dashAnim, {
      toValue: target, duration: 1100,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Glow pulse for high completion
    if (pct >= 80) {
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ])).start();
    }
    return () => clearInterval(timer);
  }, [pct]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });

  return (
    <View style={styles.completionRing}>
      {/* Soft glow halo (only for high pct) */}
      {pct >= 80 && (
        <Animated.View style={[styles.completionGlow, { opacity: glowOpacity, borderColor: arcColor }]} />
      )}

      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        {/* Track */}
        <SvgCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          stroke={Colors.primaryFixed} strokeWidth={RING_STROKE} fill="none"
        />
        {/* Animated fill arc */}
        <AnimatedSvgCircle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          stroke={arcColor} strokeWidth={RING_STROKE} fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={dashAnim}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>

      {/* Center label */}
      <View style={styles.completionRingInner}>
        <Text style={[styles.completionPct, { color: arcColor }]}>{display}%</Text>
        <Text style={styles.completionLabel}>Est. Done</Text>
      </View>
    </View>
  );
}

function PlanPreviewCard({ tasks, plannedMins, availableMins }: {
  tasks: Task[]; plannedMins: number; availableMins: number;
}) {
  const focusBlocks      = tasks.filter((t) => t.durationMinutes >= 45).length;
  const exerciseSessions = tasks.filter((t) => /gym|workout|exercise|run|sport|walk|yoga/i.test(t.text)).length;
  const bufferSlots      = Math.max(1, Math.floor(tasks.length / 3));
  const completionPct    = availableMins >= plannedMins
    ? Math.min(100, Math.round(95 - ((plannedMins / Math.max(availableMins, 1)) * 5)))
    : Math.round((availableMins / Math.max(plannedMins, 1)) * 85);

  const planItems = [
    focusBlocks > 0      && { icon: 'lightning-bolt'            as IconName, label: `${focusBlocks} Focus Block${focusBlocks > 1 ? 's' : ''}` },
    exerciseSessions > 0 && { icon: 'dumbbell'                  as IconName, label: `${exerciseSessions} Exercise Session${exerciseSessions > 1 ? 's' : ''}` },
    tasks.length > 0     && { icon: 'clock-time-three-outline'  as IconName, label: `${bufferSlots} Buffer Slot${bufferSlots > 1 ? 's' : ''}` },
  ].filter(Boolean) as { icon: IconName; label: string }[];

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.capacityBadge}>
          <MaterialCommunityIcons name="calendar-text" size={11} color={Colors.primary} />
          <Text style={styles.capacityBadgeText}>Today's Plan</Text>
        </View>
        <Text style={styles.previewHint}>Preview</Text>
      </View>

      <View style={styles.previewBody}>
        {/* Plan items */}
        <View style={styles.previewItems}>
          {planItems.map((item, i) => (
            <View key={i} style={styles.previewItem}>
              <View style={styles.previewItemIcon}>
                <MaterialCommunityIcons name={item.icon} size={13} color={Colors.primary} />
              </View>
              <Text style={styles.previewItemText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Animated completion ring */}
        <CompletionRing pct={completionPct} />
      </View>
    </View>
  );
}
function TaskRow({ task, index, onRemove }: { task: Task; index: number; onRemove: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, delay: index * 55, tension: 75, friction: 11 }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.taskRow,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
    ]}>
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
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <MaterialCommunityIcons name="close" size={15} color={Colors.outline + 'aa'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function BrainDumpScreen({ navigation }: Props) {
  const { tasks, addTask, removeTask, wakeTime, sleepTime, hasSeenWelcomeCard, dismissWelcomeCard, incrementGeneration } = useAppStore();
  const pm = usePremium();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const p           = usePersonalization();
  const insets      = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
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
  // Cap available productive hours at 10h; subtract 2h overhead from awake window
  const awakeMins     = Math.max(0, sleepTime - wakeTime);
  const availableMins = Math.min(awakeMins - 120, 600); // max 10h productive

  const suggestionsToShow = SUGGESTIONS
    .filter((s) => !tasks.find((t) => t.text.toLowerCase() === s.toLowerCase()))
    .slice(0, 3);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

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
      <SoftBlob x={-70}         y={80}            size={260} color="rgba(0,88,190,0.06)"    dur={4500} delay={0}   />
      <SoftBlob x={width - 110} y={200}            size={190} color="rgba(0,88,190,0.045)"   dur={5200} delay={500} />
      <SoftBlob x={width/2-80}  y={height * 0.4}  size={150} color="rgba(100,160,255,0.05)" dur={3900} delay={900} />
      <SoftBlob x={30}          y={height * 0.6}  size={110} color="rgba(0,88,190,0.035)"   dur={4800} delay={300} />

      <View style={{ flex: 1 }}>

        {/* ── Hero Header ── */}
        <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          {/* Greeting chip + coach badge row */}
          <View style={styles.greetingRow}>
            <MaterialCommunityIcons name="weather-sunny" size={16} color={Colors.primary} />
            <Text style={styles.greetingText}>{greeting}</Text>
            {/* Coach-mode badge */}
            {p.profile.coachStyle && (
              <View style={[styles.coachBadge, { backgroundColor: p.tone.badgeColor + '18', borderColor: p.tone.badgeColor + '35' }]}>
                <View style={[styles.coachBadgeDot, { backgroundColor: p.tone.badgeColor }]} />
                <Text style={[styles.coachBadgeLabel, { color: p.tone.badgeColor }]}>{p.tone.badgeLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroTitle}>
            What's on your{'\n'}
            <Text style={styles.heroTitleAccent}>mind today?</Text>
          </Text>
          {/* Personalized subtext */}
          <View style={styles.motivationRow}>
            <MaterialCommunityIcons name="star-four-points" size={11} color={Colors.primary} style={{ opacity: 0.7 }} />
            <Text style={styles.motivationText}>{motivation}</Text>
          </View>
          <Text style={styles.subtextRow}>{subtext}</Text>
        </Animated.View>

        {/* ── Task list / Empty state ── */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[styles.listContent, !hasTasks && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
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
              <View style={{ gap: 12, marginTop: 4 }}>
                {/* Capacity card */}
                <CapacityCard plannedMins={plannedMins} availableMins={availableMins} />

                {/* Plan preview card */}
                <PlanPreviewCard tasks={tasks} plannedMins={plannedMins} availableMins={availableMins} />

                {/* Quick add */}
                {suggestionsToShow.length > 0 && (
                  <View style={styles.footerSuggestions}>
                    <Text style={styles.footerSuggestionsLabel}>Quick add</Text>
                    <View style={styles.suggestions}>
                      {suggestionsToShow.map((s) => (
                        <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => addTask(s, 30)} activeOpacity={0.7}>
                          <MaterialCommunityIcons name="plus" size={13} color={Colors.primary} />
                          <Text style={styles.suggestionText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : null
          }
          renderItem={({ item, index }: { item: Task; index: number }) => (
            <TaskRow task={item} index={index} onRemove={() => removeTask(item.id)} />
          )}
        />

        {/* ── Summary pill (only shown when no tasks — for spacing) ── */}
        {hasTasks && <View style={{ height: 8 }} />}

        {/* ── Bottom bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Add Task button */}
          <Animated.View style={{ transform: [{ scale: addBtnScale }] }}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowModal(true)}
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
                  <Text style={styles.generateBtnLabel} numberOfLines={1}>Unlock Regenerations</Text>
                  <PremiumBadge size="sm" shimmer />
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
        </View>
      </View>

      <AddTaskModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAdd={(text, dur) => addTask(text, dur)}
      />

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

  // Hero
  hero: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
  },
  greetingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryFixed + '80',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  greetingText: { ...Typography.labelSm, color: Colors.primary, fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  coachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1,
    marginLeft: 4,
  },
  coachBadgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  coachBadgeLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, letterSpacing: 0.3 },
  subtextRow: {
    fontFamily: 'Manrope_500Medium', fontSize: 13,
    color: Colors.onSurfaceVariant, lineHeight: 19,
    marginTop: 4,
  },
  heroTitle: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    fontSize: 32,
    lineHeight: 42,
  },
  heroTitleAccent: {
    color: Colors.primary,
    fontFamily: 'Manrope_800ExtraBold',
  },
  motivationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  motivationText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    opacity: 0.8,
  },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.gutter, paddingTop: 4, paddingBottom: 8 },
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
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant + '28',
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  taskIndexBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  taskIndexText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary },
  taskText: { ...Typography.headlineSm, color: Colors.onSurface, fontSize: 15 },
  taskDurationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  taskDurationText: { ...Typography.labelXs, color: Colors.primary, fontSize: 11 },

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

  // Modal sheet
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
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
  customRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: Colors.primaryFixed + '35',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primary + '15',
    marginTop: 4,
  },
  customUnit: { alignItems: 'center', gap: 6 },
  customBox: {
    width: 90, height: 72, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    fontFamily: 'Manrope_800ExtraBold', fontSize: 36,
    color: Colors.onSurface,
    borderWidth: 1.5, borderColor: Colors.outlineVariant + '40',
    paddingVertical: 0,
  },
  customBoxActive: {
    borderColor: Colors.primary,
    color: Colors.primary,
    backgroundColor: Colors.primaryFixed + '60',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  customBoxCursor: { height: 2, width: 40, borderRadius: 1, backgroundColor: 'transparent', marginTop: -2 },
  customBoxCursorActive: { backgroundColor: Colors.primary },
  customBoxLabel: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.outline, textTransform: 'uppercase', letterSpacing: 1.5 },
  customSeparator: { fontFamily: 'Manrope_800ExtraBold', fontSize: 36, color: Colors.onSurface, opacity: 0.2, marginBottom: 26 },
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
  previewHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.outline, fontStyle: 'italic' },
  previewBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewItems: { flex: 1, gap: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewItemIcon: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center',
  },
  previewItemText: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  completionRing: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  completionGlow: {
    position: 'absolute',
    width: RING_SIZE + 16, height: RING_SIZE + 16,
    borderRadius: (RING_SIZE + 16) / 2,
    borderWidth: 8, borderColor: Colors.primary,
  },
  completionRingInner: { alignItems: 'center', gap: 1, zIndex: 2 },
  completionPct: { fontFamily: 'Manrope_800ExtraBold', fontSize: 17, color: Colors.primary, lineHeight: 21 },
  completionLabel: { fontFamily: 'Manrope_400Regular', fontSize: 8, color: Colors.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
});
