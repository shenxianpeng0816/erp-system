import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { SalesOrder } from '@/types/erp';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9CA3AF',
  PENDING_APPROVAL: '#F59E0B',
  APPROVED: '#3B82F6',
  REJECTED: '#EF4444',
  SHIPPED: '#8B5CF6',
  CONFIRMED: '#10B981',
  CANCELLED: '#6B7280',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] + '22' }]}>
      <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

function OrderCard({ order, onPress }: { order: SalesOrder; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.amount}>KSh {Number(order.totalAmount).toLocaleString()}</Text>
        <Text style={styles.date}>{order.createdAt?.substring(0, 10)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { orders, isLoading, fetchMyOrders, fetchPendingOrders } = useOrders();

  useEffect(() => {
    // AuthGuard in _layout.tsx handles redirect to /login when user is null
    if (!user) return;
    if (user.role === 'ADMIN') {
      fetchPendingOrders();
    } else if (user.role === 'SALES') {
      fetchMyOrders();
    }
  }, [user]);

  if (!user) return null;

  const roleModules = getRoleModules(user.role);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user.realName} 👋</Text>
          <Text style={styles.roleTag}>{user.role}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modulesRow}>
          {roleModules.map(m => (
            <TouchableOpacity key={m.label} style={styles.moduleCard} onPress={() => router.push(m.route as any)} activeOpacity={0.7}>
              <Text style={styles.moduleIcon}>{m.icon}</Text>
              <Text style={styles.moduleLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Order List */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {user.role === 'ADMIN' ? 'Pending Approvals' : 'My Orders'}
          </Text>
          {isLoading && <ActivityIndicator size="small" color="#1D4ED8" />}
        </View>

        {orders.length === 0 && !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/order/${order.id}` as any)}
            />
          ))
        )}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function getRoleModules(role: string) {
  const all = [
    { label: 'New Order',   icon: '📝', route: '/order/create', roles: ['SALES', 'ADMIN'] },
    { label: 'My Orders',   icon: '📋', route: '/(tabs)',        roles: ['SALES'] },
    { label: 'Approvals',   icon: '✅', route: '/(tabs)',        roles: ['ADMIN'] },
    { label: 'Outbound',    icon: '📦', route: '/(tabs)',        roles: ['WAREHOUSE', 'ADMIN'] },
    { label: 'Inbound',     icon: '🚚', route: '/(tabs)',        roles: ['INBOUND', 'ADMIN'] },
    { label: 'Invoices',    icon: '🧾', route: '/(tabs)',        roles: ['FINANCE', 'ADMIN'] },
    { label: 'Receivables', icon: '💰', route: '/(tabs)',        roles: ['FINANCE', 'ADMIN'] },
    { label: 'Inventory',   icon: '🏭', route: '/(tabs)',        roles: ['WAREHOUSE', 'INBOUND', 'ADMIN'] },
  ];
  return all.filter(m => m.roles.includes(role));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#1D4ED8',
  },
  greeting: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  roleTag: { color: '#93C5FD', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E3A5F', marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  modulesRow: { paddingHorizontal: 20, gap: 12 },
  moduleCard: {
    width: 90, height: 80, backgroundColor: '#FFF', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  moduleIcon: { fontSize: 26 },
  moduleLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  card: {
    backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 14,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNo: { fontSize: 15, fontWeight: '700', color: '#1E3A5F' },
  amount: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  date: { fontSize: 12, color: '#9CA3AF' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
