import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../theme';

export type PickerOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function SettingPickerModal<T extends string>({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onClose,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : 320,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <ScrollView style={styles.list} bounces={false}>
            {options.map((opt) => {
              const active = opt.value === selected;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.row, active && styles.rowActive]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{opt.label}</Text>
                    {opt.description ? (
                      <Text style={styles.rowDesc}>{opt.description}</Text>
                    ) : null}
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.gutter,
    paddingTop: 12,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: Colors.primaryFixed,
  },
  rowLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'Manrope_600SemiBold',
  },
  rowLabelActive: {
    color: Colors.primary,
  },
  rowDesc: {
    ...Typography.bodyMd,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 17,
  },
});
