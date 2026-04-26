'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { SalesOrder } from '@/types/erp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'

export default function OrdersPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { loadOrders() }, [user])

  const loadOrders = async () => {
    setLoading(true)
    try {
      // SALES: see their own orders; ADMIN/FINANCE/WAREHOUSE: see all orders
      const endpoint = user?.role === 'SALES' ? '/orders/mine' : '/orders'
      const data = await api.get<SalesOrder[]>(endpoint)
      setOrders(data)
    } finally { setLoading(false) }
  }

  const filtered = orders.filter(o => {
    const matchText = !filter || o.orderNo.toLowerCase().includes(filter.toLowerCase())
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchText && matchStatus
  })

  const STATUSES = ['', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SHIPPED', 'CONFIRMED']

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Orders</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'SALES' ? 'My orders' : 'All orders'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 px-4 py-3 flex gap-3 items-center flex-wrap">
        <input
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          placeholder="Search order number..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} orders</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Order No</th>
                <th className="px-6 py-3">Ship To</th>
                <th className="px-6 py-3">Bill To</th>
                <th className="px-6 py-3">Amount (KSh)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{order.orderNo}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">#{order.shipToCustomerId}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">#{order.billToCustomerId}</td>
                  <td className="px-6 py-3 font-semibold text-blue-700">
                    {Number(order.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{order.createdAt?.substring(0, 10)}</td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 inline-block"
                    >
                      View Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No orders found</div>
        )}
      </div>
    </div>
  )
}
