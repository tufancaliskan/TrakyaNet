import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Users } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, PageHeader, SafeScreen, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { clubRoleLabel, initialOf } from '@/lib/format';
import type { Club } from '@/types/database';

type ClubCard = Club;

export default function ClubsScreen() {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const { data } = await api.get<ClubCard[]>('/api/clubs');
      setClubs(data);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Kulüpler yüklenemedi.'));
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function createClub() {
    if (!profile) return;
    if (name.trim().length < 2) {
      setFormError('Kulüp adı en az 2 karakter olmalı.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { data } = await api.post<Club>('/api/clubs', {
        name: name.trim(),
        description: description.trim(),
      });
      setName('');
      setDescription('');
      setOpen(false);
      router.push(`/club/${data.id}`);
    } catch (insertError) {
      setFormError(errorMessage(insertError, 'Kulüp oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeScreen>
      <PageHeader kicker="Topluluk" title="Kulüpler" subtitle="Keşfet, katıl veya yeni bir kulüp aç" />
      <View style={styles.actions}>
        <Button
          label="Kulüp oluştur"
          onPress={() => {
            setFormError(null);
            setOpen(true);
          }}
        />
      </View>
      {error ? (
        <View style={styles.errorWrap}>
          <InlineError message={error} />
        </View>
      ) : null}
      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.wine} />}
        contentContainerStyle={clubs.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<Users color={colors.wine} size={28} />}
            title="Henüz kulüp yok"
            body="İlk kulübü sen kur. Üyeler duyuruları ve sohbeti içeride görür."
          />
        }
        renderItem={({ item }) => (
          <AnimatedPressable style={styles.card} onPress={() => router.push(`/club/${item.id}`)}>
            <View style={styles.mark}>
              <Text style={styles.markText}>{initialOf(item.name)}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description || 'Açıklama eklenmemiş.'}
              </Text>
            </View>
            <Text style={styles.role}>{item.membership ? clubRoleLabel[item.membership] : 'Katıl'}</Text>
          </AnimatedPressable>
        )}
      />
      <FormModal visible={open} title="Yeni kulüp" onClose={() => setOpen(false)}>
        <TextField label="Kulüp adı" value={name} onChangeText={setName} placeholder="Tiyatro Kulübü" />
        <TextField
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Ne yapıyorsunuz?"
          multiline
        />
        <Text style={styles.note}>Kulübü açan kişi yönetici olur. Diğerleri katılabilir.</Text>
        <InlineError message={formError} />
        <Button label="Oluştur" onPress={createClub} loading={saving} />
      </FormModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 20, marginBottom: 8 },
  errorWrap: { paddingHorizontal: 20, marginBottom: 8 },
  list: { padding: 20, gap: 12 },
  emptyList: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    ...softShadow,
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.cream, fontSize: 18, fontWeight: '700' },
  copy: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  role: { color: colors.wine, fontSize: 12, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
