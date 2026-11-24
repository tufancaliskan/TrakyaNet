import type { ClubRole, SystemRole } from '@/types/database';

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function parseDueDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 23, 59, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date.toISOString();
}

export const roleLabel: Record<SystemRole, string> = {
  student: 'Öğrenci',
  teacher: 'Akademisyen',
  admin: 'İdari',
};

export const clubRoleLabel: Record<ClubRole, string> = {
  member: 'Üye',
  admin: 'Yönetici',
};

export function canManageClasses(role: SystemRole | undefined) {
  return role === 'teacher' || role === 'admin';
}

export function initialOf(name: string) {
  const letter = name.trim().charAt(0);
  return letter ? letter.toLocaleUpperCase('tr-TR') : '?';
}
