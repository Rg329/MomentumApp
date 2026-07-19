import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Spacing } from '../theme';
import { FEATURES, PREMIUM_COLOR, PREMIUM_FEATURES } from '../monetization';
import type { FeatureId } from '../monetization';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  visible:    boolean;
  featureId:  FeatureId;
  onDismiss:  () => void;
}

export function UpgradePrompt({ visible, featureId, onDismiss }: Props) {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const feat       = FEATURES[featureId];

  const slideAnim  = useRef(new Animated.Value(300)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      ]).start();
    }
  }, [visible]);

  const handleUpgrade = () => {
    onDismiss();
    navigation.navigate('Premium');
  };

  // Pick 3 premium feature previews
  const previewFeatures = PREMIUM_FEATURES.slice(0, 3);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />

        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          {/* Feature icon */}
          <View style={[styles.iconRing, { borderColor: PREMIUM_COLOR + '30' }]}>
            <View style={[styles.iconBg, { backgroundColor: PREMIUM_COLOR + '15' }]}>
              <MaterialCommunityIcons name={feat.icon as IconName} size={28} color={PREMIUM_COLOR} />
            </View>
          </View>

          {/* Copy */}
          <View style={styles.copyBlock}>
            <View style={styles.proBadge}>
              <Text style={styles.proStar}>★</Text>
              <Text style={styles.proLabel}>MOMENTUM PRO</Text>
            </View>
            <Text style={styles.headline}>{feat.name}</Text>
            <Text style={styles.hook}>{feat.promptHook}</Text>
          </View>

          {/* 3 feature preview pills */}
          <View style={styles.featureList}>
            {previewFeatures.map((f) => (
              <View key={f.id} style={styles.featureRow}>
                <MaterialCommunityIcons name={f.icon as IconName} size={14} color={PREMIUM_COLOR} />
                <Text style={styles.featureText}>{f.name}</Text>
              </View>
            ))}
            <Text style={styles.moreLine}>+ {PREMIUM_FEATURES.length - 3} more premium features</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.88}>
            <Text style={styles.upgradeBtnLabel}>See Momentum Premium</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissLabel}>Continue with free version</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 16, alignItems: 'center',
  },
  handle:   { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, marginBottom: 4 },
  iconRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconBg:   { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  copyBlock:{ alignItems: 'center', gap: 6 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PREMIUM_COLOR, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  proStar:  { fontSize: 10, color: '#fff' },
  proLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1 },
  headline: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: Colors.onSurface, letterSpacing: -0.3, textAlign: 'center' },
  hook:     { fontFamily: 'Manrope_500Medium', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 21 },
  featureList:{ width: '100%', gap: 8, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText:{ fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.onSurface },
  moreLine:   { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.outline, paddingTop: 4 },
  upgradeBtn: {
    width: '100%', backgroundColor: PREMIUM_COLOR,
    paddingVertical: 16, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PREMIUM_COLOR, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 8,
  },
  upgradeBtnLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#fff' },
  dismissBtn:     { paddingVertical: 6 },
  dismissLabel:   { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline },
});
