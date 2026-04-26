export type UserRole = 'ADMIN' | 'SALES' | 'FINANCE' | 'WAREHOUSE' | 'INBOUND'

export interface AuthUser {
  userId: number
  username: string
  realName: string
  role: UserRole
  token: string
}

export interface Customer {
  id: number
  customerNo: string
  name: string
  type: 'REGULAR' | 'PICKUP_POINT' | 'DISTRIBUTOR'
  phone?: string
  email?: string
  address?: string
  contactPerson?: string
  isPickupPoint: number
  creditLimit?: number
  remark?: string
  status?: number
}

export interface Product {
  id: number
  productNo: string
  name: string
  spec?: string
  category?: string
  unit: string
  unitPrice: number
  status?: number
}

export interface OrderItem {
  id?: number
  orderId?: number
  productId: number
  productName?: string
  productNo?: string
  spec?: string
  unit?: string
  qty: number
  unitPrice: number
  total: number
  remark?: string
}

export interface ApprovalFlow {
  id: number
  orderId: number
  step: number
  approverId: number
  approverName?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REDIRECTED'
  redirectTo?: number
  comment?: string
  actedAt?: string
  createdAt: string
}

export type OrderStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED'
  | 'REJECTED' | 'SHIPPED' | 'CONFIRMED' | 'CANCELLED'

export interface SalesOrder {
  id: number
  orderNo: string
  salesUserId: number
  salesUserName?: string
  shipToCustomerId: number
  shipToCustomerName?: string
  billToCustomerId: number
  billToCustomerName?: string
  status: OrderStatus
  totalAmount: number
  paymentMethod?: string
  priceTerm?: string
  validityDays?: number
  remark?: string
  rejectReason?: string
  signImageUrl?: string
  createdAt: string
}

export interface Invoice {
  id: number
  invoiceNo: string
  orderId: number
  billToCustomerId: number
  billToCustomerName?: string
  amount: number
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'
  issueDate: string
  dueDate?: string
  paymentMethod?: string
  remark?: string
}

export interface Receivable {
  id: number
  invoiceId: number
  customerId: number
  customerName?: string
  amount: number
  receivedAmount: number
  balance: number
  dueDate?: string
  status: 'OUTSTANDING' | 'PARTIAL' | 'SETTLED' | 'OVERDUE'
}

export interface OutboundOrder {
  id: number
  outboundNo: string
  orderId: number
  shipToCustomerId: number
  shipToCustomerName?: string
  operatorId?: number
  status: 'PENDING' | 'PRINTED' | 'SHIPPED' | 'CONFIRMED' | 'CANCELLED'
  shippedAt?: string
  remark?: string
  createdAt: string
}

export interface OutboundItem {
  id: number
  outboundId: number
  productId: number
  productName?: string
  qty: number
}

export interface InboundOrder {
  id: number
  inboundNo: string
  supplier?: string
  operatorId: number
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  remark?: string
  inboundAt?: string
  createdAt: string
}

export interface Inventory {
  id: number
  productId: number
  productName?: string
  productNo?: string
  qty: number
  minQty: number
}

export interface User {
  id: number
  username: string
  realName: string
  phone?: string
  email?: string
  role: UserRole
  status: number
}
