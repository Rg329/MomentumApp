import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { supabase } from '../supabase/client';
import { completeMagicLinkSignIn, createSessionFromUrl } from '../supabase/authCallback';
import { formatSupabaseAuthError } from '../supabase/config';
import { useAppStore } from '../store/useAppStore';
import { syncOnboardingProfileToSupabase } from '../repositories/profileSync';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type Step = 'email' | 'sent';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthScreen({ navigation }: Props) {
  const { account, setAccount } = useAppStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(account.email ?? '');
  const [pastedLink, setPastedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledSession = useRef(false);

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  const completeSignIn = (signedInEmail: string | null | undefined) => {
    if (handledSession.current) return;
    handledSession.current = true;
    const normalizedEmail = (signedInEmail ?? email).trim().toLowerCase();
    setAccount({
      email: normalizedEmail,
      createdAt: account.createdAt ?? new Date().toISOString(),
    });
    syncOnboardingProfileToSupabase();
    navigation.replace('Credentials');
  };

  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      if (!url.includes('auth/callback')) return;
      setLoading(true);
      setError(null);
      try {
        const session = await createSessionFromUrl(url);
        if (session) completeSignIn(session.user.email);
      } catch (e: unknown) {
        setError(formatSupabaseAuthError(e));
      } finally {
        setLoading(false);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        completeSignIn(session.user.email);
      }
    });

    return () => {
      linkSub.remove();
      authSub.subscription.unsubscribe();
    };
  }, [account.createdAt, email, navigation, setAccount]);

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
  const canResend = useMemo(() => canSend && resendCooldown === 0, [canSend, resendCooldown]);
  const canCompletePaste = useMemo(() => {
    const value = pastedLink.trim();
    if (!value) return false;
    if (/^\d{6,8}$/.test(value.replace(/\s/g, ''))) return true;
    return value.includes('supabase.co') || value.length > 24;
  }, [pastedLink]);

  const sendMagicLink = async () => {
    if (!canSend || resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setPastedLink('');
    handledSession.current = false;

    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (e) throw e;
      startResendCooldown(60);
      setStep('sent');
      setInfo(
        'Expo Go cannot open the email link in a browser. Copy the link from Gmail and paste it below instead.',
      );
    } catch (e: unknown) {
      setError(formatSupabaseAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const completeFromPaste = async () => {
    if (!canCompletePaste || loading) return;
    setLoading(true);
    setError(null);
    handledSession.current = false;
    try {
      const session = await completeMagicLinkSignIn(pastedLink, email);
      if (session) completeSignIn(session.user.email);
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
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.onSurface} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>WELCOME TO MOMENTUM</Text>
          <Text style={styles.title}>Sign in to continue</Text>
          <Text style={styles.sub}>
            {step === 'email'
              ? 'We’ll email you a secure sign-in link. No password needed.'
              : 'Copy the sign-in link from your email and paste it below.'}
          </Text>
        </View>

        <View style={styles.card}>
          {step === 'email' ? (
            <>
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
                returnKeyType="done"
              />
            </>
          ) : (
            <View style={styles.sentBox}>
              <View style={styles.sentIcon}>
                <MaterialCommunityIcons name="email-check-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.sentEmail}>{email.trim().toLowerCase()}</Text>
              <Text style={styles.sentHint}>
                1. Open the email on this phone{'\n'}
                2. Long-press <Text style={styles.sentBold}>Sign in</Text> → <Text style={styles.sentBold}>Copy link</Text> (not “Copy text”){'\n'}
                3. Paste below — must start with <Text style={styles.sentBold}>https://…supabase.co</Text>{'\n'}
                4. Do not tap the link first (that uses it up)
              </Text>
              <Text style={[styles.label, { marginTop: 12, alignSelf: 'flex-start' }]}>Pasted sign-in link</Text>
              <TextInput
                value={pastedLink}
                onChangeText={(t) => { setPastedLink(t); if (error) setError(null); }}
                placeholder="https://xxxx.supabase.co/auth/v1/verify?token=..."
                placeholderTextColor={Colors.outline}
                style={[styles.input, styles.pasteInput]}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}
        </View>

        {step === 'email' ? (
          <TouchableOpacity
            style={[styles.cta, !canSend && styles.ctaDisabled]}
            onPress={sendMagicLink}
            disabled={!canSend || loading}
            activeOpacity={0.88}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaLabel}>Send sign-in link</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.cta, !canCompletePaste && styles.ctaDisabled]}
              onPress={completeFromPaste}
              disabled={!canCompletePaste || loading}
              activeOpacity={0.88}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaLabel}>Complete sign-in</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondary}
              onPress={sendMagicLink}
              disabled={!canResend || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>
                {resendCooldown > 0 ? `Resend link (${resendCooldown}s)` : 'Resend link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => { setStep('email'); setInfo(null); setError(null); setPastedLink(''); }}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.replace('MainTabs', { screen: 'Schedule' })}
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
  content: { flexGrow: 1, paddingHorizontal: Spacing.gutter, paddingTop: 28, paddingBottom: 24, gap: 18 },
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
  pasteInput: { minHeight: 72, textAlignVertical: 'top' },
  sentBox: { alignItems: 'center', gap: 8, paddingVertical: 4, width: '100%' },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Manrope_700Bold' },
  sentEmail: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'Manrope_600SemiBold' },
  sentHint: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'left', lineHeight: 22, width: '100%' },
  sentBold: { fontFamily: 'Manrope_700Bold', color: Colors.onSurface },
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
