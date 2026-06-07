import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Auth } from '../api/auth';
import type { UserDto } from '../types/api';

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<UserDto>;
  signup: (username: string, email: string, password: string) => Promise<UserDto>;
  demo: () => Promise<UserDto>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await Auth.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value: AuthContextValue = {
    user, loading, refresh,
    login: async (u, p) => { const r = await Auth.login(u, p); setUser(r); return r; },
    signup: async (u, e, p) => { const r = await Auth.signup(u, e, p); setUser(r); return r; },
    demo: async () => { const r = await Auth.demo(); setUser(r); return r; },
    logout: async () => { await Auth.logout(); setUser(null); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}
