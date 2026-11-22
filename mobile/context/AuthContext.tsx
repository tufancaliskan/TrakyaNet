import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { TOKEN_KEY, api } from '@/lib/api';
import { DEV_PROFILE_KEY, isDevToken } from '@/lib/devAuth';
import { clearPendingStudy, loadEntry } from '@/lib/onboarding';
import { updateMyStudy } from '@/services/studyService';
import type { Profile, SystemRole } from '@/types/database';

type SignUpResult = 'session' | 'confirm_email';

type Session = { token: string };

type AuthResponse = { token: string; user: Profile };

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  signIn: (email: string, password: string, role: SystemRole) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(token: string, user: Profile) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return user;
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
        // Eski yerel önizleme token'ı kalmışsa temizle; gerçek API'ye gönderme.
        if (isDevToken(token)) {
          await AsyncStorage.multiRemove([TOKEN_KEY, DEV_PROFILE_KEY]);
          setSession(null);
          setProfile(null);
          return;
        }
        setSession({ token });
        const { data } = await api.get<Profile>('/api/auth/me');
        if (!active) return;
        setProfile(data);
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
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

  const signIn = useCallback(async (email: string, password: string, role: SystemRole) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', {
      email: email.trim(),
      password,
    });
    if (data.user.system_role !== role) {
      throw new Error('Bu hesap seçtiğin girişe ait değil.');
    }
    await persist(data.token, data.user);
    await publishPendingStudy();
    setSession({ token: data.token });
    setProfile(data.user);
  }, []);

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
    await AsyncStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get<Profile>('/api/auth/me');
    setProfile(data);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, initializing, signIn, signUp, signOut, refreshProfile }),
    [session, profile, initializing, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  return context;
}
