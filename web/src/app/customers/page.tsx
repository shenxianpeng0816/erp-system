'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Customer } from '@/types/erp'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await api.get<Customer[]>('/customers')
      setCustomers(data)
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!editCustomer.name || !editCustomer.customerNo) return
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/customers/${editId}`, editCustomer)
      } else {
        await api.post('/customers', editCustomer)
      }
      setShowForm(false); setEditCustomer({}); setEditId(null)
      loadCustomers()
    } finally { setSaving(false) }
  }

  const handleEdit = (c: Customer) => {
    setEditCustomer(c); setEditId(c.id); setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return
    await api.delete(`/customers/${id}`)
    loadCustomers()
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.customerNo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">Customer directory & pickup points</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditCustomer({}); setEditId(null) }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 px-4 py-3">
        <input className="w-72 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or customer code..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Customer No</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-semibold text-blue-700">{c.customerNo}</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">
                    {c.name}
                    {c.isPickupPoint === 1 && <span className="ml-2 inline-flex px-1.5 py-0.5 bg-violet-100 text-violet-700 text-xs rounded font-semibold">📍 Pickup</span>}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{c.type}</td>
                  <td className="px-6 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{c.contactPerson ?? '—'}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button onClick={() => handleEdit(c)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-slate-400">No customers found</div>}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-5">{editId ? 'Edit Customer' : 'Add Customer'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Customer Name *', key: 'name', full: true },
                { label: 'Customer No *', key: 'customerNo' },
                { label: 'Phone', key: 'phone' },
                { label: 'Email', key: 'email' },
                { label: 'Contact Person', key: 'contactPerson' },
              ].map(({ label, key, full }) => (
                <div key={key} className={full ? 'col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input value={(editCustomer as any)[key] ?? ''}
                    onChange={e => setEditCustomer(c => ({ ...c, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                <select value={editCustomer.type ?? 'REGULAR'} onChange={e => setEditCustomer(c => ({ ...c, type: e.target.value as any }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="REGULAR">Regular Customer</option>
                  <option value="PICKUP_POINT">Pickup Point</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="isPickup" checked={editCustomer.isPickupPoint === 1}
                  onChange={e => setEditCustomer(c => ({ ...c, isPickupPoint: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 rounded border-slate-300" />
                <label htmlFor="isPickup" className="text-sm font-medium text-slate-700">This customer is a pickup point</label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea value={editCustomer.address ?? ''} onChange={e => setEditCustomer(c => ({ ...c, address: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditCustomer({}); setEditId(null) }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {saving ? 'Saving…' : editId ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
