import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { GraduationCap } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, PageHeader, SafeScreen, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canManageClasses, initialOf } from '@/lib/format';
import type { SchoolClass } from '@/types/database';

type ClassCard = SchoolClass & { teacher_name: string };

export default function ClassesScreen() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canCreate = canManageClasses(profile?.system_role);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<ClassCard[]>('/api/classes');
      setClasses(data);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Sınıflar yüklenemedi.'));
    }
  }, []);

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

  async function createClass() {
    if (!profile) return;
    if (name.trim().length < 2) {
      setFormError('Sınıf adı en az 2 karakter olmalı.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { data } = await api.post<SchoolClass>('/api/classes', { name: name.trim() });
      setName('');
      setCreateOpen(false);
      router.push(`/class/${data.id}`);
    } catch (insertError) {
      setFormError(errorMessage(insertError, 'Sınıf oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  async function joinClass() {
    setSaving(true);
    setFormError(null);
    try {
      const { data } = await api.post<{ id: string }>('/api/classes/join', {
        code: code.trim().toUpperCase(),
      });
      setCode('');
      setJoinOpen(false);
      router.push(`/class/${data.id}`);
    } catch (joinError) {
      setFormError(errorMessage(joinError, 'Sınıfa katılınamadı.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeScreen>
      <PageHeader
        kicker="Dersler"
        title="Sınıflarım"
        subtitle={canCreate ? 'Sınıf aç veya bir koda katıl' : 'Öğretmeninin verdiği kodla katıl'}
      />
      <View style={styles.actions}>
        {canCreate ? (
          <Button
            label="Sınıf oluştur"
            onPress={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          />
        ) : null}
        <Button
          label="Kod ile katıl"
          onPress={() => {
            setFormError(null);
            setJoinOpen(true);
          }}
          variant={canCreate ? 'secondary' : 'primary'}
        />
      </View>
      {error ? (
        <View style={styles.errorWrap}>
          <InlineError message={error} />
        </View>
      ) : null}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.wine} />}
        contentContainerStyle={classes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<GraduationCap color={colors.wine} size={28} />}
            title="Henüz sınıfın yok"
            body={
              canCreate
                ? 'Yeni bir sınıf açtığında öğrenciler 6 haneli kodla katılır.'
                : 'Öğretmeninden aldığın kodu gir. Kayıtlı sınıfların burada durur.'
            }
          />
        }
        renderItem={({ item }) => {
          const teaching = item.teacher_id === profile?.id;
          return (
            <AnimatedPressable style={styles.card} onPress={() => router.push(`/class/${item.id}`)}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardInitial}>{initialOf(item.name)}</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{teaching ? 'Senin sınıfın' : item.teacher_name}</Text>
              </View>
              {teaching ? <Text style={styles.code}>{item.code}</Text> : null}
            </AnimatedPressable>
          );
        }}
      />
      <FormModal visible={createOpen} title="Yeni sınıf" onClose={() => setCreateOpen(false)}>
        <TextField label="Sınıf adı" value={name} onChangeText={setName} placeholder="11-A Matematik" />
        <Text style={styles.note}>Katılım kodu otomatik üretilir ve yalnızca sana görünür.</Text>
        <InlineError message={formError} />
        <Button label="Oluştur" onPress={createClass} loading={saving} />
      </FormModal>
      <FormModal visible={joinOpen} title="Sınıfa katıl" onClose={() => setJoinOpen(false)}>
        <TextField
          label="Sınıf kodu"
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          placeholder="K4M8QX"
          autoCapitalize="characters"
        />
        <InlineError message={formError} />
        <Button label="Katıl" onPress={joinClass} loading={saving} />
      </FormModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 20, gap: 8, marginBottom: 8 },
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
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: { color: colors.wine, fontSize: 18, fontWeight: '800' },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 13 },
  code: { color: colors.wine, fontWeight: '800', letterSpacing: 1 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
