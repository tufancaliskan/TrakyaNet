import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { TOKEN_KEY, api } from '@/lib/api';
import type { Profile } from '@/types/database';

type SignUpResult = 'session' | 'confirm_email';

type Session = { token: string };

type AuthResponse = { token: string; user: Profile };

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(token: string, user: Profile) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return user;
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', {
      email: email.trim(),
      password,
    });
    await persist(data.token, data.user);
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
