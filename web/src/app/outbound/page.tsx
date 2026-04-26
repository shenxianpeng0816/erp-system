'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { OutboundOrder, OutboundItem, Customer, SalesOrder, OrderItem } from '@/types/erp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'

export default function OutboundPage() {
  const [orders, setOrders] = useState<OutboundOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    try {
      const data = await api.get<OutboundOrder[]>('/outbound')
      setOrders(data)
    } finally { setLoading(false) }
  }

  const handleAction = async (id: number, action: 'print' | 'ship') => {
    await api.post(`/outbound/${id}/${action}`)
    loadOrders()
  }

  const filtered = orders.filter(o =>
    !filter || o.outboundNo.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Outbound Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Delivery Notes — manage and print</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 px-4 py-3">
        <input
          className="w-64 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by DN number..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">DN Number</th>
                <th className="px-6 py-3">Order No</th>
                <th className="px-6 py-3">Ship To</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{order.outboundNo}</td>
                  <td className="px-6 py-3 text-slate-600">SO#{order.orderId}</td>
                  <td className="px-6 py-3 text-slate-600">Customer #{order.shipToCustomerId}</td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-slate-500">{order.createdAt?.substring(0, 10)}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    {/* Print Delivery Note */}
                    <Link
                      href={`/outbound/${order.id}/print`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      🖨️ Print DN
                    </Link>
                    {/* Ship (execute outbound) */}
                    {(order.status === 'PENDING' || order.status === 'PRINTED') && (
                      <button
                        onClick={() => handleAction(order.id, 'ship')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        ✓ Execute Outbound
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No outbound orders found</div>
        )}
      </div>
    </div>
  )
}
