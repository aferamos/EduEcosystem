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
import { Mail, Lock, User, Building2, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !password || !institutionName.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email.trim(), password, fullName.trim(), institutionName.trim());
    setLoading(false);
    if (err) {
      if (err.includes('User already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError(err);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#0694A2', '#0C4A6E']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Criar Instituição</Text>
        <Text style={styles.subtitle}>Configure sua escola na plataforma</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Building2 size={18} color="#0694A2" />
              <Text style={styles.sectionTitle}>Dados da Instituição</Text>
            </View>
            <Input
              label="Nome da Instituição"
              placeholder="Ex: Colégio Estadual São Paulo"
              value={institutionName}
              onChangeText={setInstitutionName}
              icon={<Building2 size={18} color="#6B7280" />}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={18} color="#0694A2" />
              <Text style={styles.sectionTitle}>Dados do Administrador</Text>
            </View>
            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={fullName}
              onChangeText={setFullName}
              icon={<User size={18} color="#6B7280" />}
            />
            <Input
              label="E-mail"
              placeholder="admin@escola.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              icon={<Mail size={18} color="#6B7280" />}
            />
            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={18} color="#6B7280" />}
            />
            <Input
              label="Confirmar Senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              icon={<Lock size={18} color="#6B7280" />}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Criar Instituição e Entrar"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            color="#0694A2"
            style={styles.btn}
          />

          <Text style={styles.terms}>
            Ao criar uma conta, você concorda com os termos de uso da plataforma.
          </Text>
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
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  separator: { height: 1, backgroundColor: '#E5E7EB' },
  error: {
    fontSize: 13,
    color: '#C81E1E',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  btn: { marginTop: 4 },
  terms: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
});
