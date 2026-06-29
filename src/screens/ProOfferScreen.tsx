import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Easing, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { useAppStore } from '../store/useAppStore';
import { PREMIUM_COLOR } from '../monetization';

type Props = NativeStackScreenProps<RootStackParamList, 'ProOffer'>;

const ROWS: { label: string; free: boolean; pro: boolean }[] = [
  { label: 'Add unlimited tasks',           free: true,  pro: true  },
  { label: 'AI schedule generation',        free: true,  pro: true  },
  { label: '1 schedule per day',            free: true,  pro: false },
  { label: 'Unlimited regenerations',       free: false, pro: true  },
  { label: 'Streak tracking',              free: true,  pro: true  },
  { label: 'Best streak & momentum score', free: false, pro: true  },
  { label: 'Up to 3 time constraints',     free: true,  pro: false },
  { label: 'Unlimited constraints',        free: false, pro: true  },
  { label: 'Behavioral coaching',          free: false, pro: true  },
  { label: 'Deep procrastination insights',free: false, pro: true  },
  { label: 'Weekly coaching reports',      free: false, pro: true  },
];

export function ProOfferScreen({ navigation, route }: Props) {
  const { startFreeTrial14d, setHasSeenProOffer } = useAppStore();
  const fromOnboarding = route.params?.fromOnboarding ?? false;

  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(22)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 480, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slide, { toValue: 0, duration: 480, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.025, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1,     duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    ).start();
  }, []);

  const goNext = () => {
    if (fromOnboarding) {
      navigation.replace('Auth');
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Auth');
    }
  };

  const handleTrial = () => {
    startFreeTrial14d();
    setHasSeenProOffer(true);
    goNext();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar onBack={fromOnboarding ? undefined : () => navigation.goBack()} />

      {/* Ambient blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <Animated.View style={[{ flex: 1 }, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.kickerRow}>
              <View style={styles.proBadge}>
                <MaterialCommunityIcons name="star-four-points" size={10} color="#fff" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
              <Text style={styles.kickerText}>Momentum Pro</Text>
            </View>
            <Text style={styles.title}>See exactly{'\n'}what you get.</Text>
            <Text style={styles.sub}>
              No hidden catches — here's every feature, side by side.
            </Text>
          </View>

          {/* ── Comparison table ── */}
          <View style={styles.table}>
            {/* Column headers */}
            <View style={styles.tableHeader}>
              <View style={{ flex: 1 }} />
              <View style={styles.colHeader}>
                <Text style={styles.colHeaderFree}>Free</Text>
              </View>
              <View style={[styles.colHeader, styles.colHeaderProWrap]}>
                <Text style={styles.colHeaderPro}>Pro</Text>
              </View>
            </View>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <View key={row.label} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.colCell}>
                  {row.free
                    ? <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                    : <MaterialCommunityIcons name="close-circle" size={20} color={Colors.outline + '60'} />
                  }
                </View>
                <View style={[styles.colCell, styles.colCellPro]}>
                  {row.pro
                    ? <MaterialCommunityIcons name="check-circle" size={20} color={PREMIUM_COLOR} />
                    : <MaterialCommunityIcons name="close-circle" size={20} color={Colors.outline + '60'} />
                  }
                </View>
              </View>
            ))}

            {/* Pro column glow strip */}
            <View style={styles.proColumnGlow} pointerEvents="none" />
          </View>

          {/* ── Social proof ── */}
          <View style={styles.socialRow}>
            {['Students', 'Freelancers', 'Founders'].map((label) => (
              <View key={label} style={styles.socialChip}>
                <Text style={styles.socialChipText}>{label}</Text>
              </View>
            ))}
            <Text style={styles.socialLine}>all use Momentum Pro</Text>
          </View>

          {/* ── CTA ── */}
          <Animated.View style={{ transform: [{ scale: pulse }], marginTop: 4 }}>
            <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={handleTrial}>
              <View style={styles.ctaShine} />
              <Text style={styles.ctaLabel}>Start 14‑day free trial</Text>
              <View style={styles.ctaPill}>
                <Text style={styles.ctaPillText}>No card needed</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.secondary}
            onPress={() => { setHasSeenProOffer(true); goNext(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryLabel}>Continue with free version</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const COL_W = 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  blob1: { position: 'absolute', top: -80,  right: -80,  width: 300, height: 300, borderRadius: 150, backgroundColor: PREMIUM_COLOR + '0d' },
  blob2: { position: 'absolute', bottom: 60, left: -100, width: 280, height: 280, borderRadius: 140, backgroundColor: Colors.primary   + '08' },

  scroll: { paddingHorizontal: Spacing.gutter, paddingBottom: 32, gap: 20 },

  // Hero
  hero: { gap: 10, marginTop: 4 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: PREMIUM_COLOR, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  proBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#fff', letterSpacing: 0.8 },
  kickerText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: PREMIUM_COLOR, textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 30, lineHeight: 36, color: Colors.onSurface, letterSpacing: -0.5 },
  sub: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, lineHeight: 22 },

  // Table
  table: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '60',
    overflow: 'hidden',
    ...Shadow.card,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '50',
    backgroundColor: Colors.surfaceContainer,
  },
  colHeader: {
    width: COL_W,
    alignItems: 'center',
  },
  colHeaderFree: {
    fontFamily: 'Manrope_700Bold', fontSize: 12,
    color: Colors.onSurfaceVariant, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  colHeaderProWrap: {
    backgroundColor: PREMIUM_COLOR + '15',
    borderRadius: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PREMIUM_COLOR + '30',
  },
  colHeaderPro: {
    fontFamily: 'Manrope_800ExtraBold', fontSize: 12,
    color: PREMIUM_COLOR, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  tableRowAlt: { backgroundColor: Colors.surfaceContainer + '55' },
  rowLabel: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
    lineHeight: 18,
    paddingRight: 8,
  },
  colCell: { width: COL_W, alignItems: 'center' },
  colCellPro: {
    backgroundColor: PREMIUM_COLOR + '08',
    borderRadius: 8,
    paddingVertical: 4,
  },

  // Subtle glow strip over the Pro column
  proColumnGlow: {
    position: 'absolute',
    top: 0, bottom: 0,
    right: 0,
    width: COL_W,
    backgroundColor: PREMIUM_COLOR + '06',
    pointerEvents: 'none',
  },

  // CTA
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
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 10,
    overflow: 'hidden',
  },
  ctaShine: {
    position: 'absolute', top: -18, left: 28,
    width: 120, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '22deg' }],
  },
  ctaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.1 },
  ctaPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  ctaPillText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#fff' },

  socialRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  socialChip: {
    backgroundColor: PREMIUM_COLOR + '12',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: PREMIUM_COLOR + '25',
  },
  socialChipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: PREMIUM_COLOR },
  socialLine: { fontFamily: 'Manrope_500Medium', fontSize: 12, color: Colors.onSurfaceVariant },

  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline, textDecorationLine: 'underline' },
});
