import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { AlertTriangle, Plus, X, ChevronDown, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Occurrence } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  aberta: 'warning',
  em_andamento: 'info',
  resolvida: 'success',
  encerrada: 'neutral',
};

const TYPE_COLORS: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  disciplinar: 'danger',
  academico: 'warning',
  comportamental: 'warning',
  elogio: 'success',
  observacao: 'neutral',
};

export default function OccurrencesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '', student_name: '', type: 'academic', title: '', description: '', severity: 'medium',
  });
  const [formError, setFormError] = useState('');

  const institutionId = user?.currentInstitution?.id;

  const loadOccurrences = async () => {
    if (!institutionId) return;
    const { data } = await supabase
      .from('occurrences')
      .select('*, student_profile:profiles!student_id(full_name)')
      .eq('reported_by', user?.id)
      .order('created_at', { ascending: false });
    setOccurrences((data as any) ?? []);
  };

  const loadStudents = async () => {
    if (!institutionId) return;
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, profile:profiles!user_id(full_name)')
      .eq('institution_id', institutionId)
      .eq('role', 'aluno')
      .eq('is_active', true);
    setStudents((data ?? []).map((r: any) => ({ id: r.user_id, name: r.profile?.full_name ?? 'Aluno' })));
  };

  useEffect(() => { loadOccurrences(); loadStudents(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOccurrences();
    setRefreshing(false);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.student_id || !form.title) { setFormError('Aluno e título são obrigatórios.'); return; }
    setSaving(true);
    const { error } = await supabase.from('occurrences').insert({
      institution_id: institutionId,
      student_id: form.student_id,
      reported_by: user?.id,
      type: form.type,
      title: form.title,
      description: form.description || null,
      severity: form.severity,
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setShowModal(false);
    setForm({ student_id: '', student_name: '', type: 'academic', title: '', description: '', severity: 'medium' });
    await loadOccurrences();
  };

  const typeOptions = ['disciplinar','academico','comportamental','elogio','observacao'];
  const typeLabel = (t: string) => ({ disciplinar: 'Disciplinar', academico: 'Acadêmica', comportamental: 'Comportamental', elogio: 'Elogio', observacao: 'Observação' }[t] ?? t);
  const statusLabel = (s: string) => ({ aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida', encerrada: 'Encerrada' }[s] ?? s);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Ocorrências</Text>
        <Text style={styles.headerSub}>{occurrences.length} registros</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {occurrences.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={28} color="#9CA3AF" />}
            title="Nenhuma ocorrência registrada"
            description="Registre ocorrências acadêmicas e disciplinares dos alunos."
          />
        ) : (
          occurrences.map(occ => {
            const sp = (occ as any).student_profile;
            return (
              <Card key={occ.id} style={styles.occCard} padding={14}>
                <View style={styles.occHeader}>
                  <Badge label={typeLabel(occ.type)} variant={TYPE_COLORS[occ.type] ?? 'neutral'} />
                  <Badge label={statusLabel(occ.status)} variant={STATUS_COLORS[occ.status] ?? 'neutral'} />
                  <Text style={styles.occDate}>
                    {new Date(occ.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.occTitle}>{occ.title}</Text>
                <Text style={styles.occStudent}>Aluno: {sp?.full_name ?? '–'}</Text>
                {occ.description && (
                  <Text style={styles.occDesc} numberOfLines={2}>{occ.description}</Text>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Ocorrência</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View>
              <Text style={styles.fieldLabel}>Aluno *</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowStudentPicker(v => !v)}
              >
                <Text style={styles.pickerText}>{form.student_name || 'Selecionar aluno'}</Text>
                <ChevronDown size={16} color={theme.textMuted} />
              </TouchableOpacity>
              {showStudentPicker && (
                <View style={styles.dropdown}>
                  {students.map(s => (
                    <TouchableOpacity key={s.id} style={styles.dropdownItem}
                      onPress={() => { setForm(f => ({ ...f, student_id: s.id, student_name: s.name })); setShowStudentPicker(false); }}>
                      <Text style={styles.dropdownText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Input label="Título *" value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
              placeholder="Descreva brevemente a ocorrência" />

            <Input label="Descrição (opcional)" value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="Detalhes adicionais..." multiline numberOfLines={3} />

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.typeGrid}>
              {typeOptions.map(t => (
                <TouchableOpacity key={t}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                  style={[styles.typeBtn, form.type === t && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <Text style={[styles.typeBtnText, form.type === t && { color: '#FFFFFF' }]}>{typeLabel(t)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Severidade</Text>
            <View style={styles.typeGrid}>
              {['low','medium','high'].map(s => (
                <TouchableOpacity key={s}
                  onPress={() => setForm(f => ({ ...f, severity: s }))}
                  style={[styles.typeBtn, form.severity === s && {
                    backgroundColor: s === 'high' ? theme.danger : s === 'medium' ? theme.warning : theme.success,
                    borderColor: s === 'high' ? theme.danger : s === 'medium' ? theme.warning : theme.success,
                  }]}>
                  <Text style={[styles.typeBtnText, form.severity === s && { color: '#FFFFFF' }]}>
                    {{ low: 'Baixa', medium: 'Média', high: 'Alta' }[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button title="Registrar Ocorrência" onPress={handleSave} loading={saving} size="lg" color={theme.primary} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  occCard: { gap: 6 },
  occHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  occDate: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' as any },
  occTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  occStudent: { fontSize: 12, color: '#6B7280' },
  occDesc: { fontSize: 13, color: '#374151', lineHeight: 18 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  pickerText: { fontSize: 14, color: '#111827' },
  dropdown: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownText: { fontSize: 14, color: '#374151' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
