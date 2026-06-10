import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      setShowError(true);
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Login failed');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo / Brand */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>ERP</Text>
          </View>
          <Text style={styles.title}>Sales Management</Text>
          <Text style={styles.subtitle}>Vestwoods / Haier Energy</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Error</Text>
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
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, shadowColor: '#1D4ED8', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  logoText: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '700', color: '#1E3A5F', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1F2937', backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  modalMsg: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
