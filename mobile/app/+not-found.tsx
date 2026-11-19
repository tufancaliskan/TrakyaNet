import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui';
import { colors, displayFont } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Sayfa yok</Text>
      <Text style={styles.body}>Bu adres TrakyaNet içinde durmuyor.</Text>
      <Button label="Genel alana dön" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontFamily: displayFont, fontSize: 32, color: colors.ink },
  body: { color: colors.muted, marginBottom: 8 },
});
