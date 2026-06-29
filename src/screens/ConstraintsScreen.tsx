import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform, Animated, Easing, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList }    from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { TopBar }       from '../components/TopBar';
import { Constraint, DeadlineTask, useAppStore } from '../store/useAppStore';
import { MOCK_CONSTRAINTS, MOCK_DEADLINES } from '../data/mockData';
import { usePremium } from '../monetization';

const FREE_CONSTRAINTS_LIMIT = 3;

type Props     = NativeStackScreenProps<RootStackParamList, 'Constraints'>;
type IconName  = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const { width } = Dimensions.get('window');

// ─── Animated section entrance ────────────────────────────────────────────────
function SectionCard({
  children, delay, style,
}: { children: React.ReactNode; delay: number; style?: object }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 550, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 480, delay, useNativeDriver: true, easing: Easing.out(Easing.quad)  }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.section, style, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, num, right }: {
  icon: IconName; title: string; num: number; right?: React.ReactNode;
}) {
  return (
    <View style={styles.secHeader}>
      <View style={styles.secLeft}>
        <View style={styles.secNum}><Text style={styles.secNumText}>{num}</Text></View>
        <View style={styles.secIconWrap}>
          <MaterialCommunityIcons name={icon} size={15} color={Colors.primary} />
        </View>
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ─── Drum-roll time picker ────────────────────────────────────────────────────
const HOURS         = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES       = ['00','05','10','15','20','25','30','35','40','45','50','55'];
const AMPM_OPTIONS  = ['AM','PM'];
const COL_ITEM_H    = 52;
const COL_VISIBLE   = 3;
const COL_H         = COL_ITEM_H * COL_VISIBLE;

function PickerColumn({
  items, selectedIndex, onSelect, colWidth = 58,
}: {
  items: string[]; selectedIndex: number; onSelect: (i: number) => void; colWidth?: number;
}) {
  const ref      = useRef<ScrollView>(null);
  const snapping = useRef(false);

  // JS-thread Animated.Value — avoids Android native-driver conflicts on scroll
  const scrollY = useRef(new Animated.Value(selectedIndex * COL_ITEM_H)).current;

  // Use contentOffset to initialise position synchronously so scrollY
  // and the ScrollView are always in sync from first render (no flash).
  const initialOffset = { x: 0, y: selectedIndex * COL_ITEM_H };

  const commitIndex = (rawY: number) => {
    const clamped = Math.max(0, Math.min(Math.round(rawY / COL_ITEM_H), items.length - 1));
    onSelect(clamped);
    return clamped;
  };

  const onMomentumEnd = (e: any) => {
    if (snapping.current) return;
    commitIndex(e.nativeEvent.contentOffset.y);
  };

  const onDragEnd = (e: any) => {
    if (snapping.current) return;
    snapping.current = true;
    const idx = commitIndex(e.nativeEvent.contentOffset.y);
    // animated:false avoids spawning a new momentum event
    ref.current?.scrollTo({ y: idx * COL_ITEM_H, animated: false });
    setTimeout(() => { snapping.current = false; }, 150);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: COL_H, width: colWidth }}
      contentContainerStyle={{ paddingVertical: COL_ITEM_H }}
      contentOffset={initialOffset}
      snapToInterval={COL_ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumEnd}
      onScrollEndDrag={onDragEnd}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      )}
      nestedScrollEnabled
    >
      {items.map((item, i) => {
        const center = i * COL_ITEM_H;
        const scale = scrollY.interpolate({
          inputRange:  [center - 2*COL_ITEM_H, center - COL_ITEM_H, center, center + COL_ITEM_H, center + 2*COL_ITEM_H],
          outputRange: [0.60, 0.80, 1.10, 0.80, 0.60],
          extrapolate: 'clamp',
        });
        const opacity = scrollY.interpolate({
          inputRange:  [center - 2*COL_ITEM_H, center - COL_ITEM_H, center, center + COL_ITEM_H, center + 2*COL_ITEM_H],
          outputRange: [0.08, 0.36, 1.00, 0.36, 0.08],
          extrapolate: 'clamp',
        });

        return (
          <TouchableOpacity
            key={`${item}-${i}`}
            style={{ height: COL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => {
              if (snapping.current) return;
              snapping.current = true;
              ref.current?.scrollTo({ y: i * COL_ITEM_H, animated: true });
              onSelect(i);
              setTimeout(() => { snapping.current = false; }, 350);
            }}
            activeOpacity={0.7}
          >
            <Animated.Text style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 20,
              color: Colors.primary,
              opacity,
              transform: [{ scale }],
            }}>
              {item}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function TimePicker({
  hourIndex, minuteIndex, ampmIndex,
  onHour, onMinute, onAmpm,
}: {
  hourIndex: number; minuteIndex: number; ampmIndex: number;
  onHour: (i: number) => void; onMinute: (i: number) => void; onAmpm: (i: number) => void;
}) {
  return (
    <View style={tpStyles.wrap}>
      {/* Selection stripe — positioned behind the centre row */}
      <View style={tpStyles.stripe} pointerEvents="none" />

      <PickerColumn items={HOURS}        selectedIndex={hourIndex}   onSelect={onHour}   colWidth={54} />
      <Text style={tpStyles.colon}>:</Text>
      <PickerColumn items={MINUTES}      selectedIndex={minuteIndex} onSelect={onMinute} colWidth={54} />
      <View style={{ width: 12 }} />
      <PickerColumn items={AMPM_OPTIONS} selectedIndex={ampmIndex}   onSelect={onAmpm}   colWidth={46} />
    </View>
  );
}

const tpStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stripe: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 6 + COL_ITEM_H,   // wrap paddingTop (6) + one item height above centre
    height: COL_ITEM_H,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary + '25',
  },
  colon: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    color: Colors.primary,
    marginHorizontal: 2,
    marginBottom: 2,
  },
});

