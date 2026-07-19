import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { SKIP_REASONS } from '../data/skipReasons';
import { completeTaskWithTracking, skipTaskWithTracking } from '../taskTracking/checkInActions';
import { useAppStore } from '../store/useAppStore';
import { SignInPromptSheet } from '../components/SignInPromptSheet';
import { useAuthSession } from '../auth/useAuthSession';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { trackFunnelEvent } from '../analytics/funnelTracker';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskCheckIn'>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function formatScheduledTime(time?: string) {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function TaskCheckInScreen({ navigation, route }: Props) {
  const {
    taskId,
    taskTitle,
    taskDesc,
    durationMinutes = 25,
    scheduledTime,
    autoShowSkip = false,
  } = route.params;

  const completedTaskIds = useAppStore((s) => s.completedTaskIds);
  const skippedTaskIds = useAppStore((s) => s.skippedTaskIds);

  const isDone = completedTaskIds.includes(taskId);
  const isSkipped = skippedTaskIds.includes(taskId);
  const [showSkipReasons, setShowSkipReasons] = useState(autoShowSkip && !isDone && !isSkipped);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const { pendingEventCount } = useAuthSession();

  useEffect(() => {
    if (autoShowSkip && !isDone && !isSkipped) {
      setShowSkipReasons(true);
    }
  }, [autoShowSkip, isDone, isSkipped]);

  useEffect(() => {
    trackFunnelEvent('check_in_viewed', { taskId, autoShowSkip });
  }, [taskId, autoShowSkip]);

  const timeLabel = formatScheduledTime(scheduledTime);

  const finishCheckIn = () => {
    navigation.goBack();
  };

  const maybePromptSignIn = async () => {
    const signedIn = await isSupabaseSignedIn();
    if (signedIn) {
      finishCheckIn();
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { lastAuthPromptDate, setLastAuthPromptDate } = useAppStore.getState();
    if (lastAuthPromptDate === today) {
      finishCheckIn();
      return;
    }

    setLastAuthPromptDate(today);
    setShowSignInPrompt(true);
  };

  const startFocus = () => {
    navigation.replace('FocusMode', {
      taskId,
      taskTitle,
      taskDesc,
      durationMinutes,
      scheduledTime,
    });
  };

  const markDone = () => {
    completeTaskWithTracking(taskId, taskTitle, durationMinutes, 'check_in');
    maybePromptSignIn();
  };

  const pickSkipReason = (reasonKey: string) => {
    skipTaskWithTracking(taskId, taskTitle, reasonKey, 'check_in');
    maybePromptSignIn();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={isDone ? 'check-circle' : isSkipped ? 'close-circle-outline' : 'clipboard-check-outline'}
              size={28}
              color={isDone ? '#16a34a' : isSkipped ? Colors.outline : Colors.primary}
            />
          </View>
          <Text style={styles.kicker}>TASK CHECK-IN</Text>
          <Text style={styles.title} numberOfLines={3}>{taskTitle}</Text>
          {taskDesc ? (
            <Text style={styles.subtitle} numberOfLines={3}>{taskDesc}</Text>
          ) : null}
          <View style={styles.metaRow}>
            {timeLabel ? (
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.primary} />
                <Text style={styles.metaText}>{timeLabel}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="timer-outline" size={13} color={Colors.primary} />
              <Text style={styles.metaText}>{durationMinutes} min</Text>
            </View>
          </View>
        </View>

        {isDone ? (
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="check-decagram" size={22} color="#16a34a" />
            <Text style={styles.statusTitle}>Already marked done</Text>
            <Text style={styles.statusSub}>This block is logged for today.</Text>
          </View>
        ) : isSkipped ? (
          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="information-outline" size={22} color={Colors.outline} />
            <Text style={styles.statusTitle}>Marked as skipped</Text>
            <Text style={styles.statusSub}>You can still start a focus session if you change your mind.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={startFocus} activeOpacity={0.88}>
              <MaterialCommunityIcons name="play-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.secondaryBtnLabel}>Start focus anyway</Text>
            </TouchableOpacity>
          </View>
        ) : showSkipReasons ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What got in the way?</Text>
            <Text style={styles.cardSub}>Honest answers help Momentum coach you better over time.</Text>
            <View style={styles.reasonList}>
              {SKIP_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  style={styles.reasonRow}
                  onPress={() => pickSkipReason(reason.key)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name={reason.icon as IconName} size={18} color={Colors.primary} />
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.outline} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.textBtn} onPress={() => setShowSkipReasons(false)} activeOpacity={0.8}>
              <Text style={styles.textBtnLabel}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={startFocus} activeOpacity={0.88}>
              <MaterialCommunityIcons name="play" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryBtnLabel}>Start focus</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={markDone} activeOpacity={0.88}>
              <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />
              <Text style={styles.secondaryBtnLabel}>Mark done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => setShowSkipReasons(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostBtnLabel}>Couldn&apos;t do it</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SignInPromptSheet
        visible={showSignInPrompt}
        pendingEventCount={pendingEventCount}
        title="Save this check-in"
        subtitle="Sign in so your coach learns from what you actually do — one email code, no password."
        onContinue={() => {
          setShowSignInPrompt(false);
          navigation.navigate('Auth', { fromCheckIn: true });
        }}
        onSkip={() => {
          setShowSignInPrompt(false);
          finishCheckIn();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 32,
    gap: 20,
  },
  hero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kicker: {
    ...Typography.labelSm,
    color: Colors.primary,
    letterSpacing: 1.4,
    fontSize: 10,
  },
  title: {
    ...Typography.displayLg,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    lineHeight: 21,
    maxWidth: 320,
  },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryFixed + '90',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  metaText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  actions: { gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    ...Shadow.card,
  },
  primaryBtnLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: Colors.onPrimary,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.xl,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
  },
  secondaryBtnLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: Colors.primary,
  },
  ghostBtn: { alignItems: 'center', paddingVertical: 12 },
  ghostBtnLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.outline,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
    ...Shadow.card,
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  cardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
  },
  reasonList: { gap: 8 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '25',
  },
  reasonLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  textBtn: { alignItems: 'center', paddingVertical: 8 },
  textBtnLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.outline,
  },
  statusCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
  },
  statusTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },
  statusSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    lineHeight: 19,
  },
});
