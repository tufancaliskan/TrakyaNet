import { api } from '@/lib/api';
import type { ClassMember, Classroom, EligibleStudent } from '@/types/classroom';

export async function getMyClassrooms(_userId?: string | null): Promise<Classroom[]> {
  const { data } = await api.get<Classroom[]>('/api/classrooms/my');
  return data;
}

export async function createClassroom(input: {
  name: string;
  courseId: string;
  invitedStudentIds: string[];
}): Promise<Classroom> {
  const { data } = await api.post<Classroom>('/api/classrooms', {
    name: input.name.trim(),
    course_id: input.courseId,
    invited_student_ids: input.invitedStudentIds,
  });
  return data;
}

export async function getClassroom(classroomId: string, userId?: string | null): Promise<Classroom | null> {
  try {
    const list = await getMyClassrooms(userId);
    return list.find((item) => item.id === classroomId) ?? null;
  } catch {
    return null;
  }
}

export async function getEligibleStudents(classId: string): Promise<EligibleStudent[]> {
  const { data } = await api.get<EligibleStudent[]>(`/api/classes/${classId}/eligible-students`);
  return data;
}

export async function sendClassInvitations(classId: string, studentIds: string[]): Promise<void> {
  await api.post(`/api/classes/${classId}/invitations`, { student_ids: studentIds });
}

export async function getClassMembers(classId: string): Promise<ClassMember[]> {
  const { data } = await api.get<ClassMember[]>(`/api/classes/${classId}/members`);
  return data;
}

export async function setMemberAuthority(
  classId: string,
  studentId: string,
  canManageContent: boolean,
): Promise<ClassMember> {
  const { data } = await api.patch<ClassMember>(`/api/classes/${classId}/members/${studentId}/authority`, {
    can_manage_content: canManageContent,
  });
  return data;
}
