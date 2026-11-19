import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Megaphone, Trash2 } from 'lucide-react-native';

import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, TextField } from '@/components/ui';
import { colors, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { Announcement, ScopeType } from '@/types/database';

type AnnouncementItem = Announcement & { author_name: string };

export function AnnouncementBoard({
  scopeType,
  scopeId,
  canPost,
  hint,
}: {
  scopeType: ScopeType;
  scopeId: string | null;
  canPost: boolean;
  hint: string;
}) {
  const { profile } = useAuth();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<AnnouncementItem[]>('/api/announcements', {
        params: {
          scope_type: scopeType,
          ...(scopeId ? { scope_id: scopeId } : {}),
        },
      });
      setItems(data);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Duyurular yüklenemedi.'));
    }
  }, [scopeId, scopeType]);

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

  async function publish() {
    if (!profile) return;
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      setFormError('Başlık ve metin gerekli.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
    await api.post('/api/announcements', {
      title: nextTitle,
      content: nextContent,
      scope_type: scopeType,
      scope_id: scopeId,
    });
    setTitle('');
    setContent('');
    setOpen(false);
    load();
    } catch (publishError) {
      setFormError(errorMessage(publishError));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item: AnnouncementItem) {
    Alert.alert('Duyuruyu sil', item.title, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/announcements/${item.id}`);
          } catch (deleteError) {
            Alert.alert('Silinemedi', errorMessage(deleteError));
            return;
          }
          setItems((current) => current.filter((row) => row.id !== item.id));
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.wine} />}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {canPost ? <Button label="Duyuru ekle" onPress={() => setOpen(true)} /> : <Text style={styles.hint}>{hint}</Text>}
            {error ? <InlineError message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Megaphone color={colors.wine} size={28} />}
            title="Duyuru yok"
            body={canPost ? 'İlk duyuruyu sen paylaş.' : hint}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {canPost ? (
                <Pressable accessibilityLabel="Duyuruyu sil" onPress={() => confirmDelete(item)} hitSlop={8}>
                  <Trash2 color={colors.danger} size={18} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.cardBody}>{item.content}</Text>
            <Text style={styles.meta}>
              {item.author_name} · {formatDateTime(item.created_at)}
            </Text>
          </View>
        )}
      />
      <FormModal visible={open} title="Yeni duyuru" onClose={() => setOpen(false)}>
        <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Toplantı saati değişti" />
        <TextField
          label="Metin"
          value={content}
          onChangeText={setContent}
          placeholder="Kısa ve net yaz."
          multiline
        />
        <InlineError message={formError} />
        <Button label="Paylaş" onPress={publish} loading={saving} />
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  emptyList: { flexGrow: 1, paddingHorizontal: 20 },
  headerBlock: { gap: 10, marginBottom: 12 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '700' },
  cardBody: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.muted, fontSize: 12 },
});
