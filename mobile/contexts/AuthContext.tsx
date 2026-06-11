import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { AuthUser } from '@/types/erp';

// ── Config ────────────────────────────────────────────────────────────────────
// 部署时通过环境变量注入，deploy 脚本会写入 .env（EXPO_PUBLIC_API_BASE / NEXT_PUBLIC_API_BASE）
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080/api';

// ── API Helper ────────────────────────────────────────────────────────────────
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || 'Request failed');
  return data.data;
}

// ── Auth Context ──────────────────────────────────────────────────────────────
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

  useEffect(() => {
    storage.get<AuthUser>('ERP_USER').then((u) => {
      setUser(u ?? null);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiRequest<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await storage.set('ERP_USER', data);
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await storage.remove('ERP_USER');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
