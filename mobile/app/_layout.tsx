import '@/lib/polyfill';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, displayFont } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isApiConfigured } from '@/lib/api';

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.cream);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {isApiConfigured ? (
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        ) : (
          <SetupScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.boot}>
        <Text style={styles.mark}>TrakyaNet</Text>
        <ActivityIndicator color={colors.wine} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="class/[id]" options={detailHeader} />
        <Stack.Screen name="club/[id]" options={detailHeader} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const detailHeader = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.cream },
  headerTintColor: colors.wine,
  headerTitleStyle: { color: colors.ink, fontWeight: '700' as const },
  title: '',
};

function SetupScreen() {
  return (
    <View style={styles.boot}>
      <Text style={styles.kicker}>KURULUM</Text>
      <Text style={styles.mark}>TrakyaNet</Text>
      <Text style={styles.body}>
        mobile/.env.example dosyasını .env olarak kopyala ve EXPO_PUBLIC_API_URL değerine bilgisayarının yerel IP adresini yaz. Metro'yu yeniden başlat.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  boot: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  kicker: {
    color: colors.gold,
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 12,
  },
  mark: {
    fontFamily: displayFont,
    fontSize: 42,
    color: colors.wine,
  },
  body: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
