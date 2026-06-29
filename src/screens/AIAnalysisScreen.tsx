import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { TopBar } from '../components/TopBar';
import { AI_STEPS } from '../data/mockData';
import { buildAndSaveUserSchedule } from '../scheduling/scheduleService';
import { useAppStore } from '../store/useAppStore';

type Props    = NativeStackScreenProps<RootStackParamList, 'AIAnalysis'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width } = Dimensions.get('window');

// ─── Concentric ping ring ─────────────────────────────────────────────────────
function PingRing({ delay, size }: { delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        ]),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 1.5, borderColor: Colors.primary,
        opacity, transform: [{ scale }],
      }}
    />
  );
}

// ─── Animated step row ────────────────────────────────────────────────────────
function StepRow({ text, done, active, spin }: {
  text: string; done?: boolean; active?: boolean; spin?: Animated.Value;
}) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const rotation = spin?.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[stepStyles.row, { opacity: done ? 0.5 : fade, transform: [{ translateY: slide }] }]}>
      <View style={[stepStyles.iconWrap, done && stepStyles.iconWrapDone, active && stepStyles.iconWrapActive]}>
        {done ? (
          <MaterialCommunityIcons name="check" size={11} color={Colors.primary} />
        ) : active && spin ? (
          <Animated.View style={{ transform: [{ rotate: rotation! }] }}>
            <MaterialCommunityIcons name="loading" size={12} color={Colors.primary} />
          </Animated.View>
        ) : null}
      </View>
      <Text style={[stepStyles.text, active && stepStyles.textActive]}>
        {text}
      </Text>
      {active && <View style={stepStyles.activeDot} />}
    </Animated.View>
  );
}

const stepStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  iconWrapDone:  { backgroundColor: Colors.primaryFixed },
  iconWrapActive:{ backgroundColor: Colors.primaryFixed },
  text:        { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurfaceVariant, flex: 1 },
  textActive:  { fontFamily: 'Manrope_600SemiBold', color: Colors.onSurface },
  activeDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
});

// ─── Shimmer skeleton row ─────────────────────────────────────────────────────
function SkeletonRow({ widthPct, delay }: { widthPct: number; delay: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1400, delay, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.7, 0.35] });
  return (
    <Animated.View style={[skelStyles.bar, { width: `${widthPct}%` as `${number}%`, opacity }]} />
  );
}

