import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Href } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, AdminOrderListMode } from '@/contexts/OrderContext';
import { SalesOrder } from '@/types/erp';
import { hideOrderAmountsForRole } from '@/lib/order-view-policy';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9CA3AF',
  PENDING_APPROVAL: '#F59E0B',
  APPROVED: '#3B82F6',
  REJECTED: '#EF4444',
  SHIPPED: '#8B5CF6',
  CONFIRMED: '#10B981',
  CANCELLED: '#6B7280',
};

const ADMIN_LIST_MODES: { key: AdminOrderListMode; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
];

function normalizeRole(role: string | undefined): string {
  return String(role ?? '').trim().toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] + '22' }]}>
      <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

function OrderCard({ order, onPress, hideAmounts }: { order: SalesOrder; onPress: () => void; hideAmounts: boolean }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={styles.cardCustomer} numberOfLines={2}>
        {order.billToCustomerId === order.shipToCustomerId
          ? (order.shipToCustomerName ?? `Customer #${order.shipToCustomerId}`)
          : `${order.shipToCustomerName ?? `#${order.shipToCustomerId}`} · ${order.billToCustomerName ?? `#${order.billToCustomerId}`}`}
      </Text>
      {order.salesUserName ? (
        <Text style={styles.cardSales}>Sales: {order.salesUserName}</Text>
      ) : null}
      <View style={[styles.cardRow, hideAmounts && { justifyContent: 'flex-end' }]}>
        {!hideAmounts && (
          <Text style={styles.amount}>KSh {Number(order.totalAmount).toLocaleString()}</Text>
        )}
        <Text style={styles.date}>{order.createdAt?.substring(0, 10)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { fetchOrderListPage } = useOrders();
  const [adminListMode, setAdminListMode] = useState<AdminOrderListMode>('pending');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const skipNextFocusReload = useRef(false);

  const role = normalizeRole(user?.role);
  const isAdmin = role === 'ADMIN';
  const isSales = role === 'SALES';
  const canShowOrders = isAdmin || isSales;

  const activeMode: AdminOrderListMode = isAdmin ? adminListMode : 'mine';

  const hasMore = orders.length < total;

  const loadPage = useCallback(async (mode: AdminOrderListMode, nextPage: number, append: boolean) => {
    if (!user || !canShowOrders) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    if (append) setLoadingMore(true);
    else if (!refreshing) setListLoading(true);

    try {
      const data = await fetchOrderListPage(mode, nextPage);
      setTotal(data.total);
      setPage(nextPage);
      setOrders(prev => (append ? [...prev, ...data.records] : data.records));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load orders';
      setError(message);
      if (!append) {
        setOrders([]);
        setTotal(0);
        setPage(0);
      }
    } finally {
      loadingRef.current = false;
      setListLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, canShowOrders, fetchOrderListPage, refreshing]);

  const reloadFromStart = useCallback(() => {
    loadPage(activeMode, 1, false);
  }, [activeMode, loadPage]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user && canShowOrders) {
        if (skipNextFocusReload.current) {
          skipNextFocusReload.current = false;
          return;
        }
        reloadFromStart();
      }
    }, [authLoading, user, canShowOrders, reloadFromStart])
  );

  useEffect(() => {
    if (!authLoading && user && canShowOrders) {
      skipNextFocusReload.current = true;
      reloadFromStart();
    }
  }, [adminListMode, authLoading, user, canShowOrders, reloadFromStart]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reloadFromStart();
  }, [reloadFromStart]);

  const onLoadMore = useCallback(() => {
    if (!hasMore || listLoading || loadingMore || loadingRef.current) return;
    loadPage(activeMode, page + 1, true);
  }, [activeMode, hasMore, listLoading, loadingMore, loadPage, page]);

  const listTitle = useMemo(() => {
    if (!isAdmin) return 'My Orders';
    if (adminListMode === 'pending') return 'Pending Approvals';
    if (adminListMode === 'all') return 'All Orders';
    return 'My Orders';
  }, [isAdmin, adminListMode]);

  if (authLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (!user) return null;

  const roleModules = getRoleModules(role);
  const hideAmounts = hideOrderAmountsForRole(user.role);

  const listHeader = (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user.realName} 👋</Text>
          <Text style={styles.roleTag}>{user.role}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modulesRow}>
        {roleModules.map(m => (
          <TouchableOpacity
            key={m.label}
            style={styles.moduleCard}
            onPress={() => router.push(m.route as Href)}
            activeOpacity={0.7}
          >
            <Text style={styles.moduleIcon}>{m.icon}</Text>
            <Text style={styles.moduleLabel}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isAdmin && (
        <View style={styles.modeRow}>
          {ADMIN_LIST_MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[styles.modeBtn, adminListMode === mode.key && styles.modeBtnActive]}
              onPress={() => setAdminListMode(mode.key)}
            >
              <Text style={[styles.modeBtnText, adminListMode === mode.key && styles.modeBtnTextActive]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { marginTop: isAdmin ? 12 : 24, paddingHorizontal: 0 }]}>
          {listTitle}
        </Text>
        {listLoading && !refreshing && <ActivityIndicator size="small" color="#1D4ED8" />}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={reloadFromStart}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const listFooter = (
    <View style={styles.footer}>
      {loadingMore && <ActivityIndicator size="small" color="#1D4ED8" style={{ marginVertical: 12 }} />}
      {!listLoading && !loadingMore && orders.length > 0 && !hasMore && (
        <Text style={styles.endText}>已经到底了</Text>
      )}
      <View style={{ height: insets.bottom + 24 }} />
    </View>
  );

  if (!canShowOrders) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {listHeader}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Order list is available for Sales and Admin roles.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            hideAmounts={hideAmounts}
            onPress={() => router.push(`/order/${item.id}` as Href)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          !listLoading && !error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          ) : null
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.25}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />
        }
        contentContainerStyle={orders.length === 0 ? styles.listEmptyContent : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function getRoleModules(role: string) {
  const all = [
    { label: 'New Order', icon: '📝', route: '/order/create', roles: ['SALES', 'ADMIN'] },
    { label: 'My Orders', icon: '📋', route: '/(tabs)', roles: ['SALES'] },
    { label: 'Approvals', icon: '✅', route: '/(tabs)', roles: ['ADMIN'] },
    { label: 'Outbound', icon: '📦', route: '/(tabs)', roles: ['WAREHOUSE', 'INBOUND', 'ADMIN'] },
    { label: 'Inbound', icon: '🚚', route: '/(tabs)', roles: ['INBOUND', 'WAREHOUSE', 'ADMIN'] },
    { label: 'Invoices', icon: '🧾', route: '/(tabs)', roles: ['FINANCE', 'ADMIN'] },
    { label: 'Receivables', icon: '💰', route: '/(tabs)', roles: ['FINANCE', 'ADMIN'] },
    { label: 'Inventory', icon: '🏭', route: '/(tabs)', roles: ['WAREHOUSE', 'INBOUND', 'ADMIN'] },
  ];
  return all.filter(m => m.roles.includes(role));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFF' },
  listEmptyContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#1D4ED8',
  },
  greeting: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  roleTag: { color: '#93C5FD', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E3A5F', marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  modulesRow: { paddingHorizontal: 20, gap: 12 },
  moduleCard: {
    width: 90, height: 80, backgroundColor: '#FFF', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  moduleIcon: { fontSize: 26 },
  moduleLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  modeRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 8,
    backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#1D4ED8' },
  card: {
    backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 14,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNo: { fontSize: 15, fontWeight: '700', color: '#1E3A5F' },
  cardCustomer: { fontSize: 12, color: '#64748B', marginBottom: 4, marginTop: -2 },
  cardSales: { fontSize: 11, color: '#94A3B8', marginBottom: 6 },
  amount: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  date: { fontSize: 12, color: '#9CA3AF' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 8 },
  endText: { color: '#9CA3AF', fontSize: 13, marginVertical: 12 },
  errorBox: {
    marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 10,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  retryText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600', marginTop: 6 },
});
