import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, InlineError, TextField } from '@/components/ui';
import { colors, displayFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(errorMessage(signInError, 'Giriş yapılamadı.'));
    } finally {
      setLoading(false);
    }
  }

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
          <Text style={styles.heading}>Giriş yap</Text>
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
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.link}>
                Hesabın yok mu? <Text style={styles.linkStrong}>Kayıt ol</Text>
              </Text>
            </Pressable>
          </Link>
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
    gap: 14,
  },
  heading: { fontFamily: displayFont, fontSize: 28, color: colors.ink, marginBottom: 4 },
  link: { textAlign: 'center', color: colors.muted, fontSize: 14 },
  linkStrong: { color: colors.wine, fontWeight: '700' },
});
