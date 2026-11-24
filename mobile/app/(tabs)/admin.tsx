import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { FormModal } from '@/components/FormModal';
import { Button, EmptyState, InlineError, PageHeader, SafeScreen, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { roleLabel } from '@/lib/format';
import {
  createAdminUser,
  deleteAdminUser,
  patchAdminUser,
  searchAdminUsers,
} from '@/services/adminUserService';
import type { AdminUser } from '@/types/classroom';
import type { SystemRole } from '@/types/database';

const roles: SystemRole[] = ['student', 'teacher', 'admin'];

export default function AdminScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SystemRole>('student');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search = query) => {
    setError(null);
    try {
      setUsers(await searchAdminUsers(search));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Kullanıcılar yüklenemedi.'));
    }
  }, [query]);

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

  async function onCreate() {
    if (!email.trim() || password.length < 6) {
      setFormError('E-posta ve en az 6 karakter şifre gerekli.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createAdminUser({ email, password, role });
      setOpen(false);
      setEmail('');
      setPassword('');
      setRole('student');
      await load('');
      setQuery('');
    } catch (createError) {
      setFormError(errorMessage(createError, 'Kullanıcı eklenemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function onRole(user: AdminUser, next: SystemRole) {
    try {
      await patchAdminUser(user.id, { role: next });
      await load();
    } catch (patchError) {
      Alert.alert('Rol değişmedi', errorMessage(patchError));
    }
  }

  async function onClub(user: AdminUser, value: boolean) {
    try {
      await patchAdminUser(user.id, { can_create_club: value });
      await load();
    } catch (patchError) {
      Alert.alert('Yetki değişmedi', errorMessage(patchError));
    }
  }

  function onDelete(user: AdminUser) {
    Alert.alert('Kullanıcı silinsin mi?', user.full_name, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteAdminUser(user.id);
              await load();
            } catch (deleteError) {
              Alert.alert('Silinemedi', errorMessage(deleteError));
            }
          })();
        },
      },
    ]);
  }

  return (
    <SafeScreen>
      <PageHeader kicker="İdari" title="Yönetim" subtitle="Kullanıcı ekle, rol ve kulüp yetkisi ver" />
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <TextField label="Ara" value={query} onChangeText={setQuery} placeholder="Ad veya e-posta" autoCapitalize="none" />
        </View>
        <Button label="Ara" variant="secondary" onPress={() => void load(query)} />
      </View>
      <View style={styles.actions}>
        <Button label="Kullanıcı ekle" onPress={() => setOpen(true)} />
      </View>
      <InlineError message={error} />
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.wine} />}
        ListEmptyComponent={<EmptyState title="Kullanıcı yok" body="Aramayı temizle veya yeni kullanıcı ekle." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.roleRow}>
              {roles.map((option) => {
                const active = item.role === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => void onRole(item, option)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{roleLabel[option]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Kulüp açma yetkisi</Text>
              <Switch
                value={item.can_create_club}
                onValueChange={(value) => void onClub(item, value)}
                trackColor={{ false: colors.line, true: colors.goldSoft }}
                thumbColor={item.can_create_club ? colors.wine : colors.muted}
              />
            </View>
            <Button label="Sil" variant="secondary" onPress={() => onDelete(item)} />
          </View>
        )}
      />

      <FormModal
        visible={open}
        title="Kullanıcı ekle"
        onClose={() => setOpen(false)}
        footer={<Button label="Kaydet" onPress={() => void onCreate()} loading={saving} />}
      >
        <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <Text style={styles.help}>Rol</Text>
        <View style={styles.roleRow}>
          {roles.map((option) => (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              style={[styles.chip, role === option && styles.chipActive]}
            >
              <Text style={[styles.chipText, role === option && styles.chipTextActive]}>{roleLabel[option]}</Text>
            </Pressable>
          ))}
        </View>
        <InlineError message={formError} />
      </FormModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 20, gap: 8 },
  search: { flexGrow: 1 },
  actions: { paddingHorizontal: 20, paddingTop: 8 },
  list: { padding: 20, gap: 12, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    ...softShadow,
  },
  name: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 13 },
  help: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.wine },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.cream },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
