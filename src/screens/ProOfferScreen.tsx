import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Spacing, Radius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { trackFunnelEvent } from '../analytics/funnelTracker';
import { PREMIUM_FEATURES, PREMIUM_COLOR, usePremium } from '../monetization';

type Props = NativeStackScreenProps<RootStackParamList, 'ProOffer'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width } = Dimensions.get('window');

const HIGHLIGHT_FEATURES = PREMIUM_FEATURES.slice(0, 4);

const FREE_HIGHLIGHTS = [
  '3 regenerations per day',
  'Up to 3 constraints',
  'Basic coaching',
];

const PRO_HIGHLIGHTS = [
  'Unlimited regenerations',
  'Unlimited constraints',
  'Behavioral coaching & insights',
  'Streak & momentum analytics',
];

function ProOfferHero() {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ring = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1, duration: 2800, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    ring(r1, 0);
    ring(r2, 900);
    ring(r3, 1800);
  }, []);

  const ringStyle = (a: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR,
    opacity: a.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.4, 0] }),
    transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.85] }) }],
  });

  return (
    <View style={heroStyles.wrap}>
      <Animated.View style={ringStyle(r1, 128)} />
      <Animated.View style={ringStyle(r2, 128)} />
      <Animated.View style={ringStyle(r3, 128)} />
      <View style={heroStyles.iconOuter}>
        <View style={heroStyles.iconInner}>
          <MaterialCommunityIcons name="star-four-points" size={32} color="#fff" />
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuter: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: PREMIUM_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function ProOfferScreen({ navigation, route }: Props) {
  const { setHasSeenProOffer, clearDemoPlanAndTasks } = useAppStore();
  const pm = usePremium();
  const insets = useSafeAreaInsets();
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  const fromDemoHandoff = route.params?.fromDemoHandoff ?? false;
  const isGateScreen = fromOnboarding || fromDemoHandoff;

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const trialGlow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 620, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 520, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(trialGlow, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(trialGlow, { toValue: 0.35, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    ).start();
  }, []);

  const finishDemoHandoff = () => {
    clearDemoPlanAndTasks();
    trackFunnelEvent('demo_handoff_cleared');
    navigation.replace('MainTabs', { screen: 'Focus' });
  };

  const goNext = () => {
    if (fromDemoHandoff) {
      finishDemoHandoff();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('MainTabs', { screen: 'Focus' });
  };

  const handleViewPlans = () => {
    navigation.navigate('Premium');
  };

  const handleContinueFree = () => {
    setHasSeenProOffer(true);
    goNext();
  };

  useFocusEffect(
    useCallback(() => {
      if (pm.isPremium) {
        setHasSeenProOffer(true);
        goNext();
      }
    }, [pm.isPremium, fromDemoHandoff]),
  );

  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start();
  const pressOut = () =>
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.02, useNativeDriver: true, tension: 400, friction: 6 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.blob1} pointerEvents="none" />
      <View style={styles.blob2} pointerEvents="none" />
      <View style={styles.blob3} pointerEvents="none" />

      {!isGateScreen ? (
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <ProOfferHero />
            <View style={styles.heroCopy}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeStar}>★</Text>
                <Text style={styles.proBadgeLabel}>MOMENTUM PRO</Text>
              </View>
              <Text style={styles.heroTitle}>
                Plans you'll{'\n'}
                <Text style={styles.heroTitleAccent}>actually follow.</Text>
              </Text>
              <Text style={styles.heroSub}>
                {fromDemoHandoff
                  ? 'You are signed in. Upgrade for unlimited planning, coaching, and insights — or keep using the free plan.'
                  : 'Unlock unlimited planning, coaching, and insights with Momentum Pro.'}
              </Text>
            </View>
          </View>

          {/* Trial card */}
          <Animated.View style={[styles.trialCard, { opacity: trialGlow.interpolate({ inputRange: [0.35, 1], outputRange: [0.92, 1] }) }]}>
            <View style={styles.trialCardTop}>
              <View style={styles.trialIconWrap}>
                <MaterialCommunityIcons name="gift-outline" size={18} color={PREMIUM_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trialCardTitle}>Pro free trial</Text>
                <Text style={styles.trialCardSub}>Available on eligible plans via App Store</Text>
              </View>
              <View style={styles.trialPill}>
                <Text style={styles.trialPillText}>FREE</Text>
              </View>
            </View>
            <View style={styles.trialDivider} />
            <Text style={styles.trialCardNote}>
              Subscription terms, pricing, and trial eligibility are shown before you confirm in the App Store.
            </Text>
          </Animated.View>

          {/* Pro features */}
          <Text style={styles.sectionLabel}>What you unlock</Text>
          <View style={styles.featureList}>
            {HIGHLIGHT_FEATURES.map((feat) => (
              <View key={feat.id} style={styles.featureCard}>
                <View style={styles.featIconWrap}>
                  <MaterialCommunityIcons name={feat.icon as IconName} size={18} color={PREMIUM_COLOR} />
                </View>
                <View style={styles.featText}>
                  <Text style={styles.featName}>{feat.name}</Text>
                  <Text style={styles.featDesc}>{feat.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Free vs Pro */}
          <Text style={styles.sectionLabel}>Free vs Pro</Text>
          <View style={styles.compareStrip}>
            <View style={styles.compareCol}>
              <Text style={styles.compareColLabel}>Free</Text>
              {FREE_HIGHLIGHTS.map((line) => (
                <View key={line} style={styles.compareRow}>
                  <MaterialCommunityIcons name="minus-circle-outline" size={14} color={Colors.outline} />
                  <Text style={styles.compareText}>{line}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.compareCol, styles.compareColPro]}>
              <View style={styles.compareProLabelRow}>
                <MaterialCommunityIcons name="star-four-points" size={12} color={PREMIUM_COLOR} />
                <Text style={[styles.compareColLabel, { color: PREMIUM_COLOR }]}>Pro</Text>
              </View>
              {PRO_HIGHLIGHTS.map((line) => (
                <View key={line} style={styles.compareRow}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={PREMIUM_COLOR} />
                  <Text style={[styles.compareText, styles.compareTextPro]}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.ctaBlock, { opacity: fade }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.ctaBtn}
              activeOpacity={0.88}
              onPress={handleViewPlans}
              onPressIn={pressIn}
              onPressOut={pressOut}
            >
              <View style={styles.ctaBtnShine} pointerEvents="none" />
              <Text style={styles.ctaBtnLabel}>See Pro plans</Text>
              <View style={styles.ctaBtnArrow}>
                <MaterialCommunityIcons name="arrow-right" size={16} color={PREMIUM_COLOR} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.ctaNote}>Subscriptions managed by Apple/Google. Restore purchases in Settings.</Text>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleContinueFree}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryLabel}>Continue with free version</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blob1: {
    position: 'absolute',
    top: -100,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: PREMIUM_COLOR + '12',
  },
  blob2: {
    position: 'absolute',
    top: '28%',
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: PREMIUM_COLOR + '08',
  },
  blob3: {
    position: 'absolute',
    bottom: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary + '06',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.gutter,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '40',
  },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: 52,
    gap: 22,
  },

  heroSection: { alignItems: 'center', gap: 20, marginBottom: 4 },
  heroCopy: { alignItems: 'center', gap: 10 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PREMIUM_COLOR,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  proBadgeStar: { fontSize: 10, color: '#fff' },
  proBadgeLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  heroTitleAccent: { color: PREMIUM_COLOR },
  heroSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },

  trialCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: PREMIUM_COLOR + '28',
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  trialCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trialIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PREMIUM_COLOR + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialCardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  trialCardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  trialPill: {
    backgroundColor: PREMIUM_COLOR + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR + '35',
  },
  trialPillText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: PREMIUM_COLOR,
    letterSpacing: 0.8,
  },
  trialDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PREMIUM_COLOR + '20',
  },
  trialCardNote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },

  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featureList: { gap: 8 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR + '12',
  },
  featIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PREMIUM_COLOR + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featText: { flex: 1, gap: 3 },
  featName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onSurface,
    letterSpacing: -0.1,
  },
  featDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },

  compareStrip: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '35',
    backgroundColor: Colors.surfaceContainerLow,
  },
  compareCol: { flex: 1, padding: 16, gap: 10 },
  compareColPro: {
    backgroundColor: PREMIUM_COLOR + '0c',
    borderLeftWidth: 1,
    borderLeftColor: PREMIUM_COLOR + '22',
  },
  compareColLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: Colors.onSurface,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  compareProLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  compareRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  compareText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
  },
  compareTextPro: { color: Colors.onSurface, fontFamily: 'Manrope_600SemiBold' },

  ctaBlock: { gap: 12, alignItems: 'center', marginTop: 6 },
  ctaBtn: {
    width: width - Spacing.gutter * 2,
    backgroundColor: PREMIUM_COLOR,
    paddingVertical: 18,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  ctaBtnShine: {
    position: 'absolute',
    top: -20,
    left: 24,
    width: 100,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '22deg' }],
  },
  ctaBtnLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.15,
  },
  ctaBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaNote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: Colors.outline,
    textAlign: 'center',
  },
  secondaryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
});
