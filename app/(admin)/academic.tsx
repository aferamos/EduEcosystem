import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { BookOpen, Check, GraduationCap, Layers, Link2, Plus, Users, X } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import ClassCourseModal from '@/components/academic/ClassCourseModal';
import ClassSubjectsModal, { type SubjectOption } from '@/components/academic/ClassSubjectsModal';

type Tab = 'courses' | 'classes' | 'subjects' | 'courseClasses';

// Tipos locais alinhados com colunas PT
interface Curso { id: string; nome: string; nivel: string; duracao_anos: number; ativo: boolean; }
interface Turma { id: string; nome: string; ano: number; turno: string | null; ativo: boolean; curso_id: string | null; curso?: { id: string; nome: string } | null; }
interface Disciplina { id: string; nome: string; codigo: string | null; carga_horaria: number | null; ativo: boolean; }

export default function AcademicScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const [tab, setTab] = useState<Tab>('courses');
  const [modalTab, setModalTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<Curso[]>([]);
  const [classes, setClasses] = useState<Turma[]>([]);
  const [subjects, setSubjects] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseTarget, setCourseTarget] = useState<Turma | null>(null);
  const [subjectsTarget, setSubjectsTarget] = useState<Turma | null>(null);

  const institutionId = user?.currentInstitution?.id;
  const canEdit = user?.currentRole === 'admin' || user?.currentRole === 'super_admin';

  const loadAll = useCallback(async (showLoading = false) => {
    if (!institutionId) {
      setLoadError('Não há uma instituição vinculada a este usuário.');
      if (showLoading) setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setLoadError('');
    try {
      const [courseResult, classResult, subjectResult] = await Promise.all([
        supabase.from('cursos').select('*').eq('instituicao_id', institutionId).eq('ativo', true).order('nome'),
        supabase.from('turmas').select('*, curso:cursos(id,nome)').eq('instituicao_id', institutionId).eq('ativo', true).order('nome'),
        supabase.from('disciplinas').select('*').eq('instituicao_id', institutionId).eq('ativo', true).order('nome'),
      ]);
      const queryError = courseResult.error ?? classResult.error ?? subjectResult.error;
      if (queryError) throw new Error(queryError.message);
      setCourses(courseResult.data ?? []);
      setClasses(classResult.data ?? []);
      setSubjects(subjectResult.data ?? []);
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados acadêmicos.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { void loadAll(true); }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  const openModal = () => {
    setModalTab(tab === 'courseClasses' ? 'classes' : tab);
    setForm({});
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!institutionId) {
      setError('Não há uma instituição vinculada a este usuário.');
      return;
    }

    if (!form.name?.trim()) {
      setError('Nome obrigatório.');
      return;
    }

    if (modalTab === 'classes' && (!form.year || !Number.isFinite(Number(form.year)))) {
      setError('Informe um ano letivo válido.');
      return;
    }

    setSaving(true);
    try {
      let saveError: { message: string } | null = null;
      if (modalTab === 'courses') {
        const result = await supabase.from('cursos').insert({
          instituicao_id: institutionId,
          nome: form.name.trim(),
          nivel: form.level || 'fundamental',
          duracao_anos: parseInt(form.duration_years || '1', 10),
        });
        saveError = result.error;
      } else if (modalTab === 'classes') {
        const result = await supabase.from('turmas').insert({
          instituicao_id: institutionId,
          nome: form.name.trim(),
          ano: parseInt(form.year, 10),
          turno: form.shift || 'manha',
          curso_id: form.course_id || null,
        });
        saveError = result.error;
      } else {
        const result = await supabase.from('disciplinas').insert({
          instituicao_id: institutionId,
          nome: form.name.trim(),
          codigo: form.code || null,
          carga_horaria: form.workload_hours ? parseInt(form.workload_hours, 10) : null,
        });
        saveError = result.error;
      }

      if (saveError) throw new Error(saveError.message);
      setShowModal(false);
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'courses', label: 'Cursos', icon: <GraduationCap size={16} color={tab === 'courses' ? '#FFFFFF' : '#6B7280'} /> },
    { key: 'classes', label: 'Turmas', icon: <Users size={16} color={tab === 'classes' ? '#FFFFFF' : '#6B7280'} /> },
    { key: 'subjects', label: 'Disciplinas', icon: <Layers size={16} color={tab === 'subjects' ? '#FFFFFF' : '#6B7280'} /> },
    { key: 'courseClasses', label: 'Cursos e turmas', icon: <BookOpen size={16} color={tab === 'courseClasses' ? '#FFFFFF' : '#6B7280'} /> },
  ];

  const shiftLabel = (s: string) => ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[s] ?? s);
  const levelLabel = (l: string) => ({ fundamental: 'Fund.', medio: 'Médio', superior: 'Superior', tecnico: 'Técnico' }[l] ?? l);
  const classesWithoutCourse = classes.filter((cl) => !cl.curso_id);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Gestão Acadêmica</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
            >
              {t.icon}
              <Text style={[styles.tabText, tab === t.key && { color: '#FFFFFF', fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loadError ? (
          <Card style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.error}>{loadError}</Text>
          </Card>
        ) : null}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={theme.primary} /><Text style={styles.metaText}>Carregando dados acadêmicos...</Text></View>
        ) : null}

        {!loading && !loadError && tab === 'courses' && (
          courses.length === 0
            ? <EmptyState icon={<GraduationCap size={28} color="#9CA3AF" />} title="Nenhum curso cadastrado" description="Adicione cursos para organizar as turmas da instituição." />
            : courses.map(c => (
              <Card key={c.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.primary + '20' }]}>
                    <GraduationCap size={20} color={theme.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{c.nome}</Text>
                    <View style={styles.itemMeta}>
                      <Badge label={levelLabel(c.nivel)} variant="info" />
                      <Text style={styles.metaText}>{c.duracao_anos} ano{c.duracao_anos > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))
        )}

        {!loading && !loadError && tab === 'classes' && (
          classes.length === 0
            ? <EmptyState icon={<Users size={28} color="#9CA3AF" />} title="Nenhuma turma cadastrada" description="Crie turmas e vincule-as a cursos." />
            : classes.map(cl => (
              <Card key={cl.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.secondary + '20' }]}>
                    <Users size={20} color={theme.secondary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{cl.nome}</Text>
                    <View style={styles.itemMeta}>
                      <Badge label={`${cl.ano}`} variant="neutral" />
                      <Badge label={shiftLabel(cl.turno ?? '')} variant="info" />
                      {cl.curso?.nome && <Text style={styles.metaText}>{cl.curso.nome}</Text>}
                    </View>
                  </View>
                </View>
                <View style={styles.classActions}>
                  <TouchableOpacity
                    onPress={() => setCourseTarget(cl)}
                    style={[styles.classAction, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  >
                    <Link2 size={14} color={theme.primary} />
                    <Text style={[styles.classActionText, { color: theme.primary }]}>Curso</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSubjectsTarget(cl)}
                    style={[styles.classAction, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  >
                    <Layers size={14} color={theme.primary} />
                    <Text style={[styles.classActionText, { color: theme.primary }]}>Disciplinas e professores</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
        )}

        {!loading && !loadError && tab === 'subjects' && (
          subjects.length === 0
            ? <EmptyState icon={<Layers size={28} color="#9CA3AF" />} title="Nenhuma disciplina cadastrada" description="Adicione disciplinas para atribuir a turmas e professores." />
            : subjects.map(s => (
              <Card key={s.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.success + '20' }]}>
                    <BookOpen size={20} color={theme.success} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{s.nome}</Text>
                    <View style={styles.itemMeta}>
                      {s.codigo && <Badge label={s.codigo} variant="neutral" />}
                      {s.carga_horaria && <Text style={styles.metaText}>{s.carga_horaria}h</Text>}
                    </View>
                  </View>
                </View>
              </Card>
            ))
        )}

        {!loading && !loadError && tab === 'courseClasses' && (
          <>
            {courses.length === 0 ? (
              <EmptyState icon={<GraduationCap size={28} color="#9CA3AF" />} title="Nenhum curso cadastrado" description="Cadastre cursos para organizar as turmas." />
            ) : (
              courses.map((course) => {
                const courseClasses = classes.filter((cl) => cl.curso_id === course.id);
                return (
                  <Card key={course.id} style={styles.courseGroupCard} padding={14}>
                    <View style={styles.courseGroupHeader}>
                      <View style={[styles.itemIcon, { backgroundColor: theme.primary + '20' }]}>
                        <GraduationCap size={20} color={theme.primary} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{course.nome}</Text>
                        <View style={styles.itemMeta}>
                          <Badge label={levelLabel(course.nivel)} variant="info" />
                          <Text style={styles.metaText}>{courseClasses.length} turma{courseClasses.length !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                    </View>
                    {courseClasses.length === 0 ? (
                      <Text style={styles.courseGroupEmpty}>Nenhuma turma cadastrada neste curso.</Text>
                    ) : (
                      <View style={[styles.courseClassList, { borderTopColor: theme.border }]}>
                        {courseClasses.map((cl) => (
                          <View key={cl.id} style={styles.courseClassRow}>
                            <Users size={15} color={theme.secondary} />
                            <Text style={styles.courseClassName}>{cl.nome}</Text>
                            <Text style={styles.courseClassMeta}>{cl.ano} · {shiftLabel(cl.turno ?? '')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>
                );
              })
            )}
            {classesWithoutCourse.length > 0 ? (
              <Card style={styles.courseGroupCard} padding={14}>
                <Text style={styles.itemName}>Turmas sem curso vinculado</Text>
                <View style={[styles.courseClassList, { borderTopColor: theme.border }]}>
                  {classesWithoutCourse.map((cl) => (
                    <View key={cl.id} style={styles.courseClassRow}>
                      <Users size={15} color={theme.textMuted} />
                      <Text style={styles.courseClassName}>{cl.nome}</Text>
                      <Text style={styles.courseClassMeta}>{cl.ano} · {shiftLabel(cl.turno ?? '')}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: TAB_BAR_HEIGHT + 16, backgroundColor: theme.primary }]}
        onPress={openModal}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalTab === 'courses' ? 'Novo Curso' : modalTab === 'classes' ? 'Nova Turma' : 'Nova Disciplina'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Input label="Nome *" value={form.name ?? ''}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder={modalTab === 'courses' ? 'Ex: Ensino Médio' : modalTab === 'classes' ? 'Ex: 1° Ano A' : 'Ex: Matemática'} />

            {modalTab === 'courses' && (
              <Input label="Duração (anos)" value={form.duration_years ?? ''}
                onChangeText={v => setForm(f => ({ ...f, duration_years: v }))}
                placeholder="1" keyboardType="numeric" />
            )}
            {modalTab === 'classes' && (
              <>
                <Input label="Ano Letivo *" value={form.year ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, year: v }))}
                  placeholder="2025" keyboardType="numeric" />
                <Text style={styles.fieldLabel}>Turno</Text>
                <View style={styles.shiftRow}>
                  {['manha', 'tarde', 'noite', 'integral'].map(s => (
                    <TouchableOpacity key={s}
                      onPress={() => setForm(f => ({ ...f, shift: s }))}
                      style={[styles.shiftBtn, form.shift === s && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      <Text style={[styles.shiftText, form.shift === s && { color: '#FFFFFF' }]}>
                        {shiftLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Curso vinculado</Text>
                <View style={styles.courseOptions}>
                  <TouchableOpacity
                    onPress={() => setForm(f => ({ ...f, course_id: '' }))}
                    style={[styles.courseOption, { borderColor: !form.course_id ? theme.primary : theme.border, backgroundColor: !form.course_id ? theme.primary + '12' : theme.surface }]}
                  >
                    {!form.course_id ? <Check size={13} color={theme.primary} /> : null}
                    <Text style={[styles.courseOptionText, { color: !form.course_id ? theme.primary : theme.textSecondary }]}>Sem curso</Text>
                  </TouchableOpacity>
                  {courses.map((course) => {
                    const selected = form.course_id === course.id;
                    return (
                      <TouchableOpacity
                        key={course.id}
                        onPress={() => setForm(f => ({ ...f, course_id: course.id }))}
                        style={[styles.courseOption, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary + '12' : theme.surface }]}
                      >
                        {selected ? <Check size={13} color={theme.primary} /> : null}
                        <Text style={[styles.courseOptionText, { color: selected ? theme.primary : theme.textSecondary }]}>{course.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            {modalTab === 'subjects' && (
              <>
                <Input label="Código (opcional)" value={form.code ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, code: v }))}
                  placeholder="MAT" />
                <Input label="Carga Horária (h)" value={form.workload_hours ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, workload_hours: v }))}
                  placeholder="80" keyboardType="numeric" />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Salvar" onPress={handleSave} loading={saving} size="lg" color={theme.primary} />
          </ScrollView>
        </View>
      </Modal>

      <ClassCourseModal
        visible={courseTarget !== null}
        turma={courseTarget}
        courses={courses}
        canEdit={canEdit}
        onClose={() => setCourseTarget(null)}
        onSaved={() => loadAll()}
      />
      <ClassSubjectsModal
        visible={subjectsTarget !== null}
        turma={subjectsTarget}
        subjects={subjects as SubjectOption[]}
        canEdit={canEdit}
        onClose={() => setSubjectsTarget(null)}
        onSaved={() => loadAll()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, gap: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  tabs: { flexDirection: 'row', gap: 6, paddingRight: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  list: { padding: 16, gap: 10 },
  itemCard: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#6B7280' },
  classActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  classAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  classActionText: { fontSize: 11, fontWeight: '700' },
  courseGroupCard: { gap: 10 },
  courseGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseGroupEmpty: { color: '#6B7280', fontSize: 12, paddingTop: 3 },
  courseClassList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 10 },
  courseClassRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseClassName: { color: '#111827', fontSize: 12, fontWeight: '600', flex: 1 },
  courseClassMeta: { color: '#6B7280', fontSize: 11 },
  courseOptions: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  courseOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  courseOptionText: { fontSize: 11, fontWeight: '600' },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  errorCard: { borderWidth: 1, borderRadius: 11 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  shiftRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  shiftBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  shiftText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