// ─── Add Deadline Button ──────────────────────────────────────────────────────
function AddDeadlineButton({ onPress }: { onPress: () => void }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 400, friction: 8 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 7 }).start();

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={addDlStyles.btn}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        {/* Subtle ambient glow behind the icon */}
        <Animated.View style={[addDlStyles.iconGlow, { opacity: glowOpacity }]} />

        <View style={addDlStyles.iconWrap}>
          <MaterialCommunityIcons name="plus" size={14} color={Colors.onPrimary} />
        </View>

        <Text style={addDlStyles.label}>Add Deadline</Text>

        <View style={addDlStyles.arrow}>
          <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const addDlStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    left: -8, top: -8,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
  },
  iconWrap: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    color: Colors.primary,
    letterSpacing: 0.1,
  },
  arrow: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ConstraintsScreen({ navigation }: Props) {
  const storedConstraints = useAppStore((s) => s.constraints);
  const storedDeadlines   = useAppStore((s) => s.deadlines);
  const { setConstraints, setDeadlines } = useAppStore();
  const pm = usePremium();

  const [commitments, setCommitments]       = useState<Constraint[]>(
    storedConstraints.length > 0 ? storedConstraints : MOCK_CONSTRAINTS
  );
  const [showModal, setShowModal]           = useState(false);
  const [newTitle,  setNewTitle]            = useState('');
  const [newStart,  setNewStart]            = useState('');
  const [newEnd,    setNewEnd]              = useState('');

  // Deadlines state
  const [deadlines, setDeadlinesLocal]      = useState<DeadlineTask[]>(
    storedDeadlines.length > 0 ? storedDeadlines : MOCK_DEADLINES
  );
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [dlTitle, setDlTitle]               = useState('');
  const [dlHour,   setDlHour]               = useState(4);   // "5" = index 4
  const [dlMinute, setDlMinute]             = useState(0);   // "00"
  const [dlAmpm,   setDlAmpm]               = useState(1);   // "PM"

  // Header entrance
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;
  // CTA press
  const btnScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.quad)  }),
    ]).start();
  }, []);

  const removeCommitment = (id: string) =>
    setCommitments((c) => {
      const updated = c.filter((x) => x.id !== id);
      setConstraints(updated);
      return updated;
    });

  const addCommitment = () => {
    if (!newTitle.trim()) return;
    const entry: Constraint = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      start: newStart.trim() || '—',
      end:   newEnd.trim()   || '—',
      color: 'primary',
    };
    setCommitments((c) => {
      const updated = [...c, entry];
      setConstraints(updated);
      return updated;
    });
    setNewTitle(''); setNewStart(''); setNewEnd('');
    setShowModal(false);
  };

  const addDeadline = () => {
    const h = HOURS[dlHour].padStart(2, '0');
    const timeStr = `${h}:${MINUTES[dlMinute]} ${AMPM_OPTIONS[dlAmpm]}`;
    const entry: DeadlineTask = {
      id:       Date.now().toString(),
      title:    dlTitle.trim() || 'Untitled Task',
      deadline: `By ${timeStr}`,
    };
    setDeadlinesLocal((d) => {
      const updated = [...d, entry];
      setDeadlines(updated);
      return updated;
    });
    setDlTitle('');
    setShowDeadlineModal(false);
  };

  const removeDeadline = (id: string) =>
    setDeadlinesLocal((d) => {
      const updated = d.filter((x) => x.id !== id);
      setDeadlines(updated);
      return updated;
    });

  const pressIn  = useCallback(() =>
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start(), []);
  const pressOut = useCallback(() =>
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.02, useNativeDriver: true, tension: 400, friction: 6 }),
      Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start(), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar onBack={() => navigation.goBack()} onCancel={() => navigation.goBack()} />

      {/* Background ambient blobs */}
      <View style={styles.blob1} pointerEvents="none" />
      <View style={styles.blob2} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
          </View>
          <Text style={styles.title}>Daily Constraints</Text>
          <Text style={styles.subtitle}>
            Define your non-negotiables. Momentum uses these to architect your most productive day.
          </Text>
        </Animated.View>

        {/* ── 1. Fixed Commitments ── */}
        <SectionCard delay={120}>
          <SectionHeader
            icon="calendar-clock" title="Fixed Commitments" num={1}
            right={
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  if (!pm.isPremium && commitments.length >= FREE_CONSTRAINTS_LIMIT) {
                    navigation.navigate('Premium');
                  } else {
                    setShowModal(true);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={!pm.isPremium && commitments.length >= FREE_CONSTRAINTS_LIMIT ? 'lock-outline' : 'plus'}
                  size={16}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            }
          />

          {commitments.length === 0 ? (
            <View style={styles.emptyCommit}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={Colors.outlineVariant} />
              <Text style={styles.emptyText}>No fixed commitments yet</Text>
              <Text style={styles.emptySubText}>Tap + to add classes, meetings, or appointments</Text>
            </View>
          ) : (
            <View style={styles.commitList}>
              {commitments.map((c) => (
                <View key={c.id} style={styles.commitRow}>
                  <View style={[styles.commitBar, c.color === 'secondary' && { backgroundColor: Colors.secondaryFixedDim }]} />
                  <View style={styles.commitInfo}>
                    <Text style={styles.commitTitle}>{c.title}</Text>
                    <View style={styles.commitTimeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.outline} />
                      <Text style={styles.commitTime}>{c.start} — {c.end}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeCommitment(c.id)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={14} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* ── 2. Must-Finish Deadlines ── */}
        <SectionCard delay={260}>
          <SectionHeader icon="calendar-alert" title="Must Finish Before" num={2} />

          <View style={styles.deadlineList}>
            {deadlines.map((d, i) => (
              <View key={d.id} style={[styles.deadlineRow, i % 2 === 1 && { backgroundColor: Colors.primaryFixed + '40' }]}>
                <View style={styles.deadlineLeft}>
                  <Text style={styles.deadlineTitle}>{d.title}</Text>
                </View>
                <View style={styles.deadlinePill}>
                  <MaterialCommunityIcons name="timer-sand" size={11} color={Colors.primary} />
                  <Text style={styles.deadlineTime}>{d.deadline}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDeadline(d.id)}
                  style={styles.removeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={13} color={Colors.outline} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <AddDeadlineButton onPress={() => setShowDeadlineModal(true)} />
        </SectionCard>

        {/* ── CTA ── */}
        <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setConstraints(commitments);
              setDeadlines(deadlines);
              navigation.navigate('AIAnalysis');
            }}
            activeOpacity={1}
            onPressIn={pressIn}
            onPressOut={pressOut}
          >
            <View style={styles.btnShine} pointerEvents="none" />
            <Text style={styles.primaryBtnLabel}>Apply Constraints</Text>
            <View style={styles.btnArrow}>
              <MaterialCommunityIcons name="arrow-right" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Add Commitment Modal ── */}
      <Modal
        visible={showModal} transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconWrap}>
                <MaterialCommunityIcons name="calendar-plus" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Add Commitment</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Commitment name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Physics Class"
                placeholderTextColor={Colors.outline}
                value={newTitle} onChangeText={setNewTitle}
                autoFocus
              />
            </View>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:00 AM"
                  placeholderTextColor={Colors.outline}
                  value={newStart} onChangeText={setNewStart}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="11:00 AM"
                  placeholderTextColor={Colors.outline}
                  value={newEnd} onChangeText={setNewEnd}
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelLbl}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={addCommitment}>
                <MaterialCommunityIcons name="check" size={16} color={Colors.onPrimary} />
                <Text style={styles.modalConfirmLbl}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Deadline Modal ── */}
      <Modal
        visible={showDeadlineModal} transparent
        animationType="slide"
        onRequestClose={() => setShowDeadlineModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeadlineModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.primary + '15' }]}>
                  <MaterialCommunityIcons name="calendar-alert" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Add Deadline</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Maths Mock Test Revision"
                  placeholderTextColor={Colors.outline}
                  value={dlTitle} onChangeText={setDlTitle}
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>Must finish by</Text>
                  <Text style={styles.timePreview}>
                    {HOURS[dlHour].padStart(2, '0')}:{MINUTES[dlMinute]} {AMPM_OPTIONS[dlAmpm]}
                  </Text>
                </View>
                <TimePicker
                  hourIndex={dlHour}
                  minuteIndex={dlMinute}
                  ampmIndex={dlAmpm}
                  onHour={setDlHour}
                  onMinute={setDlMinute}
                  onAmpm={setDlAmpm}
                />
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDeadlineModal(false)}>
                  <Text style={styles.modalCancelLbl}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={addDeadline}>
                  <MaterialCommunityIcons name="check" size={16} color={Colors.onPrimary} />
                  <Text style={styles.modalConfirmLbl}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blob1: {
    position: 'absolute', top: -60, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primary + '08',
  },
  blob2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.primary + '06',
  },

  scroll: { paddingHorizontal: Spacing.gutter, paddingTop: 12, paddingBottom: 48, gap: 14 },

  // Header
  header: { gap: 8, marginBottom: 4 },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  stepBadgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary, letterSpacing: 0.3 },
  title:    { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, lineHeight: 36, color: Colors.onSurface, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 21, color: Colors.onSurfaceVariant },

  // Section card
  section: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 18,
    borderWidth: 1, borderColor: Colors.outlineVariant + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 14,
  },
  secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  secNumText:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: Colors.onPrimary },
  secIconWrap:   { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  secTitle:      { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },

  // Sleep window bar
  barWrap: { gap: 8 },
  barTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden', position: 'relative',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primaryFixed, borderRadius: 4 },
  barPeak: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Colors.primary, borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabelLeft:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabelCenter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  barLabelRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barDot:         { width: 6, height: 6, borderRadius: 3 },
  barLabelText:   { fontFamily: 'Manrope_500Medium', fontSize: 10, color: Colors.outline },

  // Sliders
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.outlineVariant + '40' },
  sliderBlock:    { gap: 2 },
  sliderRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  sliderLabel:    { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  timeVal:        { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  slider:         { width: '100%', height: 38 },
  sliderRange:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  rangeLabel:     { fontFamily: 'Manrope_400Regular', fontSize: 10, color: Colors.outline },
  hoursRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryFixed + '60', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  hoursText:      { fontFamily: 'Manrope_500Medium', fontSize: 12, color: Colors.onPrimaryFixedVariant },
  hoursAccent:    { fontFamily: 'Manrope_700Bold', color: Colors.primary },

  // Aura card
  auraCard: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryFixed + 'cc',
    borderWidth: 1, borderColor: Colors.primary + '20',
    overflow: 'hidden',
  },
  auraRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  auraRing1: { width: 180, height: 180, top: -60, right: -60 },
  auraRing2: { width: 130, height: 130, top: -30, right: -20 },
  auraContent: { padding: 16, gap: 8 },
  auraBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  auraBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  auraText:  { fontFamily: 'Manrope_400Regular', fontSize: 13.5, lineHeight: 20, color: Colors.onPrimaryFixedVariant },
  auraAccent:{ fontFamily: 'Manrope_600SemiBold', color: Colors.primary },
  auraTime:  { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  auraNote:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  auraNoteText: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.primary, opacity: 0.8 },

  // Commitments
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 1, borderColor: Colors.primary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyCommit: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText:   { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.outline },
  emptySubText:{ fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline, textAlign: 'center' },
  commitList:  { gap: 8 },
  commitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg, padding: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant + '25',
  },
  commitBar:     { width: 3, height: 40, borderRadius: 2, backgroundColor: Colors.primary },
  commitInfo:    { flex: 1, gap: 3 },
  commitTitle:   { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface },
  commitTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commitTime:    { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline },
  removeBtn:     { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' },

  // Deadlines
  deadlineList: { gap: 6 },
  deadlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: Colors.outlineVariant + '20',
  },
  deadlineLeft:  { flex: 1 },
  deadlineTitle: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  deadlinePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '12', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4, minWidth: 104, justifyContent: 'center' },
  deadlineTime:  { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary },
  addDeadlineBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary + '40', borderRadius: Radius.lg, paddingVertical: 13 },
  addDeadlineLbl:{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.primary },

  // CTA
  primaryBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17,
    borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 22, elevation: 9,
    overflow: 'hidden',
  },
  btnShine: {
    position: 'absolute', top: -20, left: 30,
    width: 90, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.09)',
    transform: [{ rotate: '25deg' }],
  },
  primaryBtnLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.onPrimary, letterSpacing: 0.15 },
  btnArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.onPrimary, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, gap: 14,
  },
  modalHandle:    { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, alignSelf: 'center', marginBottom: 4 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap:  { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  modalTitle:     { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface },
  inputGroup:     { gap: 4 },
  inputLabel:     { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.onSurfaceVariant, letterSpacing: 0.3, textTransform: 'uppercase' },
  inputLabelRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  timePreview:    { fontFamily: 'Manrope_700Bold', fontSize: 13, color: Colors.primary },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: 'Manrope_400Regular', fontSize: 14,
    color: Colors.onSurface, borderWidth: 1, borderColor: Colors.outlineVariant + '40',
  },
  inputRow:       { flexDirection: 'row', gap: 12 },
  modalBtns:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center',
  },
  modalCancelLbl: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurfaceVariant },
  modalConfirm: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  modalConfirmLbl: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary },
});
