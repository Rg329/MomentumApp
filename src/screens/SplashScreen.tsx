import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Spacing, Radius } from '../theme';
import { useAppStore } from '../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);

  // Returning users skip splash — but wait one tick so Zustand finishes
  // rehydrating from AsyncStorage before we read hasOnboarded.
  useEffect(() => {
    const t = setTimeout(() => {
      if (useAppStore.getState().hasOnboarded) {
        navigation.replace('MainTabs');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [navigation]);

  const logoAnim     = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.82)).current;
  const titleAnim    = useRef(new Animated.Value(0)).current;
  const taglineAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim      = useRef(new Animated.Value(0)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const blob1        = useRef(new Animated.Value(0)).current;
  const blob2        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(blob1, { toValue: 1, duration: 5000, useNativeDriver: true }),
      Animated.timing(blob1, { toValue: 0, duration: 5000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(2500),
      Animated.timing(blob2, { toValue: 1, duration: 5000, useNativeDriver: true }),
      Animated.timing(blob2, { toValue: 0, duration: 5000, useNativeDriver: true }),
    ])).start();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(logoAnim,  { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
      Animated.stagger(120, [
        Animated.timing(titleAnim,   { toValue: 1, duration: 560, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(taglineAnim, { toValue: 1, duration: 520, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
      Animated.timing(btnAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const blob1Op = blob1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] });
  const blob2Op = blob2.interpolate({ inputRange: [0, 1], outputRange: [0.4,  0.65] });
  const taglineY = taglineAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const btnY    = btnAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 400, friction: 8 }).start();
  const pressOut = () => Animated.sequence([
    Animated.spring(btnScale, { toValue: 1.02, useNativeDriver: true, tension: 400, friction: 6 }),
    Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 8 }),
  ]).start();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.blob1, { opacity: blob1Op }]} pointerEvents="none" />
      <Animated.View style={[styles.blob2, { opacity: blob2Op }]} pointerEvents="none" />
      <View style={styles.blob3} pointerEvents="none" />

      <View style={styles.center}>
        <Animated.View style={[styles.wordmarkWrap, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
          <Text style={styles.title}>Momentum</Text>
          <Animated.View style={[styles.wordmarkAccent, { opacity: titleAnim }]} />
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: taglineAnim, transform: [{ translateY: taglineY }] }]}>
          Turn your messy day into a plan you'll actually follow.
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, { opacity: btnAnim, transform: [{ translateY: btnY }] }]}>
        <Animated.View style={[{ width: '100%' }, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Onboarding')}
            activeOpacity={1}
            onPressIn={pressIn}
            onPressOut={pressOut}
          >
            <View style={styles.btnShine} pointerEvents="none" />
            <Text style={styles.buttonLabel}>Build my plan</Text>
            <View style={styles.btnArrow}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.taglineRow}>
          <View style={styles.taglineDash} />
          <Text style={styles.taglineBottom}>CALCULATED CALM</Text>
          <View style={styles.taglineDash} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute', top: -80, right: -80,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: Colors.primary + '12',
  },
  blob2: {
    position: 'absolute', bottom: 60, left: -100,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primary + '09',
  },
  blob3: {
    position: 'absolute', top: '35%', left: '20%',
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: Colors.primaryFixed + '30',
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.gutter, gap: 0,
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wordmarkAccent: {
    width: 40, height: 3, borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 10,
    opacity: 0.5,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 52, lineHeight: 60, letterSpacing: -2,
    color: Colors.primary, textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 17, lineHeight: 26, letterSpacing: 0.1,
    color: Colors.onSurfaceVariant,
    textAlign: 'center', maxWidth: 300,
    marginBottom: 8,
  },
  footer: {
    width: '100%',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: 8,
    alignItems: 'center', gap: 16,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32, shadowRadius: 22,
    elevation: 10, overflow: 'hidden',
  },
  btnShine: {
    position: 'absolute', top: -18, left: 30,
    width: 100, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '25deg' }],
  },
  buttonLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17, color: Colors.onPrimary,
    letterSpacing: 0.2,
  },
  btnArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.onPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  taglineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  taglineDash: {
    width: 20, height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.outlineVariant,
  },
  taglineBottom: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10, color: Colors.outline,
    letterSpacing: 3.5, textTransform: 'uppercase',
  },
});
