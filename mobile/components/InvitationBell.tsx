import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button, EmptyState, InlineError } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useActiveRole } from '@/hooks/useActiveRole';
import { errorMessage } from '@/lib/errors';
import { getPendingInvitations, respondToInvitation } from '@/services/invitationService';
import type { ClassroomInvitation } from '@/types/classroom';

export function InvitationBell() {
  const { isStudent } = useActiveRole();
  const [items, setItems] = useState<ClassroomInvitation[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isStudent) {
      setItems([]);
      return;
    }
    setError(null);
    try {
      setItems(await getPendingInvitations());
    } catch (loadError) {
      setError(errorMessage(loadError, 'Davetler yüklenemedi.'));
    }
  }, [isStudent]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isStudent) return null;

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await respondToInvitation(id, accept);
      await load();
    } catch (respondError) {
      setError(errorMessage(respondError, 'Davet yanıtlanamadı.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AnimatedPressable
        accessibilityLabel="Sınıf davetleri"
        onPress={() => setOpen(true)}
        style={styles.bell}
      >
        <Bell color={colors.wine} size={20} />
        {items.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length > 9 ? '9+' : String(items.length)}</Text>
          </View>
        ) : null}
      </AnimatedPressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Sınıf davetleri</Text>
          <InlineError message={error} />
          {items.length === 0 ? (
            <EmptyState title="Bekleyen davet yok" body="Akademisyen seni bir sınıfa davet ettiğinde burada görünür." />
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.classroom_name}</Text>
                <Text style={styles.cardMeta}>
                  {item.course_name} · {item.teacher_name}
                </Text>
                <View style={styles.row}>
                  <View style={styles.action}>
                    <Button
                      label="Kabul Et"
                      loading={busyId === item.id}
                      onPress={() => void respond(item.id, true)}
                    />
                  </View>
                  <View style={styles.action}>
                    <Button
                      label="Reddet"
                      variant="secondary"
                      disabled={busyId === item.id}
                      onPress={() => void respond(item.id, false)}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
          <Button label="Kapat" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,20,24,0.35)' },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '18%',
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...softShadow,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
