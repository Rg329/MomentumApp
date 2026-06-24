import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography } from '../theme';

interface ChipProps {
  label: string;
  icon?: string;
  variant?: 'primary' | 'surface' | 'outline';
  style?: ViewStyle;
}

export function Chip({ label, variant = 'surface', style }: ChipProps) {
  const bgColor =
    variant === 'primary'
      ? Colors.primaryFixed
      : variant === 'outline'
      ? 'transparent'
      : Colors.surfaceContainerLow;

  const textColor =
    variant === 'primary' ? Colors.onPrimaryFixedVariant : Colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bgColor },
        variant === 'outline' && styles.outlined,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  label: {
    ...Typography.labelXs,
    textTransform: 'uppercase',
  },
});
