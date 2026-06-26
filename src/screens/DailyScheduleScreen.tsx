import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

export function DailyScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const p   = usePersonalization();
  const { scheduleBlocks, tasks } = useAppStore();
  const scheduleCoach = useBehavioralCoach('schedule_banner');
  const now = nowMinutes();

  const blocks = scheduleBlocks;
  const hasUserTasks = tasks.length > 0;

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
              style={styles.regenBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AIAnalysis')}
            >
              <MaterialCommunityIcons name="star-four-points" size={12} color={Colors.onPrimary} />
              <Text style={styles.regenBtnLabel}>Regenerate</Text>
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

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        {blocks.length === 0 ? (
          <View style={styles.emptySchedule}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={Colors.outline} />
            <Text style={styles.emptyTitle}>No schedule yet</Text>
            <Text style={styles.emptySub}>
              {hasUserTasks
                ? 'Tap Regenerate to build your timetable from your tasks.'
                : 'Add tasks on the Plan tab, then generate your schedule.'}
            </Text>
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
        onPress={() => navigation.navigate('BrainDump')}
      >
        <MaterialCommunityIcons name="plus" size={26} color={Colors.onPrimary} />
      </TouchableOpacity>
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
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontFamily: 'Manrope_700Bold',
  },
  emptySub: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
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
