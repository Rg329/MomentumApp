import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { PremiumBadge } from '../components/PremiumBadge';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import { useAppStore } from '../store/useAppStore';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const TARGET_SCORE = 84;

// ─── Locked premium section ────────────────────────────────────────────────────
function LockedSection({
  icon, title, description, onUnlock,
}: { icon: IconName; title: string; description: string; onUnlock: () => void }) {
  return (
    <TouchableOpacity style={lockedStyles.card} onPress={onUnlock} activeOpacity={0.88}>
      <View style={lockedStyles.blur}>
        {/* Blurred preview bars */}
        {[70, 50, 85, 40].map((w, i) => (
          <View key={i} style={[lockedStyles.bar, { width: `${w}%` }]} />
        ))}
      </View>
      <View style={lockedStyles.overlay}>
        <View style={lockedStyles.proCorner}>
          <PremiumBadge size="sm" />
        </View>
        <View style={[lockedStyles.iconRing, { borderColor: PREMIUM_COLOR + '50' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={PREMIUM_COLOR} />
        </View>
        <Text style={lockedStyles.title}>{title}</Text>
        <Text style={lockedStyles.desc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const lockedStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl, overflow: 'hidden', height: 156,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: PREMIUM_COLOR + '30',
    ...Shadow.card,
  },
  blur: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 20, gap: 10, justifyContent: 'center' },
  bar:   { height: 10, backgroundColor: Colors.surfaceVariant, borderRadius: 5, opacity: 0.6 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(250,248,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  proCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  iconRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: PREMIUM_COLOR + '0c' },
  title:     { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  desc:      { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 240 },
});

// ─── Premium upgrade banner ────────────────────────────────────────────────────
function InsightsBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <TouchableOpacity style={bannerStyles.card} onPress={onUpgrade} activeOpacity={0.88}>
      <View style={bannerStyles.left}>
        <View style={bannerStyles.iconWrap}>
          <Text style={{ fontSize: 18 }}>★</Text>
        </View>
        <View>
          <Text style={bannerStyles.title}>Unlock Full Insights</Text>
          <Text style={bannerStyles.sub}>Advanced analytics · AI reflections · Patterns</Text>
        </View>
      </View>
      <Animated.View style={[bannerStyles.arrow, { transform: [{ scale: pulse }] }]}>
        <MaterialCommunityIcons name="arrow-right" size={16} color={PREMIUM_COLOR} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const bannerStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PREMIUM_COLOR + '10',
    borderRadius: Radius.xl, padding: 14,
    borderWidth: 1, borderColor: PREMIUM_COLOR + '30',
  },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: PREMIUM_COLOR, alignItems: 'center', justifyContent: 'center' },
  title:    { fontFamily: 'Manrope_700Bold', fontSize: 13.5, color: Colors.onSurface },
  sub:      { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 1 },
  arrow:    { width: 30, height: 30, borderRadius: 15, backgroundColor: PREMIUM_COLOR + '18', alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function DailySummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pm         = usePremium();
  const { completeDailyReview } = useAppStore();
  const [score, setScore] = useState(0);
  const scoreBarAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.timing(scoreBarAnim, {
      toValue: TARGET_SCORE / 100, duration: 1500, useNativeDriver: false,
    }).start();
    let current = 0;
    const step = Math.ceil(TARGET_SCORE / 60);
    const interval = setInterval(() => {
      current = Math.min(current + step, TARGET_SCORE);
      setScore(current);
      if (current >= TARGET_SCORE) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, []);

  const scoreBarWidth = scoreBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handleComplete = () => {
    completeDailyReview();
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => navigation.navigate('Schedule' as any));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View style={[styles.heroBlock, { opacity: fadeAnim }]}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
          <View style={styles.heroKickerRow}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.primary} />
            <Text style={styles.heroKicker}>Anti‑procrastination insights</Text>
          </View>
          <Text style={styles.heroTitle}>Today, made easier to start.</Text>
          <Text style={styles.heroSubtitle}>
            See what helped you move forward—and what to simplify tomorrow.
          </Text>
        </Animated.View>

        {/* ── FREE: Momentum Score ── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>DAILY INSIGHT</Text>
              </View>
              <Text style={styles.scoreLabelTitle}>Momentum Score</Text>
            </View>
            <View style={styles.scoreRight}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreDelta}>+12% from yesterday</Text>
            </View>
          </View>

          <View style={styles.scoreBar}>
            <Animated.View style={[styles.scoreBarFill, { width: scoreBarWidth }]} />
          </View>

          <View style={styles.scoreGrid}>
            <View style={styles.scoreMetric}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
              <Text style={styles.scoreMetricLabel}>Tasks Completed</Text>
              <Text style={styles.scoreMetricValue}>12</Text>
            </View>
            <View style={styles.scoreMetric}>
              <MaterialCommunityIcons name="clock-fast" size={18} color={Colors.secondary} />
              <Text style={styles.scoreMetricLabel}>Postponed</Text>
              <Text style={styles.scoreMetricValue}>2</Text>
            </View>
          </View>
          <View style={styles.scoreAura} />
        </View>

        {/* ── FREE: Time Distribution ── */}
        <View style={styles.distCard}>
          <Text style={styles.distTitle}>TIME DISTRIBUTION</Text>
          {[
            { label: 'Deep Work',     value: '5.2h', pct: 65,  color: Colors.primary },
            { label: 'Collaboration', value: '2.1h', pct: 30,  color: Colors.secondary },
            { label: 'Breaks',        value: '1.4h', pct: 20,  color: Colors.secondaryFixedDim },
          ].map((row) => (
            <View key={row.label}>
              <View style={styles.distRow}>
                <Text style={styles.distLabel}>{row.label}</Text>
                <Text style={styles.distValue}>{row.value}</Text>
              </View>
              <View style={styles.distBar}>
                <View style={[styles.distBarFill, { width: `${row.pct}%` as `${number}%`, backgroundColor: row.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── FREE: Evening wind-down ── */}
        <View style={styles.winddownCard}>
          <Text style={styles.winddownTitle}>Evening Wind-down</Text>
          <Text style={styles.winddownDesc}>
            Your schedule is clear for the next 12 hours. Start tomorrow with your most important task.
          </Text>
        </View>

        {/* ── PREMIUM gate section ── */}
        {!pm.isPremium && (
          <InsightsBanner onUpgrade={() => navigation.navigate('Premium')} />
        )}

        {/* ── PREMIUM: Deep Analysis ── */}
        {pm.isPremium ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Deep Analysis</Text>
              <PremiumBadge size="sm" />
            </View>
            <View style={styles.reflectionCard}>
              <View style={styles.reflectionHeader}>
                <MaterialCommunityIcons name="chart-areaspline" size={16} color={PREMIUM_COLOR} />
                <Text style={[styles.reflectionBadge, { color: PREMIUM_COLOR }]}>AI REFLECTION</Text>
              </View>
              <Text style={styles.reflectionText}>
                "Your peak focus was between 10 AM and 1 PM. By prioritizing your most complex task
                early, you cleared the path for a smooth afternoon."
              </Text>
            </View>
          </View>
        ) : (
          <LockedSection
            icon="chart-areaspline"
            title="Deep Productivity Analysis"
            description="Understand your focus patterns, peak hours, and resistance trends over time."
            onUnlock={() => navigation.navigate('Premium')}
          />
        )}

        {/* ── PREMIUM: Weekly Reflections ── */}
        {pm.isPremium ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Weekly Reflections</Text>
              <PremiumBadge size="sm" />
            </View>
            <View style={styles.weeklyCard}>
              <MaterialCommunityIcons name="text-box-check-outline" size={22} color={PREMIUM_COLOR} style={{ marginBottom: 6 }} />
              <Text style={styles.weeklyTitle}>Week 22 · May 26–Jun 1</Text>
              <Text style={styles.weeklyBody}>
                This week you completed 74% of your planned tasks. Your strongest day was Wednesday.
                Consider moving gym earlier — your energy consistently dips post-lunch.
              </Text>
            </View>
          </View>
        ) : (
          <LockedSection
            icon="text-box-check-outline"
            title="Weekly AI Reflections"
            description="A personalised coach-written summary of your week, every Sunday."
            onUnlock={() => navigation.navigate('Premium')}
          />
        )}

        {/* ── PREMIUM: Schedule Analytics ── */}
        {pm.isPremium ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Schedule Analytics</Text>
              <PremiumBadge size="sm" />
            </View>
            <View style={styles.analyticsRow}>
              {[
                { icon: 'fire' as IconName,        label: 'Day Streak',    val: '7' },
                { icon: 'trophy-outline' as IconName, label: 'Best Score', val: '91' },
                { icon: 'percent' as IconName,     label: 'Completion',    val: '78%' },
              ].map((item) => (
                <View key={item.label} style={styles.analyticsCard}>
                  <MaterialCommunityIcons name={item.icon} size={18} color={PREMIUM_COLOR} />
                  <Text style={styles.analyticsVal}>{item.val}</Text>
                  <Text style={styles.analyticsLbl}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <LockedSection
            icon="poll"
            title="Advanced Schedule Analytics"
            description="Track streaks, completion rates, and momentum scores over weeks."
            onUnlock={() => navigation.navigate('Premium')}
          />
        )}

        {/* CTA */}
        <TouchableOpacity style={styles.completeCta} activeOpacity={0.88} onPress={handleComplete}>
          <Text style={styles.completeCtaLabel}>Complete Daily Review</Text>
        </TouchableOpacity>
      </ScrollView>

      <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
        <Text style={styles.toastText}>Daily review saved.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
    paddingBottom: 100,
    gap: 14,
  },
  heroBlock: {
    marginBottom: 2,
    borderRadius: Radius.xl,
    padding: 18,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '28',
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary + '10',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -70,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.primaryFixed + '40',
  },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  heroKicker: {
    ...Typography.labelSm,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 10,
  },
  heroTitle: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroSubtitle: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, maxWidth: 340, lineHeight: 24 },

  // Score card
  scoreCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 20, overflow: 'hidden',
    ...Shadow.card,
  },
  scoreHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  scoreBadge:   { backgroundColor: Colors.primaryFixed, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start', marginBottom: 6 },
  scoreBadgeText: { ...Typography.labelXs, color: Colors.primary },
  scoreLabelTitle:{ ...Typography.headlineSm, color: Colors.onSurface },
  scoreRight:   { alignItems: 'flex-end' },
  scoreNumber:  { fontFamily: 'Manrope_700Bold', fontSize: 52, lineHeight: 60, color: Colors.primary },
  scoreDelta:   { ...Typography.labelSm, color: Colors.secondary, fontSize: 11 },
  scoreBar:     { height: 10, backgroundColor: Colors.surfaceVariant, borderRadius: 5, marginBottom: Spacing.md, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5 },
  scoreGrid:    { flexDirection: 'row', gap: 10 },
  scoreMetric:  { flex: 1, backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md, padding: 12, gap: 4 },
  scoreMetricLabel: { ...Typography.labelXs, color: Colors.secondary, fontSize: 10 },
  scoreMetricValue: { ...Typography.headlineSm, color: Colors.onSurface, fontSize: 22 },
  scoreAura:    { position: 'absolute', right: -70, bottom: -70, width: 190, height: 190, borderRadius: 95, backgroundColor: Colors.primary + '08' },

  // Distribution
  distCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, padding: 20, ...Shadow.card },
  distTitle:   { ...Typography.labelSm, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
  distRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  distLabel:   { ...Typography.bodyMd, color: Colors.onSurface },
  distValue:   { ...Typography.labelSm, color: Colors.onSurface, fontFamily: 'Manrope_700Bold' },
  distBar:     { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 2 },

  // Wind-down
  winddownCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, padding: 20, ...Shadow.card },
  winddownTitle:{ ...Typography.headlineSm, color: Colors.onSurface, marginBottom: 8 },
  winddownDesc: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22 },

  // Premium sections
  premiumSection:       { gap: 8 },
  premiumSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 },
  sectionTitle:         { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onSurface },

  reflectionCard: { backgroundColor: PREMIUM_COLOR + '0e', borderRadius: Radius.xl, padding: 18, borderWidth: 1, borderColor: PREMIUM_COLOR + '25' },
  reflectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reflectionBadge:  { ...Typography.labelSm, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Manrope_700Bold' },
  reflectionText:   { ...Typography.bodyLg, color: Colors.onSurface, fontStyle: 'italic', lineHeight: 26 },

  weeklyCard: { backgroundColor: PREMIUM_COLOR + '0a', borderRadius: Radius.xl, padding: 18, borderWidth: 1, borderColor: PREMIUM_COLOR + '20' },
  weeklyTitle:{ fontFamily: 'Manrope_700Bold', fontSize: 14, color: PREMIUM_COLOR, marginBottom: 6 },
  weeklyBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurface, lineHeight: 20 },

  analyticsRow:{ flexDirection: 'row', gap: 8 },
  analyticsCard: { flex: 1, backgroundColor: PREMIUM_COLOR + '0c', borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: PREMIUM_COLOR + '20' },
  analyticsVal:  { fontFamily: 'Manrope_800ExtraBold', fontSize: 22, color: PREMIUM_COLOR, letterSpacing: -0.5 },
  analyticsLbl:  { fontFamily: 'Manrope_400Regular', fontSize: 10, color: Colors.onSurfaceVariant, textAlign: 'center' },

  completeCta: {
    backgroundColor: Colors.primary, paddingVertical: 18,
    borderRadius: Radius.xl, alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 18, elevation: 7,
  },
  completeCtaLabel: { ...Typography.headlineSm, color: Colors.onPrimary, fontFamily: 'Manrope_700Bold' },

  toast: {
    position: 'absolute',
    left: Spacing.gutter,
    right: Spacing.gutter,
    bottom: 92,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  toastText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12.5, color: Colors.onSurface },
});
