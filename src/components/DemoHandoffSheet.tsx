import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';

type Props = {
  visible: boolean;
  onClearAndAddOwn: () => void;
  onOpenTour: () => void;
  onBrowseSchedule: () => void;
};

export function DemoHandoffSheet({
  visible,
  onClearAndAddOwn,
  onOpenTour,
  onBrowseSchedule,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onBrowseSchedule}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="check-decagram" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.title}>That was a sample plan</Text>
            <Text style={styles.subtitle}>
              You saw how Momentum builds a day from tasks, constraints, and deadlines. Take your time on the sample — when you are ready, sign in to add your own tasks.
            </Text>

            <View style={styles.tipBox}>
              <Text style={styles.tipLine}>1. Clear the sample tasks</Text>
              <Text style={styles.tipLine}>2. Add 2–4 real tasks on Focus</Text>
              <Text style={styles.tipLine}>3. Generate again for your plan</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onClearAndAddOwn} activeOpacity={0.88}>
              <MaterialCommunityIcons name="broom" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryLabel}>Clear sample & add my tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenTour} activeOpacity={0.85}>
              <MaterialCommunityIcons name="map-search-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryLabel}>How Momentum works</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skip} onPress={onBrowseSchedule} activeOpacity={0.8}>
              <Text style={styles.skipLabel}>Keep browsing this sample schedule</Text>
            </TouchableOpacity>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    padding: Spacing.gutter,
  },
  center: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  tipBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
  },
  tipLine: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  primaryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryFixed,
  },
  secondaryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: Colors.primary },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline },
});
