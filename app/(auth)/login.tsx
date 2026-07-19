import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, Lock, GraduationCap } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      if (err.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
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
      <LinearGradient colors={['#1A56DB', '#1E429F', '#1e3a8a']} style={styles.header}>
        <View style={styles.logoWrap}>
          <GraduationCap size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.brand}>EduEcosystem</Text>
        <Text style={styles.tagline}>Plataforma Educacional Multisserviços</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Acesse seu portal educacional</Text>

          <View style={styles.form}>
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              icon={<Mail size={18} color="#6B7280" />}
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={18} color="#6B7280" />}
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.btn}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Primeira vez?{' '}
              <Text style={styles.registerTextBold}>Criar instituição</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo: Registre uma nova instituição</Text>
          <Text style={styles.demoText}>
            Clique em "Criar instituição" para configurar sua escola e criar o primeiro acesso de administrador.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 64,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 8,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  body: { padding: 20, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 20 },
  form: { gap: 14 },
  error: {
    fontSize: 13,
    color: '#C81E1E',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  btn: { marginTop: 4 },
  forgotText: { fontSize: 13, color: '#1A56DB', fontWeight: '600', textAlign: 'right', marginTop: -6, marginBottom: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  registerLink: { alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6B7280' },
  registerTextBold: { color: '#1A56DB', fontWeight: '600' },
  demoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  demoTitle: { fontSize: 13, fontWeight: '600', color: '#1E429F' },
  demoText: { fontSize: 12, color: '#3B82F6', lineHeight: 18 },
});
