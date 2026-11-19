import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AnnouncementBoard } from '@/components/AnnouncementBoard';
import { FormModal } from '@/components/FormModal';
import { RealtimeChat } from '@/components/RealtimeChat';
import { Button, EmptyState, InlineError, Segmented, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { clubRoleLabel } from '@/lib/format';
import type { Club, ClubMember, ClubRole, Profile } from '@/types/database';

type Member = ClubMember;
type ClubTab = 'feed' | 'chat';

export default function ClubDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const clubId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<ClubTab>('feed');
  const [joining, setJoining] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const membership = useMemo(
    () => members.find((member) => member.user_id === profile?.id) ?? null,
    [members, profile?.id],
  );
  const adminCount = members.filter((member) => member.role === 'admin').length;

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data } = await api.get<Club & { members: Member[] }>(`/api/clubs/${clubId}`);
      setClub(data);
      setMembers(data.members);
      setMissing(false);
    } catch {
      setMissing(true);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function join() {
    if (!profile || !clubId) return;
    setJoining(true);
    try {
      await api.post(`/api/clubs/${clubId}/join`);
    } catch (joinError) {
      Alert.alert('Katılınamadı', errorMessage(joinError));
      return;
    } finally {
      setJoining(false);
    }
    await load();
  }

  function leave() {
    if (!profile || !clubId || !membership) return;
    if (membership.role === 'admin' && adminCount < 2) {
      Alert.alert('Ayrılmadan önce', 'Kulüpte başka bir yönetici kalsın. Üyelerden birini yönetici yap.');
      return;
    }
    Alert.alert('Kulüpten ayrıl', 'Duyuru ve sohbet erişimin kapanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/clubs/${clubId}/members/me`);
          } catch (leaveError) {
            Alert.alert('Ayrılınamadı', errorMessage(leaveError));
            return;
          }
          router.back();
        },
      },
    ]);
  }

  async function searchPeople() {
    const safe = query.trim().replace(/[%_]/g, '');
    if (safe.length < 2) {
      setFormError('En az 2 karakter yaz.');
      return;
    }
    setSearching(true);
    setFormError(null);
    try {
      const { data } = await api.get<Profile[]>('/api/users', { params: { query: safe } });
      const existing = new Set(members.map((member) => member.user_id));
      setResults(data.filter((person) => !existing.has(person.id)));
    } catch (searchError) {
      setFormError(errorMessage(searchError));
    } finally {
      setSearching(false);
    }
  }

  async function invite(person: Profile) {
    if (!clubId) return;
    try {
      await api.post(`/api/clubs/${clubId}/members`, { user_id: person.id });
    } catch (inviteError) {
      setFormError(errorMessage(inviteError));
      return;
    }
    setResults((current) => current.filter((item) => item.id !== person.id));
    await load();
  }

  async function setRole(member: Member, role: ClubRole) {
    if (!clubId || member.user_id === profile?.id) return;
    try {
      await api.put(`/api/clubs/${clubId}/members/${member.user_id}/role`, { role });
    } catch (roleError) {
      Alert.alert('Rol değişmedi', errorMessage(roleError));
      return;
    }
    await load();
  }

  if (!clubId || missing || !club) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Kulüp' }} />
        {missing ? (
          <EmptyState title="Kulüp bulunamadı" body="Bu kulüp silinmiş olabilir." />
        ) : (
          <ActivityIndicator color={colors.wine} />
        )}
      </View>
    );
  }

  const isAdmin = membership?.role === 'admin';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: club.name }} />
      <View style={styles.meta}>
        <Text style={styles.description}>{club.description || 'Bu kulübün henüz açıklaması yok.'}</Text>
        <Text style={styles.count}>
          {membership
            ? `${members.length} üye · ${clubRoleLabel[membership.role]}`
            : 'Katılınca duyurular ve sohbet açılır.'}
        </Text>
        <View style={styles.actions}>
          {!membership ? <Button label="Kulübe katıl" onPress={join} loading={joining} /> : null}
          {membership ? (
            <Button label="Üyeler" onPress={() => setMembersOpen(true)} variant="secondary" />
          ) : null}
          {isAdmin ? (
            <Button
              label="Davet et"
              onPress={() => {
                setFormError(null);
                setInviteOpen(true);
              }}
              variant="secondary"
            />
          ) : null}
          {membership ? <Button label="Ayrıl" onPress={leave} variant="ghost" /> : null}
        </View>
      </View>

      {membership ? (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'feed', label: 'Duyurular' },
              { value: 'chat', label: 'Sohbet' },
            ]}
          />
          <View style={styles.body}>
            {tab === 'feed' ? (
              <AnnouncementBoard
                scopeType="club"
                scopeId={clubId}
                canPost={!!isAdmin}
                hint="Kulüp duyurularını yalnızca yöneticiler paylaşır."
              />
            ) : (
              <RealtimeChat channelType="club" channelId={clubId} keyboardOffset={88} />
            )}
          </View>
        </>
      ) : (
        <EmptyState
          title="Önce katıl"
          body="Duyurular ve sohbet yalnızca kulüp üyelerine açık."
        />
      )}

      <FormModal visible={inviteOpen} title="Üye davet et" onClose={() => setInviteOpen(false)}>
        <TextField label="Ad soyad" value={query} onChangeText={setQuery} placeholder="Kimi arıyorsun?" autoCapitalize="words" />
        <Button label="Ara" onPress={searchPeople} loading={searching} variant="secondary" />
        <InlineError message={formError} />
        {results.map((person) => (
          <Pressable key={person.id} style={styles.result} onPress={() => invite(person)}>
            <Text style={styles.resultName}>{person.full_name}</Text>
            <Text style={styles.resultAction}>Davet et</Text>
          </Pressable>
        ))}
      </FormModal>

      <FormModal visible={membersOpen} title="Üyeler" onClose={() => setMembersOpen(false)}>
        {members.map((member) => (
          <View key={member.user_id} style={styles.member}>
            <View style={styles.memberCopy}>
              <Text style={styles.resultName}>{member.full_name}</Text>
              <Text style={styles.memberRole}>{clubRoleLabel[member.role]}</Text>
            </View>
            {isAdmin && member.user_id !== profile?.id ? (
              <Pressable onPress={() => setRole(member, member.role === 'admin' ? 'member' : 'admin')}>
                <Text style={styles.resultAction}>{member.role === 'admin' ? 'Üye yap' : 'Yönetici yap'}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, backgroundColor: colors.cream, justifyContent: 'center' },
  meta: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  description: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  count: { color: colors.muted, fontSize: 13 },
  actions: { gap: 8, marginBottom: 8 },
  body: { flex: 1 },
  result: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultName: { color: colors.ink, fontWeight: '700' },
  resultAction: { color: colors.wine, fontWeight: '700' },
  member: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  memberCopy: { flex: 1, gap: 2 },
  memberRole: { color: colors.muted, fontSize: 12 },
});
