import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, FlatList, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { Customer, Product, OrderItem } from '@/types/erp';

const COUNTRY_OPTIONS = [
  { code: 'KE', label: 'Kenya (KE)' },
  { code: 'UG', label: 'Uganda (UG)' },
  { code: 'TZ', label: 'Tanzania (TZ)' },
] as const;

function defaultCountryFromCustomer(countryCode?: string | null): string {
  const cc = countryCode?.trim().toUpperCase();
  if (cc && COUNTRY_OPTIONS.some((o) => o.code === cc)) return cc;
  return 'KE';
}

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

function productStockQty(p: Product): number {
  return Math.max(0, Number(p.stockQty ?? 0));
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
  const selectableProducts = products.filter(
    (p) => productStockQty(p) > 0 || p.id === item.productId
  );

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
          {selected
            ? `${selected.name} (${selected.spec ?? selected.unit}) · stock ${productStockQty(selected)}`
            : 'Select product…'}
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
            data={selectableProducts}
            keyExtractor={p => String(p.id)}
            ListEmptyComponent={
              <Text style={styles.resultSub}>No products with available stock.</Text>
            }
            renderItem={({ item: p }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => {
                  onUpdate(index, 'productId', p.id);
                  onUpdate(index, 'unitPrice', p.unitPrice);
                  const qty = Math.min(item.qty || 1, productStockQty(p));
                  onUpdate(index, 'qty', qty);
                  onUpdate(index, 'total', p.unitPrice * qty);
                  setShowPicker(false);
                }}
              >
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultSub}>
                  {p.productNo} · KSh {Number(p.unitPrice).toLocaleString()} / {p.unit} · stock {productStockQty(p)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <View style={styles.qtyRow}>
        <View style={styles.qtyInput}>
          <Text style={styles.label}>Qty</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const next = Math.max(1, (item.qty || 1) - 1);
                onUpdate(index, 'qty', next);
                onUpdate(index, 'total', next * (item.unitPrice || 0));
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepInput}
              keyboardType="number-pad"
              value={String(item.qty || '')}
              onChangeText={v => {
                const qty = parseInt(v) || 0;
                const maxQty = selected ? productStockQty(selected) : qty;
                const clamped = selected && maxQty > 0 ? Math.min(qty, maxQty) : qty;
                onUpdate(index, 'qty', clamped);
                onUpdate(index, 'total', clamped * (item.unitPrice || 0));
              }}
            />
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const maxQty = selected ? productStockQty(selected) : Number.MAX_SAFE_INTEGER;
                const next = Math.min(maxQty, (item.qty || 0) + 1);
                onUpdate(index, 'qty', next);
                onUpdate(index, 'total', next * (item.unitPrice || 0));
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {selected ? (
            <Text style={styles.stockHint}>Stock: {productStockQty(selected)}</Text>
          ) : null}
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

const BOTTOM_BAR_HEIGHT = 120;

// ── Main Screen ────────────────────────────────────────────────────────────
export default function CreateOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { createOrder, submitOrder, products } = useOrders();

  const [shipTo, setShipTo] = useState<Customer | null>(null);
  const [billTo, setBillTo] = useState<Customer | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [sameBillShip, setSameBillShip] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [priceTerm, setPriceTerm] = useState('DDP Kenya');
  const [etrRequired, setEtrRequired] = useState(false);
  const [etrCompanyName, setEtrCompanyName] = useState('');
  const [etrCompanyKraPin, setEtrCompanyKraPin] = useState('');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ productId: 0, qty: 1, unitPrice: 0, total: 0 }]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const isAuthorized = Boolean(user && (user.role === 'SALES' || user.role === 'ADMIN'));
  const totalAmount = items.reduce((s, i) => s + (i.total || 0), 0);
  const isBusy = saving || submitting;
  const hasDraft =
    shipTo != null ||
    billTo != null ||
    remark.trim().length > 0 ||
    items.some((i) => i.productId > 0 || i.qty !== 1 || i.unitPrice > 0);

  useEffect(() => {
    if (user && user.role !== 'SALES' && user.role !== 'ADMIN') {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasDraft || isBusy) return;
      e.preventDefault();
      Alert.alert('Leave without saving?', 'Your changes will be lost.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, hasDraft, isBusy, isAuthorized]);

  if (!isAuthorized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  const validateForm = (): OrderItem[] | null => {
    if (!shipTo) { setError('Please select Ship-To customer'); setShowError(true); return null; }
    const billToId = sameBillShip ? shipTo.id : billTo?.id;
    if (!billToId) { setError('Please select Bill-To customer'); setShowError(true); return null; }
    if (!countryCode.trim()) { setError('Country code is required'); setShowError(true); return null; }
    const validItems = items.filter(i => i.productId && i.qty > 0 && i.unitPrice > 0);
    if (validItems.length === 0) { setError('Please add at least one valid item'); setShowError(true); return null; }
    for (const line of validItems) {
      const p = products.find((prod) => prod.id === line.productId);
      const stock = p ? productStockQty(p) : 0;
      const label = p ? `${p.productNo} — ${p.name}` : `Product #${line.productId}`;
      if (stock <= 0) {
        setError(`No available stock for ${label}`);
        setShowError(true);
        return null;
      }
      if (line.qty > stock) {
        setError(`Insufficient stock for ${label}. Available: ${stock}`);
        setShowError(true);
        return null;
      }
    }
    if (etrRequired) {
      if (!etrCompanyName.trim()) { setError('Company name is required when ETR is required'); setShowError(true); return null; }
      if (!etrCompanyKraPin.trim()) { setError('Company KRA PIN is required when ETR is required'); setShowError(true); return null; }
    }
    return validItems;
  };

  const buildPayload = (validItems: OrderItem[]) => {
    const billToId = sameBillShip ? shipTo!.id : billTo!.id;
    return {
      shipToCustomerId: shipTo!.id,
      billToCustomerId: billToId,
      countryCode: countryCode.trim(),
      paymentMethod,
      priceTerm,
      remark,
      ...(etrRequired
        ? { etrRequired: true, etrCompanyName: etrCompanyName.trim(), etrCompanyKraPin: etrCompanyKraPin.trim() }
        : {}),
      items: validItems,
    };
  };

  const handleGoBack = () => {
    if (hasDraft) {
      Alert.alert('Leave without saving?', 'Your changes will be lost.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  const addItem = () => setItems(prev => [...prev, { productId: 0, qty: 1, unitPrice: 0, total: 0 }]);

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    const validItems = validateForm();
    if (!validItems) return;

    setSaving(true);
    try {
      await createOrder(buildPayload(validItems));
      router.back();
    } catch (e: any) {
      setError(e.message);
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const validItems = validateForm();
    if (!validItems) return;

    setSubmitting(true);
    try {
      const order = await createOrder(buildPayload(validItems));
      await submitOrder(order.id);
      router.replace(`/order/${order.id}` as any);
    } catch (e: any) {
      setError(e.message);
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const ScreenWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const screenWrapperProps =
    Platform.OS === 'web'
      ? { style: styles.screen }
      : { style: styles.screen, behavior: Platform.OS === 'ios' ? ('padding' as const) : ('height' as const) };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.headerBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.headerBackText}>← Back</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenWrapper {...screenWrapperProps}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <CustomerPicker label="Ship To (Delivery)" selected={shipTo} onSelect={c => {
            setShipTo(c);
            setCountryCode(defaultCountryFromCustomer(c.countryCode));
            if (sameBillShip) setBillTo(c);
          }} />

          <Text style={styles.label}>Country code *</Text>
          <View style={styles.countryRow}>
            {COUNTRY_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.code}
                style={[styles.countryChip, countryCode === o.code && styles.countryChipOn]}
                onPress={() => setCountryCode(o.code)}
                disabled={!shipTo}
              >
                <Text style={[styles.countryChipText, countryCode === o.code && styles.countryChipTextOn]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
          <Text style={styles.label}>Payment Term</Text>
          <TextInput style={styles.input} value={priceTerm} onChangeText={setPriceTerm} placeholder="DDP Kenya" placeholderTextColor="#9CA3AF" />
          <View style={[styles.toggleRow, { justifyContent: 'space-between', marginTop: 16 }]}>
            <Text style={styles.toggleLabel}>ETR required?</Text>
            <Switch value={etrRequired} onValueChange={(v) => {
              setEtrRequired(v);
              if (!v) { setEtrCompanyName(''); setEtrCompanyKraPin(''); }
            }} />
          </View>
          {etrRequired && (
            <>
              <Text style={styles.label}>Company name *</Text>
              <TextInput style={styles.input} value={etrCompanyName} onChangeText={setEtrCompanyName} placeholder="Legal entity for ETR" placeholderTextColor="#9CA3AF" />
              <Text style={styles.label}>Company KRA PIN *</Text>
              <TextInput style={styles.input} value={etrCompanyKraPin} onChangeText={setEtrCompanyKraPin} placeholder="e.g. P051234567X" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
            </>
          )}
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
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem} activeOpacity={0.7}>
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>KSh {totalAmount.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar — thumb-friendly zone */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomSummaryLabel}>Total</Text>
          <Text style={styles.bottomSummaryValue}>KSh {totalAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleGoBack}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={handleSaveDraft}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#1D4ED8" />
            ) : (
              <Text style={styles.draftBtnText}>Save Draft</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
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
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { height: '100%' as const, minHeight: 0 } : {}),
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  headerBackBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  headerBackText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
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
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  countryChip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  countryChipOn: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  countryChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  countryChipTextOn: { color: '#FFF' },
  productRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: '#F9FAFB' },
  productRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productRowTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  removeBtn: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  productPicker: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#FFF' },
  qtyRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  qtyInput: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  stepBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: '#1D4ED8', lineHeight: 24 },
  stepInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 10,
    minWidth: 48,
  },
  stockHint: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  lineTotal: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginTop: 8, textAlign: 'right' },
  addItemBtn: { borderWidth: 2, borderColor: '#1D4ED8', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, minHeight: 52 },
  addItemText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1E3A5F' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#1D4ED8' },
  bottomBar: {
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
    ...Platform.select({
      web: {
        position: 'fixed' as 'absolute',
      },
      default: {
        position: 'absolute',
      },
    }),
  },
  bottomSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  bottomSummaryLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  bottomSummaryValue: { fontSize: 18, fontWeight: '800', color: '#1D4ED8' },
  bottomActions: { flexDirection: 'row', gap: 8 },
  backBtn: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  backBtnText: { color: '#374151', fontSize: 15, fontWeight: '700' },
  draftBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  draftBtnText: { color: '#1D4ED8', fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 1.2,
    minHeight: 50,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
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
