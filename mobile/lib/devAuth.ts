import type { Profile, SystemRole } from '@/types/database';

/** BACKEND_BAGLA: yerel rol önizlemesi kapalı. */
export const ENABLE_DEV_ROLE_LOGIN = false;

export const DEV_TOKEN_PREFIX = 'dev:preview:';
export const DEV_PROFILE_KEY = 'trakyane.dev.profile';

export type DevPreviewProfile = Profile & {
  department?: string | null;
};

export function isDevToken(token: string | null | undefined) {
  return Boolean(token?.startsWith(DEV_TOKEN_PREFIX));
}

export function previewProfileFor(role: SystemRole): DevPreviewProfile {
  if (role === 'teacher') {
    return {
      id: 'dev-teacher',
      full_name: 'Ayşe Öğretim',
      email: 'ayse.ogretim@dev.trakyane',
      avatar_url: null,
      system_role: 'teacher',
      created_at: new Date().toISOString(),
      department: 'Bilişim Sistemleri ve Teknolojileri',
    };
  }
  if (role === 'admin') {
    return {
      id: 'dev-admin',
      full_name: 'Mehmet İdari',
      email: 'mehmet.idari@dev.trakyane',
      avatar_url: null,
      system_role: 'admin',
      created_at: new Date().toISOString(),
      department: 'Öğrenci İşleri',
    };
  }
  return {
    id: 'dev-student',
    full_name: 'Ali Öğrenci',
    email: 'ali.ogrenci@dev.trakyane',
    avatar_url: null,
    system_role: 'student',
    created_at: new Date().toISOString(),
    department: 'Bilişim Sistemleri ve Teknolojileri',
  };
}

export const previewRoleOptions: { role: SystemRole; label: string }[] = [
  { role: 'student', label: 'Öğrenci' },
  { role: 'teacher', label: 'Akademisyen' },
  { role: 'admin', label: 'İdari' },
];
