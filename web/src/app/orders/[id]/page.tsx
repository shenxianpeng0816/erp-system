'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { SalesOrder, OrderItem, Customer, ApprovalFlow, User } from '@/types/erp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuthStore } from '@/store/auth-store'

interface PageData {
  order: SalesOrder
  items: OrderItem[]
  shipTo: Customer | null
  billTo: Customer | null
  approvals: ApprovalFlow[]
}

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-700',
  APPROVED:   'bg-emerald-100 text-emerald-700',
  REJECTED:   'bg-red-100 text-red-700',
  REDIRECTED: 'bg-blue-100 text-blue-700',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Approval action state
  const [showApprovalPanel, setShowApprovalPanel] = useState(false)
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'REDIRECT'>('APPROVE')
  const [comment, setComment] = useState('')
  const [redirectTo, setRedirectTo] = useState('')
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState('')

  // Submit action state
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const order = await api.get<SalesOrder>(`/orders/${id}`)
      const items = await api.get<OrderItem[]>(`/orders/${id}/items`)
      const approvals = await api.get<ApprovalFlow[]>(`/orders/${id}/approvals`)

      // Fetch customer info in parallel
      const [shipTo, billTo] = await Promise.all([
        api.get<Customer>(`/customers/${order.shipToCustomerId}`).catch(() => null),
        order.billToCustomerId !== order.shipToCustomerId
          ? api.get<Customer>(`/customers/${order.billToCustomerId}`).catch(() => null)
          : null,
      ])
      const finalBillTo = billTo ?? (order.billToCustomerId === order.shipToCustomerId ? shipTo : null)

      setData({ order, items, shipTo, billTo: finalBillTo, approvals })
    } catch (e: any) {
      setError(e.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post(`/orders/${id}/submit`, {})
      loadData()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproval = async () => {
    setActionError('')
    setActing(true)
    try {
      await api.post(`/orders/${id}/approval`, {
        action,
        comment,
        redirectTo: redirectTo ? parseInt(redirectTo) : undefined,
      })
      setShowApprovalPanel(false)
      setComment('')
      setRedirectTo('')
      loadData()
    } catch (e: any) {
      setActionError(e.message || 'Action failed')
    } finally {
      setActing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="p-8 text-center text-red-500">{error || 'Order not found'}</div>
  )

  const { order, items, shipTo, billTo, approvals } = data
  const canSubmit = order.status === 'DRAFT' && user?.role === 'SALES'
  const canApprove = order.status === 'PENDING_APPROVAL' && user?.role === 'ADMIN'

  // Find linked outbound order (if available)
  const outboundLink = order.status === 'APPROVED' || order.status === 'SHIPPED' || order.status === 'CONFIRMED'

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/orders" className="hover:text-slate-600">Sales Orders</Link>
        <span>/</span>
        <span className="text-slate-700 font-semibold">{order.orderNo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{order.orderNo}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Created {order.createdAt?.substring(0, 10)}
            {order.remark && <span className="ml-3 text-slate-500 italic">"{order.remark}"</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold"
            >
              {submitting ? 'Submitting…' : '📤 Submit for Approval'}
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => { setShowApprovalPanel(true); setAction('APPROVE') }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
            >
              ✓ Review & Approve
            </button>
          )}
          {outboundLink && (
            <Link
              href="/outbound"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
            >
              📦 View Outbound
            </Link>
          )}
        </div>
      </div>

      {/* Reject reason banner */}
      {order.status === 'REJECTED' && order.rejectReason && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
          <span className="font-semibold">Rejection Reason: </span>{order.rejectReason}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Order Summary */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">Order Info</h3>
          <InfoRow label="Total Amount" value={`KSh ${Number(order.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`} bold />
          <InfoRow label="Payment Method" value={order.paymentMethod} />
          <InfoRow label="Price Term" value={order.priceTerm} />
          <InfoRow label="Validity" value={order.validityDays ? `${order.validityDays} days` : undefined} />
        </div>

        {/* Ship To */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">Ship To</h3>
          {shipTo ? (
            <>
              <div className="font-semibold text-slate-800">{shipTo.name}</div>
              {shipTo.customerNo && <InfoRow label="Customer No" value={shipTo.customerNo} mono />}
              {shipTo.contactPerson && <InfoRow label="Contact" value={shipTo.contactPerson} />}
              {shipTo.phone && <InfoRow label="Tel" value={shipTo.phone} />}
              {shipTo.address && <InfoRow label="Address" value={shipTo.address} />}
            </>
          ) : (
            <span className="text-slate-400 text-sm">Customer #{order.shipToCustomerId}</span>
          )}
        </div>

        {/* Bill To */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">Bill To</h3>
          {order.billToCustomerId === order.shipToCustomerId ? (
            <div className="text-slate-400 text-sm italic">Same as Ship To</div>
          ) : billTo ? (
            <>
              <div className="font-semibold text-slate-800">{billTo.name}</div>
              {billTo.customerNo && <InfoRow label="Customer No" value={billTo.customerNo} mono />}
              {billTo.contactPerson && <InfoRow label="Contact" value={billTo.contactPerson} />}
              {billTo.phone && <InfoRow label="Tel" value={billTo.phone} />}
              {billTo.address && <InfoRow label="Address" value={billTo.address} />}
            </>
          ) : (
            <span className="text-slate-400 text-sm">Customer #{order.billToCustomerId}</span>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Order Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Spec</th>
              <th className="px-6 py-3 text-center">Qty</th>
              <th className="px-6 py-3">Unit</th>
              <th className="px-6 py-3 text-right">Unit Price</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, idx) => (
              <tr key={item.id ?? idx} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-slate-400">{idx + 1}</td>
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-800">{item.productName || `Product #${item.productId}`}</div>
                  {item.productNo && <div className="text-xs text-slate-400 font-mono">{item.productNo}</div>}
                </td>
                <td className="px-6 py-3 text-slate-500 text-xs">{item.spec || '—'}</td>
                <td className="px-6 py-3 text-center font-bold text-slate-800">{item.qty}</td>
                <td className="px-6 py-3 text-slate-500">{item.unit || 'pcs'}</td>
                <td className="px-6 py-3 text-right text-slate-700">
                  {Number(item.unitPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-slate-800">
                  {Number(item.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3 text-slate-500 text-xs">{item.remark || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={6} className="px-6 py-3 text-right font-semibold text-slate-600 text-sm">Total</td>
              <td className="px-6 py-3 text-right font-black text-blue-700 text-base">
                KSh {Number(order.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Approval History */}
      {approvals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Approval History</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {approvals.map(flow => (
              <div key={flow.id} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {flow.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-700">Approver #{flow.approverId}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${APPROVAL_STATUS_COLORS[flow.status] || 'bg-slate-100 text-slate-600'}`}>
                      {flow.status}
                    </span>
                    {flow.redirectTo && (
                      <span className="text-xs text-slate-400">→ User #{flow.redirectTo}</span>
                    )}
                  </div>
                  {flow.comment && (
                    <p className="text-sm text-slate-500 italic">"{flow.comment}"</p>
                  )}
                  {flow.actedAt && (
                    <p className="text-xs text-slate-400 mt-0.5">{flow.actedAt.substring(0, 16).replace('T', ' ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery confirmation */}
      {order.status === 'CONFIRMED' && order.signImageUrl && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">Delivery Confirmation</h3>
          <p className="text-sm text-slate-600 mb-2">Customer signed proof received.</p>
          <img src={order.signImageUrl} alt="Signed delivery proof" className="max-h-40 rounded-lg border border-slate-200" />
        </div>
      )}

      {/* Approval Action Panel */}
      {showApprovalPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Order Approval</h3>
            <p className="text-sm text-slate-500 mb-5 font-mono">{order.orderNo}</p>

            <div className="flex gap-2 mb-5">
              {(['APPROVE', 'REJECT', 'REDIRECT'] as const).map(a => (
                <button key={a} onClick={() => setAction(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    action === a
                      ? a === 'APPROVE' ? 'bg-emerald-600 text-white' : a === 'REJECT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {a === 'APPROVE' ? '✓ Approve' : a === 'REJECT' ? '✕ Reject' : '↗ Redirect'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comment</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional comment..." />
              </div>
              {action === 'REDIRECT' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Redirect to User ID</label>
                  <input type="number" value={redirectTo} onChange={e => setRedirectTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user ID" />
                </div>
              )}
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowApprovalPanel(false); setComment('') }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleApproval} disabled={acting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold">
                {acting ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper component ─────────────────────────────────────────────────────────
function InfoRow({ label, value, bold, mono }: { label: string; value?: string | number | null; bold?: boolean; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-2 text-sm">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-bold text-blue-700' : 'text-slate-700'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
