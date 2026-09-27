import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from './api';
import { supabase } from './supabase';
import type { Role, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (required: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ROLE_LEVEL: Record<Role, number> = { VIEWER: 0, RESEARCHER: 1, ADMIN: 2 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (active) { setUser(null); setLoading(false); }
        return;
      }
      try {
        const result = await api.get<{ data: User }>('/auth/me');
        if (active) setUser(result.data);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new ApiError(error.message, error.status ?? 401, 'AUTH_ERROR');
    try {
      const result = await api.get<{ data: User }>('/auth/me');
      setUser(result.data);
      return result.data;
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const hasRole = useCallback((required: Role) => !!user && ROLE_LEVEL[user.role] >= ROLE_LEVEL[required], [user]);
  const value = useMemo(() => ({ user, loading, login, logout, hasRole }), [user, loading, login, logout, hasRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
