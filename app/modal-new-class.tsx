import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ModalNewClass() {
  const { user } = useAuth();
  const theme = useTheme();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const institutionId = user?.currentInstitution?.id;

  const shiftLabel = (s: string) =>
    ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[s] ?? s);

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.year) {
      setError('Nome e ano letivo são obrigatórios.');
      return;
    }
    setSaving(true);
    // Escreve na tabela real `turmas` com colunas PT
    const { error: e } = await supabase.from('turmas').insert({
      instituicao_id: institutionId,
      nome: form.name,
      ano: parseInt(form.year),
      turno: form.shift || 'manha',
      curso_id: form.course_id || null,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Nova Turma</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Input
          label="Nome da Turma *"
          value={form.name ?? ''}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
          placeholder="Ex: 1° Ano A"
        />
        <Input
          label="Ano Letivo *"
          value={form.year ?? ''}
          onChangeText={v => setForm(f => ({ ...f, year: v }))}
          placeholder="2025"
          keyboardType="numeric"
        />

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Turno</Text>
        <View style={styles.shiftRow}>
          {['manha', 'tarde', 'noite', 'integral'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setForm(f => ({ ...f, shift: s }))}
              style={[
                styles.shiftBtn,
                { borderColor: theme.border },
                form.shift === s && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
            >
              <Text style={[
                styles.shiftText,
                { color: theme.textSecondary },
                form.shift === s && { color: '#FFFFFF' },
              ]}>
                {shiftLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Salvar Turma"
          onPress={handleSave}
          loading={saving}
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
  shiftRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  shiftBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#F9FAFB',
  },
  shiftText: { fontSize: 13, fontWeight: '600' },
  error: {
    fontSize: 13,
    color: '#C81E1E',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
});
