import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, Image as GalleryIcon, LogOut, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircularCropper } from '@/components/CircularCropper';
import { DevRolePanel } from '@/components/DevRoleSwitcher';
import { Button, InlineError, PageHeader, RoleBadge, SafeScreen, TextField } from '@/components/ui';
import { colors, displayFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { TOKEN_KEY, api } from '@/lib/api';
import { ENABLE_DEV_ROLE_LOGIN } from '@/lib/devAuth';
import { errorMessage } from '@/lib/errors';
import { initialOf, roleLabel } from '@/lib/format';
import { getMyStudy, type StudySelectionDto } from '@/services/studyService';
import type { Profile, SystemRole } from '@/types/database';

const roles: SystemRole[] = ['student', 'teacher', 'admin'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, refreshProfile, switchPreviewRole, isDevSession } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [cropAsset, setCropAsset] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [studies, setStudies] = useState<StudySelectionDto | null>(null);
  const [openYears, setOpenYears] = useState<number[]>([]);

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(setToken);
  }, [profile?.avatar_url]);

  useEffect(() => {
    let active = true;
    getMyStudy().then((data) => {
      if (active) setStudies(data);
    });
    return () => {
      active = false;
    };
  }, [profile?.id]);

  function onAvatarPress() {
    if (!profile || uploadingPhoto) return;
    if (!profile.avatar_url) {
      void pickPhoto();
      return;
    }
    setPhotoMenu(true);
  }

  async function removePhoto() {
    setPhotoMenu(false);
    setUploadingPhoto(true);
    setError(null);
    setMessage(null);
    try {
      await api.delete('/api/auth/me/avatar');
      await refreshProfile();
      setMessage('Profil fotoğrafın kaldırıldı.');
    } catch (removeError) {
      setError(errorMessage(removeError, 'Fotoğraf kaldırılamadı.'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickPhoto() {
    if (!profile || uploadingPhoto) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Galeri izni gerekli', 'Profil fotoğrafı seçmek için fotoğraflara erişim ver.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    let width = asset.width;
    let height = asset.height;
    if (!width || !height) {
      const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(asset.uri, (nextWidth, nextHeight) => resolve({ width: nextWidth, height: nextHeight }), reject);
      });
      width = size.width;
      height = size.height;
    }
    setCropAsset({ uri: asset.uri, width, height });
  }

  async function uploadPhoto(uri: string) {
    setCropAsset(null);
    const body = new FormData();
    body.append('file', {
      uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    setUploadingPhoto(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/api/auth/me/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProfile();
      setMessage('Profil fotoğrafın güncellendi.');
    } catch (uploadError) {
      setError(errorMessage(uploadError, 'Fotoğraf yüklenemedi.'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveName() {
    if (!profile) return;
    const next = name.trim();
    if (next.length < 2) {
      setError('Ad soyad en az 2 karakter olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.put('/api/auth/me', { full_name: next });
    } catch (updateError) {
      setError(errorMessage(updateError));
      return;
    } finally {
      setSaving(false);
    }
    await refreshProfile();
    setMessage('Adın güncellendi.');
  }

  async function searchPeople() {
    const safe = query.trim().replace(/[%_]/g, '');
    if (safe.length < 2) {
      setError('Aramak için en az 2 karakter yaz.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const { data } = await api.get<Profile[]>('/api/users', { params: { query: safe } });
      setPeople(data);
    } catch (searchError) {
      setError(errorMessage(searchError));
    } finally {
      setSearching(false);
    }
  }

  async function changeRole(person: Profile, role: SystemRole) {
    if (person.id === profile?.id) return;
    try {
      await api.put<void>(`/api/users/${person.id}/role`, { role });
    } catch (roleError) {
      Alert.alert('Rol değişmedi', errorMessage(roleError));
      return;
    }
    setPeople((current) => current.map((item) => (item.id === person.id ? { ...item, system_role: role } : item)));
  }

  async function logout() {
    try {
      await signOut();
      router.replace('/login');
    } catch (signOutError) {
      Alert.alert('Çıkış yapılamadı', errorMessage(signOutError));
    }
  }

  return (
    <>
      <Modal visible={photoMenu} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setPhotoMenu(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPhotoMenu(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderSide} />
              <Text style={styles.sheetTitle}>Profil resmini düzenle</Text>
              <Pressable accessibilityLabel="Kapat" onPress={() => setPhotoMenu(false)} style={styles.sheetClose}>
                <X color={colors.ink} size={22} />
              </Pressable>
            </View>
            <View style={styles.sheetCard}>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setPhotoMenu(false);
                  void pickPhoto();
                }}
              >
                <GalleryIcon color={colors.ink} size={22} />
                <Text style={styles.sheetLabel}>Galeriden seç</Text>
              </Pressable>
              <View style={styles.sheetDivider} />
              <Pressable style={styles.sheetRow} onPress={removePhoto}>
                <Trash2 color={colors.ink} size={22} />
                <Text style={styles.sheetLabel}>Fotoğrafı kaldır</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={cropAsset !== null} animationType="fade" statusBarTranslucent>
        {cropAsset ? (
          <CircularCropper asset={cropAsset} onCancel={() => setCropAsset(null)} onConfirm={uploadPhoto} />
        ) : null}
      </Modal>
      <SafeScreen>
      <PageHeader kicker="Hesap" title="Profil" subtitle="Kimliğin ve sistem rolün" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {profile ? (
          <View style={styles.hero}>
            <Pressable
              accessibilityLabel="Profil fotoğrafı"
              onPress={onAvatarPress}
              disabled={uploadingPhoto || isDevSession}
              style={styles.avatarWrap}
            >
              <View style={styles.avatar}>
                {profile.avatar_url && token && !isDevSession ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')}/api/auth/me/avatar?access_token=${encodeURIComponent(token)}&v=${encodeURIComponent(profile.avatar_url)}`,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initialOf(profile.full_name)}</Text>
                )}
              </View>
              {!isDevSession ? (
                <View style={styles.photoBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color={colors.cream} size="small" />
                  ) : (
                    <Camera color={colors.cream} size={14} />
                  )}
                </View>
              ) : null}
            </Pressable>
            <RoleBadge role={profile.system_role} />
            <Text style={styles.email}>{profile.email}</Text>
            {isDevSession ? <Text style={styles.devNote}>Yerel geliştirici önizlemesi</Text> : null}
          </View>
        ) : (
          <Text style={styles.missing}>
            Profil alınamadı. API'nin çalıştığını ve oturumunun geçerli olduğunu kontrol et.
          </Text>
        )}

        {ENABLE_DEV_ROLE_LOGIN ? (
          <DevRolePanel current={profile?.system_role ?? null} onSelect={(next) => void switchPreviewRole(next)} />
        ) : null}

        {profile && !isDevSession ? (
          <View style={styles.block}>
            <TextField label="Ad soyad" value={name} onChangeText={setName} autoCapitalize="words" />
            <Button label="Adı kaydet" onPress={saveName} loading={saving} variant="secondary" />
          </View>
        ) : null}

        {message ? <Text style={styles.ok}>{message}</Text> : null}
        <InlineError message={error} />

        {profile?.system_role === 'admin' && !isDevSession ? (
          <View style={styles.block}>
            <Text style={styles.section}>Rol yönetimi</Text>
            <Text style={styles.help}>Ada göre ara, sonra öğrenci, öğretmen veya yönetici yap. Kendi rolünü buradan değiştiremezsin.</Text>
            <TextField label="Kullanıcı ara" value={query} onChangeText={setQuery} placeholder="Ad soyad" autoCapitalize="words" />
            <Button label="Ara" onPress={searchPeople} loading={searching} variant="secondary" />
            {people.map((person) => (
              <View key={person.id} style={styles.person}>
                <View style={styles.personCopy}>
                  <Text style={styles.personName}>{person.full_name}</Text>
                  <Text style={styles.personRole}>{roleLabel[person.system_role]}</Text>
                </View>
                <View style={styles.roleRow}>
                  {roles.map((role) => {
                    const active = person.system_role === role;
                    const locked = person.id === profile.id;
                    return (
                      <Pressable
                        key={role}
                        disabled={active || locked}
                        onPress={() => changeRole(person, role)}
                        style={[styles.chip, active && styles.chipActive, locked && styles.chipLocked]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{roleLabel[role]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {studies ? (
          <View style={styles.studyCard}>
            {studies.department_id ? (
              <>
                <Text style={styles.studyDept}>{studies.department_name}</Text>
                {studies.years.map((group) => {
                  const open = openYears.includes(group.year);
                  return (
                    <View key={group.year} style={styles.yearCard}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        onPress={() =>
                          setOpenYears((current) =>
                            current.includes(group.year) ? current.filter((item) => item !== group.year) : [...current, group.year],
                          )
                        }
                        style={styles.yearHead}
                      >
                        <Text style={styles.yearNumber}>{group.year}</Text>
                        <View style={styles.yearCopy}>
                          <Text style={styles.courseToggleText}>{group.year}. Sınıf Dersleri</Text>
                          <Text style={styles.yearMeta}>{group.courses.length} ders</Text>
                        </View>
                        <View style={open ? styles.courseChevronOpen : styles.courseChevron}>
                          <ChevronDown color={colors.wine} size={18} />
                        </View>
                      </Pressable>
                      {open ? (
                        <View style={styles.yearCourses}>
                          {group.courses.map((course) => (
                            <View key={course.id} style={styles.courseItem}>
                              {course.code ? <Text style={styles.courseCode}>{course.code}</Text> : null}
                              <Text style={styles.courseName}>{course.name}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={styles.studyEmpty}>Kayıtlı bölüm ve ders seçimin yok.</Text>
            )}
          </View>
        ) : null}

        <Pressable style={styles.logout} onPress={logout}>
          <LogOut color={colors.danger} size={18} />
          <Text style={styles.logoutText}>Çıkış yap</Text>
        </Pressable>
      </ScrollView>
    </SafeScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 8 },
  avatarWrap: { width: 84, height: 84 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.cream, fontFamily: displayFont, fontSize: 34 },
  avatarImage: { width: 84, height: 84 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,20,24,0.45)' },
  sheet: {
    backgroundColor: '#F3F3F3',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  sheetHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  sheetHeaderSide: { width: 36 },
  sheetTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 17, fontWeight: '700' },
  sheetClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sheetCard: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' },
  sheetRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  sheetLabel: { color: colors.ink, fontSize: 16 },
  sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 52 },
  photoBadge: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.wineDeep,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { color: colors.muted, fontSize: 14 },
  devNote: { color: colors.wine, fontSize: 12, fontWeight: '700' },
  block: { gap: 10 },
  section: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  studyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 12,
  },
  studyDept: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  studyEmpty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  yearCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  yearHead: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearNumber: { width: 28, fontFamily: displayFont, fontSize: 28, lineHeight: 32, color: colors.wine },
  yearCopy: { flex: 1, gap: 2 },
  yearMeta: { color: colors.muted, fontSize: 12 },
  yearCourses: { borderTopWidth: 1, borderTopColor: colors.line },
  courseToggleText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  courseChevron: { transform: [{ rotate: '0deg' }] },
  courseChevronOpen: { transform: [{ rotate: '180deg' }] },
  courseItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  courseCode: { color: colors.wineDeep, fontSize: 12, fontWeight: '800' },
  courseName: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  ok: { color: colors.sage, fontSize: 14 },
  missing: { color: colors.danger, lineHeight: 20 },
  person: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  personCopy: { gap: 2 },
  personName: { color: colors.ink, fontWeight: '700' },
  personRole: { color: colors.muted, fontSize: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.wine },
  chipLocked: { opacity: 0.5 },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  logout: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7C9C6',
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
