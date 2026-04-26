'use client'
// Delivery Note print page — optimized for browser print / PDF save
// Uses window.print() — user can print or save as PDF from browser

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { OutboundOrder, OutboundItem, Customer, SalesOrder } from '@/types/erp'

interface PrintData {
  dn: OutboundOrder
  items: OutboundItem[]
  order: SalesOrder
  customer: Customer
}

export default function DeliveryNotePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PrintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const dn = await api.get<OutboundOrder>(`/outbound/${id}`)
      const items = await api.get<OutboundItem[]>(`/outbound/${id}/items`)
      const order = await api.get<SalesOrder>(`/orders/${dn.orderId}`)
      const customer = await api.get<Customer>(`/customers/${dn.shipToCustomerId}`)
      setData({ dn, items, order, customer })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center min-h-screen text-red-500">{error || 'Not found'}</div>
  )

  const { dn, items, order, customer } = data
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-800 text-white px-6 py-3 flex items-center justify-between z-50">
        <span className="text-sm font-semibold">Delivery Note Preview — {dn.outboundNo}</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            🖨️ Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Delivery Note document */}
      <div className="print:pt-0 pt-16">
        <div className="max-w-[210mm] mx-auto bg-white p-10 print:p-8 shadow-lg print:shadow-none min-h-[297mm]">

          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">VW</span>
                </div>
                <div>
                  <div className="font-bold text-xl text-slate-800">LINKX SUPPLY CHAIN LTD</div>
                  <div className="text-xs text-slate-500">Vestwoods / Haier Energy Partner</div>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 mt-2">
                <div>📧 fashengchen03@gmail.com</div>
                <div>📞 0758896248</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-800 tracking-tight">DELIVERY NOTE</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-end gap-4">
                  <span className="text-slate-500">DN Number:</span>
                  <span className="font-bold font-mono">{dn.outboundNo}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-slate-500">Order Ref:</span>
                  <span className="font-mono">{order.orderNo}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-slate-500">Date:</span>
                  <span>{today}</span>
                </div>
              </div>
            </div>
          </div>

          {/* To section */}
          <div className="mb-8">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deliver To</div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="font-bold text-slate-800 text-base">{customer.name}</div>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                {customer.customerNo && <div>Customer No: <span className="font-mono font-semibold">{customer.customerNo}</span></div>}
                {customer.address && <div>{customer.address}</div>}
                {customer.contactPerson && <div>Contact: {customer.contactPerson}</div>}
                {customer.phone && <div>Tel: {customer.phone}</div>}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-4 py-3 rounded-tl-lg font-semibold w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-center px-4 py-3 font-semibold w-24">Quantity</th>
                  <th className="text-center px-4 py-3 rounded-tr-lg font-semibold w-24">Unit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.productName || `Product #${item.productId}`}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{item.qty}</td>
                    <td className="px-4 py-3 text-center text-slate-600">pcs</td>
                  </tr>
                ))}
                {/* Empty rows for manual additions */}
                {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-slate-100">
                    <td className="px-4 py-4 text-slate-300">{items.length + i + 1}</td>
                    <td className="px-4 py-4" />
                    <td className="px-4 py-4" />
                    <td className="px-4 py-4" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remarks + Signature */}
          <div className="grid grid-cols-2 gap-8 mt-auto">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remarks</div>
              <div className="border border-slate-200 rounded-lg p-4 min-h-[80px] text-sm text-slate-600">
                {order.remark || ''}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Received By (Signature &amp; Date)</div>
              <div className="border border-slate-200 rounded-lg p-4 min-h-[80px]">
                <div className="mt-8 border-t border-slate-400 pt-2 text-xs text-slate-400 text-center">Signature &amp; Stamp</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            This delivery note is computer generated and valid without signature unless otherwise stated.
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
