import { storage } from '@/utils/storage';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080/api';

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function parseResponseBody(res: Response): Promise<ApiEnvelope<unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    if (res.status === 401) {
      return { code: 401, message: 'Unauthorized', data: null };
    }
    if (res.status === 403) {
      return { code: 403, message: '权限不足', data: null };
    }
    throw new Error(
      `Server returned empty response (HTTP ${res.status}). Check backend is running and EXPO_PUBLIC_API_BASE=${API_BASE}`,
    );
  }
  try {
    return JSON.parse(text) as ApiEnvelope<unknown>;
  } catch {
    throw new Error(`Invalid server response (HTTP ${res.status}). Expected JSON.`);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach API at ${API_BASE}. Check network and EXPO_PUBLIC_API_BASE.`);
  }

  const data = await parseResponseBody(res);

  if (res.status === 401 || data.code === 401) {
    await storage.remove('ERP_USER');
    unauthorizedHandler?.();
    throw new Error(data.message || 'Session expired. Please sign in again.');
  }

  if (!res.ok || (data.code != null && data.code !== 200)) {
    throw new Error(data.message || `Request failed (HTTP ${res.status})`);
  }

  return data.data as T;
}
