import { api } from '@/lib/api';
import type { Course, CourseStudent, MyCoursesSelection } from '@/types/classroom';

export async function getCourses(departmentId: string, grade: number): Promise<Course[]> {
  const { data } = await api.get<Course[]>('/api/courses', {
    params: { department_id: departmentId, grade },
  });
  return data;
}

export async function saveMyCourses(input: MyCoursesSelection): Promise<MyCoursesSelection> {
  const { data } = await api.put<MyCoursesSelection>('/api/users/me/courses', {
    grade: input.grade,
    course_ids: input.course_ids,
  });
  return data;
}

export async function getMyCourses(): Promise<MyCoursesSelection | null> {
  try {
    const { data } = await api.get<MyCoursesSelection>('/api/users/me/courses');
    return data;
  } catch {
    return null;
  }
}

export async function getCourseStudents(courseId: string): Promise<CourseStudent[]> {
  const { data } = await api.get<CourseStudent[]>(`/api/courses/${encodeURIComponent(courseId)}/students`);
  return data;
}
