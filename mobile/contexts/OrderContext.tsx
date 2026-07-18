import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SalesOrder, Customer, Product, OrderItem, PageResult } from '@/types/erp';
import { apiRequest } from './AuthContext';
import { useAuth } from './AuthContext';

export type AdminOrderListMode = 'pending' | 'all' | 'mine';

export const ORDER_PAGE_SIZE = 10;

interface OrderContextType {
  orders: SalesOrder[];
  isLoading: boolean;
  fetchOrderListPage: (mode: AdminOrderListMode, page: number) => Promise<PageResult<SalesOrder>>;
  createOrder: (payload: {
    shipToCustomerId: number;
    billToCustomerId: number;
    countryCode: string;
    warehouseId: number;
    paymentMethod?: string;
    priceTerm?: string;
    validityDays?: number;
    remark?: string;
    etrRequired?: boolean;
    etrCompanyName?: string;
    etrCompanyKraPin?: string;
    items: OrderItem[];
  }) => Promise<SalesOrder>;
  submitOrder: (orderId: number) => Promise<SalesOrder>;
  approveOrder: (orderId: number, action: 'APPROVE' | 'REJECT' | 'REDIRECT', comment?: string, redirectTo?: number) => Promise<SalesOrder>;
  confirmDelivery: (orderId: number, signImageUrl?: string) => Promise<SalesOrder>;
  customers: Customer[];
  products: Product[];
  searchCustomers: (keyword: string) => Promise<Customer[]>;
  fetchProducts: (warehouseId?: number, countryCode?: string) => Promise<void>;
  patchOrderInList: (order: SalesOrder) => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrderListPage = useCallback(async (
    mode: AdminOrderListMode,
    page: number,
  ): Promise<PageResult<SalesOrder>> => {
    if (!user?.token) {
      throw new Error('Not authenticated');
    }
    const params = new URLSearchParams({
      page: String(page),
      size: String(ORDER_PAGE_SIZE),
    });
    if (mode === 'pending') {
      params.set('status', 'PENDING_APPROVAL');
    }
    const path = mode === 'mine'
      ? `/orders/mine?${params}`
      : `/orders?${params}`;
    const data = await apiRequest<PageResult<SalesOrder>>(path, {}, user.token);
    return {
      records: data?.records ?? [],
      total: data?.total ?? 0,
      current: data?.current ?? page,
      size: data?.size ?? ORDER_PAGE_SIZE,
    };
  }, [user]);

  const patchOrderInList = useCallback((order: SalesOrder) => {
    setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
  }, []);

  const createOrder = useCallback(async (payload: any) => {
    if (!user) throw new Error('Not authenticated');
    const order = await apiRequest<SalesOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, user.token);
    setOrders(prev => [order, ...prev]);
    return order;
  }, [user]);

  const submitOrder = useCallback(async (orderId: number) => {
    if (!user) throw new Error('Not authenticated');
    const order = await apiRequest<SalesOrder>(`/orders/${orderId}/submit`, {
      method: 'POST',
    }, user.token);
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    return order;
  }, [user]);

  const approveOrder = useCallback(async (orderId: number, action: string, comment?: string, redirectTo?: number) => {
    if (!user) throw new Error('Not authenticated');
    const order = await apiRequest<SalesOrder>(`/orders/${orderId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action, comment, redirectTo }),
    }, user.token);
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    return order;
  }, [user]);

  const confirmDelivery = useCallback(async (orderId: number, signImageUrl?: string) => {
    if (!user) throw new Error('Not authenticated');
    const url = `/orders/${orderId}/confirm${signImageUrl ? `?signImageUrl=${encodeURIComponent(signImageUrl)}` : ''}`;
    const order = await apiRequest<SalesOrder>(url, { method: 'POST' }, user.token);
    setOrders(prev => prev.map(o => o.id === orderId ? order : o));
    return order;
  }, [user]);

  const searchCustomers = useCallback(async (keyword: string) => {
    if (!user) return [];
    return apiRequest<Customer[]>(`/customers/search?keyword=${encodeURIComponent(keyword)}`, {}, user.token);
  }, [user]);

  const fetchProducts = useCallback(async (warehouseId?: number, countryCode?: string) => {
    if (!user) return;
    const params = new URLSearchParams();
    if (warehouseId != null) params.set('warehouseId', String(warehouseId));
    if (countryCode?.trim()) params.set('countryCode', countryCode.trim());
    const qs = params.toString();
    const path = qs ? `/inventory/products?${qs}` : '/inventory/products';
    const data = await apiRequest<Product[]>(path, {}, user.token);
    setProducts(data);
  }, [user]);

  const value = useMemo(() => ({
    orders,
    isLoading,
    fetchOrderListPage,
    createOrder,
    submitOrder,
    approveOrder,
    confirmDelivery,
    customers,
    products,
    searchCustomers,
    fetchProducts,
    patchOrderInList,
  }), [
    orders,
    isLoading,
    customers,
    products,
    fetchOrderListPage,
    createOrder,
    submitOrder,
    approveOrder,
    confirmDelivery,
    searchCustomers,
    fetchProducts,
    patchOrderInList,
  ]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
};
