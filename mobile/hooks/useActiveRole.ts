import { useAuth } from '@/context/AuthContext';
import type { SystemRole } from '@/types/database';

export function useActiveRole() {
  const { profile, role, isDevSession } = useAuth();
  const activeRole: SystemRole | null = role ?? profile?.system_role ?? null;
  return {
    role: activeRole,
    profile,
    isDevSession,
    isStudent: activeRole === 'student',
    isTeacher: activeRole === 'teacher',
    isAdmin: activeRole === 'admin',
  };
}
