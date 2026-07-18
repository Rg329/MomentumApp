import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { PremiumBadge } from '../components/PremiumBadge';
import { SettingPickerModal, PickerOption } from '../components/SettingPickerModal';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { useAppStore, Weekday, NotificationStyle } from '../store/useAppStore';
import { usePremium, PREMIUM_COLOR } from '../monetization';
import type { FeatureId } from '../monetization';
import { usePersonalization } from '../personalization';
import { syncOnboardingProfileToSupabase } from '../repositories/profileSync';
import { deleteAccountAndLocalData, navigationResetAfterDeletion } from '../repositories/accountDeletion';
import { openLegalUrl, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../legal/config';
import { minutesToDisplayTime, durationMinutesLabel } from '../utils/formatTime';
import { NOTIFICATIONS_ENABLED } from '../notifications/config';
import { ensureNotificationPermissionsIfEnabled } from '../notifications/safeEntry';

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

function prettyNotificationStyle(v: NotificationStyle) {
  if (v === 'gentle') return 'Gentle';
  if (v === 'minimal') return 'Minimal';
  return 'Standard';
}

function prettyWeekday(v: Weekday) {
  return titleCase(v);
}

type PickerKind =
  | 'coachStyle'
  | 'peakTime'
  | 'notificationStyle'
  | 'focusDuration'
  | 'breakDuration'
  | 'wakeTime'
  | 'weeklyDay'
  | null;

interface SettingItem {
  label: string;
  value?: string;
  icon: IconName;
  premium?: boolean;
  coachStylePremium?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
}

interface SettingSection { title: string; items: SettingItem[] }

// ─── Premium Plan Card ────────────────────────────────────────────────────────
function PremiumCard({ isPremium, onUpgrade }: { isPremium: boolean; onUpgrade: () => void }) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
  }, [glowAnim]);

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
          <Text style={cardStyles.upgradeSub}>Unlock coaching style, behavioral coach & deep insights.</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={PREMIUM_COLOR} />
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
  activeBadge: { backgroundColor: PREMIUM_COLOR, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 2 },
  activeBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#fff', letterSpacing: 0.8 },
  activeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  activeSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },
  upgradeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: Colors.onSurface },
  upgradeSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 17 },
});

function InfoModal({
  visible, title, body, onClose,
}: {
  visible: boolean; title: string; body: string; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={infoStyles.overlay}>
        <View style={infoStyles.card}>
          <Text style={infoStyles.title}>{title}</Text>
          <Text style={infoStyles.body}>{body}</Text>
          <TouchableOpacity style={infoStyles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={infoStyles.btnLabel}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const infoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.gutter,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 22,
    gap: 12,
    ...Shadow.card,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Manrope_700Bold' },
  body: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22 },
  btn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnLabel: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary },
});

const COACH_OPTIONS: PickerOption[] = [
  { value: 'supportive', label: 'Supportive', description: 'Encouraging and calm' },
  { value: 'balanced', label: 'Balanced', description: 'Direct but fair' },
  { value: 'strict', label: 'Strict', description: 'Accountability-focused' },
];

const PEAK_OPTIONS: PickerOption[] = [
  { value: 'morning', label: 'Morning', description: 'Best focus before noon' },
  { value: 'afternoon', label: 'Afternoon', description: 'Peak energy mid-day' },
  { value: 'evening', label: 'Evening', description: 'Strongest later in the day' },
];

const NOTIFICATION_OPTIONS: PickerOption<NotificationStyle>[] = [
  { value: 'gentle', label: 'Gentle', description: 'Softer reminders' },
  { value: 'standard', label: 'Standard', description: 'Balanced nudges' },
  { value: 'minimal', label: 'Minimal', description: 'Only essential alerts' },
];

const FOCUS_DURATION_OPTIONS: PickerOption[] = [15, 25, 30, 45, 60, 90].map((m) => ({
  value: String(m),
  label: durationMinutesLabel(m),
}));

const BREAK_DURATION_OPTIONS: PickerOption[] = [5, 10, 15, 20, 30].map((m) => ({
  value: String(m),
  label: durationMinutesLabel(m),
}));

