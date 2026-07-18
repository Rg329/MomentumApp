import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Easing, Dimensions,
  ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Spacing } from '../theme';
import {
  PREMIUM_FEATURES,
  PRICING,
  PREMIUM_COLOR,
  usePremium,
  purchasePlan,
  restorePurchases,
  getOfferingPrices,
  parsePurchaseError,
  type PlanId,
} from '../monetization';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../legal/config';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width } = Dimensions.get('window');

// ─── Shimmer ring ─────────────────────────────────────────────────────────────
function PremiumHero() {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ring = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(a, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])).start();
    ring(r1, 0); ring(r2, 860); ring(r3, 1720);
  }, []);

  const ring = (a: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 1, borderColor: PREMIUM_COLOR,
    opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.35, 0] }),
    transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.8] }) }],
  });

  return (
    <View style={heroStyles.wrap}>
      <Animated.View style={ring(r1, 120)} />
      <Animated.View style={ring(r2, 120)} />
      <Animated.View style={ring(r3, 120)} />
      <View style={heroStyles.iconCard}>
        <Text style={heroStyles.star}>★</Text>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap:     { alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  iconCard: { width: 76, height: 76, borderRadius: 22, backgroundColor: PREMIUM_COLOR, alignItems: 'center', justifyContent: 'center', shadowColor: PREMIUM_COLOR, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  star:     { fontSize: 38, color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function PremiumScreen({ navigation }: Props) {
  const insets   = useSafeAreaInsets();
  const pm = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [storePrices, setStorePrices] = useState<Partial<Record<PlanId, string>>>({});
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);

  // Entrance animations
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.quad)  }),
    ]).start();
  }, []);

  useEffect(() => {
    getOfferingPrices().then(setStorePrices).catch(() => {});
  }, []);

  const displayPrice = useCallback(
    (planId: PlanId, fallback: string) => storePrices[planId] ?? fallback,
    [storePrices],
  );

  const handleSubscribe = async () => {
    if (busy) return;
    setBusy('purchase');
    try {
      const success = await purchasePlan(selectedPlan);
      if (success) {
        navigation.goBack();
      }
    } catch (e: unknown) {
      const { userCancelled, message } = parsePurchaseError(e);
      if (!userCancelled && message) {
        Alert.alert('Purchase failed', message);
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored', 'Your subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No subscription found', 'We could not find an active subscription for this account.');
      }
    } catch (e: unknown) {
      const { userCancelled, message } = parsePurchaseError(e);
      if (!userCancelled) {
        Alert.alert('Restore failed', message || 'Could not restore purchases.');
      }
    } finally {
      setBusy(null);
    }
  };

  const openLegal = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  };

  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start();
  const pressOut = () => Animated.sequence([
    Animated.spring(btnScale, { toValue: 1.02, useNativeDriver: true, tension: 400, friction: 6 }),
    Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
  ]).start();

  const activePricing = PRICING.find((p) => p.id === selectedPlan)!;
  const activePrice = displayPrice(selectedPlan, activePricing.price);
  const isSubscriptionPlan = selectedPlan === 'monthly' || selectedPlan === 'annual';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button */}
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="close" size={18} color={Colors.onSurface} />
      </TouchableOpacity>

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View style={[styles.heroSection, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <PremiumHero />

          <View style={styles.heroCopy}>
            <View style={styles.proBadge}>
              <Text style={styles.proStar}>★</Text>
              <Text style={styles.proLabel}>MOMENTUM PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>The most productive{'\n'}version of you.</Text>
            <Text style={styles.heroSub}>
              Everything in free, plus AI-powered optimization,{'\n'}adaptive coaching, and deep insights.
            </Text>
          </View>
        </Animated.View>

        {/* ── Feature list ── */}
        <View style={styles.featureSection}>
          <Text style={styles.sectionLabel}>What you unlock</Text>
          {PREMIUM_FEATURES.map((feat, i) => (
            <Animated.View
              key={feat.id}
              style={[
                styles.featureCard,
                { opacity: fade, transform: [{ translateY: slide }] },
              ]}
            >
              <View style={[styles.featIconWrap, { backgroundColor: PREMIUM_COLOR + '15' }]}>
                <MaterialCommunityIcons name={feat.icon as IconName} size={17} color={PREMIUM_COLOR} />
              </View>
              <View style={styles.featText}>
                <Text style={styles.featName}>{feat.name}</Text>
                <Text style={styles.featDesc}>{feat.description}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={18} color={PREMIUM_COLOR} />
            </Animated.View>
          ))}
        </View>

        {/* ── Pricing plans ── */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionLabel}>Choose your plan</Text>
          <View style={styles.planRow}>
            {PRICING.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
                onPress={() => setSelectedPlan(plan.id as 'monthly' | 'annual' | 'lifetime')}
                activeOpacity={0.8}
              >
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>{plan.label}</Text>
                <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>
                  {displayPrice(plan.id as PlanId, plan.price)}
                </Text>
                <Text style={[styles.planPeriod, selectedPlan === plan.id && styles.planPeriodActive]}>{plan.period}</Text>
                {plan.savings && <Text style={styles.planSavings}>{plan.savings}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={styles.ctaBlock}>
          {pm.isPremium ? (
            <View style={styles.activeCard}>
              <MaterialCommunityIcons name="check-circle" size={22} color={PREMIUM_COLOR} />
              <Text style={styles.activeText}>Momentum Pro is active</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.ctaBtn, busy === 'purchase' && styles.ctaBtnDisabled]}
                onPress={handleSubscribe}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={0.88}
                disabled={busy !== null}
              >
                <View style={styles.ctaBtnShine} />
                {busy === 'purchase' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.ctaBtnLabel}>Get {activePricing.label} — {activePrice}</Text>
                    <View style={styles.ctaBtnArrow}>
                      <MaterialCommunityIcons name="arrow-right" size={15} color={PREMIUM_COLOR} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          {isSubscriptionPlan ? (
            <Text style={styles.trialNote}>
              14-day free trial, then {activePrice}/{selectedPlan === 'monthly' ? 'month' : 'year'}. Auto-renews until cancelled.
            </Text>
          ) : (
            <Text style={styles.trialNote}>One-time purchase. No subscription.</Text>
          )}
          <Text style={styles.subscriptionLegal}>
            Payment is charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
            {isSubscriptionPlan
              ? ' Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.'
              : ''}
          </Text>
          <TouchableOpacity
            style={styles.restoreBtn}
            activeOpacity={0.7}
            onPress={handleRestore}
            disabled={busy !== null}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={Colors.outline} size="small" />
            ) : (
              <Text style={styles.restoreLbl}>Restore purchases</Text>
            )}
          </TouchableOpacity>
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => openLegal(PRIVACY_POLICY_URL)} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSep}>·</Text>
            <TouchableOpacity onPress={() => openLegal(TERMS_OF_SERVICE_URL)} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: {
    position: 'absolute', right: 20, zIndex: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  blob1: { position: 'absolute', top: -60, right: -80,  width: 260, height: 260, borderRadius: 130, backgroundColor: PREMIUM_COLOR + '0a' },
  blob2: { position: 'absolute', bottom: 80, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: PREMIUM_COLOR + '07' },

  scroll: { paddingHorizontal: Spacing.gutter, paddingTop: 60, gap: 28 },

  // Hero
  heroSection: { alignItems: 'center', gap: 18 },
  heroCopy:    { alignItems: 'center', gap: 10 },
  proBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PREMIUM_COLOR, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5 },
  proStar:     { fontSize: 10, color: '#fff' },
  proLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1.2 },
  heroTitle:   { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, lineHeight: 36, letterSpacing: -0.7, color: Colors.onSurface, textAlign: 'center' },
  heroSub:     { fontFamily: 'Manrope_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 21 },

  // Features
  featureSection: { gap: 8 },
  sectionLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 11, color: Colors.outline, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 2 },
  featureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: PREMIUM_COLOR + '15',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featIconWrap:{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  featText:    { flex: 1, gap: 2 },
  featName:    { fontFamily: 'Manrope_700Bold', fontSize: 13.5, color: Colors.onSurface },
  featDesc:    { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 17 },

  // Pricing
  pricingSection: { gap: 10 },
  planRow:      { flexDirection: 'row', gap: 8 },
  planCard: {
    flex: 1, borderRadius: Radius.lg, padding: 12, alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2, borderColor: 'transparent',
    position: 'relative',
  },
  planCardActive:  { borderColor: PREMIUM_COLOR, backgroundColor: PREMIUM_COLOR + '08' },
  planBadge:       { backgroundColor: PREMIUM_COLOR, borderRadius: 50, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  planBadgeText:   { fontFamily: 'Manrope_700Bold', fontSize: 8, color: '#fff', letterSpacing: 0.4 },
  planLabel:       { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.outline },
  planLabelActive: { color: PREMIUM_COLOR },
  planPrice:       { fontFamily: 'Manrope_800ExtraBold', fontSize: 17, color: Colors.onSurface, letterSpacing: -0.3 },
  planPriceActive: { color: PREMIUM_COLOR },
  planPeriod:      { fontFamily: 'Manrope_400Regular', fontSize: 10, color: Colors.outline },
  planPeriodActive:{ color: PREMIUM_COLOR + 'cc' },
  planSavings:     { fontFamily: 'Manrope_700Bold', fontSize: 9, color: PREMIUM_COLOR + 'cc', marginTop: 1 },

  // Compare strip
  compareStrip: {
    flexDirection: 'row', gap: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.outlineVariant + '30',
  },
  compareCol:        { flex: 1, padding: 14, gap: 8 },
  compareColPremium: { backgroundColor: PREMIUM_COLOR + '09' },
  compareColLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.onSurface },
  comparePremiumLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compareRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareText: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, flex: 1 },

  // Coming soon
  comingSoonCard: {
    backgroundColor: PREMIUM_COLOR + '0c',
    borderRadius: Radius.xl, borderWidth: 1,
    borderColor: PREMIUM_COLOR + '25',
    padding: 24, gap: 10, alignItems: 'center',
  },
  comingSoonIconRow: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PREMIUM_COLOR + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  comingSoonTitle: { fontFamily: 'Manrope_700Bold', fontSize: 17, color: Colors.onSurface, textAlign: 'center' },
  comingSoonSub:   { fontFamily: 'Manrope_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  comingSoonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PREMIUM_COLOR + '10', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  comingSoonBadgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: PREMIUM_COLOR },

  // CTA
  ctaBlock:   { gap: 10, alignItems: 'center' },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PREMIUM_COLOR + '12', borderRadius: Radius.xl, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: PREMIUM_COLOR + '30' },
  activeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: PREMIUM_COLOR },
  ctaBtn: {
    backgroundColor: PREMIUM_COLOR, width: width - Spacing.gutter * 2,
    paddingVertical: 17, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PREMIUM_COLOR, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 22, elevation: 10,
    overflow: 'hidden',
  },
  ctaBtnShine: { position: 'absolute', top: -18, left: 30, width: 90, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.10)', transform: [{ rotate: '25deg' }] },
  ctaBtnLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.1 },
  ctaBtnArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  trialNote:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline, textAlign: 'center' },
  subscriptionLegal: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  restoreBtn:  { paddingVertical: 4, minHeight: 24, justifyContent: 'center' },
  restoreLbl:  { fontFamily: 'Manrope_500Medium', fontSize: 12, color: Colors.outline, textDecorationLine: 'underline' },
  legalRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  legalLink:   { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.outline, textDecorationLine: 'underline' },
  legalSep:    { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.outline },
  ctaBtnDisabled: { opacity: 0.75 },
});
