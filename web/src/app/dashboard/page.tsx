'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { SalesOrder, Invoice, Receivable, Inventory } from '@/types/erp'
import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'

interface Stats {
  pendingOrders: number
  pendingInvoices: number
  outstandingAmount: number
  lowStockItems: number
}

function StatCard({ title, value, icon, href, color }: { title: string; value: string | number; icon: string; href: string; color: string }) {
  return (
    <Link href={href} className={`block rounded-xl p-6 text-white shadow-lg hover:opacity-90 transition-opacity ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-4xl opacity-70">{icon}</span>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ pendingOrders: 0, pendingInvoices: 0, outstandingAmount: 0, lowStockItems: 0 })
  const [recentOrders, setRecentOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [orders, invoices, receivables, alerts] = await Promise.allSettled([
        api.get<SalesOrder[]>('/orders/pending'),
        api.get<Invoice[]>('/finance/invoices?status=PENDING'),
        api.get<Receivable[]>('/finance/receivables?status=OUTSTANDING'),
        api.get<Inventory[]>('/inventory/alerts'),
      ])

      const pendingOrders = orders.status === 'fulfilled' ? orders.value.length : 0
      const pendingInvoices = invoices.status === 'fulfilled' ? invoices.value.length : 0
      const outstandingAmount = receivables.status === 'fulfilled'
        ? receivables.value.reduce((s, r) => s + Number(r.balance), 0) : 0
      const lowStockItems = alerts.status === 'fulfilled' ? alerts.value.length : 0

      setStats({ pendingOrders, pendingInvoices, outstandingAmount, lowStockItems })

      // Recent orders (mine or all)
      const myOrders = await api.get<SalesOrder[]>(
        user?.role === 'SALES' ? '/orders/mine' : '/orders/pending'
      ).catch(() => [])
      setRecentOrders(myOrders.slice(0, 8))
    } finally {
      setLoading(false)
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    REJECTED: 'bg-red-100 text-red-700',
    SHIPPED: 'bg-violet-100 text-violet-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.realName} · {user?.role}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard title="Pending Approvals" value={stats.pendingOrders} icon="📋" href="/orders?status=PENDING_APPROVAL" color="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard title="Pending Invoices" value={stats.pendingInvoices} icon="🧾" href="/finance?tab=invoices" color="bg-gradient-to-br from-amber-500 to-orange-600" />
        <StatCard title="Outstanding (KSh)" value={`${(stats.outstandingAmount / 1000).toFixed(0)}K`} icon="💰" href="/finance?tab=receivables" color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard title="Low Stock Alerts" value={stats.lowStockItems} icon="⚠️" href="/inventory" color="bg-gradient-to-br from-red-500 to-rose-600" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Recent Orders</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No orders found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Order No</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{order.orderNo}</td>
                  <td className="px-6 py-3 font-semibold text-blue-700">KSh {Number(order.totalAmount).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{order.createdAt?.substring(0, 10)}</td>
                  <td className="px-6 py-3">
                    <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
