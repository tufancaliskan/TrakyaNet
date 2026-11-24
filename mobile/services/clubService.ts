import { api } from '@/lib/api';
import type {
  ClubAnnouncement,
  ClubCategory,
  ClubCustomRole,
  ClubDepartment,
  ClubDetail,
  ClubListItem,
  ClubMemberDetailed,
  ClubPermissions,
} from '@/types/club';
import { emptyPermissions } from '@/types/club';

function normalizeListItem(item: ClubListItem): ClubListItem {
  return {
    ...item,
    category: item.category ?? 'diger',
    description: item.description ?? '',
    logo_url: item.logo_url ?? null,
    membership: item.membership ?? null,
  };
}

function normalizeDetail(data: ClubDetail): ClubDetail {
  return {
    ...data,
    category: data.category ?? 'diger',
    description: data.description ?? '',
    logo_url: data.logo_url ?? null,
    membership: data.membership ?? null,
    my_permissions: data.my_permissions ?? emptyPermissions(),
    members: data.members ?? [],
    roles: data.roles ?? [],
    departments: data.departments ?? [],
  };
}

export async function canCreateClub(_userId?: string, systemRole?: string): Promise<boolean> {
  if (systemRole === 'admin') return true;
  try {
    const { data } = await api.get<{ can_create_club?: boolean }>('/api/auth/me');
    return Boolean(data.can_create_club);
  } catch {
    return false;
  }
}

export async function listClubs(_currentUserId?: string): Promise<ClubListItem[]> {
  const { data } = await api.get<ClubListItem[]>('/api/clubs');
  return data.map(normalizeListItem);
}

export async function getClub(clubId: string, _currentUserId?: string): Promise<ClubDetail> {
  const { data } = await api.get<ClubDetail>(`/api/clubs/${clubId}`);
  return normalizeDetail(data);
}

export async function createClub(input: {
  name: string;
  description: string;
  category: ClubCategory;
  logo_url: string | null;
  creator: { user_id: string; full_name: string };
}): Promise<ClubDetail> {
  const { data } = await api.post<ClubDetail>('/api/clubs', {
    name: input.name,
    description: input.description,
    category: input.category,
    logo_url: input.logo_url,
  });
  return data;
}

export async function updateClub(
  clubId: string,
  patch: Partial<Pick<ClubDetail, 'name' | 'description' | 'category' | 'logo_url'>>,
): Promise<ClubDetail> {
  const { data } = await api.patch<ClubDetail>(`/api/clubs/${clubId}`, patch);
  return data;
}

export async function listRoles(clubId: string): Promise<ClubCustomRole[]> {
  const { data } = await api.get<ClubCustomRole[]>(`/api/clubs/${clubId}/roles`);
  return data;
}

export async function createRole(
  clubId: string,
  input: { name: string; color: string; permissions: ClubPermissions },
): Promise<ClubCustomRole> {
  const { data } = await api.post<ClubCustomRole>(`/api/clubs/${clubId}/roles`, input);
  return data;
}

export async function deleteRole(clubId: string, roleId: string): Promise<void> {
  await api.delete(`/api/clubs/${clubId}/roles/${roleId}`);
}

export async function listDepartments(clubId: string): Promise<ClubDepartment[]> {
  const { data } = await api.get<ClubDepartment[]>(`/api/clubs/${clubId}/departments`);
  return data;
}

export async function createDepartment(
  clubId: string,
  input: { name: string; lead_user_id: string | null },
): Promise<ClubDepartment> {
  const { data } = await api.post<ClubDepartment>(`/api/clubs/${clubId}/departments`, input);
  return data;
}

export async function updateMemberAssignment(
  clubId: string,
  userId: string,
  input: { role_ids: string[]; department_id: string | null },
): Promise<ClubMemberDetailed> {
  const { data } = await api.patch<ClubMemberDetailed>(`/api/clubs/${clubId}/members/${userId}`, input);
  return data;
}

export async function listClubAnnouncements(clubId: string): Promise<ClubAnnouncement[]> {
  const { data } = await api.get<ClubAnnouncement[]>(`/api/clubs/${clubId}/announcements`);
  return data;
}

export async function createClubAnnouncement(
  clubId: string,
  input: {
    title: string;
    content: string;
    target_department_id: string | null;
    author: { user_id: string; full_name: string };
  },
): Promise<ClubAnnouncement> {
  const { data } = await api.post<ClubAnnouncement>(`/api/clubs/${clubId}/announcements`, {
    title: input.title,
    content: input.content,
    target_department_id: input.target_department_id,
  });
  return data;
}

export async function joinClub(clubId: string, _user: { user_id: string; full_name: string }): Promise<void> {
  await api.post(`/api/clubs/${clubId}/join`);
}
