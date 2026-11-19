import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';

import { AnnouncementBoard } from '@/components/AnnouncementBoard';
import { AssignmentBoard } from '@/components/AssignmentBoard';
import { RealtimeChat } from '@/components/RealtimeChat';
import { Button, EmptyState, Segmented } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { SchoolClass } from '@/types/database';

type ClassTab = 'feed' | 'work' | 'chat';

export default function ClassDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const classId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile } = useAuth();
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ClassTab>('feed');

  const load = useCallback(async () => {
    if (!classId || !profile) return;
    try {
      const { data } = await api.get<SchoolClass>(`/api/classes/${classId}`);
      setSchoolClass(data);
      setTeacherName(data.teacher_name);
      setMemberCount(data.member_count);
      setIsMember(data.is_member);
      setMissing(false);
    } catch {
      setMissing(true);
    } finally {
      setReady(true);
    }
  }, [classId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isTeacher = schoolClass?.teacher_id === profile?.id;

  async function copyCode() {
    if (!schoolClass?.code) return;
    await Clipboard.setStringAsync(schoolClass.code);
    Alert.alert('Kopyalandı', 'Sınıf kodu panoya alındı.');
  }

  function leave() {
    if (!profile || !classId) return;
    Alert.alert('Sınıftan ayrıl', 'Duyuru ve ödevlere erişimin kapanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/classes/${classId}/members/me`);
          } catch (leaveError) {
            Alert.alert('Ayrılınamadı', errorMessage(leaveError));
            return;
          }
          router.back();
        },
      },
    ]);
  }

  function removeClass() {
    if (!classId) return;
    Alert.alert('Sınıfı sil', 'Üyelikler, ödevler, duyurular ve sohbet silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/classes/${classId}`);
          } catch (deleteError) {
            Alert.alert('Silinemedi', errorMessage(deleteError));
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (!classId || missing || !ready || !schoolClass) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Sınıf' }} />
        {missing ? (
          <EmptyState title="Sınıf bulunamadı" body="Bu sınıfa kayıtlı değilsin veya sınıf silinmiş." />
        ) : (
          <ActivityIndicator color={colors.wine} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: schoolClass?.name ?? 'Sınıf' }} />
      <View style={styles.meta}>
        <Text style={styles.teacher}>{isTeacher ? 'Sen yönetiyorsun' : teacherName}</Text>
        <Text style={styles.count}>{memberCount} üye</Text>
        {isTeacher && schoolClass ? (
          <Pressable style={styles.codeButton} onPress={copyCode}>
            <Text style={styles.code}>{schoolClass.code}</Text>
            <Copy color={colors.wine} size={16} />
          </Pressable>
        ) : null}
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'feed', label: 'Duyuru' },
          { value: 'work', label: 'Ödev' },
          { value: 'chat', label: 'Sohbet' },
        ]}
      />
      <View style={styles.actions}>
        {isTeacher ? <Button label="Sınıfı sil" onPress={removeClass} variant="ghost" /> : null}
        {!isTeacher && isMember ? <Button label="Sınıftan ayrıl" onPress={leave} variant="ghost" /> : null}
      </View>
      <View style={styles.body}>
        {tab === 'feed' ? (
          <AnnouncementBoard
            scopeType="class"
            scopeId={classId}
            canPost={!!isTeacher}
            hint="Sınıf duyurularını yalnızca öğretmen paylaşır."
          />
        ) : null}
        {tab === 'work' ? <AssignmentBoard classId={classId} canManage={!!isTeacher} /> : null}
        {tab === 'chat' ? <RealtimeChat channelType="class" channelId={classId} keyboardOffset={88} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, backgroundColor: colors.cream, justifyContent: 'center' },
  meta: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  teacher: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 13 },
  codeButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  code: { color: colors.wine, fontWeight: '800', letterSpacing: 1.2 },
  actions: { paddingHorizontal: 20 },
  body: { flex: 1 },
});
