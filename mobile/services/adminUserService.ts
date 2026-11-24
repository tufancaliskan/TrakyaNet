import { api } from '@/lib/api';
import type { AdminUser } from '@/types/classroom';
import type { SystemRole } from '@/types/database';

export async function searchAdminUsers(search = ''): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/api/admin/users', {
    params: search.trim() ? { search: search.trim() } : undefined,
  });
  return data;
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  role: SystemRole;
}): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>('/api/admin/users', {
    email: input.email.trim(),
    password: input.password,
    role: input.role,
  });
  return data;
}

export async function patchAdminUser(
  userId: string,
  patch: { role?: SystemRole; can_create_club?: boolean },
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/api/admin/users/${userId}`, patch);
  return data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await api.delete(`/api/admin/users/${userId}`);
}
