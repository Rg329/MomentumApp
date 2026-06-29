import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { usePersonalization } from '../personalization';
import { ScheduleBlock } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { useBehavioralCoach } from '../coaching';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { usePremium } from '../monetization';
import { FREE_GENERATION_LIMIT } from '../monetization/features';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const BLOCK_COLORS: Record<string, string> = {
  deep_work:    Colors.primary,
  break:        Colors.secondaryFixedDim,
  meeting:      Colors.secondary,
  productivity: Colors.tertiary,
  insight:      Colors.primary,
};

const BLOCK_ICONS: Record<string, IconName> = {
  deep_work:    'lightning-bolt',
  break:        'coffee-outline',
  meeting:      'music-note',
  productivity: 'dumbbell',
  insight:      'star-four-points',
};

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function TimeBlockItem({ block, onPress }: { block: ScheduleBlock; onPress: () => void }) {
  const accentColor = BLOCK_COLORS[block.type] ?? Colors.primary;
  const iconName: IconName = BLOCK_ICONS[block.type] ?? 'circle';

  // ── Break block ────────────────────────────────────────────────────────────
  if (block.type === 'break') {
    return (
      <View style={styles.breakBlock}>
        <View style={styles.breakIconWrap}>
          <MaterialCommunityIcons name="coffee-outline" size={16} color={Colors.outline} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.breakTitle}>{block.title}</Text>
          <Text style={styles.breakDesc}>{block.description}</Text>
        </View>
      </View>
    );
  }

  // ── Insight block ──────────────────────────────────────────────────────────
  if (block.type === 'insight') {
    return (
      <View style={styles.insightBlock}>
        <View style={styles.insightOrb} />
        <View style={styles.insightBadgeRow}>
          <MaterialCommunityIcons name="star-four-points" size={10} color={Colors.primary} />
          <Text style={styles.insightBadgeText}>Momentum Insight</Text>
        </View>
        <Text style={styles.insightDesc}>{block.description}</Text>
        <View style={styles.insightDots}>
          <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: Colors.primary, opacity: 0.35 }]} />
          <View style={[styles.dot, { backgroundColor: Colors.primary, opacity: 0.15 }]} />
        </View>
      </View>
    );
  }

  // ── Standard task block ────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.taskBlock, { borderLeftColor: accentColor, backgroundColor: accentColor + '07' }]}
    >
      {/* Subtle decorative orb top-right */}
      <View style={[styles.taskOrb, { backgroundColor: accentColor + '14' }]} />

      <View style={styles.taskHeader}>
        <Text style={[styles.taskType, { color: accentColor }]}>{block.label}</Text>
        <View style={[styles.taskIconBubble, { backgroundColor: accentColor + '18' }]}>
          <MaterialCommunityIcons name={iconName} size={13} color={accentColor} />
        </View>
      </View>

      <Text style={styles.taskTitle}>{block.title}</Text>
      <Text style={styles.taskDesc} numberOfLines={2}>{block.description}</Text>

      {(block.duration || block.tag) ? (
        <View style={styles.taskMeta}>
          {block.duration && (
            <View style={[styles.metaChip, { backgroundColor: accentColor + '15' }]}>
              <MaterialCommunityIcons name="timer-outline" size={10} color={accentColor} />
              <Text style={[styles.metaChipText, { color: accentColor }]}>{block.duration}</Text>
            </View>
          )}
          {block.tag && (
            <View style={[styles.metaChip, { backgroundColor: Colors.surfaceContainerHigh }]}>
              <Text style={[styles.metaChipText, { color: Colors.onSurfaceVariant }]}>
                {block.tag}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Schedule Ready Banner ────────────────────────────────────────────────────
function ReadyBanner({ taskCount, focusHours, onDismiss }: {
  taskCount: number; focusHours: string; onDismiss: () => void;
}) {
  const slide  = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide,  { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slide,   { toValue: -120, duration: 380, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(opacity, { toValue: 0,    duration: 280, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[readyStyles.banner, { opacity, transform: [{ translateY: slide }] }]}>
      <View style={readyStyles.left}>
        <View style={readyStyles.iconCircle}>
          <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />
        </View>
        <View style={{ gap: 1 }}>
          <Text style={readyStyles.title}>Your day is ready</Text>
          <Text style={readyStyles.sub}>{taskCount} task{taskCount !== 1 ? 's' : ''} · {focusHours}h of focus blocked</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <MaterialCommunityIcons name="close" size={16} color={Colors.outline} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const readyStyles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.gutter,
    marginBottom: 8,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  left:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Manrope_700Bold',    fontSize: 14, color: Colors.onSurface },
  sub:   { fontFamily: 'Manrope_500Medium',  fontSize: 12, color: Colors.onSurfaceVariant },
});

export function DailyScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const p   = usePersonalization();
  const pm  = usePremium();
  const { scheduleBlocks, tasks, completedTaskIds, clearDayData, removeTask, dailyGenerations, lastGenerationDate, incrementGeneration } = useAppStore();
  const scheduleDate = useAppStore((s) => s.scheduleDate);

  const today = new Date().toISOString().split('T')[0];
  const todayGenerations = lastGenerationDate === today ? dailyGenerations : 0;
  const canRegenerate = pm.isPremium || todayGenerations < FREE_GENERATION_LIMIT;

  const handleRegenerate = () => {
    if (!canRegenerate) {
      navigation.navigate('Premium');
      return;
    }
    incrementGeneration();
    navigation.navigate('Constraints');
  };
  const scheduleCoach = useBehavioralCoach('schedule_banner');
  const [now, setNow] = useState(nowMinutes());

  useEffect(() => {
    const interval = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const blocks = scheduleBlocks;
  const hasUserTasks = tasks.length > 0;

  // Show "Your day is ready" banner once when blocks first appear
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const prevBlockCount = useRef(0);
  useEffect(() => {
    if (blocks.length > 0 && prevBlockCount.current === 0) {
      setShowReadyBanner(true);
    }
    prevBlockCount.current = blocks.length;
  }, [blocks.length]);

  // Compute focus hours for banner
  const focusHours = useMemo(() => {
    const mins = blocks
      .filter((b) => b.type !== 'break' && b.type !== 'insight')
      .reduce((acc, b) => acc + (b.duration ? parseInt(b.duration, 10) : 0), 0);
    return (mins / 60).toFixed(1).replace('.0', '');
  }, [blocks]);

  const scheduleIsStale = scheduleDate !== null && scheduleDate !== today && blocks.length > 0;
  const [showRollover, setShowRollover] = useState(false);

  useEffect(() => {
    if (scheduleIsStale) setShowRollover(true);
  }, [scheduleIsStale]);

  const handleStartFresh = () => {
    setShowRollover(false);
    clearDayData();
    tasks.forEach((t) => removeTask(t.id));
    navigation.navigate('BrainDump');
  };

  const handleCarryOver = () => {
    setShowRollover(false);
    const completedBlockTitles = blocks
      .filter((b) => completedTaskIds.includes(b.id))
      .map((b) => b.title);
    tasks
      .filter((t) => completedBlockTitles.some((title) => title === t.text))
      .forEach((t) => removeTask(t.id));
    clearDayData();
    navigation.navigate('BrainDump');
  };

  const nowIndex = useMemo(() => {
    for (let i = 0; i < blocks.length; i++) {
      if (timeStrToMinutes(blocks[i].time) > now) return i;
    }
    return blocks.length;
  }, [blocks, now]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Personalization rationale banner ───────────────────────────── */}
        {(p.profile.procrastinationType || p.profile.peakTime) && (
          <View style={[styles.rationaleBar, { borderColor: p.tone.badgeColor + '22' }]}>
            <View style={[styles.rationaleDot, { backgroundColor: p.tone.badgeColor + '30' }]}>
              <MaterialCommunityIcons name="tune-variant" size={11} color={p.tone.badgeColor} />
            </View>
            <Text style={[styles.rationaleText, { color: p.tone.badgeColor }]}>
              {p.scheduleHints.scheduleRationale}
            </Text>
          </View>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerKickerRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={12} color={Colors.primary} />
              <Text style={styles.headerBadge}>Anti‑Procrastination Plan</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.adjustBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Constraints')}
            >
              <MaterialCommunityIcons name="tune" size={12} color={Colors.primary} />
              <Text style={styles.adjustBtnLabel}>Adjust</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.regenBtn, !canRegenerate && styles.regenBtnLocked]}
              activeOpacity={0.85}
              onPress={handleRegenerate}
            >
              <MaterialCommunityIcons
                name={canRegenerate ? 'star-four-points' : 'lock-outline'}
                size={12}
                color={Colors.onPrimary}
              />
              <Text style={styles.regenBtnLabel}>
                {canRegenerate ? 'Regenerate' : 'Regenerate · Pro'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.headerSub}>
            {scheduleCoach.coaching?.action
              ?? (hasUserTasks
                ? 'Your schedule is built from your tasks — tap a block to start focus mode.'
                : 'Add tasks on the Plan tab, then generate your schedule.')}
          </Text>
        </View>

        {/* ── Ready banner ───────────────────────────────────────────────── */}
        {showReadyBanner && (
          <ReadyBanner
            taskCount={tasks.length}
            focusHours={focusHours}
            onDismiss={() => setShowReadyBanner(false)}
          />
        )}

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        {blocks.length === 0 ? (
          <View style={styles.emptySchedule}>
            <View style={styles.emptyOrb}>
              <MaterialCommunityIcons name="calendar-clock" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {hasUserTasks ? 'Ready to build your day' : 'Nothing planned yet'}
            </Text>
            <Text style={styles.emptySub}>
              {hasUserTasks
                ? `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} waiting. Hit Generate on the Plan tab to turn them into a schedule.`
                : 'Head to the Plan tab, add what you want to accomplish today, then hit Generate.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Focus' })}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnLabel}>
                {hasUserTasks ? 'Back to Generate →' : 'Add Tasks →'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.timeline}>
          {/* Subtle dotted vertical guide */}
          <View style={styles.timelineGuide} />

          {blocks.map((block, idx) => (
            <React.Fragment key={block.id}>
              {idx === nowIndex && <NowIndicator />}
              <View style={styles.timelineRow}>
                <View style={styles.timeCell}>
                  <Text style={styles.timeLabel}>{block.time}</Text>
                </View>
                <View style={styles.blockCell}>
                  <TimeBlockItem
                    block={block}
                    onPress={() =>
                      navigation.navigate('FocusMode', {
                        taskId: block.id,
                        taskTitle: block.title,
                        taskDesc: block.description,
                        durationMinutes: block.duration ? parseInt(block.duration, 10) : 25,
                        scheduledTime: block.time,
                      })
                    }
                  />
                </View>
              </View>
            </React.Fragment>
          ))}

          {nowIndex === blocks.length && <NowIndicator />}
        </View>
        )}
      </ScrollView>

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Focus' })}
      >
        <MaterialCommunityIcons name="plus" size={26} color={Colors.onPrimary} />
      </TouchableOpacity>

      {/* ── Day Rollover Modal ── */}
      <Modal visible={showRollover} transparent animationType="fade">
        <View style={rolloverStyles.overlay}>
          <View style={rolloverStyles.card}>
            <View style={rolloverStyles.iconWrap}>
              <Text style={rolloverStyles.emoji}>🌅</Text>
            </View>
            <Text style={rolloverStyles.title}>New day ahead</Text>
            <Text style={rolloverStyles.subtitle}>
              Your yesterday's schedule is still here. What would you like to do?
            </Text>

            <TouchableOpacity style={rolloverStyles.primaryBtn} onPress={handleCarryOver} activeOpacity={0.88}>
              <MaterialCommunityIcons name="arrow-right-circle" size={18} color="#fff" />
              <Text style={rolloverStyles.primaryBtnText}>Carry over unfinished tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={rolloverStyles.secondaryBtn} onPress={handleStartFresh} activeOpacity={0.88}>
              <MaterialCommunityIcons name="refresh" size={16} color={Colors.primary} />
              <Text style={rolloverStyles.secondaryBtnText}>Start completely fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NowIndicator() {
  return (
    <View style={styles.nowRow}>
      <View style={styles.nowDotOuter}>
        <View style={styles.nowDotInner} />
      </View>
      <View style={styles.nowLine} />
      <Text style={styles.nowLabel}>NOW</Text>
    </View>
  );
}

const rolloverStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: Spacing.gutter,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 28,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emoji: { fontSize: 34 },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    marginBottom: 8,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  secondaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
    gap: 6,
  },

  // ── Rationale banner ────────────────────────────────────────────────────────
  rationaleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
  },
  rationaleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rationaleText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    marginBottom: Spacing.md,
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadge: {
    ...Typography.labelSm,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 10,
  },
  headerDate: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Manrope_800ExtraBold',
  },
  headerSub: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    maxWidth: 340,
  },
  emptySchedule: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyOrb: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18, color: Colors.onSurface,
    textAlign: 'center', letterSpacing: -0.3,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14, color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22, maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 50,
  },
  emptyBtnLabel: {
    fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  adjustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '70',
    backgroundColor: Colors.surfaceContainerLow,
    minWidth: 108,
  },
  adjustBtnLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  regenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 132,
  },
  regenBtnLocked: {
    backgroundColor: Colors.outline,
    shadowOpacity: 0,
    elevation: 0,
  },
  regenBtnLabel: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },

  // ── Timeline ────────────────────────────────────────────────────────────────
  timeline: {
    position: 'relative',
  },
  timelineGuide: {
    position: 'absolute',
    left: 43,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: Colors.outlineVariant + '28',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 14,
    alignItems: 'flex-start',
  },
  timeCell: {
    width: 46,
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.3,
  },
  blockCell: {
    flex: 1,
  },

  // ── Now indicator ────────────────────────────────────────────────────────────
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 32,
    gap: 0,
  },
  nowDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.error + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  nowDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.error,
  },
  nowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.error,
    opacity: 0.4,
    marginRight: 8,
  },
  nowLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: Colors.error,
    letterSpacing: 1.5,
  },

  // ── Task block ──────────────────────────────────────────────────────────────
  taskBlock: {
    borderRadius: Radius.lg,
    padding: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  taskOrb: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskType: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  taskIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    marginBottom: 5,
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  taskDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Break block ─────────────────────────────────────────────────────────────
  breakBlock: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '40',
  },
  breakIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  breakTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  breakDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },

  // ── Insight block ────────────────────────────────────────────────────────────
  insightBlock: {
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    overflow: 'hidden',
  },
  insightOrb: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '10',
  },
  insightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  insightBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  insightDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  insightDots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
});
