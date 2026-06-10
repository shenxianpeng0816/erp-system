import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SalesOrder, Customer, Product, OrderItem } from '@/types/erp';
import { apiRequest } from './AuthContext';
import { useAuth } from './AuthContext';

export type AdminOrderListMode = 'pending' | 'all' | 'mine';

interface OrderContextType {
  orders: SalesOrder[];
  isLoading: boolean;
  fetchMyOrders: () => Promise<void>;
  fetchPendingOrders: () => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  createOrder: (payload: {
    shipToCustomerId: number;
    billToCustomerId: number;
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
  fetchProducts: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<SalesOrder[]>('/orders/mine', {}, user.token);
      setOrders(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPendingOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<SalesOrder[]>('/orders/pending', {}, user.token);
      setOrders(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchAllOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<SalesOrder[]>('/orders', {}, user.token);
      setOrders(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const data = await apiRequest<Product[]>('/inventory/products', {}, user.token);
    setProducts(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const value = useMemo(() => ({
    orders, isLoading, fetchMyOrders, fetchPendingOrders, fetchAllOrders,
    createOrder, submitOrder, approveOrder, confirmDelivery,
    customers, products, searchCustomers, fetchProducts,
  }), [orders, isLoading, customers, products, fetchMyOrders, fetchPendingOrders, fetchAllOrders, createOrder, submitOrder, approveOrder, confirmDelivery, searchCustomers, fetchProducts]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
};
