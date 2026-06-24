import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { PREMIUM_COLOR } from '../monetization';
import { useAppStore } from '../store/useAppStore';

interface Props {
  size?: 'sm' | 'md';
  shimmer?: boolean;
}

export function PremiumBadge({ size = 'sm', shimmer = true }: Props) {
  const { isPremium } = useAppStore();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  if (isPremium) return null;

  useEffect(() => {
    if (!shimmer) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, [shimmer]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const isMd = size === 'md';

  return (
    <Animated.View style={[styles.badge, isMd && styles.badgeMd, { opacity: shimmerOpacity }]}>
      <Text style={[styles.star, isMd && styles.starMd]}>★</Text>
      <Text style={[styles.label, isMd && styles.labelMd]}>PRO</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: PREMIUM_COLOR,
    borderRadius: 50,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeMd: { paddingHorizontal: 9, paddingVertical: 4, gap: 4 },
  star:    { fontSize: 9,  color: '#fff', lineHeight: 13 },
  starMd:  { fontSize: 11, lineHeight: 16 },
  label:   { fontFamily: 'Manrope_700Bold', fontSize: 9,  color: '#fff', letterSpacing: 0.5 },
  labelMd: { fontSize: 11 },
});
