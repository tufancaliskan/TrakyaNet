import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { BookOpen, ChevronDown, GraduationCap, Landmark } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringCheck } from '@/components/SpringCheck';
import { Button } from '@/components/ui';
import { colors, displayFont, shadow } from '@/constants/theme';
import { loadEntry, saveGate, savePendingStudy } from '@/lib/onboarding';
import { getDepartments, type DepartmentDto } from '@/services/studyService';
import type { SystemRole } from '@/types/database';

const roles: { role: SystemRole; title: string; icon: typeof GraduationCap }[] = [
  { role: 'student', title: 'Öğrenci', icon: GraduationCap },
  { role: 'teacher', title: 'Akademisyen', icon: BookOpen },
  { role: 'admin', title: 'İdari', icon: Landmark },
];

type Pager = { scrollTo: (options: { x: number; animated?: boolean }) => void };

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<Pager | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);
  const [role, setRole] = useState<SystemRole | null>(null);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [openYears, setOpenYears] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const department = departments.find((item) => item.id === departmentId) ?? null;
  const hasPlan = department?.courses_ready === true;
  const studentPath = role === 'student';
  const pageCount = studentPath ? 4 : 2;
  const onSoonPage = page === 3 && !hasPlan;

  useEffect(() => {
    let active = true;
    Promise.all([getDepartments(), loadEntry()]).then(([catalog, saved]) => {
      if (!active) return;
      setDepartments(catalog);
      if (saved?.role === 'student') {
        setRole('student');
        if (saved.study) {
          setDepartmentId(saved.study.department_id);
          setCourseIds(saved.study.course_ids);
        }
      } else if (saved) {
        setRole(saved.role);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  function goTo(next: number) {
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
    setHint(null);
  }

  const pendingPage = useRef<number | null>(null);

  async function chooseRole(next: SystemRole) {
    setRole(next);
    setHint(null);
    if (next === 'student') {
      pendingPage.current = 2;
      return;
    }
    await saveGate(next);
    router.replace('/login');
  }

  useEffect(() => {
    if (!ready || role !== 'student' || pendingPage.current == null) return;
    const next = pendingPage.current;
    pendingPage.current = null;
    goTo(next);
  }, [ready, role]);

  function chooseDepartment(id: string) {
    setDepartmentId(id);
    setCourseIds([]);
    setOpenYears([]);
    setHint(null);
  }

  function toggleYear(year: number) {
    setOpenYears((current) => (current.includes(year) ? current.filter((item) => item !== year) : [...current, year]));
  }

  function toggleCourse(id: string) {
    setCourseIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setHint(null);
  }

  async function finish() {
    if (!departmentId || courseIds.length === 0) {
      setHint('En az bir ders seç.');
      return;
    }
    await savePendingStudy({ department_id: departmentId, course_ids: courseIds });
    router.replace('/login');
  }

  function advance() {
    if (page === 0) {
      goTo(1);
      return;
    }
    if (page === 1) {
      if (role !== 'student') {
        setHint('Öğrenci, akademisyen veya idari seç.');
        return;
      }
      goTo(2);
      return;
    }
    if (page === 2) {
      if (!department) {
        setHint('Bölümünü seç.');
        return;
      }
      goTo(3);
      return;
    }
    void finish();
  }

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Animated.ScrollView
        ref={(node) => {
          scroller.current = node as Pager | null;
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(event) => {
          let next = Math.round(event.nativeEvent.contentOffset.x / width);
          if (next > 1 && role !== 'student') {
            goTo(1);
            setHint('Öğrenci, akademisyen veya idari seç.');
            return;
          }
          if (next > 2 && !department) {
            goTo(2);
            setHint('Bölümünü seç.');
            return;
          }
          if (next > 3) next = 3;
          setPage(next);
        }}
      >
        <View style={[styles.page, { width }]}>
          <Image source={require('../../assets/trakya-logo.png')} style={styles.logo} accessibilityLabel="Trakya Üniversitesi logosu" />
          <Text style={styles.welcome}>TrakyaNet uygulamasına hoş geldiniz</Text>
          <Text style={styles.intro}>
            Duyuru, ödev ve kulüp aynı çatı altında. Önce nasıl gireceğini seç. Öğrenciysen bölümünü ve derslerini işaretle.
          </Text>
        </View>

        <View style={[styles.page, styles.listPage, { width }]}>
          <Text style={styles.step}>Giriş türü</Text>
          <Text style={styles.help}>Öğrenci, akademisyen veya idari.</Text>
          <View style={styles.roleList}>
            {roles.map((item) => {
              const Icon = item.icon;
              const active = role === item.role;
              return (
                <Pressable
                  key={item.role}
                  accessibilityRole="button"
                  onPress={() => void chooseRole(item.role)}
                  style={[styles.roleChoice, active && styles.choiceActive]}
                >
                  <Icon color={active ? colors.cream : colors.wine} size={20} />
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {studentPath ? (
        <View style={[styles.page, styles.listPage, { width }]}>
          <Text style={styles.step}>Bölümün</Text>
          <Text style={styles.help}>Okuduğun bölümü seç.</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {departments.map((item) => {
              const active = departmentId === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => chooseDepartment(item.id)}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        ) : null}

        {studentPath && hasPlan ? (
          <View style={[styles.page, styles.listPage, { width }]}>
            <Text style={styles.step}>Derslerin</Text>
            <Text style={styles.help}>{department?.name}. Dört sınıfın derslerinden istediklerini işaretle.</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {(department?.years ?? []).map((group) => {
                const year = group.year;
                const offered = group.courses;
                const open = openYears.includes(year);
                const picked = offered.filter((item) => courseIds.includes(item.id)).length;
                return (
                  <View key={year} style={styles.yearCard}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      onPress={() => toggleYear(year)}
                      style={styles.yearHead}
                    >
                      <Text style={styles.yearNumber}>{year}</Text>
                      <View style={styles.yearCopy}>
                        <Text style={styles.yearHeading}>Sınıf dersleri</Text>
                        <Text style={styles.yearMeta}>
                          {picked > 0 ? `${picked} ders seçildi` : `${offered.length} ders`}
                        </Text>
                      </View>
                      <View style={open ? styles.yearChevronOpen : styles.yearChevron}>
                        <ChevronDown color={colors.wine} size={18} />
                      </View>
                    </Pressable>
                    {open ? (
                      <View style={styles.yearCourses}>
                        {offered.map((course) => {
                          const active = courseIds.includes(course.id);
                          return (
                            <View key={course.id} style={styles.courseRule}>
                              <SpringCheck
                                caption={course.code || undefined}
                                label={course.name}
                                checked={active}
                                onChange={() => toggleCourse(course.id)}
                                color={colors.ink}
                                fillColor={colors.wine}
                                checkColor={colors.cream}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : studentPath ? (
          <View style={[styles.page, { width }]}>
            <Text style={styles.step}>{department?.name ?? 'Bölüm'}</Text>
            <Text style={styles.soon}>Bu bölümün ders programı yakında eklenecek.</Text>
          </View>
        ) : null}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: pageCount }, (_, index) => {
            const opacity = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [1, 1.4, 1],
              extrapolate: 'clamp',
            });
            return <Animated.View key={index} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
          })}
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <View style={styles.actions}>
          {page > 0 ? (
            <View style={styles.action}>
              <Button label="Geri" variant="secondary" onPress={() => goTo(page - 1)} />
            </View>
          ) : null}
          {onSoonPage ? null : (
            <View style={styles.action}>
              <Button label={page === 3 ? 'Girişe geç' : 'İleri'} onPress={advance} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 28, justifyContent: 'center' },
  listPage: { justifyContent: 'flex-start', paddingTop: 12 },
  logo: { width: 112, height: 112, alignSelf: 'center' },
  welcome: {
    marginTop: 22,
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
    textAlign: 'center',
  },
  intro: { marginTop: 14, color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  step: { fontFamily: displayFont, fontSize: 32, color: colors.ink },
  help: { marginTop: 8, color: colors.muted, fontSize: 15, lineHeight: 22 },
  soon: { marginTop: 16, color: colors.ink, fontSize: 18, lineHeight: 26 },
  list: { flex: 1, marginTop: 16 },
  listContent: { gap: 8, paddingBottom: 12 },
  roleList: { marginTop: 28, gap: 10 },
  roleChoice: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choice: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: colors.wine, borderColor: colors.wine },
  choiceText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  choiceTextActive: { color: colors.cream },
  yearCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow,
  },
  yearHead: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearNumber: { width: 36, fontFamily: displayFont, fontSize: 32, lineHeight: 36, color: colors.wine },
  yearCopy: { flex: 1, gap: 2 },
  yearHeading: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  yearMeta: { color: colors.muted, fontSize: 13 },
  yearChevron: { transform: [{ rotate: '0deg' }] },
  yearChevronOpen: { transform: [{ rotate: '180deg' }] },
  yearCourses: { borderTopWidth: 1, borderTopColor: colors.line },
  courseRule: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  footer: { paddingHorizontal: 24, gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.wine },
  hint: { textAlign: 'center', color: colors.danger, fontSize: 14 },
});
