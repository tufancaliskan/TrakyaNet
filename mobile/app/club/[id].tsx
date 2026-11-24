import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Settings } from 'lucide-react-native';

import { ClubAnnouncementBoard } from '@/components/ClubAnnouncementBoard';
import { ClubManageModal } from '@/components/ClubManageModal';
import { ClubMembersModal } from '@/components/ClubMembersModal';
import { Button, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';
import * as clubService from '@/services/clubService';
import type { ClubDetail } from '@/types/club';
import { CLUB_CATEGORIES, emptyPermissions } from '@/types/club';

export default function ClubDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const clubId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile } = useAuth();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const data = await clubService.getClub(clubId, profile?.id);
      setClub(data);
      setMissing(false);
    } catch {
      setMissing(true);
      setClub(null);
    }
  }, [clubId, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function join() {
    if (!profile || !clubId) return;
    setJoining(true);
    try {
      await clubService.joinClub(clubId, { user_id: profile.id, full_name: profile.full_name });
      await load();
    } catch (joinError) {
      Alert.alert('Katılınamadı', errorMessage(joinError));
    } finally {
      setJoining(false);
    }
  }

  if (!clubId || missing || !club) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Kulüp', headerBackTitle: 'Kulüpler' }} />
        {missing ? (
          <EmptyState title="Kulüp bulunamadı" body="Bu kulüp silinmiş olabilir." />
        ) : (
          <ActivityIndicator color={colors.wine} />
        )}
      </View>
    );
  }

  const perms = club.my_permissions ?? emptyPermissions();
  const isMember = club.membership !== null;
  const categoryLabel = CLUB_CATEGORIES.find((c) => c.id === club.category)?.label ?? club.category;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: club.name,
          headerBackTitle: 'Kulüpler',
          headerRight: perms.can_edit_club
            ? () => (
                <Pressable
                  accessibilityLabel="Kulüp yönetimi"
                  onPress={() => setManageOpen(true)}
                  hitSlop={10}
                  style={styles.headerBtn}
                >
                  <Settings color={colors.wine} size={20} />
                  <Text style={styles.headerBtnText}>Yönetim</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <View style={styles.meta}>
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text style={styles.description}>{club.description || 'Bu kulübün henüz açıklaması yok.'}</Text>
        <Text style={styles.count}>
          {isMember
            ? `${club.members?.length ?? 0} üye · ${club.departments?.length ?? 0} alt birim`
            : 'Katılınca duyurular açılır.'}
        </Text>
        <View style={styles.actions}>
          {!isMember ? <Button label="Kulübe katıl" onPress={join} loading={joining} /> : null}
          {isMember ? (
            <Button label="Üyeler" onPress={() => setMembersOpen(true)} variant="secondary" />
          ) : null}
        </View>
      </View>

      {isMember ? (
        <View style={styles.body}>
          <ClubAnnouncementBoard
            clubId={clubId}
            canPost={perms.can_post_announcement}
            departments={club.departments ?? []}
            hint="Duyuru paylaşmak için uygun role ihtiyacın var."
          />
        </View>
      ) : (
        <EmptyState title="Önce katıl" body="Duyurular yalnızca kulüp üyelerine açık." />
      )}

      {perms.can_edit_club ? (
        <ClubManageModal
          visible={manageOpen}
          club={club}
          onClose={() => setManageOpen(false)}
          onChanged={load}
        />
      ) : null}

      <ClubMembersModal
        visible={membersOpen}
        club={club}
        canManage={perms.can_manage_members}
        onClose={() => setMembersOpen(false)}
        onChanged={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, backgroundColor: colors.cream, justifyContent: 'center' },
  meta: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  category: { color: colors.wineDeep, fontSize: 12, fontWeight: '800' },
  description: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  count: { color: colors.muted, fontSize: 13 },
  actions: { gap: 8, marginBottom: 8 },
  body: { flex: 1 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
  headerBtnText: { color: colors.wine, fontSize: 13, fontWeight: '700' },
});
