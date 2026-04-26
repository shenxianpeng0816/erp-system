import { cn } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  // Order statuses
  DRAFT:            { label: 'Draft',           color: 'bg-gray-100 text-gray-600' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700' },
  APPROVED:         { label: 'Approved',         color: 'bg-blue-100 text-blue-700' },
  REJECTED:         { label: 'Rejected',         color: 'bg-red-100 text-red-700' },
  SHIPPED:          { label: 'Shipped',          color: 'bg-violet-100 text-violet-700' },
  CONFIRMED:        { label: 'Confirmed',        color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:        { label: 'Cancelled',        color: 'bg-gray-100 text-gray-500' },
  // Invoice statuses
  PENDING:          { label: 'Pending',          color: 'bg-amber-100 text-amber-700' },
  PARTIAL:          { label: 'Partial',          color: 'bg-blue-100 text-blue-700' },
  PAID:             { label: 'Paid',             color: 'bg-emerald-100 text-emerald-700' },
  // Receivable statuses
  OUTSTANDING:      { label: 'Outstanding',      color: 'bg-amber-100 text-amber-700' },
  SETTLED:          { label: 'Settled',          color: 'bg-emerald-100 text-emerald-700' },
  OVERDUE:          { label: 'Overdue',          color: 'bg-red-100 text-red-700' },
  // Inbound
  CONFIRMED_IN:     { label: 'Confirmed',        color: 'bg-emerald-100 text-emerald-700' },
  // Outbound
  PRINTED:          { label: 'Printed',          color: 'bg-blue-100 text-blue-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', s.color)}>
      {s.label}
    </span>
  )
}
