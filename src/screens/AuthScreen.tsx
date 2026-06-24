import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { supabase } from '../supabase/client';
import { formatSupabaseAuthError } from '../supabase/config';
import { useAppStore } from '../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthScreen({ navigation }: Props) {
  const { account, setAccount } = useAppStore();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(account.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

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

  const canSend = useMemo(() => isValidEmail(email), [email]);
  const canVerify = useMemo(() => code.trim().length >= 6 && isValidEmail(email), [code, email]);
  const canResend = useMemo(() => canSend && resendCooldown === 0, [canSend, resendCooldown]);

  const sendOtp = async () => {
    if (!canSend || resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (e) throw e;
      startResendCooldown(60);
      setStep('code');
      setInfo(
        'Enter the 6-digit code from your email. If you only received a "Confirm email" link, open Supabase → Authentication → Providers → Email and turn off Confirm email, then tap Resend code.',
      );
    } catch (e: unknown) {
      setError(formatSupabaseAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!canVerify) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const token = code.trim();
      let lastError: unknown = null;

      for (const type of ['email', 'signup'] as const) {
        const { error: e } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token,
          type,
        });
        if (!e) {
          setAccount({
            email: normalizedEmail,
            createdAt: account.createdAt ?? new Date().toISOString(),
          });
          navigation.replace('Credentials');
          return;
        }
        lastError = e;
      }

      throw lastError;
    } catch (e: unknown) {
      setError(formatSupabaseAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>WELCOME TO MOMENTUM</Text>
          <Text style={styles.title}>Sign in to continue</Text>
          <Text style={styles.sub}>
            We’ll email you a 6-digit one-time code. No password needed.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
            placeholder="you@example.com"
            placeholderTextColor={Colors.outline}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
            returnKeyType="next"
          />

          {step === 'code' && (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Code</Text>
              <TextInput
                value={code}
                onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); if (error) setError(null); }}
                placeholder="6-digit code"
                placeholderTextColor={Colors.outline}
                keyboardType="number-pad"
                style={styles.input}
                editable={!loading}
                returnKeyType="done"
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}
        </View>

        {step === 'email' ? (
          <TouchableOpacity
            style={[styles.cta, !canSend && styles.ctaDisabled]}
            onPress={sendOtp}
            disabled={!canSend || loading}
            activeOpacity={0.88}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaLabel}>Send code</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.cta, !canVerify && styles.ctaDisabled]}
              onPress={verify}
              disabled={!canVerify || loading}
              activeOpacity={0.88}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaLabel}>Verify & sign in</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondary}
              onPress={sendOtp}
              disabled={!canResend || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.replace('ProOffer')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryLabel}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blob1: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: Colors.primary + '10',
  },
  blob2: {
    position: 'absolute',
    bottom: 60,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryFixed + '35',
  },
  content: { flex: 1, paddingHorizontal: Spacing.gutter, paddingTop: 28, gap: 18 },
  hero: { gap: 8, marginTop: 6 },
  kicker: { ...Typography.labelSm, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 10 },
  title: { ...Typography.displayLg, color: Colors.onSurface, fontSize: 30, lineHeight: 36 },
  sub: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, lineHeight: 24, maxWidth: 340 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
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
  error: { ...Typography.bodyMd, color: Colors.error, marginTop: 6 },
  info: { ...Typography.bodyMd, color: Colors.secondary, marginTop: 6 },
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

