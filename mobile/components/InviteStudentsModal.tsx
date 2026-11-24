import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, Segmented, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import {
  getClassMembers,
  getEligibleStudents,
  sendClassInvitations,
  setMemberAuthority,
} from '@/services/classroomService';
import type { ClassMember, EligibleStudent } from '@/types/classroom';

type ManageTab = 'invite' | 'authority';

export function InviteStudentsModal({
  visible,
  classId,
  onClose,
  onSent,
}: {
  visible: boolean;
  classId: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [tab, setTab] = useState<ManageTab>('invite');
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    setStudents(await getEligibleStudents(classId));
    setSelected([]);
  }, [classId]);

  const loadMembers = useCallback(async () => {
    setMembers(await getClassMembers(classId));
  }, [classId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'invite') await loadInvite();
      else await loadMembers();
    } catch (loadError) {
      setError(errorMessage(loadError, 'Liste yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [loadInvite, loadMembers, tab]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setTab('invite');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, tab, load]);

  const filteredInvite = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return students;
    return students.filter(
      (student) =>
        student.full_name.toLocaleLowerCase('tr-TR').includes(q) ||
        student.student_number.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [query, students]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return members;
    return members.filter(
      (member) =>
        member.full_name.toLocaleLowerCase('tr-TR').includes(q) ||
        member.student_number.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [members, query]);

  const selectableIds = useMemo(
    () => filteredInvite.filter((item) => item.invitation_status === 'none').map((item) => item.student_id),
    [filteredInvite],
  );

  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    if (allSelectableSelected) {
      setSelected((current) => current.filter((id) => !selectableIds.includes(id)));
      return;
    }
    setSelected((current) => Array.from(new Set([...current, ...selectableIds])));
  }

  async function send() {
    if (selected.length === 0) {
      setError('En az bir öğrenci seç.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sendClassInvitations(classId, selected);
      Alert.alert('Davetler gönderildi', `${selected.length} öğrenciye davet iletildi.`);
      await loadInvite();
      onSent?.();
    } catch (sendError) {
      setError(errorMessage(sendError, 'Davetler gönderilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function onAuthority(member: ClassMember, value: boolean) {
    setBusyId(member.student_id);
    setError(null);
    try {
      await setMemberAuthority(classId, member.student_id, value);
      await loadMembers();
      onSent?.();
    } catch (authorityError) {
      setError(errorMessage(authorityError, 'Yetki güncellenemedi.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FormModal
      visible={visible}
      title="Sınıf yönetimi"
      onClose={onClose}
      footer={
        tab === 'invite' ? (
          <Button
            label={`Seçilenleri Davet Et (${selected.length})`}
            onPress={() => void send()}
            loading={saving}
            disabled={selected.length === 0}
          />
        ) : (
          <Button label="Kapat" variant="secondary" onPress={onClose} />
        )
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'invite', label: 'Öğrenci Davet Et' },
          { value: 'authority', label: 'Yetkilendir' },
        ]}
      />
      <TextField
        label="Ara"
        value={query}
        onChangeText={setQuery}
        placeholder="İsim veya okul numarası"
        autoCapitalize="none"
      />

      {tab === 'invite' ? (
        <>
          <View style={styles.toolbar}>
            <Button
              label={allSelectableSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              variant="ghost"
              onPress={toggleAll}
              disabled={selectableIds.length === 0}
            />
            <Button label="Yenile" variant="secondary" onPress={() => void load()} loading={loading} />
          </View>
          <InlineError message={error} />
          {filteredInvite.length === 0 && !loading ? (
            <EmptyState title="Öğrenci yok" body="Bu dersi seçmiş uygun öğrenci bulunamadı." />
          ) : (
            filteredInvite.map((student) => {
              const locked = student.invitation_status !== 'none';
              const active = selected.includes(student.student_id);
              return (
                <Pressable
                  key={student.student_id}
                  disabled={locked}
                  onPress={() => toggle(student.student_id)}
                  style={[styles.row, active && styles.rowActive, locked && styles.rowLocked]}
                >
                  <View style={styles.copy}>
                    <Text style={[styles.name, active && styles.nameActive, locked && styles.nameLocked]}>
                      {student.full_name}
                    </Text>
                    <Text style={[styles.meta, active && styles.metaActive]}>
                      {student.student_number} · {student.department_name} · {student.grade}. sınıf
                    </Text>
                  </View>
                  {student.invitation_status === 'accepted' ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Sınıfta</Text>
                    </View>
                  ) : student.invitation_status === 'pending' ? (
                    <View style={[styles.badge, styles.badgePending]}>
                      <Text style={[styles.badgeText, styles.badgePendingText]}>Davet Gönderildi</Text>
                    </View>
                  ) : active ? (
                    <Check color={colors.cream} size={18} />
                  ) : (
                    <View style={styles.box} />
                  )}
                </Pressable>
              );
            })
          )}
        </>
      ) : (
        <>
          <Text style={styles.help}>
            Yetkilendirdiğin öğrenciler bu sınıfta duyuru, not ve ödev ekleyebilir.
          </Text>
          <View style={styles.toolbar}>
            <View style={{ flex: 1 }} />
            <Button label="Yenile" variant="secondary" onPress={() => void load()} loading={loading} />
          </View>
          <InlineError message={error} />
          {filteredMembers.length === 0 && !loading ? (
            <EmptyState title="Üye yok" body="Önce öğrencileri sınıfa davet et ve davetleri kabul etsinler." />
          ) : (
            filteredMembers.map((member) => (
              <View key={member.student_id} style={styles.memberRow}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{member.full_name}</Text>
                  <Text style={styles.meta}>{member.student_number}</Text>
                </View>
                <View style={styles.switchWrap}>
                  <Text style={styles.switchLabel}>Yetki</Text>
                  <Switch
                    value={member.can_manage_content}
                    disabled={busyId === member.student_id}
                    onValueChange={(value) => void onAuthority(member, value)}
                    trackColor={{ false: colors.line, true: colors.goldSoft }}
                    thumbColor={member.can_manage_content ? colors.wine : colors.muted}
                  />
                </View>
              </View>
            ))
          )}
        </>
      )}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  help: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowActive: { backgroundColor: colors.wine },
  rowLocked: { opacity: 0.72 },
  memberRow: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: { flex: 1, gap: 2 },
  name: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  nameActive: { color: colors.cream },
  nameLocked: { color: colors.muted },
  meta: { color: colors.muted, fontSize: 12 },
  metaActive: { color: colors.goldSoft },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.sageSoft,
  },
  badgePending: { backgroundColor: colors.goldSoft },
  badgeText: { color: colors.sage, fontSize: 11, fontWeight: '800' },
  badgePendingText: { color: colors.wine },
  switchWrap: { alignItems: 'center', gap: 4 },
  switchLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
