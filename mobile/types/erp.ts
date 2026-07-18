// Types for ERP System

export type UserRole = 'ADMIN' | 'SALES' | 'FINANCE' | 'WAREHOUSE' | 'INBOUND';

export interface AuthUser {
  userId: number;
  username: string;
  realName: string;
  role: UserRole;
  token: string;
}

export interface Customer {
  id: number;
  customerNo: string;
  name: string;
  type: 'REGULAR' | 'PICKUP_POINT' | 'DISTRIBUTOR';
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  isPickupPoint: number;
  countryCode?: string;
  firstTransactionAt?: string;
  shopName?: string;
  invoiceRequired?: number;
  photoUrl?: string;
}

export interface Product {
  id: number;
  productNo: string;
  name: string;
  spec?: string;
  category?: string;
  unit: string;
  unitPrice: number;
  /** ISO 3166-1 alpha-2 — pricing currency from CountryEnum */
  countryCode?: string;
  imageUrl?: string;
  remark?: string;
  status?: number;
  stockQty?: number;
}

export interface Warehouse {
  id: number;
  warehouseCode: string;
  name: string;
  countryCode: string;
  city?: string;
  type: 'MAIN' | 'BRANCH';
  address?: string;
  isDefault?: boolean;
  status?: number;
}

export interface OrderItem {
  id?: number;
  productId: number;
  productName?: string;
  productNo?: string;
  spec?: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  total: number;
  remark?: string;
}

export interface ApprovalFlow {
  id: number;
  orderId: number;
  step: number;
  approverId: number;
  approverName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REDIRECTED';
  redirectTo?: number;
  redirectToName?: string;
  comment?: string;
  actedAt?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SHIPPED'
  | 'CONFIRMED'
  | 'CANCELLED';

export interface SalesOrder {
  id: number;
  orderNo: string;
  salesUserId: number;
  salesUserName?: string;
  shipToCustomerId: number;
  shipToCustomerName?: string;
  billToCustomerId: number;
  billToCustomerName?: string;
  countryCode?: string;
  shipFromWarehouseId?: number;
  shipFromWarehouseName?: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod?: string;
  priceTerm?: string;
  validityDays?: number;
  remark?: string;
  etrRequired?: boolean;
  etrCompanyName?: string;
  etrCompanyKraPin?: string;
  rejectReason?: string;
  signImageUrl?: string;
  createdAt: string;
}

export interface Invoice {
  id: number;
  invoiceNo: string;
  orderId: number;
  billToCustomerId: number;
  amount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate?: string;
}

export interface Receivable {
  id: number;
  invoiceId: number;
  customerId: number;
  productName?: string;
  qty?: number;
  unitPrice?: number;
  amount: number;
  receivedAmount: number;
  balance: number;
  dueDate?: string;
  status: 'OUTSTANDING' | 'PARTIAL' | 'SETTLED' | 'OVERDUE';
}

export interface OutboundOrder {
  id: number;
  outboundNo: string;
  orderId: number;
  shipToCustomerId: number;
  status: 'PENDING' | 'PRINTED' | 'SHIPPED' | 'CONFIRMED' | 'CANCELLED';
  shippedAt?: string;
}

export interface Inventory {
  id: number;
  productId: number;
  qty: number;
  minQty: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}
