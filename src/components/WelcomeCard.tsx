import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { WELCOME_CARDS, BADGE_LABELS, BADGE_COLORS } from '../personalization/content';
import type { CoachStyle } from '../personalization/types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Per-style background tint for the hero banner (very subtle wash)
const BANNER_BG: Record<CoachStyle | 'default', string> = {
  strict:    '#fff0f0',
  supportive:'#f0fff4',
  balanced:  '#f0f5ff',
  default:   '#f5f5ff',
};

interface Props {
  coachStyle: CoachStyle | null;
  onDismiss:  () => void;
}

export function WelcomeCard({ coachStyle, onDismiss }: Props) {
  const key   = (coachStyle ?? 'default') as CoachStyle | 'default';
  const card  = WELCOME_CARDS[key];
  const label = BADGE_LABELS[key];
  const color = BADGE_COLORS[key];
  const bg    = BANNER_BG[key];

  // Entrance
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Hero icon breathe
  const breathe   = useRef(new Animated.Value(1)).current;
  // Icon glow pulse
  const glowAnim  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 520, delay: 340,
        useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(slideAnim, {
        toValue: 0, delay: 340,
        useNativeDriver: true, tension: 60, friction: 10,
      }),
    ]).start();

    // Continuous icon breathe
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.12, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(breathe, { toValue: 1,    duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // Glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 260, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 240, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -18,  duration: 260, useNativeDriver: true }),
    ]).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      {/* ─── Hero banner ─────────────────────────────────────────────── */}
      <View style={[styles.banner, { backgroundColor: bg }]}>
        {/* Dismiss button — floats top-right of banner */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={14} color={color + 'cc'} />
        </TouchableOpacity>

        {/* Animated icon + glow */}
        <View style={styles.iconZone}>
          <Animated.View style={[styles.iconGlow, { backgroundColor: color + '22', opacity: glowAnim }]} />
          <Animated.View style={[styles.iconRing, { borderColor: color + '30' }]}>
            <View style={[styles.iconBg, { backgroundColor: color + '18' }]}>
              <Animated.View style={{ transform: [{ scale: breathe }] }}>
                <MaterialCommunityIcons name={card.heroIcon as IconName} size={34} color={color} />
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        {/* Coach badge */}
        <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
          <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { color }]}>{card.tagline}</Text>
      </View>

      {/* ─── Body ────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Headline */}
        <Text style={styles.headline}>{card.headline}</Text>

        {/* Description */}
        <Text style={styles.description}>{card.description}</Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: color + '22' }]} />

        {/* Steps label */}
        <Text style={[styles.stepsLabel, { color }]}>Getting started</Text>

        {/* Steps */}
        <View style={styles.steps}>
          {card.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: color + '15', borderColor: color + '35' }]}>
                <Text style={[styles.stepNumText, { color }]}>{i + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <MaterialCommunityIcons
                  name={step.icon as IconName}
                  size={14} color={color}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA button — solid fill */}
        <TouchableOpacity
          style={[styles.gotItBtn, { backgroundColor: color }]}
          onPress={handleDismiss}
          activeOpacity={0.82}
        >
          <MaterialCommunityIcons name="check" size={15} color="#fff" />
          <Text style={styles.gotItLabel}>Got it — let's go</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },

  // ── Banner ──────────────────────────────────────────────────────────
  banner: {
    paddingTop: 22, paddingBottom: 18, paddingHorizontal: 18,
    alignItems: 'center', gap: 10,
  },
  dismissBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconZone: {
    alignItems: 'center', justifyContent: 'center',
    width: 88, height: 88,
  },
  iconGlow: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
  },
  iconRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBg: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 0.4 },
  tagline: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 13,
    letterSpacing: 0.1, textAlign: 'center',
    opacity: 0.85,
  },

  // ── Body ────────────────────────────────────────────────────────────
  body: { padding: 18, gap: 12 },
  headline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17, lineHeight: 24, letterSpacing: -0.3,
    color: Colors.onSurface,
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13.5, lineHeight: 20.5,
    color: Colors.onSurfaceVariant,
  },
  divider: { height: 1 },
  stepsLabel: {
    fontFamily: 'Manrope_700Bold', fontSize: 10,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },
  steps: { gap: 9 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  stepNumText: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
  stepContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  stepText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13, lineHeight: 19,
    color: Colors.onSurface, flex: 1,
  },

  // ── CTA ─────────────────────────────────────────────────────────────
  gotItBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: Radius.lg,
    marginTop: 2,
  },
  gotItLabel: {
    fontFamily: 'Manrope_700Bold', fontSize: 14, color: '#fff',
    letterSpacing: 0.1,
  },
});
