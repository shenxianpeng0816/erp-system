import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, FlatList, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrders } from '@/contexts/OrderContext';
import { Customer, Product, OrderItem } from '@/types/erp';

// ── Customer Search Picker ─────────────────────────────────────────────────
function CustomerPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const { searchCustomers } = useOrders();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await searchCustomers(text);
      setResults(res);
    } finally {
      setSearching(false);
    }
  }, [searchCustomers]);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {selected ? (
          <View>
            <Text style={styles.pickerMain}>{selected.name}</Text>
            <Text style={styles.pickerSub}>{selected.customerNo} · {selected.type}</Text>
          </View>
        ) : (
          <Text style={styles.pickerPlaceholder}>Search customer by name or code…</Text>
        )}
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide">
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.searchClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Type name or customer code..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={doSearch}
            autoFocus
          />
          {searching && <ActivityIndicator style={{ margin: 16 }} color="#1D4ED8" />}
          <FlatList
            data={results}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => { onSelect(item); setOpen(false); setQuery(''); setResults([]); }}
              >
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultSub}>{item.customerNo} · {item.type}{item.isPickupPoint ? ' · 📍 Pickup Point' : ''}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length > 0 && !searching
                ? <Text style={styles.noResult}>No customers found</Text>
                : null
            }
          />
        </View>
      </Modal>
    </>
  );
}

// ── Product Row ────────────────────────────────────────────────────────────
function ProductRow({
  item,
  index,
  products,
  onUpdate,
  onRemove,
}: {
  item: OrderItem;
  index: number;
  products: Product[];
  onUpdate: (index: number, field: keyof OrderItem, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selected = products.find(p => p.id === item.productId);

  return (
    <View style={styles.productRow}>
      <View style={styles.productRowHeader}>
        <Text style={styles.productRowTitle}>Item {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Text style={styles.removeBtn}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Product selector */}
      <TouchableOpacity style={styles.productPicker} onPress={() => setShowPicker(true)}>
        <Text style={selected ? styles.pickerMain : styles.pickerPlaceholder}>
          {selected ? `${selected.name} (${selected.spec ?? selected.unit})` : 'Select product…'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="slide">
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.searchClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={p => String(p.id)}
            renderItem={({ item: p }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => {
                  onUpdate(index, 'productId', p.id);
                  onUpdate(index, 'unitPrice', p.unitPrice);
                  onUpdate(index, 'total', p.unitPrice * (item.qty || 1));
                  setShowPicker(false);
                }}
              >
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultSub}>{p.productNo} · KSh {Number(p.unitPrice).toLocaleString()} / {p.unit}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <View style={styles.qtyRow}>
        <View style={styles.qtyInput}>
          <Text style={styles.label}>Qty</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(item.qty || '')}
            onChangeText={v => {
              const qty = parseInt(v) || 0;
              onUpdate(index, 'qty', qty);
              onUpdate(index, 'total', qty * (item.unitPrice || 0));
            }}
          />
        </View>
        <View style={styles.qtyInput}>
          <Text style={styles.label}>Unit Price (KSh)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={String(item.unitPrice || '')}
            onChangeText={v => {
              const price = parseFloat(v) || 0;
              onUpdate(index, 'unitPrice', price);
              onUpdate(index, 'total', (item.qty || 0) * price);
            }}
          />
        </View>
      </View>
      <Text style={styles.lineTotal}>Line Total: KSh {Number(item.total || 0).toLocaleString()}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function CreateOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createOrder, submitOrder, products } = useOrders();

  const [shipTo, setShipTo] = useState<Customer | null>(null);
  const [billTo, setBillTo] = useState<Customer | null>(null);
  const [sameBillShip, setSameBillShip] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [priceTerm, setPriceTerm] = useState('DDP Kenya');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ productId: 0, qty: 1, unitPrice: 0, total: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const totalAmount = items.reduce((s, i) => s + (i.total || 0), 0);

  const addItem = () => setItems(prev => [...prev, { productId: 0, qty: 1, unitPrice: 0, total: 0 }]);

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!shipTo) { setError('Please select Ship-To customer'); setShowError(true); return; }
    const billToId = sameBillShip ? shipTo.id : billTo?.id;
    if (!billToId) { setError('Please select Bill-To customer'); setShowError(true); return; }
    const validItems = items.filter(i => i.productId && i.qty > 0 && i.unitPrice > 0);
    if (validItems.length === 0) { setError('Please add at least one valid item'); setShowError(true); return; }

    setSaving(true);
    try {
      await createOrder({
        shipToCustomerId: shipTo.id,
        billToCustomerId: billToId,
        paymentMethod,
        priceTerm,
        remark,
        items: validItems,
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <CustomerPicker label="Ship To (Delivery)" selected={shipTo} onSelect={c => { setShipTo(c); if (sameBillShip) setBillTo(c); }} />

          {/* Toggle: same ship/bill */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => setSameBillShip(!sameBillShip)}>
            <View style={[styles.checkbox, sameBillShip && styles.checkboxOn]}>
              {sameBillShip && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.toggleLabel}>Bill-To same as Ship-To</Text>
          </TouchableOpacity>

          {!sameBillShip && (
            <CustomerPicker label="Bill To (Payment)" selected={billTo} onSelect={setBillTo} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <Text style={styles.label}>Payment Method</Text>
          <TextInput style={styles.input} value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Bank Transfer / Mpesa" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Price Term</Text>
          <TextInput style={styles.input} value={priceTerm} onChangeText={setPriceTerm} placeholder="DDP Kenya" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Remark</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={remark} onChangeText={setRemark} multiline placeholder="Additional notes..." placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products</Text>
          {items.map((item, idx) => (
            <ProductRow
              key={idx}
              item={item}
              index={idx}
              products={products}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>KSh {totalAmount.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft} disabled={saving}>
          {saving ? <ActivityIndicator color="#1D4ED8" /> : <Text style={styles.draftBtnText}>Save Draft</Text>}
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Notice</Text>
            <Text style={styles.modalMsg}>{error}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowError(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  section: { backgroundColor: '#FFF', margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A5F', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },
  picker: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' },
  pickerMain: { fontSize: 15, color: '#1F2937', fontWeight: '600' },
  pickerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pickerPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  pickerArrow: { fontSize: 20, color: '#9CA3AF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  checkmark: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  toggleLabel: { fontSize: 14, color: '#374151' },
  productRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: '#F9FAFB' },
  productRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productRowTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  removeBtn: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  productPicker: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#FFF' },
  qtyRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  qtyInput: { flex: 1 },
  lineTotal: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginTop: 8, textAlign: 'right' },
  addItemBtn: { borderWidth: 2, borderColor: '#1D4ED8', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  addItemText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1E3A5F' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#1D4ED8' },
  bottomBar: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  draftBtn: { backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  draftBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  searchModal: { flex: 1, backgroundColor: '#F8FAFF', paddingTop: 48 },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  searchTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A5F' },
  searchClose: { fontSize: 20, color: '#6B7280' },
  searchInput: { marginHorizontal: 20, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1F2937', backgroundColor: '#FFF', marginBottom: 8 },
  resultItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  resultSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  noResult: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  modalMsg: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
