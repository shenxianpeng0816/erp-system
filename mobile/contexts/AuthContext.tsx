import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { AuthUser } from '@/types/erp';
import { apiRequest, setUnauthorizedHandler } from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await storage.remove('ERP_USER');
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    storage.get<AuthUser>('ERP_USER').then((u) => {
      if (u?.token) {
        setUser(u);
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
    await storage.set('ERP_USER', data);
    setUser(data);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

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
