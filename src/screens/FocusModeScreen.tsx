import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { TopBar } from '../components/TopBar';
import { usePersonalization } from '../personalization';

type Props = NativeStackScreenProps<RootStackParamList, 'FocusMode'>;

export function FocusModeScreen({ navigation, route }: Props) {
  const {
    taskTitle = 'Focus Session',
    taskDesc = 'Stay in the zone. Deep work block for maximum concentration.',
    durationMinutes = 25,
  } = route.params ?? {};

  const p     = usePersonalization();
  const TOTAL = durationMinutes * 60;

  const [timeLeft, setTimeLeft] = useState(TOTAL);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Personalized coaching message — changes at midway point
  const progressPct = Math.round((1 - timeLeft / TOTAL) * 100);
  const coachMsg = isCompleted
    ? p.coaching.focusComplete
    : progressPct >= 50
    ? p.coaching.focusMidway
    : p.coaching.focusStart;

  const auraAnim     = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(auraAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isPaused || isCompleted) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); setIsCompleted(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const progress = 1 - timeLeft / TOTAL;

  const auraOpacity = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const auraScale   = auraAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const handleComplete = () => {
    Animated.sequence([
      Animated.timing(completeScale, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.spring(completeScale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      setIsCompleted(true);
      setTimeout(() => navigation.goBack(), 1200);
    });
  };

  const SPRINTS = 4;
  const currentSprint = Math.floor(progress * SPRINTS);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar />

      <Animated.View
        style={[styles.aura, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Task context */}
        <View style={styles.contextHeader}>
          <Text style={styles.sprintLabel}>Current Sprint</Text>
          <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
          {/* Personalized coaching message — updates at midway */}
          <Text style={styles.taskDesc} numberOfLines={3}>{coachMsg}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerWrap}>
          <Animated.View style={[styles.timerGlow, { opacity: auraOpacity }]} />
          <Text style={styles.timer}>{timerStr}</Text>
          <Text style={styles.timerSub}>REMAINING</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => setIsPaused((p) => !p)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.pauseLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <Animated.View style={[{ flex: 1.5 }, { transform: [{ scale: completeScale }] }]}>
            <TouchableOpacity
              style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
              onPress={handleComplete}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={Colors.onPrimary}
              />
              <Text style={styles.completeLabel}>
                {isCompleted ? 'Done!' : 'Complete Task'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Reschedule */}
        <TouchableOpacity style={styles.rescheduleBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="calendar-refresh" size={14} color={Colors.onSurfaceVariant} />
          <Text style={styles.rescheduleLabel}>Reschedule</Text>
        </TouchableOpacity>

        {/* Sprint progress */}
        <View style={styles.sprintDots}>
          {Array.from({ length: SPRINTS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.sprintDot,
                i < currentSprint && styles.sprintDotDone,
                i === currentSprint && styles.sprintDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  aura: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0,88,190,0.06)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 80,
    gap: 28,
  },
  contextHeader: { alignItems: 'center', gap: 8 },
  sprintLabel: {
    ...Typography.labelSm,
    color: Colors.primary + '99',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  taskTitle: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 34,
  },
  taskDesc: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },
  timerWrap: { alignItems: 'center', position: 'relative' },
  timerGlow: {
    position: 'absolute',
    top: -20,
    width: 260,
    height: 130,
    borderRadius: 100,
    backgroundColor: Colors.primary + '10',
  },
  timer: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 88,
    lineHeight: 96,
    color: Colors.primary,
    letterSpacing: -3,
    textShadowColor: Colors.primary + '22',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  timerSub: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant + '66',
    letterSpacing: 3,
    marginTop: -8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 380,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pauseLabel: { ...Typography.labelSm, color: Colors.primary, fontSize: 14 },
  completeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  completeBtnDone: { backgroundColor: Colors.secondary },
  completeLabel: { ...Typography.labelSm, color: Colors.onPrimary, fontSize: 14 },
  rescheduleBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rescheduleLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 13 },
  sprintDots: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 28,
  },
  sprintDot: {
    height: 4,
    width: 60,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  sprintDotDone:   { backgroundColor: Colors.primary },
  sprintDotActive: { backgroundColor: Colors.primary, opacity: 0.55 },
});
