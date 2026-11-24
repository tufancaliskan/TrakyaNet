import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormModal } from '@/components/FormModal';
import { Button, InlineError } from '@/components/ui';
import { colors } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import * as clubService from '@/services/clubService';
import type { ClubDetail, ClubMemberDetailed } from '@/types/club';

type Props = {
  visible: boolean;
  club: ClubDetail;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

function isManagement(member: ClubMemberDetailed, club: ClubDetail) {
  return member.role_ids.some((id) => club.roles.find((r) => r.id === id)?.permissions.can_edit_club);
}

export function ClubMembersModal({ visible, club, canManage, onClose, onChanged }: Props) {
  const [selected, setSelected] = useState<ClubMemberDetailed | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  const groups = useMemo(() => {
    const management = club.members.filter((m) => isManagement(m, club));
    const managementIds = new Set(management.map((m) => m.user_id));
    const departments = club.departments.map((dept) => ({
      dept,
      lead: club.members.find((m) => m.user_id === dept.lead_user_id) ?? null,
      members: club.members.filter(
        (m) => m.department_id === dept.id && m.user_id !== dept.lead_user_id && !managementIds.has(m.user_id),
      ),
    }));
    const assigned = new Set<string>([
      ...managementIds,
      ...departments.flatMap((d) => [
        ...(d.lead ? [d.lead.user_id] : []),
        ...d.members.map((m) => m.user_id),
      ]),
    ]);
    const general = club.members.filter((m) => !assigned.has(m.user_id));
    return { management, departments, general };
  }, [club]);

  function openMember(member: ClubMemberDetailed) {
    if (!canManage) return;
    setSelected(member);
    setRoleIds([...member.role_ids]);
    setDepartmentId(member.department_id);
    setError(null);
  }

  function toggleRole(roleId: string) {
    setRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    );
  }

  async function saveAssignment() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await clubService.updateMemberAssignment(club.id, selected.user_id, {
        role_ids: roleIds,
        department_id: departmentId,
      });
      setSelected(null);
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Üye güncellenemedi.'));
    } finally {
      setSaving(false);
    }
  }

  function roleNames(member: ClubMemberDetailed) {
    return member.role_ids
      .map((id) => club.roles.find((r) => r.id === id)?.name)
      .filter(Boolean)
      .join(' · ');
  }

  function MemberRow({ member, badge }: { member: ClubMemberDetailed; badge?: string }) {
    return (
      <Pressable
        style={styles.member}
        onPress={() => openMember(member)}
        disabled={!canManage}
      >
        <View style={styles.memberCopy}>
          <Text style={styles.name}>{member.full_name}</Text>
          <Text style={styles.meta}>{roleNames(member) || 'Rol yok'}</Text>
        </View>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </Pressable>
    );
  }

  return (
    <>
      <FormModal visible={visible && !selected} title="Üyeler" onClose={onClose}>
        <Text style={styles.section}>Yönetim</Text>
        {groups.management.length === 0 ? <Text style={styles.empty}>Yönetici yok</Text> : null}
        {groups.management.map((m) => (
          <MemberRow key={m.user_id} member={m} badge="Yönetici" />
        ))}

        <Text style={styles.section}>Alt birimler</Text>
        {groups.departments.map(({ dept, lead, members }) => (
          <View key={dept.id} style={styles.deptBlock}>
            <Text style={styles.deptTitle}>{dept.name}</Text>
            {lead ? <MemberRow member={lead} badge="Birim başkanı" /> : <Text style={styles.empty}>Başkan atanmamış</Text>}
            {members.map((m) => (
              <MemberRow key={m.user_id} member={m} />
            ))}
          </View>
        ))}

        <Text style={styles.section}>Genel üyeler</Text>
        {groups.general.length === 0 ? <Text style={styles.empty}>Genel üye yok</Text> : null}
        {groups.general.map((m) => (
          <MemberRow key={m.user_id} member={m} />
        ))}
        {canManage ? (
          <Text style={styles.hint}>Bir üyenin kartına dokunarak rol ve alt birim atayabilirsin.</Text>
        ) : null}
      </FormModal>

      <FormModal
        visible={Boolean(selected)}
        title={selected ? selected.full_name : 'Üye'}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.section}>Özel roller</Text>
        <View style={styles.chips}>
          {club.roles.map((role) => {
            const active = roleIds.includes(role.id);
            return (
              <Pressable
                key={role.id}
                style={[styles.chip, active && { backgroundColor: role.color, borderColor: role.color }]}
                onPress={() => toggleRole(role.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{role.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.section}>Alt birim</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, departmentId === null && styles.chipActive]}
            onPress={() => setDepartmentId(null)}
          >
            <Text style={[styles.chipText, departmentId === null && styles.chipTextActive]}>Genel</Text>
          </Pressable>
          {club.departments.map((dept) => {
            const active = departmentId === dept.id;
            return (
              <Pressable
                key={dept.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDepartmentId(dept.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{dept.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <InlineError message={error} />
        <Button label="Kaydet" onPress={saveAssignment} loading={saving} />
      </FormModal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 10, marginBottom: 6, color: colors.ink, fontSize: 15, fontWeight: '800' },
  deptBlock: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  deptTitle: { color: colors.wineDeep, fontWeight: '800', marginBottom: 4 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  memberCopy: { flex: 1, gap: 2 },
  name: { color: colors.ink, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12 },
  badge: {
    color: colors.wine,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  empty: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 12, lineHeight: 18 },
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
