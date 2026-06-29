import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { useAppStore } from '../store/useAppStore';

type Props    = NativeStackScreenProps<RootStackParamList, 'OverloadAlert'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ─── Animated entrance card ───────────────────────────────────────────────────
function EntryCard({ children, delay, style }: {
  children: React.ReactNode; delay: number; style?: object;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 420, delay, useNativeDriver: true, easing: Easing.out(Easing.quad)  }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Action button with press animation ──────────────────────────────────────
function ActionBtn({ label, icon, variant, onPress }: {
  label: string; icon: IconName;
  variant: 'primary' | 'secondary' | 'ghost';
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 7 }).start();

  const btnStyle = variant === 'primary'   ? btnStyles.primary
                 : variant === 'secondary' ? btnStyles.secondary
                 : btnStyles.ghost;
  const lblStyle = variant === 'primary'   ? btnStyles.primaryLbl
                 : variant === 'secondary' ? btnStyles.secondaryLbl
                 : btnStyles.ghostLbl;
  const iconColor = variant === 'primary' ? '#fff'
                  : variant === 'secondary' ? Colors.primary
                  : Colors.onSurfaceVariant;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[btnStyles.base, btnStyle]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <MaterialCommunityIcons name={icon} size={17} color={iconColor} />
        <Text style={[btnStyles.baseLbl, lblStyle]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const btnStyles = StyleSheet.create({
  base:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: Radius.xl },
  primary:     { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 6 },
  secondary:   { backgroundColor: Colors.primaryFixed, borderWidth: 1, borderColor: Colors.primary + '30' },
  ghost:       { backgroundColor: 'transparent' },
  baseLbl:     { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  primaryLbl:  { color: '#fff' },
  secondaryLbl:{ color: Colors.primary },
  ghostLbl:    { color: Colors.onSurfaceVariant },
});

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, accent }: {
  icon: IconName; label: string; value: string; accent?: boolean;
}) {
  return (
    <View style={[chipStyles.wrap, accent && chipStyles.wrapAccent]}>
      <View style={[chipStyles.iconWrap, accent && chipStyles.iconWrapAccent]}>
        <MaterialCommunityIcons name={icon} size={16} color={accent ? Colors.error : Colors.primary} />
      </View>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, accent && chipStyles.valueAccent]}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap:        { flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: 14, gap: 6, borderWidth: 1, borderColor: Colors.outlineVariant + '30' },
  wrapAccent:  { borderColor: '#ef444420', backgroundColor: '#ef444408' },
  iconWrap:    { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  iconWrapAccent: { backgroundColor: '#ef444415' },
  label:       { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.onSurfaceVariant, letterSpacing: 0.2 },
  value:       { fontFamily: 'Manrope_700Bold',   fontSize: 14, color: Colors.onSurface },
  valueAccent: { color: '#ef4444' },
});

// ─── Burnout bar ──────────────────────────────────────────────────────────────
function BurnoutBar({ pct }: { pct: number }) {
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: pct / 100, duration: 900, delay: 600, useNativeDriver: false, easing: Easing.out(Easing.cubic) }).start();
  }, []);
  const color = pct > 60 ? '#ef4444' : pct > 30 ? Colors.primary : '#22c55e';
  return (
    <View style={burnStyles.track}>
      <Animated.View style={[burnStyles.fill, { backgroundColor: color, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const burnStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3 },
});

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
}

