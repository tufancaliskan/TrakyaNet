import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Megaphone } from 'lucide-react-native';

import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import * as clubService from '@/services/clubService';
import type { ClubAnnouncement, ClubDepartment } from '@/types/club';

type Props = {
  clubId: string;
  canPost: boolean;
  departments: ClubDepartment[];
  hint: string;
};

export function ClubAnnouncementBoard({ clubId, canPost, departments, hint }: Props) {
  const { profile } = useAuth();
  const [items, setItems] = useState<ClubAnnouncement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetDepartmentId, setTargetDepartmentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await clubService.listClubAnnouncements(clubId));
    } catch (e) {
      setError(errorMessage(e, 'Duyurular yüklenemedi.'));
    }
  }, [clubId]);

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
    if (!title.trim() || !content.trim()) {
      setFormError('Başlık ve metin gerekli.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await clubService.createClubAnnouncement(clubId, {
        title: title.trim(),
        content: content.trim(),
        target_department_id: targetDepartmentId,
        author: { user_id: profile.id, full_name: profile.full_name },
      });
      setTitle('');
      setContent('');
      setTargetDepartmentId(null);
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(errorMessage(e, 'Duyuru paylaşılamadı.'));
    } finally {
      setSaving(false);
    }
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
            {canPost ? (
              <Button
                label="Duyuru ekle"
                onPress={() => {
                  setFormError(null);
                  setOpen(true);
                }}
              />
            ) : (
              <Text style={styles.hint}>{hint}</Text>
            )}
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.target_department_name ?? 'Tüm kulüp'}</Text>
              </View>
            </View>
            <Text style={styles.cardBody}>{item.content}</Text>
            <Text style={styles.meta}>
              {item.author_name} · {formatDateTime(item.created_at)}
            </Text>
          </View>
        )}
      />
      <FormModal visible={open} title="Yeni duyuru" onClose={() => setOpen(false)}>
        <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Toplantı saati" />
        <TextField label="Metin" value={content} onChangeText={setContent} placeholder="Kısa ve net yaz." multiline />
        <Text style={styles.label}>Hedef kitle</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, targetDepartmentId === null && styles.chipActive]}
            onPress={() => setTargetDepartmentId(null)}
          >
            <Text style={[styles.chipText, targetDepartmentId === null && styles.chipTextActive]}>Tüm kulüp</Text>
          </Pressable>
          {departments.map((dept) => {
            const active = targetDepartmentId === dept.id;
            return (
              <Pressable
                key={dept.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTargetDepartmentId(dept.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{dept.name}</Text>
              </Pressable>
            );
          })}
        </View>
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
    ...softShadow,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '700' },
  badge: {
    backgroundColor: colors.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.wineDeep, fontSize: 11, fontWeight: '800' },
  cardBody: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.muted, fontSize: 12 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
});
