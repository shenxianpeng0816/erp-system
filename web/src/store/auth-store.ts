import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/erp'

interface AuthState {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_token', user.token)
        }
        set({ user })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_token')
        }
        set({ user: null })
      },
    }),
    { name: 'erp-auth' }
  )
)
