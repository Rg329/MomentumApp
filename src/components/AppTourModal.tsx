import React, { useState } from 'react';
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
import { APP_TOUR_STEPS } from '../data/appTourSteps';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export function AppTourModal({ visible, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = APP_TOUR_STEPS[stepIndex];
  const isLast = stepIndex >= APP_TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      setStepIndex(0);
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleClose = () => {
    setStepIndex(0);
    onClose();
  };

  if (!step) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop}>
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.kicker}>How Momentum works</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.progressRow}>
              {APP_TOUR_STEPS.map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]} />
              ))}
            </View>

            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={step.icon as IconName} size={28} color={Colors.primary} />
            </View>

            {step.tab ? (
              <View style={styles.tabChip}>
                <Text style={styles.tabChipText}>{step.tab} tab</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.88}>
              <Text style={styles.primaryLabel}>{isLast ? 'Got it' : 'Next'}</Text>
              <MaterialCommunityIcons
                name={isLast ? 'check' : 'arrow-right'}
                size={18}
                color={Colors.onPrimary}
              />
            </TouchableOpacity>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    marginBottom: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: Colors.primary, letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tabChipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: Colors.primary },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 22, color: Colors.onSurface, letterSpacing: -0.4 },
  body: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 22, color: Colors.onSurfaceVariant },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginTop: 4,
  },
  primaryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Colors.onPrimary },
});
