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
import { emptyPermissions, fullPermissions } from '@/types/club';

const LEGACY_ADMIN_ROLE_ID = 'legacy-admin';
const LEGACY_MEMBER_ROLE_ID = 'legacy-member';

const LEGACY_ROLES: ClubCustomRole[] = [
  {
    id: LEGACY_ADMIN_ROLE_ID,
    name: 'Yönetici',
    color: '#8B2635',
    permissions: fullPermissions(),
  },
  {
    id: LEGACY_MEMBER_ROLE_ID,
    name: 'Üye',
    color: '#5C6BC0',
    permissions: emptyPermissions(),
  },
];

type RawMember = {
  user_id: string;
  full_name: string;
  role_ids?: string[] | null;
  role?: string | null;
  department_id?: string | null;
  joined_at: string;
};

type RawClubDetail = Omit<ClubDetail, 'members' | 'roles' | 'departments' | 'my_permissions' | 'category'> & {
  category?: ClubCategory | null;
  my_permissions?: ClubPermissions | null;
  members?: RawMember[] | null;
  roles?: ClubCustomRole[] | null;
  departments?: ClubDepartment[] | null;
};

function normalizeListItem(item: ClubListItem): ClubListItem {
  return {
    ...item,
    category: item.category ?? 'diger',
    description: item.description ?? '',
    logo_url: item.logo_url ?? null,
    membership: item.membership ?? null,
  };
}

function normalizeMember(member: RawMember, roles: ClubCustomRole[]): ClubMemberDetailed {
  if (Array.isArray(member.role_ids) && member.role_ids.length > 0) {
    return {
      user_id: member.user_id,
      full_name: member.full_name,
      role_ids: member.role_ids,
      department_id: member.department_id ?? null,
      joined_at: member.joined_at,
    };
  }

  const legacyRole = member.role === 'admin' ? LEGACY_ADMIN_ROLE_ID : LEGACY_MEMBER_ROLE_ID;
  const roleId = roles.some((r) => r.id === legacyRole) ? legacyRole : roles[0]?.id;
  return {
    user_id: member.user_id,
    full_name: member.full_name,
    role_ids: roleId ? [roleId] : [],
    department_id: member.department_id ?? null,
    joined_at: member.joined_at,
  };
}

function permissionsFromMembership(membership: ClubDetail['membership'], explicit?: ClubPermissions | null) {
  if (explicit) return explicit;
  if (membership === 'admin') return fullPermissions();
  return emptyPermissions();
}

function normalizeDetail(data: RawClubDetail): ClubDetail {
  const membership = data.membership ?? null;
  const roles =
    Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : [...LEGACY_ROLES];
  const members = (data.members ?? []).map((member) => normalizeMember(member, roles));

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    category: data.category ?? 'diger',
    logo_url: data.logo_url ?? null,
    created_by: data.created_by,
    created_at: data.created_at,
    membership,
    my_permissions: permissionsFromMembership(membership, data.my_permissions),
    members,
    roles,
    departments: data.departments ?? [],
  };
}

function normalizeAnnouncement(item: ClubAnnouncement & { author_name?: string }): ClubAnnouncement {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    author_id: item.author_id,
    author_name: item.author_name,
    target_department_id: item.target_department_id ?? null,
    target_department_name: item.target_department_name ?? null,
    created_at: item.created_at,
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
  const { data } = await api.get<RawClubDetail>(`/api/clubs/${clubId}`);
  return normalizeDetail(data);
}

export async function createClub(input: {
  name: string;
  description: string;
  category: ClubCategory;
  logo_url: string | null;
  creator: { user_id: string; full_name: string };
}): Promise<ClubDetail> {
  try {
    const { data } = await api.post<RawClubDetail>('/api/clubs', {
      name: input.name,
      description: input.description,
      category: input.category,
      logo_url: input.logo_url,
    });
    return normalizeDetail(data);
  } catch {
    // Mevcut backend henüz category/logo almaz.
    const { data } = await api.post<RawClubDetail>('/api/clubs', {
      name: input.name,
      description: input.description,
    });
    return normalizeDetail(data);
  }
}

export async function updateClub(
  clubId: string,
  patch: Partial<Pick<ClubDetail, 'name' | 'description' | 'category' | 'logo_url'>>,
): Promise<ClubDetail> {
  const { data } = await api.patch<RawClubDetail>(`/api/clubs/${clubId}`, patch);
  return normalizeDetail(data);
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
  // Yeni sözleşme
  try {
    const { data } = await api.patch<ClubMemberDetailed>(`/api/clubs/${clubId}/members/${userId}`, input);
    return data;
  } catch {
    // Eski backend: admin/member rolü
    const wantsAdmin = input.role_ids.includes(LEGACY_ADMIN_ROLE_ID);
    await api.put(`/api/clubs/${clubId}/members/${userId}/role`, {
      role: wantsAdmin ? 'admin' : 'member',
    });
    return {
      user_id: userId,
      full_name: '',
      role_ids: [wantsAdmin ? LEGACY_ADMIN_ROLE_ID : LEGACY_MEMBER_ROLE_ID],
      department_id: null,
      joined_at: new Date().toISOString(),
    };
  }
}

export async function listClubAnnouncements(clubId: string): Promise<ClubAnnouncement[]> {
  try {
    const { data } = await api.get<ClubAnnouncement[]>(`/api/clubs/${clubId}/announcements`);
    return data.map(normalizeAnnouncement);
  } catch {
    const { data } = await api.get<ClubAnnouncement[]>('/api/announcements', {
      params: { scope_type: 'club', scope_id: clubId },
    });
    return data.map(normalizeAnnouncement);
  }
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
  try {
    const { data } = await api.post<ClubAnnouncement>(`/api/clubs/${clubId}/announcements`, {
      title: input.title,
      content: input.content,
      target_department_id: input.target_department_id,
    });
    return normalizeAnnouncement(data);
  } catch {
    const { data } = await api.post<ClubAnnouncement>('/api/announcements', {
      title: input.title,
      content: input.content,
      scope_type: 'club',
      scope_id: clubId,
    });
    return normalizeAnnouncement({
      ...data,
      target_department_id: null,
      target_department_name: null,
    });
  }
}

export async function joinClub(clubId: string, _user: { user_id: string; full_name: string }): Promise<void> {
  await api.post(`/api/clubs/${clubId}/join`);
}
