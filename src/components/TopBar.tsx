import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

interface TopBarProps {
  showProgress?: boolean;
  progressValue?: number;
  stepLabel?: string;
  rightContent?: React.ReactNode;
}

export function TopBar({ showProgress, progressValue = 0, stepLabel, rightContent }: TopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.logoIconWrap}>
          <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.onPrimary} />
        </View>
        <Text style={styles.logoText}>Momentum</Text>
      </View>
      {showProgress ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
          </View>
          {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
        </View>
      ) : (
        rightContent ?? <View style={styles.avatar} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    height: 64,
    backgroundColor: 'rgba(250,248,255,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant + '30',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...Typography.headlineSm,
    color: Colors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: 100,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepLabel: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
