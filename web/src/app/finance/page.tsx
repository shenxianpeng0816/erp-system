'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Invoice, Receivable } from '@/types/erp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'

type Tab = 'invoices' | 'receivables'

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)

  // Payment modal
  const [payModal, setPayModal] = useState<{ open: boolean; id: number; balance: number }>({ open: false, id: 0, balance: 0 })
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Bank Transfer')
  const [mpesaRef, setMpesaRef] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { loadData() }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'invoices') {
        const data = await api.get<Invoice[]>('/finance/invoices')
        setInvoices(data)
      } else {
        const data = await api.get<Receivable[]>('/finance/receivables')
        setReceivables(data)
      }
    } finally { setLoading(false) }
  }

  const handlePay = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return
    setPaying(true)
    try {
      await api.post(`/finance/receivables/${payModal.id}/pay`, {
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
        mpesaRef: mpesaRef || undefined,
        paidAt: new Date().toISOString().substring(0, 10),
      })
      setPayModal({ open: false, id: 0, balance: 0 })
      setPayAmount('')
      loadData()
    } finally { setPaying(false) }
  }

  const totalOutstanding = receivables
    .filter(r => r.status !== 'SETTLED')
    .reduce((s, r) => s + Number(r.balance), 0)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Finance</h1>
        <p className="text-slate-500 text-sm mt-1">Invoices & Accounts Receivable</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
        {(['invoices', 'receivables'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'invoices' ? '🧾 Invoices' : '💰 Receivables'}
          </button>
        ))}
      </div>

      {/* Receivables summary */}
      {tab === 'receivables' && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white mb-6">
          <div className="text-sm font-medium opacity-80">Total Outstanding Balance</div>
          <div className="text-4xl font-black mt-1">KSh {totalOutstanding.toLocaleString()}</div>
        </div>
      )}

      {/* Invoice Table */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3">Invoice No</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-slate-800">{inv.invoiceNo}</td>
                    <td className="px-6 py-3 text-slate-600">Customer #{inv.billToCustomerId}</td>
                    <td className="px-6 py-3 font-semibold text-blue-700">KSh {Number(inv.amount).toLocaleString()}</td>
                    <td className="px-6 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-6 py-3 text-slate-500">{inv.issueDate}</td>
                    <td className="px-6 py-3 text-slate-500">{inv.dueDate ?? '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/finance/invoice/${inv.id}/print`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        🖨️ Print Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && invoices.length === 0 && <div className="text-center py-12 text-slate-400">No invoices found</div>}
        </div>
      )}

      {/* Receivables Table */}
      {tab === 'receivables' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Received</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receivables.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-800">Customer #{rec.customerId}</td>
                    <td className="px-6 py-3">KSh {Number(rec.amount).toLocaleString()}</td>
                    <td className="px-6 py-3 text-emerald-600 font-semibold">KSh {Number(rec.receivedAmount).toLocaleString()}</td>
                    <td className="px-6 py-3 font-bold text-red-600">KSh {Number(rec.balance).toLocaleString()}</td>
                    <td className="px-6 py-3"><StatusBadge status={rec.status} /></td>
                    <td className="px-6 py-3 text-slate-500">{rec.dueDate ?? '—'}</td>
                    <td className="px-6 py-3 text-right">
                      {rec.status !== 'SETTLED' && (
                        <button
                          onClick={() => { setPayModal({ open: true, id: rec.id, balance: Number(rec.balance) }); setPayAmount(String(Number(rec.balance))) }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          💳 Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && receivables.length === 0 && <div className="text-center py-12 text-slate-400">No receivables found</div>}
        </div>
      )}

      {/* Payment Modal */}
      {payModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Record Payment</h3>
            <div className="text-sm text-slate-500 mb-4">Outstanding balance: <span className="font-bold text-red-600">KSh {payModal.balance.toLocaleString()}</span></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (KSh)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Bank Transfer</option>
                  <option>Mpesa</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                </select>
              </div>
              {payMethod === 'Mpesa' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mpesa Ref</label>
                  <input value={mpesaRef} onChange={e => setMpesaRef(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. QXJ9JV..." />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPayModal({ open: false, id: 0, balance: 0 })}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handlePay} disabled={paying}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {paying ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
