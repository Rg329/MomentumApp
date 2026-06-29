import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { PremiumBadge } from '../components/PremiumBadge';
import { CoachingCard, PremiumCoachingCard } from '../components/CoachingCard';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import { useAppStore } from '../store/useAppStore';
import { useBehavioralCoach, generateCoachingMessage } from '../coaching';
import { LinearGradient } from 'expo-linear-gradient';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ─── Locked premium section ────────────────────────────────────────────────────
function LockedSection({
  icon, title, description, preview, onUnlock,
}: { icon: IconName; title: string; description: string; preview?: string; onUnlock: () => void }) {
  if (preview) {
    const truncated = preview.length > 100 ? `${preview.slice(0, 100)}...` : preview;
    return (
      <TouchableOpacity style={lockedStyles.card} onPress={onUnlock} activeOpacity={0.88}>
        <View style={lockedStyles.proCorner}>
          <PremiumBadge size="sm" />
        </View>
        <View style={lockedStyles.previewWrap}>
          <Text style={lockedStyles.previewText}>{truncated}</Text>
          <LinearGradient
            colors={['transparent', Colors.surfaceContainerLowest]}
            style={lockedStyles.previewFade}
            pointerEvents="none"
          />
        </View>
        <Text style={lockedStyles.previewUnlock}>Unlock full analysis →</Text>
      </TouchableOpacity>
    );
  }

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
  previewWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, overflow: 'hidden' },
  previewText: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 20 },
  previewFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 },
  previewUnlock: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: PREMIUM_COLOR, paddingHorizontal: 16, paddingBottom: 14 },
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
  const coach = useBehavioralCoach('daily_summary');

  const deepAnalysisPreview: string | undefined =
    coach.context && !pm.canUse('deep_insights')
      ? generateCoachingMessage('deep_analysis', coach.context, undefined, false).observation
      : undefined;

  const weeklyReportPreview: string | undefined =
    coach.context && !pm.canUse('weekly_reflections')
      ? generateCoachingMessage('weekly_report', coach.context, undefined, false).observation
      : undefined;

  const deepAnalysis = coach.context && pm.canUse('deep_insights')
    ? generateCoachingMessage('deep_analysis', coach.context, undefined, true)
    : null;
  const patternAnalysis = coach.context && pm.canUse('adaptive_coaching')
    ? generateCoachingMessage('pattern_analysis', coach.context, undefined, true)
    : null;

  const targetScore = coach.analytics?.momentumScore ?? 0;
  const [score, setScore] = useState(0);
  const scoreBarAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (coach.loading) return;

    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.timing(scoreBarAnim, {
      toValue: targetScore / 100, duration: 1500, useNativeDriver: false,
    }).start();
    let current = 0;
    const step = Math.max(1, Math.ceil(targetScore / 60));
    const interval = setInterval(() => {
      current = Math.min(current + step, targetScore);
      setScore(current);
      if (current >= targetScore) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [coach.loading, targetScore]);

  const scoreBarWidth = scoreBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handleComplete = () => {
    completeDailyReview();

    const today = new Date().toISOString().split('T')[0];
    const { account, lastAuthPromptDate, setLastAuthPromptDate } = useAppStore.getState();
    const alreadySignedIn = Boolean(account.email);
    const alreadyPrompted = lastAuthPromptDate === today;

    const navigateAfterReview = () => {
      if (!alreadySignedIn && !alreadyPrompted) {
        setLastAuthPromptDate(today);
        Alert.alert(
          'Save your insights',
          'Sign in to back up your progress and access it on any device.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => navigation.navigate('Schedule' as any) },
            { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
          ],
        );
      } else {
        navigation.navigate('Schedule' as any);
      }
    };

    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(navigateAfterReview);
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
          <Text style={styles.heroTitle}>Your coach</Text>
          <Text style={styles.heroSubtitle}>
            Straight talk based on what you actually do — not a personality quiz.
          </Text>
        </Animated.View>

        {/* ── FREE: Behavioral coaching (O-P-A) ── */}
        <CoachingCard coaching={coach.coaching} loading={coach.loading} />

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
              {coach.analytics?.scoreDelta != null && (
                <Text style={styles.scoreDelta}>
                  {coach.analytics.scoreDelta > 0 ? '+' : ''}{coach.analytics.scoreDelta}% from yesterday
                </Text>
              )}
            </View>
          </View>

          <View style={styles.scoreBar}>
            <Animated.View style={[styles.scoreBarFill, { width: scoreBarWidth }]} />
          </View>

          <View style={styles.scoreGrid}>
            <View style={styles.scoreMetric}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
              <Text style={styles.scoreMetricLabel}>Tasks Completed</Text>
              <Text style={styles.scoreMetricValue}>{coach.analytics?.tasksCompleted ?? 0}</Text>
            </View>
            <View style={styles.scoreMetric}>
              <MaterialCommunityIcons name="clock-fast" size={18} color={Colors.secondary} />
              <Text style={styles.scoreMetricLabel}>Skipped</Text>
              <Text style={styles.scoreMetricValue}>{coach.analytics?.tasksSkipped ?? 0}</Text>
            </View>
            <View style={styles.scoreMetric}>
              <MaterialCommunityIcons name="fire" size={18} color={Colors.tertiary} />
              <Text style={styles.scoreMetricLabel}>Day Streak</Text>
              <Text style={styles.scoreMetricValue}>{coach.analytics?.currentStreak ?? 0}</Text>
            </View>
          </View>
          <View style={styles.scoreAura} />
        </View>

        {/* ── FREE: Time Distribution ── */}
        <View style={styles.distCard}>
          <Text style={styles.distTitle}>TIME DISTRIBUTION</Text>
          {(coach.analytics?.timeDistribution ?? []).map((row) => (
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

        {/* ── FREE: Tomorrow note (pattern — not a repeat of the action above) ── */}
        <View style={styles.winddownCard}>
          <Text style={styles.winddownTitle}>What I'm noticing</Text>
          <Text style={styles.winddownDesc}>
            {coach.coaching?.pattern
              || coach.coaching?.observation
              || "Complete a few focus sessions and I'll start spotting your patterns."}
          </Text>
        </View>

        {/* ── PREMIUM gate section ── */}
        {!pm.isPremium && (
          <InsightsBanner onUpgrade={() => navigation.navigate('Premium')} />
        )}

        {/* ── PREMIUM: Deep Analysis ── */}
        {pm.canUse('deep_insights') ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Deep Procrastination Analysis</Text>
              <PremiumBadge size="sm" />
            </View>
            <PremiumCoachingCard coaching={deepAnalysis} loading={coach.loading} />
          </View>
        ) : (
          <LockedSection
            icon="chart-areaspline"
            title="Deep Procrastination Analysis"
            description="Multi-pattern analysis with evidence from your task event history."
            preview={deepAnalysisPreview}
            onUnlock={() => navigation.navigate('Premium')}
          />
        )}

        {/* ── PREMIUM: Weekly Coaching Report ── */}
        {pm.canUse('weekly_reflections') ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Weekly Coaching Report</Text>
              <PremiumBadge size="sm" />
            </View>
            <View style={styles.weeklyCard}>
              <MaterialCommunityIcons name="text-box-check-outline" size={22} color={PREMIUM_COLOR} style={{ marginBottom: 6 }} />
              <Text style={styles.weeklyTitle}>{coach.weeklyReport?.weekLabel ?? 'Last 7 days'}</Text>
              <PremiumCoachingCard
                coaching={coach.context && pm.canUse('weekly_reflections')
                  ? generateCoachingMessage('weekly_report', coach.context, undefined, true)
                  : null}
                loading={coach.loading}
              />
            </View>
          </View>
        ) : (
          <LockedSection
            icon="text-box-check-outline"
            title="Weekly Coaching Reports"
            description="Observation → pattern → action report from your 7-day trends."
            preview={weeklyReportPreview}
            onUnlock={() => navigation.navigate('Premium')}
          />
        )}

        {/* ── PREMIUM: Pattern analysis + analytics ── */}
        {pm.canUse('advanced_analytics') ? (
          <View style={styles.premiumSection}>
            <View style={styles.premiumSectionHeader}>
              <Text style={styles.sectionTitle}>Behavioral Trends</Text>
              <PremiumBadge size="sm" />
            </View>
            {patternAnalysis && (
              <PremiumCoachingCard coaching={patternAnalysis} loading={coach.loading} compact />
            )}
            <View style={styles.analyticsRow}>
              {[
                { icon: 'trophy-outline' as IconName, label: 'Best Streak', val: String(coach.analytics?.bestStreak ?? 0) },
                { icon: 'percent' as IconName, label: 'Completion', val: `${coach.analytics?.completionRatePct ?? 0}%` },
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
            title="Behavioral Trend Tracking"
            description="Streaks, completion rates, and pattern analysis from historical data."
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
