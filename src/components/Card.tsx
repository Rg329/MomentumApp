import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'flat' | 'tinted';
  radius?: number;
}

export function Card({ children, style, variant = 'elevated', radius }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'flat' && styles.flat,
        variant === 'tinted' && styles.tinted,
        radius !== undefined && { borderRadius: radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: 20,
  },
  elevated: {
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadow.card,
  },
  flat: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  tinted: {
    backgroundColor: Colors.primaryFixed + '40',
    borderWidth: 1,
    borderColor: Colors.primaryFixedDim + '30',
  },
});