const WAKE_TIME_OPTIONS: PickerOption[] = Array.from({ length: 13 }, (_, i) => {
  const minutes = 300 + i * 30;
  return { value: String(minutes), label: minutesToDisplayTime(minutes) };
});

const WEEKDAY_OPTIONS: PickerOption<Weekday>[] = (
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as Weekday[]
).map((d) => ({ value: d, label: prettyWeekday(d) }));

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    account,
    onboardingData,
    wakeTime,
    preferences,
    setOnboardingData,
    setWakeTime,
    setPreferences,
    resetStore,
  } = useAppStore();
  const pm = usePremium();
  const isPremium = pm.isPremium;
  const p  = usePersonalization();

  const [picker, setPicker] = useState<PickerKind>(null);
  const [upgradeFeature, setUpgradeFeature] = useState<FeatureId>('adaptive_coaching');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [infoModal, setInfoModal] = useState<'privacy' | 'profile' | null>(null);

  const coachStyleLabel = prettyCoachStyle(p.profile.coachStyle);
  const peakTimeLabel   = prettyPeakTime(p.profile.peakTime);

  const requirePremium = useCallback((featureId: FeatureId, onAllowed: () => void) => {
    if (pm.canUse(featureId)) {
      onAllowed();
      return;
    }
    setUpgradeFeature(featureId);
    setShowUpgrade(true);
  }, [pm]);

  const syncProfile = () => {
    syncOnboardingProfileToSupabase().catch(() => {});
  };

  const goToInsights = () => {
    navigation.navigate('MainTabs', { screen: 'Insights' });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your cloud account and all local app data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccountAndLocalData();
            if (error) {
              Alert.alert('Could not delete account', error);
              return;
            }
            navigationResetAfterDeletion(navigation.dispatch);
          },
        },
      ],
    );
  };

  const handleDevReset = () => {
    Alert.alert(
      'Reset App',
      'This clears all data and takes you back to the first-launch screen. Use for testing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            resetStore();
            await AsyncStorage.clear();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] })
            );
          },
        },
      ],
    );
  };

  const SECTIONS: SettingSection[] = [
    {
      title: 'Preferences',
      items: [
        {
          label: 'Coaching Style',
          value: coachStyleLabel,
          icon: 'scale-balance',
          coachStylePremium: true,
          onPress: () => requirePremium('adaptive_coaching', () => setPicker('coachStyle')),
        },
        {
          label: 'Peak Productivity',
          value: peakTimeLabel,
          icon: 'weather-sunset-up',
          onPress: () => setPicker('peakTime'),
        },
        {
          label: 'Notification Style',
          value: prettyNotificationStyle(preferences.notificationStyle),
          icon: 'bell-ring-outline',
          onPress: () => {
            if (NOTIFICATIONS_ENABLED) {
              ensureNotificationPermissionsIfEnabled()
                .catch(() => {})
                .finally(() => setPicker('notificationStyle'));
            } else {
              setPicker('notificationStyle');
            }
          },
        },
        {
          label: 'Adaptive Coaching',
          value: pm.canUse('adaptive_coaching') ? 'On' : undefined,
          icon: 'brain',
          premium: true,
          onPress: () => requirePremium('adaptive_coaching', goToInsights),
        },
      ],
    },
    {
      title: 'Schedule',
      items: [
        {
          label: 'Default Focus Duration',
          value: durationMinutesLabel(preferences.defaultFocusDurationMinutes),
          icon: 'timer-outline',
          onPress: () => setPicker('focusDuration'),
        },
        {
          label: 'Break Duration',
          value: durationMinutesLabel(preferences.breakDurationMinutes),
          icon: 'coffee-outline',
          onPress: () => setPicker('breakDuration'),
        },
        {
          label: 'Daily Start Time',
          value: minutesToDisplayTime(wakeTime),
          icon: 'weather-sunset-up',
          onPress: () => setPicker('wakeTime'),
        },
        {
          label: 'Advanced Optimization',
          value: preferences.advancedOptimizationEnabled ? 'On' : 'Off',
          icon: 'lightning-bolt',
          premium: true,
          toggle: true,
          toggleValue: preferences.advancedOptimizationEnabled,
          onPress: () => requirePremium('advanced_optimization', () => {
            setPreferences({ advancedOptimizationEnabled: !preferences.advancedOptimizationEnabled });
          }),
        },
      ],
    },
    {
      title: 'Insights',
      items: [
        {
          label: 'Weekly Reflections',
          value: pm.canUse('weekly_reflections') ? prettyWeekday(preferences.weeklyReflectionDay) : undefined,
          icon: 'text-box-check-outline',
          premium: true,
          onPress: () => requirePremium('weekly_reflections', () => setPicker('weeklyDay')),
        },
        {
          label: 'Schedule Analytics',
          value: pm.canUse('advanced_analytics') ? 'View' : undefined,
          icon: 'poll',
          premium: true,
          onPress: () => requirePremium('advanced_analytics', goToInsights),
        },
        {
          label: 'Data & Privacy',
          value: 'View policy',
          icon: 'shield-lock-outline',
          onPress: () => {
            openLegalUrl(PRIVACY_POLICY_URL).catch(() => setInfoModal('privacy'));
          },
        },
        {
          label: 'Terms of Service',
          value: 'View terms',
          icon: 'file-document-outline',
          onPress: () => {
            openLegalUrl(TERMS_OF_SERVICE_URL).catch(() => {
              Alert.alert('Could not open Terms of Service', TERMS_OF_SERVICE_URL);
            });
          },
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          label: 'Profile',
          value: account.name ?? 'Set up',
          icon: 'account-circle-outline',
          onPress: () => setInfoModal('profile'),
        },
        {
          label: 'Subscription',
          value: isPremium
            ? pm.isTrialActive
              ? `Trial · ${pm.trialDaysLeft}d left`
              : 'Premium'
            : 'Free',
          icon: 'star-circle-outline',
          onPress: () => navigation.navigate('Premium'),
        },
        {
          label: 'Delete Account',
          value: 'Permanent',
          icon: 'account-remove-outline',
          onPress: handleDeleteAccount,
        },
        {
          label: 'App Version',
          value: '1.0.0',
          icon: 'information-outline',
          showChevron: false,
        },
      ],
    },
  ];

  const pickerConfig = (() => {
    switch (picker) {
      case 'coachStyle':
        return {
          title: 'Coaching Style',
          subtitle: 'Premium — changes how your coach speaks to you.',
          options: COACH_OPTIONS,
          selected: onboardingData.coaching ?? 'balanced',
          onSelect: (v: string) => {
            setOnboardingData({ coaching: v });
            syncProfile();
          },
        };
      case 'peakTime':
        return {
          title: 'Peak Productivity',
          subtitle: 'When you usually have the most energy.',
          options: PEAK_OPTIONS,
          selected: onboardingData.peakTime ?? 'morning',
          onSelect: (v: string) => {
            setOnboardingData({ peakTime: v });
            syncProfile();
          },
        };
      case 'notificationStyle':
        return {
          title: 'Notification Style',
          subtitle: 'How reminders feel in the app.',
          options: NOTIFICATION_OPTIONS,
          selected: preferences.notificationStyle,
          onSelect: (v: NotificationStyle) => setPreferences({ notificationStyle: v }),
        };
      case 'focusDuration':
        return {
          title: 'Default Focus Duration',
          subtitle: 'Used when adding new tasks and starting focus.',
          options: FOCUS_DURATION_OPTIONS,
          selected: String(preferences.defaultFocusDurationMinutes),
          onSelect: (v: string) => setPreferences({ defaultFocusDurationMinutes: Number(v) }),
        };
      case 'breakDuration':
        return {
          title: 'Break Duration',
          subtitle: 'Length of breaks in your generated schedule.',
          options: BREAK_DURATION_OPTIONS,
          selected: String(preferences.breakDurationMinutes),
          onSelect: (v: string) => setPreferences({ breakDurationMinutes: Number(v) }),
        };
      case 'wakeTime':
        return {
          title: 'Daily Start Time',
          subtitle: 'When your day begins — used for scheduling.',
          options: WAKE_TIME_OPTIONS,
          selected: String(wakeTime),
          onSelect: (v: string) => {
            setWakeTime(Number(v));
            syncProfile();
          },
        };
      case 'weeklyDay':
        return {
          title: 'Weekly Reflection Day',
          subtitle: 'When your weekly coaching report is ready.',
          options: WEEKDAY_OPTIONS,
          selected: preferences.weeklyReflectionDay,
          onSelect: (v: Weekday) => setPreferences({ weeklyReflectionDay: v }),
        };
      default:
        return null;
    }
  })();

  const profileBody = [
    account.name ? `Name: ${account.name}` : 'Name: Not set',
    account.email ? `Email: ${account.email}` : 'Email: Not set',
    `Peak time: ${peakTimeLabel}`,
    account.createdAt
      ? `Member since: ${new Date(account.createdAt).toLocaleDateString()}`
      : null,
  ].filter(Boolean).join('\n\n');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>
            Tune how Momentum plans your day and coaches you.
          </Text>
        </View>

        <PremiumCard isPremium={isPremium} onUpgrade={() => navigation.navigate('Premium')} />

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => {
                const isCoachLocked = item.coachStylePremium && !pm.canUse('adaptive_coaching');
                const isLocked = (item.premium && !isPremium) || isCoachLocked;

                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.settingRow,
                      idx < section.items.length - 1 && styles.settingRowBorder,
                      isLocked && styles.settingRowLocked,
                    ]}
                    activeOpacity={item.onPress ? 0.7 : 1}
                    onPress={
                      item.toggle && pm.canUse('advanced_optimization')
                        ? undefined
                        : item.onPress
                    }
                    disabled={!item.onPress || (item.toggle && pm.canUse('advanced_optimization'))}
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
                          <Text style={styles.lockedNote}>
                            {item.coachStylePremium ? 'Premium to change' : 'Requires Premium'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.settingRight}>
                      {item.toggle && pm.canUse('advanced_optimization') ? (
                        <Switch
                          value={item.toggleValue}
                          onValueChange={(v) => setPreferences({ advancedOptimizationEnabled: v })}
                          trackColor={{ false: Colors.surfaceVariant, true: PREMIUM_COLOR + '80' }}
                          thumbColor={item.toggleValue ? PREMIUM_COLOR : Colors.outline}
                        />
                      ) : isLocked ? (
                        <PremiumBadge size="sm" />
                      ) : item.value ? (
                        <Text style={[styles.settingValue, item.label === 'Subscription' && isPremium && { color: PREMIUM_COLOR }]}>
                          {item.value}
                        </Text>
                      ) : null}
                      {item.onPress && item.showChevron !== false && !item.toggle && (
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

        {__DEV__ && (
          <TouchableOpacity style={styles.devReset} onPress={handleDevReset} activeOpacity={0.7}>
            <MaterialCommunityIcons name="refresh" size={14} color="#cc3333" />
            <Text style={styles.devResetText}>Reset App (Dev Only)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>Momentum v1.0.0 · Calculated Calm</Text>
      </ScrollView>

      {pickerConfig && (
        <SettingPickerModal
          visible={picker != null}
          title={pickerConfig.title}
          subtitle={pickerConfig.subtitle}
          options={pickerConfig.options}
          selected={pickerConfig.selected}
          onSelect={pickerConfig.onSelect as (v: string) => void}
          onClose={() => setPicker(null)}
        />
      )}

      <UpgradePrompt
        visible={showUpgrade}
        featureId={upgradeFeature}
        onDismiss={() => setShowUpgrade(false)}
      />

      <InfoModal
        visible={infoModal === 'privacy'}
        title="Data & Privacy"
        body={'Your tasks and schedule are stored on this device. If you sign in, onboarding preferences and behavioural events sync to Supabase under your account.\n\nWe do not sell your data. You can delete your account and all local data from Settings → Delete Account.\n\nPrivacy Policy: ' + PRIVACY_POLICY_URL}
        onClose={() => setInfoModal(null)}
      />

      <InfoModal
        visible={infoModal === 'profile'}
        title="Your Profile"
        body={profileBody}
        onClose={() => setInfoModal(null)}
      />
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
  heroBlock: { marginBottom: 4, gap: 6 },
  heroTitle:    { ...Typography.displayLg, color: Colors.onSurface, fontSize: 28, lineHeight: 36 },
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
  settingLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
  devReset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#cc333330',
    backgroundColor: '#cc333308',
  },
  devResetText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#cc3333',
  },
  versionText: {
    ...Typography.labelXs,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
});
