export type SystemRole = 'student' | 'teacher' | 'admin';
export type ScopeType = 'school' | 'class' | 'club';
export type ChannelType = 'school' | 'class' | 'club';
export type ClubRole = 'member' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  email?: string;
  avatar_url: string | null;
  system_role: SystemRole;
  created_at: string;
};

export type SchoolClass = {
  id: string;
  name: string;
  code: string | null;
  teacher_id: string;
  teacher_name: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
};

export type Club = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  membership: ClubRole | null;
};

export type ClubMember = {
  user_id: string;
  full_name: string;
  role: ClubRole;
  joined_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  scope_type: ScopeType;
  scope_id: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  class_id: string;
  title: string;
  description: string;
  file_url: string | null;
  due_date: string;
  created_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  channel_type: ChannelType;
  channel_id: string | null;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};
