import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface MomentumAuraProps {
  style?: ViewStyle;
  intensity?: 'soft' | 'medium';
}

export function MomentumAura({ style, intensity = 'soft' }: MomentumAuraProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, style]} pointerEvents="none">
      <Animated.View
        style={[
          styles.blob1,
          intensity === 'medium' && styles.blobMedium,
          { opacity, transform: [{ scale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.blob2,
          intensity === 'medium' && styles.blobMedium,
          { opacity: Animated.multiply(opacity, 0.7), transform: [{ scale }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 0,
  },
  blob1: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(59, 130, 246, 0.07)',
  },
  blob2: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  blobMedium: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
});
