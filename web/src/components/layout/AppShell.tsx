'use client'
import { useAuthStore } from '@/store/auth-store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'

const PUBLIC_PATHS = ['/login']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // ── Wait for Zustand persist to rehydrate from localStorage ──────────────
  // On first render (SSR / before hydration), user is always null.
  // We must NOT redirect until we know whether localStorage actually has a user.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // useAuthStore.persist.hasHydrated() is true once localStorage is read
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    // In case hydration already finished before this effect runs
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return                          // still loading from localStorage
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login')
    }
  }, [user, pathname, hydrated])

  // Still rehydrating — show nothing to avoid flash
  if (!hydrated) return null

  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>
  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
