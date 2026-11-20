import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, InlineError, TextField } from '@/components/ui';
import { colors, displayFont, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';
import { loadEntry } from '@/lib/onboarding';
import type { SystemRole } from '@/types/database';

const gates: { role: SystemRole; title: string }[] = [
  { role: 'student', title: 'Öğrenci Girişi' },
  { role: 'teacher', title: 'Akademisyen Girişi' },
  { role: 'admin', title: 'İdari Giriş' },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<SystemRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const reveal = useRef(new Animated.Value(1)).current;
  const skipReveal = useRef(true);
  const selected = gates.find((item) => item.role === gate);

  useEffect(() => {
    if (skipReveal.current) {
      skipReveal.current = false;
      return;
    }
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [gate, reveal]);

  useEffect(() => {
    loadEntry().then((saved) => {
      if (!saved) {
        router.replace('/welcome');
        return;
      }
      setGate(saved.role);
      setAllowed(true);
    });
  }, []);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    if (!gate) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password, gate);
    } catch (signInError) {
      setError(errorMessage(signInError, 'Giriş yapılamadı.'));
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) return <View style={styles.root} />;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/trakya-logo.png')}
              style={styles.logo}
              accessibilityLabel="Trakya Üniversitesi logosu"
            />
          </View>
          <Text style={styles.brand}>TrakyaNet</Text>
          <View style={styles.copy}>
            <Text style={styles.kicker}>OKUL AĞI</Text>
            <Text style={styles.tag}>Duyuru, ödev ve kulüp aynı çatı altında.</Text>
          </View>
        </View>
        <View style={styles.sheet}>
          <Animated.View
            style={[
              styles.panel,
              {
                opacity: reveal,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
          {selected ? (
            <>
              <Text style={styles.heading}>{selected.title}</Text>
              <TextField
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="ad@okul.edu.tr"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextField
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                placeholder="En az 6 karakter"
                secureTextEntry
                autoCapitalize="none"
              />
              <InlineError message={error} />
              <Button label="Giriş yap" onPress={onSubmit} loading={loading} />
              <Button label="Seçim paneline dön" variant="secondary" onPress={() => router.push('/welcome')} />
              {gate === 'student' ? (
                <Link href="/register" asChild>
                  <Pressable>
                    <Text style={styles.link}>
                      Hesabın yok mu? <Text style={styles.linkStrong}>Kayıt ol</Text>
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </>
          ) : null}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.wine },
  scroll: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  logoWrap: {
    width: 112,
    height: 112,
  },
  logo: { width: 112, height: 112 },
  brand: {
    marginTop: 12,
    color: '#F6C14A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  copy: { alignSelf: 'stretch', marginTop: 22 },
  kicker: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'left',
  },
  tag: {
    marginTop: 6,
    color: colors.goldSoft,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  panel: { gap: 14 },
  heading: { fontFamily: displayFont, fontSize: 28, color: colors.ink, marginBottom: 4 },
  lead: { color: colors.muted, fontSize: 15, marginTop: -6 },
  choice: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow,
  },
  choiceText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.wine, fontWeight: '700' },
  link: { textAlign: 'center', color: colors.muted, fontSize: 14 },
  linkStrong: { color: colors.wine, fontWeight: '700' },
});
