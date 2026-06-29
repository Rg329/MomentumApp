import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

interface TopBarProps {
  showProgress?: boolean;
  progressValue?: number;
  stepLabel?: string;
  rightContent?: React.ReactNode;
  onBack?: () => void;
  onCancel?: () => void;
}

export function TopBar({ showProgress, progressValue = 0, stepLabel, rightContent, onBack, onCancel }: TopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.logoText}>Momentum</Text>
        )}
      </View>
      {showProgress ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
          </View>
          {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
        </View>
      ) : onCancel ? (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ) : (
        rightContent ?? <View style={{ width: 36 }} />
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '60',
  },
  cancelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.2,
  },
});
