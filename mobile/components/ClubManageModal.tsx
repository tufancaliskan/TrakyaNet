import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { FormModal } from '@/components/FormModal';
import { Button, InlineError, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import * as clubService from '@/services/clubService';
import type { ClubCategory, ClubDetail, ClubPermissions } from '@/types/club';
import { CLUB_CATEGORIES, emptyPermissions } from '@/types/club';

const ROLE_COLORS = ['#8B2635', '#2E7D32', '#1565C0', '#6A1B9A', '#EF6C00', '#00838F'];

type Props = {
  visible: boolean;
  club: ClubDetail;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

export function ClubManageModal({ visible, club, onClose, onChanged }: Props) {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description);
  const [category, setCategory] = useState<ClubCategory>(club.category);
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logo_url);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState(ROLE_COLORS[0]);
  const [rolePerms, setRolePerms] = useState<ClubPermissions>(emptyPermissions());
  const [deptName, setDeptName] = useState('');
  const [leadUserId, setLeadUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(club.name);
    setDescription(club.description);
    setCategory(club.category);
    setLogoUrl(club.logo_url);
    setError(null);
  }, [visible, club]);

  async function saveInfo() {
    setSaving(true);
    setError(null);
    try {
      await clubService.updateClub(club.id, {
        name: name.trim(),
        description: description.trim(),
        category,
        logo_url: logoUrl,
      });
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Kulüp güncellenemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function addRole() {
    if (roleName.trim().length < 2) {
      setError('Rol adı en az 2 karakter olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await clubService.createRole(club.id, {
        name: roleName.trim(),
        color: roleColor,
        permissions: rolePerms,
      });
      setRoleName('');
      setRolePerms(emptyPermissions());
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Rol oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  function removeRole(roleId: string, roleLabel: string) {
    Alert.alert('Rolü sil', `"${roleLabel}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await clubService.deleteRole(club.id, roleId);
            await onChanged();
          } catch (e) {
            setError(errorMessage(e, 'Rol silinemedi.'));
          }
        },
      },
    ]);
  }

  async function addDepartment() {
    if (deptName.trim().length < 2) {
      setError('Alt birim adı en az 2 karakter olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await clubService.createDepartment(club.id, {
        name: deptName.trim(),
        lead_user_id: leadUserId,
      });
      setDeptName('');
      setLeadUserId(null);
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Alt birim oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Kulüp yönetimi" onClose={onClose}>
      <Text style={styles.section}>Kulüp bilgileri</Text>
      <TextField label="Ad" value={name} onChangeText={setName} />
      <TextField label="Açıklama" value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Kategori</Text>
      <View style={styles.chips}>
        {CLUB_CATEGORIES.map((item) => {
          const active = category === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(item.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>Logo rengi</Text>
      <View style={styles.chips}>
        {ROLE_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[styles.swatch, { backgroundColor: c }, logoUrl === c && styles.swatchActive]}
            onPress={() => setLogoUrl(c)}
          />
        ))}
        <Pressable style={styles.clearLogo} onPress={() => setLogoUrl(null)}>
          <Text style={styles.clearLogoText}>Yok</Text>
        </Pressable>
      </View>
      <Button label="Bilgileri kaydet" onPress={saveInfo} loading={saving} />

      <Text style={styles.section}>Özel roller</Text>
      {(club.roles ?? []).map((role) => (
        <View key={role.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: role.color }]} />
          <Text style={styles.rowTitle}>{role.name}</Text>
          <Pressable onPress={() => removeRole(role.id, role.name)}>
            <Text style={styles.danger}>Sil</Text>
          </Pressable>
        </View>
      ))}
      <TextField label="Yeni rol adı" value={roleName} onChangeText={setRoleName} placeholder="Mobil Alan Başkanı" />
      <Text style={styles.label}>Renk</Text>
      <View style={styles.chips}>
        {ROLE_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[styles.swatch, { backgroundColor: c }, roleColor === c && styles.swatchActive]}
            onPress={() => setRoleColor(c)}
          />
        ))}
      </View>
      {(
        [
          ['can_post_announcement', 'Duyuru paylaşabilir'],
          ['can_manage_members', 'Üye yönetebilir'],
          ['can_manage_departments', 'Alt birim yönetebilir'],
          ['can_edit_club', 'Kulübü düzenleyebilir'],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{label}</Text>
          <Switch
            value={rolePerms[key]}
            onValueChange={(v) => setRolePerms((p) => ({ ...p, [key]: v }))}
            trackColor={{ true: colors.wine, false: colors.line }}
          />
        </View>
      ))}
      <Button label="Rol ekle" onPress={addRole} loading={saving} variant="secondary" />

      <Text style={styles.section}>Alt birimler (alanlar)</Text>
      {(club.departments ?? []).map((dept) => (
        <View key={dept.id} style={styles.deptCard}>
          <Text style={styles.rowTitle}>{dept.name}</Text>
          <Text style={styles.meta}>
            Sorumlu: {dept.lead_full_name ?? 'Atanmamış'}
          </Text>
        </View>
      ))}
      <TextField label="Yeni alan adı" value={deptName} onChangeText={setDeptName} placeholder="Mobil Geliştirme" />
      <Text style={styles.label}>Birim sorumlusu</Text>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, leadUserId === null && styles.chipActive]}
          onPress={() => setLeadUserId(null)}
        >
          <Text style={[styles.chipText, leadUserId === null && styles.chipTextActive]}>Yok</Text>
        </Pressable>
        {club.members.map((m) => {
          const active = leadUserId === m.user_id;
          return (
            <Pressable
              key={m.user_id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLeadUserId(m.user_id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.full_name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button label="Alan ekle" onPress={addDepartment} loading={saving} variant="secondary" />
      <InlineError message={error} />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 4,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
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
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.ink },
  clearLogo: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  clearLogoText: { color: colors.wineDeep, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { flex: 1, color: colors.ink, fontWeight: '700' },
  danger: { color: colors.danger, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: { color: colors.ink, flex: 1, paddingRight: 12 },
  deptCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 2,
  },
  meta: { color: colors.muted, fontSize: 12 },
});
