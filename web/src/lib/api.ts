// Central API client — calls SpringBoot backend
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api'

export type ApiResult<T> = { code: number; message: string; data: T }

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('erp_token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const json: ApiResult<T> = await res.json()
  if (json.code !== 200) throw new Error(json.message || 'Request failed')
  return json.data
}

export const api = {
  get:    <T>(path: string)                    => apiFetch<T>(path),
  post:   <T>(path: string, body?: unknown)    => apiFetch<T>(path, { method: 'POST',   body: body ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body?: unknown)    => apiFetch<T>(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                    => apiFetch<T>(path, { method: 'DELETE' }),
}
