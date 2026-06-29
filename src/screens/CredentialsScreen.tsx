import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { TopBar } from '../components/TopBar';
import { useAppStore } from '../store/useAppStore';
import { syncOnboardingProfileToSupabase } from '../repositories/profileSync';

type Props = NativeStackScreenProps<RootStackParamList, 'Credentials'>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function CredentialsScreen({ navigation }: Props) {
  const { account, setAccount } = useAppStore();
  const [name, setName] = useState(account.name ?? '');
  const [email, setEmail] = useState(account.email ?? '');
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    const n = name.trim();
    const e = email.trim();
    return n.length >= 2 && isValidEmail(e);
  }, [email, name]);

  const onContinue = () => {
    if (!canContinue) {
      setError('Please enter a valid name and email.');
      return;
    }
    setError(null);
    setAccount({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: account.createdAt ?? new Date().toISOString(),
    });
    syncOnboardingProfileToSupabase();
    navigation.replace('MainTabs', { screen: 'Schedule' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar onBack={() => navigation.goBack()} />

      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <View style={styles.checkRing}>
            <View style={styles.checkBg}>
              <MaterialCommunityIcons name="account-plus-outline" size={22} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>
            Save your progress across sessions. We’ll store this on your device for now.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={(t) => { setName(t); if (error) setError(null); }}
              placeholder="Your name"
              placeholderTextColor={Colors.outline}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
              placeholder="you@example.com"
              placeholderTextColor={Colors.outline}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
          activeOpacity={0.88}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <View style={styles.ctaShine} />
          <Text style={styles.ctaLabel}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skip}
          onPress={() => navigation.replace('MainTabs', { screen: 'Focus' })}
          activeOpacity={0.85}
        >
          <Text style={styles.skipLabel}>Skip for now</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceContainerHigh },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.primary + '0f',
  },
  blob2: {
    position: 'absolute',
    bottom: 60,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryFixed + '35',
  },
  content: { flex: 1, paddingHorizontal: Spacing.gutter, paddingTop: Spacing.md, gap: 16 },
  hero: { alignItems: 'center', gap: 10, marginTop: 6 },
  checkRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: Colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '06',
  },
  checkBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  title: { ...Typography.displayLg, fontSize: 28, lineHeight: 34, color: Colors.onSurface, textAlign: 'center' },
  sub: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 320, lineHeight: 24 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.card,
    padding: 16,
    gap: 12,
  },
  field: { gap: 6 },
  fieldLabel: { ...Typography.labelSm, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 },
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
  error: { ...Typography.bodyMd, color: Colors.error, marginTop: 2 },
  cta: {
    marginTop: 'auto',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    marginBottom: 18,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaShine: {
    position: 'absolute',
    top: -18,
    left: 30,
    width: 110,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '25deg' }],
  },
  ctaLabel: { ...Typography.headlineSm, color: Colors.onPrimary, fontFamily: 'Manrope_700Bold' },
  skip: { alignItems: 'center', paddingVertical: 8, marginBottom: 10 },
  skipLabel: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: Colors.outline, textDecorationLine: 'underline' },
});

