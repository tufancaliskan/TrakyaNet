import { StyleSheet, View } from 'react-native';

import { AnnouncementBoard } from '@/components/AnnouncementBoard';
import { InvitationBell } from '@/components/InvitationBell';
import { RolePreviewBadge } from '@/components/RolePreviewBadge';
import { PageHeader, SafeScreen } from '@/components/ui';
import { useActiveRole } from '@/hooks/useActiveRole';

export default function SchoolScreen() {
  const { role, isAdmin } = useActiveRole();
  const canPost = isAdmin;

  return (
    <SafeScreen>
      <PageHeader
        kicker="TrakyaNet"
        kickerStyle={styles.brand}
        title="Genel Alan"
        subtitle="Tüm okulun duyuruları"
        trailing={<InvitationBell />}
      />
      <RolePreviewBadge role={role} />
      <View style={styles.body}>
        <AnnouncementBoard
          scopeType="school"
          scopeId={null}
          canPost={canPost}
          hint="Okul duyurularını yalnızca yöneticiler ekler."
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  brand: { textTransform: 'none', letterSpacing: 0.3 },
});
