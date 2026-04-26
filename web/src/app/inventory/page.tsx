'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Inventory, Product } from '@/types/erp'

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stock' | 'products'>('stock')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ unit: 'pcs', unitPrice: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'stock') {
        const inv = await api.get<Inventory[]>('/inventory')
        const prods = await api.get<Product[]>('/inventory/products')
        const enriched = inv.map(i => ({
          ...i,
          product: prods.find(p => p.id === i.productId),
        }))
        setInventory(enriched)
      } else {
        const prods = await api.get<Product[]>('/inventory/products')
        setProducts(prods)
      }
    } finally { setLoading(false) }
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.productNo) return
    setSaving(true)
    try {
      await api.post('/inventory/products', { ...newProduct, status: 1 })
      setShowAddProduct(false)
      setNewProduct({ unit: 'pcs', unitPrice: 0 })
      loadData()
    } finally { setSaving(false) }
  }

  const lowStock = inventory.filter(i => i.qty <= i.minQty).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Stock levels & product management</p>
        </div>
        {tab === 'products' && (
          <button onClick={() => setShowAddProduct(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            + Add Product
          </button>
        )}
      </div>

      {/* Low stock alert */}
      {lowStock > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 mb-5 text-sm font-medium">
          ⚠️ {lowStock} product(s) are below minimum stock level
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
        {(['stock', 'products'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t === 'stock' ? '📦 Stock Levels' : '🗂️ Products'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'stock' ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-center">Current Qty</th>
                <th className="px-6 py-3 text-center">Min Qty</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.map(item => {
                const low = item.qty <= item.minQty
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${low ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-3 font-semibold text-slate-800">{item.product?.name ?? `Product #${item.productId}`}</td>
                    <td className="px-6 py-3 font-mono text-slate-500 text-xs">{item.product?.productNo ?? '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{item.product?.category ?? '—'}</td>
                    <td className={`px-6 py-3 text-center font-bold text-lg ${low ? 'text-red-600' : 'text-emerald-600'}`}>{item.qty}</td>
                    <td className="px-6 py-3 text-center text-slate-500">{item.minQty}</td>
                    <td className="px-6 py-3 text-center">
                      {low
                        ? <span className="inline-flex px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Low Stock</span>
                        : <span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">OK</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Spec / Model</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{p.productNo}</td>
                  <td className="px-6 py-3 text-slate-600">{p.spec ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.category ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.unit}</td>
                  <td className="px-6 py-3 text-right font-semibold text-blue-700">KSh {Number(p.unitPrice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && inventory.length === 0 && tab === 'stock' && <div className="text-center py-12 text-slate-400">No inventory records</div>}
        {!loading && products.length === 0 && tab === 'products' && <div className="text-center py-12 text-slate-400">No products found</div>}
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-5">Add New Product</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Product Name *', key: 'name', full: true },
                { label: 'Product No *', key: 'productNo' },
                { label: 'Category', key: 'category' },
                { label: 'Spec / Model', key: 'spec' },
                { label: 'Unit', key: 'unit' },
                { label: 'Unit Price (KSh)', key: 'unitPrice', type: 'number' },
              ].map(({ label, key, full, type }) => (
                <div key={key} className={full ? 'col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input type={type || 'text'}
                    value={(newProduct as any)[key] ?? ''}
                    onChange={e => setNewProduct(p => ({ ...p, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddProduct(false)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold">Cancel</button>
              <button onClick={handleAddProduct} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {saving ? 'Saving…' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
