import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Check, ChevronDown, GraduationCap, Landmark } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInUp,
  Layout,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SpringCheck } from '@/components/SpringCheck';
import { TrakyaIntroAnimation } from '@/components/TrakyaIntroAnimation';
import { Button } from '@/components/ui';
import { colors, displayFont, softShadow } from '@/constants/theme';
import { loadEntry, saveGate, savePendingStudy } from '@/lib/onboarding';
import { getDepartments, type DepartmentDto } from '@/services/studyService';
import type { SystemRole } from '@/types/database';

const roles: { role: SystemRole; title: string; icon: typeof GraduationCap }[] = [
  { role: 'student', title: 'Öğrenci', icon: GraduationCap },
  { role: 'teacher', title: 'Akademisyen', icon: BookOpen },
  { role: 'admin', title: 'İdari', icon: Landmark },
];

type Pager = { scrollTo: (options: { x: number; animated?: boolean }) => void };

function YearAccordion({
  year,
  open,
  picked,
  total,
  courses,
  selectedIds,
  onToggleYear,
  onToggleCourse,
}: {
  year: number;
  open: boolean;
  picked: number;
  total: number;
  courses: { id: string; code: string; name: string }[];
  selectedIds: string[];
  onToggleYear: () => void;
  onToggleCourse: (id: string) => void;
}) {
  const rotation = useSharedValue(open ? 180 : 0);

  useEffect(() => {
    rotation.value = withSpring(open ? 180 : 0, { damping: 28, stiffness: 260, overshootClamping: true });
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View layout={Layout.springify().damping(36).stiffness(280).mass(0.6)} style={styles.yearCard}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggleYear}
        style={styles.yearHead}
      >
        <Text style={styles.yearNumber}>{year}</Text>
        <View style={styles.yearCopy}>
          <Text style={styles.yearHeading}>Sınıf dersleri</Text>
          <Text style={styles.yearMeta}>{picked > 0 ? `${picked} ders seçildi` : `${total} ders`}</Text>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown color={colors.wine} size={18} />
        </Animated.View>
      </AnimatedPressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(180)} style={styles.yearCourses}>
          {courses.map((course) => {
            const active = selectedIds.includes(course.id);
            return (
              <View key={course.id} style={styles.courseRule}>
                <SpringCheck
                  caption={course.code || undefined}
                  label={course.name}
                  checked={active}
                  onChange={() => onToggleCourse(course.id)}
                  color={colors.ink}
                  fillColor={colors.wine}
                  checkColor={colors.cream}
                />
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const openAtRole = useLocalSearchParams<{ step?: string }>().step === 'role';
  const scroller = useRef<Pager | null>(null);
  const scrollX = useSharedValue(openAtRole ? width : 0);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(openAtRole);
  const [page, setPage] = useState(openAtRole ? 1 : 0);
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

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Animated.ScrollView
        key={openAtRole ? 'welcome-role' : 'welcome-intro'}
        ref={(node) => {
          scroller.current = node as Pager | null;
          if (openAtRole && node) {
            (node as Pager).scrollTo({ x: width, animated: false });
          }
        }}
        horizontal
        pagingEnabled
        scrollEnabled={introDone}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentOffset={openAtRole ? { x: width, y: 0 } : { x: 0, y: 0 }}
        onScroll={onScroll}
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
          <View style={styles.logoStage}>
            <TrakyaIntroAnimation
              skipAnimation={openAtRole}
              onAnimationComplete={() => setIntroDone(true)}
            />
          </View>
          {introDone ? (
            openAtRole ? (
              <>
                <Text style={styles.welcome}>TrakyaNet uygulamasına hoş geldiniz</Text>
                <Text style={styles.intro}>
                  Duyuru, ödev ve kulüp aynı çatı altında. Önce nasıl gireceğini seç. Öğrenciysen bölümünü ve derslerini
                  işaretle.
                </Text>
              </>
            ) : (
              <>
                <Animated.Text entering={FadeInDown.delay(150).duration(420)} style={styles.welcome}>
                  TrakyaNet uygulamasına hoş geldiniz
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(300).duration(420)} style={styles.intro}>
                  Duyuru, ödev ve kulüp aynı çatı altında. Önce nasıl gireceğini seç. Öğrenciysen bölümünü ve derslerini
                  işaretle.
                </Animated.Text>
              </>
            )
          ) : null}
        </View>

        <Animated.View entering={FadeInRight.duration(360)} style={[styles.page, styles.listPage, { width }]}>
          <Text style={styles.step}>Giriş türü</Text>
          <Text style={styles.help}>Öğrenci, akademisyen veya idari.</Text>
          <View style={styles.roleList}>
            {roles.map((item) => {
              const Icon = item.icon;
              const active = role === item.role;
              return (
                <AnimatedPressable
                  key={item.role}
                  accessibilityRole="button"
                  onPress={() => void chooseRole(item.role)}
                  style={[styles.roleChoice, active && styles.choiceActive]}
                >
                  <View style={[styles.choiceIcon, active && styles.choiceIconActive]}>
                    <Icon color={active ? colors.cream : colors.wine} size={20} />
                  </View>
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{item.title}</Text>
                  {active ? <Check color={colors.cream} size={18} strokeWidth={2.4} /> : null}
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>

        {studentPath ? (
          <Animated.View entering={FadeInRight.duration(360)} style={[styles.page, styles.listPage, { width }]}>
            <Text style={styles.step}>Bölümün</Text>
            <Text style={styles.help}>Okuduğun bölümü seç.</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {departments.map((item) => {
                const active = departmentId === item.id;
                return (
                  <AnimatedPressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => chooseDepartment(item.id)}
                    style={[styles.choice, active && styles.choiceActive]}
                  >
                    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{item.name}</Text>
                    {active ? <Check color={colors.cream} size={18} strokeWidth={2.4} /> : null}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : null}

        {studentPath && hasPlan ? (
          <Animated.View entering={FadeInRight.duration(360)} style={[styles.page, styles.listPage, { width }]}>
            <Text style={styles.step}>Derslerin</Text>
            <Text style={styles.help}>{department?.name}. Dört sınıfın derslerinden istediklerini işaretle.</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {(department?.years ?? []).map((group) => {
                const offered = group.courses;
                const open = openYears.includes(group.year);
                const picked = offered.filter((item) => courseIds.includes(item.id)).length;
                return (
                  <YearAccordion
                    key={group.year}
                    year={group.year}
                    open={open}
                    picked={picked}
                    total={offered.length}
                    courses={offered}
                    selectedIds={courseIds}
                    onToggleYear={() => toggleYear(group.year)}
                    onToggleCourse={toggleCourse}
                  />
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : studentPath ? (
          <Animated.View entering={FadeInRight.duration(360)} style={[styles.page, { width }]}>
            <Text style={styles.step}>{department?.name ?? 'Bölüm'}</Text>
            <Text style={styles.soon}>Bu bölümün ders programı yakında eklenecek.</Text>
          </Animated.View>
        ) : null}
      </Animated.ScrollView>

      {introDone ? (
        <Animated.View entering={FadeInUp.delay(120).duration(420)} style={styles.footer}>
          <View style={styles.dots}>
            {Array.from({ length: pageCount }, (_, index) => (
              <PillDot key={index} index={index} width={width} scrollX={scrollX} />
            ))}
          </View>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <Animated.View entering={FadeInUp.delay(280).duration(420)} style={styles.actions}>
            {page > 0 ? (
              <View style={styles.action}>
                <Button
                  label="Geri"
                  variant="secondary"
                  onPress={() => goTo(page - 1)}
                />
              </View>
            ) : null}
            {onSoonPage ? null : (
              <View style={styles.action}>
                <Button label={page === 3 ? 'Girişe geç' : 'İleri'} onPress={advance} />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={styles.footerSpacer} />
      )}
    </View>
  );
}

function PillDot({
  index,
  width,
  scrollX,
}: {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / width - index);
    const active = Math.max(0, 1 - distance);
    return {
      width: 8 + active * 16,
      opacity: 0.35 + active * 0.65,
      borderRadius: 999,
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 28, justifyContent: 'center' },
  listPage: { justifyContent: 'flex-start', paddingTop: 12 },
  logoStage: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 248,
  },
  welcome: {
    marginTop: 10,
    fontFamily: displayFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.ink,
    textAlign: 'center',
  },
  intro: { marginTop: 14, color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  step: {
    fontFamily: displayFont,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  help: { marginTop: 8, color: colors.muted, fontSize: 15, lineHeight: 22 },
  soon: { marginTop: 16, color: colors.ink, fontSize: 18, lineHeight: 26 },
  list: { flex: 1, marginTop: 16 },
  listContent: { gap: 10, paddingBottom: 12 },
  roleList: { marginTop: 28, gap: 10 },
  roleChoice: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...softShadow,
  },
  choice: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...softShadow,
  },
  choiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconActive: {
    backgroundColor: 'rgba(255,252,248,0.18)',
  },
  choiceActive: { backgroundColor: colors.wine },
  choiceText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  choiceTextActive: { color: colors.cream },
  yearCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    ...softShadow,
  },
  yearHead: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearNumber: {
    width: 36,
    fontFamily: displayFont,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.wine,
  },
  yearCopy: { flex: 1, gap: 2 },
  yearHeading: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  yearMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  yearCourses: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  courseRule: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  footer: { paddingHorizontal: 24, gap: 12 },
  footerSpacer: { height: 72 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 16, alignItems: 'center' },
  dot: { height: 8, backgroundColor: colors.wine },
  hint: { textAlign: 'center', color: colors.danger, fontSize: 14 },
});
