import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarClock, FileText, Paperclip, Trash2 } from 'lucide-react-native';

import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, TextField } from '@/components/ui';
import { colors, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { createAssignment, openAssignmentFile, pickPdf } from '@/lib/files';
import { formatDate, parseDueDate } from '@/lib/format';
import type { Assignment } from '@/types/database';

export function AssignmentBoard({ classId, canManage }: { classId: string; canManage: boolean }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueInput, setDueInput] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<Assignment[]>('/api/assignments', { params: { class_id: classId } });
      setItems(data);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Ödevler yüklenemedi.'));
    }
  }, [classId]);

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

  async function choosePdf() {
    try {
      const picked = await pickPdf();
      if (!picked) return;
      setFile({ uri: picked.uri, name: picked.name });
    } catch (pickError) {
      setFormError(errorMessage(pickError, 'PDF seçilemedi.'));
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setDueInput('');
    setFile(null);
    setFormError(null);
  }

  async function publish() {
    if (!profile) return;
    const dueDate = parseDueDate(dueInput);
    if (!title.trim()) {
      setFormError('Ödev başlığı gerekli.');
      return;
    }
    if (!dueDate) {
      setFormError('Son teslim tarihini YYYY-AA-GG biçiminde yaz.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createAssignment({
        classId,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        file,
      });
      resetForm();
      setOpen(false);
      await load();
    } catch (publishError) {
      setFormError(errorMessage(publishError));
    } finally {
      setSaving(false);
    }
  }

  async function openFile(assignmentId: string) {
    try {
      await openAssignmentFile(assignmentId);
    } catch (openError) {
      Alert.alert('PDF açılamadı', errorMessage(openError));
    }
  }

  function confirmDelete(item: Assignment) {
    Alert.alert('Ödevi sil', item.title, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/assignments/${item.id}`);
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
            {canManage ? (
              <Button label="Ödev ekle" onPress={() => setOpen(true)} />
            ) : (
              <Text style={styles.hint}>Ödevleri sınıf öğretmeni ekler. PDF varsa karttan açabilirsin.</Text>
            )}
            {error ? <InlineError message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<FileText color={colors.wine} size={28} />}
            title="Ödev yok"
            body={canManage ? 'Başlık, son tarih ve istersen bir PDF ekle.' : 'Öğretmen ödev paylaşınca burada görünecek.'}
          />
        }
        renderItem={({ item }) => {
          const overdue = new Date(item.due_date).getTime() < Date.now();
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {canManage ? (
                  <Pressable accessibilityLabel="Ödevi sil" onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Trash2 color={colors.danger} size={18} />
                  </Pressable>
                ) : null}
              </View>
              {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
              <View style={styles.dueRow}>
                <CalendarClock color={overdue ? colors.danger : colors.sage} size={16} />
                <Text style={[styles.due, overdue && styles.dueLate]}>
                  {overdue ? 'Süresi geçti · ' : 'Son teslim · '}
                  {formatDate(item.due_date)}
                </Text>
              </View>
              {item.file_url ? (
                <Pressable style={styles.fileButton} onPress={() => openFile(item.id)}>
                  <Paperclip color={colors.wine} size={16} />
                  <Text style={styles.fileLabel}>PDF'yi aç</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      <FormModal
        visible={open}
        title="Yeni ödev"
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
      >
        <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Ünite 3 problemleri" />
        <TextField label="Açıklama" value={description} onChangeText={setDescription} placeholder="Ne teslim edilecek?" multiline />
        <TextField
          label="Son teslim"
          value={dueInput}
          onChangeText={setDueInput}
          placeholder="2026-11-28"
          autoCapitalize="none"
        />
        <Button label={file ? file.name : 'PDF ekle'} onPress={choosePdf} variant="secondary" />
        <InlineError message={formError} />
        <Button label="Yayınla" onPress={publish} loading={saving} />
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
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  due: { color: colors.sage, fontSize: 13, fontWeight: '700' },
  dueLate: { color: colors.danger },
  fileButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileLabel: { color: colors.wine, fontWeight: '700' },
});
