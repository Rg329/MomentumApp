import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';

function minutesToTime(total: number): string {
  let h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? '0' + m : m} ${ap}`;
}

function TimeValue({ minutes, size = 22 }: { minutes: number; size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(minutes);

  useEffect(() => {
    if (prev.current !== minutes) {
      prev.current = minutes;
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 7 }),
      ]).start();
    }
  }, [minutes]);

  return (
    <Animated.Text style={[styles.timeVal, { fontSize: size, transform: [{ scale }] }]}>
      {minutesToTime(minutes)}
    </Animated.Text>
  );
}

function SleepWindowBar({ wakeTime, sleepTime }: { wakeTime: number; sleepTime: number }) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(barAnim, { toValue: 1, duration: 900, delay: 300, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      Animated.timing(focusAnim, { toValue: 1, duration: 700, delay: 800, useNativeDriver: false, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const awake = Math.max(1, sleepTime - wakeTime);
  const peakStart = 165;
  const peakEnd = 285;
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const peakLeftNum = (peakStart / awake) * 100;
  const peakWidthPct = `${((peakEnd - peakStart) / awake) * 100}%` as const;
  const focusWidth = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', peakWidthPct] });

  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
        <Animated.View style={[styles.barPeak, { left: `${peakLeftNum}%`, width: focusWidth }]} />
      </View>
      <View style={styles.barLabels}>
        <View style={styles.barLabelLeft}>
          <View style={[styles.barDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.barLabelText}>{minutesToTime(wakeTime)}</Text>
        </View>
        <View style={styles.barLabelCenter}>
          <MaterialCommunityIcons name="lightning-bolt" size={10} color={Colors.primary} />
          <Text style={[styles.barLabelText, { color: Colors.primary }]}>Peak Focus</Text>
        </View>
        <View style={styles.barLabelRight}>
          <Text style={styles.barLabelText}>{minutesToTime(sleepTime)}</Text>
          <View style={[styles.barDot, { backgroundColor: Colors.outline }]} />
        </View>
      </View>
    </View>
  );
}

function AuraCard({ wakeTime }: { wakeTime: number }) {
  const glow1 = useRef(new Animated.Value(0)).current;
  const glow2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      ).start();
    pulse(glow1, 0);
    pulse(glow2, 1000);
  }, []);

  const peak1 = minutesToTime(wakeTime + 165);
  const peak2 = minutesToTime(wakeTime + 285);

  return (
    <View style={styles.auraCard}>
      <Animated.View style={[styles.auraRing, styles.auraRing1, { opacity: glow1.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] }) }]} />
      <Animated.View style={[styles.auraRing, styles.auraRing2, { opacity: glow2.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] }) }]} />
      <View style={styles.auraContent}>
        <View style={styles.auraBadge}>
          <MaterialCommunityIcons name="star-four-points" size={11} color={Colors.primary} />
          <Text style={styles.auraBadgeText}>Momentum Aura</Text>
        </View>
        <Text style={styles.auraText}>
          Based on your sleep pattern, your{' '}
          <Text style={styles.auraAccent}>"Peak Focus"</Text>
          {' '}is predicted between{' '}
          <Text style={styles.auraTime}>{peak1}</Text>
          {' '}and{' '}
          <Text style={styles.auraTime}>{peak2}</Text>.
        </Text>
        <View style={styles.auraNote}>
          <MaterialCommunityIcons name="lock" size={11} color={Colors.primary} />
          <Text style={styles.auraNoteText}>This slot is reserved for your deepest work.</Text>
        </View>
      </View>
    </View>
  );
}

type Props = {
  wakeTime: number;
  sleepTime: number;
  onWakeTimeChange: (value: number) => void;
  onSleepTimeChange: (value: number) => void;
  showAura?: boolean;
};

export function CircadianRhythmPicker({
  wakeTime,
  sleepTime,
  onWakeTimeChange,
  onSleepTimeChange,
  showAura = true,
}: Props) {
  return (
    <View style={styles.wrap}>
      <SleepWindowBar wakeTime={wakeTime} sleepTime={sleepTime} />

      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <View style={styles.sliderLabelRow}>
            <View style={styles.sliderIconWrap}>
              <MaterialCommunityIcons name="weather-sunny" size={13} color={Colors.primary} />
            </View>
            <Text style={styles.sliderLabel}>Wake Time</Text>
          </View>
          <TimeValue minutes={wakeTime} />
        </View>
        <Slider
          style={styles.slider}
          minimumValue={300}
          maximumValue={600}
          step={15}
          value={wakeTime}
          onValueChange={onWakeTimeChange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.primaryFixed}
          thumbTintColor={Colors.primary}
        />
        <View style={styles.sliderRange}>
          <Text style={styles.rangeLabel}>5:00 AM</Text>
          <Text style={styles.rangeLabel}>10:00 AM</Text>
        </View>
      </View>

      <View style={styles.sectionDivider} />

      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <View style={styles.sliderLabelRow}>
            <View style={styles.sliderIconWrap}>
              <MaterialCommunityIcons name="weather-night" size={13} color={Colors.primary} />
            </View>
            <Text style={styles.sliderLabel}>Sleep Time</Text>
          </View>
          <TimeValue minutes={sleepTime} />
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1320}
          maximumValue={1740}
          step={15}
          value={Math.min(Math.max(sleepTime, 1320), 1740)}
          onValueChange={onSleepTimeChange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.primaryFixed}
          thumbTintColor={Colors.primary}
        />
        <View style={styles.sliderRange}>
          <Text style={styles.rangeLabel}>10:00 PM</Text>
          <Text style={styles.rangeLabel}>5:00 AM</Text>
        </View>
      </View>

      <View style={styles.hoursRow}>
        <MaterialCommunityIcons name="timer-outline" size={13} color={Colors.primary} />
        <Text style={styles.hoursText}>
          <Text style={styles.hoursAccent}>
            {Math.round(Math.min((sleepTime - wakeTime - 120) / 60 * 10) / 10)}h
          </Text>
          {' '}productive hours available today
        </Text>
      </View>

      {showAura ? <AuraCard wakeTime={wakeTime} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  barWrap: { gap: 8 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primaryFixed, borderRadius: 4 },
  barPeak: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Colors.primary, borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabelCenter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  barLabelRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barDot: { width: 6, height: 6, borderRadius: 3 },
  barLabelText: { fontFamily: 'Manrope_500Medium', fontSize: 10, color: Colors.outline },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.outlineVariant + '40' },
  sliderBlock: { gap: 2 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  timeVal: { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  slider: { width: '100%', height: 38 },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  rangeLabel: { fontFamily: 'Manrope_400Regular', fontSize: 10, color: Colors.outline },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFixed + '60',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hoursText: { fontFamily: 'Manrope_500Medium', fontSize: 12, color: Colors.onPrimaryFixedVariant },
  hoursAccent: { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  auraCard: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryFixed + 'cc',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    overflow: 'hidden',
  },
  auraRing: { position: 'absolute', borderRadius: 999, backgroundColor: Colors.primary },
  auraRing1: { width: 180, height: 180, top: -60, right: -60 },
  auraRing2: { width: 130, height: 130, top: -30, right: -20 },
  auraContent: { padding: 16, gap: 8 },
  auraBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  auraBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  auraText: { fontFamily: 'Manrope_400Regular', fontSize: 13.5, lineHeight: 20, color: Colors.onPrimaryFixedVariant },
  auraAccent: { fontFamily: 'Manrope_600SemiBold', color: Colors.primary },
  auraTime: { fontFamily: 'Manrope_700Bold', color: Colors.primary },
  auraNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  auraNoteText: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.primary, opacity: 0.8 },
});
