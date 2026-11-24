import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Users } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, PageHeader, SafeScreen, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';
import { initialOf } from '@/lib/format';
import * as clubService from '@/services/clubService';
import type { ClubCategory, ClubListItem } from '@/types/club';
import { CLUB_CATEGORIES } from '@/types/club';

const LOGO_PRESETS = ['#8B2635', '#2E7D32', '#1565C0', '#6A1B9A', '#EF6C00', '#00838F'];

export default function ClubsScreen() {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<ClubListItem[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ClubCategory>('teknoloji');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const [list, allowed] = await Promise.all([
        clubService.listClubs(profile.id),
        clubService.canCreateClub(profile.id, profile.system_role),
      ]);
      setClubs(list);
      setCanCreate(allowed || Boolean(profile.can_create_club));
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

  async function pickLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setLogoUrl(result.assets[0].uri);
    }
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
      const created = await clubService.createClub({
        name: name.trim(),
        description: description.trim(),
        category,
        logo_url: logoUrl,
        creator: { user_id: profile.id, full_name: profile.full_name },
      });
      setName('');
      setDescription('');
      setCategory('teknoloji');
      setLogoUrl(null);
      setOpen(false);
      router.push(`/club/${created.id}`);
    } catch (insertError) {
      setFormError(errorMessage(insertError, 'Kulüp oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  function membershipLabel(item: ClubListItem) {
    if (item.membership === 'admin') return 'Yönetici';
    if (item.membership === 'member') return 'Üye';
    return 'Katıl';
  }

  return (
    <SafeScreen>
      <PageHeader kicker="Topluluk" title="Kulüpler" subtitle="Keşfet, katıl veya yeni bir kulüp aç" />
      <View style={styles.actions}>
        {canCreate ? (
          <Button
            label="Kulüp oluştur"
            onPress={() => {
              setFormError(null);
              setOpen(true);
            }}
          />
        ) : (
          <Text style={styles.permissionNote}>
            Kulüp açma yetkisi için idari birimle iletişime geçin.
          </Text>
        )}
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
            body="Yetkin varsa ilk kulübü sen kur. Üyeler duyuruları içeride görür."
          />
        }
        renderItem={({ item }) => {
          const markColor = item.logo_url?.startsWith('#') ? item.logo_url : colors.wine;
          return (
            <AnimatedPressable style={styles.card} onPress={() => router.push(`/club/${item.id}`)}>
              <View style={[styles.mark, { backgroundColor: markColor }]}>
                <Text style={styles.markText}>{initialOf(item.name)}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {item.description || 'Açıklama eklenmemiş.'}
                </Text>
                <Text style={styles.category}>
                  {CLUB_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category}
                </Text>
              </View>
              <Text style={styles.role}>{membershipLabel(item)}</Text>
            </AnimatedPressable>
          );
        }}
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
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chips}>
          {CLUB_CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>Logo / kapak</Text>
        <View style={styles.chips}>
          {LOGO_PRESETS.map((c) => (
            <Pressable
              key={c}
              style={[styles.swatch, { backgroundColor: c }, logoUrl === c && styles.swatchActive]}
              onPress={() => setLogoUrl(c)}
            />
          ))}
        </View>
        <Button label="Galeriden seç" onPress={pickLogo} variant="secondary" />
        {logoUrl && !logoUrl.startsWith('#') ? (
          <Text style={styles.note} numberOfLines={1}>
            Seçilen görsel: {logoUrl}
          </Text>
        ) : null}
        <Text style={styles.note}>Kulübü açan kişi yönetici olur. Diğerleri katılabilir.</Text>
        <InlineError message={formError} />
        <Button label="Oluştur" onPress={createClub} loading={saving} />
      </FormModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 20, marginBottom: 8 },
  permissionNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.goldSoft,
    borderRadius: 14,
    padding: 12,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.cream, fontSize: 18, fontWeight: '700' },
  copy: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  category: { color: colors.wineDeep, fontSize: 11, fontWeight: '700', marginTop: 2 },
  role: { color: colors.wine, fontSize: 12, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.wine, borderColor: colors.wine },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.cream },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.ink },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
