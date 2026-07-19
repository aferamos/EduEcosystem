import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Star, Plus, X, ChevronDown, ClipboardList } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { ClassSubject, Assessment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface StudentGrade {
  student_id: string;
  full_name: string;
  grade_id: string | null;
  score: number | null;
  status: string;
}

export default function GradesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState<ClassSubject[]>([]);
  const [selectedCS, setSelectedCS] = useState<ClassSubject | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showAssessmentPicker, setShowAssessmentPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ title: '', type: 'test', max_score: '10', date: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('class_subjects')
      .select('*, subject:subjects(name), class:classes(name, year)')
      .eq('teacher_id', user.id)
      .then(({ data }) => {
        setMyClasses(data ?? []);
        if (data && data.length > 0 && !selectedCS) setSelectedCS(data[0]);
      });
  }, [user?.id]);

  const loadAssessments = async () => {
    if (!selectedCS) return;
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_subject_id', selectedCS.id)
      .order('date', { ascending: false });
    setAssessments(data ?? []);
    if (data && data.length > 0 && !selectedAssessment) setSelectedAssessment(data[0]);
  };

  useEffect(() => { loadAssessments(); }, [selectedCS]);

  const loadGrades = async () => {
    if (!selectedAssessment || !selectedCS) return;
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('*, profile:profiles!student_id(full_name)')
      .eq('class_id', selectedCS.class_id)
      .eq('status', 'active');

    const { data: existingGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('assessment_id', selectedAssessment.id);

    const gradeMap: Record<string, any> = {};
    (existingGrades ?? []).forEach(g => { gradeMap[g.student_id] = g; });

    setGrades(
      (enrollments ?? []).map(e => ({
        student_id: e.student_id,
        full_name: (e as any).profile?.full_name ?? 'Aluno',
        grade_id: gradeMap[e.student_id]?.id ?? null,
        score: gradeMap[e.student_id]?.score ?? null,
        status: gradeMap[e.student_id]?.status ?? 'pending',
      }))
    );
  };

  useEffect(() => { loadGrades(); }, [selectedAssessment]);

  const updateScore = (studentId: string, value: string) => {
    const score = value === '' ? null : parseFloat(value);
    setGrades(prev => prev.map(g =>
      g.student_id === studentId ? { ...g, score, status: score !== null ? 'graded' : 'pending' } : g
    ));
  };

  const handleSaveGrades = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    for (const g of grades) {
      if (g.score !== null) {
        await supabase.from('grades').upsert({
          assessment_id: selectedAssessment.id,
          student_id: g.student_id,
          score: g.score,
          status: 'graded',
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
        }, { onConflict: 'assessment_id,student_id' });
      }
    }
    setSaving(false);
    await loadGrades();
  };

  const handleCreateAssessment = async () => {
    setFormError('');
    if (!assessmentForm.title || !selectedCS) { setFormError('Título obrigatório.'); return; }
    const { error } = await supabase.from('assessments').insert({
      class_subject_id: selectedCS.id,
      title: assessmentForm.title,
      type: assessmentForm.type,
      max_score: parseFloat(assessmentForm.max_score || '10'),
      date: assessmentForm.date || null,
    });
    if (error) { setFormError(error.message); return; }
    setShowAddAssessment(false);
    setAssessmentForm({ title: '', type: 'test', max_score: '10', date: '' });
    await loadAssessments();
  };

  const scoreColor = (score: number | null, max: number) => {
    if (score === null) return '#9CA3AF';
    const pct = score / max;
    if (pct >= 0.7) return '#057A55';
    if (pct >= 0.5) return '#C27803';
    return '#C81E1E';
  };

  const onRefresh = async () => { setRefreshing(true); await loadGrades(); setRefreshing(false); };

  const typeOptions = ['exam','test','assignment','project','quiz','recovery'];
  const typeLabel = (t: string) => ({ exam: 'Prova', test: 'Teste', assignment: 'Trabalho', project: 'Projeto', quiz: 'Quiz', recovery: 'Recuperação' }[t] ?? t);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Lançamento de Notas</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.picker} onPress={() => setShowClassPicker(v => !v)}>
          <ClipboardList size={16} color={theme.primary} />
          <Text style={styles.pickerText} numberOfLines={1}>
            {selectedCS ? `${(selectedCS as any).subject?.name} – ${(selectedCS as any).class?.name}` : 'Selecionar turma'}
          </Text>
          <ChevronDown size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {showClassPicker && (
          <View style={styles.dropdown}>
            {myClasses.map(cs => (
              <TouchableOpacity key={cs.id} style={styles.dropdownItem}
                onPress={() => { setSelectedCS(cs); setSelectedAssessment(null); setShowClassPicker(false); }}>
                <Text style={styles.dropdownText}>{(cs as any).subject?.name} – {(cs as any).class?.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.assessmentRow}>
          <TouchableOpacity style={[styles.picker, { flex: 1 }]} onPress={() => setShowAssessmentPicker(v => !v)}>
            <Star size={16} color={theme.warning} />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedAssessment ? `${selectedAssessment.title} (/${selectedAssessment.max_score})` : 'Selecionar avaliação'}
            </Text>
            <ChevronDown size={16} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddAssessment(true)}
            style={[styles.addAssessmentBtn, { backgroundColor: theme.primary }]}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {showAssessmentPicker && (
          <View style={styles.dropdown}>
            {assessments.map(a => (
              <TouchableOpacity key={a.id} style={styles.dropdownItem}
                onPress={() => { setSelectedAssessment(a); setShowAssessmentPicker(false); }}>
                <Text style={styles.dropdownText}>{a.title}</Text>
                <Badge label={typeLabel(a.type)} variant="neutral" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {grades.length === 0 ? (
          <EmptyState
            icon={<Star size={28} color="#9CA3AF" />}
            title={selectedAssessment ? 'Nenhum aluno encontrado' : 'Selecione uma avaliação'}
            description={selectedAssessment ? '' : 'Escolha ou crie uma avaliação para lançar notas.'}
          />
        ) : (
          grades.map((g, idx) => (
            <Card key={g.student_id} style={styles.gradeCard} padding={12}>
              <View style={styles.gradeRow}>
                <Text style={styles.gradeIdx}>{idx + 1}</Text>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {g.full_name[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <Text style={styles.gradeName} numberOfLines={1}>{g.full_name}</Text>
                <View style={styles.scoreWrap}>
                  <TextInput
                    style={[styles.scoreInput, { color: scoreColor(g.score, selectedAssessment?.max_score ?? 10) }]}
                    value={g.score !== null ? String(g.score) : ''}
                    onChangeText={v => updateScore(g.student_id, v)}
                    keyboardType="decimal-pad"
                    placeholder="–"
                    placeholderTextColor="#D1D5DB"
                  />
                  <Text style={styles.maxScore}>/{selectedAssessment?.max_score ?? 10}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {grades.length > 0 && (
        <View style={styles.footer}>
          <Button title="Salvar Notas" onPress={handleSaveGrades} loading={saving} size="lg" color={theme.primary} />
        </View>
      )}

      <Modal visible={showAddAssessment} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Avaliação</Text>
            <TouchableOpacity onPress={() => setShowAddAssessment(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Input label="Título *" value={assessmentForm.title}
              onChangeText={v => setAssessmentForm(f => ({ ...f, title: v }))}
              placeholder="Ex: Prova 1° Bimestre" />
            <Input label="Nota Máxima" value={assessmentForm.max_score}
              onChangeText={v => setAssessmentForm(f => ({ ...f, max_score: v }))}
              keyboardType="decimal-pad" placeholder="10" />
            <Input label="Data (opcional)" value={assessmentForm.date}
              onChangeText={v => setAssessmentForm(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-DD" />
            <Text style={styles.typeLabel}>Tipo</Text>
            <View style={styles.typeGrid}>
              {typeOptions.map(t => (
                <TouchableOpacity key={t}
                  onPress={() => setAssessmentForm(f => ({ ...f, type: t }))}
                  style={[styles.typeBtn, assessmentForm.type === t && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <Text style={[styles.typeBtnText, assessmentForm.type === t && { color: '#FFFFFF' }]}>{typeLabel(t)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button title="Criar Avaliação" onPress={handleCreateAssessment} size="lg" color={theme.primary} />
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
  controls: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 12, gap: 8 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', padding: 11, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  assessmentRow: { flexDirection: 'row', gap: 8 },
  addAssessmentBtn: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dropdown: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownText: { fontSize: 14, color: '#374151' },
  list: { padding: 12, gap: 8, paddingBottom: 100 },
  gradeCard: {},
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeIdx: { width: 20, fontSize: 12, color: '#9CA3AF', textAlign: 'right' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  gradeName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scoreInput: { width: 42, fontSize: 18, fontWeight: '700', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#E5E7EB', paddingVertical: 2 },
  maxScore: { fontSize: 13, color: '#9CA3AF' },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 14 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
