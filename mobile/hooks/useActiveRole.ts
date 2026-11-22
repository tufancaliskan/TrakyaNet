import { useAuth } from '@/context/AuthContext';
import type { SystemRole } from '@/types/database';

export function useActiveRole() {
  const { profile } = useAuth();
  const activeRole: SystemRole | null = profile?.system_role ?? null;
  return {
    role: activeRole,
    profile,
    isDevSession: false,
    isStudent: activeRole === 'student',
    isTeacher: activeRole === 'teacher',
    isAdmin: activeRole === 'admin',
  };
}
