import { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Paperclip } from 'lucide-react-native';

import { AnnouncementBoard } from '@/components/AnnouncementBoard';
import { FormModal } from '@/components/FormModal';
import { InviteStudentsModal } from '@/components/InviteStudentsModal';
import { Button, EmptyState, InlineError, Segmented, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useActiveRole } from '@/hooks/useActiveRole';
import { errorMessage } from '@/lib/errors';
import { getClassroom } from '@/services/classroomService';
import { createMaterial, getMaterials } from '@/services/materialService';
import type { Classroom, ClassroomMaterial, MaterialType } from '@/types/classroom';

type Tab = 'feed' | MaterialType;

export default function ClassroomDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const classroomId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile } = useAuth();
  const { isTeacher, isAdmin } = useActiveRole();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [items, setItems] = useState<ClassroomMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = Boolean(classroom?.can_manage_content);
  const canInvite = Boolean(classroomId && classroom && (isTeacher || isAdmin) && (classroom.is_owner || isAdmin));
  const materialTab = tab === 'note' || tab === 'assignment' ? tab : null;

  const load = useCallback(async () => {
    if (!classroomId) return;
    setError(null);
    try {
      const room = await getClassroom(classroomId, profile?.id);
      setClassroom(room);
      if (tab === 'note' || tab === 'assignment') {
        setItems(await getMaterials(classroomId, tab));
      } else {
        setItems([]);
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'Sınıf yüklenemedi.'));
    }
  }, [classroomId, profile?.id, tab]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    } catch (pickError) {
      setFormError(errorMessage(pickError, 'Dosya seçilemedi.'));
    }
  }

  async function publish() {
    if (!classroomId || !materialTab || !title.trim()) {
      setFormError('Başlık gerekli.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createMaterial(classroomId, {
        title,
        content,
        type: materialTab,
        file: file ?? undefined,
      });
      setOpen(false);
      setTitle('');
      setContent('');
      setFile(null);
      await load();
    } catch (publishError) {
      setFormError(errorMessage(publishError, 'Paylaşım kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function openFile(item: ClassroomMaterial) {
    if (!item.file_url) {
      Alert.alert('Dosya yok', 'Bu paylaşımda indirilebilir dosya bulunmuyor.');
      return;
    }
    try {
      await Linking.openURL(item.file_url);
    } catch (openError) {
      Alert.alert('Açılamadı', errorMessage(openError, 'Dosya açılamadı.'));
    }
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: classroom?.name ?? 'Sınıf' }} />
      {classroom ? (
        <View style={styles.meta}>
          <Text style={styles.course}>{classroom.course_name}</Text>
          <Text style={styles.teacher}>{classroom.teacher_name}</Text>
          {canInvite ? (
            <View style={styles.inviteAction}>
              <Button label="Öğrenci Davet Et / Yetkilendir" variant="secondary" onPress={() => setInviteOpen(true)} />
            </View>
          ) : null}
        </View>
      ) : null}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'feed', label: 'Duyurular' },
          { value: 'note', label: 'Notlar' },
          { value: 'assignment', label: 'Ödevler' },
        ]}
      />
      {tab === 'feed' && classroomId ? (
        <View style={styles.body}>
          <AnnouncementBoard
            scopeType="class"
            scopeId={classroomId}
            canPost={canManage}
            hint="Sınıf duyurularını akademisyen, idari veya yetkilendirilmiş üye ekler."
          />
        </View>
      ) : (
        <>
          {canManage && materialTab ? (
            <View style={styles.actions}>
              <Button
                label={materialTab === 'note' ? 'Not ekle' : 'Ödev ekle'}
                onPress={() => {
                  setFormError(null);
                  setOpen(true);
                }}
              />
            </View>
          ) : null}
          <InlineError message={error} />
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.wine} />}
            ListEmptyComponent={
              <EmptyState
                title={materialTab === 'note' ? 'Not yok' : 'Ödev yok'}
                body={canManage ? 'İlk paylaşımı sen ekle.' : 'Paylaşım geldiğinde burada görünür.'}
                icon={<FileText color={colors.wine} size={28} />}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.content ? <Text style={styles.cardBody}>{item.content}</Text> : null}
                {item.file_name ? (
                  <Button label={item.file_name} variant="secondary" onPress={() => void openFile(item)} />
                ) : null}
              </View>
            )}
          />
        </>
      )}

      <FormModal
        visible={open && materialTab !== null}
        title={materialTab === 'note' ? 'Not ekle' : 'Ödev ekle'}
        onClose={() => setOpen(false)}
        footer={<Button label="Paylaş" onPress={() => void publish()} loading={saving} />}
      >
        <TextField label="Başlık" value={title} onChangeText={setTitle} />
        <TextField label="İçerik" value={content} onChangeText={setContent} multiline />
        <Button
          label={file ? file.name : 'Dosya seç (PDF, Word, TXT)'}
          variant="secondary"
          onPress={() => void pickFile()}
        />
        {file ? (
          <View style={styles.fileRow}>
            <Paperclip color={colors.wine} size={16} />
            <Text style={styles.fileName}>{file.name}</Text>
          </View>
        ) : null}
        <InlineError message={formError} />
      </FormModal>

      {classroomId ? (
        <InviteStudentsModal
          visible={inviteOpen}
          classId={classroomId}
          onClose={() => setInviteOpen(false)}
          onSent={() => void load()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  meta: { paddingHorizontal: 20, paddingTop: 8, gap: 6 },
  course: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  teacher: { color: colors.muted, fontSize: 13 },
  inviteAction: { marginTop: 4 },
  body: { flex: 1 },
  actions: { paddingHorizontal: 20, paddingTop: 8 },
  list: { padding: 20, gap: 12, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    ...softShadow,
  },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  cardBody: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileName: { color: colors.muted, fontSize: 13, flex: 1 },
});
