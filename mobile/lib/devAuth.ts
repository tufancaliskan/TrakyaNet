import type { Profile, SystemRole } from '@/types/database';

/** Akademisyen / idari arayüz önizlemesi. Üretimde false yap. */
export const ENABLE_DEV_ROLE_LOGIN = false;

export const DEV_TOKEN_PREFIX = 'dev:preview:';
export const DEV_PROFILE_KEY = 'trakyane.dev.profile';

export type DevPreviewProfile = Profile & {
  department?: string | null;
};

export function isDevToken(token: string | null | undefined) {
  return Boolean(token?.startsWith(DEV_TOKEN_PREFIX));
}

export function previewProfileFor(role: Exclude<SystemRole, 'student'>): DevPreviewProfile {
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

export const previewRoleOptions: { role: SystemRole; label: string }[] = [
  { role: 'student', label: 'Öğrenci' },
  { role: 'teacher', label: 'Akademisyen' },
  { role: 'admin', label: 'İdari' },
];
