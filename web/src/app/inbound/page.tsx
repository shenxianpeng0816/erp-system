'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { InboundOrder, Product } from '@/types/erp'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface InboundItemReq { productId: number; qty: number; unitCost?: number }

export default function InboundPage() {
  const [orders, setOrders] = useState<InboundOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ supplier: '', remark: '', items: [{ productId: 0, qty: 1, unitCost: 0 }] as InboundItemReq[] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ord, prods] = await Promise.all([
        api.get<InboundOrder[]>('/inbound'),
        api.get<Product[]>('/inventory/products'),
      ])
      setOrders(ord)
      setProducts(prods)
    } finally { setLoading(false) }
  }

  const handleConfirm = async (id: number) => {
    await api.post(`/inbound/${id}/confirm`)
    loadData()
  }

  const handleCreate = async () => {
    const valid = form.items.filter(i => i.productId && i.qty > 0)
    if (valid.length === 0) return
    setSaving(true)
    try {
      await api.post('/inbound', { ...form, items: valid })
      setShowCreate(false)
      setForm({ supplier: '', remark: '', items: [{ productId: 0, qty: 1, unitCost: 0 }] })
      loadData()
    } finally { setSaving(false) }
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: 0, qty: 1, unitCost: 0 }] }))
  const updateItem = (idx: number, field: keyof InboundItemReq, value: any) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }))
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inbound Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Stock receiving & inventory additions</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + New Inbound
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Inbound No</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{order.inboundNo}</td>
                  <td className="px-6 py-3 text-slate-600">{order.supplier ?? '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-slate-500">{order.createdAt?.substring(0, 10)}</td>
                  <td className="px-6 py-3 text-right">
                    {order.status === 'DRAFT' && (
                      <button onClick={() => handleConfirm(order.id)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100">
                        ✓ Confirm & Stock In
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && orders.length === 0 && <div className="text-center py-12 text-slate-400">No inbound orders</div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-5">New Inbound Order</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier</label>
                <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remark</label>
                <input value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional remark" />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Items</span>
                <button onClick={addItem} className="text-blue-600 hover:text-blue-700 font-bold">+ Add Row</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-slate-500">Product</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-500 w-20">Qty</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-500 w-28">Unit Cost</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <select value={item.productId} onChange={e => updateItem(idx, 'productId', parseInt(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value={0}>Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.productNo})</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {saving ? 'Saving…' : 'Create Inbound Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
