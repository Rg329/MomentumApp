import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { supabase } from '../supabase/client';
import { formatSupabaseAuthError } from '../supabase/config';
import { useAppStore } from '../store/useAppStore';
import { runPostSignInSync } from '../auth/onSignInSync';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type Step = 'email' | 'otp';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthScreen({ navigation, route }: Props) {
  const fromSavePrompt = route.params?.fromSavePrompt ?? false;
  const fromCheckIn = route.params?.fromCheckIn ?? false;
  const fromInsights = route.params?.fromInsights ?? false;
  const { account, setAccount, dismissSavePrompt } = useAppStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(account.email ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledSession = useRef(false);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  // Listen for auth state changes (handles magic link fallback)
  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') completeSignIn(session.user.email);
    });
    return () => authSub.subscription.unsubscribe();
  }, []);

  const completeSignIn = async (signedInEmail: string | null | undefined) => {
    if (handledSession.current) return;
    handledSession.current = true;
    const normalizedEmail = (signedInEmail ?? email).trim().toLowerCase();
    setAccount({
      email: normalizedEmail,
      createdAt: account.createdAt ?? new Date().toISOString(),
    });

    try {
      await runPostSignInSync();
    } catch (e) {
      console.warn('[Auth] Post sign-in sync failed:', e);
    }

    if (fromSavePrompt) {
      dismissSavePrompt();
      navigation.replace('MainTabs', { screen: 'Schedule' });
      return;
    }
    if (fromCheckIn) {
      navigation.replace('MainTabs', { screen: 'Schedule' });
      return;
    }
    if (fromInsights) {
      navigation.replace('MainTabs', { screen: 'Insights' });
      return;
    }
    navigation.replace('Credentials');
  };

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!isValidEmail(email) || resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setOtp('');
    handledSession.current = false;

    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (e) throw e;
      startResendCooldown(60);
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e: unknown) {
      setError(formatSupabaseAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.trim();
    if (code.length < 6 || loading) return;
    setLoading(true);
    setError(null);
    handledSession.current = false;

    try {
      const { data, error: e } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (e) throw e;
      if (data.session) completeSignIn(data.session.user.email);
    } catch (e: unknown) {
      setError(formatSupabaseAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const canSend = useMemo(() => isValidEmail(email), [email]);
  const canVerify = otp.trim().length >= 6;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => step === 'otp' ? (setStep('email'), setError(null), setOtp('')) : navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.onSurface} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.kicker}>
            {fromSavePrompt ? 'SAVE YOUR PLAN' : 'WELCOME TO MOMENTUM'}
          </Text>
          <Text style={styles.title}>
            {step === 'email'
              ? (fromSavePrompt ? 'Back up today\'s\nplan' : 'Sign in to\ncontinue')
              : 'Enter your\ncode'}
          </Text>
          <Text style={styles.sub}>
            {step === 'email'
              ? (fromSavePrompt
                ? 'Sign in with a one-time code — your tasks and schedule sync to your account.'
                : 'We will send a sign-in code to your email. No password needed.')
              : `We sent a code to\n${email.trim().toLowerCase()}`}
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          {step === 'email' ? (
            <>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={sendOtp}
              />
            </>
          ) : (
            <>
              <View style={styles.otpIconRow}>
                <View style={styles.otpIcon}>
                  <MaterialCommunityIcons name="email-check-outline" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.otpIconLabel}>Code sent — check your inbox</Text>
              </View>

              <Text style={styles.label}>Sign-in code</Text>
              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '').slice(0, 8);
                  setOtp(digits);
                  if (error) setError(null);
                }}
                placeholder="00000000"
                placeholderTextColor={Colors.outline}
                keyboardType="number-pad"
                style={[styles.input, styles.otpInput]}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={verifyOtp}
                maxLength={8}
              />
              <Text style={styles.otpHint}>
                Can't find it? Check your spam folder.
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* ── CTA ── */}
        {step === 'email' ? (
          <TouchableOpacity
            style={[styles.cta, !canSend && styles.ctaDisabled]}
            onPress={sendOtp}
            disabled={!canSend || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaLabel}>Send code</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.cta, !canVerify && styles.ctaDisabled]}
              onPress={verifyOtp}
              disabled={!canVerify || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaLabel}>Verify code</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondary}
              onPress={sendOtp}
              disabled={resendCooldown > 0 || loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryLabel, resendCooldown > 0 && { color: Colors.outline + '80' }]}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondary}
              onPress={() => { setStep('email'); setError(null); setOtp(''); }}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => {
            if (fromSavePrompt) {
              dismissSavePrompt();
              navigation.replace('MainTabs', { screen: 'Schedule' });
            } else {
              navigation.replace('MainTabs', { screen: 'Focus' });
            }
          }}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryLabel}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob1: {
    position: 'absolute', top: -90, right: -90,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: Colors.primary + '10',
  },
  blob2: {
    position: 'absolute', bottom: 60, left: -110,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.primaryFixed + '35',
  },
  content: { flexGrow: 1, paddingHorizontal: Spacing.gutter, paddingTop: 28, paddingBottom: 24, gap: 18 },
  hero: { gap: 8, marginTop: 6 },
  kicker: { ...Typography.labelSm, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 10 },
  title: { ...Typography.displayLg, color: Colors.onSurface, fontSize: 30, lineHeight: 36 },
  sub: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, lineHeight: 24, maxWidth: 340 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 10,
    ...Shadow.card,
  },
  label: { ...Typography.labelSm, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '35',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  otpInput: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  otpIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  otpIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  otpIconLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: Colors.onSurface, flex: 1 },
  otpHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: Colors.outline },
  error: { ...Typography.bodyMd, color: Colors.error, marginTop: 4 },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaLabel: { ...Typography.headlineSm, color: Colors.onPrimary, fontFamily: 'Manrope_700Bold' },
  secondary: { alignItems: 'center', paddingVertical: 6 },
  secondaryLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline, textDecorationLine: 'underline' },
});
