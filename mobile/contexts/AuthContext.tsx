import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { AuthUser } from '@/types/erp';
import { apiRequest, setUnauthorizedHandler } from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchAndMergeInfo(token: string, base: AuthUser): Promise<AuthUser> {
  try {
    const info = await apiRequest<AuthUser>('/auth/getInfo', {}, token);
    return {
      ...base,
      roles: info.roles,
      permissions: info.permissions,
      role: info.role ?? base.role,
      realName: info.realName ?? base.realName,
      username: info.username ?? base.username,
      userId: info.userId ?? base.userId,
    };
  } catch {
    return base;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await storage.remove('ERP_USER');
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const cur = await storage.get<AuthUser>('ERP_USER');
    if (!cur?.token) return;
    const merged = await fetchAndMergeInfo(cur.token, cur);
    await storage.set('ERP_USER', merged);
    setUser(merged);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    storage.get<AuthUser>('ERP_USER').then(async (u) => {
      if (u?.token) {
        const merged = await fetchAndMergeInfo(u.token, u);
        await storage.set('ERP_USER', merged);
        setUser(merged);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiRequest<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (!data?.token) {
      throw new Error('Login response missing token');
    }
    const merged = await fetchAndMergeInfo(data.token, data);
    await storage.set('ERP_USER', merged);
    setUser(merged);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshAuth }),
    [user, isLoading, login, logout, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Re-export for modules that already import apiRequest from AuthContext
export { apiRequest } from '@/lib/api';
export { API_BASE } from '@/lib/api';
