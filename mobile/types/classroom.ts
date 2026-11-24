export type MaterialType = 'note' | 'assignment';

export type CourseTeacher = {
  id: string;
  full_name: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  grade: number;
  department_id: string;
  teacher: CourseTeacher;
};

export type MyCoursesSelection = {
  grade: number;
  course_ids: string[];
};

export type CourseStudent = {
  id: string;
  full_name: string;
  email: string;
};

export type InvitationStatus = 'none' | 'pending' | 'accepted';

export type EligibleStudent = {
  student_id: string;
  full_name: string;
  student_number: string;
  department_name: string;
  grade: number;
  invitation_status: InvitationStatus;
};

export type Classroom = {
  id: string;
  name: string;
  course_id: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  member_count: number;
  is_owner: boolean;
  is_member: boolean;
  /** Duyuru / not / ödev ekleme yetkisi (sahip, idari veya yetkilendirilmiş üye). */
  can_manage_content: boolean;
  created_at: string;
};

export type ClassMember = {
  student_id: string;
  full_name: string;
  student_number: string;
  can_manage_content: boolean;
};

export type ClassroomInvitation = {
  id: string;
  classroom_id: string;
  classroom_name: string;
  course_name: string;
  teacher_name: string;
  created_at: string;
};

export type ClassroomMaterial = {
  id: string;
  title: string;
  content: string;
  type: MaterialType;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  can_create_club: boolean;
};
