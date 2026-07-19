import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, KeyRound } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const router = useRouter();

  const handleUpdate = async () => {
    setError('');
    setSuccess('');
    if (!password || !confirm) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: err } = await changePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess('Senha atualizada com sucesso.');
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1A56DB', '#1E429F', '#1e3a8a']} style={styles.header}>
        <Text style={styles.title}>Nova Senha</Text>
        <Text style={styles.subtitle}>Defina uma nova senha para sua conta</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Input
            label="Nova Senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Lock size={18} color="#6B7280" />}
          />
          <Input
            label="Confirmar Nova Senha"
            placeholder="Repita a senha"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            icon={<KeyRound size={18} color="#6B7280" />}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Button
            title="Salvar Nova Senha"
            onPress={handleUpdate}
            loading={loading}
            size="lg"
            style={styles.btn}
          />
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
});