const skelStyles = StyleSheet.create({
  bar: { height: 10, backgroundColor: Colors.primary + '25', borderRadius: 5 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function AIAnalysisScreen({ navigation }: Props) {
  const [stepIndex,      setStepIndex]      = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isDone,         setIsDone]         = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const logoBreath   = useRef(new Animated.Value(1)).current;
  const shimmerAnim  = useRef(new Animated.Value(0)).current;
  const spinAnim     = useRef(new Animated.Value(0)).current;
  const cardFade     = useRef(new Animated.Value(0)).current;
  const skelFade     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo breathing
    Animated.loop(Animated.sequence([
      Animated.timing(logoBreath, { toValue: 1.08, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(logoBreath, { toValue: 1,    duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // Shimmer sweep on title
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.linear })
    ).start();

    // Spinner
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.linear })
    ).start();

    // Entrance sequence
    Animated.stagger(160, [
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(skelFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => runSteps(0));
  }, []);

  const runSteps = (index: number) => {
    if (index >= AI_STEPS.length) {
      setIsDone(true);
      const { tasks } = useAppStore.getState();
      setTimeout(async () => {
        if (tasks.length > 0) {
          const result = await buildAndSaveUserSchedule();
          if (result.droppedTasks.length > 0) {
            navigation.replace('OverloadAlert', {
              droppedTasks: result.droppedTasks,
              scheduledCount: result.blocks.length,
            });
          } else {
            const { isPremium, hasSeenProOffer } = useAppStore.getState();
            if (!isPremium && !hasSeenProOffer) {
              navigation.replace('ProOffer');
            } else {
              navigation.replace('MainTabs', { screen: 'Schedule' });
            }
          }
        } else {
          useAppStore.setState({ scheduleBlocks: [] });
          navigation.replace('MainTabs');
        }
      }, 1000);
      return;
    }
    setStepIndex(index);
    Animated.timing(progressAnim, {
      toValue: AI_STEPS[index].progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
    setTimeout(() => {
      setCompletedSteps((p) => [...p, AI_STEPS[index].text]);
      runSteps(index + 1);
    }, 2400);
  };

  const progressWidth  = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const shimmerX       = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, width * 0.6] });
  const currentText    = AI_STEPS[stepIndex]?.text ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar />

      {/* Ambient background blobs */}
      <View style={styles.blob1} pointerEvents="none" />
      <View style={styles.blob2} pointerEvents="none" />

      <View style={styles.content}>

        {/* ── Central logo orb ── */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.orbWrap}>
            <PingRing size={90} delay={0}    />
            <PingRing size={90} delay={730}  />
            <PingRing size={90} delay={1460} />
            <Animated.View style={[styles.orbOuter, { transform: [{ scale: logoBreath }] }]}>
              <View style={styles.orbInner}>
                <MaterialCommunityIcons name="lightning-bolt" size={30} color={Colors.primary} />
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── Title block ── */}
        <Animated.View style={[styles.titleBlock, { opacity: fadeAnim }]}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>MOMENTUM INTELLIGENCE</Text>
            </View>
          </View>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>
              {'Building your\n'}
              <Text style={styles.titleAccent}>perfect schedule</Text>
            </Text>
            {/* Shimmer sweeps across the whole title as an overlay */}
            <Animated.View
              pointerEvents="none"
              style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}
            />
          </View>

          <Text style={styles.subtitle}>
            Analysing your tasks, energy patterns, and constraints to architect your most productive day.
          </Text>
        </Animated.View>

        {/* ── Steps card ── */}
        <Animated.View style={[styles.stepsCard, { opacity: cardFade }]}>
          {completedSteps.map((s, i) => (
            <StepRow key={`done-${i}`} text={s} done />
          ))}
          {!isDone && stepIndex < AI_STEPS.length && (
            <StepRow key={`active-${stepIndex}`} text={currentText} active spin={spinAnim} />
          )}
          {isDone && (
            <StepRow text="Schedule optimised — ready to review" done />
          )}

          {/* Progress bar inside card */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              {/* Glowing tip */}
              <View style={styles.progressTip} />
            </Animated.View>
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelLeft}>Analysing…</Text>
            <Animated.Text style={styles.progressPct}>
              {isDone ? '100%' : `${Math.round((AI_STEPS[stepIndex]?.progress ?? 0) * 100)}%`}
            </Animated.Text>
          </View>
        </Animated.View>

        {/* ── Schedule skeleton preview ── */}
        <Animated.View style={[styles.skelCard, { opacity: skelFade }]}>
          <View style={styles.skelHeader}>
            <View style={styles.skelDot} />
            <Text style={styles.skelLabel}>Schedule Preview</Text>
          </View>
          <View style={styles.skelRows}>
            {[
              [12, 55], [20, 40], [14, 70], [18, 35],
            ].map(([time, bar], i) => (
              <View key={i} style={styles.skelRow}>
                <SkeletonRow widthPct={time} delay={i * 120} />
                <View style={{ flex: 1 }}>
                  <SkeletonRow widthPct={bar} delay={i * 120 + 60} />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },

  blob1: { position: 'absolute', top: -80,  right: -80,  width: 280, height: 280, borderRadius: 140, backgroundColor: Colors.primary + '08' },
  blob2: { position: 'absolute', bottom: 60, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.primary + '06' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: 22,
  },

  // Orb
  orbWrap:  { alignItems: 'center', justifyContent: 'center', width: 90, height: 90 },
  orbOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary + '25',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 8,
  },
  orbInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },

  // Title
  titleBlock:  { alignItems: 'center', gap: 8 },
  badgeRow:    { flexDirection: 'row' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  badgeText: { fontFamily: 'Manrope_700Bold', fontSize: 9.5, color: Colors.primary, letterSpacing: 1.2 },
  titleWrap: { overflow: 'hidden', alignSelf: 'stretch' },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26, lineHeight: 34,
    color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.5,
  },
  titleAccent: { color: Colors.primary, fontFamily: 'Manrope_800ExtraBold' },
  shimmerBar: {
    position: 'absolute', top: 0, bottom: 0, width: 70,
    backgroundColor: 'rgba(255,255,255,0.38)',
    transform: [{ skewX: '-15deg' }],
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center', maxWidth: 300, lineHeight: 20,
  },

  // Steps card
  stepsCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 16, gap: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  progressTrack: {
    width: '100%', height: 5,
    backgroundColor: Colors.outlineVariant + '25',
    borderRadius: 3, overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
  },
  progressTip: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#fff',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
    marginRight: -5,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelLeft: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.outline },
  progressPct:       { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.primary },

  // Skeleton
  skelCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant + '25',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  skelHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  skelDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary + '60' },
  skelLabel:  { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.outline, letterSpacing: 0.3 },
  skelRows:   { gap: 12 },
  skelRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
