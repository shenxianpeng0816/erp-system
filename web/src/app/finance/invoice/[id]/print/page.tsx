'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Invoice, SalesOrder, OrderItem, Customer } from '@/types/erp'

interface PrintData {
  invoice: Invoice
  order: SalesOrder
  items: OrderItem[]
  billTo: Customer
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PrintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const invoice = await api.get<Invoice>(`/finance/invoices/${id}`)
      const order = await api.get<SalesOrder>(`/orders/${invoice.orderId}`)
      const items = await api.get<OrderItem[]>(`/orders/${invoice.orderId}/items`)
      const billTo = await api.get<Customer>(`/customers/${invoice.billToCustomerId}`)
      setData({ invoice, order, items, billTo })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !data) return <div className="flex items-center justify-center min-h-screen text-red-500">{error || 'Not found'}</div>

  const { invoice, order, items, billTo } = data
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Print toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-800 text-white px-6 py-3 flex items-center justify-between z-50">
        <span className="text-sm font-semibold">Invoice — {invoice.invoiceNo}</span>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">
            🖨️ Print / Save PDF
          </button>
          <button onClick={() => window.close()} className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="print:pt-0 pt-16">
        <div className="max-w-[210mm] mx-auto bg-white p-10 print:p-8 shadow-lg print:shadow-none min-h-[297mm]">

          {/* Header with dual branding */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-slate-800">
            <div className="flex items-center gap-4">
              {/* Haier Logo placeholder */}
              <div className="w-14 h-14 rounded-xl bg-blue-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white font-black text-sm leading-tight">Haier</div>
                  <div className="text-blue-200 text-[9px] leading-tight">Energy</div>
                </div>
              </div>
              {/* Vestwoods Logo placeholder */}
              <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white font-black text-xs leading-tight">VEST</div>
                  <div className="text-slate-300 text-[9px] leading-tight">WOODS</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-slate-800 tracking-tight">INVOICE</div>
            </div>
          </div>

          {/* Invoice meta + parties */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* From */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">From</div>
              <div className="font-bold text-slate-800">Xin Yan Clean Energy</div>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                <div>Contact: Sarah</div>
                <div>Tel: 0758896248</div>
                <div>Email: fashengchen03@gmail.com</div>
              </div>
            </div>
            {/* To */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bill To</div>
              <div className="font-bold text-slate-800">{billTo.name}</div>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                <div>Customer No: <span className="font-mono font-semibold">{billTo.customerNo}</span></div>
                {billTo.contactPerson && <div>Contact: {billTo.contactPerson}</div>}
                {billTo.phone && <div>Tel: {billTo.phone}</div>}
                {billTo.address && <div>{billTo.address}</div>}
              </div>
            </div>
          </div>

          {/* Invoice info bar */}
          <div className="bg-slate-50 rounded-xl px-6 py-4 mb-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Invoice No</div>
              <div className="font-bold font-mono text-slate-800">{invoice.invoiceNo}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Issue Date</div>
              <div className="font-semibold text-slate-800">{issueDate}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Order Ref</div>
              <div className="font-mono text-slate-800">{order.orderNo}</div>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="text-left px-4 py-3 rounded-tl-lg w-8">#</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-center px-4 py-3 w-20">Qty</th>
                <th className="text-right px-4 py-3 w-32">Unit Price (KSh)</th>
                <th className="text-right px-4 py-3 rounded-tr-lg w-36">Total (KSh)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.productName || `Product #${item.productId}`}
                    {item.remark && <div className="text-xs text-slate-400 mt-0.5">{item.remark}</div>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(item.unitPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{Number(item.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white">
                <td colSpan={3} className="px-4 py-4 rounded-bl-lg" />
                <td className="px-4 py-4 font-bold text-right text-sm">TOTAL</td>
                <td className="px-4 py-4 font-black text-right text-lg rounded-br-lg">
                  KSh {Number(invoice.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Terms */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-sm text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-800 mb-2">Terms & Conditions</div>
            <div>📍 <strong>Price Term:</strong> {order.priceTerm ?? 'DDP Kenya'}</div>
            <div>⏰ <strong>Validity Period:</strong> {order.validityDays ?? 30} Days</div>
            <div>💳 <strong>Payment Method:</strong> {invoice.paymentMethod ?? order.paymentMethod ?? 'Bank Transfer'}</div>
            <div>🔧 <strong>Warranty:</strong> Solar panel 10 years, Inverter &amp; Battery 5 years</div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            Thank you for your business. For queries contact: 0758896248 · fashengchen03@gmail.com
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
