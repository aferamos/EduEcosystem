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

interface TurmaDisciplina {
  id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id: string | null;
  horas_semanais: number;
  disciplina?: { nome: string } | null;
  turma?: { nome: string; ano: number } | null;
}

interface Avaliacao {
  id: string;
  turma_disciplina_id: string;
  titulo: string;
  tipo: string;
  data: string | null;
  nota_maxima: number;
  peso: number;
}

export default function GradesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState<TurmaDisciplina[]>([]);
  const [selectedCS, setSelectedCS] = useState<TurmaDisciplina | null>(null);
  const [assessments, setAssessments] = useState<Avaliacao[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Avaliacao | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showAssessmentPicker, setShowAssessmentPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ title: '', type: 'teste', max_score: '10', date: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('turma_disciplinas')
      .select('*, disciplina:disciplinas(nome), turma:turmas(nome, ano)')
      .eq('professor_id', user.id)
      .then(({ data }) => {
        setMyClasses(data ?? []);
        if (data && data.length > 0 && !selectedCS) setSelectedCS(data[0]);
      });
  }, [user?.id]);

  const loadAssessments = async () => {
    if (!selectedCS) return;
    const { data } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('turma_disciplina_id', selectedCS.id)
      .order('data', { ascending: false });
    setAssessments(data ?? []);
    if (data && data.length > 0 && !selectedAssessment) setSelectedAssessment(data[0]);
  };

  useEffect(() => { loadAssessments(); }, [selectedCS]);

  const loadGrades = async () => {
    if (!selectedAssessment || !selectedCS) return;
    // Busca matrículas
    const { data: enrollments } = await supabase
      .from('matriculas')
      .select('*, perfil:perfis!aluno_id(nome_completo)')
      .eq('turma_id', selectedCS.turma_id)
      .eq('situacao', 'ativo');

    // Busca notas existentes
    const { data: existingGrades } = await supabase
      .from('notas')
      .select('*')
      .eq('avaliacao_id', selectedAssessment.id);

    const gradeMap: Record<string, any> = {};
    (existingGrades ?? []).forEach(g => { gradeMap[g.aluno_id] = g; });

    setGrades(
      (enrollments ?? []).map((e: any) => ({
        student_id: e.aluno_id,
        full_name: e.perfil?.nome_completo ?? 'Aluno',
        grade_id: gradeMap[e.aluno_id]?.id ?? null,
        score: gradeMap[e.aluno_id]?.nota ?? null,
        status: gradeMap[e.aluno_id]?.situacao ?? 'pendente',
      }))
    );
  };

  useEffect(() => { loadGrades(); }, [selectedAssessment]);

  const updateScore = (studentId: string, value: string) => {
    const score = value === '' ? null : parseFloat(value);
    setGrades(prev => prev.map(g =>
      g.student_id === studentId ? { ...g, score, status: score !== null ? 'lancada' : 'pendente' } : g
    ));
  };

  const handleSaveGrades = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    for (const g of grades) {
      if (g.score !== null) {
        // Escreve na tabela real `notas` com colunas PT
        await supabase.from('notas').upsert({
          avaliacao_id: selectedAssessment.id,
          aluno_id: g.student_id,
          nota: g.score,
          situacao: 'lancada',
          lancado_por: user?.id,
          lancado_em: new Date().toISOString(),
        }, { onConflict: 'avaliacao_id,aluno_id' });
      }
    }
    setSaving(false);
    await loadGrades();
  };

  const handleCreateAssessment = async () => {
    setFormError('');
    if (!assessmentForm.title || !selectedCS) { setFormError('Título obrigatório.'); return; }
    // Escreve na tabela real `avaliacoes` com colunas PT
    const { error } = await supabase.from('avaliacoes').insert({
      turma_disciplina_id: selectedCS.id,
      titulo: assessmentForm.title,
      tipo: assessmentForm.type,
      nota_maxima: parseFloat(assessmentForm.max_score || '10'),
      data: assessmentForm.date || null,
    });
    if (error) { setFormError(error.message); return; }
    setShowAddAssessment(false);
    setAssessmentForm({ title: '', type: 'teste', max_score: '10', date: '' });
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

  const typeOptions = ['prova', 'teste', 'trabalho', 'projeto', 'quiz', 'recuperacao'];
  const typeLabel = (t: string) => ({ prova: 'Prova', teste: 'Teste', trabalho: 'Trabalho', projeto: 'Projeto', quiz: 'Quiz', recuperacao: 'Recuperação' }[t] ?? t);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Lançamento de Notas</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.picker} onPress={() => setShowClassPicker(v => !v)}>
          <ClipboardList size={16} color={theme.primary} />
          <Text style={styles.pickerText} numberOfLines={1}>
            {selectedCS
              ? `${(selectedCS.disciplina as any)?.nome} – ${(selectedCS.turma as any)?.nome}`
              : 'Selecionar turma'}
          </Text>
          <ChevronDown size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {showClassPicker && (
          <View style={styles.dropdown}>
            {myClasses.map(cs => (
              <TouchableOpacity key={cs.id} style={styles.dropdownItem}
                onPress={() => { setSelectedCS(cs); setSelectedAssessment(null); setShowClassPicker(false); }}>
                <Text style={styles.dropdownText}>{(cs.disciplina as any)?.nome} – {(cs.turma as any)?.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.assessmentRow}>
          <TouchableOpacity style={[styles.picker, { flex: 1 }]} onPress={() => setShowAssessmentPicker(v => !v)}>
            <Star size={16} color={theme.warning} />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedAssessment
                ? `${selectedAssessment.titulo} (/${selectedAssessment.nota_maxima})`
                : 'Selecionar avaliação'}
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
                <Text style={styles.dropdownText}>{a.titulo}</Text>
                <Badge label={typeLabel(a.tipo)} variant="neutral" />
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
                    style={[styles.scoreInput, { color: scoreColor(g.score, selectedAssessment?.nota_maxima ?? 10) }]}
                    value={g.score !== null ? String(g.score) : ''}
                    onChangeText={v => updateScore(g.student_id, v)}
                    keyboardType="decimal-pad"
                    placeholder="–"
                    placeholderTextColor="#D1D5DB"
                  />
                  <Text style={styles.maxScore}>/{selectedAssessment?.nota_maxima ?? 10}</Text>
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