function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function OverloadAlertScreen({ navigation, route }: Props) {
  const { droppedTasks, scheduledCount } = route.params;
  const { tasks, removeTask } = useAppStore();
  const droppedCount = droppedTasks.length;
  const droppedMinutes = droppedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalUnits = droppedCount + scheduledCount;
  const overloadPct = totalUnits > 0 ? Math.round((droppedCount / totalUnits) * 100) : 0;
  const sustainPct = Math.max(0, 100 - overloadPct);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar onBack={() => navigation.goBack()} />

      {/* Ambient blobs */}
      <View style={styles.blob1} pointerEvents="none" />
      <View style={styles.blob2} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <EntryCard delay={0}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 3 of 3</Text>
          </View>
          <Text style={styles.title}>Capacity{'\n'}Analysis</Text>
          <Text style={styles.subtitle}>
            Momentum reviewed your schedule. Here's what it found.
          </Text>
        </EntryCard>

        {/* ── Overload alert card ── */}
        <EntryCard delay={100}>
          <View style={styles.alertCard}>
            {/* Top accent bar */}
            <View style={styles.alertTopBar} />

            <View style={styles.alertHeader}>
              <View style={styles.alertIconWrap}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.alertTitle}>Overload Detected</Text>
                <Text style={styles.alertBadge}>TODAY · HIGH INTENSITY</Text>
              </View>
            </View>

            <Text style={styles.alertDesc}>
              Your day couldn't fit{' '}
              <Text style={styles.alertHighlight}>
                {droppedCount} task{droppedCount !== 1 ? 's' : ''}
              </Text>
              {' '}—{' '}
              <Text style={styles.alertHighlight}>{formatDuration(droppedMinutes)}</Text>
              {' '}didn't make it onto today's schedule.{' '}
              <Text style={styles.alertHighlight}>{scheduledCount}</Text>
              {' '}block{scheduledCount !== 1 ? 's' : ''} were scheduled.
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatChip icon="gauge-full"    label="Tasks Dropped"  value={`${droppedCount}`} accent />
              <StatChip icon="battery-alert" label="Time Overflow"  value={formatDurationShort(droppedMinutes)} accent />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actionsCol}>
              <ActionBtn label="Remove dropped tasks and continue" icon="tune-variant"   variant="primary"   onPress={() => {
                droppedTasks.forEach((dropped) => {
                  const match = tasks.find(
                    (t) => t.text === dropped.title || dropped.title.startsWith(t.text)
                  );
                  if (match) removeTask(match.id);
                });
                navigation.navigate('MainTabs', { screen: 'Schedule' });
              }} />
              <ActionBtn label="Go back and edit tasks"            icon="pencil-outline" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Focus' })} />
              <ActionBtn label="Continue with full list"           icon="check"          variant="ghost"     onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' })} />
            </View>
          </View>
        </EntryCard>

        {/* ── Dropped tasks card ── */}
        <EntryCard delay={200}>
          <View style={styles.conflictCard}>
            <View style={styles.conflictBadgeRow}>
              <MaterialCommunityIcons name="format-list-bulleted" size={12} color={Colors.primary} />
              <Text style={styles.conflictBadgeText}>Dropped Tasks</Text>
            </View>
            <Text style={styles.conflictTitle}>
              {droppedCount} task{droppedCount !== 1 ? 's' : ''} couldn't fit today
            </Text>
            <View style={styles.droppedList}>
              {droppedTasks.map((task, index) => (
                <View key={`${task.title}-${index}`} style={styles.droppedRow}>
                  <Text style={styles.droppedTitle} numberOfLines={2}>{task.title}</Text>
                  <Text style={styles.droppedDuration}>{formatDurationShort(task.durationMinutes)}</Text>
                </View>
              ))}
            </View>
          </View>
        </EntryCard>

        {/* ── Sustainability card ── */}
        <EntryCard delay={300}>
          <View style={styles.sustainCard}>
            <View style={styles.sustainHeader}>
              <View style={styles.sustainIconWrap}>
                <MaterialCommunityIcons name="heart-pulse" size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sustainTitle}>Sustainability Score</Text>
                <Text style={styles.sustainSub}>Based on your current pace</Text>
              </View>
              <Text style={styles.sustainPct}>{sustainPct}%</Text>
            </View>
            <BurnoutBar pct={sustainPct} />
            <Text style={styles.sustainNote}>
              {scheduledCount} block{scheduledCount !== 1 ? 's' : ''} fit today, but{' '}
              {formatDuration(droppedMinutes)} of work was left off the schedule.
              Consider trimming your list or moving tasks to another day.
            </Text>
          </View>
        </EntryCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blob1:     { position: 'absolute', top: -60, right: -70,  width: 260, height: 260, borderRadius: 130, backgroundColor: Colors.primary + '07' },
  blob2:     { position: 'absolute', bottom: 80, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.primary + '05' },
  scroll:    { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.md, paddingBottom: 60, gap: 16 },

  // Header
  stepBadge:     { alignSelf: 'flex-start', backgroundColor: Colors.primaryFixed, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10, borderWidth: 1, borderColor: Colors.primary + '20' },
  stepBadgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary, letterSpacing: 0.3 },
  title:         { fontFamily: 'Manrope_800ExtraBold', fontSize: 30, lineHeight: 38, color: Colors.onSurface, letterSpacing: -0.7, marginBottom: 6 },
  subtitle:      { ...Typography.bodyLg, color: Colors.onSurfaceVariant },

  // Alert card
  alertCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 20, gap: 14,
    ...Shadow.card,
    borderWidth: 1, borderColor: Colors.outlineVariant + '30',
    overflow: 'hidden',
  },
  alertTopBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.primary },
  alertHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertIconWrap:{ width: 44, height: 44, borderRadius: 13, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center' },
  alertTitle:   { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface, letterSpacing: -0.2 },
  alertBadge:   { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: Colors.primary, letterSpacing: 1 },
  alertDesc:    { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22 },
  alertHighlight: { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  statsRow:     { flexDirection: 'row', gap: 10 },
  divider:      { height: StyleSheet.hairlineWidth, backgroundColor: Colors.outlineVariant + '50' },
  actionsCol:   { gap: 8 },

  // Conflict card
  conflictCard:      { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, padding: 18, gap: 10, ...Shadow.card, borderWidth: 1, borderColor: Colors.outlineVariant + '25' },
  conflictBadgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryFixed, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '20' },
  conflictBadgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: Colors.primary, letterSpacing: 0.4 },
  conflictTitle:     { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.onSurface, letterSpacing: -0.2 },
  conflictDesc:      { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 21 },
  droppedList:       { gap: 8 },
  droppedRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.outlineVariant + '25' },
  droppedTitle:      { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  droppedDuration:   { fontFamily: 'Manrope_700Bold', fontSize: 13, color: Colors.primary },

  // Sustainability card
  sustainCard:    { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, padding: 18, gap: 12, ...Shadow.card, borderWidth: 1, borderColor: '#ef444420' },
  sustainHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sustainIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ef444412', alignItems: 'center', justifyContent: 'center' },
  sustainTitle:   { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onSurface },
  sustainSub:     { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  sustainPct:     { fontFamily: 'Manrope_800ExtraBold', fontSize: 22, color: '#ef4444', letterSpacing: -0.5 },
  sustainNote:    { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 20 },
});
