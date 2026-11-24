import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Check, GraduationCap } from 'lucide-react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FormModal } from '@/components/FormModal';
import { InvitationBell } from '@/components/InvitationBell';
import { Button, EmptyState, InlineError, PageHeader, SafeScreen, TextField } from '@/components/ui';
import { colors, softShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useActiveRole } from '@/hooks/useActiveRole';
import { errorMessage } from '@/lib/errors';
import { canManageClasses } from '@/lib/format';
import { createClassroom, getMyClassrooms } from '@/services/classroomService';
import { getCourseStudents, getCourses, saveMyCourses } from '@/services/courseService';
import type { Classroom, Course, CourseStudent } from '@/types/classroom';

export default function ClassesScreen() {
  const { profile } = useAuth();
  const { role, isStudent } = useActiveRole();
  const canCreate = canManageClasses(role ?? undefined);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [coursePickOpen, setCoursePickOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [pickedCourseIds, setPickedCourseIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((item) => item.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setClassrooms(await getMyClassrooms(profile?.id));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Sınıflar yüklenemedi.'));
    }
  }, [profile?.id]);

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

  async function openCreate() {
    setFormError(null);
    setName('');
    setSelectedCourseId(null);
    setStudents([]);
    setSelectedStudentIds([]);
    setGrade(1);
    setCreateOpen(true);
    try {
      setCourses(await getCourses('bst', 1));
    } catch (courseError) {
      setFormError(errorMessage(courseError, 'Dersler yüklenemedi.'));
    }
  }

  async function changeGrade(next: number) {
    setGrade(next);
    setSelectedCourseId(null);
    setStudents([]);
    setSelectedStudentIds([]);
    try {
      setCourses(await getCourses('bst', next));
    } catch (courseError) {
      setFormError(errorMessage(courseError, 'Dersler yüklenemedi.'));
    }
  }

  async function pickCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedStudentIds([]);
    try {
      setStudents(await getCourseStudents(courseId));
    } catch (studentError) {
      setFormError(errorMessage(studentError, 'Öğrenciler yüklenemedi.'));
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectAllStudents() {
    setSelectedStudentIds(students.map((item) => item.id));
  }

  async function submitCreate() {
    if (!name.trim() || !selectedCourseId) {
      setFormError('Sınıf adı ve ders gerekli.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createClassroom({
        name,
        courseId: selectedCourseId,
        invitedStudentIds: selectedStudentIds,
      });
      setCreateOpen(false);
      await load();
      router.push({ pathname: '/classroom/[id]', params: { id: created.id } });
    } catch (createError) {
      setFormError(errorMessage(createError, 'Sınıf oluşturulamadı.'));
    } finally {
      setSaving(false);
    }
  }

  async function openCoursePick() {
    setFormError(null);
    setGrade(1);
    setPickedCourseIds([]);
    setCoursePickOpen(true);
    try {
      setCourses(await getCourses('bst', 1));
    } catch (courseError) {
      setFormError(errorMessage(courseError, 'Dersler yüklenemedi.'));
    }
  }

  async function changeStudentGrade(next: number) {
    setGrade(next);
    try {
      setCourses(await getCourses('bst', next));
    } catch (courseError) {
      setFormError(errorMessage(courseError, 'Dersler yüklenemedi.'));
    }
  }

  function toggleCourse(id: string) {
    setPickedCourseIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submitCourses() {
    if (pickedCourseIds.length === 0) {
      setFormError('En az bir ders seç.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await saveMyCourses({ grade, course_ids: pickedCourseIds });
      setCoursePickOpen(false);
    } catch (saveError) {
      setFormError(errorMessage(saveError, 'Dersler kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeScreen>
      <PageHeader
        kicker="Okul"
        title="Sınıflarım"
        subtitle={canCreate ? 'Ders grubu aç, öğrenci davet et' : 'Davetlerin ve üyesi olduğun sınıflar'}
        trailing={<InvitationBell />}
      />
      <View style={styles.actions}>
        {canCreate ? <Button label="Sınıf oluştur" onPress={() => void openCreate()} /> : null}
        {isStudent ? <Button label="Ders seç" variant="secondary" onPress={() => void openCoursePick()} /> : null}
      </View>
      <InlineError message={error} />
      <FlatList
        data={classrooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.wine} />}
        ListEmptyComponent={
          <EmptyState
            title="Sınıf yok"
            body={canCreate ? 'Yeni bir sınıf grubu oluştur.' : 'Davetleri zilden kabul ettiğinde burada görünür.'}
            icon={<GraduationCap color={colors.wine} size={28} />}
          />
        }
        renderItem={({ item }) => (
          <AnimatedPressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/classroom/[id]', params: { id: item.id } })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.course_name} · {item.teacher_name} · {item.member_count} üye
            </Text>
          </AnimatedPressable>
        )}
      />

      <FormModal
        visible={createOpen}
        title="Sınıf oluştur"
        onClose={() => setCreateOpen(false)}
        footer={<Button label="Oluştur ve davet gönder" onPress={() => void submitCreate()} loading={saving} />}
      >
        <TextField label="Sınıf adı" value={name} onChangeText={setName} placeholder="BST 101 Grup A" />
        <Text style={styles.label}>Sınıf düzeyi</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4].map((value) => (
            <Pressable
              key={value}
              onPress={() => void changeGrade(value)}
              style={[styles.chip, grade === value && styles.chipActive]}
            >
              <Text style={[styles.chipText, grade === value && styles.chipTextActive]}>{value}. Sınıf</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Ders</Text>
        {courses.map((course) => {
          const active = selectedCourseId === course.id;
          return (
            <Pressable
              key={course.id}
              onPress={() => void pickCourse(course.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {course.code} {course.name}
                </Text>
                <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>
                  {course.teacher.full_name}
                </Text>
              </View>
              {active ? <Check color={colors.cream} size={18} /> : null}
            </Pressable>
          );
        })}
        {selectedCourse ? (
          <>
            <View style={styles.selectAllRow}>
              <Text style={styles.label}>Öğrenciler ({students.length})</Text>
              <Button label="Tümünü Seç" variant="ghost" onPress={selectAllStudents} />
            </View>
            {students.map((student) => {
              const active = selectedStudentIds.includes(student.id);
              return (
                <Pressable
                  key={student.id}
                  onPress={() => toggleStudent(student.id)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{student.full_name}</Text>
                    <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>{student.email}</Text>
                  </View>
                  {active ? <Check color={colors.cream} size={18} /> : null}
                </Pressable>
              );
            })}
          </>
        ) : null}
        <InlineError message={formError} />
      </FormModal>

      <FormModal
        visible={coursePickOpen}
        title="Ders seç"
        onClose={() => setCoursePickOpen(false)}
        footer={<Button label="Kaydet" onPress={() => void submitCourses()} loading={saving} />}
      >
        <Text style={styles.label}>Sınıf düzeyi</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4].map((value) => (
            <Pressable
              key={value}
              onPress={() => void changeStudentGrade(value)}
              style={[styles.chip, grade === value && styles.chipActive]}
            >
              <Text style={[styles.chipText, grade === value && styles.chipTextActive]}>{value}. Sınıf</Text>
            </Pressable>
          ))}
        </View>
        {courses.map((course) => {
          const active = pickedCourseIds.includes(course.id);
          return (
            <Pressable
              key={course.id}
              onPress={() => toggleCourse(course.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {course.code} {course.name}
                </Text>
                <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>
                  {course.teacher.full_name}
                </Text>
              </View>
              {active ? <Check color={colors.cream} size={18} /> : null}
            </Pressable>
          );
        })}
        <InlineError message={formError} />
      </FormModal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 20, gap: 8 },
  list: { padding: 20, gap: 12, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    ...softShadow,
  },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.wine },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.cream },
  option: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionActive: { backgroundColor: colors.wine },
  optionTitle: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  optionTitleActive: { color: colors.cream },
  optionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  optionMetaActive: { color: colors.goldSoft },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
