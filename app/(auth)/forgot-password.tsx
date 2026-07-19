import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, ChevronLeft, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { recoverPassword } = useAuth();
  const router = useRouter();

  const handleRecover = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Informe o e-mail.');
      return;
    }
    setLoading(true);
    const { error: err } = await recoverPassword(email.trim());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess('Instruções enviadas para seu e-mail.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1A56DB', '#1E429F', '#1e3a8a']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>Enviaremos instruções para seu e-mail</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            icon={<Mail size={18} color="#6B7280" />}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Button
            title="Enviar Instruções"
            onPress={handleRecover}
            loading={loading}
            size="lg"
            style={styles.btn}
          />

          <TouchableOpacity onPress={() => router.back()} style={styles.link}>
            <ArrowLeft size={14} color="#1A56DB" />
            <Text style={styles.linkText}>Lembrou a senha? Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    gap: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 4 },
  backText: { color: '#FFFFFF', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  body: { padding: 20, paddingBottom: 48 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  error: {
    fontSize: 13,
    color: '#C81E1E',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  success: {
    fontSize: 13,
    color: '#057A55',
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  btn: { marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkText: { fontSize: 14, color: '#1A56DB', fontWeight: '600' },
});
