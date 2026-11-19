import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnnouncementBoard } from '@/components/AnnouncementBoard';
import { RealtimeChat } from '@/components/RealtimeChat';
import { PageHeader, SafeScreen, Segmented } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

type SchoolTab = 'feed' | 'chat';

export default function SchoolScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<SchoolTab>('feed');
  const canPost = profile?.system_role === 'admin';

  return (
    <SafeScreen>
      <PageHeader
        kicker="TrakyaNet"
        kickerStyle={styles.brand}
        title="Genel Alan"
        subtitle="Tüm okulun duyurusu ve sohbeti"
      />
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
            scopeType="school"
            scopeId={null}
            canPost={canPost}
            hint="Okul duyurularını yalnızca yöneticiler ekler."
          />
        ) : (
          <RealtimeChat channelType="school" channelId={null} keyboardOffset={8} includeBottomInset={false} />
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  brand: { textTransform: 'none', letterSpacing: 0.3 },
});
