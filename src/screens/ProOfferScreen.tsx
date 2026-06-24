import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { PremiumBadge } from '../components/PremiumBadge';
import { useAppStore } from '../store/useAppStore';
import { PREMIUM_COLOR } from '../monetization';

type Props = NativeStackScreenProps<RootStackParamList, 'ProOffer'>;

export function ProOfferScreen({ navigation }: Props) {
  const { startFreeTrial14d } = useAppStore();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 520, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    ).start();
  }, []);

  const handleTrial = () => {
    startFreeTrial14d();
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar rightContent={<View style={styles.avatar} />} />

      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={styles.hero}>
          <View style={styles.proBadgeRow}>
            <PremiumBadge size="sm" />
            <Text style={styles.proKicker}>Momentum Pro</Text>
          </View>
          <Text style={styles.title}>Get unstuck faster.</Text>
          <Text style={styles.sub}>
            Unlock deeper insights, smarter regenerations, and adaptive coaching—built to beat procrastination.
          </Text>
        </View>

        <View style={styles.card}>
          {[
            { icon: 'infinity' as const, title: 'Unlimited regenerations', desc: 'Rebuild your day as many times as you need.' },
            { icon: 'brain' as const, title: 'Adaptive coaching', desc: 'Supportive, balanced, or strict—plus AI that adjusts over time.' },
            { icon: 'chart-areaspline' as const, title: 'Deep insights', desc: 'Spot patterns in resistance and focus so starting gets easier.' },
          ].map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name={f.icon} size={18} color={PREMIUM_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={handleTrial}>
            <View style={styles.ctaShine} />
            <Text style={styles.ctaLabel}>Start 14‑day free trial</Text>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaPillText}>No card needed</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.secondary} onPress={() => navigation.replace('MainTabs')} activeOpacity={0.8}>
          <Text style={styles.secondaryLabel}>Continue with free version</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceContainerHigh },
  blob1: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: PREMIUM_COLOR + '10',
  },
  blob2: {
    position: 'absolute',
    bottom: 50,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: PREMIUM_COLOR + '08',
  },
  content: { flex: 1, paddingHorizontal: Spacing.gutter, paddingTop: Spacing.md, gap: 16 },
  hero: { gap: 8, marginTop: 6 },
  proBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proKicker: { ...Typography.labelSm, color: PREMIUM_COLOR, textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 10 },
  title: { ...Typography.displayLg, fontSize: 30, lineHeight: 36, color: Colors.onSurface },
  sub: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, lineHeight: 24, maxWidth: 340 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR + '20',
    ...Shadow.card,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_COLOR + '12',
  },
  featureTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Manrope_700Bold' },
  featureDesc: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 19, marginTop: 2 },
  cta: {
    backgroundColor: PREMIUM_COLOR,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 10,
    overflow: 'hidden',
  },
  ctaShine: {
    position: 'absolute',
    top: -18,
    left: 28,
    width: 120,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '22deg' }],
  },
  ctaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.1 },
  ctaPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  ctaPillText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#fff' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline, textDecorationLine: 'underline' },
});

