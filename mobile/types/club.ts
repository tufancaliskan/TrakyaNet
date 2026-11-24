export type ClubCategory = 'teknoloji' | 'sanat' | 'spor' | 'sosyal' | 'bilim' | 'diger';

export type ClubPermissions = {
  can_post_announcement: boolean;
  can_manage_members: boolean;
  can_manage_departments: boolean;
  can_edit_club: boolean;
};

export type ClubCustomRole = {
  id: string;
  name: string;
  color: string;
  permissions: ClubPermissions;
};

export type ClubDepartment = {
  id: string;
  name: string;
  lead_user_id: string | null;
  lead_full_name: string | null;
};

export type ClubMemberDetailed = {
  user_id: string;
  full_name: string;
  role_ids: string[];
  department_id: string | null;
  joined_at: string;
};

export type ClubDetail = {
  id: string;
  name: string;
  description: string;
  category: ClubCategory;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  membership: 'member' | 'admin' | null;
  my_permissions: ClubPermissions;
  members: ClubMemberDetailed[];
  roles: ClubCustomRole[];
  departments: ClubDepartment[];
};

export type ClubListItem = {
  id: string;
  name: string;
  description: string;
  category: ClubCategory;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  membership: 'member' | 'admin' | null;
};

export type ClubAnnouncement = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  target_department_id: string | null;
  target_department_name: string | null;
  created_at: string;
};

export const CLUB_CATEGORIES: { id: ClubCategory; label: string }[] = [
  { id: 'teknoloji', label: 'Teknoloji' },
  { id: 'sanat', label: 'Sanat' },
  { id: 'spor', label: 'Spor' },
  { id: 'sosyal', label: 'Sosyal' },
  { id: 'bilim', label: 'Bilim' },
  { id: 'diger', label: 'Diğer' },
];

export const emptyPermissions = (): ClubPermissions => ({
  can_post_announcement: false,
  can_manage_members: false,
  can_manage_departments: false,
  can_edit_club: false,
});

export const fullPermissions = (): ClubPermissions => ({
  can_post_announcement: true,
  can_manage_members: true,
  can_manage_departments: true,
  can_edit_club: true,
});
