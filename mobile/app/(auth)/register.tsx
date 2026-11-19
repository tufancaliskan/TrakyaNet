import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Button, InlineError, TextField } from '@/components/ui';
import { colors, displayFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setNotice(null);
    if (fullName.trim().length < 2) {
      setError('Ad soyad en az 2 karakter olmalı.');
      return;
    }
    if (!email.includes('@')) {
      setError('Geçerli bir e-posta yaz.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler aynı değil.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({ fullName, email, password });
      if (result === 'confirm_email') {
        setNotice('Hesap açıldı. Giriş yapmadan önce e-postandaki doğrulama bağlantısına bak.');
      }
    } catch (signUpError) {
      setError(errorMessage(signUpError, 'Kayıt tamamlanamadı.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.kicker}>YENİ HESAP</Text>
          <Text style={styles.mark}>Aramıza katıl</Text>
        </View>
        <View style={styles.sheet}>
          <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} placeholder="Ayşe Yılmaz" autoCapitalize="words" />
          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ad@okul.edu.tr"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <TextField label="Şifre tekrar" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
          <Text style={styles.note}>Yeni hesaplar öğrenci olarak açılır. Öğretmen ve yönetici rolünü okul yöneticisi atar.</Text>
          <InlineError message={error} />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Button label="Hesap oluştur" onPress={onSubmit} loading={loading} />
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>
                Zaten hesabın var mı? <Text style={styles.linkStrong}>Giriş yap</Text>
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
  hero: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 28, gap: 8 },
  kicker: { color: colors.goldSoft, letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  mark: { color: colors.cream, fontFamily: displayFont, fontSize: 40 },
  sheet: {
    flex: 1,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    gap: 14,
  },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  notice: { color: colors.sage, fontSize: 14, lineHeight: 20 },
  link: { textAlign: 'center', color: colors.muted, fontSize: 14 },
  linkStrong: { color: colors.wine, fontWeight: '700' },
});
