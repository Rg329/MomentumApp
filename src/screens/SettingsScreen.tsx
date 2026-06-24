import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { PremiumBadge } from '../components/PremiumBadge';
import { useAppStore } from '../store/useAppStore';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import { usePersonalization } from '../personalization';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function titleCase(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function prettyPeakTime(v: string | null | undefined) {
  if (!v) return '—';
  if (v === 'morning' || v === 'afternoon' || v === 'evening') return titleCase(v);
  return v;
}

function prettyCoachStyle(v: string | null | undefined) {
  if (!v) return '—';
  if (v === 'supportive') return 'Supportive';
  if (v === 'balanced') return 'Balanced';
  if (v === 'strict') return 'Strict';
  return v;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SettingItem {
  label:    string;
  value?:   string;
  icon:     IconName;
  premium?: boolean;
  onPress?: () => void;
}
interface SettingSection { title: string; items: SettingItem[] }

// ─── Premium Plan Card ────────────────────────────────────────────────────────
function PremiumCard({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade: () => void }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmer  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(shimmer, { toValue: 0, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });

  if (isPremium) {
    return (
      <View style={[cardStyles.card, { borderColor: PREMIUM_COLOR + '50' }]}>
        <Animated.View style={[cardStyles.glow, { opacity: glowOpacity }]} />
        <View style={cardStyles.row}>
          <View style={[cardStyles.iconWrap, { backgroundColor: PREMIUM_COLOR + '18' }]}>
            <Text style={{ fontSize: 22 }}>★</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={cardStyles.activeBadge}>
              <Text style={cardStyles.activeBadgeText}>PREMIUM ACTIVE</Text>
            </View>
            <Text style={cardStyles.activeTitle}>Momentum Premium</Text>
            <Text style={cardStyles.activeSub}>All features unlocked · Unlimited generations</Text>
          </View>
        </View>
        <View style={[cardStyles.divider, { backgroundColor: PREMIUM_COLOR + '25' }]} />
        <View style={cardStyles.statsRow}>
          {[['∞', 'Regenerations'], ['AI', 'Coaching'], ['7', 'Features']].map(([val, lbl]) => (
            <View key={lbl} style={cardStyles.statItem}>
              <Text style={[cardStyles.statVal, { color: PREMIUM_COLOR }]}>{val}</Text>
              <Text style={cardStyles.statLbl}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={[cardStyles.card, cardStyles.upgradeCard]} onPress={onUpgrade} activeOpacity={0.88}>
      <Animated.View style={[cardStyles.glow, { opacity: glowOpacity }]} />
      <View style={cardStyles.row}>
        <View style={[cardStyles.iconWrap, { backgroundColor: PREMIUM_COLOR + '18' }]}>
          <Text style={{ fontSize: 22 }}>★</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={cardStyles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={cardStyles.upgradeSub}>Unlock unlimited regenerations, AI coaching & deep insights.</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={PREMIUM_COLOR} />
      </View>
      <View style={cardStyles.upgradeFeatures}>
        {['Unlimited generations', 'Adaptive coaching', 'Deep insights'].map((f) => (
          <View key={f} style={cardStyles.upgradeFeatureRow}>
            <MaterialCommunityIcons name="check-circle" size={12} color={PREMIUM_COLOR} />
            <Text style={cardStyles.upgradeFeatureText}>{f}</Text>
          </View>
        ))}
      </View>
      <View style={cardStyles.trialPill}>
        <Text style={cardStyles.trialText}>7-day free trial · from $4.99/mo</Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: PREMIUM_COLOR + '30',
    overflow: 'hidden',
    shadowColor: PREMIUM_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
  },
  upgradeCard: { borderColor: PREMIUM_COLOR + '45' },
  glow: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: PREMIUM_COLOR },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statVal:  { fontFamily: 'Manrope_800ExtraBold', fontSize: 18, letterSpacing: -0.5 },
  statLbl:  { fontFamily: 'Manrope_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  activeBadge: { backgroundColor: PREMIUM_COLOR, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 2 },
  activeBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#fff', letterSpacing: 0.8 },
  activeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  activeSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },
  upgradeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  upgradeSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 17 },
  upgradeFeatures: { gap: 5 },
  upgradeFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  upgradeFeatureText: { fontFamily: 'Manrope_500Medium', fontSize: 12, color: PREMIUM_COLOR },
  trialPill: { backgroundColor: PREMIUM_COLOR + '12', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  trialText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: PREMIUM_COLOR },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPremium } = useAppStore();
  const pm = usePremium();
  const p  = usePersonalization();

  const coachStyleLabel = prettyCoachStyle(p.profile.coachStyle);
  const peakTimeLabel   = prettyPeakTime(p.profile.peakTime);

  const SECTIONS: SettingSection[] = [
    {
      title: 'Preferences',
      items: [
        { label: 'Coaching Style',    value: coachStyleLabel, icon: 'scale-balance' },
        { label: 'Peak Productivity', value: peakTimeLabel,   icon: 'weather-sunset-up' },
        { label: 'Notification Style',value: coachStyleLabel, icon: 'bell-ring-outline' },
        { label: 'Adaptive Coaching', value: 'AI-driven',                         icon: 'brain', premium: true },
      ],
    },
    {
      title: 'Schedule',
      items: [
        { label: 'Default Focus Duration', value: '25 min', icon: 'timer-outline' },
        { label: 'Break Duration',         value: '5 min',  icon: 'coffee-outline' },
        { label: 'Daily Start Time',       value: '8:00 AM',icon: 'weather-sunset-up' },
        { label: 'Advanced Optimization',  value: 'Smart',  icon: 'lightning-bolt', premium: true },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Weekly Reflections', value: 'Sunday', icon: 'text-box-check-outline', premium: true },
        { label: 'Schedule Analytics', value: 'Advanced', icon: 'poll', premium: true },
        { label: 'Data & Privacy',     value: '',        icon: 'shield-lock-outline' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile',       value: 'You',  icon: 'account-circle-outline' },
        { label: 'Subscription',  value: isPremium ? 'Premium' : 'Free', icon: 'star-circle-outline',
          onPress: () => navigation.navigate('Premium') },
        { label: 'App Version',   value: '1.0.0', icon: 'information-outline' },
      ],
    },
  ];

  const handlePremiumRow = () => { if (!isPremium) navigation.navigate('Premium'); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.heroBlock}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
          <View style={styles.heroKickerRow}>
            <MaterialCommunityIcons name="tune-variant" size={14} color={Colors.primary} />
            <Text style={styles.heroKicker}>Personalize Momentum</Text>
          </View>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>
            Your coaching style and focus patterns shape how Momentum helps you start.
          </Text>
        </View>

        {/* Premium card */}
        <PremiumCard isPremium={isPremium} onUpgrade={() => navigation.navigate('Premium')} />

        {/* Setting sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => {
                const isLocked = item.premium && !isPremium;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.settingRow,
                      idx < section.items.length - 1 && styles.settingRowBorder,
                      isLocked && styles.settingRowLocked,
                    ]}
                    activeOpacity={0.7}
                    onPress={item.onPress ?? (isLocked ? handlePremiumRow : undefined)}
                  >
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIconWrap, isLocked && { backgroundColor: PREMIUM_COLOR + '12' }]}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={18}
                          color={isLocked ? PREMIUM_COLOR : Colors.onSurfaceVariant}
                        />
                      </View>
                      <View style={{ gap: 1 }}>
                        <Text style={[styles.settingLabel, isLocked && { color: Colors.onSurfaceVariant }]}>
                          {item.label}
                        </Text>
                        {isLocked && (
                          <Text style={styles.lockedNote}>Requires Premium</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.settingRight}>
                      {isLocked ? (
                        <PremiumBadge size="sm" />
                      ) : item.value ? (
                        <Text style={[styles.settingValue, item.label === 'Subscription' && isPremium && { color: PREMIUM_COLOR }]}>
                          {item.value}
                        </Text>
                      ) : null}
                      {!isLocked && (
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.outlineVariant} />
                      )}
                      {isLocked && (
                        <MaterialCommunityIcons name="lock-outline" size={15} color={PREMIUM_COLOR + 'aa'} style={{ marginLeft: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Generation counter for free users */}
        {!isPremium && (
          <View style={styles.genCounter}>
            <MaterialCommunityIcons name="refresh" size={14} color={Colors.outline} />
            <Text style={styles.genCounterText}>
              {pm.generationsLabel
                ? `Schedule regenerations: ${pm.generationsLabel}`
                : '3 free schedule regenerations per day'}
            </Text>
          </View>
        )}

        <Text style={styles.versionText}>Momentum v1.0.0 · Calculated Calm</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
    paddingBottom: 100,
    gap: 20,
  },
  heroBlock: {
    marginBottom: 4,
    borderRadius: Radius.xl,
    padding: 18,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '28',
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute',
    top: -70,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.primary + '10',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -80,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
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
  heroTitle:    { ...Typography.displayLg, color: Colors.onSurface, fontSize: 28, lineHeight: 36, marginBottom: 6 },
  heroSubtitle: { ...Typography.bodyLg, color: Colors.onSurfaceVariant },
  section:      { gap: 10 },
  sectionTitle: {
    ...Typography.labelSm,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 15,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant + '30',
  },
  settingRowLocked: { backgroundColor: PREMIUM_COLOR + '05' },
  settingLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel:  { ...Typography.bodyMd, color: Colors.onSurface, fontFamily: 'Manrope_600SemiBold' },
  lockedNote:    { fontFamily: 'Manrope_400Regular', fontSize: 11, color: PREMIUM_COLOR + 'bb' },
  settingRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue:  { ...Typography.bodyMd, color: Colors.secondary },
  genCounter: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10,
  },
  genCounterText: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline },
  versionText: {
    ...Typography.labelXs,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
});
