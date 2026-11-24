import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { TOKEN_KEY, api } from '@/lib/api';
import {
  DEV_PROFILE_KEY,
  DEV_TOKEN_PREFIX,
  ENABLE_DEV_ROLE_LOGIN,
  isDevToken,
  previewProfileFor,
} from '@/lib/devAuth';
import { clearPendingStudy, loadEntry, saveGate } from '@/lib/onboarding';
import { updateMyStudy } from '@/services/studyService';
import type { Profile, SystemRole } from '@/types/database';

type SignUpResult = 'session' | 'confirm_email';

type Session = { token: string };

type AuthResponse = { token: string; user: Profile };

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  role: SystemRole | null;
  isDevSession: boolean;
  initializing: boolean;
  signIn: (email: string, password: string, role: SystemRole) => Promise<void>;
  enterDevPreview: (role: SystemRole) => Promise<void>;
  switchPreviewRole: (role: SystemRole) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(token: string, user: Profile) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (isDevToken(token)) {
    await AsyncStorage.setItem(DEV_PROFILE_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(DEV_PROFILE_KEY);
  }
  return user;
}

async function clearSessionStorage() {
  await AsyncStorage.multiRemove([TOKEN_KEY, DEV_PROFILE_KEY]);
}

async function publishPendingStudy() {
  const entry = await loadEntry();
  if (!entry?.study) return;
  try {
    await updateMyStudy(entry.study);
    await clearPendingStudy();
  } catch {
    // Uç hazır olana kadar seçim telefonda kalır. Giriş yine tamamlanır.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const role = profile?.system_role ?? null;
  const isDevSession = isDevToken(session?.token);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!active) return;
        if (!token) {
          setSession(null);
          setProfile(null);
          return;
        }
        if (isDevToken(token) && ENABLE_DEV_ROLE_LOGIN) {
          const raw = await AsyncStorage.getItem(DEV_PROFILE_KEY);
          const saved = raw ? (JSON.parse(raw) as Profile) : null;
          if (!saved) {
            await clearSessionStorage();
            setSession(null);
            setProfile(null);
            return;
          }
          setSession({ token });
          setProfile(saved);
          return;
        }
        if (isDevToken(token)) {
          await clearSessionStorage();
          setSession(null);
          setProfile(null);
          return;
        }
        setSession({ token });
        const { data } = await api.get<Profile>('/api/auth/me');
        if (!active) return;
        setProfile(data);
      } catch {
        await clearSessionStorage();
        if (!active) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const enterDevPreview = useCallback(async (previewRole: SystemRole) => {
    if (!ENABLE_DEV_ROLE_LOGIN) {
      throw new Error('Geliştirici rol girişi kapalı.');
    }
    const user = previewProfileFor(previewRole);
    const token = `${DEV_TOKEN_PREFIX}${previewRole}`;
    await saveGate(previewRole);
    await persist(token, user);
    setSession({ token });
    setProfile(user);
  }, []);

  const signIn = useCallback(async (email: string, password: string, gate: SystemRole) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', {
      email: email.trim(),
      password,
    });
    if (data.user.system_role !== gate) {
      throw new Error('Bu hesap seçtiğin girişe ait değil.');
    }
    await persist(data.token, data.user);
    await publishPendingStudy();
    setSession({ token: data.token });
    setProfile(data.user);
  }, []);

  const switchPreviewRole = useCallback(
    async (next: SystemRole) => {
      if (!ENABLE_DEV_ROLE_LOGIN) return;
      await enterDevPreview(next);
    },
    [enterDevPreview],
  );

  const signUp = useCallback(async (input: { fullName: string; email: string; password: string }) => {
    const { data } = await api.post<AuthResponse>('/api/auth/register', {
      full_name: input.fullName.trim(),
      email: input.email.trim(),
      password: input.password,
    });
    await persist(data.token, data.user);
    await publishPendingStudy();
    setSession({ token: data.token });
    setProfile(data.user);
    return 'session' as const;
  }, []);

  const signOut = useCallback(async () => {
    await clearSessionStorage();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (isDevToken(token)) {
      const raw = await AsyncStorage.getItem(DEV_PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw) as Profile);
      return;
    }
    const { data } = await api.get<Profile>('/api/auth/me');
    setProfile(data);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      role,
      isDevSession,
      initializing,
      signIn,
      enterDevPreview,
      switchPreviewRole,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      role,
      isDevSession,
      initializing,
      signIn,
      enterDevPreview,
      switchPreviewRole,
      signUp,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  return context;
}
