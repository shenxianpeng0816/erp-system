'use client'
import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types/erp'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: '📊', roles: ['ADMIN', 'SALES', 'FINANCE', 'WAREHOUSE', 'INBOUND'] },
  { href: '/orders',     label: 'Orders',      icon: '📋', roles: ['ADMIN', 'SALES'] },
  { href: '/outbound',   label: 'Outbound',    icon: '📦', roles: ['ADMIN', 'WAREHOUSE'] },
  { href: '/inbound',    label: 'Inbound',     icon: '🚚', roles: ['ADMIN', 'INBOUND', 'WAREHOUSE'] },
  { href: '/finance',    label: 'Finance',     icon: '💰', roles: ['ADMIN', 'FINANCE'] },
  { href: '/inventory',  label: 'Inventory',   icon: '🏭', roles: ['ADMIN', 'WAREHOUSE', 'INBOUND'] },
  { href: '/customers',  label: 'Customers',   icon: '👥', roles: ['ADMIN', 'FINANCE', 'SALES'] },
  { href: '/users',      label: 'Users',       icon: '⚙️',  roles: ['ADMIN'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <div className="flex flex-col h-full w-60 bg-slate-900 text-white">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">ERP</div>
          <div>
            <div className="font-bold text-sm leading-tight">Sales System</div>
            <div className="text-xs text-slate-400">Vestwoods / Haier</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{user?.realName}</div>
            <div className="text-xs text-slate-400">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
