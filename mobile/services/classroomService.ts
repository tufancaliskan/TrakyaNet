import axios from 'axios';

import { api } from '@/lib/api';
import type { ClassMember, Classroom, EligibleStudent } from '@/types/classroom';

type LegacyClass = {
  id: string;
  name: string;
  code: string | null;
  teacher_id: string;
  teacher_name: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
};

function fromLegacy(item: LegacyClass, userId?: string | null): Classroom {
  return {
    id: item.id,
    name: item.name,
    course_id: '',
    course_name: item.code ? `Kod ${item.code}` : 'Sınıf',
    teacher_id: item.teacher_id,
    teacher_name: item.teacher_name,
    member_count: item.member_count,
    is_owner: Boolean(userId && item.teacher_id === userId),
    is_member: item.is_member,
    can_manage_content: Boolean(userId && item.teacher_id === userId),
    created_at: item.created_at,
  };
}

export async function getMyClassrooms(userId?: string | null): Promise<Classroom[]> {
  try {
    const { data } = await api.get<Classroom[]>('/api/classrooms/my');
    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    const { data } = await api.get<LegacyClass[]>('/api/classes');
    return data.filter((item) => item.is_member).map((item) => fromLegacy(item, userId));
  }
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
