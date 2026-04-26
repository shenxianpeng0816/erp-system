import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { SalesOrder } from '@/types/erp';
import { apiRequest } from '@/contexts/AuthContext';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9CA3AF', PENDING_APPROVAL: '#F59E0B', APPROVED: '#3B82F6',
  REJECTED: '#EF4444', SHIPPED: '#8B5CF6', CONFIRMED: '#10B981', CANCELLED: '#6B7280',
};

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { submitOrder, approveOrder, confirmDelivery } = useOrders();
  const router = useRouter();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Approval modal
  const [showApproval, setShowApproval] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT' | 'REDIRECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [redirectTo, setRedirectTo] = useState('');

  // Confirm delivery modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [signUrl, setSignUrl] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const [o, its] = await Promise.all([
        apiRequest<SalesOrder>(`/orders/${id}`, {}, user.token),
        apiRequest<any[]>(`/orders/${id}/items`, {}, user.token),
      ]);
      setOrder(o);
      setItems(its);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await submitOrder(order.id);
      setOrder(updated);
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
    } finally {
      setActing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1D4ED8" /></View>;
  if (!order) return <View style={styles.center}><Text>Order not found</Text></View>;

  const canSubmit  = order.status === 'DRAFT' && user?.role === 'SALES';
  const canApprove = order.status === 'PENDING_APPROVAL' && user?.role === 'ADMIN';
  const canConfirm = order.status === 'SHIPPED' && (user?.role === 'SALES' || user?.role === 'ADMIN');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COLOR[order.status] }]}>
          <Text style={styles.bannerOrderNo}>{order.orderNo}</Text>
          <Text style={styles.bannerStatus}>{order.status.replace('_', ' ')}</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>KSh {Number(order.totalAmount).toLocaleString()}</Text>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Info</Text>
          <InfoRow label="Created" value={order.createdAt?.substring(0, 10)} />
          <InfoRow label="Payment" value={order.paymentMethod ?? '—'} />
          <InfoRow label="Price Term" value={order.priceTerm ?? '—'} />
          <InfoRow label="Validity" value={order.validityDays ? `${order.validityDays} days` : '—'} />
          {order.remark && <InfoRow label="Remark" value={order.remark} />}
          {order.rejectReason && <InfoRow label="Reject Reason" value={order.rejectReason} highlight />}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>Product #{it.productId}</Text>
                <Text style={styles.itemSub}>Qty: {it.qty} × KSh {Number(it.unitPrice).toLocaleString()}</Text>
              </View>
              <Text style={styles.itemTotal}>KSh {Number(it.total).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Bar */}
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

      {/* Approval Modal */}
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

      {/* Confirm Delivery Modal */}
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1F2937', maxWidth: '60%', textAlign: 'right' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
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
