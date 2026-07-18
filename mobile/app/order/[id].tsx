import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { SalesOrder, OrderItem, Customer, ApprovalFlow } from '@/types/erp';
import { apiRequest } from '@/contexts/AuthContext';
import { hideOrderAmountsForRole } from '@/lib/order-view-policy';
import { formatMoney } from '@/lib/country';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9CA3AF', PENDING_APPROVAL: '#F59E0B', APPROVED: '#3B82F6',
  REJECTED: '#EF4444', SHIPPED: '#8B5CF6', CONFIRMED: '#10B981', CANCELLED: '#6B7280',
};

const APPROVAL_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#B45309' },
  APPROVED: { bg: '#D1FAE5', text: '#047857' },
  REJECTED: { bg: '#FEE2E2', text: '#B91C1C' },
  REDIRECTED: { bg: '#E0E7FF', text: '#4338CA' },
};

function productLabel(item: OrderItem): string {
  if (item.productNo?.trim()) return item.productNo.trim();
  if (item.spec?.trim()) return item.spec.trim();
  if (item.productName?.trim()) return item.productName.trim();
  return `Product #${item.productId}`;
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { submitOrder, approveOrder, confirmDelivery } = useOrders();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shipTo, setShipTo] = useState<Customer | null>(null);
  const [billTo, setBillTo] = useState<Customer | null>(null);
  const [approvals, setApprovals] = useState<ApprovalFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [showApproval, setShowApproval] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT' | 'REDIRECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [redirectTo, setRedirectTo] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [signUrl, setSignUrl] = useState('');

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const o = await apiRequest<SalesOrder>(`/orders/${id}`, {}, user.token);
      const [its, approvalList] = await Promise.all([
        apiRequest<OrderItem[]>(`/orders/${id}/items`, {}, user.token),
        apiRequest<ApprovalFlow[]>(`/orders/${id}/approvals`, {}, user.token).catch(() => []),
      ]);

      const [shipToCustomer, billToCustomer] = await Promise.all([
        apiRequest<Customer>(`/customers/${o.shipToCustomerId}`, {}, user.token).catch(() => null),
        o.billToCustomerId !== o.shipToCustomerId
          ? apiRequest<Customer>(`/customers/${o.billToCustomerId}`, {}, user.token).catch(() => null)
          : Promise.resolve(null),
      ]);

      setOrder(o);
      setItems(its);
      setApprovals(approvalList);
      setShipTo(shipToCustomer);
      setBillTo(billToCustomer ?? (o.billToCustomerId === o.shipToCustomerId ? shipToCustomer : null));
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await submitOrder(order.id);
      setOrder(updated);
      await load();
    } finally {
      setActing(false);
    }
  };

  const handleApproval = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await approveOrder(
        order.id, approvalAction, comment,
        redirectTo ? parseInt(redirectTo) : undefined
      );
      setOrder(updated);
      setShowApproval(false);
      setComment('');
      setRedirectTo('');
      await load();
    } finally {
      setActing(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await confirmDelivery(order.id, signUrl || undefined);
      setOrder(updated);
      setShowConfirm(false);
      await load();
    } finally {
      setActing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1D4ED8" /></View>;
  if (!order) return <View style={styles.center}><Text>Order not found</Text></View>;

  const hideOrderMoney = hideOrderAmountsForRole(user?.role);
  const currentUserId = Number(user?.userId);
  const isOrderOwner = Number.isFinite(currentUserId) && order.salesUserId === currentUserId;
  const canSubmit = order.status === 'DRAFT' && isOrderOwner;
  const canApprove = order.status === 'PENDING_APPROVAL' && user?.role?.toUpperCase() === 'ADMIN';
  const canConfirm = order.status === 'SHIPPED' && (user?.role?.toUpperCase() === 'SALES' || user?.role?.toUpperCase() === 'ADMIN');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COLOR[order.status] }]}>
          <Text style={styles.bannerOrderNo}>{order.orderNo}</Text>
          <Text style={styles.bannerStatus}>{order.status.replace('_', ' ')}</Text>
        </View>

        {!hideOrderMoney && (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>{formatMoney(order.totalAmount, order.countryCode)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customers</Text>
          <CustomerBlock
            label="Ship To"
            name={order.shipToCustomerName ?? shipTo?.shopName ?? shipTo?.name}
            customer={shipTo}
            fallbackId={order.shipToCustomerId}
            preferShopName
          />
          <CustomerBlock
            label="Bill To"
            name={order.billToCustomerName ?? billTo?.name}
            customer={billTo}
            fallbackId={order.billToCustomerId}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Info</Text>
          <InfoRow label="Salesperson" value={order.salesUserName?.trim() || `User #${order.salesUserId}`} />
          <InfoRow label="Created" value={order.createdAt?.substring(0, 10)} />
          <InfoRow label="Payment" value={order.paymentMethod ?? '—'} />
          <InfoRow label="Payment Term" value={order.priceTerm ?? '—'} />
          <InfoRow label="Validity" value={order.validityDays ? `${order.validityDays} days` : '—'} />
          <InfoRow label="ETR required" value={Boolean(order.etrRequired) ? 'Yes' : 'No'} />
          {Boolean(order.etrRequired) && (
            <>
              <InfoRow label="ETR company" value={order.etrCompanyName ?? '—'} />
              <InfoRow label="ETR KRA PIN" value={order.etrCompanyKraPin ?? '—'} />
            </>
          )}
          {order.remark && <InfoRow label="Remark" value={order.remark} />}
          {order.rejectReason && <InfoRow label="Reject Reason" value={order.rejectReason} highlight />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          {items.map((it, idx) => (
            <View key={it.id ?? idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{productLabel(it)}</Text>
                {it.productName && it.productName !== productLabel(it) && (
                  <Text style={styles.itemSubName}>{it.productName}</Text>
                )}
                <Text style={styles.itemSub}>
                  {hideOrderMoney
                    ? `Qty: ${it.qty}${it.unit ? ` ${it.unit}` : ''}`
                    : `Qty: ${it.qty}${it.unit ? ` ${it.unit}` : ''} × ${formatMoney(it.unitPrice, order.countryCode)}`}
                </Text>
              </View>
              {!hideOrderMoney && (
                <Text style={styles.itemTotal}>{formatMoney(it.total, order.countryCode)}</Text>
              )}
            </View>
          ))}
        </View>

        {approvals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approval History</Text>
            {approvals.map(flow => {
              const colors = APPROVAL_STATUS_COLOR[flow.status] ?? { bg: '#F3F4F6', text: '#4B5563' };
              return (
                <View key={flow.id} style={styles.approvalRow}>
                  <View style={styles.approvalStep}>
                    <Text style={styles.approvalStepText}>{flow.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.approvalHeader}>
                      <Text style={styles.approvalName}>
                        {flow.approverName?.trim() || `Approver #${flow.approverId}`}
                      </Text>
                      <View style={[styles.approvalBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.approvalBadgeText, { color: colors.text }]}>{flow.status}</Text>
                      </View>
                    </View>
                    {flow.redirectTo != null && (
                      <Text style={styles.approvalMeta}>
                        → {flow.redirectToName?.trim() || `User #${flow.redirectTo}`}
                      </Text>
                    )}
                    {flow.comment ? (
                      <Text style={styles.approvalComment}>&quot;{flow.comment}&quot;</Text>
                    ) : null}
                    {flow.actedAt ? (
                      <Text style={styles.approvalMeta}>Action: {flow.actedAt.substring(0, 16).replace('T', ' ')}</Text>
                    ) : (
                      <Text style={styles.approvalMeta}>Assigned: {flow.createdAt?.substring(0, 16).replace('T', ' ')}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {order.status === 'DRAFT' && !canSubmit && user && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>Only the user who created this draft can submit it for approval.</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {(canSubmit || canApprove || canConfirm) && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
          {canSubmit && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={acting}>
              {acting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit for Approval</Text>}
            </TouchableOpacity>
          )}
          {canApprove && (
            <View style={styles.approvalBtns}>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                onPress={() => { setApprovalAction('APPROVE'); setShowApproval(true); }}>
                <Text style={styles.approveBtnText}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => { setApprovalAction('REJECT'); setShowApproval(true); }}>
                <Text style={styles.approveBtnText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => { setApprovalAction('REDIRECT'); setShowApproval(true); }}>
                <Text style={styles.approveBtnText}>↗ Redirect</Text>
              </TouchableOpacity>
            </View>
          )}
          {canConfirm && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowConfirm(true)}>
              <Text style={styles.primaryBtnText}>Confirm Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={showApproval} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {approvalAction === 'APPROVE' ? '✓ Approve Order'
                : approvalAction === 'REJECT' ? '✕ Reject Order'
                : '↗ Redirect Approval'}
            </Text>
            <Text style={styles.label}>Comment</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              multiline
              value={comment}
              onChangeText={setComment}
              placeholder="Optional comment..."
              placeholderTextColor="#9CA3AF"
            />
            {approvalAction === 'REDIRECT' && (
              <>
                <Text style={styles.label}>Redirect to User ID</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={redirectTo}
                  onChangeText={setRedirectTo}
                  placeholder="Enter user ID"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApproval(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmActionBtn} onPress={handleApproval} disabled={acting}>
                {acting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmActionText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showConfirm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Delivery</Text>
            <Text style={styles.label}>Sign Image URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={signUrl}
              onChangeText={setSignUrl}
              placeholder="https://... (photo of signed document)"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmActionBtn} onPress={handleConfirm} disabled={acting}>
                {acting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmActionText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CustomerBlock({
  label,
  name,
  customer,
  fallbackId,
  preferShopName,
}: {
  label: string;
  name?: string | null;
  customer: Customer | null;
  fallbackId: number;
  preferShopName?: boolean;
}) {
  const customerFallback = preferShopName
    ? (customer?.shopName?.trim() || customer?.name?.trim())
    : customer?.name?.trim();
  const displayName = name?.trim() || customerFallback || `Customer #${fallbackId}`;
  return (
    <View style={styles.customerBlock}>
      <Text style={styles.customerLabel}>{label}</Text>
      <Text style={styles.customerName}>{displayName}</Text>
      {customer?.customerNo ? <Text style={styles.customerMeta}>No: {customer.customerNo}</Text> : null}
      {customer?.phone ? <Text style={styles.customerMeta}>Tel: {customer.phone}</Text> : null}
      {customer?.address ? <Text style={styles.customerMeta}>{customer.address}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: '#EF4444' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: { paddingHorizontal: 20, paddingVertical: 20 },
  bannerOrderNo: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  bannerStatus: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  amountCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  amountLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  amountValue: { fontSize: 32, fontWeight: '800', color: '#1D4ED8' },
  section: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E3A5F', marginBottom: 12 },
  customerBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  customerLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  customerMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1F2937', maxWidth: '60%', textAlign: 'right' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemSubName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  approvalRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  approvalStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  approvalStepText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  approvalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  approvalName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  approvalBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  approvalBadgeText: { fontSize: 11, fontWeight: '700' },
  approvalComment: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
  approvalMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  noticeBox: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  noticeText: { fontSize: 13, color: '#B45309' },
  actionBar: { backgroundColor: '#FFF', padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  primaryBtn: { backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  approvalBtns: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: '#6B7280', fontWeight: '600' },
  confirmActionBtn: { flex: 1, backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmActionText: { color: '#FFF', fontWeight: '700' },
});
