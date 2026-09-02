import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { X, User, Mail, Lock, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'professor', label: 'Professor' },
  { value: 'aluno', label: 'Aluno' },
  { value: 'responsavel', label: 'Responsável' },
];
  
export default function ModalNewUser() {
  const { user } = useAuth();
  const theme = useTheme();
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'aluno' as UserRole,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const institutionId = user?.currentInstitution?.id;

  const handleSave = async () => {
    setError('');

    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (form.password.length < 6) {
      setError('Senha mínima: 6 caracteres.');
      return;
    }
    if (!institutionId) {
      setError('Instituição não identificada.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          institutionId,
        },
      });

      setLoading(false);

      // fnError ocorre quando o status HTTP não é 2xx
      if (fnError) {
        // Tenta extrair a mensagem do body da resposta
        const msg = (fnError as any)?.context?.json?.error
          ?? (fnError as any)?.message
          ?? 'Erro na edge function.';
        setError(msg);
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      router.back();
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? 'Erro inesperado.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Novo Usuário</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Input
          label="Nome Completo"
          value={form.fullName}
          onChangeText={v => setForm(f => ({ ...f, fullName: v }))}
          placeholder="Nome do usuário"
          icon={<User size={16} color="#6B7280" />}
        />
        <Input
          label="E-mail"
          value={form.email}
          onChangeText={v => setForm(f => ({ ...f, email: v }))}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon={<Mail size={16} color="#6B7280" />}
        />
        <Input
          label="Senha"
          value={form.password}
          onChangeText={v => setForm(f => ({ ...f, password: v }))}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          icon={<Lock size={16} color="#6B7280" />}
        />

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Perfil de Acesso
        </Text>
        <View style={styles.roleOptions}>
          {ROLE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setForm(f => ({ ...f, role: opt.value }))}
              style={[
                styles.roleOption,
                { borderColor: theme.border },
                form.role === opt.value && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
            >
              <Shield
                size={14}
                color={form.role === opt.value ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  { color: theme.textSecondary },
                  form.role === opt.value && { color: '#FFFFFF' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Adicionar Usuário"
          onPress={handleSave}
          loading={loading}
          size="lg"
          color={theme.primary}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 56,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  body: { padding: 20, gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#F9FAFB',
  },
  roleOptionText: { fontSize: 13, fontWeight: '600' },
  error: {
    fontSize: 13,
    color: '#C81E1E',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
});
